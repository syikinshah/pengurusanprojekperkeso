import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole, REPORT_ROLES, PA_ROLES, apiError } from "@/lib/api-auth";
import type { InvoiceStatus } from "@/lib/types";

const VALID_INVOICE_STATUSES: InvoiceStatus[] = [
  "draf",
  "menunggu_kelulusan",
  "diluluskan",
  "dibayar",
  "ditolak",
  "tertunggak",
];

const VALID_SORT_FIELDS = [
  "invoiceDate",
  "dueDate",
  "amount",
  "createdAt",
  "invoiceNo",
  "vendorName",
  "status",
] as const;
type SortField = (typeof VALID_SORT_FIELDS)[number];

// ============================
// GET /api/invoices
// Roles: non-trainee (read-only for upper_management)
// Query: ?projectId= ?status= ?vendor= ?search= ?fromDate= ?toDate=
//        ?dueFrom= ?dueTo= ?sort= ?order=asc|desc ?page= ?pageSize=
// Returns: { ok: true, data: { items, total, page, pageSize } }
// ============================
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
    const dueFrom = searchParams.get("dueFrom") || undefined;
    const dueTo = searchParams.get("dueTo") || undefined;

    const sortParam = searchParams.get("sort") || "createdAt";
    const order = (searchParams.get("order") || "desc") as "asc" | "desc";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.max(
      1,
      Math.min(200, parseInt(searchParams.get("pageSize") || "20", 10)),
    );

    if (status && !VALID_INVOICE_STATUSES.includes(status as InvoiceStatus)) {
      return apiError("Status invois tidak sah.", 400);
    }

    const sortField: SortField = (VALID_SORT_FIELDS as readonly string[]).includes(
      sortParam,
    )
      ? (sortParam as SortField)
      : "createdAt";
    const orderBy: Record<string, "asc" | "desc"> = {
      [sortField]: order === "asc" ? "asc" : "desc",
    };

    const where: {
      projectId?: string;
      status?: string;
      vendorName?: { contains: string };
      OR?: Array<
        | { invoiceNo: { contains: string } }
        | { vendorName: { contains: string } }
      >;
      invoiceDate?: { gte?: Date; lte?: Date };
      dueDate?: { gte?: Date; lte?: Date };
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
    if (dueFrom || dueTo) {
      where.dueDate = {};
      if (dueFrom) where.dueDate.gte = new Date(dueFrom);
      if (dueTo) where.dueDate.lte = new Date(dueTo);
    }

    const [total, items] = await Promise.all([
      db.invoice.count({ where }),
      db.invoice.findMany({
        where,
        include: {
          project: { select: { id: true, projectName: true, budget: true } },
          approvedBy: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      ok: true,
      data: { items, total, page, pageSize },
    });
  } catch (e) {
    console.error("[invoices.GET] error:", e);
    return apiError("Ralat pelayan ketika mendapatkan invois.", 500);
  }
}

// ============================
// POST /api/invoices
// Roles: admin | project_admin
// Body: { invoiceNo, projectId, vendorName, vendorEmail?, amount, invoiceDate,
//        dueDate, status?, attachmentUrl?, attachmentName?, remarks? }
// ============================
const CreateInvoiceSchema = z.object({
  invoiceNo: z.string().min(1, "No. invois diperlukan"),
  projectId: z.string().min(1, "Projek diperlukan"),
  vendorName: z.string().min(1, "Nama vendor diperlukan"),
  vendorEmail: z.string().email("E-mel vendor tidak sah").optional().nullable(),
  amount: z.number().positive("Jumlah mesti lebih besar daripada 0"),
  invoiceDate: z.string().min(1, "Tarikh invois diperlukan"),
  dueDate: z.string().min(1, "Tarikh matang diperlukan"),
  status: z
    .enum([
      "draf",
      "menunggu_kelulusan",
      "diluluskan",
      "dibayar",
      "ditolak",
      "tertunggak",
    ])
    .optional(),
  attachmentUrl: z.string().optional().nullable(),
  attachmentName: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const auth = await requireRole(PA_ROLES);
    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => null);
    const parsed = CreateInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        parsed.error.issues[0]?.message ?? "Data tidak sah",
        400,
      );
    }
    const data = parsed.data;
    const userId = auth.user.id;

    // Validations
    const invoiceDate = new Date(data.invoiceDate);
    const dueDate = new Date(data.dueDate);
    if (dueDate < invoiceDate) {
      return apiError(
        "Tarikh matang mesti sama atau selepas tarikh invois.",
        400,
      );
    }

    const existingNo = await db.invoice.findUnique({
      where: { invoiceNo: data.invoiceNo },
      select: { id: true },
    });
    if (existingNo) {
      return apiError("No. invois telah wujud. Sila gunakan no. lain.", 400);
    }

    const project = await db.project.findUnique({
      where: { id: data.projectId },
      select: { id: true },
    });
    if (!project) {
      return apiError("Projek yang dirujuk tidak dijumpai.", 400);
    }

    const now = new Date();
    const targetStatus: InvoiceStatus =
      (data.status as InvoiceStatus) || "draf";

    // Use a transaction to create invoice + history
    const created = await db.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          invoiceNo: data.invoiceNo,
          projectId: data.projectId,
          vendorName: data.vendorName,
          vendorEmail: data.vendorEmail ?? null,
          amount: data.amount,
          invoiceDate,
          dueDate,
          status: targetStatus,
          attachmentUrl: data.attachmentUrl ?? null,
          attachmentName: data.attachmentName ?? null,
          remarks: data.remarks ?? null,
          createdById: userId,
        },
        include: {
          project: { select: { id: true, projectName: true, budget: true } },
          approvedBy: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });

      // History: created
      await tx.invoiceHistory.create({
        data: {
          invoiceId: inv.id,
          action: "created",
          fromStatus: null,
          toStatus: "draf",
          remarks: data.remarks ?? null,
          userId,
        },
      });

      // If status is explicitly set to menunggu_kelulusan, add submission history
      if (targetStatus === "menunggu_kelulusan") {
        await tx.invoiceHistory.create({
          data: {
            invoiceId: inv.id,
            action: "submitted",
            fromStatus: "draf",
            toStatus: "menunggu_kelulusan",
            remarks: data.remarks ?? null,
            userId,
          },
        });
      }
      return inv;
    });

    void now;
    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (e) {
    console.error("[invoices.POST] error:", e);
    return apiError("Ralat pelayan ketika mencipta invois.", 500);
  }
}
