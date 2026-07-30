"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { toast } from "sonner"
import { api } from "@/lib/api-client"
import { useAuthStore, useViewStore } from "@/lib/auth-store"
import {
  PageHeader,
  EmptyState,
  LoadingState,
  EnrollmentStatusBadge,
} from "@/components/shared"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  BookOpen,
  Clock,
  User,
  Users,
  Pencil,
  Plus,
  Trash2,
  ExternalLink,
  ListChecks,
  HelpCircle,
  PlayCircle,
  GraduationCap,
  CheckCircle2,
  Lock,
  Sparkles,
} from "lucide-react"
import type { Course, CourseStatus, Material, Quiz, Question, Enrollment } from "@/lib/types"
import {
  CategoryBadge,
  LevelBadge,
  CourseStatusBadge,
  MaterialTypeBadge,
  MATERIAL_ICON,
  MATERIAL_TYPES,
  MATERIAL_TYPE_LABEL,
  CATEGORIES,
  LEVELS,
  formatCourseDuration,
  formatMaterialDuration,
} from "./shared"

interface CourseDetail extends Course {
  materials: Material[]
  quizzes: (Quiz & { questions?: Question[] })[]
  _count: { materials: number; enrollments: number; quizzes: number }
  creator?: { id: string; name: string }
}

const CAN_ENROLL_ROLES = ["trainee", "project_admin", "project_manager", "upper_management"]
const CAN_MANAGE_ROLES = ["admin", "project_admin"]

