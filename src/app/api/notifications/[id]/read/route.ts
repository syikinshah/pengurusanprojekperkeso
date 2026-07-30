import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError } from "@/lib/api-auth";

// ============================
// POST /api/notifications/:id/read
// Owner only. Marks notification as read (isRead = true).
// ============================
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const notif = await db.notification.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
    if (!notif) {
      return apiError("Notifikasi tidak dijumpai.", 404);
    }
    if (notif.userId !== auth.user.id) {
      return apiError(
        "Tidak dibenarkan. Anda hanya boleh menandai notifikasi anda sendiri.",
        403,
      );
    }

    const updated = await db.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (e) {
    console.error("[notifications/read.POST] error:", e);
    return apiError("Ralat pelayan ketika menandai notifikasi.", 500);
  }
}

// PATCH as an alias for the same operation
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return POST(request, { params });
}
