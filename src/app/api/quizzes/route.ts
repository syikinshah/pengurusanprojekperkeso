import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/api-auth";

const CreateQuizSchema = z.object({
  courseId: z.string().min(1, "ID kursus diperlukan"),
  title: z.string().min(1, "Tajuk kuiz diperlukan"),
  description: z.string().optional().nullable(),
  passScore: z.number().min(0).max(100).optional(),
  duration: z.number().int().min(1).optional(),
  order: z.number().int().min(0).optional(),
});

/**
 * POST /api/quizzes
 * Requires admin or project_admin.
 * Body: { courseId, title, description?, passScore?, duration? }
 */
export async function POST(req: Request) {
  const auth = await requireRole("admin", "project_admin");
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json().catch(() => null);
    const parsed = CreateQuizSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak sah" },
        { status: 400 }
      );
    }
    const data = parsed.data;

    // Verify course exists
    const course = await db.course.findUnique({
      where: { id: data.courseId },
      select: { id: true },
    });
    if (!course) {
      return NextResponse.json(
        { ok: false, error: "Kursus tidak dijumpai" },
        { status: 404 }
      );
    }

    // If no order provided, append after last
    let order = data.order;
    if (order === undefined) {
      const last = await db.quiz.findFirst({
        where: { courseId: data.courseId },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      order = (last?.order ?? 0) + 1;
    }

    const quiz = await db.quiz.create({
      data: {
        courseId: data.courseId,
        title: data.title,
        description: data.description ?? null,
        passScore: data.passScore ?? 60,
        duration: data.duration ?? 15,
        order,
      },
      include: { questions: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({ ok: true, quiz }, { status: 201 });
  } catch (err) {
    console.error("[quizzes POST] error:", err);
    return NextResponse.json(
      { ok: false, error: "Ralat pelayan. Sila cuba lagi." },
      { status: 500 }
    );
  }
}
