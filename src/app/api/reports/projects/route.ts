// Reports Projects API
// Project financial overview - for admin/PM/PA/upper_management only.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/api-auth";

const ALLOWED_ROLES = [
  "admin",
  "project_manager",
  "project_admin",
  "upper_management",
] as const;

export async function GET(request: Request) {
  try {
    const auth = await requireRole([...ALLOWED_ROLES]);
    if (!auth.ok) return auth.response;
    const user = auth.user;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const managerId = searchParams.get("managerId");

    // Build project filter
    const projectWhere: any = {};
    if (status) projectWhere.status = status;
    if (managerId) projectWhere.projectManagerId = managerId;

    // For project_manager role without explicit managerId filter, scope to
    // their managed projects (PMs should see their own financial overview by
    // default). They can override by passing a different managerId explicitly.
    let effectiveWhere = projectWhere;
    if (
      user.role === "project_manager" &&
      !managerId &&
      !status
    ) {
      effectiveWhere = {
        ...projectWhere,
        projectManagerId: user.id,
      };
    } else if (user.role === "project_manager" && !managerId) {
      effectiveWhere = {
        ...projectWhere,
        projectManagerId: user.id,
      };
    }

    const projectsRaw = await db.project.findMany({
      where: effectiveWhere,
      include: {
        projectManager: {
          select: { id: true, name: true },
        },
        invoices: {
          select: {
            amount: true,
            status: true,
            invoiceDate: true,
            dueDate: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const projects = projectsRaw.map((p) => {
      const invoiceCount = p.invoices.length;
      const totalInvoiced = p.invoices.reduce((s, x) => s + x.amount, 0);
      const totalPaid = p.invoices
        .filter((x) => x.status === "dibayar")
        .reduce((s, x) => s + x.amount, 0);
      const totalPending = p.invoices
        .filter((x) =>
          ["menunggu_kelulusan", "diluluskan"].includes(x.status)
        )
        .reduce((s, x) => s + x.amount, 0);
      const totalOverdue = p.invoices
        .filter((x) => x.status === "tertunggak")
        .reduce((s, x) => s + x.amount, 0);
      const budgetUtilization =
        p.budget > 0
          ? Math.round((totalInvoiced / p.budget) * 1000) / 10
          : 0;
      // strip invoices array from response
      const { invoices: _invoices, ...projectData } = p;
      void _invoices;
      return {
        ...projectData,
        projectManager: p.projectManager
          ? { id: p.projectManager.id, name: p.projectManager.name }
          : null,
        invoiceCount,
        totalInvoiced,
        totalPaid,
        totalPending,
        totalOverdue,
        budgetUtilization,
      };
    });

    return NextResponse.json({
      ok: true,
      role: user.role,
      count: projects.length,
      projects,
    });
  } catch (err: any) {
    console.error("[reports/projects] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Ralat pelayan: " + (err?.message ?? String(err)) },
      { status: 500 }
    );
  }
}
