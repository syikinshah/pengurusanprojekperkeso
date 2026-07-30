// Notifications: Due Invoices Scanner
// GET  — Preview which overdue/near-due invoices would be notified
//        (admin/PM/PA only).
// POST — Create notification records for those overdue invoices (admin/PA only).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/api-auth";

const GET_ROLES = [
  "admin",
  "project_manager",
  "project_admin",
] as const;
const POST_ROLES = ["admin", "project_admin"] as const;

// Days threshold for "near due" preview
const NEAR_DUE_DAYS = 7;

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}
function daysBetween(d1: Date, d2: Date): number {
  const diff = d2.getTime() - d1.getTime();
  return Math.round(diff / 86400000);
}

interface OverdueCandidate {
  invoiceId: string;
  invoiceNo: string;
  vendorName: string;
  amount: number;
  dueDate: Date;
  status: string;
  daysOverdue: number; // positive = past due; negative = days until due
  recipientUserId: string;
  recipientName: string;
  suggestedNotification: {
    title: string;
    message: string;
    type: "warning" | "error";
  };
}

/**
 * Scan invoices that are overdue or near-due and not paid.
 *
 * Overdue: status in (diluluskan, menunggu_kelulusan) AND dueDate < today.
 * Near-due: status in (diluluskan, menunggu_kelulusan) AND dueDate within
 *           the next NEAR_DUE_DAYS, not paid.
 *
 * Skip invoices where a notification already exists in the last 7 days for
 * this invoice to the recipient.
 */
async function scanOverdueInvoices(): Promise<OverdueCandidate[]> {
  const today = startOfToday();
  const nearDueCutoff = new Date(today);
  nearDueCutoff.setDate(nearDueCutoff.getDate() + NEAR_DUE_DAYS);

  // Fetch invoices that are not paid and not draft, with dueDate in the past or near future
  const candidates = await db.invoice.findMany({
    where: {
      status: { in: ["menunggu_kelulusan", "diluluskan"] },
      dueDate: { lte: nearDueCutoff },
    },
    include: {
      project: {
        select: {
          id: true,
          projectName: true,
          projectManagerId: true,
          projectManager: {
            select: { id: true, name: true },
          },
        },
      },
      createdBy: {
        select: { id: true, name: true },
      },
    },
  });

  // For each candidate, determine the recipient (projectManager if set, else createdBy)
  // and skip those already notified in last 7 days.
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const existingNotifs = await db.notification.findMany({
    where: {
      category: "invoice",
      createdAt: { gte: sevenDaysAgo },
    },
    select: {
      userId: true,
      message: true,
      createdAt: true,
    },
  });

  const result: OverdueCandidate[] = [];
  for (const inv of candidates) {
    const recipient =
      inv.project?.projectManager ?? inv.createdBy;
    if (!recipient) continue;

    const due = new Date(inv.dueDate);
    const daysOverdue = daysBetween(due, today); // >0 = past due, <0 = days until due

    // Skip if no notification needed - we include both overdue and near-due here.
    // Skip if already notified about this invoice in the last 7 days.
    const alreadyNotified = existingNotifs.some(
      (n) =>
        n.userId === recipient.id &&
        n.message.includes(inv.invoiceNo) &&
        n.createdAt >= sevenDaysAgo
    );
    if (alreadyNotified) continue;

    const isOverdue = daysOverdue > 0;
    const isNearDue = daysOverdue <= 0 && daysOverdue >= -NEAR_DUE_DAYS;
    if (!isOverdue && !isNearDue) continue;

    const type: "warning" | "error" = isOverdue ? "error" : "warning";
    let message: string;
    if (isOverdue) {
      message = `Invois ${inv.invoiceNo} daripada ${inv.vendorName} telah melebihi tarikh matang sebanyak ${daysOverdue} hari. Jumlah: RM ${inv.amount.toLocaleString("ms-MY", { minimumFractionDigits: 2 })}. Tindakan bayaran diperlukan segera.`;
    } else {
      const daysUntil = Math.abs(daysOverdue);
      message = `Invois ${inv.invoiceNo} daripada ${inv.vendorName} akan matang dalam ${daysUntil} hari. Jumlah: RM ${inv.amount.toLocaleString("ms-MY", { minimumFractionDigits: 2 })}. Sila uruskan bayaran tepat pada masanya.`;
    }

    result.push({
      invoiceId: inv.id,
      invoiceNo: inv.invoiceNo,
      vendorName: inv.vendorName,
      amount: inv.amount,
      dueDate: due,
      status: inv.status,
      daysOverdue,
      recipientUserId: recipient.id,
      recipientName: recipient.name,
      suggestedNotification: {
        title: "Invois Hampir/Melebihi Tarikh Matang",
        message,
        type,
      },
    });
  }

  return result;
}

