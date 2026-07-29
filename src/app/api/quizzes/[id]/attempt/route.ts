import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

const AttemptSchema = z.object({
  answers: z.record(z.string(), z.array(z.number().int().min(0))),
});

// Compare two arrays of indexes, order-insensitive
function indexSetsEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].map((n) => Number(n)).sort((x, y) => x - y);
  const sb = [...b].map((n) => Number(n)).sort((x, y) => x - y);
  return sa.every((v, i) => v === sb[i]);
}

/**
 * POST /api/quizzes/[id]/attempt
 * Requires auth. Body: { answers: Record<questionId, number[]> }
 *
 * Logic:
 *  - Load quiz with questions
 *  - Compute score: each question, compare selected indexes to correct answer
 *    indexes (order-insensitive). Award points if match.
 *  - percentage = earnedPoints / totalPoints * 100
 *  - passed = percentage >= quiz.passScore
 *  - Create QuizAttempt record (answers as JSON string)
 *  - If passed, update enrollment (progress toward completion, status, cert)
 *
 * Returns: { attempt, score, passed, correctAnswers }
 */
export async function POST(
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
      include: { questions: true, course: { select: { id: true } } },
    });
    if (!quiz) {
      return NextResponse.json(
        { ok: false, error: "Kuiz tidak dijumpai" },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = AttemptSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Format jawapan tidak sah" },
        { status: 400 }
      );
    }
    const answersMap: Record<string, number[]> = parsed.data.answers;

    // Compute score
    let earnedPoints = 0;
    let totalPoints = 0;
    const correctAnswers: Record<string, number[]> = {};

    for (const question of quiz.questions) {
      totalPoints += question.points;
      let correctArr: number[] = [];
      try {
        correctArr = JSON.parse(question.answer) as number[];
      } catch {
        correctArr = [];
      }
      correctAnswers[question.id] = correctArr;

      const selected = answersMap[question.id] ?? [];
      if (indexSetsEqual(selected, correctArr)) {
        earnedPoints += question.points;
      }
    }

    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = score >= quiz.passScore;

    // Persist attempt
    const attempt = await db.quizAttempt.create({
      data: {
        quizId: id,
        userId: user.id,
        score: Math.round(score * 100) / 100,
        totalPoints,
        earnedPoints,
        passed,
        answers: JSON.stringify(answersMap),
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });

    // If passed, update enrollment (find by userId + courseId)
    if (passed && quiz.courseId) {
      const enrollment = await db.enrollment.findUnique({
        where: {
          userId_courseId: { userId: user.id, courseId: quiz.courseId },
        },
      });

      if (enrollment) {
        // Compute course completion: count total quizzes for course
        const totalQuizzes = await db.quiz.count({ where: { courseId: quiz.courseId } });
        // Find how many quizzes the user has passed
        const passedQuizIds = await db.quizAttempt.findMany({
          where: {
            userId: user.id,
            quiz: { courseId: quiz.courseId },
            passed: true,
          },
          distinct: ["quizId"],
          select: { quizId: true },
        });
        const passedCount = passedQuizIds.length;
        const ratio = totalQuizzes > 0 ? passedCount / totalQuizzes : 1;
        // Bump progress toward completion; only ever go up, never downgrade
        const computedProgress = Math.min(100, Math.round(ratio * 100));
        const newProgress = Math.max(enrollment.progress, computedProgress);

        const updateData: Record<string, unknown> = {
          lastAccessedAt: new Date(),
        };

        // Only update progress if it actually increased
        if (newProgress > enrollment.progress) {
          updateData.progress = newProgress;
        }

        // Always derive the appropriate status; do not downgrade "selesai"
        if (newProgress >= 100) {
          updateData.status = "selesai";
          if (!enrollment.completedAt) updateData.completedAt = new Date();
          if (!enrollment.certificateUrl) {
            updateData.certificateUrl = `/certs/cert-${enrollment.id}.pdf`;
          }
        } else if (enrollment.status !== "selesai") {
          // Don't downgrade a completed course
          if (newProgress > 0) {
            updateData.status = "dalam_proses";
          } else if (enrollment.status !== "dalam_proses") {
            updateData.status = "belum_mula";
          }
        }

        await db.enrollment.update({
          where: { id: enrollment.id },
          data: updateData,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      attempt,
      score: Math.round(score * 100) / 100,
      passed,
      correctAnswers,
    }, { status: 201 });
  } catch (err) {
    console.error("[quizzes/[id]/attempt POST] error:", err);
    return NextResponse.json(
      { ok: false, error: "Ralat pelayan. Sila cuba lagi." },
      { status: 500 }
    );
  }
}
