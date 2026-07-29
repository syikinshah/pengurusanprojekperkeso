import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/api-auth";

const ALLOWED_MATERIAL_TYPES = ["pdf", "video", "slide", "link", "document"] as const;

const UpdateMaterialSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.enum(ALLOWED_MATERIAL_TYPES).optional(),
  url: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  duration: z.number().min(0).optional().nullable(),
  order: z.number().int().min(0).optional(),
});

/**
 * PUT /api/courses/[id]/materials/[materialId]
 * Requires admin or project_admin. Updates a material.
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; materialId: string }> }
) {
  const auth = await requireRole("admin", "project_admin");
  if (!auth.ok) return auth.response;

  try {
    const { id, materialId } = await params;
    const existing = await db.material.findUnique({
      where: { id: materialId },
      select: { courseId: true },
    });
    if (!existing || existing.courseId !== id) {
      return NextResponse.json(
        { ok: false, error: "Bahan tidak dijumpai untuk kursus ini" },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = UpdateMaterialSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak sah" },
        { status: 400 }
      );
    }

    const updated = await db.material.update({
      where: { id: materialId },
      data: parsed.data,
    });

    return NextResponse.json({ ok: true, material: updated });
  } catch (err) {
    console.error("[materials PUT] error:", err);
    return NextResponse.json(
      { ok: false, error: "Ralat pelayan. Sila cuba lagi." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/courses/[id]/materials/[materialId]
 * Requires admin or project_admin. Deletes a material.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; materialId: string }> }
) {
  const auth = await requireRole("admin", "project_admin");
  if (!auth.ok) return auth.response;

  try {
    const { id, materialId } = await params;
    const existing = await db.material.findUnique({
      where: { id: materialId },
      select: { courseId: true },
    });
    if (!existing || existing.courseId !== id) {
      return NextResponse.json(
        { ok: false, error: "Bahan tidak dijumpai untuk kursus ini" },
        { status: 404 }
      );
    }

    await db.material.delete({ where: { id: materialId } });
    return NextResponse.json({ ok: true, id: materialId });
  } catch (err) {
    console.error("[materials DELETE] error:", err);
    return NextResponse.json(
      { ok: false, error: "Ralat pelayan. Sila cuba lagi." },
      { status: 500 }
    );
  }
}
