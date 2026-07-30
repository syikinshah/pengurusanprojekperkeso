import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, stripPassword, hasRole } from "@/lib/api-auth";
import type { Role, User } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

// ============================
// GET /api/users/[id]
// Any authenticated user can read a profile.
// ============================
export async function GET(_req: Request, { params }: Params) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Pengguna tidak dijumpai" },
        { status: 404 }
      );
    }
    return NextResponse.json(stripPassword(user));
  } catch (err) {
    console.error("[users/[id] GET] error:", err);
    return NextResponse.json(
      { ok: false, error: "Ralat pelayan. Sila cuba lagi." },
      { status: 500 }
    );
  }
}

// ============================
// PUT /api/users/[id]
// - Admin: can update role, isActive, name, phone, avatarUrl, department, position, email.
// - Self (non-admin): can update own name, phone, avatarUrl, department, position only.
//   Cannot self-deactivate (isActive=false) and cannot change role.
// Password is never updated here (use /api/users/[id]/password route).
// ============================
const AdminUpdateSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  role: z
    .enum(["admin", "project_manager", "project_admin", "trainee", "upper_management"])
    .optional(),
  department: z.string().min(1).optional(),
  position: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
});

const SelfUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  department: z.string().min(1).optional(),
  position: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export async function PUT(req: Request, { params }: Params) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const me: User = auth.user;
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
        { ok: false, error: "Tidak dibenarkan. Anda hanya boleh mengemaskini profil sendiri." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);

    let dataToUpdate: Record<string, unknown> = {};
    if (isAdmin) {
      const parsed = AdminUpdateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak sah" },
          { status: 400 }
        );
      }
      const d = parsed.data;
      // Prevent admin from deactivating themselves (lock-out protection).
      if (d.isActive === false && isSelf) {
        return NextResponse.json(
          { ok: false, error: "Anda tidak boleh menyahaktifkan akaun sendiri." },
          { status: 400 }
        );
      }
      // Email uniqueness check
      if (d.email && d.email.toLowerCase() !== target.email.toLowerCase()) {
        const exists = await db.user.findUnique({
          where: { email: d.email.toLowerCase() },
        });
        if (exists) {
          return NextResponse.json(
            { ok: false, error: "E-mel telah digunakan oleh pengguna lain" },
            { status: 400 }
          );
        }
        dataToUpdate.email = d.email.toLowerCase();
      }
      dataToUpdate = {
        ...dataToUpdate,
        name: d.name,
        role: d.role as Role | undefined,
        department: d.department,
        position: d.position,
        phone: d.phone,
        avatarUrl: d.avatarUrl,
        isActive: d.isActive,
      };
      // Drop undefined values so Prisma doesn't accidentally null them.
      Object.keys(dataToUpdate).forEach(
        (k) => dataToUpdate[k] === undefined && delete dataToUpdate[k]
      );
    } else {
      // self-update, restricted fields
      const parsed = SelfUpdateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak sah" },
          { status: 400 }
        );
      }
      const d = parsed.data;
      dataToUpdate = {
        name: d.name,
        department: d.department,
        position: d.position,
        phone: d.phone,
        avatarUrl: d.avatarUrl,
      };
      Object.keys(dataToUpdate).forEach(
        (k) => dataToUpdate[k] === undefined && delete dataToUpdate[k]
      );
    }

    const updated = await db.user.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json({ ok: true, user: stripPassword(updated) });
  } catch (err) {
    console.error("[users/[id] PUT] error:", err);
    return NextResponse.json(
      { ok: false, error: "Ralat pelayan. Sila cuba lagi." },
      { status: 500 }
    );
  }
}

// ============================
// DELETE /api/users/[id]  (admin only, soft-delete)
// Sets isActive=false. Cannot delete self.
// ============================
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const me = auth.user;
    const { id } = await params;

    if (!hasRole(me, "admin")) {
      return NextResponse.json(
        { ok: false, error: "Tidak dibenarkan. Hanya pentadbir boleh memadam pengguna." },
        { status: 403 }
      );
    }
    if (me.id === id) {
      return NextResponse.json(
        { ok: false, error: "Anda tidak boleh memadam akaun sendiri." },
        { status: 400 }
      );
    }

    const target = await db.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json(
        { ok: false, error: "Pengguna tidak dijumpai" },
        { status: 404 }
      );
    }

    await db.user.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[users/[id] DELETE] error:", err);
    return NextResponse.json(
      { ok: false, error: "Ralat pelayan. Sila cuba lagi." },
      { status: 500 }
    );
  }
}