// GET — preview (no records created)
export async function GET() {
  try {
    const auth = await requireRole([...GET_ROLES]);
    if (!auth.ok) return auth.response;

    const candidates = await scanOverdueInvoices();

    // Group for the client: overdue vs nearDue
    const overdue = candidates
      .filter((c) => c.daysOverdue > 0)
      .map((c) => ({
        invoice: {
          id: c.invoiceId,
          invoiceNo: c.invoiceNo,
          vendorName: c.vendorName,
          amount: c.amount,
          dueDate: c.dueDate,
          status: c.status,
        },
        daysOverdue: c.daysOverdue,
        recipient: {
          id: c.recipientUserId,
          name: c.recipientName,
        },
        suggestedNotification: c.suggestedNotification,
      }));
    const nearDue = candidates
      .filter((c) => c.daysOverdue <= 0)
      .map((c) => ({
        invoice: {
          id: c.invoiceId,
          invoiceNo: c.invoiceNo,
          vendorName: c.vendorName,
          amount: c.amount,
          dueDate: c.dueDate,
          status: c.status,
        },
        daysOverdue: c.daysOverdue,
        recipient: {
          id: c.recipientUserId,
          name: c.recipientName,
        },
        suggestedNotification: c.suggestedNotification,
      }));

    return NextResponse.json({
      ok: true,
      overdue: {
        count: overdue.length,
        items: overdue,
      },
      nearDue: {
        count: nearDue.length,
        items: nearDue,
      },
      totalCandidates: candidates.length,
    });
  } catch (err: any) {
    console.error("[notifications/due-invoices GET] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Ralat pelayan: " + (err?.message ?? String(err)) },
      { status: 500 }
    );
  }
}

// POST — actually create notification records
export async function POST() {
  try {
    const auth = await requireRole([...POST_ROLES]);
    if (!auth.ok) return auth.response;

    const candidates = await scanOverdueInvoices();
    if (candidates.length === 0) {
      return NextResponse.json({
        ok: true,
        created: 0,
        notifications: [],
        message: "Tiada invois tertunggak memerlukan pemberitahuan baharu.",
      });
    }

    const created = await Promise.all(
      candidates.map((c) =>
        db.notification.create({
          data: {
            userId: c.recipientUserId,
            title: c.suggestedNotification.title,
            message: c.suggestedNotification.message,
            type: c.suggestedNotification.type,
            category: "invoice",
            link: "invoices",
            isRead: false,
          },
        })
      )
    );

    return NextResponse.json({
      ok: true,
      created: created.length,
      notifications: created.map((n) => ({
        id: n.id,
        userId: n.userId,
        title: n.title,
        message: n.message,
        type: n.type,
        category: n.category,
        link: n.link,
        createdAt: n.createdAt,
      })),
    });
  } catch (err: any) {
    console.error("[notifications/due-invoices POST] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Ralat pelayan: " + (err?.message ?? String(err)) },
      { status: 500 }
    );
  }
}
