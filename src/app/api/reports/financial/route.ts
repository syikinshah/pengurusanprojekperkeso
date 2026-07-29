// Reports Financial Summary API
// Financial summary for admin/PM/PA/upper_management; trainee forbidden.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/api-auth";

const FINANCIAL_ROLES = [
  "admin",
  "project_manager",
  "project_admin",
  "upper_management",
] as const;

/**
 * Parse optional date strings from query. Returns inclusive range:
 * - fromDate: start of day (00:00:00.000)
 * - toDate: end of day (23:59:59.999)
 */
function parseDateRange(from?: string | null, to?: string | null) {
  const range: { gte?: Date; lte?: Date } = {};
  if (from) {
    const d = new Date(from);
    if (!isNaN(d.getTime())) {
      d.setHours(0, 0, 0, 0);
      range.gte = d;
    }
  }
  if (to) {
    const d = new Date(to);
    if (!isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      range.lte = d;
    }
  }
  return range;
}

export async function GET(request: Request) {
  try {
    const auth = await requireRole([...FINANCIAL_ROLES]);
    if (!auth.ok) return auth.response;
    const user = auth.user;

    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const projectId = searchParams.get("projectId");

    const dateRange = parseDateRange(fromDate, toDate);
    const invoiceDateFilter =
      dateRange.gte || dateRange.lte
        ? {
            ...(dateRange.gte ? { gte: dateRange.gte } : {}),
            ...(dateRange.lte ? { lte: dateRange.lte } : {}),
          }
        : undefined;

    const baseWhere: any = {
      ...(projectId ? { projectId } : {}),
      ...(invoiceDateFilter ? { invoiceDate: invoiceDateFilter } : {}),
    };

    // ========================================
    // 1. Totals
    // ========================================
    const [
      totalBudgetAgg,
      totalInvoicedAgg,
      totalPaidAgg,
      totalPendingAgg,
      totalOverdueAgg,
      totalRejectedAgg,
      totalDraftAgg,
      invoiceCountByStatusRaw,
      invoicesForProjects,
      invoicesForVendors,
    ] = await Promise.all([
      db.project.aggregate({ _sum: { budget: true } }),
      db.invoice.aggregate({
        where: baseWhere,
        _sum: { amount: true },
      }),
      db.invoice.aggregate({
        where: { ...baseWhere, status: "dibayar" },
        _sum: { amount: true },
      }),
      db.invoice.aggregate({
        where: {
          ...baseWhere,
          status: { in: ["menunggu_kelulusan", "diluluskan"] },
        },
        _sum: { amount: true },
      }),
      db.invoice.aggregate({
        where: { ...baseWhere, status: "tertunggak" },
        _sum: { amount: true },
      }),
      db.invoice.aggregate({
        where: { ...baseWhere, status: "ditolak" },
        _sum: { amount: true },
      }),
      db.invoice.aggregate({
        where: { ...baseWhere, status: "draf" },
        _sum: { amount: true },
      }),
      db.invoice.groupBy({
        by: ["status"],
        where: baseWhere,
        _count: { _all: true },
      }),
      db.invoice.findMany({
        where: baseWhere,
        select: {
          amount: true,
          status: true,
          invoiceDate: true,
          projectId: true,
          vendorName: true,
        },
      }),
      db.invoice.groupBy({
        by: ["vendorName"],
        where: baseWhere,
        _count: { _all: true },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
        take: 5,
      }),
    ]);

    const invoiceCountByStatus: Record<string, number> = {};
    for (const g of invoiceCountByStatusRaw) {
      invoiceCountByStatus[g.status] = g._count._all;
    }

    // ========================================
    // 2. invoicesByMonth (last 6 months, current as last)
    // ========================================
    const invoicesByMonth: Array<{
      month: string;
      count: number;
      totalAmount: number;
      paidAmount: number;
      pendingAmount: number;
    }> = [];
    const monthFormatter = new Intl.DateTimeFormat("ms-MY", {
      month: "short",
      year: "numeric",
    });
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );
    // Fetch all invoices within last 6 months (regardless of date filter)
    const monthInvoices = await db.invoice.findMany({
      where: {
        invoiceDate: { gte: monthStart, lte: monthEnd },
        ...(projectId ? { projectId } : {}),
      },
      select: { amount: true, status: true, invoiceDate: true },
    });
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd2 = new Date(
        now.getFullYear(),
        now.getMonth() - i + 1,
        0,
        23,
        59,
        59,
        999
      );
      const inMonth = monthInvoices.filter((inv) => {
        const d = new Date(inv.invoiceDate);
        return d >= monthDate && d <= monthEnd2;
      });
      const count = inMonth.length;
      const totalAmount = inMonth.reduce((s, x) => s + x.amount, 0);
      const paidAmount = inMonth
        .filter((x) => x.status === "dibayar")
        .reduce((s, x) => s + x.amount, 0);
      const pendingAmount = inMonth
        .filter((x) =>
          ["menunggu_kelulusan", "diluluskan"].includes(x.status)
        )
        .reduce((s, x) => s + x.amount, 0);
      invoicesByMonth.push({
        month: monthFormatter.format(monthDate),
        count,
        totalAmount,
        paidAmount,
        pendingAmount,
      });
    }

    // ========================================
    // 3. invoicesByProject
    // ========================================
    const allProjects = await db.project.findMany({
      select: { id: true, projectName: true, budget: true },
    });
    const invoicesByProject = allProjects
      .map((p) => {
        const projInvoices = invoicesForProjects.filter(
          (inv) => inv.projectId === p.id
        );
        const invoiceCount = projInvoices.length;
        const totalAmount = projInvoices.reduce((s, x) => s + x.amount, 0);
        const paidAmount = projInvoices
          .filter((x) => x.status === "dibayar")
          .reduce((s, x) => s + x.amount, 0);
        const pendingAmount = projInvoices
          .filter((x) =>
            ["menunggu_kelulusan", "diluluskan"].includes(x.status)
          )
          .reduce((s, x) => s + x.amount, 0);
        const overdueAmount = projInvoices
          .filter((x) => x.status === "tertunggak")
          .reduce((s, x) => s + x.amount, 0);
        return {
          project: {
            id: p.id,
            projectName: p.projectName,
            budget: p.budget,
          },
          invoiceCount,
          totalAmount,
          paidAmount,
          pendingAmount,
          overdueAmount,
        };
      })
      // Only show projects that have invoices (or all if no projectId filter)
      .filter((p) => p.invoiceCount > 0 || !projectId);

    // ========================================
    // 4. topVendors (top 5 by total amount)
    // ========================================
    const topVendors = await Promise.all(
      invoicesForVendors.map(async (g) => ({
        vendorName: g.vendorName,
        invoiceCount: g._count._all,
        totalAmount: g._sum.amount ?? 0,
      }))
    );

    return NextResponse.json({
      ok: true,
      role: user.role,
      totalBudget: totalBudgetAgg._sum.budget ?? 0,
      totalInvoiced: totalInvoicedAgg._sum.amount ?? 0,
      totalPaid: totalPaidAgg._sum.amount ?? 0,
      totalPending: totalPendingAgg._sum.amount ?? 0,
      totalOverdue: totalOverdueAgg._sum.amount ?? 0,
      totalRejected: totalRejectedAgg._sum.amount ?? 0,
      totalDraft: totalDraftAgg._sum.amount ?? 0,
      invoiceCountByStatus,
      invoicesByMonth,
      invoicesByProject,
      topVendors,
    });
  } catch (err: any) {
    console.error("[reports/financial] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Ralat pelayan: " + (err?.message ?? String(err)) },
      { status: 500 }
    );
  }
}
