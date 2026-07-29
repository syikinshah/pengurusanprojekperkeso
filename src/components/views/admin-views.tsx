"use client"

// ============================================================================
// LMS-ITS PERKESO - Admin Views (Projects, Users, Reports, Settings)
// Task 4-c: Projects list+detail, Users list+form, Reports, Settings
// ============================================================================

import { useEffect, useState, useMemo, useCallback } from "react"
import { api, ApiError } from "@/lib/api-client"
import { useAuthStore, useViewStore } from "@/lib/auth-store"
import {
  StatCard,
  SectionCard,
  PageHeader,
  EmptyState,
  LoadingState,
  ProjectStatusBadge,
  InvoiceStatusBadge,
  getInitials,
} from "@/components/shared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
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
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

import {
  FolderKanban,
  Plus,
  Search,
  ArrowLeft,
  Pencil,
  Trash2,
  Eye,
  KeyRound,
  UserCog,
  UserPlus,
  RefreshCw,
  Bell,
  Download,
  AlertTriangle,
  CheckCircle2,
  Wallet,
  Receipt,
  Users as UsersIcon,
  BookOpen,
  TrendingUp,
  Briefcase,
  BarChart3,
  Save,
  Power,
  CheckCircle,
  ShieldCheck,
} from "lucide-react"
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  ROLE_LABELS,
  PROJECT_STATUS_LABELS,
  INVOICE_STATUS_LABELS,
  type User,
  type Role,
  type ProjectStatus,
  type InvoiceStatus,
} from "@/lib/types"
import { toast } from "sonner"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from "recharts"

// ============================================================================
// Shared local types (mirrors backend response shapes)
// ============================================================================

interface ProjectListItem {
  id: string
  projectName: string
  description?: string | null
  budget: number
  projectManagerId?: string | null
  status: ProjectStatus
  startDate?: string | null
  endDate?: string | null
  createdAt: string
  updatedAt: string
  projectManager?: { id: string; name: string; email: string } | null
  _count?: { invoices: number }
  invoiceSummary?: {
    total: number
    paid: number
    pending: number
    count: number
  }
}

interface ProjectDetail {
  id: string
  projectName: string
  description?: string | null
  budget: number
  projectManagerId?: string | null
  status: ProjectStatus
  startDate?: string | null
  endDate?: string | null
  createdAt: string
  updatedAt: string
  projectManager?: { id: string; name: string; email: string } | null
  invoices: Array<{
    id: string
    invoiceNo: string
    vendorName: string
    amount: number
    status: InvoiceStatus
    invoiceDate: string
    dueDate: string
  }>
  summary: {
    count: number
    total: number
    paid: number
    pending: number
    draft: number
    rejected: number
  }
}

interface TrainingReport {
  ok: boolean
  role: string
  isTrainee: boolean
  totalCourses: number
  activeCourses: number
  totalEnrollments: number
  completionRate: number
  enrollmentsByStatus: Record<string, number>
  enrollmentsByCategory: Record<string, number>
  topCourses: Array<{
    course: { id: string; title: string; category: string; level: string }
    enrollmentCount: number
    avgProgress: number
  }>
  courseProgress: Array<{
    course: {
      id: string
      title: string
      category: string
      level: string
      status: string
    }
    enrolledCount: number
    avgProgress: number
    completedCount: number
  }>
}

interface FinancialReport {
  ok: boolean
  role: string
  totalBudget: number
  totalInvoiced: number
  totalPaid: number
  totalPending: number
  totalOverdue: number
  totalRejected: number
  totalDraft: number
  invoiceCountByStatus: Record<string, number>
  invoicesByMonth: Array<{
    month: string
    count: number
    totalAmount: number
    paidAmount: number
    pendingAmount: number
  }>
  invoicesByProject: Array<{
    project: { id: string; projectName: string; budget: number }
    invoiceCount: number
    totalAmount: number
    paidAmount: number
    pendingAmount: number
    overdueAmount: number
  }>
  topVendors: Array<{
    vendorName: string
    invoiceCount: number
    totalAmount: number
  }>
}

interface ProjectsReportItem {
  id: string
  projectName: string
  budget: number
  status: ProjectStatus
  startDate?: string | null
  endDate?: string | null
  projectManager: { id: string; name: string } | null
  invoiceCount: number
  totalInvoiced: number
  totalPaid: number
  totalPending: number
  totalOverdue: number
  budgetUtilization: number
}

interface ProjectsReport {
  ok: boolean
  role: string
  count: number
  projects: ProjectsReportItem[]
}

interface DueInvoicesResponse {
  ok: boolean
  overdue: {
    count: number
    items: Array<{
      invoice: {
        id: string
        invoiceNo: string
        vendorName: string
        amount: number
        dueDate: string
        status: string
      }
      daysOverdue: number
      recipient: { id: string; name: string }
      suggestedNotification: {
        title: string
        message: string
        type: "warning" | "error"
      }
    }>
  }
  nearDue: {
    count: number
    items: Array<{
      invoice: {
        id: string
        invoiceNo: string
        vendorName: string
        amount: number
        dueDate: string
        status: string
      }
      daysOverdue: number
      recipient: { id: string; name: string }
      suggestedNotification: {
        title: string
        message: string
        type: "warning" | "error"
      }
    }>
  }
  totalCandidates: number
}

// ============================================================================
// Shared helpers
// ============================================================================

const ALL_PROJECT_STATUSES: ProjectStatus[] = [
  "aktif",
  "selesai",
  "ditangguh",
  "dibatalkan",
]

const ALL_ROLES: Role[] = [
  "admin",
  "project_manager",
  "project_admin",
  "trainee",
  "upper_management",
]

// Chart colour palette (reused from shadcn chart vars)
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "#0ea5e9",
  "#a855f7",
  "#f97316",
]

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--popover)",
  color: "var(--popover-foreground)",
  fontSize: 12,
}

function currencyTooltip(value: number) {
  return formatCurrency(value)
}

function safeReadError(e: unknown): string {
  if (e instanceof ApiError) return e.message
  if (e instanceof Error) return e.message
  return "Ralat tidak diketahui"
}

// ============================================================================
// 1. ProjectsView
// ============================================================================

