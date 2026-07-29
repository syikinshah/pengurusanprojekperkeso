import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, hasRole } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

// Two schemas: admin can use simple; self must provide oldPassword.
const AdminChangeSchema = z.object({
  newPassword: z
    .string()
    .min(6, "Kata laluan baharu mesti sekurang-kurangnya 6 aksara"),
});

const SelfChangeSchema = z.object({
  oldPassword: z.string().min(1, "Kata laluan lama diperlukan"),
  newPassword: z
    .string()
    .min(6, "Kata laluan baharu mesti sekurang-kurangnya 6 aksara"),
});

export async function PUT(req: Request, { params }: Params) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const me = auth.user;
    const { id } = await params;
    const target = await db.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json(
        { ok: false, error: "Pengguna tidak dijumpai" },
        { status: 404 }
      );
    }

    const isAdmin = hasRole(me, "admin");
    const isSelf = me.id === id;

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { ok: false, error: "Tidak dibenarkan menukar kata laluan pengguna lain." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);

    let newPassword: string;
    if (isAdmin && !isSelf) {
      // admin changing someone else's password - no oldPassword required.
      const parsed = AdminChangeSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak sah" },
          { status: 400 }
        );
      }
      newPassword = parsed.data.newPassword;
    } else {
      // self-change OR admin changing own password - verify oldPassword.
      const parsed = SelfChangeSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak sah" },
          { status: 400 }
        );
      }
      const { oldPassword, newPassword: newPw } = parsed.data;
      if (target.password !== `hash_${oldPassword}`) {
        return NextResponse.json(
          { ok: false, error: "Kata laluan lama tidak sah" },
          { status: 401 }
        );
      }
      if (oldPassword === newPw) {
        return NextResponse.json(
          { ok: false, error: "Kata laluan baharu tidak boleh sama dengan kata laluan lama" },
          { status: 400 }
        );
      }
      newPassword = newPw;
    }

    await db.user.update({
      where: { id },
      data: { password: `hash_${newPassword}` },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[users/[id]/password PUT] error:", err);
    return NextResponse.json(
      { ok: false, error: "Ralat pelayan. Sila cuba lagi." },
      { status: 500 }
    );
  }
}
