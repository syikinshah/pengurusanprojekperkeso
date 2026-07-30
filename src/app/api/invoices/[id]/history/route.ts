import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, REPORT_ROLES, apiError } from "@/lib/api-auth";

// ============================
// GET /api/invoices/:id/history
// Roles: non-trainee
// Returns InvoiceHistory records with user (id, name), sorted by createdAt asc.
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
      select: { id: true },
    });
    if (!invoice) {
      return apiError("Invois tidak dijumpai.", 404);
    }

    const history = await db.invoiceHistory.findMany({
      where: { invoiceId: id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ ok: true, data: history });
  } catch (e) {
    console.error("[invoices/history.GET] error:", e);
    return apiError("Ralat pelayan ketika mendapatkan sejarah invois.", 500);
  }
}
