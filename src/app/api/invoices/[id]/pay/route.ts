import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, PA_ROLES, apiError } from "@/lib/api-auth";

// ============================
// POST /api/invoices/:id/pay
// Roles: admin | project_admin
// Body: { remarks? }
// Current status must be diluluskan.
// Sets status -> dibayar, paidAt = now.
// History entry: paid.
// Notifications: PM (approvedBy) + createdBy.
// ============================
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireRole(PA_ROLES);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const remarks =
      body && typeof body === "object" && "remarks" in body
        ? ((body as Record<string, unknown>).remarks as string) ?? null
        : null;

    const existing = await db.invoice.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, projectName: true } },
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });
    if (!existing) {
      return apiError("Invois tidak dijumpai.", 404);
    }
    if (existing.status !== "diluluskan") {
      return apiError(
        `Hanya invois berstatus "diluluskan" boleh ditandai dibayar. Status semasa: ${existing.status}.`,
        400,
      );
    }

    const userId = auth.user.id;
    const userName = auth.user.name;
    const now = new Date();
    const amountFmt = new Intl.NumberFormat("ms-MY", {
      minimumFractionDigits: 2,
    }).format(existing.amount);

    const updated = await db.$transaction(async (tx) => {
      const inv = await tx.invoice.update({
        where: { id },
        data: { status: "dibayar", paidAt: now },
        include: {
          project: { select: { id: true, projectName: true, budget: true } },
          approvedBy: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });
      await tx.invoiceHistory.create({
        data: {
          invoiceId: id,
          action: "paid",
          fromStatus: "diluluskan",
          toStatus: "dibayar",
          remarks,
          userId,
        },
      });
      const message = `Pembayaran invois ${existing.invoiceNo} sebanyak RM ${amountFmt} telah berjaya dilakukan oleh ${userName}.`;
      const notifyUserIds = new Set<string>();
      if (existing.approvedBy?.id) notifyUserIds.add(existing.approvedBy.id);
      if (existing.createdBy?.id) notifyUserIds.add(existing.createdBy.id);
      for (const uid of notifyUserIds) {
        await tx.notification.create({
          data: {
            userId: uid,
            title: "Pembayaran Invois Berjaya",
            message,
            type: "success",
            category: "invoice",
            link: "invoices",
          },
        });
      }
      return inv;
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (e) {
    console.error("[invoices/pay.POST] error:", e);
    return apiError("Ralat pelayan ketika menandai pembayaran invois.", 500);
  }
}
