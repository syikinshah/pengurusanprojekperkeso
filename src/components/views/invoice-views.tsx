"use client"

import * as React from "react"
import { useEffect, useMemo, useState, useCallback } from "react"
import { toast } from "sonner"
import { api, ApiError } from "@/lib/api-client"
import { useAuthStore, useViewStore } from "@/lib/auth-store"
import {
  StatCard,
  SectionCard,
  InvoiceStatusBadge,
  PageHeader,
  EmptyState,
  LoadingState,
  getInitials,
} from "@/components/shared"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Receipt, Search, Filter, X, Download, Plus, FileText, ChevronLeft,
  Eye, Send, CheckCircle2, XCircle, Wallet, Pencil, Trash2, Clock,
  AlertTriangle, Paperclip, Calendar, Building2, User as UserIcon,
  ArrowRight, History, FileCheck2, ShieldCheck,
  type LucideIcon,
} from "lucide-react"
import {
  formatCurrency, formatDate, formatDateTime,
  type Invoice, type Project, type InvoiceStatus,
} from "@/lib/types"

// ============================
// Helpers
// ============================

type ProjectOption = Pick<Project, "id" | "projectName" | "budget">

interface InvoiceListResponse {
  ok: true
  data: { items: Invoice[]; total: number; page: number; pageSize: number }
}
interface InvoiceDetailResponse {
  ok: true
  data: Invoice
}
interface ProjectsResponse {
  ok: true
  data: Project[]
}

/** Format Date to yyyy-MM-dd for <input type="date"> */
function toYMD(d: string | Date | null | undefined): string {
  if (!d) return ""
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return ""
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Action labels for the audit trail (Bahasa Malaysia) */
const ACTION_LABELS: Record<string, string> = {
  created: "Invois Dicipta",
  submitted: "Dihantar untuk Kelulusan",
  approved: "Diluluskan",
  rejected: "Ditolak",
  paid: "Pembayaran Ditandai",
  edited: "Invois Dikemas Kini",
  status_changed: "Status Dikemas Kini",
}

/** Action icon + tone for the timeline */
const ACTION_THEME: Record<string, { icon: LucideIcon; dot: string; ring: string; text: string }> = {
  created: { icon: FileText, dot: "bg-slate-500", ring: "ring-slate-500/20", text: "text-slate-600 dark:text-slate-300" },
  submitted: { icon: Send, dot: "bg-amber-500", ring: "ring-amber-500/20", text: "text-amber-600 dark:text-amber-400" },
  approved: { icon: CheckCircle2, dot: "bg-emerald-500", ring: "ring-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400" },
  rejected: { icon: XCircle, dot: "bg-rose-500", ring: "ring-rose-500/20", text: "text-rose-600 dark:text-rose-400" },
  paid: { icon: Wallet, dot: "bg-sky-500", ring: "ring-sky-500/20", text: "text-sky-600 dark:text-sky-400" },
  edited: { icon: Pencil, dot: "bg-violet-500", ring: "ring-violet-500/20", text: "text-violet-600 dark:text-violet-400" },
  status_changed: { icon: History, dot: "bg-muted-foreground", ring: "ring-muted-foreground/20", text: "text-muted-foreground" },
}

function isOverdue(inv: Invoice): boolean {
  if (inv.status === "dibayar" || inv.status === "ditolak") return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(inv.dueDate)
  due.setHours(0, 0, 0, 0)
  return due < today
}

function daysUntilDue(inv: Invoice): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(inv.dueDate)
  due.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / 86400000)
}

// ============================
// 1. InvoicesView — List with filters, search, export
// ============================

interface FilterState {
  search: string
  projectId: string
  status: string
  vendor: string
  fromDate: string
  toDate: string
}

const EMPTY_FILTERS: FilterState = {
  search: "",
  projectId: "all",
  status: "all",
  vendor: "",
  fromDate: "",
  toDate: "",
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Semua Status" },
  { value: "draf", label: "Draf" },
  { value: "menunggu_kelulusan", label: "Menunggu Kelulusan" },
  { value: "diluluskan", label: "Diluluskan" },
  { value: "dibayar", label: "Dibayar" },
  { value: "ditolak", label: "Ditolak" },
  { value: "tertunggak", label: "Tertunggak" },
]

