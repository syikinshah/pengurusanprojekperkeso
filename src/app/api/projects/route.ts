import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, REPORT_ROLES, PA_ROLES, apiError } from "@/lib/api-auth";
import type { ProjectStatus } from "@/lib/types";

const VALID_PROJECT_STATUSES: ProjectStatus[] = [
  "aktif",
  "selesai",
  "ditangguh",
  "dibatalkan",
];

// ============================
// GET /api/projects
// Any non-trainee role.
// Query: ?status= ?search= ?managerId= ?summary=true
// Returns: { ok: true, data: Project[] }
// ============================
export async function GET(request: Request) {
  try {
    const auth = await requireRole(REPORT_ROLES);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const managerId = searchParams.get("managerId") || undefined;
    const includeSummary = searchParams.get("summary") === "true";

    if (status && !VALID_PROJECT_STATUSES.includes(status as ProjectStatus)) {
      return apiError("Status projek tidak sah.", 400);
    }

    const where: {
      status?: string;
      projectManagerId?: string;
      OR?: Array<{ projectName: { contains: string }; description: { contains: string } }>;
    } = {};
    if (status) where.status = status;
    if (managerId) where.projectManagerId = managerId;
    if (search) {
      where.OR = [
        { projectName: { contains: search }, description: { contains: search } },
      ] as never;
    }

    const projects = await db.project.findMany({
      where,
      include: {
        projectManager: { select: { id: true, name: true, email: true } },
        _count: { select: { invoices: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    let data: unknown[] = projects;
    if (includeSummary && projects.length > 0) {
      const ids = projects.map((p) => p.id);
      const summaries = await db.invoice.groupBy({
        by: ["projectId"],
        where: { projectId: { in: ids } },
        _sum: { amount: true },
        _count: { _all: true },
      });
      const byStatus = await db.invoice.groupBy({
        by: ["projectId", "status"],
        where: { projectId: { in: ids } },
        _sum: { amount: true },
      });
      const map = new Map<
        string,
        { total: number; paid: number; pending: number; count: number }
      >();
      for (const s of summaries) {
        map.set(s.projectId, {
          total: s._sum.amount ?? 0,
          paid: 0,
          pending: 0,
          count: s._count._all,
        });
      }
      for (const b of byStatus) {
        const e = map.get(b.projectId);
        if (!e) continue;
        if (b.status === "dibayar") e.paid += b._sum.amount ?? 0;
        else if (b.status === "diluluskan" || b.status === "menunggu_kelulusan")
          e.pending += b._sum.amount ?? 0;
      }
      data = projects.map((p) => {
        const s = map.get(p.id);
        return {
          ...p,
          invoiceSummary: {
            total: s?.total ?? 0,
            paid: s?.paid ?? 0,
            pending: s?.pending ?? 0,
            count: s?.count ?? 0,
          },
        };
      });
    }

    return NextResponse.json({ ok: true, data });
  } catch (e) {
    console.error("[projects.GET] error:", e);
    return apiError("Ralat pelayan ketika mendapatkan projek.", 500);
  }
}

// ============================
// POST /api/projects
// Roles: admin | project_admin
// Body: { projectName, description?, budget, projectManagerId?, status?, startDate?, endDate? }
// ============================
export async function POST(request: Request) {
  try {
    const auth = await requireRole(PA_ROLES);
    if (!auth.ok) return auth.response;

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

    if (!projectName || typeof projectName !== "string" || !projectName.trim()) {
      return apiError("Nama projek diperlukan.", 400);
    }
    if (budget === undefined || typeof budget !== "number" || budget < 0) {
      return apiError("Bajet mesti nombor positif.", 400);
    }
    if (status && !VALID_PROJECT_STATUSES.includes(status as ProjectStatus)) {
      return apiError("Status projek tidak sah.", 400);
    }

    if (projectManagerId) {
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
    }

    const created = await db.project.create({
      data: {
        projectName: projectName as string,
        description: (description as string) || null,
        budget: budget as number,
        projectManagerId: (projectManagerId as string) || null,
        status: (status as ProjectStatus) || "aktif",
        startDate: startDate ? new Date(startDate as string) : null,
        endDate: endDate ? new Date(endDate as string) : null,
      },
      include: {
        projectManager: { select: { id: true, name: true, email: true } },
        _count: { select: { invoices: true } },
      },
    });

    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (e) {
    console.error("[projects.POST] error:", e);
    return apiError("Ralat pelayan ketika mencipta projek.", 500);
  }
}
