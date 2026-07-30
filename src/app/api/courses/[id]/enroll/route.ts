import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

/**
 * POST /api/courses/[id]/enroll
 * Any authenticated user. Enrolls current user into course.
 * If already enrolled, returns existing enrollment.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const user = auth.user;

  try {
    const { id } = await params;

    // Verify course exists
    const course = await db.course.findUnique({
      where: { id },
      select: { id: true, status: true, title: true },
    });
    if (!course) {
      return NextResponse.json(
        { ok: false, error: "Kursus tidak dijumpai" },
        { status: 404 }
      );
    }
    if (course.status !== "aktif") {
      return NextResponse.json(
        { ok: false, error: "Kursus ini tidak aktif dan tidak boleh didaftarkan" },
        { status: 400 }
      );
    }

    // Check for existing enrollment
    const existing = await db.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: id } },
      include: { course: { select: { id: true, title: true } } },
    });
    if (existing) {
      return NextResponse.json({ ok: true, enrollment: existing });
    }

    // Create new enrollment
    const enrollment = await db.enrollment.create({
      data: {
        userId: user.id,
        courseId: id,
        progress: 0,
        status: "belum_mula",
        lastAccessedAt: new Date(),
      },
      include: { course: { select: { id: true, title: true } } },
    });

    return NextResponse.json({ ok: true, enrollment }, { status: 201 });
  } catch (err) {
    console.error("[courses/[id]/enroll POST] error:", err);
    return NextResponse.json(
      { ok: false, error: "Ralat pelayan. Sila cuba lagi." },
      { status: 500 }
    );
  }
}
