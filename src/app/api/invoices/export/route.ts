import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, REPORT_ROLES, apiError } from "@/lib/api-auth";
import { INVOICE_STATUS_LABELS, type InvoiceStatus } from "@/lib/types";

// ============================
// GET /api/invoices/export
// Roles: non-trainee
// Query: ?projectId= ?status= ?vendor= ?search= ?fromDate= ?toDate=
// Returns CSV file: invoices-export.csv
// ============================
function escapeCsv(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: Request) {
  try {
    const auth = await requireRole(REPORT_ROLES);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || undefined;
    const status = searchParams.get("status") || undefined;
    const vendor = searchParams.get("vendor") || undefined;
    const search = searchParams.get("search") || undefined;
    const fromDate = searchParams.get("fromDate") || undefined;
    const toDate = searchParams.get("toDate") || undefined;

    const where: {
      projectId?: string;
      status?: string;
      vendorName?: { contains: string };
      OR?: Array<
        | { invoiceNo: { contains: string } }
        | { vendorName: { contains: string } }
      >;
      invoiceDate?: { gte?: Date; lte?: Date };
    } = {};
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (vendor) where.vendorName = { contains: vendor };
    if (search) {
      where.OR = [
        { invoiceNo: { contains: search } },
        { vendorName: { contains: search } },
      ];
    }
    if (fromDate || toDate) {
      where.invoiceDate = {};
      if (fromDate) where.invoiceDate.gte = new Date(fromDate);
      if (toDate) where.invoiceDate.lte = new Date(toDate);
    }

    const invoices = await db.invoice.findMany({
      where,
      include: {
        project: { select: { id: true, projectName: true } },
        approvedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const amountFmt = new Intl.NumberFormat("ms-MY", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const dateFmt = new Intl.DateTimeFormat("sv-SE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const dateTimeFmt = new Intl.DateTimeFormat("sv-SE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    const headers = [
      "InvoiceNo",
      "ProjectName",
      "VendorName",
      "VendorEmail",
      "Amount (RM)",
      "InvoiceDate",
      "DueDate",
      "Status",
      "ApprovedBy",
      "Remarks",
      "CreatedAt",
    ];
    const rows = invoices.map((inv) => [
      inv.invoiceNo,
      inv.project?.projectName ?? "",
      inv.vendorName,
      inv.vendorEmail ?? "",
      amountFmt.format(inv.amount),
      dateFmt.format(new Date(inv.invoiceDate)),
      dateFmt.format(new Date(inv.dueDate)),
      INVOICE_STATUS_LABELS[inv.status as InvoiceStatus] ?? inv.status,
      inv.approvedBy?.name ?? "",
      inv.remarks ?? "",
      dateTimeFmt.format(new Date(inv.createdAt)),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\r\n");

    // Prepend UTF-8 BOM for Excel compatibility
    const csvWithBom = `\uFEFF${csv}`;

    return new NextResponse(csvWithBom, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="invoices-export.csv"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (e) {
    console.error("[invoices/export.GET] error:", e);
    return apiError("Ralat pelayan ketika mengeksport invois.", 500);
  }
}
