import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, requireRole } from "@/lib/api-auth";

const ALLOWED_CATEGORIES = [
  "Teknikal",
  "Pengurusan",
  "Kewangan",
  "Teknologi",
  "Umum",
] as const;
const ALLOWED_LEVELS = ["Asas", "Pertengahan", "Lanjutan"] as const;
const ALLOWED_STATUSES = ["aktif", "tidak_aktif", "draf"] as const;

const UpdateCourseSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  category: z.enum(ALLOWED_CATEGORIES).optional(),
  level: z.enum(ALLOWED_LEVELS).optional(),
  duration: z.number().min(0).optional(),
  instructor: z.string().optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
  status: z.enum(ALLOWED_STATUSES).optional(),
});

/**
 * GET /api/courses/[id]
 * Any authenticated user. Returns course with materials (sorted by order),
 * quizzes (with questions), creator, and _count of enrollments.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const course = await db.course.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, name: true } },
        materials: { orderBy: { order: "asc" } },
        quizzes: {
          include: { questions: { orderBy: { order: "asc" } } },
          orderBy: { order: "asc" },
        },
        _count: { select: { enrollments: true } },
      },
    });

    if (!course) {
      return NextResponse.json(
        { ok: false, error: "Kursus tidak dijumpai" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, course });
  } catch (err) {
    console.error("[courses/[id] GET] error:", err);
    return NextResponse.json(
      { ok: false, error: "Ralat pelayan. Sila cuba lagi." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/courses/[id]
 * Requires admin or project_admin. Updates course fields.
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole("admin", "project_admin");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = UpdateCourseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak sah" },
        { status: 400 }
      );
    }

    const existing = await db.course.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Kursus tidak dijumpai" },
        { status: 404 }
      );
    }

    const updated = await db.course.update({
      where: { id },
      data: parsed.data,
      include: {
        creator: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ ok: true, course: updated });
  } catch (err) {
    console.error("[courses/[id] PUT] error:", err);
    return NextResponse.json(
      { ok: false, error: "Ralat pelayan. Sila cuba lagi." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/courses/[id]
 * Requires admin. Hard delete. Cascades to materials, quizzes, questions,
 * quiz attempts, and enrollments (via onDelete: Cascade in Prisma schema).
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole("admin");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const existing = await db.course.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Kursus tidak dijumpai" },
        { status: 404 }
      );
    }

    await db.course.delete({ where: { id } });
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("[courses/[id] DELETE] error:", err);
    return NextResponse.json(
      { ok: false, error: "Ralat pelayan. Sila cuba lagi." },
      { status: 500 }
    );
  }
}
