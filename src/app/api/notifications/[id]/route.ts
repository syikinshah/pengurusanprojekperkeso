import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, apiError } from "@/lib/api-auth";

// ============================
// DELETE /api/notifications/:id
// Owner only. Deletes the notification.
// Returns: { ok: true }
// ============================
export async function DELETE(
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
    if (notif.userId !== auth.user.id && auth.user.role !== "admin") {
      return apiError(
        "Tidak dibenarkan. Anda hanya boleh memadam notifikasi anda sendiri.",
        403,
      );
    }

    await db.notification.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[notifications/id.DELETE] error:", e);
    return apiError("Ralat pelayan ketika memadam notifikasi.", 500);
  }
}
