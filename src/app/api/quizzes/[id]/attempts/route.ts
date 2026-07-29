import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, hasRole } from "@/lib/api-auth";
import type { Role } from "@/lib/types";

/**
 * GET /api/quizzes/[id]/attempts
 * Requires auth. Returns attempts for this quiz.
 * Query: ?userId= filter (admin/PM only, default = current user).
 * Sorted by completedAt desc.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const user = auth.user;

  try {
    const { id } = await params;
    const quiz = await db.quiz.findUnique({
      where: { id },
      select: { id: true, courseId: true },
    });
    if (!quiz) {
      return NextResponse.json(
        { ok: false, error: "Kuiz tidak dijumpai" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get("userId")?.trim() || "";

    const isPrivileged = hasRole(
      user,
      "admin" as Role,
      "project_admin" as Role,
      "project_manager" as Role
    );

    let targetUserId = user.id;
    if (userIdParam) {
      if (!isPrivileged && userIdParam !== user.id) {
        return NextResponse.json(
          { ok: false, error: "Tidak dibenarkan melihat percubaan pengguna lain" },
          { status: 403 }
        );
      }
      targetUserId = userIdParam;
    }

    const attempts = await db.quizAttempt.findMany({
      where: {
        quizId: id,
        userId: targetUserId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: true,
          },
        },
      },
      orderBy: { completedAt: "desc" },
    });

    return NextResponse.json({ ok: true, attempts });
  } catch (err) {
    console.error("[quizzes/[id]/attempts GET] error:", err);
    return NextResponse.json(
      { ok: false, error: "Ralat pelayan. Sila cuba lagi." },
      { status: 500 }
    );
  }
}