export function CourseDetailView() {
  const user = useAuthStore((s) => s.user)
  const params = useViewStore((s) => s.params)
  const navigate = useViewStore((s) => s.navigate)
  const courseId = params.id

  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false)
  const materialsRef = useRef<HTMLDivElement>(null)

  const canManage =
    user?.role && CAN_MANAGE_ROLES.includes(user.role)
  const canEnroll =
    user?.role && CAN_ENROLL_ROLES.includes(user.role)

  const loadCourse = useCallback(async () => {
    if (!courseId) return
    setLoading(true)
    try {
      const res = await api.get<{ ok: boolean; course: CourseDetail }>(
        `/api/courses/${courseId}`,
      )
      setCourse(res.course)
    } catch (e) {
      toast.error("Kursus tidak dijumpai atau gagal dimuat.")
      setCourse(null)
    } finally {
      setLoading(false)
    }
  }, [courseId])

  const loadEnrollment = useCallback(async () => {
    if (!courseId) return
    try {
      const res = await api.get<{ ok: boolean; enrollments: Enrollment[] }>(
        `/api/enrollments?courseId=${courseId}`,
      )
      // For non-privileged users the backend already filters by self;
      // for privileged users we want only the current user's enrollment.
      const mine = (res.enrollments || []).filter((e) => e.userId === user?.id)
      setEnrollments(mine)
    } catch {
      // ignore - enrollments not critical to render
    }
  }, [courseId, user?.id])

  useEffect(() => {
    loadCourse()
    loadEnrollment()
  }, [loadCourse, loadEnrollment])

  const myEnrollment = enrollments[0]
  const isEnrolled = !!myEnrollment

  const handleEnroll = async () => {
    if (!courseId) return
    setEnrolling(true)
    try {
      await api.post(`/api/courses/${courseId}/enroll`)
      toast.success("Berjaya didaftarkan ke kursus ini.")
      await loadEnrollment()
    } catch (e: unknown) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Gagal mendaftar. Sila cuba lagi.",
      )
    } finally {
      setEnrolling(false)
    }
  }

  const scrollToMaterials = () => {
    materialsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  if (loading) {
    return <LoadingState label="Memuat butiran kursus..." />
  }

  if (!course) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Kursus tidak dijumpai"
        description="Kursus mungkin telah dialih keluar atau ID tidak sah."
        action={
          <Button onClick={() => navigate("courses")} variant="outline">
            <ArrowLeft className="size-4 mr-1.5" /> Kembali ke Katalog
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("courses")}
        className="-ml-2"
      >
        <ArrowLeft className="size-4 mr-1.5" /> Kembali ke Katalog
      </Button>

      {/* Course header */}
      <Card className="glass rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <CategoryBadge category={course.category} />
              <LevelBadge level={course.level} />
              <CourseStatusBadge status={course.status} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
              {course.title}
            </h1>
            <p className="text-muted-foreground mt-3 leading-relaxed">
              {course.description}
            </p>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-5 text-sm">
              <span className="inline-flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground" />
                <span className="font-medium">{formatCourseDuration(course.duration)}</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <User className="size-4 text-muted-foreground" />
                <span>{course.instructor || "Pensyarah Dalaman"}</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <Users className="size-4 text-muted-foreground" />
                <span>{course._count?.enrollments ?? 0} peserta</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <ListChecks className="size-4 text-muted-foreground" />
                <span>{course._count?.materials ?? 0} bahan</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <HelpCircle className="size-4 text-muted-foreground" />
                <span>{course._count?.quizzes ?? 0} kuiz</span>
              </span>
            </div>

            {course.creator && (
              <p className="text-xs text-muted-foreground mt-3">
                Dicipta oleh <span className="font-medium">{course.creator.name}</span>
              </p>
            )}
          </div>

          {/* Action panel */}
          <div className="lg:w-72 shrink-0">
            {isEnrolled ? (
              <Card className="glass-strong rounded-xl p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Status Pendaftaran
                </p>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <EnrollmentStatusBadge status={myEnrollment.status} />
                  <span className="text-2xl font-bold">
                    {Math.round(myEnrollment.progress)}%
                  </span>
                </div>
                <Progress value={myEnrollment.progress} className="h-2" />
                <Button
                  onClick={scrollToMaterials}
                  className="w-full mt-4 btn-brand-gradient"
                >
                  <PlayCircle className="size-4 mr-1.5" /> Sambung Pembelajaran
                </Button>
                {myEnrollment.status === "selesai" && myEnrollment.certificateUrl && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      navigate("certificate", { id: myEnrollment.id })
                    }
                    className="w-full mt-2"
                  >
                    <CheckCircle2 className="size-4 mr-1.5" /> Lihat Sijil
                  </Button>
                )}
              </Card>
            ) : canEnroll ? (
              <Card className="glass-strong rounded-xl p-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Belum mendaftar kursus ini? Mula pembelajaran anda hari ini.
                </p>
                <Button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="w-full btn-brand-gradient"
                >
                  {enrolling ? (
                    <>
                      <span className="size-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-1" />
                      Mendaftar...
                    </>
                  ) : (
                    <>
                      <GraduationCap className="size-4 mr-1.5" /> Daftar Kursus
                    </>
                  )}
                </Button>
              </Card>
            ) : (
              <Card className="glass-strong rounded-xl p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Log masuk sebagai peserta untuk mendaftar kursus ini.
                </p>
              </Card>
            )}

            {canManage && (
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="size-4 mr-1.5" /> Edit
                </Button>
                <Dialog open={materialDialogOpen} onOpenChange={setMaterialDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Plus className="size-4 mr-1.5" /> Tambah Bahan
                    </Button>
                  </DialogTrigger>
                  <AddMaterialDialog
                    courseId={course.id}
                    onClose={() => setMaterialDialogOpen(false)}
                    onCreated={() => loadCourse()}
                  />
                </Dialog>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Edit course dialog */}
      {canManage && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <EditCourseDialog
            course={course}
            onClose={() => setEditOpen(false)}
            onUpdated={() => loadCourse()}
          />
        </Dialog>
      )}

      {/* Materials section */}
      <div ref={materialsRef}>
        <Card className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <BookOpen className="size-5 text-primary" /> Bahan Pembelajaran
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {course.materials.length} bahan dalam kursus ini
              </p>
            </div>
          </div>

          {course.materials.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Tiada bahan pembelajaran"
              description={
                canManage
                  ? "Tambah bahan untuk pelajar mula pembelajaran."
                  : "Bahan akan ditambah tidak lama lagi."
              }
              action={
                canManage ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="btn-brand-gradient" size="sm">
                        <Plus className="size-4 mr-1.5" /> Tambah Bahan
                      </Button>
                    </DialogTrigger>
                    <AddMaterialDialog
                      courseId={course.id}
                      onClose={() => {}}
                      onCreated={() => loadCourse()}
                    />
                  </Dialog>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-2">
              {course.materials.map((m, idx) => (
                <MaterialRow
                  key={m.id}
                  material={m}
                  index={idx}
                  canManage={!!canManage}
                  courseId={course.id}
                  onChanged={() => loadCourse()}
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Quizzes section */}
      <Card className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <HelpCircle className="size-5 text-primary" /> Penilaian Kuiz
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {course.quizzes.length} kuiz dalam kursus ini
            </p>
          </div>
        </div>

        {course.quizzes.length === 0 ? (
          <EmptyState
            icon={HelpCircle}
            title="Tiada kuiz"
            description="Kuiz akan ditambah tidak lama lagi."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {course.quizzes.map((q) => (
              <QuizCard
                key={q.id}
                quiz={q}
                canStart={isEnrolled}
                onStart={() => navigate("quiz", { id: q.id })}
                onLocked={() =>
                  toast.info("Sila daftar kursus ini sebelum mengambil kuiz.")
                }
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

// ============================
// Material row
// ============================
function MaterialRow({
  material,
  index,
  canManage,
  courseId,
  onChanged,
}: {
  material: Material
  index: number
  canManage: boolean
  courseId: string
  onChanged: () => void
}) {
  const Icon = MATERIAL_ICON[material.type] || BookOpen
  const [editOpen, setEditOpen] = useState(false)

  const handleOpen = () => {
    // POC: dummy URLs - just show toast
    toast.info(`Memuat ${MATERIAL_TYPE_LABEL[material.type] || material.type}: ${material.title}`, {
      description: material.url,
    })
  }

  const handleDelete = async () => {
    try {
      await api.del(`/api/courses/${courseId}/materials/${material.id}`)
      toast.success("Bahan berjaya dialih keluar.")
      onChanged()
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : "Gagal memadam bahan.",
      )
    }
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/40 transition group">
      <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="size-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-mono">
            {String(index + 1).padStart(2, "0")}
          </span>
          <MaterialTypeBadge type={material.type} />
          {material.duration ? (
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Clock className="size-3" />
              {formatMaterialDuration(material.duration)}
            </span>
          ) : null}
        </div>
        <p className="text-sm font-medium mt-1 truncate">{material.title}</p>
        {material.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {material.description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button size="sm" variant="ghost" onClick={handleOpen}>
          <ExternalLink className="size-4" /> Lihat
        </Button>
        {canManage && (
          <>
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost">
                  <Pencil className="size-4" />
                </Button>
              </DialogTrigger>
              <EditMaterialDialog
                courseId={courseId}
                material={material}
                onClose={() => setEditOpen(false)}
                onUpdated={() => {
                  setEditOpen(false)
                  onChanged()
                }}
              />
            </Dialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost">
                  <Trash2 className="size-4 text-rose-500" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="glass-strong">
                <AlertDialogHeader>
                  <AlertDialogTitle>Padam bahan ini?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tindakan ini tidak boleh diundur. Bahan &ldquo;{material.title}&rdquo;
                    akan dialih keluar secara kekal.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-rose-500 hover:bg-rose-600"
                  >
                    <Trash2 className="size-4 mr-1.5" /> Padam
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </div>
  )
}

// ============================
// Quiz card
// ============================
function QuizCard({
  quiz,
  canStart,
  onStart,
  onLocked,
}: {
  quiz: Quiz & { questions?: Question[] }
  canStart: boolean
  onStart: () => void
  onLocked: () => void
}) {
  const questionCount = quiz.questions?.length ?? 0
  const totalPoints = (quiz.questions || []).reduce(
    (sum, q) => sum + (q.points || 0),
    0,
  )
  return (
    <Card className="glass rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="size-9 rounded-lg bg-amber-500/12 flex items-center justify-center shrink-0">
          <HelpCircle className="size-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-medium">
            Lulus ≥ {quiz.passScore}%
          </span>
        </div>
      </div>
      <div>
        <h3 className="font-semibold text-sm leading-snug">{quiz.title}</h3>
        {quiz.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {quiz.description}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <HelpCircle className="size-3.5" /> {questionCount} soalan
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3.5" /> {quiz.duration} min
        </span>
        <span className="inline-flex items-center gap-1">
          <Sparkles className="size-3.5" /> {totalPoints} mata
        </span>
      </div>
      <Button
        onClick={canStart ? onStart : onLocked}
        variant={canStart ? "default" : "outline"}
        className={canStart ? "btn-brand-gradient w-full" : "w-full"}
        size="sm"
      >
        {canStart ? (
          <>
            <PlayCircle className="size-4 mr-1.5" /> Mula Kuiz
          </>
        ) : (
          <>
            <Lock className="size-4 mr-1.5" /> Daftar untuk Mula
          </>
        )}
      </Button>
    </Card>
  )
}

// ============================
// Edit course dialog
// ============================
function EditCourseDialog({
  course,
  onClose,
  onUpdated,
}: {
  course: CourseDetail
  onClose: () => void
  onUpdated: () => void
}) {
  const [form, setForm] = useState({
    title: course.title,
    description: course.description,
    category: course.category,
    level: course.level,
    duration: String(course.duration ?? 0),
    instructor: course.instructor ?? "",
    status: course.status,
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Tajuk dan penerangan diperlukan.")
      return
    }
    setSubmitting(true)
    try {
      await api.put(`/api/courses/${course.id}`, {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        level: form.level,
        duration: Number(form.duration) || 0,
        instructor: form.instructor.trim() || null,
        status: form.status,
      })
      toast.success("Kursus berjaya dikemas kini.")
      onUpdated()
      onClose()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Galam mengemas kini kursus.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DialogContent className="glass-strong sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Pencil className="size-5 text-primary" /> Edit Kursus
        </DialogTitle>
        <DialogDescription>Kemas kini maklumat kursus latihan.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto scroll-area pr-2">
        <div className="space-y-1.5">
          <Label>Tajuk Kursus</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="glass-input"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Penerangan</Label>
          <Textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="glass-input"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Kategori</Label>
            <Select
              value={form.category}
              onValueChange={(v) => setForm({ ...form, category: v })}
            >
              <SelectTrigger className="w-full glass-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tahap</Label>
            <Select
              value={form.level}
              onValueChange={(v) => setForm({ ...form, level: v })}
            >
              <SelectTrigger className="w-full glass-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Tempoh (jam)</Label>
            <Input
              type="number"
              min="0"
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
              className="glass-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm({ ...form, status: v as CourseStatus })}
            >
              <SelectTrigger className="w-full glass-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aktif">Aktif</SelectItem>
                <SelectItem value="tidak_aktif">Tidak Aktif</SelectItem>
                <SelectItem value="draf">Draf</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Pensyarah</Label>
          <Input
            value={form.instructor}
            onChange={(e) => setForm({ ...form, instructor: e.target.value })}
            className="glass-input"
          />
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="ghost" disabled={submitting}>
            Batal
          </Button>
        </DialogClose>
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="btn-brand-gradient"
        >
          {submitting ? "Menyimpan..." : "Simpan Perubahan"}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

// ============================
// Add material dialog
// ============================
function AddMaterialDialog({
  courseId,
  onClose,
  onCreated,
}: {
  courseId: string
  onClose: () => void
  onCreated: () => void
}) {
  const [form, setForm] = useState({
    title: "",
    type: "pdf",
    url: "",
    description: "",
    duration: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async () => {
    const e: Record<string, string> = {}
    if (!form.title.trim()) e.title = "Tajuk bahan diperlukan"
    if (!form.url.trim()) e.url = "URL bahan diperlukan"
    if (form.duration && (isNaN(Number(form.duration)) || Number(form.duration) < 0))
      e.duration = "Tempoh mesti nombor positif"
    setErrors(e)
    if (Object.keys(e).length > 0) return

    setSubmitting(true)
    try {
      await api.post(`/api/courses/${courseId}/materials`, {
        title: form.title.trim(),
        type: form.type,
        url: form.url.trim(),
        description: form.description.trim() || null,
        duration: form.duration ? Number(form.duration) : null,
      })
      toast.success("Bahan berjaya ditambah.")
      onCreated()
      onClose()
      setForm({ title: "", type: "pdf", url: "", description: "", duration: "" })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menambah bahan.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DialogContent className="glass-strong sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Plus className="size-5 text-primary" /> Tambah Bahan Pembelajaran
        </DialogTitle>
        <DialogDescription>
          Tambah bahan baru (PDF, video, slaid, dokumen, atau pautan).
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto scroll-area pr-2">
        <div className="space-y-1.5">
          <Label>
            Tajuk Bahan <span className="text-rose-500">*</span>
          </Label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="cth. Modul 1: Pengenalan PMBOK"
            className="glass-input"
          />
          {errors.title && <p className="text-xs text-rose-500">{errors.title}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Jenis Bahan</Label>
            <Select
              value={form.type}
              onValueChange={(v) => setForm({ ...form, type: v as Material["type"] })}
            >
              <SelectTrigger className="w-full glass-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MATERIAL_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tempoh (min)</Label>
            <Input
              type="number"
              min="0"
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
              placeholder="cth. 30"
              className="glass-input"
            />
            {errors.duration && (
              <p className="text-xs text-rose-500">{errors.duration}</p>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>
            URL Bahan <span className="text-rose-500">*</span>
          </Label>
          <Input
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="https://..."
            className="glass-input"
          />
          {errors.url && <p className="text-xs text-rose-500">{errors.url}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Penerangan</Label>
          <Textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Penerangan ringkas bahan..."
            rows={2}
            className="glass-input"
          />
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="ghost" disabled={submitting}>
            Batal
          </Button>
        </DialogClose>
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="btn-brand-gradient"
        >
          {submitting ? "Menambah..." : "Tambah Bahan"}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

// ============================
// Edit material dialog
// ============================
function EditMaterialDialog({
  courseId,
  material,
  onClose,
  onUpdated,
}: {
  courseId: string
  material: Material
  onClose: () => void
  onUpdated: () => void
}) {
  const [form, setForm] = useState({
    title: material.title,
    type: material.type,
    url: material.url,
    description: material.description ?? "",
    duration: material.duration ? String(material.duration) : "",
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.url.trim()) {
      toast.error("Tajuk dan URL diperlukan.")
      return
    }
    setSubmitting(true)
    try {
      await api.put(`/api/courses/${courseId}/materials/${material.id}`, {
        title: form.title.trim(),
        type: form.type,
        url: form.url.trim(),
        description: form.description.trim() || null,
        duration: form.duration ? Number(form.duration) : null,
      })
      toast.success("Bahan berjaya dikemas kini.")
      onUpdated()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal mengemas kini bahan.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DialogContent className="glass-strong sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Pencil className="size-5 text-primary" /> Edit Bahan
        </DialogTitle>
        <DialogDescription>Kemas kini maklumat bahan pembelajaran.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto scroll-area pr-2">
        <div className="space-y-1.5">
          <Label>Tajuk Bahan</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="glass-input"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Jenis Bahan</Label>
            <Select
              value={form.type}
              onValueChange={(v) => setForm({ ...form, type: v as Material["type"] })}
            >
              <SelectTrigger className="w-full glass-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MATERIAL_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tempoh (min)</Label>
            <Input
              type="number"
              min="0"
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
              className="glass-input"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>URL Bahan</Label>
          <Input
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            className="glass-input"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Penerangan</Label>
          <Textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            className="glass-input"
          />
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="ghost" disabled={submitting}>
            Batal
          </Button>
        </DialogClose>
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="btn-brand-gradient"
        >
          {submitting ? "Menyimpan..." : "Simpan Perubahan"}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
