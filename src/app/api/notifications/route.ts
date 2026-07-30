import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  requireAuth,
  requireRole,
  apiError,
} from "@/lib/api-auth";

const VALID_NOTIF_TYPES = ["info", "success", "warning", "error"] as const;
const VALID_NOTIF_CATEGORIES = [
  "invoice",
  "course",
  "system",
  "general",
] as const;

// ============================
// GET /api/notifications
// Any authenticated user. Returns notifications for current user, sorted by createdAt desc.
// Query: ?unreadOnly=true ?category=
// Returns: { ok: true, data: Notification[] }
// ============================
export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const category = searchParams.get("category") || undefined;

    const where: {
      userId: string;
      isRead?: boolean;
      category?: string;
    } = { userId: auth.user.id };
    if (unreadOnly) where.isRead = false;
    if (category) where.category = category;

    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const unreadCount = await db.notification.count({
      where: { userId: auth.user.id, isRead: false },
    });

    return NextResponse.json({
      ok: true,
      data: notifications,
      unreadCount,
    });
  } catch (e) {
    console.error("[notifications.GET] error:", e);
    return apiError("Ralat pelayan ketika mendapatkan notifikasi.", 500);
  }
}

// ============================
// POST /api/notifications
// Roles: admin | project_admin | project_manager
// Body: { userId, title, message, type?, category?, link? }
// ============================
const CreateNotificationSchema = z.object({
  userId: z.string().min(1, "ID pengguna diperlukan"),
  title: z.string().min(1, "Tajuk diperlukan"),
  message: z.string().min(1, "Mesej diperlukan"),
  type: z.enum(VALID_NOTIF_TYPES).optional(),
  category: z.enum(VALID_NOTIF_CATEGORIES).optional(),
  link: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const auth = await requireRole([
      "admin",
      "project_admin",
      "project_manager",
    ]);
    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => null);
    const parsed = CreateNotificationSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        parsed.error.issues[0]?.message ?? "Data tidak sah",
        400,
      );
    }
    const data = parsed.data;

    const user = await db.user.findUnique({
      where: { id: data.userId },
      select: { id: true, isActive: true },
    });
    if (!user) {
      return apiError("Pengguna destinasi tidak dijumpai.", 400);
    }

    const created = await db.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type ?? "info",
        category: data.category ?? "general",
        link: data.link ?? null,
      },
    });

    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (e) {
    console.error("[notifications.POST] error:", e);
    return apiError("Ralat pelayan ketika mencipta notifikasi.", 500);
  }
}
