// Reports Training Summary API
// Training summary with date/course filters (role-aware; trainee sees only their own)
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

/**
 * Parse optional date strings from query. Returns inclusive range for createdAt.
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
    const isTrainee = user.role === "trainee";

    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const courseId = searchParams.get("courseId");
    // projectId is a no-op for training report but kept for API symmetry
    const projectId = searchParams.get("projectId");
    void projectId;

    const dateRange = parseDateRange(fromDate, toDate);

    // Build enrollment where filter
    const enrollmentWhere: any = {};
    if (isTrainee) {
      enrollmentWhere.userId = user.id;
    }
    if (courseId) {
      enrollmentWhere.courseId = courseId;
    }
    if (dateRange.gte || dateRange.lte) {
      enrollmentWhere.createdAt = {
        ...(dateRange.gte ? { gte: dateRange.gte } : {}),
        ...(dateRange.lte ? { lte: dateRange.lte } : {}),
      };
    }

    // Build course where filter (for topCourses & courseProgress)
    const courseWhere: any = {};
    if (courseId) courseWhere.id = courseId;

    // Aggregate data
    const [
      totalCourses,
      activeCourses,
      totalEnrollments,
      enrollmentsByStatusRaw,
      enrollmentsWithCourse,
      topCoursesRaw,
      coursesWithEnrollments,
    ] = await Promise.all([
      db.course.count({ where: courseWhere }),
      db.course.count({ where: { ...courseWhere, status: "aktif" } }),
      db.enrollment.count({ where: enrollmentWhere }),
      db.enrollment.groupBy({
        by: ["status"],
        where: enrollmentWhere,
        _count: { _all: true },
      }),
      db.enrollment.findMany({
        where: enrollmentWhere,
        select: {
          id: true,
          progress: true,
          status: true,
          createdAt: true,
          course: { select: { id: true, category: true } },
        },
      }),
      db.enrollment.groupBy({
        by: ["courseId"],
        where: enrollmentWhere,
        _count: { _all: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),
      db.course.findMany({
        where: courseWhere,
        include: {
          enrollments: {
            where: isTrainee ? { userId: user.id } : undefined,
            select: { progress: true, status: true, userId: true },
          },
        },
      }),
    ]);

    // enrollment status breakdown
    const enrollmentsByStatus: Record<string, number> = {
      belum_mula: 0,
      dalam_proses: 0,
      selesai: 0,
    };
    for (const g of enrollmentsByStatusRaw) {
      enrollmentsByStatus[g.status] = g._count._all;
    }

    // enrollments by category (joining course.category)
    const enrollmentsByCategory: Record<string, number> = {};
    for (const e of enrollmentsWithCourse) {
      const cat = e.course?.category ?? "Tidak Diketahui";
      enrollmentsByCategory[cat] = (enrollmentsByCategory[cat] ?? 0) + 1;
    }

    // topCourses: top 5 by enrollment count, with avg progress
    const topCourseIds = topCoursesRaw.map((g) => g.courseId);
    const topCourseDetails = await db.course.findMany({
      where: { id: { in: topCourseIds } },
      select: { id: true, title: true, category: true, level: true },
    });
    const topCourses = topCoursesRaw
      .map((g) => {
        const course = topCourseDetails.find((c) => c.id === g.courseId);
        if (!course) return null;
        // average progress for this course's enrollments (within filter)
        const subset = enrollmentsWithCourse.filter(
          (e) => e.course?.id === g.courseId
        );
        const avgProgress =
          subset.length > 0
            ? Math.round(
                (subset.reduce((s, x) => s + x.progress, 0) / subset.length) *
                  10
              ) / 10
            : 0;
        return {
          course: {
            id: course.id,
            title: course.title,
            category: course.category,
            level: course.level,
          },
          enrollmentCount: g._count._all,
          avgProgress,
        };
      })
      .filter((x) => x !== null) as Array<{
      course: { id: string; title: string; category: string; level: string };
      enrollmentCount: number;
      avgProgress: number;
    }>;

    // courseProgress: list of courses with progress details
    const courseProgress = coursesWithEnrollments.map((c) => {
      const enrolledCount = c.enrollments.length;
      const avgProgress =
        enrolledCount > 0
          ? Math.round(
              (c.enrollments.reduce((s, e) => s + e.progress, 0) / enrolledCount) *
                10
            ) / 10
          : 0;
      const completedCount = c.enrollments.filter(
        (e) => e.status === "selesai"
      ).length;
      return {
        course: {
          id: c.id,
          title: c.title,
          category: c.category,
          level: c.level,
          status: c.status,
        },
        enrolledCount,
        avgProgress,
        completedCount,
      };
    });

    const completionRate =
      totalEnrollments > 0
        ? Math.round(
            (enrollmentsByStatus.selesai / totalEnrollments) * 1000
          ) / 10
        : 0;

    return NextResponse.json({
      ok: true,
      role: user.role,
      isTrainee,
      totalCourses,
      activeCourses,
      totalEnrollments,
      completionRate,
      enrollmentsByStatus,
      enrollmentsByCategory,
      topCourses,
      courseProgress,
    });
  } catch (err: any) {
    console.error("[reports/training] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Ralat pelayan: " + (err?.message ?? String(err)) },
      { status: 500 }
    );
  }
}