export function InvoicesView() {
  const user = useAuthStore((s) => s.user)
  const navigate = useViewStore((s) => s.navigate)

  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const canCreate = user?.role === "admin" || user?.role === "project_admin"

  // Fetch projects for the filter dropdown
  useEffect(() => {
    api
      .get<ProjectsResponse>("/api/projects")
      .then((res) => setProjects(res.data.map((p) => ({ id: p.id, projectName: p.projectName, budget: p.budget }))))
      .catch(() => {
        // Non-blocking — dropdown will just be empty
      })
  }, [])

  // Build query string from filters
  const buildQuery = useCallback((f: FilterState): string => {
    const params = new URLSearchParams()
    if (f.search.trim()) params.set("search", f.search.trim())
    if (f.projectId && f.projectId !== "all") params.set("projectId", f.projectId)
    if (f.status && f.status !== "all") params.set("status", f.status)
    if (f.vendor.trim()) params.set("vendor", f.vendor.trim())
    if (f.fromDate) params.set("fromDate", f.fromDate)
    if (f.toDate) params.set("toDate", f.toDate)
    params.set("pageSize", "200") // load all matching for the POC
    return params.toString()
  }, [])

  // Fetch invoices whenever appliedFilters change
  useEffect(() => {
    // Start an async fetch; state transitions happen inside promise callbacks
    const qs = buildQuery(appliedFilters)
    let cancelled = false
    // Mark "loading" synchronously via a transition (React 19 friendly pattern)
    const start = Promise.resolve().then(() => {
      if (cancelled) return
      setLoading(true)
      setError(null)
    })
    start
      .then(() =>
        api.get<InvoiceListResponse>(`/api/invoices${qs ? `?${qs}` : ""}`),
      )
      .then((res) => {
        if (cancelled) return
        setInvoices(res.data.items || [])
      })
      .catch((e) => {
        if (cancelled) return
        const msg = e instanceof ApiError ? e.message : "Gagal memuatkan invois."
        setError(msg)
        setInvoices([])
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [appliedFilters, buildQuery])

  // Apply filters (debounce search by light manual trigger)
  const applyFilters = useCallback(() => {
    setAppliedFilters(filters)
  }, [filters])

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS)
    setAppliedFilters(EMPTY_FILTERS)
  }, [])

  // Search debounce (500ms)
  useEffect(() => {
    const t = setTimeout(() => {
      setAppliedFilters((prev) =>
        prev.search === filters.search &&
        prev.projectId === filters.projectId &&
        prev.status === filters.status &&
        prev.vendor === filters.vendor &&
        prev.fromDate === filters.fromDate &&
        prev.toDate === filters.toDate
          ? prev
          : filters,
      )
    }, 400)
    return () => clearTimeout(t)
  }, [filters])

  // Summary stats
  const stats = useMemo(() => {
    const total = invoices.length
    const totalAmount = invoices.reduce((s, i) => s + i.amount, 0)
    const dibayar = invoices.filter((i) => i.status === "dibayar")
    const tertunggak = invoices.filter((i) => isOverdue(i) || i.status === "tertunggak")
    const menunggu = invoices.filter((i) => i.status === "menunggu_kelulusan")
    return {
      total,
      totalAmount,
      dibayarCount: dibayar.length,
      dibayarAmount: dibayar.reduce((s, i) => s + i.amount, 0),
      tertunggakCount: tertunggak.length,
      tertunggakAmount: tertunggak.reduce((s, i) => s + i.amount, 0),
      menungguCount: menunggu.length,
      menungguAmount: menunggu.reduce((s, i) => s + i.amount, 0),
    }
  }, [invoices])

  const exportCsv = useCallback(() => {
    // Rebuild query without pageSize (export endpoint ignores pagination anyway)
    const params = new URLSearchParams()
    if (appliedFilters.search.trim()) params.set("search", appliedFilters.search.trim())
    if (appliedFilters.projectId && appliedFilters.projectId !== "all")
      params.set("projectId", appliedFilters.projectId)
    if (appliedFilters.status && appliedFilters.status !== "all")
      params.set("status", appliedFilters.status)
    if (appliedFilters.vendor.trim()) params.set("vendor", appliedFilters.vendor.trim())
    if (appliedFilters.fromDate) params.set("fromDate", appliedFilters.fromDate)
    if (appliedFilters.toDate) params.set("toDate", appliedFilters.toDate)
    const qs = params.toString()
    const url = `/api/invoices/export${qs ? `?${qs}` : ""}`
    // window.open triggers a same-origin GET with cookies attached → CSV download
    window.open(url, "_blank")
    toast.success("Eksport CSV dimulakan.")
  }, [appliedFilters])

  const handleSubmit = useCallback(
    (inv: Invoice) => {
      // Optimistic: navigate to detail where the "Hantar untuk Kelulusan" button is also available
      // For the row action we directly call PUT /api/invoices/:id with status menunggu_kelulusan
      api
        .put<{ ok: true; data: Invoice }>(`/api/invoices/${inv.id}`, {
          status: "menunggu_kelulusan",
        })
        .then(() => {
          toast.success(`Invois ${inv.invoiceNo} dihantar untuk kelulusan.`)
          setAppliedFilters((prev) => ({ ...prev })) // trigger refresh
        })
        .catch((e) => {
          const msg = e instanceof ApiError ? e.message : "Gagal menghantar invois."
          toast.error(msg)
        })
    },
    [],
  )

  return (
    <div className="space-y-5 animate-fade-in-up">
      <PageHeader
        title="Pengurusan Invois"
        description="Pantau, kelulusan dan bayar invois projek PERKESO PMU."
      >
        {canCreate && (
          <Button onClick={() => navigate("invoice-form")} className="btn-brand-gradient">
            <Plus className="size-4" /> Invois Baharu
          </Button>
        )}
        <Button variant="outline" onClick={exportCsv}>
          <Download className="size-4" /> Eksport CSV
        </Button>
      </PageHeader>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Jumlah Invois"
          value={stats.total.toString()}
          sublabel={formatCurrency(stats.totalAmount)}
          icon={Receipt}
          tone="primary"
        />
        <StatCard
          label="Dibayar"
          value={stats.dibayarCount.toString()}
          sublabel={formatCurrency(stats.dibayarAmount)}
          icon={Wallet}
          tone="emerald"
        />
        <StatCard
          label="Tertunggak"
          value={stats.tertunggakCount.toString()}
          sublabel={formatCurrency(stats.tertunggakAmount)}
          icon={AlertTriangle}
          tone="rose"
        />
        <StatCard
          label="Menunggu Kelulusan"
          value={stats.menungguCount.toString()}
          sublabel={formatCurrency(stats.menungguAmount)}
          icon={Clock}
          tone="amber"
        />
      </div>

      {/* Filter bar */}
      <Card className="glass rounded-2xl p-4 md:p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Cari Invois</Label>
            <div className="relative">
              <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="No. invois / vendor..."
                value={filters.search}
                onChange={(e) => setFilters((s) => ({ ...s, search: e.target.value }))}
                className="pl-8 glass-input"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Projek</Label>
            <Select
              value={filters.projectId}
              onValueChange={(v) => setFilters((s) => ({ ...s, projectId: v }))}
            >
              <SelectTrigger className="glass-input">
                <SelectValue placeholder="Semua Projek" />
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

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select
              value={filters.status}
              onValueChange={(v) => setFilters((s) => ({ ...s, status: v }))}
            >
              <SelectTrigger className="glass-input">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Vendor</Label>
            <Input
              placeholder="Nama vendor..."
              value={filters.vendor}
              onChange={(e) => setFilters((s) => ({ ...s, vendor: e.target.value }))}
              className="glass-input"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Tarikh Invois Dari</Label>
            <Input
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilters((s) => ({ ...s, fromDate: e.target.value }))}
              className="glass-input"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Tarikh Invois Hingga</Label>
            <Input
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters((s) => ({ ...s, toDate: e.target.value }))}
              className="glass-input"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-border/60">
          <Button size="sm" onClick={applyFilters}>
            <Filter className="size-4" /> Gunakan Penapis
          </Button>
          <Button size="sm" variant="ghost" onClick={clearFilters}>
            <X className="size-4" /> Bersihkan
          </Button>
          <div className="ml-auto text-xs text-muted-foreground">
            {stats.total} invois dipaparkan
          </div>
        </div>
      </Card>

      {/* Content */}
      {loading ? (
        <LoadingState label="Memuatkan invois..." />
      ) : error ? (
        <EmptyState icon={AlertTriangle} title="Ralat" description={error} />
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Tiada invois dijumpai"
          description="Cuba ubah penapis atau cipta invois baharu."
          action={
            canCreate ? (
              <Button onClick={() => navigate("invoice-form")} className="btn-brand-gradient">
                <Plus className="size-4" /> Cipta Invois
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <Card className="glass rounded-2xl overflow-hidden hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Invois</TableHead>
                  <TableHead>Projek</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead>Tarikh Invois</TableHead>
                  <TableHead>Tarikh Matang</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => {
                  const overdue = isOverdue(inv)
                  return (
                    <TableRow key={inv.id}>
                      <TableCell>
                        <button
                          onClick={() => navigate("invoice-detail", { id: inv.id })}
                          className="font-mono text-xs hover:text-primary transition-colors text-left"
                        >
                          {inv.invoiceNo}
                        </button>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {inv.project?.projectName ?? "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{inv.vendorName}</span>
                          {inv.vendorEmail && (
                            <span className="text-xs text-muted-foreground">{inv.vendorEmail}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-medium">
                        {formatCurrency(inv.amount)}
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(inv.invoiceDate)}</TableCell>
                      <TableCell>
                        <span
                          className={
                            overdue
                              ? "text-sm font-medium text-rose-600 dark:text-rose-400"
                              : "text-sm"
                          }
                        >
                          {formatDate(inv.dueDate)}
                        </span>
                        {overdue && (
                          <span className="block text-xs text-rose-600 dark:text-rose-400">
                            {Math.abs(daysUntilDue(inv))} hari tertunggak
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <InvoiceStatusBadge status={inv.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate("invoice-detail", { id: inv.id })}
                          >
                            <Eye className="size-3.5" /> Lihat
                          </Button>
                          {canCreate && inv.status === "draf" && (
                            <Button
                              size="sm"
                              className="btn-brand-gradient"
                              onClick={() => handleSubmit(inv)}
                            >
                              <Send className="size-3.5" /> Hantar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
            {invoices.map((inv) => {
              const overdue = isOverdue(inv)
              return (
                <Card key={inv.id} className="glass rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <button
                        onClick={() => navigate("invoice-detail", { id: inv.id })}
                        className="font-mono text-xs font-medium hover:text-primary transition-colors"
                      >
                        {inv.invoiceNo}
                      </button>
                      <p className="text-sm font-medium truncate mt-1">{inv.vendorName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {inv.project?.projectName ?? "-"}
                      </p>
                    </div>
                    <InvoiceStatusBadge status={inv.status} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Jumlah</p>
                      <p className="font-mono font-medium">{formatCurrency(inv.amount)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tarikh Invois</p>
                      <p>{formatDate(inv.invoiceDate)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tarikh Matang</p>
                      <p className={overdue ? "text-rose-600 dark:text-rose-400 font-medium" : ""}>
                        {formatDate(inv.dueDate)}
                        {overdue && ` · ${Math.abs(daysUntilDue(inv))}h tertunggak`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/60">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => navigate("invoice-detail", { id: inv.id })}
                    >
                      <Eye className="size-3.5" /> Lihat
                    </Button>
                    {canCreate && inv.status === "draf" && (
                      <Button
                        size="sm"
                        className="flex-1 btn-brand-gradient"
                        onClick={() => handleSubmit(inv)}
                      >
                        <Send className="size-3.5" /> Hantar
                      </Button>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ============================
// 2. InvoiceDetailView — Detail + Approval Workflow + Audit Trail
// ============================

export function InvoiceDetailView() {
  const params = useViewStore((s) => s.params)
  const navigate = useViewStore((s) => s.navigate)
  const user = useAuthStore((s) => s.user)
  const invoiceId = params.id

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [related, setRelated] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Reject dialog state
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectRemarks, setRejectRemarks] = useState("")

  // Approve dialog state (optional remarks)
  const [approveOpen, setApproveOpen] = useState(false)
  const [approveRemarks, setApproveRemarks] = useState("")

  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = useState(false)

  const loadInvoice = useCallback(() => {
    if (!invoiceId) return
    setLoading(true)
    setError(null)
    api
      .get<InvoiceDetailResponse>(`/api/invoices/${invoiceId}`)
      .then((res) => {
        setInvoice(res.data)
        // Load related invoices for same project (excluding current)
        const projId = res.data.projectId
        api
          .get<InvoiceListResponse>(`/api/invoices?projectId=${projId}&pageSize=200`)
          .then((r) => {
            setRelated((r.data.items || []).filter((i) => i.id !== invoiceId).slice(0, 5))
          })
          .catch(() => setRelated([]))
      })
      .catch((e) => {
        const msg = e instanceof ApiError ? e.message : "Gagal memuatkan invois."
        setError(msg)
      })
      .finally(() => setLoading(false))
  }, [invoiceId])

  useEffect(() => {
    loadInvoice()
  }, [loadInvoice])

  const refresh = useCallback(() => {
    loadInvoice()
  }, [loadInvoice])

  const handleAction = useCallback(
    async (
      label: string,
      url: string,
      method: "POST" | "PUT",
      body?: Record<string, unknown>,
      successMsg?: string,
    ) => {
      setActionLoading(true)
      try {
        if (method === "POST") {
          await api.post<{ ok: true }>(url, body)
        } else {
          await api.put<{ ok: true }>(url, body)
        }
        toast.success(successMsg ?? `${label} berjaya.`)
        refresh()
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : `${label} gagal.`
        toast.error(msg)
      } finally {
        setActionLoading(false)
      }
    },
    [refresh],
  )

  if (loading) {
    return <LoadingState label="Memuatkan butiran invois..." />
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("invoices")}>
          <ChevronLeft className="size-4" /> Kembali ke Senarai Invois
        </Button>
        <EmptyState icon={AlertTriangle} title="Tidak Dapat Memuatkan Invois" description={error} />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("invoices")}>
          <ChevronLeft className="size-4" /> Kembali ke Senarai Invois
        </Button>
        <EmptyState icon={Receipt} title="Invois tidak dijumpai" />
      </div>
    )
  }

  const role = user?.role
  const isAdminOrPA = role === "admin" || role === "project_admin"
  const isApprover = role === "admin" || role === "project_manager"
  const isReadOnly = role === "upper_management"

  const overdue = isOverdue(invoice)
  const daysToDue = daysUntilDue(invoice)

  // Action button rendering
  const renderActions = () => {
    if (actionLoading) {
      return (
        <div className="flex items-center justify-center py-4">
          <div className="size-5 rounded-full border-2 border-primary border-t-transparent animate-spin mr-3" />
          <span className="text-sm text-muted-foreground">Memproses...</span>
        </div>
      )
    }

    if (isReadOnly) {
      return (
        <div className="flex items-center justify-center gap-2 py-4 px-3 rounded-lg bg-muted/40 text-muted-foreground text-sm">
          <ShieldCheck className="size-4" />
          Paparan Sahaja
        </div>
      )
    }

    return (
      <div className="space-y-2">
        {/* admin / p_admin + draf → Hantar, Edit, Padam */}
        {isAdminOrPA && invoice.status === "draf" && (
          <>
            <Button
              className="w-full btn-brand-gradient"
              onClick={() =>
                handleAction(
                  "Hantar untuk Kelulusan",
                  `/api/invoices/${invoice.id}`,
                  "PUT",
                  { status: "menunggu_kelulusan" },
                  `Invois ${invoice.invoiceNo} dihantar untuk kelulusan.`,
                )
              }
            >
              <Send className="size-4" /> Hantar untuk Kelulusan
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("invoice-form", { id: invoice.id })}
            >
              <Pencil className="size-4" /> Edit Invois
            </Button>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-4" /> Padam Invois
            </Button>
          </>
        )}

        {/* admin / p_admin + diluluskan → Tanda Dibayar */}
        {isAdminOrPA && invoice.status === "diluluskan" && (
          <Button
            className="w-full btn-brand-gradient"
            onClick={() =>
              handleAction(
                "Tanda Dibayar",
                `/api/invoices/${invoice.id}/pay`,
                "POST",
                {},
                `Invois ${invoice.invoiceNo} ditandai dibayar.`,
              )
            }
          >
            <Wallet className="size-4" /> Tanda Dibayar
          </Button>
        )}

        {/* admin / p_admin + tertunggak → Tanda Dibayar (allowed transition tertunggak→dibayar) */}
        {isAdminOrPA && invoice.status === "tertunggak" && (
          <Button
            className="w-full btn-brand-gradient"
            onClick={() =>
              handleAction(
                "Tanda Dibayar",
                `/api/invoices/${invoice.id}/pay`,
                "POST",
                {},
                `Invois ${invoice.invoiceNo} ditandai dibayar.`,
              )
            }
          >
            <Wallet className="size-4" /> Tanda Dibayar
          </Button>
        )}

        {/* admin / project_manager + menunggu_kelulusan → Luluskan, Tolak */}
        {isApprover && invoice.status === "menunggu_kelulusan" && (
          <>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setApproveOpen(true)}
            >
              <CheckCircle2 className="size-4" /> Luluskan
            </Button>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => {
                setRejectRemarks("")
                setRejectOpen(true)
              }}
            >
              <XCircle className="size-4" /> Tolak
            </Button>
          </>
        )}

        {/* Non-actionable statuses */}
        {invoice.status === "dibayar" && (
          <div className="flex items-center justify-center gap-2 py-4 px-3 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-sm">
            <CheckCircle2 className="size-4" />
            Invois telah dibayar
          </div>
        )}
        {invoice.status === "ditolak" && (
          <div className="flex items-center justify-center gap-2 py-4 px-3 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-400 text-sm">
            <XCircle className="size-4" />
            Invois ditolak
          </div>
        )}
        {(invoice.status === "menunggu_kelulusan" && !isApprover) && (
          <div className="flex items-center justify-center gap-2 py-4 px-3 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm">
            <Clock className="size-4" />
            Menunggu kelulusan
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in-up">
      <Button variant="ghost" onClick={() => navigate("invoices")} className="mb-1">
        <ChevronLeft className="size-4" /> Kembali ke Senarai Invois
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT: main column (2/3) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Invoice header card */}
          <Card className="glass rounded-2xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Receipt className="size-4 text-muted-foreground" />
                  <span className="font-mono text-sm text-muted-foreground">No. Invois</span>
                </div>
                <h2 className="text-2xl font-bold font-mono">{invoice.invoiceNo}</h2>
                <div className="mt-2">
                  <InvoiceStatusBadge status={invoice.status} />
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Jumlah</p>
                <p className="text-3xl font-bold text-gradient">{formatCurrency(invoice.amount)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5 pt-4 border-t border-border/60">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building2 className="size-3.5" /> Projek
                </p>
                <button
                  onClick={() => navigate("project-detail", { id: invoice.projectId })}
                  className="text-sm font-medium hover:text-primary transition-colors text-left"
                >
                  {invoice.project?.projectName ?? "-"}
                </button>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <UserIcon className="size-3.5" /> Vendor
                </p>
                <p className="text-sm font-medium">{invoice.vendorName}</p>
                {invoice.vendorEmail && (
                  <p className="text-xs text-muted-foreground">{invoice.vendorEmail}</p>
                )}
              </div>
            </div>
          </Card>

          {/* Details card */}
          <SectionCard title="Butiran Tarikh" description="Tarikh penting invois.">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                  <Calendar className="size-3.5" /> Tarikh Invois
                </p>
                <p className="text-sm font-medium">{formatDate(invoice.invoiceDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                  <Clock className="size-3.5" /> Tarikh Matang
                </p>
                <p
                  className={`text-sm font-medium ${
                    overdue
                      ? "text-rose-600 dark:text-rose-400"
                      : ""
                  }`}
                >
                  {formatDate(invoice.dueDate)}
                </p>
                {overdue && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
                    {Math.abs(daysToDue)} hari tertunggak
                  </p>
                )}
                {!overdue && invoice.status !== "dibayar" && invoice.status !== "ditolak" && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {daysToDue === 0
                      ? "Matang hari ini"
                      : daysToDue > 0
                        ? `Matang dalam ${daysToDue} hari`
                        : ""}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                  <CheckCircle2 className="size-3.5" /> Tarikh Dibayar
                </p>
                <p className="text-sm font-medium">
                  {invoice.paidAt ? formatDate(invoice.paidAt) : "-"}
                </p>
              </div>
            </div>
          </SectionCard>

          {/* Remarks card */}
          {invoice.remarks && (
            <SectionCard title="Catatan / Ulasan">
              <p className="text-sm whitespace-pre-wrap">{invoice.remarks}</p>
            </SectionCard>
          )}

          {/* Attachment card */}
          {invoice.attachmentUrl && (
            <SectionCard title="Dokumen Sokongan">
              <a
                href={invoice.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border border-border/60 hover:bg-accent/40 transition-colors group"
              >
                <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Paperclip className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {invoice.attachmentName || "Lampiran"}
                  </p>
                  <p className="text-xs text-muted-foreground">Klik untuk muat turun / buka</p>
                </div>
                <Download className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </a>
            </SectionCard>
          )}

          {/* Audit Trail timeline */}
          <SectionCard
            title="Jejak Audit"
            description="Sejarah penuh kelulusan & pembayaran invois."
          >
            {invoice.history && invoice.history.length > 0 ? (() => {
              const total = invoice.history.length
              return (
                <ol className="relative space-y-4 ml-2">
                  {invoice.history.map((h, idx) => {
                    const theme = ACTION_THEME[h.action] || ACTION_THEME.status_changed
                    const ActionIcon = theme.icon
                    const isLast = idx === total - 1
                    return (
                      <li key={h.id} className="relative pl-8">
                        {/* Vertical line */}
                        {!isLast && (
                          <span
                            className="absolute left-[14px] top-7 bottom-0 w-px bg-border"
                            aria-hidden
                          />
                        )}
                        {/* Dot */}
                        <span
                          className={`absolute left-2 top-1.5 size-4 rounded-full ${theme.dot} ring-4 ${theme.ring} flex items-center justify-center`}
                          aria-hidden
                        >
                          <ActionIcon className="size-2.5 text-white" />
                        </span>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className={`text-sm font-semibold ${theme.text}`}>
                              {ACTION_LABELS[h.action] ?? h.action}
                            </p>
                            {h.fromStatus || h.toStatus ? (
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                {h.fromStatus && (
                                  <InvoiceStatusBadge status={h.fromStatus as InvoiceStatus} />
                                )}
                                {h.toStatus && h.fromStatus && (
                                  <ArrowRight className="size-3 text-muted-foreground" />
                                )}
                                {h.toStatus && (
                                  <InvoiceStatusBadge status={h.toStatus as InvoiceStatus} />
                                )}
                              </div>
                            ) : null}
                            {h.remarks && (
                              <p className="text-xs text-muted-foreground mt-1.5 max-w-md">
                                "{h.remarks}"
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {h.user?.name && (
                              <Avatar className="size-6">
                                <AvatarFallback className="text-[10px] font-medium">
                                  {getInitials(h.user.name)}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div className="text-right">
                              <p className="text-xs font-medium">{h.user?.name ?? "Sistem"}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {formatDateTime(h.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              )
            })() : (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Tiada rekod jejak audit.
              </p>
            )}
          </SectionCard>
        </div>

        {/* RIGHT: sidebar column (1/3) */}
        <div className="space-y-5">
          {/* Actions card */}
          <SectionCard title="Tindakan" description="Aliran kerja kelulusan & pembayaran.">
            {renderActions()}
          </SectionCard>

          {/* Quick info card */}
          <SectionCard title="Maklumat Pantas">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Dicipta Oleh</dt>
                <dd className="font-medium mt-0.5">{invoice.createdBy?.name ?? "-"}</dd>
                <dd className="text-xs text-muted-foreground">
                  {formatDateTime(invoice.createdAt)}
                </dd>
              </div>
              <div className="pt-3 border-t border-border/60">
                <dt className="text-xs text-muted-foreground">Diluluskan Oleh</dt>
                <dd className="font-medium mt-0.5">{invoice.approvedBy?.name ?? "-"}</dd>
                <dd className="text-xs text-muted-foreground">
                  {invoice.approvedAt ? formatDateTime(invoice.approvedAt) : "-"}
                </dd>
              </div>
              <div className="pt-3 border-t border-border/60">
                <dt className="text-xs text-muted-foreground">Dibayar Pada</dt>
                <dd className="font-medium mt-0.5">
                  {invoice.paidAt ? formatDate(invoice.paidAt) : "-"}
                </dd>
              </div>
            </dl>
          </SectionCard>

          {/* Related invoices */}
          {related.length > 0 && (
            <SectionCard title="Invois Berkaitan" description={`Invois lain dalam ${invoice.project?.projectName ?? "projek ini"}.`}>
              <ul className="space-y-2">
                {related.map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() => navigate("invoice-detail", { id: r.id })}
                      className="w-full flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-accent/40 transition-colors text-left"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-medium truncate">{r.invoiceNo}</p>
                        <p className="text-xs text-muted-foreground truncate">{r.vendorName}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-mono font-medium">
                          {formatCurrency(r.amount)}
                        </p>
                        <InvoiceStatusBadge status={r.status} />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Invois</DialogTitle>
            <DialogDescription>
              Sila nyatakan sebab penolakan. Sebab ini akan direkodkan dalam jejak audit dan dimaklumkan kepada pencipta invois.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Contoh: Dokumen sokongan tidak lengkap, jumlah melebihi bajet..."
            value={rejectRemarks}
            onChange={(e) => setRejectRemarks(e.target.value)}
            className="min-h-24"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={actionLoading}>
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectRemarks.trim() || actionLoading}
              onClick={() => {
                handleAction(
                  "Tolak Invois",
                  `/api/invoices/${invoice.id}/reject`,
                  "POST",
                  { remarks: rejectRemarks.trim() },
                  `Invois ${invoice.invoiceNo} telah ditolak.`,
                ).then(() => {
                  setRejectOpen(false)
                  setRejectRemarks("")
                })
              }}
            >
              <XCircle className="size-4" /> Sahkan Tolak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog (optional remarks) */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Luluskan Invois</DialogTitle>
            <DialogDescription>
              Anda boleh tambah ulasan (pilihan). Invois akan dihantar untuk pembayaran.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Ulasan pilihan..."
            value={approveRemarks}
            onChange={(e) => setApproveRemarks(e.target.value)}
            className="min-h-24"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)} disabled={actionLoading}>
              Batal
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={actionLoading}
              onClick={() => {
                handleAction(
                  "Luluskan Invois",
                  `/api/invoices/${invoice.id}/approve`,
                  "POST",
                  approveRemarks.trim() ? { remarks: approveRemarks.trim() } : {},
                  `Invois ${invoice.invoiceNo} diluluskan.`,
                ).then(() => {
                  setApproveOpen(false)
                  setApproveRemarks("")
                })
              }}
            >
              <CheckCircle2 className="size-4" /> Sahkan Lulus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Padam Invois</DialogTitle>
            <DialogDescription>
              Adakah anda pasti mahu memadam invois {invoice.invoiceNo}? Tindakan ini tidak boleh diundur. Hanya invois berstatus draf boleh dipadam.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={actionLoading}>
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={actionLoading}
              onClick={async () => {
                setActionLoading(true)
                try {
                  await api.del(`/api/invoices/${invoice.id}`)
                  toast.success(`Invois ${invoice.invoiceNo} telah dipadam.`)
                  navigate("invoices")
                } catch (e) {
                  const msg = e instanceof ApiError ? e.message : "Gagal memadam invois."
                  toast.error(msg)
                } finally {
                  setActionLoading(false)
                  setDeleteOpen(false)
                }
              }}
            >
              <Trash2 className="size-4" /> Padam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================
// 3. InvoiceFormView — Create/Edit form with validation
// ============================

interface FormState {
  invoiceNo: string
  projectId: string
  vendorName: string
  vendorEmail: string
  amount: string
  invoiceDate: string
  dueDate: string
  status: "draf" | "menunggu_kelulusan"
  remarks: string
  attachmentName: string
}

type FormErrors = Partial<Record<keyof FormState, string>>

const EMPTY_FORM: FormState = {
  invoiceNo: "",
  projectId: "",
  vendorName: "",
  vendorEmail: "",
  amount: "",
  invoiceDate: toYMD(new Date()),
  dueDate: "",
  status: "draf",
  remarks: "",
  attachmentName: "",
}

export function InvoiceFormView() {
  const params = useViewStore((s) => s.params)
  const navigate = useViewStore((s) => s.navigate)
  const user = useAuthStore((s) => s.user)

  const editId = params.id
  const isEdit = Boolean(editId)

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [loadingInvoice, setLoadingInvoice] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)

  // Fetch projects for dropdown
  useEffect(() => {
    api
      .get<ProjectsResponse>("/api/projects")
      .then((res) => setProjects(res.data))
      .catch((e) => {
        const msg = e instanceof ApiError ? e.message : "Gagal memuatkan senarai projek."
        toast.error(msg)
      })
      .finally(() => setLoadingProjects(false))
  }, [])

  // If edit, load existing invoice
  useEffect(() => {
    if (!editId) return
    api
      .get<InvoiceDetailResponse>(`/api/invoices/${editId}`)
      .then((res) => {
        const inv = res.data
        setForm({
          invoiceNo: inv.invoiceNo,
          projectId: inv.projectId,
          vendorName: inv.vendorName,
          vendorEmail: inv.vendorEmail ?? "",
          amount: String(inv.amount),
          invoiceDate: toYMD(inv.invoiceDate),
          dueDate: toYMD(inv.dueDate),
          status:
            inv.status === "menunggu_kelulusan" ? "menunggu_kelulusan" : "draf",
          remarks: inv.remarks ?? "",
          attachmentName: inv.attachmentName ?? "",
        })
      })
      .catch((e) => {
        const msg = e instanceof ApiError ? e.message : "Gagal memuatkan invois."
        toast.error(msg)
      })
      .finally(() => setLoadingInvoice(false))
  }, [editId])

  // Suggest an invoice number on create mode
  useEffect(() => {
    if (!isEdit && !form.invoiceNo) {
      const year = new Date().getFullYear()
      const random = Math.floor(100 + Math.random() * 900)
      setForm((s) => ({ ...s, invoiceNo: `INV-${year}-${random}` }))
    }
  }, [isEdit, form.invoiceNo])

  // Selected project info (for helper text)
  const selectedProject = projects.find((p) => p.id === form.projectId)

  // Helper to compute current invoiced amount for selected project (excluding current in edit mode)
  const projectInvoicedAmount = useMemo(() => {
    if (!selectedProject) return 0
    return selectedProject._count?.invoices ?? 0
  }, [selectedProject])

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((s) => ({ ...s, [key]: value }))
    setErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const validate = (): boolean => {
    const e: FormErrors = {}

    if (!form.invoiceNo.trim()) e.invoiceNo = "No. invois diperlukan."
    if (!form.projectId) e.projectId = "Projek diperlukan."
    if (!form.vendorName.trim()) e.vendorName = "Nama vendor diperlukan"
    if (form.vendorEmail.trim()) {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.vendorEmail.trim())
      if (!emailOk) e.vendorEmail = "Format e-mel tidak sah."
    }
    const amountNum = parseFloat(form.amount)
    if (!form.amount.trim() || Number.isNaN(amountNum)) {
      e.amount = "Jumlah diperlukan."
    } else if (amountNum <= 0) {
      e.amount = "Jumlah mesti lebih besar daripada 0."
    }
    if (!form.invoiceDate) e.invoiceDate = "Tarikh invois diperlukan."
    if (!form.dueDate) e.dueDate = "Tarikh matang diperlukan."
    else if (form.invoiceDate && new Date(form.dueDate) < new Date(form.invoiceDate)) {
      e.dueDate = "Tarikh matang mesti sama atau selepas tarikh invois."
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const buildPayload = (overrideStatus?: "draf" | "menunggu_kelulusan") => {
    const amount = parseFloat(form.amount)
    return {
      invoiceNo: form.invoiceNo.trim(),
      projectId: form.projectId,
      vendorName: form.vendorName.trim(),
      vendorEmail: form.vendorEmail.trim() || null,
      amount,
      invoiceDate: form.invoiceDate,
      dueDate: form.dueDate,
      status: overrideStatus ?? form.status,
      remarks: form.remarks.trim() || null,
      attachmentName: form.attachmentName.trim() || null,
      attachmentUrl: form.attachmentName.trim()
        ? `/invoices/uploaded-${encodeURIComponent(form.attachmentName.trim())}`
        : null,
    }
  }

  const handleSubmit = async (
    e: React.FormEvent | React.MouseEvent,
    overrideStatus?: "draf" | "menunggu_kelulusan",
  ) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault()
    if (!validate()) {
      toast.error("Sila betulkan medan yang tidak sah.")
      return
    }
    setSubmitting(true)
    try {
      if (isEdit && editId) {
        // PUT — for locked statuses, only remarks/attachment editable (backend enforces)
        const body = buildPayload(overrideStatus)
        await api.put<{ ok: true; data: Invoice }>(`/api/invoices/${editId}`, body)
        toast.success("Invois berjaya dikemas kini.")
        navigate("invoice-detail", { id: editId })
      } else {
        const body = buildPayload(overrideStatus)
        const created = await api.post<{ ok: true; data: Invoice }>(
          "/api/invoices",
          body,
        )
        toast.success("Invois berjaya dicipta.")
        navigate("invoice-detail", { id: created.data.id })
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Ralat ketika menyimpan invois."
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingProjects || loadingInvoice) {
    return <LoadingState label={isEdit ? "Memuatkan invois..." : "Memuatkan projek..."} />
  }

  const inputCls = (field: keyof FormState) =>
    `glass-input ${errors[field] ? "border-destructive focus-visible:border-destructive" : ""}`

  return (
    <div className="space-y-5 animate-fade-in-up max-w-4xl">
      <Button variant="ghost" onClick={() => navigate("invoices")} className="mb-1">
        <ChevronLeft className="size-4" /> Kembali ke Senarai Invois
      </Button>

      <PageHeader
        title={isEdit ? `Edit Invois · ${form.invoiceNo}` : "Cipta Invois Baharu"}
        description={
          isEdit
            ? "Kemas kini butiran invois. Medan teras hanya boleh diubah untuk invois berstatus Draf / Menunggu Kelulusan."
            : "Lengkapkan borang di bawah untuk mencipta invois baharu."
        }
      />

      <form onSubmit={(e) => handleSubmit(e)} className="space-y-5">
        {/* Section: Butiran Utama */}
        <SectionCard
          title="Butiran Utama"
          description="Maklumat asas invois."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* No. Invois */}
            <div className="space-y-1.5">
              <Label htmlFor="invoiceNo">
                No. Invois <span className="text-destructive">*</span>
              </Label>
              <Input
                id="invoiceNo"
                value={form.invoiceNo}
                onChange={(e) => setField("invoiceNo", e.target.value)}
                placeholder="INV-2026-001"
                disabled={isEdit}
                className={`font-mono ${inputCls("invoiceNo")}`}
              />
              {errors.invoiceNo ? (
                <p className="text-xs text-destructive">{errors.invoiceNo}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Format dicadang: INV-YYYY-XXX. {isEdit ? "Tidak boleh diubah." : ""}
                </p>
              )}
            </div>

            {/* Projek */}
            <div className="space-y-1.5">
              <Label htmlFor="projectId">
                Projek <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.projectId}
                onValueChange={(v) => setField("projectId", v)}
                disabled={isEdit}
              >
                <SelectTrigger className={inputCls("projectId")}>
                  <SelectValue placeholder="Pilih projek..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.projectName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.projectId && (
                <p className="text-xs text-destructive">{errors.projectId}</p>
              )}
              {selectedProject && (
                <p className="text-xs text-muted-foreground">
                  Bajet projek: {formatCurrency(selectedProject.budget)}
                  {" · "}
                  {projectInvoicedAmount} invois direkodkan
                </p>
              )}
            </div>
          </div>
        </SectionCard>

        {/* Section: Vendor */}
        <SectionCard title="Maklumat Vendor" description="Butiran vendor pembekal.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="vendorName">
                Nama Vendor <span className="text-destructive">*</span>
              </Label>
              <Input
                id="vendorName"
                value={form.vendorName}
                onChange={(e) => setField("vendorName", e.target.value)}
                placeholder="Sdn. Bhd."
                className={inputCls("vendorName")}
              />
              {errors.vendorName && (
                <p className="text-xs text-destructive">{errors.vendorName}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vendorEmail">E-mel Vendor</Label>
              <Input
                id="vendorEmail"
                type="email"
                value={form.vendorEmail}
                onChange={(e) => setField("vendorEmail", e.target.value)}
                placeholder="vendor@example.com"
                className={inputCls("vendorEmail")}
              />
              {errors.vendorEmail ? (
                <p className="text-xs text-destructive">{errors.vendorEmail}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Pilihan.</p>
              )}
            </div>
          </div>
        </SectionCard>

        {/* Section: Kewangan & Tarikh */}
        <SectionCard
          title="Kewangan & Tarikh"
          description="Jumlah bayaran dan tarikh penting."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="amount">
                Jumlah (RM) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setField("amount", e.target.value)}
                placeholder="0.00"
                className={`font-mono ${inputCls("amount")}`}
              />
              {errors.amount ? (
                <p className="text-xs text-destructive">{errors.amount}</p>
              ) : (
                form.amount.trim() && !Number.isNaN(parseFloat(form.amount)) ? (
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    Pratonton: {formatCurrency(parseFloat(form.amount))}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Mesti lebih besar daripada 0.
                  </p>
                )
              )}
            </div>

            {/* Status (only on create) */}
            <div className="space-y-1.5">
              <Label htmlFor="status">Status Permulaan</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setField("status", v as "draf" | "menunggu_kelulusan")}
                disabled={isEdit}
              >
                <SelectTrigger className={inputCls("status")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draf">Draf</SelectItem>
                  <SelectItem value="menunggu_kelulusan">Menunggu Kelulusan</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {isEdit
                  ? "Status dikawal oleh aliran kerja kelulusan. Ubah pada halaman butiran."
                  : "Pilih 'Draf' untuk simpan sebagai draf atau 'Menunggu Kelulusan' untuk terus hantar."}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invoiceDate">
                Tarikh Invois <span className="text-destructive">*</span>
              </Label>
              <Input
                id="invoiceDate"
                type="date"
                value={form.invoiceDate}
                onChange={(e) => setField("invoiceDate", e.target.value)}
                className={inputCls("invoiceDate")}
              />
              {errors.invoiceDate && (
                <p className="text-xs text-destructive">{errors.invoiceDate}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dueDate">
                Tarikh Matang <span className="text-destructive">*</span>
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={form.dueDate}
                min={form.invoiceDate || undefined}
                onChange={(e) => setField("dueDate", e.target.value)}
                className={inputCls("dueDate")}
              />
              {errors.dueDate ? (
                <p className="text-xs text-destructive">{errors.dueDate}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Tarikh matang mestilah sama atau selepas tarikh invois.
                </p>
              )}
            </div>
          </div>
        </SectionCard>

        {/* Section: Catatan & Dokumen */}
        <SectionCard
          title="Catatan & Dokumen Sokongan"
          description="Maklumat tambahan untuk invois."
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="remarks">Catatan / Ulasan</Label>
              <Textarea
                id="remarks"
                value={form.remarks}
                onChange={(e) => setField("remarks", e.target.value)}
                placeholder="Tambah catatan untuk pengkaji / pelulus..."
                className={inputCls("remarks")}
              />
              <p className="text-xs text-muted-foreground">Pilihan.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="attachment">Dokumen Sokongan</Label>
              <Input
                id="attachment"
                type="file"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) setField("attachmentName", f.name)
                }}
                className={inputCls("attachmentName")}
              />
              {form.attachmentName && (
                <div className="flex items-center gap-2 mt-2 p-2 rounded-lg border border-border/60 bg-muted/30">
                  <FileText className="size-4 text-primary shrink-0" />
                  <span className="text-sm truncate">{form.attachmentName}</span>
                  <button
                    type="button"
                    onClick={() => setField("attachmentName", "")}
                    className="ml-auto text-muted-foreground hover:text-destructive"
                    aria-label="Buang fail"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Untuk POC, nama fail sahaja direkodkan (URL placeholder).
              </p>
            </div>
          </div>
        </SectionCard>

        {/* Submit bar */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("invoices")}
            disabled={submitting}
          >
            Batal
          </Button>
          <Button
            type="submit"
            variant="outline"
            disabled={submitting}
            onClick={(e) => {
              e.preventDefault()
              handleSubmit(e, "draf")
            }}
          >
            {submitting ? (
              <>
                <div className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <FileText className="size-4" /> Simpan sebagai Draf
              </>
            )}
          </Button>
          {!isEdit && (
            <Button
              type="button"
              className="btn-brand-gradient"
              disabled={submitting}
              onClick={(e) => handleSubmit(e, "menunggu_kelulusan")}
            >
              {submitting ? (
                <>
                  <div className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Send className="size-4" /> Hantar untuk Kelulusan
                </>
              )}
            </Button>
          )}
          {isEdit && (
            <Button
              type="button"
              className="btn-brand-gradient"
              disabled={submitting}
              onClick={(e) => handleSubmit(e)}
            >
              {submitting ? (
                <>
                  <div className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <FileCheck2 className="size-4" /> Simpan Perubahan
                </>
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
