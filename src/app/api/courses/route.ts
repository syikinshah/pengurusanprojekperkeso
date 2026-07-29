import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, requireRole, hasRole } from "@/lib/api-auth";
import type { Role } from "@/lib/types";

// Allowed course categories and levels (Bahasa Malaysia)
const ALLOWED_CATEGORIES = [
  "Teknikal",
  "Pengurusan",
  "Kewangan",
  "Teknologi",
  "Umum",
] as const;
const ALLOWED_LEVELS = ["Asas", "Pertengahan", "Lanjutan"] as const;
const ALLOWED_STATUSES = ["aktif", "tidak_aktif", "draf"] as const;

// Schema for creating a course
const CreateCourseSchema = z.object({
  title: z.string().min(1, "Tajuk kursus diperlukan"),
  description: z.string().min(1, "Penerangan kursus diperlukan"),
  category: z.enum(ALLOWED_CATEGORIES).default("Umum"),
  level: z.enum(ALLOWED_LEVELS).default("Pertengahan"),
  duration: z.number().min(0).default(0),
  instructor: z.string().optional(),
  status: z.enum(ALLOWED_STATUSES).default("aktif"),
});

/**
 * GET /api/courses
 * Public to authenticated users. Returns all courses with creator and counts.
 * Query params:
 *   - search: filter by title/description
 *   - category: filter by category
 *   - level: filter by level
 *   - status: filter by status (admin/p_admin can request any; others always see only aktif)
 *
 * By default, non-admin/p_admin users only see `aktif` courses.
 * Admin and project_admin can see all statuses (unless they explicitly pass ?status=)
 */
export async function GET(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const user = auth.user;

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const category = searchParams.get("category")?.trim() || "";
    const level = searchParams.get("level")?.trim() || "";
    const statusParam = searchParams.get("status")?.trim() || "";

    // Permission: only admin and project_admin can view non-aktif courses
    const canSeeAllStatuses = hasRole(user, "admin" as Role, "project_admin" as Role);
    // Default status filter
    const statusFilter = canSeeAllStatuses
      ? statusParam || "" // admin can pass any status, or empty (= all)
      : "aktif"; // non-admin always restricted to aktif (ignore statusParam)

    // Build where clause
    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { instructor: { contains: search } },
      ];
    }
    if (category) where.category = category;
    if (level) where.level = level;
    if (statusFilter) where.status = statusFilter;

    const courses = await db.course.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true } },
        _count: {
          select: {
            materials: true,
            enrollments: true,
            quizzes: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, courses });
  } catch (err) {
    console.error("[courses GET] error:", err);
    return NextResponse.json(
      { ok: false, error: "Ralat pelayan. Sila cuba lagi." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/courses
 * Requires role admin or project_admin.
 * Body: { title, description, category, level?, duration?, instructor?, status? }
 */
export async function POST(req: Request) {
  const auth = await requireRole("admin", "project_admin");
  if (!auth.ok) return auth.response;
  const user = auth.user;

  try {
    const body = await req.json().catch(() => null);
    const parsed = CreateCourseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak sah" },
        { status: 400 }
      );
    }
    const data = parsed.data;

    const course = await db.course.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        level: data.level,
        duration: data.duration,
        instructor: data.instructor ?? null,
        status: data.status,
        createdBy: user.id,
      },
      include: {
        creator: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ ok: true, course }, { status: 201 });
  } catch (err) {
    console.error("[courses POST] error:", err);
    return NextResponse.json(
      { ok: false, error: "Ralat pelayan. Sila cuba lagi." },
      { status: 500 }
    );
  }
}
