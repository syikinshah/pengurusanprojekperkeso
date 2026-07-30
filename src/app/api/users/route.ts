import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, requireAdmin, stripPassword } from "@/lib/api-auth";
import type { Role } from "@/lib/types";

// ============================
// GET /api/users
// List all users. Any authenticated user can read (for assignment dropdowns).
// Query params: ?role=xxx  ?search=xxx  ?active=true
// ============================
export async function GET(req: Request) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");
    const search = searchParams.get("search")?.trim();
    const active = searchParams.get("active");

    const where: {
      role?: string;
      isActive?: boolean;
      OR?: Array<{
        email?: { contains: string };
        name?: { contains: string };
        department?: { contains: string };
        position?: { contains: string };
      }>;
    } = {};

    if (role) where.role = role;
    if (active === "true") where.isActive = true;
    if (active === "false") where.isActive = false;
    if (search) {
      where.OR = [
        { email: { contains: search } },
        { name: { contains: search } },
        { department: { contains: search } },
        { position: { contains: search } },
      ];
    }

    const users = await db.user.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });

    return NextResponse.json(users.map((u) => stripPassword(u)));
  } catch (err) {
    console.error("[users GET] error:", err);
    return NextResponse.json(
      { ok: false, error: "Ralat pelayan. Sila cuba lagi." },
      { status: 500 }
    );
  }
}

// ============================
// POST /api/users  (admin only)
// Create a new user.
// Body: { email, password, name, role, department, position?, phone? }
// ============================
const CreateUserSchema = z.object({
  email: z.string().email("E-mel tidak sah"),
  password: z.string().min(6, "Kata laluan mesti sekurang-kurangnya 6 aksara"),
  name: z.string().min(1, "Nama diperlukan"),
  role: z.enum([
    "admin",
    "project_manager",
    "project_admin",
    "trainee",
    "upper_management",
  ]),
  department: z.string().min(1, "Jabatan diperlukan"),
  position: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => null);
    const parsed = CreateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Data tidak sah",
        },
        { status: 400 }
      );
    }
    const data = parsed.data;

    // Normalize email and check uniqueness.
    const email = data.email.toLowerCase();
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "E-mel telah wujud dalam sistem" },
        { status: 400 }
      );
    }

    const created = await db.user.create({
      data: {
        email,
        password: `hash_${data.password}`,
        name: data.name,
        role: data.role as Role,
        department: data.department,
        position: data.position ?? null,
        phone: data.phone ?? null,
        avatarUrl: data.avatarUrl ?? null,
        isActive: true,
      },
    });

    return NextResponse.json({ ok: true, user: stripPassword(created) }, { status: 201 });
  } catch (err) {
    console.error("[users POST] error:", err);
    return NextResponse.json(
      { ok: false, error: "Ralat pelayan. Sila cuba lagi." },
      { status: 500 }
    );
  }
}
