import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  requireRole,
  REPORT_ROLES,
  PA_ROLES,
  ADMIN_ROLES,
  apiError,
} from "@/lib/api-auth";
import type { ProjectStatus } from "@/lib/types";

const VALID_PROJECT_STATUSES: ProjectStatus[] = [
  "aktif",
  "selesai",
  "ditangguh",
  "dibatalkan",
];

// ============================
// GET /api/projects/:id
// Any non-trainee role.
// Returns project with manager, invoices, summary stats.
// ============================
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireRole(REPORT_ROLES);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const project = await db.project.findUnique({
      where: { id },
      include: {
        projectManager: { select: { id: true, name: true, email: true } },
        invoices: {
          select: {
            id: true,
            invoiceNo: true,
            vendorName: true,
            amount: true,
            status: true,
            invoiceDate: true,
            dueDate: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!project) {
      return apiError("Projek tidak dijumpai.", 404);
    }

    // Compute summary stats
    const invoices = project.invoices;
    const total = invoices.reduce((s, i) => s + i.amount, 0);
    const paid = invoices
      .filter((i) => i.status === "dibayar")
      .reduce((s, i) => s + i.amount, 0);
    const pending = invoices
      .filter(
        (i) => i.status === "diluluskan" || i.status === "menunggu_kelulusan",
      )
      .reduce((s, i) => s + i.amount, 0);
    const draft = invoices
      .filter((i) => i.status === "draf")
      .reduce((s, i) => s + i.amount, 0);
    const rejected = invoices
      .filter((i) => i.status === "ditolak")
      .reduce((s, i) => s + i.amount, 0);

    return NextResponse.json({
      ok: true,
      data: {
        ...project,
        summary: {
          count: invoices.length,
          total,
          paid,
          pending,
          draft,
          rejected,
        },
      },
    });
  } catch (e) {
    console.error("[projects/id.GET] error:", e);
    return apiError("Ralat pelayan ketika mendapatkan projek.", 500);
  }
}

// ============================
// PUT /api/projects/:id
// Roles: admin | project_admin
// Body fields optional: projectName, description, budget, projectManagerId, status, startDate, endDate
// ============================
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireRole(PA_ROLES);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const existing = await db.project.findUnique({ where: { id } });
    if (!existing) {
      return apiError("Projek tidak dijumpai.", 404);
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return apiError("Badan permintaan tidak sah.", 400);
    }
    const {
      projectName,
      description,
      budget,
      projectManagerId,
      status,
      startDate,
      endDate,
    } = body as Record<string, unknown>;

    if (status && !VALID_PROJECT_STATUSES.includes(status as ProjectStatus)) {
      return apiError("Status projek tidak sah.", 400);
    }
    if (budget !== undefined && (typeof budget !== "number" || budget < 0)) {
      return apiError("Bajet mesti nombor positif.", 400);
    }
    if (projectName !== undefined && typeof projectName !== "string") {
      return apiError("Nama projek tidak sah.", 400);
    }

    let newManagerId = existing.projectManagerId;
    if (projectManagerId !== undefined) {
      if (projectManagerId === null || projectManagerId === "") {
        newManagerId = null;
      } else {
        const pm = await db.user.findUnique({
          where: { id: projectManagerId as string },
          select: { id: true, role: true },
        });
        if (!pm || pm.role !== "project_manager") {
          return apiError(
            "Pengurus projek tidak sah. Pengguna mesti mempunyai peranan project_manager.",
            400,
          );
        }
        newManagerId = projectManagerId as string;
      }
    }

    const updated = await db.project.update({
      where: { id },
      data: {
        projectName: (projectName as string) ?? undefined,
        description:
          description === undefined ? undefined : (description as string) || null,
        budget: (budget as number) ?? undefined,
        projectManagerId: newManagerId ?? undefined,
        status: (status as ProjectStatus) ?? undefined,
        startDate:
          startDate === undefined
            ? undefined
            : startDate === null
              ? null
              : new Date(startDate as string),
        endDate:
          endDate === undefined
            ? undefined
            : endDate === null
              ? null
              : new Date(endDate as string),
      },
      include: {
        projectManager: { select: { id: true, name: true, email: true } },
        _count: { select: { invoices: true } },
      },
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (e) {
    console.error("[projects/id.PUT] error:", e);
    return apiError("Ralat pelayan ketika mengemas kini projek.", 500);
  }
}

// ============================
// DELETE /api/projects/:id
// Roles: admin only.
// Blocks deletion if any invoices linked (returns 400).
// ============================
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireRole(ADMIN_ROLES);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const project = await db.project.findUnique({
      where: { id },
      select: { _count: { select: { invoices: true } } },
    });
    if (!project) {
      return apiError("Projek tidak dijumpai.", 404);
    }
    if (project._count.invoices > 0) {
      return apiError(
        `Tidak boleh memadam projek. Terdapat ${project._count.invoices} invois yang berkaitan.`,
        400,
      );
    }
    await db.project.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[projects/id.DELETE] error:", e);
    return apiError("Ralat pelayan ketika memadam projek.", 500);
  }
}