export function ProjectsView() {
  const user = useAuthStore((s) => s.user)
  const navigate = useViewStore((s) => s.navigate)

  const [projects, setProjects] = useState<ProjectListItem[]>([])
  const [managers, setManagers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [managerFilter, setManagerFilter] = useState<string>("all")
  const [createOpen, setCreateOpen] = useState(false)

  const canManage =
    user?.role === "admin" || user?.role === "project_admin"

  const loadProjects = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<{ ok: boolean; data: ProjectListItem[] }>(
        "/api/projects?summary=true",
      )
      setProjects(res.data || [])
    } catch (e) {
      toast.error("Gagal memuat senarai projek", {
        description: safeReadError(e),
      })
      setProjects([])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadManagers = useCallback(async () => {
    try {
      const res = await api.get<User[]>("/api/users?role=project_manager")
      setManagers(Array.isArray(res) ? res : [])
    } catch {
      setManagers([])
    }
  }, [])

  useEffect(() => {
    loadProjects()
    loadManagers()
  }, [loadProjects, loadManagers])

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (search) {
        const q = search.toLowerCase()
        if (
          !p.projectName.toLowerCase().includes(q) &&
          !(p.description ?? "").toLowerCase().includes(q)
        ) {
          return false
        }
      }
      if (statusFilter !== "all" && p.status !== statusFilter) return false
      if (managerFilter !== "all") {
        if ((p.projectManagerId ?? "") !== managerFilter) return false
      }
      return true
    })
  }, [projects, search, statusFilter, managerFilter])

  const stats = useMemo(() => {
    const total = projects.length
    const active = projects.filter((p) => p.status === "aktif").length
    const selesai = projects.filter((p) => p.status === "selesai").length
    const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0)
    return { total, active, selesai, totalBudget }
  }, [projects])

  return (
    <div className="space-y-5 animate-fade-in-up">
      <PageHeader
        title="Pengurusan Projek"
        description="Pantau bajet, kemajuan dan invois untuk semua projek PMU PERKESO."
      >
        {canManage && (
          <Button
            className="btn-brand-gradient"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-4 mr-1.5" /> Projek Baharu
          </Button>
        )}
      </PageHeader>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Projek"
          value={stats.total}
          icon={FolderKanban}
          tone="primary"
          sublabel="Semua status"
        />
        <StatCard
          label="Aktif"
          value={stats.active}
          icon={Briefcase}
          tone="emerald"
          sublabel="Sedang berjalan"
        />
        <StatCard
          label="Selesai"
          value={stats.selesai}
          icon={CheckCircle2}
          tone="sky"
          sublabel="Projek tamat"
        />
        <StatCard
          label="Jumlah Bajet"
          value={formatCurrency(stats.totalBudget)}
          icon={Wallet}
          tone="amber"
          sublabel="Jumlah peruntukan"
        />
      </div>

      {/* Filter bar */}
      <SectionCard>
        <div className="flex flex-col sm:flex-row gap-3 p-4">
          <div className="relative flex-1">
            <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              placeholder="Cari nama / deskripsi projek..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="glass-input pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="glass-input w-full sm:w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              {ALL_PROJECT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {PROJECT_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={managerFilter} onValueChange={setManagerFilter}>
            <SelectTrigger className="glass-input w-full sm:w-56">
              <SelectValue placeholder="Pengurus" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Pengurus</SelectItem>
              {managers.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadProjects} title="Muat semula">
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </SectionCard>

      {/* Projects grid */}
      {loading ? (
        <LoadingState label="Memuat projek..." />
      ) : filtered.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon={FolderKanban}
            title="Tiada projek dijumpai"
            description="Cuba ubah penapis carian atau tambah projek baharu."
            action={
              canManage ? (
                <Button
                  className="btn-brand-gradient"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="size-4 mr-1.5" /> Tambah Projek
                </Button>
              ) : null
            }
          />
        </SectionCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const invoiced = p.invoiceSummary?.total ?? 0
            const utilization =
              p.budget > 0 ? Math.min(100, Math.round((invoiced / p.budget) * 100)) : 0
            return (
              <Card
                key={p.id}
                onClick={() => navigate("project-detail", { id: p.id })}
                className="glass rounded-2xl p-5 hover:shadow-lg transition cursor-pointer flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{p.projectName}</p>
                    {p.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {p.description}
                      </p>
                    )}
                  </div>
                  <ProjectStatusBadge status={p.status} />
                </div>

                <div className="flex items-center gap-3">
                  {p.projectManager ? (
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-primary/15 text-[10px] font-semibold">
                        {getInitials(p.projectManager.name)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="size-8 rounded-full bg-muted flex items-center justify-center">
                      <UsersIcon className="size-3.5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 text-xs">
                    <p className="font-medium truncate">
                      {p.projectManager?.name ?? "Tanpa Pengurus"}
                    </p>
                    <p className="text-muted-foreground truncate">
                      {p.projectManager?.email ?? "—"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Bajet</p>
                    <p className="font-semibold">{formatCurrency(p.budget)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tempoh</p>
                    <p className="font-medium">
                      {p.startDate ? formatDate(p.startDate) : "—"}
                      {" → "}
                      {p.endDate ? formatDate(p.endDate) : "—"}
                    </p>
                  </div>
                </div>

                {p.invoiceSummary && (
                  <div className="rounded-xl bg-muted/40 p-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Invois</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {p.invoiceSummary.count} rekod
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Jumlah</span>
                      <span className="font-medium">
                        {formatCurrency(p.invoiceSummary.total)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dibayar</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(p.invoiceSummary.paid)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Belum Dibayar</span>
                      <span className="font-medium text-amber-600 dark:text-amber-400">
                        {formatCurrency(p.invoiceSummary.pending)}
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Penggunaan Bajet
                    </span>
                    <span className="font-medium">{utilization}%</span>
                  </div>
                  <Progress value={utilization} className="h-1.5" />
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Dialog */}
      <CreateProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        managers={managers}
        onCreated={loadProjects}
      />
    </div>
  )
}

function CreateProjectDialog({
  open,
  onOpenChange,
  managers,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  managers: User[]
  onCreated: () => void
}) {
  const [form, setForm] = useState({
    projectName: "",
    description: "",
    budget: "",
    projectManagerId: "",
    status: "aktif" as ProjectStatus,
    startDate: "",
    endDate: "",
  })
  const [saving, setSaving] = useState(false)

  const reset = () =>
    setForm({
      projectName: "",
      description: "",
      budget: "",
      projectManagerId: "",
      status: "aktif",
      startDate: "",
      endDate: "",
    })

  const submit = async () => {
    if (!form.projectName.trim()) {
      toast.error("Nama projek diperlukan.")
      return
    }
    const budgetNum = Number(form.budget)
    if (!form.budget || isNaN(budgetNum) || budgetNum < 0) {
      toast.error("Bajet mesti nombor positif.")
      return
    }
    setSaving(true)
    try {
      await api.post("/api/projects", {
        projectName: form.projectName.trim(),
        description: form.description.trim() || null,
        budget: budgetNum,
        projectManagerId: form.projectManagerId || null,
        status: form.status,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      })
      toast.success("Projek berjaya dicipta.")
      reset()
      onOpenChange(false)
      onCreated()
    } catch (e) {
      toast.error("Gagal mencipta projek", {
        description: safeReadError(e),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Projek Baharu</DialogTitle>
          <DialogDescription>
            Isi butiran projek baharu untuk PMU PERKESO.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="np-name">Nama Projek *</Label>
            <Input
              id="np-name"
              className="glass-input"
              value={form.projectName}
              onChange={(e) =>
                setForm({ ...form, projectName: e.target.value })
              }
              placeholder="cth. Pembangunan Sistem LMS-ITS"
            />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="np-desc">Deskripsi</Label>
            <Textarea
              id="np-desc"
              className="glass-input"
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Penerangan ringkas projek..."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="np-budget">Bajet (RM) *</Label>
            <Input
              id="np-budget"
              type="number"
              className="glass-input"
              value={form.budget}
              onChange={(e) => setForm({ ...form, budget: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Pengurus Projek</Label>
            <Select
              value={form.projectManagerId}
              onValueChange={(v) =>
                setForm({ ...form, projectManagerId: v })
              }
            >
              <SelectTrigger className="glass-input w-full">
                <SelectValue placeholder="Pilih pengurus" />
              </SelectTrigger>
              <SelectContent>
                {managers.length === 0 ? (
                  <SelectItem value="_none" disabled>
                    Tiada pengurus projek
                  </SelectItem>
                ) : (
                  managers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) =>
                setForm({ ...form, status: v as ProjectStatus })
              }
            >
              <SelectTrigger className="glass-input w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_PROJECT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {PROJECT_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="np-start">Tarikh Mula</Label>
            <Input
              id="np-start"
              type="date"
              className="glass-input"
              value={form.startDate}
              onChange={(e) =>
                setForm({ ...form, startDate: e.target.value })
              }
            />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="np-end">Tarikh Tamat</Label>
            <Input
              id="np-end"
              type="date"
              className="glass-input"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={saving}>
              Batal
            </Button>
          </DialogClose>
          <Button onClick={submit} disabled={saving} className="btn-brand-gradient">
            {saving && <RefreshCw className="size-4 mr-2 animate-spin" />}
            Cipta Projek
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// 2. ProjectDetailView
// ============================================================================

export function ProjectDetailView() {
  const user = useAuthStore((s) => s.user)
  const navigate = useViewStore((s) => s.navigate)
  const params = useViewStore((s) => s.params)
  const projectId = params?.id

  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const canManage =
    user?.role === "admin" || user?.role === "project_admin"
  const canDelete = user?.role === "admin"

  const load = useCallback(async () => {
    if (!projectId) {
      setError("ID projek tidak dijumpai.")
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<{ ok: boolean; data: ProjectDetail }>(
        `/api/projects/${projectId}`,
      )
      setProject(res.data)
    } catch (e) {
      setError(safeReadError(e))
      setProject(null)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  const utilization = project
    ? project.budget > 0
      ? Math.min(100, Math.round((project.summary.total / project.budget) * 100))
      : 0
    : 0

  if (loading) {
    return <LoadingState label="Memuat butiran projek..." />
  }

  if (error || !project) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("projects")}>
          <ArrowLeft className="size-4 mr-1.5" /> Kembali
        </Button>
        <SectionCard>
          <EmptyState
            icon={AlertTriangle}
            title="Projek tidak dijumpai"
            description={error || "Projek mungkin telah dipadam."}
            action={
              <Button onClick={() => navigate("projects")}>
                Kembali ke Senarai
              </Button>
            }
          />
        </SectionCard>
      </div>
    )
  }

  const onDelete = async () => {
    try {
      await api.del(`/api/projects/${project.id}`)
      toast.success("Projek berjaya dipadam.")
      navigate("projects")
    } catch (e) {
      toast.error("Gagal memadam projek", {
        description: safeReadError(e),
      })
    }
  }

  return (
    <div className="space-y-5 animate-fade-in-up">
      <Button variant="ghost" onClick={() => navigate("projects")}>
        <ArrowLeft className="size-4 mr-1.5" /> Kembali ke Senarai
      </Button>

      <PageHeader
        title={project.projectName}
        description={project.description ?? "Tiada deskripsi."}
      >
        <ProjectStatusBadge status={project.status} />
        {canManage && (
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4 mr-1.5" /> Edit
          </Button>
        )}
        {canDelete && (
          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-rose-600 hover:text-rose-700">
                <Trash2 className="size-4 mr-1.5" /> Padam
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Padam projek ini?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tindakan ini tidak boleh diundur. Projek hanya boleh dipadam
                  jika tiada invois yang berkaitan.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                >
                  Padam
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </PageHeader>

      {/* Project info card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard
          title="Maklumat Projek"
          className="lg:col-span-2"
        >
          <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Pengurus Projek</p>
              <div className="flex items-center gap-2">
                {project.projectManager ? (
                  <>
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-primary/15 text-[10px] font-semibold">
                        {getInitials(project.projectManager.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {project.projectManager.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {project.projectManager.email}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Tanpa pengurus</p>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Bajet</p>
              <p className="text-lg font-semibold">
                {formatCurrency(project.budget)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Tarikh Mula</p>
              <p className="text-sm font-medium">
                {project.startDate ? formatDate(project.startDate) : "—"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Tarikh Tamat</p>
              <p className="text-sm font-medium">
                {project.endDate ? formatDate(project.endDate) : "—"}
              </p>
            </div>
            <div className="sm:col-span-2 space-y-2 pt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Penggunaan Bajet (Invois / Bajet)
                </span>
                <span className="font-medium">
                  {formatCurrency(project.summary.total)} /{" "}
                  {formatCurrency(project.budget)} · {utilization}%
                </span>
              </div>
              <Progress value={utilization} className="h-2" />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Ringkasan Invois">
          <div className="px-5 pb-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Jumlah Invois</span>
              <span className="text-sm font-semibold">
                {formatCurrency(project.summary.total)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Dibayar</span>
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(project.summary.paid)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Belum Dibayar</span>
              <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                {formatCurrency(project.summary.pending)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Draf</span>
              <span className="text-sm font-semibold">
                {formatCurrency(project.summary.draft)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Ditolak</span>
              <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                {formatCurrency(project.summary.rejected)}
              </span>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Invoices list */}
      <SectionCard
        title="Senarai Invois"
        description={`${project.invoices.length} invois berkaitan`}
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("invoices")}
          >
            Lihat semua <ArrowLeft className="size-3.5 ml-1 rotate-180" />
          </Button>
        }
      >
        <div className="px-5 pb-5">
          {project.invoices.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="Tiada invois"
              description="Belum ada invois dicipta untuk projek ini."
            />
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Invois</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead>Tarikh</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {project.invoices.map((inv) => (
                    <TableRow
                      key={inv.id}
                      onClick={() =>
                        navigate("invoice-detail", { id: inv.id })
                      }
                      className="cursor-pointer hover:bg-muted/40"
                    >
                      <TableCell className="font-mono text-xs">
                        {inv.invoiceNo}
                      </TableCell>
                      <TableCell className="text-sm">{inv.vendorName}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(inv.amount)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(inv.invoiceDate)}
                      </TableCell>
                      <TableCell>
                        <InvoiceStatusBadge status={inv.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Edit Dialog */}
      <EditProjectDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        project={project}
        onSaved={load}
      />
    </div>
  )
}

function EditProjectDialog({
  open,
  onOpenChange,
  project,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  project: ProjectDetail
  onSaved: () => void
}) {
  const [managers, setManagers] = useState<User[]>([])
  const [form, setForm] = useState({
    projectName: "",
    description: "",
    budget: "",
    projectManagerId: "",
    status: "aktif" as ProjectStatus,
    startDate: "",
    endDate: "",
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({
        projectName: project.projectName,
        description: project.description ?? "",
        budget: String(project.budget),
        projectManagerId: project.projectManagerId ?? "",
        status: project.status,
        startDate: project.startDate
          ? new Date(project.startDate).toISOString().slice(0, 10)
          : "",
        endDate: project.endDate
          ? new Date(project.endDate).toISOString().slice(0, 10)
          : "",
      })
      api
        .get<User[]>("/api/users?role=project_manager")
        .then((r) => setManagers(Array.isArray(r) ? r : []))
        .catch(() => setManagers([]))
    }
  }, [open, project])

  const submit = async () => {
    if (!form.projectName.trim()) {
      toast.error("Nama projek diperlukan.")
      return
    }
    const budgetNum = Number(form.budget)
    if (form.budget === "" || isNaN(budgetNum) || budgetNum < 0) {
      toast.error("Bajet mesti nombor positif.")
      return
    }
    setSaving(true)
    try {
      await api.put(`/api/projects/${project.id}`, {
        projectName: form.projectName.trim(),
        description: form.description.trim() || null,
        budget: budgetNum,
        projectManagerId: form.projectManagerId || null,
        status: form.status,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      })
      toast.success("Projek berjaya dikemas kini.")
      onOpenChange(false)
      onSaved()
    } catch (e) {
      toast.error("Gagal mengemas kini projek", {
        description: safeReadError(e),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Projek</DialogTitle>
          <DialogDescription>
            Kemas kini butiran projek {project.projectName}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Nama Projek *</Label>
            <Input
              className="glass-input"
              value={form.projectName}
              onChange={(e) =>
                setForm({ ...form, projectName: e.target.value })
              }
            />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Deskripsi</Label>
            <Textarea
              className="glass-input"
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Bajet (RM) *</Label>
            <Input
              type="number"
              className="glass-input"
              value={form.budget}
              onChange={(e) => setForm({ ...form, budget: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Pengurus Projek</Label>
            <Select
              value={form.projectManagerId}
              onValueChange={(v) =>
                setForm({ ...form, projectManagerId: v })
              }
            >
              <SelectTrigger className="glass-input w-full">
                <SelectValue placeholder="Tanpa pengurus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">— Tiada —</SelectItem>
                {managers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) =>
                setForm({ ...form, status: v as ProjectStatus })
              }
            >
              <SelectTrigger className="glass-input w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_PROJECT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {PROJECT_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tarikh Mula</Label>
            <Input
              type="date"
              className="glass-input"
              value={form.startDate}
              onChange={(e) =>
                setForm({ ...form, startDate: e.target.value })
              }
            />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Tarikh Tamat</Label>
            <Input
              type="date"
              className="glass-input"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={saving}>
              Batal
            </Button>
          </DialogClose>
          <Button onClick={submit} disabled={saving} className="btn-brand-gradient">
            {saving && <RefreshCw className="size-4 mr-2 animate-spin" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// 3. UsersView
// ============================================================================

export function UsersView() {
  const navigate = useViewStore((s) => s.navigate)

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [activeFilter, setActiveFilter] = useState<string>("all")
  const [pwOpenUser, setPwOpenUser] = useState<User | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<User[]>("/api/users")
      setUsers(Array.isArray(res) ? res : [])
    } catch (e) {
      toast.error("Gagal memuat pengguna", { description: safeReadError(e) })
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (search) {
        const q = search.toLowerCase()
        if (
          !u.name.toLowerCase().includes(q) &&
          !u.email.toLowerCase().includes(q) &&
          !(u.department ?? "").toLowerCase().includes(q) &&
          !(u.position ?? "").toLowerCase().includes(q)
        ) {
          return false
        }
      }
      if (roleFilter !== "all" && u.role !== roleFilter) return false
      if (activeFilter === "active" && !u.isActive) return false
      if (activeFilter === "inactive" && u.isActive) return false
      return true
    })
  }, [users, search, roleFilter, activeFilter])

  const stats = useMemo(() => {
    return {
      total: users.length,
      admin: users.filter((u) => u.role === "admin").length,
      pm: users.filter((u) => u.role === "project_manager").length,
      padmin: users.filter((u) => u.role === "project_admin").length,
      trainee: users.filter((u) => u.role === "trainee").length,
      upper: users.filter((u) => u.role === "upper_management").length,
    }
  }, [users])

  const onToggleStatus = async (u: User) => {
    const next = !u.isActive
    try {
      await api.put(`/api/users/${u.id}`, { isActive: next })
      toast.success(next ? "Pengguna diaktifkan." : "Pengguna dinyahaktifkan.")
      load()
    } catch (e) {
      toast.error("Gala mengemas kini status", {
        description: safeReadError(e),
      })
    }
  }

  const onChangeRole = async (u: User, role: Role) => {
    try {
      await api.put(`/api/users/${u.id}`, { role })
      toast.success("Peranan berjaya dikemas kini.")
      load()
    } catch (e) {
      toast.error("Gagal menukar peranan", {
        description: safeReadError(e),
      })
    }
  }

  return (
    <div className="space-y-5 animate-fade-in-up">
      <PageHeader
        title="Pengurusan Pengguna"
        description="Urus akaun pengguna, peranan dan kelayakan akses untuk LMS-ITS."
      >
        <Button
          className="btn-brand-gradient"
          onClick={() => navigate("user-form")}
        >
          <UserPlus className="size-4 mr-1.5" /> Pengguna Baharu
        </Button>
      </PageHeader>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="Total Pengguna"
          value={stats.total}
          icon={UsersIcon}
          tone="primary"
        />
        <StatCard
          label="Pentadbir Sistem"
          value={stats.admin}
          icon={ShieldCheck}
          tone="rose"
        />
        <StatCard
          label="Pengurus Projek"
          value={stats.pm}
          icon={Briefcase}
          tone="emerald"
        />
        <StatCard
          label="Pentadbir Projek"
          value={stats.padmin}
          icon={UserCog}
          tone="amber"
        />
        <StatCard
          label="Peserta Latihan"
          value={stats.trainee}
          icon={BookOpen}
          tone="violet"
        />
        <StatCard
          label="Pengurusan Atasan"
          value={stats.upper}
          icon={TrendingUp}
          tone="sky"
        />
      </div>

      {/* Filter bar */}
      <SectionCard>
        <div className="flex flex-col sm:flex-row gap-3 p-4">
          <div className="relative flex-1">
            <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              placeholder="Cari nama / e-mel / jabatan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="glass-input pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="glass-input w-full sm:w-56">
              <SelectValue placeholder="Peranan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Peranan</SelectItem>
              {ALL_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={activeFilter} onValueChange={setActiveFilter}>
            <SelectTrigger className="glass-input w-full sm:w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="inactive">Tidak Aktif</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={load} title="Muat semula">
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </SectionCard>

      {/* Users table */}
      {loading ? (
        <LoadingState label="Memuat pengguna..." />
      ) : filtered.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon={UsersIcon}
            title="Tiada pengguna dijumpai"
            description="Cuba ubah penapis carian atau tambah pengguna baharu."
          />
        </SectionCard>
      ) : (
        <SectionCard>
          <div className="rounded-xl border border-border overflow-hidden m-4">
            <div className="max-h-[600px] overflow-y-auto scroll-area">
              <Table>
                <TableHeader className="sticky top-0 bg-background/95 backdrop-blur z-10">
                  <TableRow>
                    <TableHead>Pengguna</TableHead>
                    <TableHead>Peranan</TableHead>
                    <TableHead>Jabatan</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Log Masuk Akhir</TableHead>
                    <TableHead className="text-right">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => (
                    <TableRow key={u.id} className="hover:bg-muted/40">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9">
                            <AvatarFallback className="bg-primary/15 text-xs font-semibold">
                              {getInitials(u.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{u.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/12 text-primary text-xs font-medium hover:bg-primary/20 transition">
                              {ROLE_LABELS[u.role]}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuLabel>Tukar Peranan</DropdownMenuLabel>
                            {ALL_ROLES.map((r) => (
                              <DropdownMenuItem
                                key={r}
                                onClick={() => onChangeRole(u, r)}
                                disabled={r === u.role}
                              >
                                {ROLE_LABELS[r]}
                                {r === u.role && (
                                  <CheckCircle className="size-3.5 ml-auto" />
                                )}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell className="text-sm">
                        {u.department || "—"}
                        {u.position ? (
                          <span className="block text-xs text-muted-foreground">
                            {u.position}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {u.phone || "—"}
                      </TableCell>
                      <TableCell>
                        {u.isActive ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-transparent">
                            Aktif
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Tidak Aktif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {u.lastLoginAt
                          ? formatDateTime(u.lastLoginAt)
                          : "Belum pernah"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              navigate("user-form", { id: u.id })
                            }
                            title="Lihat / Edit"
                          >
                            <Eye className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onToggleStatus(u)}
                            title={u.isActive ? "Nyahaktif" : "Aktifkan"}
                          >
                            <Power className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setPwOpenUser(u)}
                            title="Tukar Kata Laluan"
                          >
                            <KeyRound className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Reset password dialog */}
      <ResetPasswordDialog
        user={pwOpenUser}
        onClose={() => setPwOpenUser(null)}
      />
    </div>
  )
}

function ResetPasswordDialog({
  user,
  onClose,
}: {
  user: User | null
  onClose: () => void
}) {
  const [newPassword, setNewPassword] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) setNewPassword("")
  }, [user])

  const submit = async () => {
    if (!user) return
    if (newPassword.length < 6) {
      toast.error("Kata laluan mesti sekurang-kurangnya 6 aksara.")
      return
    }
    setSaving(true)
    try {
      await api.put(`/api/users/${user.id}/password`, { newPassword })
      toast.success("Kata laluan berjaya ditetapkan semula.")
      onClose()
    } catch (e) {
      toast.error("Gagal menukar kata laluan", {
        description: safeReadError(e),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!user} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tetap Semula Kata Laluan</DialogTitle>
          <DialogDescription>
            Tetapkan kata laluan baharu untuk{" "}
            <span className="font-medium">{user?.name}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="rp-new">Kata Laluan Baharu</Label>
          <Input
            id="rp-new"
            type="password"
            className="glass-input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimum 6 aksara"
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={saving}>
              Batal
            </Button>
          </DialogClose>
          <Button onClick={submit} disabled={saving} className="btn-brand-gradient">
            {saving && <RefreshCw className="size-4 mr-2 animate-spin" />}
            Tetapkan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// 4. UserFormView
// ============================================================================

export function UserFormView() {
  const me = useAuthStore((s) => s.user)
  const refreshUser = useAuthStore((s) => s.refreshUser)
  const navigate = useViewStore((s) => s.navigate)
  const params = useViewStore((s) => s.params)
  const userId = params?.id

  const isEdit = !!userId
  const isAdmin = me?.role === "admin"

  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "trainee" as Role,
    department: "PMU",
    position: "",
    phone: "",
    password: "",
    isActive: true,
  })
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    api
      .get<User>(`/api/users/${userId}`)
      .then((u) => {
        setForm({
          name: u.name ?? "",
          email: u.email ?? "",
          role: u.role ?? "trainee",
          department: u.department ?? "PMU",
          position: u.position ?? "",
          phone: u.phone ?? "",
          password: "",
          isActive: u.isActive ?? true,
        })
      })
      .catch((e) => {
        toast.error("Gagal memuat pengguna", {
          description: safeReadError(e),
        })
      })
      .finally(() => setLoading(false))
  }, [userId])

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("Nama penuh diperlukan.")
      return
    }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error("E-mel tidak sah.")
      return
    }
    if (!isEdit && form.password.length < 6) {
      toast.error("Kata laluan mesti sekurang-kurangnya 6 aksara.")
      return
    }

    setSaving(true)
    try {
      if (isEdit && userId) {
        const payload: Record<string, unknown> = {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          department: form.department.trim() || "PMU",
          position: form.position.trim() || null,
          phone: form.phone.trim() || null,
        }
        if (isAdmin) {
          payload.role = form.role
          payload.isActive = form.isActive
        }
        await api.put(`/api/users/${userId}`, payload)
        // If editing self, refresh current session user
        if (me?.id === userId) {
          await refreshUser()
        }
        toast.success("Profil berjaya dikemas kini.")
      } else {
        await api.post("/api/users", {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          role: form.role,
          department: form.department.trim() || "PMU",
          position: form.position.trim() || null,
          phone: form.phone.trim() || null,
          password: form.password,
        })
        toast.success("Pengguna berjaya dicipta.")
      }
      navigate("users")
    } catch (e) {
      toast.error("Gagal menyimpan pengguna", {
        description: safeReadError(e),
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <LoadingState label="Memuat profil pengguna..." />
  }

  return (
    <div className="space-y-5 animate-fade-in-up max-w-3xl">
      <Button variant="ghost" onClick={() => navigate("users")}>
        <ArrowLeft className="size-4 mr-1.5" /> Kembali
      </Button>
      <PageHeader
        title={isEdit ? "Edit Pengguna" : "Pengguna Baharu"}
        description={
          isEdit
            ? "Kemas kini butiran pengguna."
            : "Cipta akaun pengguna baharu dalam sistem."
        }
      />

      <SectionCard title="Maklumat Pengguna" description="Isi semua medan bertanda *">
        <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="uf-name">Nama Penuh *</Label>
            <Input
              id="uf-name"
              className="glass-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="cth. Ahmad bin Ali"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uf-email">E-mel *</Label>
            <Input
              id="uf-email"
              type="email"
              className="glass-input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="nama@perkeso.gov.my"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Peranan *</Label>
            <Select
              value={form.role}
              onValueChange={(v) => setForm({ ...form, role: v as Role })}
              disabled={!isAdmin && isEdit}
            >
              <SelectTrigger className="glass-input w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isAdmin && isEdit && (
              <p className="text-xs text-muted-foreground">
                Hanya pentadbir boleh menukar peranan.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uf-dept">Jabatan</Label>
            <Input
              id="uf-dept"
              className="glass-input"
              value={form.department}
              onChange={(e) =>
                setForm({ ...form, department: e.target.value })
              }
              placeholder="PMU"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uf-pos">Jawatan</Label>
            <Input
              id="uf-pos"
              className="glass-input"
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              placeholder="cth. Pegawai Pembangunan"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uf-phone">Telefon</Label>
            <Input
              id="uf-phone"
              className="glass-input"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="03-1234 5678"
            />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="uf-pw">
              Kata Laluan{" "}
              {isEdit ? "(kosongkan jika tidak diubah)" : "*"}
            </Label>
            <Input
              id="uf-pw"
              type="password"
              className="glass-input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={
                isEdit ? "Biarkan kosong untuk kekalkan" : "Minimum 6 aksara"
              }
            />
          </div>
          {isEdit && isAdmin && (
            <div className="sm:col-span-2 flex items-center justify-between gap-3 rounded-xl border border-border p-3">
              <div>
                <p className="text-sm font-medium">Status Aktif</p>
                <p className="text-xs text-muted-foreground">
                  Nyahaktif untuk melumpuhkan log masuk pengguna.
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
            </div>
          )}
        </div>
      </SectionCard>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => navigate("users")}>
          Batal
        </Button>
        <Button onClick={submit} disabled={saving} className="btn-brand-gradient">
          {saving && <RefreshCw className="size-4 mr-2 animate-spin" />}
          {isEdit ? "Simpan Perubahan" : "Cipta Pengguna"}
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// 5. ReportsView
// ============================================================================

export function ReportsView() {
  return (
    <div className="space-y-5 animate-fade-in-up">
      <PageHeader
        title="Laporan & Analitik"
        description="Ringkasan latihan, kewangan dan prestasi projek PMU PERKESO."
      />
      <Tabs defaultValue="training" className="w-full">
        <TabsList className="glass">
          <TabsTrigger value="training">Ringkasan Latihan</TabsTrigger>
          <TabsTrigger value="financial">Ringkasan Kewangan</TabsTrigger>
          <TabsTrigger value="projects">Pelan Kewangan Projek</TabsTrigger>
        </TabsList>
        <TabsContent value="training" className="mt-4">
          <TrainingReportTab />
        </TabsContent>
        <TabsContent value="financial" className="mt-4">
          <FinancialReportTab />
        </TabsContent>
        <TabsContent value="projects" className="mt-4">
          <ProjectsReportTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function TrainingReportTab() {
  const [data, setData] = useState<TrainingReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (fromDate) qs.set("fromDate", fromDate)
      if (toDate) qs.set("toDate", toDate)
      const res = await api.get<TrainingReport>(
        `/api/reports/training${qs.toString() ? `?${qs}` : ""}`,
      )
      setData(res)
    } catch (e) {
      toast.error("Gagal memuat laporan latihan", {
        description: safeReadError(e),
      })
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return <LoadingState label="Memuat laporan latihan..." />
  }
  if (!data) {
    return (
      <SectionCard>
        <EmptyState
          icon={BarChart3}
          title="Laporan tidak tersedia"
          description="Anda mungkin tidak mempunyai kebenaran."
        />
      </SectionCard>
    )
  }

  const statusData = [
    {
      name: "Belum Mula",
      key: "belum_mula",
      value: data.enrollmentsByStatus?.["belum_mula"] ?? 0,
    },
    {
      name: "Dalam Proses",
      key: "dalam_proses",
      value: data.enrollmentsByStatus?.["dalam_proses"] ?? 0,
    },
    {
      name: "Selesai",
      key: "selesai",
      value: data.enrollmentsByStatus?.["selesai"] ?? 0,
    },
  ]
  const categoryData = Object.entries(data.enrollmentsByCategory || {}).map(
    ([k, v]) => ({ name: k, value: v as number }),
  )

  return (
    <div className="space-y-5">
      {/* Date filter */}
      <SectionCard>
        <div className="flex flex-col sm:flex-row gap-3 p-4 items-end">
          <div className="space-y-1.5">
            <Label>Dari Tarikh</Label>
            <Input
              type="date"
              className="glass-input"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Hingga Tarikh</Label>
            <Input
              type="date"
              className="glass-input"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={load}>
            <RefreshCw className="size-4 mr-2" /> Muat Semula
          </Button>
        </div>
      </SectionCard>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Kursus"
          value={data.totalCourses}
          icon={BookOpen}
          tone="primary"
        />
        <StatCard
          label="Kursus Aktif"
          value={data.activeCourses}
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatCard
          label="Pendaftaran"
          value={data.totalEnrollments}
          icon={UsersIcon}
          tone="amber"
        />
        <StatCard
          label="Kadar Penyempurnaan"
          value={`${(data.completionRate ?? 0).toFixed(1)}%`}
          icon={TrendingUp}
          tone="violet"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard
          title="Pendaftaran mengikut Status"
          description="Pecahan pendaftaran kursus mengikut status kemajuan"
        >
          <div className="px-5 pb-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" name="Pendaftaran" radius={[8, 8, 0, 0]}>
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard
          title="Pendaftaran mengikut Kategori"
          description="Taburan pendaftaran merentas kategori kursus"
        >
          <div className="px-5 pb-5 h-72">
            {categoryData.length === 0 ? (
              <EmptyState icon={BarChart3} title="Tiada data" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={(e) => `${e.name}: ${e.value}`}
                  >
                    {categoryData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Top courses table */}
      <SectionCard
        title="Kursus Teratas"
        description="5 kursus dengan pendaftaran tertinggi"
      >
        <div className="px-5 pb-5">
          {(data.topCourses || []).length === 0 ? (
            <EmptyState icon={BookOpen} title="Tiada pendaftaran lagi" />
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kursus</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Pendaftaran</TableHead>
                    <TableHead className="text-right">Kemajuan Purata</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topCourses.map((t) => (
                    <TableRow key={t.course.id}>
                      <TableCell className="font-medium">
                        {t.course.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">
                          {t.course.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {t.enrollmentCount}
                      </TableCell>
                      <TableCell className="text-right">
                        {t.avgProgress}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  )
}

function FinancialReportTab() {
  const user = useAuthStore((s) => s.user)
  const navigate = useViewStore((s) => s.navigate)
  const [data, setData] = useState<FinancialReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [projectId, setProjectId] = useState("all")
  const [projects, setProjects] = useState<ProjectListItem[]>([])
  const [dueOpen, setDueOpen] = useState(false)
  const [dueData, setDueData] = useState<DueInvoicesResponse | null>(null)
  const [dueLoading, setDueLoading] = useState(false)
  const [duePosting, setDuePosting] = useState(false)

  const canCheckDue =
    user?.role === "admin" ||
    user?.role === "project_manager" ||
    user?.role === "project_admin"

  const canPostDue = user?.role === "admin" || user?.role === "project_admin"

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (fromDate) qs.set("fromDate", fromDate)
      if (toDate) qs.set("toDate", toDate)
      if (projectId !== "all") qs.set("projectId", projectId)
      const res = await api.get<FinancialReport>(
        `/api/reports/financial${qs.toString() ? `?${qs}` : ""}`,
      )
      setData(res)
    } catch (e) {
      toast.error("Gagal memuat laporan kewangan", {
        description: safeReadError(e),
      })
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate, projectId])

  const loadProjects = useCallback(async () => {
    try {
      const res = await api.get<{ ok: boolean; data: ProjectListItem[] }>(
        "/api/projects",
      )
      setProjects(res.data || [])
    } catch {
      setProjects([])
    }
  }, [])

  useEffect(() => {
    load()
    loadProjects()
  }, [load, loadProjects])

  const exportCsv = () => {
    const qs = new URLSearchParams()
    if (fromDate) qs.set("fromDate", fromDate)
    if (toDate) qs.set("toDate", toDate)
    if (projectId !== "all") qs.set("projectId", projectId)
    const url = `/api/invoices/export${qs.toString() ? `?${qs}` : ""}`
    window.open(url, "_blank")
  }

  const openDueDialog = async () => {
    setDueOpen(true)
    setDueLoading(true)
    try {
      const res = await api.get<DueInvoicesResponse>(
        "/api/notifications/due-invoices",
      )
      setDueData(res)
    } catch (e) {
      toast.error("Gagal memuatkan preview notifikasi", {
        description: safeReadError(e),
      })
      setDueData(null)
    } finally {
      setDueLoading(false)
    }
  }

  const confirmDuePost = async () => {
    setDuePosting(true)
    try {
      const res = await api.post<{ ok: boolean; created: number; message?: string }>(
        "/api/notifications/due-invoices",
      )
      toast.success(
        res.created > 0
          ? `${res.created} notifikasi berjaya dihantar.`
          : res.message || "Tiada notifikasi baharu diperlukan.",
      )
      setDueOpen(false)
    } catch (e) {
      toast.error("Gagal menghantar notifikasi", {
        description: safeReadError(e),
      })
    } finally {
      setDuePosting(false)
    }
  }

  if (loading) {
    return <LoadingState label="Memuat laporan kewangan..." />
  }
  if (!data) {
    return (
      <SectionCard>
        <EmptyState
          icon={BarChart3}
          title="Laporan tidak tersedia"
          description="Anda mungkin tidak mempunyai kebenaran."
        />
      </SectionCard>
    )
  }

  const statusPie = Object.entries(data.invoiceCountByStatus || {}).map(
    ([k, v]) => ({
      name: INVOICE_STATUS_LABELS[k as InvoiceStatus] ?? k,
      value: v as number,
    }),
  )
  const monthData = data.invoicesByMonth || []
  const projectBarData = (data.invoicesByProject || [])
    .filter((p) => p.invoiceCount > 0)
    .map((p) => ({
      name: p.project.projectName,
      Jumlah: p.totalAmount,
      Dibayar: p.paidAmount,
      Tertunggak: p.overdueAmount,
    }))

  return (
    <div className="space-y-5">
      {/* Filter row */}
      <SectionCard>
        <div className="flex flex-col lg:flex-row gap-3 p-4 items-end flex-wrap">
          <div className="space-y-1.5">
            <Label>Dari Tarikh</Label>
            <Input
              type="date"
              className="glass-input"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Hingga Tarikh</Label>
            <Input
              type="date"
              className="glass-input"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Projek</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="glass-input w-full sm:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Projek</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.projectName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={load}>
            <RefreshCw className="size-4 mr-2" /> Muat Semula
          </Button>
          <Button variant="outline" onClick={exportCsv}>
            <Download className="size-4 mr-2" /> Eksport Invois CSV
          </Button>
          {canCheckDue && (
            <Button onClick={openDueDialog} className="btn-brand-gradient">
              <Bell className="size-4 mr-2" /> Cek Invois Tertunggak
            </Button>
          )}
        </div>
      </SectionCard>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Jumlah Bajet"
          value={formatCurrency(data.totalBudget)}
          icon={Wallet}
          tone="primary"
        />
        <StatCard
          label="Jumlah Invois"
          value={formatCurrency(data.totalInvoiced)}
          icon={Receipt}
          tone="amber"
        />
        <StatCard
          label="Dibayar"
          value={formatCurrency(data.totalPaid)}
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatCard
          label="Tertunggak"
          value={formatCurrency(data.totalOverdue)}
          icon={AlertTriangle}
          tone="rose"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard
          title="Trend Invois 6 Bulan Terakhir"
          description="Jumlah invois vs dibayar setiap bulan"
        >
          <div className="px-5 pb-5 h-80">
            {monthData.length === 0 ? (
              <EmptyState icon={BarChart3} title="Tiada data" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="paidGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number) => currencyTooltip(v)}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="totalAmount" name="Jumlah Invois" stroke="var(--chart-1)" fill="url(#invGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="paidAmount" name="Dibayar" stroke="var(--chart-2)" fill="url(#paidGrad2)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Invois mengikut Status"
          description="Taburan status invois semasa"
        >
          <div className="px-5 pb-5 h-80">
            {statusPie.length === 0 ? (
              <EmptyState icon={BarChart3} title="Tiada data" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(e) => `${e.name}: ${e.value}`}
                  >
                    {statusPie.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Invois mengikut Projek"
        description="Jumlah invois, dibayar dan tertunggak per projek"
      >
        <div className="px-5 pb-5 h-80">
          {projectBarData.length === 0 ? (
            <EmptyState icon={BarChart3} title="Tiada data" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectBarData} margin={{ top: 10, right: 10, bottom: 30, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  angle={-15}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => currencyTooltip(v)}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Jumlah" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Dibayar" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Tertunggak" fill="var(--chart-5)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </SectionCard>

      {/* Top vendors */}
      <SectionCard
        title="Vendor Teratas"
        description="5 vendor dengan jumlah invois tertinggi"
      >
        <div className="px-5 pb-5">
          {(data.topVendors || []).length === 0 ? (
            <EmptyState icon={Receipt} title="Tiada vendor" />
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Bil. Invois</TableHead>
                    <TableHead className="text-right">Jumlah (RM)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topVendors.map((v) => (
                    <TableRow key={v.vendorName}>
                      <TableCell className="font-medium">
                        {v.vendorName}
                      </TableCell>
                      <TableCell className="text-right">
                        {v.invoiceCount}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(v.totalAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Due Invoices dialog */}
      <Dialog open={dueOpen} onOpenChange={setDueOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cek Invois Tertunggak / Hampir Matang</DialogTitle>
            <DialogDescription>
              Pratonton notifikasi yang akan dihantar kepada pengurus projek
              / pencipta invois.
            </DialogDescription>
          </DialogHeader>
          {dueLoading ? (
            <LoadingState label="Memuatkan preview..." />
          ) : dueData ? (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto scroll-area">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-rose-500/10 p-3">
                  <p className="text-xs text-rose-700 dark:text-rose-400 font-medium">
                    Telah Melebihi Tarikh Matang
                  </p>
                  <p className="text-2xl font-bold text-rose-700 dark:text-rose-400">
                    {dueData.overdue.count}
                  </p>
                </div>
                <div className="rounded-xl bg-amber-500/10 p-3">
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                    Hampir Matang (≤7 hari)
                  </p>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                    {dueData.nearDue.count}
                  </p>
                </div>
              </div>

              {dueData.totalCandidates === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="Tiada invois memerlukan notifikasi"
                  description="Semua invois tertunggak telah dimaklumkan dalam 7 hari terkini."
                />
              ) : (
                <div className="space-y-2">
                  {[...dueData.overdue.items, ...dueData.nearDue.items].map(
                    (it) => (
                      <div
                        key={it.invoice.id}
                        className="rounded-xl border border-border p-3 text-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-mono text-xs font-semibold">
                              {it.invoice.invoiceNo}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {it.invoice.vendorName} → {it.recipient.name}
                            </p>
                          </div>
                          <Badge
                            variant="secondary"
                            className={
                              it.suggestedNotification.type === "error"
                                ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-transparent"
                                : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-transparent"
                            }
                          >
                            {it.daysOverdue > 0
                              ? `${it.daysOverdue} hari lewat`
                              : `${Math.abs(it.daysOverdue)} hari lagi`}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {it.suggestedNotification.message}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              icon={AlertTriangle}
              title="Gagal memuat preview"
              description="Cuba lagi sebentar lagi."
            />
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={duePosting}>
                Batal
              </Button>
            </DialogClose>
            {canPostDue && (
              <Button
                onClick={confirmDuePost}
                disabled={duePosting || dueLoading || (dueData?.totalCandidates ?? 0) === 0}
                className="btn-brand-gradient"
              >
                {duePosting && <RefreshCw className="size-4 mr-2 animate-spin" />}
                Hantar Notifikasi
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ProjectsReportTab() {
  const [data, setData] = useState<ProjectsReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (statusFilter !== "all") qs.set("status", statusFilter)
      const res = await api.get<ProjectsReport>(
        `/api/reports/projects${qs.toString() ? `?${qs}` : ""}`,
      )
      setData(res)
    } catch (e) {
      toast.error("Gagal memuat laporan projek", {
        description: safeReadError(e),
      })
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return <LoadingState label="Memuat laporan projek..." />
  }
  if (!data) {
    return (
      <SectionCard>
        <EmptyState
          icon={BarChart3}
          title="Laporan tidak tersedia"
          description="Anda mungkin tidak mempunyai kebenaran."
        />
      </SectionCard>
    )
  }

  const projects = data.projects || []
  const totals = projects.reduce(
    (acc, p) => {
      acc.budget += p.budget
      acc.invoiced += p.totalInvoiced
      acc.paid += p.totalPaid
      acc.pending += p.totalPending
      acc.overdue += p.totalOverdue
      return acc
    },
    { budget: 0, invoiced: 0, paid: 0, pending: 0, overdue: 0 },
  )

  const barData = projects.map((p) => ({
    name: p.projectName,
    Bajet: p.budget,
    Invois: p.totalInvoiced,
  }))

  return (
    <div className="space-y-5">
      {/* Filter */}
      <SectionCard>
        <div className="flex flex-col sm:flex-row gap-3 p-4 items-end">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="glass-input w-full sm:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                {ALL_PROJECT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {PROJECT_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={load}>
            <RefreshCw className="size-4 mr-2" /> Muat Semula
          </Button>
        </div>
      </SectionCard>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Jumlah Bajet"
          value={formatCurrency(totals.budget)}
          icon={Wallet}
          tone="primary"
        />
        <StatCard
          label="Jumlah Invois"
          value={formatCurrency(totals.invoiced)}
          icon={Receipt}
          tone="amber"
        />
        <StatCard
          label="Dibayar"
          value={formatCurrency(totals.paid)}
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatCard
          label="Tertunggak"
          value={formatCurrency(totals.overdue)}
          icon={AlertTriangle}
          tone="rose"
        />
      </div>

      {/* Budget vs invoiced chart */}
      <SectionCard
        title="Bajet vs Invois per Projek"
        description="Perbandingan peruntukan bajet dan jumlah invois"
      >
        <div className="px-5 pb-5 h-80">
          {barData.length === 0 ? (
            <EmptyState icon={BarChart3} title="Tiada data" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, bottom: 30, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  angle={-15}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => currencyTooltip(v)}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Bajet" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Invois" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </SectionCard>

      {/* Per-project table */}
      <SectionCard
        title="Pecahan Kewangan per Projek"
        description={`${projects.length} projek`}
      >
        <div className="px-5 pb-5">
          {projects.length === 0 ? (
            <EmptyState icon={FolderKanban} title="Tiada projek" />
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="max-h-[500px] overflow-y-auto scroll-area">
                <Table>
                  <TableHeader className="sticky top-0 bg-background/95 backdrop-blur z-10">
                    <TableRow>
                      <TableHead>Projek</TableHead>
                      <TableHead>Pengurus</TableHead>
                      <TableHead className="text-right">Bajet</TableHead>
                      <TableHead className="text-right">Invois</TableHead>
                      <TableHead className="text-right">Dibayar</TableHead>
                      <TableHead className="text-right">Belum Bayar</TableHead>
                      <TableHead className="text-right">Tertunggak</TableHead>
                      <TableHead className="text-right">Penggunaan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          {p.projectName}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.projectManager?.name ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(p.budget)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(p.totalInvoiced)}
                        </TableCell>
                        <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(p.totalPaid)}
                        </TableCell>
                        <TableCell className="text-right text-amber-600 dark:text-amber-400">
                          {formatCurrency(p.totalPending)}
                        </TableCell>
                        <TableCell className="text-right text-rose-600 dark:text-rose-400">
                          {formatCurrency(p.totalOverdue)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <Progress
                              value={Math.min(100, Math.round(p.budgetUtilization))}
                              className="h-1.5 w-16"
                            />
                            <span className="text-xs font-medium w-10 text-right">
                              {p.budgetUtilization.toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  )
}

// ============================================================================
// 6. SettingsView
// ============================================================================

export function SettingsView() {
  const user = useAuthStore((s) => s.user)
  const refreshUser = useAuthStore((s) => s.refreshUser)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useViewStore((s) => s.navigate)

  const [profile, setProfile] = useState({
    name: "",
    department: "",
    position: "",
    phone: "",
    avatarUrl: "",
  })
  const [savingProfile, setSavingProfile] = useState(false)

  const [pw, setPw] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [savingPw, setSavingPw] = useState(false)

  const [systemInfo, setSystemInfo] = useState<{
    totalUsers?: number
    usersByRole?: Record<string, number>
    totalCourses?: number
    totalProjects?: number
  } | null>(null)
  const [dueBusy, setDueBusy] = useState(false)

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name,
        department: user.department,
        position: user.position ?? "",
        phone: user.phone ?? "",
        avatarUrl: user.avatarUrl ?? "",
      })
    }
  }, [user])

  // Load system info for admin
  useEffect(() => {
    if (user?.role !== "admin") return
    api
      .get<{
        totalUsers?: number
        usersByRole?: Record<string, number>
        totalCourses?: number
        totalProjects?: number
      }>("/api/reports/dashboard")
      .then((d) => setSystemInfo(d))
      .catch(() => setSystemInfo(null))
  }, [user?.role])

  const saveProfile = async () => {
    if (!user) return
    if (!profile.name.trim()) {
      toast.error("Nama diperlukan.")
      return
    }
    setSavingProfile(true)
    try {
      await api.put(`/api/users/${user.id}`, {
        name: profile.name.trim(),
        department: profile.department.trim() || "PMU",
        position: profile.position.trim() || null,
        phone: profile.phone.trim() || null,
        avatarUrl: profile.avatarUrl.trim() || null,
      })
      await refreshUser()
      toast.success("Profil berjaya disimpan.")
    } catch (e) {
      toast.error("Gagal menyimpan profil", {
        description: safeReadError(e),
      })
    } finally {
      setSavingProfile(false)
    }
  }

  const changePw = async () => {
    if (!user) return
    if (pw.newPassword.length < 6) {
      toast.error("Kata laluan baharu mesti sekurang-kurangnya 6 aksara.")
      return
    }
    if (pw.newPassword !== pw.confirmPassword) {
      toast.error("Kata laluan baharu dan pengesahan tidak sepadan.")
      return
    }
    setSavingPw(true)
    try {
      await api.put(`/api/users/${user.id}/password`, {
        oldPassword: pw.currentPassword,
        newPassword: pw.newPassword,
      })
      toast.success("Kata laluan berjaya ditukar.")
      setPw({ currentPassword: "", newPassword: "", confirmPassword: "" })
    } catch (e) {
      toast.error("Gagal menukar kata laluan", {
        description: safeReadError(e),
      })
    } finally {
      setSavingPw(false)
    }
  }

  const checkDueInvoices = async () => {
    setDueBusy(true)
    try {
      const res = await api.post<{ ok: boolean; created: number; message?: string }>(
        "/api/notifications/due-invoices",
      )
      toast.success(
        res.created > 0
          ? `${res.created} notifikasi berjaya dihantar.`
          : res.message || "Tiada notifikasi baharu diperlukan.",
      )
    } catch (e) {
      toast.error("Gala menghantar notifikasi", {
        description: safeReadError(e),
      })
    } finally {
      setDueBusy(false)
    }
  }

  if (!user) {
    return <LoadingState label="Memuat profil..." />
  }

  return (
    <div className="space-y-5 animate-fade-in-up max-w-4xl">
      <PageHeader
        title="Tetapan"
        description="Urus profil anda, kata laluan dan keutamaan sistem."
      />

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="glass">
          <TabsTrigger value="profile">Profil Saya</TabsTrigger>
          <TabsTrigger value="password">Tukar Kata Laluan</TabsTrigger>
          {user.role === "admin" && (
            <TabsTrigger value="system">Sistem</TabsTrigger>
          )}
        </TabsList>

        {/* Profile tab */}
        <TabsContent value="profile" className="mt-4">
          <SectionCard
            title="Profil Saya"
            description="Kemas kini butiran peribadi anda."
          >
            <div className="px-5 pb-5 space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="size-16">
                  <AvatarFallback className="bg-primary/15 text-base font-semibold">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <Badge variant="secondary" className="mt-1 text-[10px]">
                    {ROLE_LABELS[user.role]}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="s-name">Nama Penuh</Label>
                  <Input
                    id="s-name"
                    className="glass-input"
                    value={profile.name}
                    onChange={(e) =>
                      setProfile({ ...profile, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>E-mel (tidak boleh diubah)</Label>
                  <Input
                    className="glass-input"
                    value={user.email}
                    disabled
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-dept">Jabatan</Label>
                  <Input
                    id="s-dept"
                    className="glass-input"
                    value={profile.department}
                    onChange={(e) =>
                      setProfile({ ...profile, department: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-pos">Jawatan</Label>
                  <Input
                    id="s-pos"
                    className="glass-input"
                    value={profile.position}
                    onChange={(e) =>
                      setProfile({ ...profile, position: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-phone">Telefon</Label>
                  <Input
                    id="s-phone"
                    className="glass-input"
                    value={profile.phone}
                    onChange={(e) =>
                      setProfile({ ...profile, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-avatar">URL Avatar</Label>
                  <Input
                    id="s-avatar"
                    className="glass-input"
                    value={profile.avatarUrl}
                    onChange={(e) =>
                      setProfile({ ...profile, avatarUrl: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={saveProfile}
                  disabled={savingProfile}
                  className="btn-brand-gradient"
                >
                  {savingProfile ? (
                    <RefreshCw className="size-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="size-4 mr-2" />
                  )}
                  Simpan Profil
                </Button>
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* Password tab */}
        <TabsContent value="password" className="mt-4">
          <SectionCard
            title="Tukar Kata Laluan"
            description="Kata laluan baharu mesti sekurang-kurangnya 6 aksara."
          >
            <div className="px-5 pb-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="s-cpw">Kata Laluan Semasa</Label>
                <Input
                  id="s-cpw"
                  type="password"
                  className="glass-input"
                  value={pw.currentPassword}
                  onChange={(e) =>
                    setPw({ ...pw, currentPassword: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="s-npw">Kata Laluan Baharu</Label>
                  <Input
                    id="s-npw"
                    type="password"
                    className="glass-input"
                    value={pw.newPassword}
                    onChange={(e) =>
                      setPw({ ...pw, newPassword: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-cnpw">Sahkan Kata Laluan Baharu</Label>
                  <Input
                    id="s-cnpw"
                    type="password"
                    className="glass-input"
                    value={pw.confirmPassword}
                    onChange={(e) =>
                      setPw({ ...pw, confirmPassword: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={changePw}
                  disabled={savingPw}
                  className="btn-brand-gradient"
                >
                  {savingPw ? (
                    <RefreshCw className="size-4 mr-2 animate-spin" />
                  ) : (
                    <KeyRound className="size-4 mr-2" />
                  )}
                  Tukar Kata Laluan
                </Button>
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* System tab (admin only) */}
        {user.role === "admin" && (
          <TabsContent value="system" className="mt-4 space-y-4">
            <SectionCard
              title="Maklumat Sistem"
              description="Versi dan konfigurasi semasa LMS-ITS PERKESO"
            >
              <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoRow label="Versi Sistem" value="LMS-ITS v1.0.0" />
                <InfoRow label="Pangkalan Data" value="SQLite (Prisma)" />
                <InfoRow
                  label="Jumlah Pengguna"
                  value={String(systemInfo?.totalUsers ?? "—")}
                />
                <InfoRow
                  label="Jumlah Kursus"
                  value={String(systemInfo?.totalCourses ?? "—")}
                />
                <InfoRow
                  label="Jumlah Projek"
                  value={String(systemInfo?.totalProjects ?? "—")}
                />
                <InfoRow label="Lokasi Pelayan" value="PMU PERKESO Cloud" />
              </div>
            </SectionCard>

            <SectionCard
              title="Pecahan Peranan Pengguna"
              description="Jumlah pengguna mengikut peranan"
            >
              <div className="px-5 pb-5 space-y-2">
                {systemInfo?.usersByRole &&
                  Object.entries(systemInfo.usersByRole).map(([role, count]) => (
                    <div
                      key={role}
                      className="flex items-center justify-between rounded-xl border border-border p-3"
                    >
                      <span className="text-sm font-medium">
                        {ROLE_LABELS[role as Role] ?? role}
                      </span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
              </div>
            </SectionCard>

            <SectionCard
              title="Tindakan Pentadbir"
              description="Operasi pengurusan sistem"
            >
              <div className="px-5 pb-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border p-4">
                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                      <Bell className="size-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        Periksa Invois Tertunggak
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Imbas invois yang telah/hampir melebihi tarikh matang
                        dan hantar notifikasi kepada penerima berkaitan.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={checkDueInvoices}
                    disabled={dueBusy}
                    className="btn-brand-gradient"
                  >
                    {dueBusy ? (
                      <RefreshCw className="size-4 mr-2 animate-spin" />
                    ) : (
                      <Bell className="size-4 mr-2" />
                    )}
                    Periksa Sekarang
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border p-4">
                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded-xl bg-rose-500/15 flex items-center justify-center shrink-0">
                      <Power className="size-5 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Tutup Sesi</p>
                      <p className="text-xs text-muted-foreground">
                        Log keluar dari akaun semasa.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      await logout()
                      navigate("dashboard")
                    }}
                  >
                    <Power className="size-4 mr-2" /> Log Keluar
                  </Button>
                </div>
              </div>
            </SectionCard>
          </TabsContent>
        )}
      </Tabs>

      {/* Logout for non-admin */}
      {user.role !== "admin" && (
        <div className="flex justify-end pt-3">
          <Button
            variant="outline"
            onClick={async () => {
              await logout()
              navigate("dashboard")
            }}
          >
            <Power className="size-4 mr-2" /> Tutup Sesi
          </Button>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border p-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}
