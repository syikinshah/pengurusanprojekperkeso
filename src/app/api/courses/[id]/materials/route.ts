import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, requireRole } from "@/lib/api-auth";

const ALLOWED_MATERIAL_TYPES = ["pdf", "video", "slide", "link", "document"] as const;

const CreateMaterialSchema = z.object({
  title: z.string().min(1, "Tajuk bahan diperlukan"),
  type: z.enum(ALLOWED_MATERIAL_TYPES).default("pdf"),
  url: z.string().min(1, "URL bahan diperlukan"),
  description: z.string().optional().nullable(),
  duration: z.number().min(0).optional().nullable(),
  order: z.number().int().min(0).optional(),
});

/**
 * GET /api/courses/[id]/materials
 * Any authenticated user. Returns materials of a course sorted by order.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const course = await db.course.findUnique({ where: { id }, select: { id: true } });
    if (!course) {
      return NextResponse.json(
        { ok: false, error: "Kursus tidak dijumpai" },
        { status: 404 }
      );
    }

    const materials = await db.material.findMany({
      where: { courseId: id },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ ok: true, materials });
  } catch (err) {
    console.error("[materials GET] error:", err);
    return NextResponse.json(
      { ok: false, error: "Ralat pelayan. Sila cuba lagi." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/courses/[id]/materials
 * Requires admin or project_admin.
 * Body: { title, type, url, description?, duration?, order? }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole("admin", "project_admin");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const course = await db.course.findUnique({ where: { id }, select: { id: true } });
    if (!course) {
      return NextResponse.json(
        { ok: false, error: "Kursus tidak dijumpai" },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = CreateMaterialSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak sah" },
        { status: 400 }
      );
    }
    const data = parsed.data;

    // If no order provided, set to max+1
    let order = data.order;
    if (order === undefined) {
      const last = await db.material.findFirst({
        where: { courseId: id },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      order = (last?.order ?? 0) + 1;
    }

    const material = await db.material.create({
      data: {
        courseId: id,
        title: data.title,
        type: data.type,
        url: data.url,
        description: data.description ?? null,
        duration: data.duration ?? null,
        order,
      },
    });

    return NextResponse.json({ ok: true, material }, { status: 201 });
  } catch (err) {
    console.error("[materials POST] error:", err);
    return NextResponse.json(
      { ok: false, error: "Ralat pelayan. Sila cuba lagi." },
      { status: 500 }
    );
  }
}
