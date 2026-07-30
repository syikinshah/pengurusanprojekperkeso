"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { toast } from "sonner"
import { api } from "@/lib/api-client"
import { useAuthStore, useViewStore } from "@/lib/auth-store"
import {
  PageHeader,
  EmptyState,
  LoadingState,
} from "@/components/shared"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  BookOpen,
  GraduationCap,
  Clock,
  User,
  Filter,
  Search,
  Plus,
  Users,
  ArrowRight,
  Layers,
  Sparkles,
} from "lucide-react"
import type { Course } from "@/lib/types"
import {
  CategoryBadge,
  LevelBadge,
  CATEGORIES,
  LEVELS,
  formatCourseDuration,
} from "./shared"

interface CourseListItem extends Course {
  _count?: { materials: number; enrollments: number; quizzes: number }
  creator?: { id: string; name: string }
}

export function CoursesView() {
  const user = useAuthStore((s) => s.user)
  const navigate = useViewStore((s) => s.navigate)
  const [courses, setCourses] = useState<CourseListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<string>("all")
  const [level, setLevel] = useState<string>("all")
  const [createOpen, setCreateOpen] = useState(false)

  const canCreate =
    user?.role === "admin" || user?.role === "project_admin"

  const loadCourses = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<{ ok: boolean; courses: CourseListItem[] }>(
        "/api/courses",
      )
      setCourses(res.courses || [])
    } catch (e) {
      toast.error("Gagal memuat senarai kursus. Sila cuba lagi.")
      setCourses([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCourses()
  }, [loadCourses])

  // Client-side filter (server already filters aktif vs all for admins)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return courses.filter((c) => {
      if (category !== "all" && c.category !== category) return false
      if (level !== "all" && c.level !== level) return false
      if (q) {
        const hay =
          `${c.title} ${c.description} ${c.instructor ?? ""}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [courses, search, category, level])

  return (
    <div className="space-y-5 animate-fade-in-up">
      <PageHeader
        title="Katalog Kursus Latihan"
        description="Terokai kursus latihan dalaman PERKESO"
      >
        {canCreate && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="btn-brand-gradient">
                <Plus className="size-4 mr-1.5" /> Tambah Kursus
              </Button>
            </DialogTrigger>
            <CreateCourseDialog
              onClose={() => setCreateOpen(false)}
              onCreated={() => loadCourses()}
            />
          </Dialog>
        )}
      </PageHeader>

      {/* Filter bar */}
      <Card className="glass rounded-2xl p-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-end">
          <div className="flex-1">
            <Label htmlFor="search" className="text-xs text-muted-foreground">
              Cari Kursus
            </Label>
            <div className="relative mt-1">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Cari mengikut tajuk, penerangan, atau pensyarah..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 glass-input"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 md:flex md:items-end gap-3">
            <div className="md:w-48">
              <Label className="text-xs text-muted-foreground">Kategori</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1 w-full glass-input">
                  <SelectValue placeholder="Semua kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:w-44">
              <Label className="text-xs text-muted-foreground">Tahap</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger className="mt-1 w-full glass-input">
                  <SelectValue placeholder="Semua tahap" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tahap</SelectItem>
                  {LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(search || category !== "all" || level !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("")
                  setCategory("all")
                  setLevel("all")
                }}
                className="md:mb-0.5"
              >
                <Filter className="size-4 mr-1.5" /> Reset
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Result summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Menunjukkan <strong className="text-foreground">{filtered.length}</strong>{" "}
          kursus{filtered.length !== courses.length && ` (daripada ${courses.length})`}
        </span>
      </div>

      {/* Loading */}
      {loading ? (
        <LoadingState label="Memuat katalog kursus..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Tiada kursus dijumpai"
          description={
            search || category !== "all" || level !== "all"
              ? "Cuba ubah penapis carian anda."
              : "Belum ada kursus dalam katalog. Sila hubungi pentadbir."
          }
          action={
            canCreate ? (
              <Button
                className="btn-brand-gradient"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="size-4 mr-1.5" /> Tambah Kursus Baharu
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <CourseCard key={c.id} course={c} onOpen={() => navigate("course-detail", { id: c.id })} />
          ))}
        </div>
      )}
    </div>
  )
}

// ============================
// Course card
// ============================
function CourseCard({
  course,
  onOpen,
}: {
  course: CourseListItem
  onOpen: () => void
}) {
  const enrolled = course._count?.enrollments ?? 0
  const materials = course._count?.materials ?? 0
  return (
    <Card className="glass rounded-2xl p-5 flex flex-col gap-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
      <div className="flex items-center justify-between gap-2" onClick={onOpen}>
        <CategoryBadge category={course.category} />
        <LevelBadge level={course.level} />
      </div>

      <div className="flex-1" onClick={onOpen}>
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <BookOpen className="size-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {course.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
              {course.description}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground border-t pt-3">
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3.5" /> {formatCourseDuration(course.duration)}
        </span>
        {course.instructor && (
          <span className="inline-flex items-center gap-1">
            <User className="size-3.5" /> <span className="truncate max-w-32">{course.instructor}</span>
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <Users className="size-3.5" /> {enrolled} pendaftaran
        </span>
        <span className="inline-flex items-center gap-1">
          <Layers className="size-3.5" /> {materials} bahan
        </span>
      </div>

      <Button onClick={onOpen} variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
        Lihat Kursus
        <ArrowRight className="size-4 ml-1.5 transition-transform group-hover:translate-x-0.5" />
      </Button>
    </Card>
  )
}

// ============================
// Create course dialog
// ============================
function CreateCourseDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Umum",
    level: "Pertengahan",
    duration: "8",
    instructor: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.title.trim()) e.title = "Tajuk kursus diperlukan"
    if (!form.description.trim()) e.description = "Penerangan kursus diperlukan"
    const dur = Number(form.duration)
    if (form.duration && (isNaN(dur) || dur < 0))
      e.duration = "Tempoh mesti nombor positif"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      await api.post("/api/courses", {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        level: form.level,
        duration: Number(form.duration) || 0,
        instructor: form.instructor.trim() || undefined,
        status: "aktif",
      })
      toast.success("Kursus baharu berjaya dicipta.")
      onCreated()
      onClose()
      setForm({
        title: "",
        description: "",
        category: "Umum",
        level: "Pertengahan",
        duration: "8",
        instructor: "",
      })
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : "Gagal mencipta kursus. Sila cuba lagi."
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DialogContent className="glass-strong sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" /> Cipta Kursus Baharu
        </DialogTitle>
        <DialogDescription>
          Tambah kursus latihan baharu ke katalog PERKESO PMU.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto scroll-area pr-2">
        <div className="space-y-1.5">
          <Label htmlFor="title">
            Tajuk Kursus <span className="text-rose-500">*</span>
          </Label>
          <Input
            id="title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="cth. Asas Pengurusan Projek (PMBOK 7)"
            className="glass-input"
          />
          {errors.title && (
            <p className="text-xs text-rose-500">{errors.title}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">
            Penerangan <span className="text-rose-500">*</span>
          </Label>
          <Textarea
            id="description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Ringkasan kandungan kursus..."
            rows={3}
            className="glass-input"
          />
          {errors.description && (
            <p className="text-xs text-rose-500">{errors.description}</p>
          )}
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
            <Label htmlFor="duration">Tempoh (jam)</Label>
            <Input
              id="duration"
              type="number"
              min="0"
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
              className="glass-input"
            />
            {errors.duration && (
              <p className="text-xs text-rose-500">{errors.duration}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="instructor">Pensyarah</Label>
            <Input
              id="instructor"
              value={form.instructor}
              onChange={(e) => setForm({ ...form, instructor: e.target.value })}
              placeholder="cth. Mohd Faizal bin Hassan"
              className="glass-input"
            />
          </div>
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
          {submitting ? (
            <>
              <span className="size-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-1" />
              Mencipta...
            </>
          ) : (
            <>
              <Plus className="size-4 mr-1" /> Cipta Kursus
            </>
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
