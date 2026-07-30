import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, apiError } from "@/lib/api-auth";

// ============================
// POST /api/invoices/:id/approve
// Roles: admin | project_manager
// Body: { remarks? }
// Current status must be menunggu_kelulusan.
// Sets status -> diluluskan, approvedById, approvedAt.
// History entry: approved.
// Notification to createdBy user.
// ============================
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireRole(["admin", "project_manager"]);
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
      },
    });
    if (!existing) {
      return apiError("Invois tidak dijumpai.", 404);
    }
    if (existing.status !== "menunggu_kelulusan") {
      return apiError(
        `Hanya invois berstatus "menunggu_kelulusan" boleh diluluskan. Status semasa: ${existing.status}.`,
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
          status: "diluluskan",
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
          action: "approved",
          fromStatus: "menunggu_kelulusan",
          toStatus: "diluluskan",
          remarks,
          userId: approverId,
        },
      });
      // Notify creator
      if (existing.createdBy?.id) {
        await tx.notification.create({
          data: {
            userId: existing.createdBy.id,
            title: "Invois Diluluskan",
            message: `Invois ${existing.invoiceNo} (${existing.project?.projectName ?? ""}) telah diluluskan oleh ${approverName}.`,
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
    console.error("[invoices/approve.POST] error:", e);
    return apiError("Ralat pelayan ketika meluluskan invois.", 500);
  }
}
