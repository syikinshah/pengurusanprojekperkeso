import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError } from "@/lib/api-auth";

// ============================
// POST /api/notifications/read-all
// Any authenticated user. Marks all of the current user's notifications as read.
// Returns: { ok: true, count }
// ============================
export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const result = await db.notification.updateMany({
      where: { userId: auth.user.id, isRead: false },
      data: { isRead: true },
    });

    return NextResponse.json({ ok: true, count: result.count });
  } catch (e) {
    console.error("[notifications/read-all.POST] error:", e);
    return apiError("Ralat pelayan ketika menandai semua notifikasi.", 500);
  }
}
