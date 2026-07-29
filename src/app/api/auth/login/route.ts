import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";
import { stripPassword } from "@/lib/api-auth";
import type { Role } from "@/lib/types";

const LoginSchema = z.object({
  email: z.string().email("E-mel tidak sah"),
  password: z.string().min(1, "Kata laluan diperlukan"),
});

const ALLOWED_ROLES: Role[] = [
  "admin",
  "project_manager",
  "project_admin",
  "trainee",
  "upper_management",
];

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error:
            parsed.error.issues[0]?.message ?? "Data tidak sah",
        },
        { status: 400 }
      );
    }
    const { email, password } = parsed.data;

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always check both existence and password to reduce timing-attack info leak.
    if (
      !user ||
      user.password !== `hash_${password}` ||
      !user.isActive
    ) {
      return NextResponse.json(
        { ok: false, error: "E-mel atau kata laluan tidak sah" },
        { status: 401 }
      );
    }

    // Defensive: ensure role is one of allowed (in case seed has bad data).
    if (!ALLOWED_ROLES.includes(user.role as Role)) {
      return NextResponse.json(
        { ok: false, error: "Peranan pengguna tidak sah" },
        { status: 403 }
      );
    }

    await setSessionCookie(user.id);

    return NextResponse.json({
      ok: true,
      user: stripPassword(user),
    });
  } catch (err) {
    console.error("[auth/login] error:", err);
    return NextResponse.json(
      { ok: false, error: "Ralat pelayan. Sila cuba lagi." },
      { status: 500 }
    );
  }
}
