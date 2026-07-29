import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, hasRole } from "@/lib/api-auth";
import type { Role } from "@/lib/types";

const ENROLLMENT_STATUSES = ["belum_mula", "dalam_proses", "selesai"] as const;

const PatchEnrollmentSchema = z.object({
  progress: z.number().min(0).max(100).optional(),
  status: z.enum(ENROLLMENT_STATUSES).optional(),
  lastAccessedAt: z.string().datetime().optional(),
  certificateUrl: z.string().optional().nullable(),
});

/**
 * Derive status from progress (when status is not explicitly provided).
 *  - progress >= 100 -> "selesai"
 *  - progress > 0    -> "dalam_proses"
 *  - progress === 0  -> "belum_mula"
 */
function deriveStatus(progress: number): "belum_mula" | "dalam_proses" | "selesai" {
  if (progress >= 100) return "selesai";
  if (progress > 0) return "dalam_proses";
  return "belum_mula";
}

/**
 * GET /api/enrollments/[id]
 * Requires auth (owner or admin/PM). Returns enrollment with course and user.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const user = auth.user;

  try {
    const { id } = await params;
    const enrollment = await db.enrollment.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: true,
            position: true,
            avatarUrl: true,
          },
        },
        course: {
          include: {
            creator: { select: { id: true, name: true } },
            materials: { orderBy: { order: "asc" } },
            quizzes: { include: { questions: true }, orderBy: { order: "asc" } },
          },
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { ok: false, error: "Pendaftaran tidak dijumpai" },
        { status: 404 }
      );
    }

    const isPrivileged = hasRole(
      user,
      "admin" as Role,
      "project_admin" as Role,
      "project_manager" as Role
    );
    if (enrollment.userId !== user.id && !isPrivileged) {
      return NextResponse.json(
        { ok: false, error: "Tidak dibenarkan melihat pendaftaran ini" },
        { status: 403 }
      );
    }

    return NextResponse.json({ ok: true, enrollment });
  } catch (err) {
    console.error("[enrollments/[id] GET] error:", err);
    return NextResponse.json(
      { ok: false, error: "Ralat pelayan. Sila cuba lagi." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/enrollments/[id]
 * Requires auth (owner or admin/PM). Updates progress and/or status and/or
 * lastAccessedAt and certificateUrl. Auto-derives status from progress if not provided.
 * If status becomes "selesai" and certificateUrl is null, generates a cert URL.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const user = auth.user;

  try {
    const { id } = await params;
    const enrollment = await db.enrollment.findUnique({
      where: { id },
      select: { id: true, userId: true, courseId: true },
    });
    if (!enrollment) {
      return NextResponse.json(
        { ok: false, error: "Pendaftaran tidak dijumpai" },
        { status: 404 }
      );
    }

    const isPrivileged = hasRole(
      user,
      "admin" as Role,
      "project_admin" as Role,
      "project_manager" as Role
    );
    if (enrollment.userId !== user.id && !isPrivileged) {
      return NextResponse.json(
        { ok: false, error: "Tidak dibenarkan mengemaskini pendaftaran ini" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = PatchEnrollmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak sah" },
        { status: 400 }
      );
    }

    // Read existing values to determine the new state
    const existing = await db.enrollment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Pendaftaran tidak dijumpai" },
        { status: 404 }
      );
    }

    const newProgress =
      parsed.data.progress !== undefined ? parsed.data.progress : existing.progress;

    // Determine status: explicit override > derived from progress
    let newStatus = parsed.data.status;
    if (!newStatus) {
      newStatus = deriveStatus(newProgress);
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (parsed.data.progress !== undefined) updateData.progress = newProgress;
    if (parsed.data.status !== undefined || parsed.data.progress !== undefined) {
      updateData.status = newStatus;
    }
    if (parsed.data.lastAccessedAt) {
      updateData.lastAccessedAt = new Date(parsed.data.lastAccessedAt);
    } else if (parsed.data.progress !== undefined) {
      updateData.lastAccessedAt = new Date();
    }
    if (parsed.data.certificateUrl !== undefined) {
      updateData.certificateUrl = parsed.data.certificateUrl;
    }

    // If status became selesai, set completedAt if not already set, and auto-generate cert if missing
    if (newStatus === "selesai") {
      if (!existing.completedAt) updateData.completedAt = new Date();
      // Re-fetch current cert after potential update
      const certAfterUpdate =
        parsed.data.certificateUrl !== undefined
          ? parsed.data.certificateUrl
          : existing.certificateUrl;
      if (!certAfterUpdate) {
        updateData.certificateUrl = `/certs/cert-${id}.pdf`;
      }
    } else if (newStatus !== "selesai" && existing.completedAt) {
      // If no longer completed, clear completedAt
      updateData.completedAt = null;
    }

    const updated = await db.enrollment.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
        course: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json({ ok: true, enrollment: updated });
  } catch (err) {
    console.error("[enrollments/[id] PATCH] error:", err);
    return NextResponse.json(
      { ok: false, error: "Ralat pelayan. Sila cuba lagi." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/enrollments/[id]
 * Requires admin or self (owner). Unenroll (delete) the enrollment.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const user = auth.user;

  try {
    const { id } = await params;
    const enrollment = await db.enrollment.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!enrollment) {
      return NextResponse.json(
        { ok: false, error: "Pendaftaran tidak dijumpai" },
        { status: 404 }
      );
    }

    const isPrivileged = hasRole(
      user,
      "admin" as Role,
      "project_admin" as Role,
      "project_manager" as Role
    );
    if (enrollment.userId !== user.id && !isPrivileged) {
      return NextResponse.json(
        { ok: false, error: "Tidak dibenarkan memadam pendaftaran ini" },
        { status: 403 }
      );
    }

    await db.enrollment.delete({ where: { id } });
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("[enrollments/[id] DELETE] error:", err);
    return NextResponse.json(
      { ok: false, error: "Ralat pelayan. Sila cuba lagi." },
      { status: 500 }
    );
  }
}
