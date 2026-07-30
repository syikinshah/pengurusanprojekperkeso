import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, REPORT_ROLES, PA_ROLES, ADMIN_ROLES, apiError } from "@/lib/api-auth";
import type { InvoiceStatus } from "@/lib/types";

const VALID_INVOICE_STATUSES: InvoiceStatus[] = [
  "draf",
  "menunggu_kelulusan",
  "diluluskan",
  "dibayar",
  "ditolak",
  "tertunggak",
];

// Statuses that allow free edits of all fields
const FREE_EDIT_STATUSES: InvoiceStatus[] = ["draf", "menunggu_kelulusan"];
// For these statuses, only remarks/attachment can be edited
const LOCKED_CORE_STATUSES: InvoiceStatus[] = [
  "diluluskan",
  "dibayar",
  "ditolak",
  "tertunggak",
];

// ============================
// GET /api/invoices/:id
// Roles: non-trainee
// Returns invoice with project, approvedBy, createdBy, history (with user).
// ============================
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireRole(REPORT_ROLES);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, projectName: true, budget: true } },
        approvedBy: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        history: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!invoice) {
      return apiError("Invois tidak dijumpai.", 404);
    }

    return NextResponse.json({ ok: true, data: invoice });
  } catch (e) {
    console.error("[invoices/id.GET] error:", e);
    return apiError("Ralat pelayan ketika mendapatkan invois.", 500);
  }
}

// ============================
// PUT /api/invoices/:id
// Roles: admin | project_admin
// Allowed fields: vendorName, vendorEmail, amount, invoiceDate, dueDate,
//                 attachmentUrl, attachmentName, remarks, status
// - For draf/menunggu_kelulusan: free edits allowed
// - For diluluskan/dibayar/ditolak/tertunggak: only remarks/attachment editable
// - Status transitions are validated (allowed: draf -> menunggu_kelulusan, etc.)
// ============================
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draf: ["menunggu_kelulusan"],
  menunggu_kelulusan: ["draf", "diluluskan", "ditolak"],
  diluluskan: ["dibayar", "tertunggak"],
  dibayar: [],
  ditolak: ["draf"],
  tertunggak: ["dibayar"],
};

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireRole(PA_ROLES);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const existing = await db.invoice.findUnique({ where: { id } });
    if (!existing) {
      return apiError("Invois tidak dijumpai.", 404);
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return apiError("Badan permintaan tidak sah.", 400);
    }
    const {
      vendorName,
      vendorEmail,
      amount,
      invoiceDate,
      dueDate,
      attachmentUrl,
      attachmentName,
      remarks,
      status,
    } = body as Record<string, unknown>;

    const userId = auth.user.id;
    const currentStatus = existing.status as InvoiceStatus;
    const locked = LOCKED_CORE_STATUSES.includes(currentStatus);

    // Build update data
    const updateData: Record<string, unknown> = {};
    const historyEntries: Array<{
      action: string;
      fromStatus: string | null;
      toStatus: string | null;
      remarks: string | null;
      userId: string;
    }> = [];

    if (status !== undefined && status !== currentStatus) {
      if (!VALID_INVOICE_STATUSES.includes(status as InvoiceStatus)) {
        return apiError("Status invois tidak sah.", 400);
      }
      const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? [];
      const statusStr = status as string;
      if (!allowed.includes(statusStr)) {
        return apiError(
          `Peralihan status dari "${currentStatus}" ke "${statusStr}" tidak dibenarkan.`,
          400,
        );
      }
      updateData.status = status;
      let action = "status_changed";
      if (currentStatus === "draf" && status === "menunggu_kelulusan") {
        action = "submitted";
      }
      historyEntries.push({
        action,
        fromStatus: currentStatus,
        toStatus: status as string,
        remarks: (remarks as string) ?? null,
        userId,
      });
    }

    if (locked) {
      // Only remarks + attachment allowed
      if (
        vendorName !== undefined ||
        vendorEmail !== undefined ||
        amount !== undefined ||
        invoiceDate !== undefined ||
        dueDate !== undefined
      ) {
        return apiError(
          "Hanya nota (remarks) dan lampiran boleh diubah untuk invois yang telah diluluskan/dibayar/ditolak/tertunggak.",
          400,
        );
      }
      if (remarks !== undefined) updateData.remarks = (remarks as string) || null;
      if (attachmentUrl !== undefined)
        updateData.attachmentUrl = (attachmentUrl as string) || null;
      if (attachmentName !== undefined)
        updateData.attachmentName = (attachmentName as string) || null;
    } else {
      // Free edits
      if (vendorName !== undefined) {
        if (typeof vendorName !== "string" || !vendorName.trim()) {
          return apiError("Nama vendor tidak sah.", 400);
        }
        updateData.vendorName = vendorName;
      }
      if (vendorEmail !== undefined) {
        updateData.vendorEmail = (vendorEmail as string) || null;
      }
      if (amount !== undefined) {
        if (typeof amount !== "number" || amount <= 0) {
          return apiError("Jumlah mesti lebih besar daripada 0.", 400);
        }
        updateData.amount = amount;
      }
      const newInvoiceDate =
        invoiceDate !== undefined ? new Date(invoiceDate as string) : undefined;
      const newDueDate =
        dueDate !== undefined ? new Date(dueDate as string) : undefined;
      const refInvoice = newInvoiceDate ?? existing.invoiceDate;
      const refDue = newDueDate ?? existing.dueDate;
      if (refDue < refInvoice) {
        return apiError(
          "Tarikh matang mesti sama atau selepas tarikh invois.",
          400,
        );
      }
      if (newInvoiceDate) updateData.invoiceDate = newInvoiceDate;
      if (newDueDate) updateData.dueDate = newDueDate;
      if (remarks !== undefined) updateData.remarks = (remarks as string) || null;
      if (attachmentUrl !== undefined)
        updateData.attachmentUrl = (attachmentUrl as string) || null;
      if (attachmentName !== undefined)
        updateData.attachmentName = (attachmentName as string) || null;

      // Detect edits to core fields for history log
      const coreChanged =
        vendorName !== undefined ||
        vendorEmail !== undefined ||
        amount !== undefined ||
        invoiceDate !== undefined ||
        dueDate !== undefined;
      if (coreChanged) {
        historyEntries.push({
          action: "edited",
          fromStatus: currentStatus,
          toStatus: (status as string) ?? currentStatus,
          remarks: "Kemas kini medan teras oleh pentadbir projek",
          userId,
        });
      }
    }

    const updated = await db.$transaction(async (tx) => {
      const inv = await tx.invoice.update({
        where: { id },
        data: updateData,
        include: {
          project: { select: { id: true, projectName: true, budget: true } },
          approvedBy: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });
      for (const h of historyEntries) {
        await tx.invoiceHistory.create({
          data: { invoiceId: id, ...h },
        });
      }
      return inv;
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (e) {
    console.error("[invoices/id.PUT] error:", e);
    return apiError("Ralat pelayan ketika mengemas kini invois.", 500);
  }
}

// ============================
// DELETE /api/invoices/:id
// Roles: admin only
// Only allowed if status === "draf". Cascades history.
// ============================
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireRole(ADMIN_ROLES);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const existing = await db.invoice.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!existing) {
      return apiError("Invois tidak dijumpai.", 404);
    }
    if (existing.status !== "draf") {
      return apiError(
        "Hanya invois berstatus 'draf' boleh dipadam.",
        400,
      );
    }
    await db.invoice.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[invoices/id.DELETE] error:", e);
    return apiError("Ralat pelayan ketika memadam invois.", 500);
  }
}
