"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { toast } from "sonner"
import { api } from "@/lib/api-client"
import { useAuthStore, useViewStore } from "@/lib/auth-store"
import {
  PageHeader,
  SectionCard,
  StatCard,
  EmptyState,
  LoadingState,
  EnrollmentStatusBadge,
} from "@/components/shared"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"
import {
  BookOpen,
  Activity,
  CheckCircle2,
  Award,
  ArrowRight,
  GraduationCap,
  Download,
  Clock,
  Calendar,
  User,
  BookMarked,
} from "lucide-react"
import type { Course, Enrollment, Role, ROLE_LABELS } from "@/lib/types"
import { ROLE_LABELS as RL, formatDate, formatDateTime } from "@/lib/types"
import {
  CategoryBadge,
  LevelBadge,
  formatCourseDuration,
} from "./shared"

interface EnrollmentUser {
  id: string
  name: string
  email: string
  role: Role
  department: string
}

type EnrollmentWithCourse = Omit<Enrollment, "course" | "user"> & {
  course: Course
  user?: EnrollmentUser
}

export function MyLearningView() {
  const user = useAuthStore((s) => s.user)
  const navigate = useViewStore((s) => s.navigate)
  const [enrollments, setEnrollments] = useState<EnrollmentWithCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"all" | "dalam_proses" | "selesai" | "belum_mula">(
    "all",
  )

  const loadEnrollments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<{ ok: boolean; enrollments: EnrollmentWithCourse[] }>(
        "/api/enrollments",
      )
      setEnrollments(res.enrollments || [])
    } catch (e) {
      toast.error("Gagal memuat pembelajaran. Sila cuba lagi.")
      setEnrollments([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEnrollments()
  }, [loadEnrollments])

  // Stats
  const stats = useMemo(() => {
    const total = enrollments.length
    const inProgress = enrollments.filter(
      (e) => e.status === "dalam_proses",
    ).length
    const completed = enrollments.filter(
      (e) => e.status === "selesai",
    ).length
    const notStarted = enrollments.filter(
      (e) => e.status === "belum_mula",
    ).length
    const certificates = enrollments.filter(
      (e) => e.status === "selesai" && e.certificateUrl,
    ).length
    return { total, inProgress, completed, notStarted, certificates }
  }, [enrollments])

  // Tab filter - for non-trainee roles we show all enrollments across users
  const filtered = useMemo(() => {
    if (tab === "all") return enrollments
    return enrollments.filter((e) => e.status === tab)
  }, [enrollments, tab])

  const isTrainee = user?.role === "trainee"

  if (loading) {
    return <LoadingState label="Memuat pembelajaran anda..." />
  }

  return (
    <div className="space-y-5 animate-fade-in-up">
      <PageHeader
        title="Pembelajaran Saya"
        description={
          isTrainee
            ? "Jejak kemajuan pembelajaran anda"
            : "Senarai pendaftaran kursus (pentadbir / pengurus)"
        }
      >
        <Button
          className="btn-brand-gradient"
          onClick={() => navigate("courses")}
        >
          <GraduationCap className="size-4 mr-1.5" /> Terokai Kursus
        </Button>
      </PageHeader>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Jumlah Pendaftaran"
          value={stats.total}
          icon={BookOpen}
          tone="primary"
          sublabel="Kursus yang didaftar"
        />
        <StatCard
          label="Dalam Proses"
          value={stats.inProgress}
          icon={Activity}
          tone="amber"
          sublabel="Sedang dipelajari"
        />
        <StatCard
          label="Selesai"
          value={stats.completed}
          icon={CheckCircle2}
          tone="emerald"
          sublabel="Kursus tamat"
        />
        <StatCard
          label="Sijil"
          value={stats.certificates}
          icon={Award}
          tone="violet"
          sublabel="Sijil diperoleh"
        />
      </div>

      {/* Filter tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="all">
            Semua ({stats.total})
          </TabsTrigger>
          <TabsTrigger value="dalam_proses">
            Dalam Proses ({stats.inProgress})
          </TabsTrigger>
          <TabsTrigger value="selesai">
            Selesai ({stats.completed})
          </TabsTrigger>
          <TabsTrigger value="belum_mula">
            Belum Mula ({stats.notStarted})
          </TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          {filtered.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title={
                stats.total === 0
                  ? isTrainee
                    ? "Anda belum mendaftar mana-mana kursus"
                    : "Tiada pendaftaran kursus"
                  : "Tiada pendaftaran untuk penapis ini"
              }
              description={
                stats.total === 0
                  ? "Terokai katalog kursus dan mula pembelajaran anda hari ini."
                  : "Cuba tukar penapis di atas."
              }
              action={
                stats.total === 0 ? (
                  <Button
                    className="btn-brand-gradient"
                    onClick={() => navigate("courses")}
                  >
                    <GraduationCap className="size-4 mr-1.5" /> Lihat Katalog
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid gap-3">
              {filtered.map((en) => (
                <EnrollmentCard
                  key={en.id}
                  enrollment={en}
                  showUser={!isTrainee}
                  onContinue={() =>
                    navigate("course-detail", { id: en.courseId })
                  }
                  onCertificate={() =>
                    navigate("certificate", { id: en.id })
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================
// Enrollment card
// ============================
function EnrollmentCard({
  enrollment,
  showUser,
  onContinue,
  onCertificate,
}: {
  enrollment: EnrollmentWithCourse
  showUser: boolean
  onContinue: () => void
  onCertificate: () => void
}) {
  const course = enrollment.course
  const isComplete = enrollment.status === "selesai"
  const hasCert = isComplete && !!enrollment.certificateUrl

  return (
    <Card className="glass rounded-2xl p-5 hover:shadow-md transition-shadow">
      <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
        {/* Course identity */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <BookOpen className="size-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <CategoryBadge category={course.category} />
              <LevelBadge level={course.level} />
              <EnrollmentStatusBadge status={enrollment.status} />
              {showUser && enrollment.user && (
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <User className="size-3" />
                  {enrollment.user.name} · {RL[enrollment.user.role]}
                </span>
              )}
            </div>
            <h3
              className="font-semibold leading-snug cursor-pointer hover:text-primary transition-colors line-clamp-1"
              onClick={onContinue}
            >
              {course.title}
            </h3>
            {course.instructor && (
              <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1">
                <User className="size-3" /> {course.instructor} ·{" "}
                <Clock className="size-3" /> {formatCourseDuration(course.duration)}
              </p>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="lg:w-56 shrink-0">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Kemajuan</span>
            <span className="font-semibold">{Math.round(enrollment.progress)}%</span>
          </div>
          <Progress value={enrollment.progress} className="h-2" />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3" />
              Daftar: {formatDate(enrollment.enrolledAt)}
            </span>
            {enrollment.completedAt && (
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="size-3" />
                Tamat: {formatDate(enrollment.completedAt)}
              </span>
            )}
            {enrollment.lastAccessedAt && !isComplete && (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3" />
                Akhir: {formatDateTime(enrollment.lastAccessedAt)}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 shrink-0">
          {!isComplete ? (
            <Button onClick={onContinue} className="btn-brand-gradient" size="sm">
              {enrollment.status === "belum_mula" ? (
                <>
                  <BookMarked className="size-4 mr-1.5" /> Mula
                </>
              ) : (
                <>
                  Sambung <ArrowRight className="size-4 ml-1.5" />
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={onContinue}
              variant="outline"
              size="sm"
            >
              Lihat Kursus <ArrowRight className="size-4 ml-1.5" />
            </Button>
          )}
          {hasCert && (
            <>
              <Button
                onClick={onCertificate}
                variant="outline"
                size="sm"
                className="text-violet-600 hover:text-violet-700 border-violet-200 dark:border-violet-500/30"
              >
                <Award className="size-4 mr-1.5" /> Sijil
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // POC: certificate URL is dummy - just toast
                  toast.info("Memuat turun sijil...", {
                    description: enrollment.certificateUrl || "",
                  })
                }}
              >
                <Download className="size-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}
