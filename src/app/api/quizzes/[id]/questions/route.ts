import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/api-auth";

const ALLOWED_QUESTION_TYPES = ["single", "multiple", "true_false"] as const;

const CreateQuestionSchema = z.object({
  text: z.string().min(1, "Teks soalan diperlukan"),
  type: z.enum(ALLOWED_QUESTION_TYPES).default("single"),
  options: z.array(z.string().min(1)).min(2, "Sekurang-kurangnya 2 pilihan diperlukan"),
  answer: z.array(z.number().int().min(0)).min(1, "Sekurang-kurangnya 1 jawapan betul diperlukan"),
  points: z.number().int().min(1).optional(),
  order: z.number().int().min(0).optional(),
});

/**
 * POST /api/quizzes/[id]/questions
 * Requires admin or project_admin.
 * Body: { text, type, options: string[], answer: number[], points?, order? }
 * Note: options/answer come as arrays; stored as JSON strings in DB.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole("admin", "project_admin");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;

    const quiz = await db.quiz.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!quiz) {
      return NextResponse.json(
        { ok: false, error: "Kuiz tidak dijumpai" },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = CreateQuestionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak sah" },
        { status: 400 }
      );
    }
    const data = parsed.data;

    // Validate answer indexes are within bounds of options
    for (const idx of data.answer) {
      if (idx >= data.options.length) {
        return NextResponse.json(
          { ok: false, error: "Index jawapan betul di luar julat pilihan" },
          { status: 400 }
        );
      }
    }

    // If no order provided, append after last
    let order = data.order;
    if (order === undefined) {
      const last = await db.question.findFirst({
        where: { quizId: id },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      order = (last?.order ?? 0) + 1;
    }

    const question = await db.question.create({
      data: {
        quizId: id,
        text: data.text,
        type: data.type,
        options: JSON.stringify(data.options),
        answer: JSON.stringify(data.answer),
        points: data.points ?? 1,
        order,
      },
    });

    return NextResponse.json({ ok: true, question }, { status: 201 });
  } catch (err) {
    console.error("[quizzes/[id]/questions POST] error:", err);
    return NextResponse.json(
      { ok: false, error: "Ralat pelayan. Sila cuba lagi." },
      { status: 500 }
    );
  }
}
