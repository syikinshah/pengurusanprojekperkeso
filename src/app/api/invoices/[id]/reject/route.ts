import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, apiError } from "@/lib/api-auth";

// ============================
// POST /api/invoices/:id/reject
// Roles: admin | project_manager
// Body: { remarks } (required)
// Current status must be menunggu_kelulusan.
// Sets status -> ditolak, approvedById, approvedAt.
// History entry: rejected.
// Notification to createdBy user (type error).
// ============================
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireRole(["admin", "project_manager"]);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return apiError("Badan permintaan tidak sah.", 400);
    }
    const remarks = (body as Record<string, unknown>).remarks as
      | string
      | undefined;
    if (!remarks || typeof remarks !== "string" || !remarks.trim()) {
      return apiError(
        "Sebab penolakan (remarks) diperlukan.",
        400,
      );
    }

    const existing = await db.invoice.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, projectName: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
    if (!existing) {
      return apiError("Invois tidak dijumpai.", 404);
    }
    if (existing.status !== "menunggu_kelulusan") {
      return apiError(
        `Hanya invois berstatus "menunggu_kelulusan" boleh ditolak. Status semasa: ${existing.status}.`,
        400,
      );
    }

    const approverId = auth.user.id;
    const approverName = auth.user.name;
    const now = new Date();

    const updated = await db.$transaction(async (tx) => {
      const inv = await tx.invoice.update({
        where: { id },
        data: {
          status: "ditolak",
          approvedById: approverId,
          approvedAt: now,
        },
        include: {
          project: { select: { id: true, projectName: true, budget: true } },
          approvedBy: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });
      await tx.invoiceHistory.create({
        data: {
          invoiceId: id,
          action: "rejected",
          fromStatus: "menunggu_kelulusan",
          toStatus: "ditolak",
          remarks,
          userId: approverId,
        },
      });
      if (existing.createdBy?.id) {
        await tx.notification.create({
          data: {
            userId: existing.createdBy.id,
            title: "Invois Ditolak",
            message: `Invois ${existing.invoiceNo} telah ditolak oleh ${approverName}. Sebab: ${remarks}`,
            type: "error",
            category: "invoice",
            link: "invoices",
          },
        });
      }
      return inv;
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (e) {
    console.error("[invoices/reject.POST] error:", e);
    return apiError("Ralat pelayan ketika menolak invois.", 500);
  }
}
