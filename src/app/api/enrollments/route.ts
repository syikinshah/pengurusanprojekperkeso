import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, hasRole } from "@/lib/api-auth";
import type { Role } from "@/lib/types";

const ENROLLMENT_STATUSES = ["belum_mula", "dalam_proses", "selesai"] as const;

/**
 * GET /api/enrollments
 * Requires auth. Returns enrollments for current user (with course + creator).
 *
 * Query params:
 *  - userId: admin/project_admin/project_manager can view other user's enrollments
 *    For `upper_management` and `project_manager` without userId, return all enrollments (reporting)
 *  - courseId: filter by course
 *  - status: filter by status
 */
export async function GET(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const user = auth.user;

  try {
    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get("userId")?.trim() || "";
    const courseIdFilter = searchParams.get("courseId")?.trim() || "";
    const statusFilter = searchParams.get("status")?.trim() || "";

    if (statusFilter && !ENROLLMENT_STATUSES.includes(statusFilter as (typeof ENROLLMENT_STATUSES)[number])) {
      return NextResponse.json(
        { ok: false, error: "Status tidak sah" },
        { status: 400 }
      );
    }

    const isPrivileged = hasRole(
      user,
      "admin" as Role,
      "project_admin" as Role,
      "project_manager" as Role
    );
    const isReporter = hasRole(user, "upper_management" as Role, "project_manager" as Role);

    // Determine target userId
    let targetUserId: string | undefined;
    if (userIdParam) {
      // Privileged user can specify a different userId
      if (!isPrivileged && userIdParam !== user.id) {
        return NextResponse.json(
          { ok: false, error: "Tidak dibenarkan melihat pendaftaran pengguna lain" },
          { status: 403 }
        );
      }
      targetUserId = userIdParam;
    } else if (isReporter || isPrivileged) {
      // Reporter / admin without userId = return all enrollments
      targetUserId = undefined;
    } else {
      targetUserId = user.id;
    }

    // Build where
    const where: Record<string, unknown> = {};
    if (targetUserId) where.userId = targetUserId;
    if (courseIdFilter) where.courseId = courseIdFilter;
    if (statusFilter) where.status = statusFilter;

    const enrollments = await db.enrollment.findMany({
      where,
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
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    });

    return NextResponse.json({ ok: true, enrollments });
  } catch (err) {
    console.error("[enrollments GET] error:", err);
    return NextResponse.json(
      { ok: false, error: "Ralat pelayan. Sila cuba lagi." },
      { status: 500 }
    );
  }
}
