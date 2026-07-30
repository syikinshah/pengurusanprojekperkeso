import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, hasRole } from "@/lib/api-auth";
import type { Role } from "@/lib/types";

/**
 * GET /api/certificate/[enrollmentId]
 * Requires auth (owner or admin/PM). Returns certificate data:
 *   { enrollment, course, user, certificateId, issuedAt }
 * If enrollment not completed or no certificate, return 404.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ enrollmentId: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const user = auth.user;

  try {
    const { enrollmentId } = await params;
    const enrollment = await db.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: true,
            position: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            level: true,
            duration: true,
            instructor: true,
            creator: { select: { id: true, name: true } },
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

    // Permission: owner or admin/PM
    const isPrivileged = hasRole(
      user,
      "admin" as Role,
      "project_admin" as Role,
      "project_manager" as Role
    );
    if (enrollment.userId !== user.id && !isPrivileged) {
      return NextResponse.json(
        { ok: false, error: "Tidak dibenarkan melihat sijil ini" },
        { status: 403 }
      );
    }

    // Must be completed and have a certificate URL
    if (enrollment.status !== "selesai" || !enrollment.certificateUrl) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Sijil belum tersedia. Sila lengkapkan kursus terlebih dahulu.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      certificate: {
        certificateId: enrollment.id,
        issuedAt: enrollment.completedAt ?? enrollment.updatedAt,
        certificateUrl: enrollment.certificateUrl,
        enrollment: {
          id: enrollment.id,
          progress: enrollment.progress,
          status: enrollment.status,
          enrolledAt: enrollment.enrolledAt,
          completedAt: enrollment.completedAt,
        },
        course: enrollment.course,
        user: enrollment.user,
      },
    });
  } catch (err) {
    console.error("[certificate GET] error:", err);
    return NextResponse.json(
      { ok: false, error: "Ralat pelayan. Sila cuba lagi." },
      { status: 500 }
    );
  }
}
