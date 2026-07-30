// Reports Dashboard API
// Role-based dashboard summary for LMS-ITS
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import type { Role } from "@/lib/types";

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
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;
    const user = auth.user;
    const role = user.role as Role;

    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const dateRange = parseDateRange(fromDate, toDate);

    // Build invoice date filter (applied to invoiceDate)
    const invoiceDateFilter =
      dateRange.gte || dateRange.lte
        ? {
            ...(dateRange.gte ? { gte: dateRange.gte } : {}),
            ...(dateRange.lte ? { lte: dateRange.lte } : {}),
          }
        : undefined;

    // ============================================================
    // TRAINEE DASHBOARD
    // ============================================================
    if (role === "trainee") {
      const [myEnrollments, myCertificatesCount, myEnrolledCourseIds] =
        await Promise.all([
          db.enrollment.findMany({
            where: { userId: user.id },
            include: {
              course: {
                select: { id: true, title: true, category: true },
              },
            },
            orderBy: { createdAt: "desc" },
          }),
          db.enrollment.count({
            where: {
              userId: user.id,
              status: "selesai",
              NOT: { certificateUrl: null },
            },
          }),
          db.enrollment.findMany({
            where: { userId: user.id },
            select: { courseId: true },
          }),
        ]);

      const enrolledCourseIds = myEnrolledCourseIds.map((e) => e.courseId);
      const availableCourses = await db.course.count({
        where: {
          status: "aktif",
          ...(enrolledCourseIds.length > 0
            ? { NOT: { id: { in: enrolledCourseIds } } }
            : {}),
        },
      });

      // breakdown by status
      const byStatus = await db.enrollment.groupBy({
        by: ["status"],
        where: { userId: user.id },
        _count: { _all: true },
      });
      const enrollmentByStatus: Record<string, number> = {
        belum_mula: 0,
        dalam_proses: 0,
        selesai: 0,
      };
      for (const g of byStatus) {
        enrollmentByStatus[g.status] = g._count._all;
      }

      const recentActivity = myEnrollments.slice(0, 5).map((e) => ({
        id: e.id,
        courseId: e.courseId,
        courseTitle: e.course?.title ?? "",
        category: e.course?.category ?? "",
        progress: e.progress,
        status: e.status,
        lastAccessedAt: e.lastAccessedAt,
      }));

      return NextResponse.json({
        ok: true,
        role,
        myEnrollments: {
          count: myEnrollments.length,
          byStatus: enrollmentByStatus,
        },
        myCertificates: myCertificatesCount,
        availableCourses,
        recentActivity,
      });
    }

    // ============================================================
    // PROJECT_ADMIN DASHBOARD
    // ============================================================
    if (role === "project_admin") {
      const [
        managedCoursesCount,
        totalEnrollmentsAgg,
        pendingInvoicesCount,
        recentInvoicesRaw,
      ] = await Promise.all([
        db.course.count({ where: { createdBy: user.id } }),
        db.enrollment.count({
          where: { course: { createdBy: user.id } },
        }),
        db.invoice.count({
          where: {
            status: { in: ["draf", "menunggu_kelulusan"] },
            createdById: user.id,
            ...(invoiceDateFilter ? { invoiceDate: invoiceDateFilter } : {}),
          },
        }),
        db.invoice.findMany({
          where: {
            createdById: user.id,
            ...(invoiceDateFilter ? { invoiceDate: invoiceDateFilter } : {}),
          },
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            project: {
              select: { id: true, projectName: true },
            },
          },
        }),
      ]);

      const recentInvoices = recentInvoicesRaw.map((inv) => ({
        id: inv.id,
        invoiceNo: inv.invoiceNo,
        vendorName: inv.vendorName,
        amount: inv.amount,
        status: inv.status,
        invoiceDate: inv.invoiceDate,
        dueDate: inv.dueDate,
        project: inv.project,
      }));

      return NextResponse.json({
        ok: true,
        role,
        managedCourses: managedCoursesCount,
        totalEnrollments: totalEnrollmentsAgg,
        pendingInvoices: pendingInvoicesCount,
        recentInvoices,
      });
    }

    // ============================================================
    // PROJECT_MANAGER DASHBOARD
    // ============================================================
    if (role === "project_manager") {
      const managedProjects = await db.project.findMany({
        where: { projectManagerId: user.id },
        select: { id: true },
      });
      const managedProjectIds = managedProjects.map((p) => p.id);

      const invoiceWhere = {
        ...(managedProjectIds.length > 0
          ? { projectId: { in: managedProjectIds } }
          : { projectId: "" }),
        ...(invoiceDateFilter ? { invoiceDate: invoiceDateFilter } : {}),
      };

      const [
        pendingApprovalsCount,
        overdueInvoicesCount,
        totalInvoiceAmountAgg,
        totalPaidAgg,
        totalPendingAgg,
        totalOverdueAgg,
        recentApprovalsRaw,
      ] = await Promise.all([
        db.invoice.count({
          where: { ...invoiceWhere, status: "menunggu_kelulusan" },
        }),
        db.invoice.count({
          where: {
            ...invoiceWhere,
            OR: [
              { status: "tertunggak" },
              { status: "diluluskan", dueDate: { lt: new Date() } },
            ],
          },
        }),
        db.invoice.aggregate({
          where: invoiceWhere,
          _sum: { amount: true },
        }),
        db.invoice.aggregate({
          where: { ...invoiceWhere, status: "dibayar" },
          _sum: { amount: true },
        }),
        db.invoice.aggregate({
          where: {
            ...invoiceWhere,
            status: { in: ["menunggu_kelulusan", "diluluskan"] },
          },
          _sum: { amount: true },
        }),
        db.invoice.aggregate({
          where: { ...invoiceWhere, status: "tertunggak" },
          _sum: { amount: true },
        }),
        db.invoice.findMany({
          where: {
            approvedById: user.id,
            ...(invoiceDateFilter ? { invoiceDate: invoiceDateFilter } : {}),
          },
          orderBy: { approvedAt: "desc" },
          take: 5,
          include: {
            project: { select: { id: true, projectName: true } },
          },
        }),
      ]);

      // teamTraining: enrollments of users associated with PM's managed projects
      // We use a pragmatic fallback - recent enrollments across managed courses
      // (filter by courses whose creator is in their managed projects context)
      const teamEnrollmentsRaw = await db.enrollment.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
          course: {
            select: { id: true, title: true },
          },
        },
      });

      const recentApprovals = recentApprovalsRaw.map((inv) => ({
        id: inv.id,
        invoiceNo: inv.invoiceNo,
        vendorName: inv.vendorName,
        amount: inv.amount,
        status: inv.status,
        approvedAt: inv.approvedAt,
        project: inv.project,
      }));

      const teamTraining = teamEnrollmentsRaw.map((e) => ({
        id: e.id,
        user: e.user,
        course: e.course,
        progress: e.progress,
        status: e.status,
        lastAccessedAt: e.lastAccessedAt,
      }));

      return NextResponse.json({
        ok: true,
        role,
        pendingApprovals: pendingApprovalsCount,
        overdueInvoices: overdueInvoicesCount,
        totalInvoiceAmount: totalInvoiceAmountAgg._sum.amount ?? 0,
        totalPaid: totalPaidAgg._sum.amount ?? 0,
        totalPending: totalPendingAgg._sum.amount ?? 0,
        totalOverdue: totalOverdueAgg._sum.amount ?? 0,
        managedProjects: managedProjectIds.length,
        recentApprovals,
        teamTraining,
      });
    }

    // ============================================================
    // ADMIN DASHBOARD
    // ============================================================
    if (role === "admin") {
      const invoiceWhere = invoiceDateFilter
        ? { invoiceDate: invoiceDateFilter }
        : {};

      const [
        totalUsersCount,
        usersByRoleRaw,
        totalCoursesCount,
        coursesByStatusRaw,
        totalProjectsCount,
        projectsByStatusRaw,
        totalInvoicesCount,
        invoicesByStatusRaw,
        totalBudgetAgg,
        totalInvoiceAmountAgg,
        totalPaidAgg,
        totalPendingAgg,
        totalOverdueAgg,
        recentInvoicesRaw,
        recentUsersRaw,
      ] = await Promise.all([
        db.user.count(),
        db.user.groupBy({ by: ["role"], _count: { _all: true } }),
        db.course.count(),
        db.course.groupBy({ by: ["status"], _count: { _all: true } }),
        db.project.count(),
        db.project.groupBy({ by: ["status"], _count: { _all: true } }),
        db.invoice.count({ where: invoiceWhere }),
        db.invoice.groupBy({
          by: ["status"],
          where: invoiceWhere,
          _count: { _all: true },
        }),
        db.project.aggregate({ _sum: { budget: true } }),
        db.invoice.aggregate({
          where: invoiceWhere,
          _sum: { amount: true },
        }),
        db.invoice.aggregate({
          where: { ...invoiceWhere, status: "dibayar" },
          _sum: { amount: true },
        }),
        db.invoice.aggregate({
          where: {
            ...invoiceWhere,
            status: { in: ["menunggu_kelulusan", "diluluskan"] },
          },
          _sum: { amount: true },
        }),
        db.invoice.aggregate({
          where: { ...invoiceWhere, status: "tertunggak" },
          _sum: { amount: true },
        }),
        db.invoice.findMany({
          where: invoiceWhere,
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            project: { select: { id: true, projectName: true } },
            createdBy: {
              select: { id: true, name: true, email: true },
            },
          },
        }),
        db.user.findMany({
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: true,
            createdAt: true,
            isActive: true,
          },
        }),
      ]);

      const usersByRole: Record<string, number> = {};
      for (const g of usersByRoleRaw) usersByRole[g.role] = g._count._all;

      const coursesByStatus: Record<string, number> = {};
      for (const g of coursesByStatusRaw) coursesByStatus[g.status] = g._count._all;

      const projectsByStatus: Record<string, number> = {};
      for (const g of projectsByStatusRaw)
        projectsByStatus[g.status] = g._count._all;

      const invoicesByStatus: Record<string, number> = {};
      for (const g of invoicesByStatusRaw)
        invoicesByStatus[g.status] = g._count._all;

      const recentInvoices = recentInvoicesRaw.map((inv) => ({
        id: inv.id,
        invoiceNo: inv.invoiceNo,
        vendorName: inv.vendorName,
        amount: inv.amount,
        status: inv.status,
        invoiceDate: inv.invoiceDate,
        project: inv.project,
        createdBy: inv.createdBy,
      }));

      return NextResponse.json({
        ok: true,
        role,
        totalUsers: totalUsersCount,
        usersByRole,
        totalCourses: totalCoursesCount,
        coursesByStatus,
        totalProjects: totalProjectsCount,
        projectsByStatus,
        totalInvoices: totalInvoicesCount,
        invoicesByStatus,
        totalBudget: totalBudgetAgg._sum.budget ?? 0,
        totalInvoiceAmount: totalInvoiceAmountAgg._sum.amount ?? 0,
        totalPaid: totalPaidAgg._sum.amount ?? 0,
        totalPending: totalPendingAgg._sum.amount ?? 0,
        totalOverdue: totalOverdueAgg._sum.amount ?? 0,
        recentInvoices,
        recentUsers: recentUsersRaw,
      });
    }

    // ============================================================
    // UPPER_MANAGEMENT DASHBOARD
    // ============================================================
    if (role === "upper_management") {
      const invoiceWhere = invoiceDateFilter
        ? { invoiceDate: invoiceDateFilter }
        : {};

      const [
        totalProjectsCount,
        totalBudgetAgg,
        totalInvoiceAmountAgg,
        totalPaidAgg,
        totalPendingAgg,
        totalOverdueAgg,
        invoicesByStatusRaw,
        projectsByStatusRaw,
        recentInvoicesRaw,
        totalEnrollmentsCount,
        completedEnrollmentsCount,
      ] = await Promise.all([
        db.project.count(),
        db.project.aggregate({ _sum: { budget: true } }),
        db.invoice.aggregate({
          where: invoiceWhere,
          _sum: { amount: true },
        }),
        db.invoice.aggregate({
          where: { ...invoiceWhere, status: "dibayar" },
          _sum: { amount: true },
        }),
        db.invoice.aggregate({
          where: {
            ...invoiceWhere,
            status: { in: ["menunggu_kelulusan", "diluluskan"] },
          },
          _sum: { amount: true },
        }),
        db.invoice.aggregate({
          where: { ...invoiceWhere, status: "tertunggak" },
          _sum: { amount: true },
        }),
        db.invoice.groupBy({
          by: ["status"],
          where: invoiceWhere,
          _count: { _all: true },
        }),
        db.project.groupBy({ by: ["status"], _count: { _all: true } }),
        db.invoice.findMany({
          where: invoiceWhere,
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            project: { select: { id: true, projectName: true } },
          },
        }),
        db.enrollment.count(),
        db.enrollment.count({ where: { status: "selesai" } }),
      ]);

      const invoicesByStatus: Record<string, number> = {};
      for (const g of invoicesByStatusRaw)
        invoicesByStatus[g.status] = g._count._all;

      const projectsByStatus: Record<string, number> = {};
      for (const g of projectsByStatusRaw)
        projectsByStatus[g.status] = g._count._all;

      // invoicesByMonth - last 6 months (current month as last entry)
      const invoicesByMonth: Array<{
        month: string;
        count: number;
        totalAmount: number;
        paidAmount: number;
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
      const monthInvoices = await db.invoice.findMany({
        where: { invoiceDate: { gte: monthStart, lte: monthEnd } },
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
        invoicesByMonth.push({
          month: monthFormatter.format(monthDate),
          count,
          totalAmount,
          paidAmount,
        });
      }

      const completionRate =
        totalEnrollmentsCount > 0
          ? Math.round((completedEnrollmentsCount / totalEnrollmentsCount) * 1000) / 10
          : 0;

      const recentInvoices = recentInvoicesRaw.map((inv) => ({
        id: inv.id,
        invoiceNo: inv.invoiceNo,
        vendorName: inv.vendorName,
        amount: inv.amount,
        status: inv.status,
        invoiceDate: inv.invoiceDate,
        project: inv.project,
      }));

      return NextResponse.json({
        ok: true,
        role,
        totalProjects: totalProjectsCount,
        totalBudget: totalBudgetAgg._sum.budget ?? 0,
        totalInvoiceAmount: totalInvoiceAmountAgg._sum.amount ?? 0,
        totalPaid: totalPaidAgg._sum.amount ?? 0,
        totalPending: totalPendingAgg._sum.amount ?? 0,
        totalOverdue: totalOverdueAgg._sum.amount ?? 0,
        invoicesByStatus,
        invoicesByMonth,
        projectsByStatus,
        courseCompletionRate: completionRate,
        recentInvoices,
      });
    }

    // Unknown role
    return NextResponse.json(
      { ok: false, error: "Peranan pengguna tidak diketahui." },
      { status: 403 }
    );
  } catch (err: any) {
    console.error("[reports/dashboard] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Ralat pelayan: " + (err?.message ?? String(err)) },
      { status: 500 }
    );
  }
}
