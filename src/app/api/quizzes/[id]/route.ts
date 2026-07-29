import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, requireRole, hasRole } from "@/lib/api-auth";
import type { Role } from "@/lib/types";

const UpdateQuizSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  passScore: z.number().min(0).max(100).optional(),
  duration: z.number().int().min(1).optional(),
  order: z.number().int().min(0).optional(),
});

/**
 * GET /api/quizzes/[id]
 * Any authenticated user. Returns quiz with questions.
 * IMPORTANT: For trainees, omit the `answer` field on questions.
 * For admin/project_admin, include the `answer` field (grading view).
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
    const quiz = await db.quiz.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, title: true } },
        questions: { orderBy: { order: "asc" } },
      },
    });

    if (!quiz) {
      return NextResponse.json(
        { ok: false, error: "Kuiz tidak dijumpai" },
        { status: 404 }
      );
    }

    // Determine if requester should see answers
    const canSeeAnswers = hasRole(user, "admin" as Role, "project_admin" as Role);

    if (!canSeeAnswers) {
      // Omit answer field for trainees (return options only)
      const questions = quiz.questions.map((q) => ({
        id: q.id,
        quizId: q.quizId,
        text: q.text,
        type: q.type,
        options: q.options,
        points: q.points,
        order: q.order,
      }));
      const { questions: _qs, ...quizWithoutQuestions } = quiz;
      return NextResponse.json({
        ok: true,
        quiz: { ...quizWithoutQuestions, questions },
      });
    }

    return NextResponse.json({ ok: true, quiz });
  } catch (err) {
    console.error("[quizzes/[id] GET] error:", err);
    return NextResponse.json(
      { ok: false, error: "Ralat pelayan. Sila cuba lagi." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/quizzes/[id]
 * Requires admin or project_admin. Updates quiz fields.
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole("admin", "project_admin");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const existing = await db.quiz.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Kuiz tidak dijumpai" },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = UpdateQuizSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak sah" },
        { status: 400 }
      );
    }

    const updated = await db.quiz.update({
      where: { id },
      data: parsed.data,
      include: {
        course: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json({ ok: true, quiz: updated });
  } catch (err) {
    console.error("[quizzes/[id] PUT] error:", err);
    return NextResponse.json(
      { ok: false, error: "Ralat pelayan. Sila cuba lagi." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/quizzes/[id]
 * Requires admin or project_admin. Hard delete. Cascades to questions & attempts.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole("admin", "project_admin");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const existing = await db.quiz.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Kuiz tidak dijumpai" },
        { status: 404 }
      );
    }

    await db.quiz.delete({ where: { id } });
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("[quizzes/[id] DELETE] error:", err);
    return NextResponse.json(
      { ok: false, error: "Ralat pelayan. Sila cuba lagi." },
      { status: 500 }
    );
  }
}
