"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api-client"
import { useAuthStore, useViewStore } from "@/lib/auth-store"
import { StatCard, SectionCard, InvoiceStatusBadge, EnrollmentStatusBadge, PageHeader, EmptyState, getInitials } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  BookOpen, Receipt, Wallet, AlertTriangle, Clock, CheckCircle2, TrendingUp,
  Users, FolderKanban, GraduationCap, Award, ArrowRight, Calendar,
  Activity, Briefcase, BarChart3, type LucideIcon,
} from "lucide-react"
import { formatCurrency, formatDate, formatDateTime, ROLE_LABELS, type InvoiceStatus } from "@/lib/types"
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, AreaChart, Area, Legend, LineChart, Line,
} from "recharts"

interface DashboardData {
  role: string
  // common
  totalBudget?: number
  totalInvoiced?: number
  totalPaid?: number
  totalPending?: number
  totalOverdue?: number
  totalDraft?: number
  totalRejected?: number
  invoiceCountByStatus?: Record<string, number>
  invoicesByMonth?: { month: string; count: number; totalAmount: number; paidAmount: number }[]
  invoicesByStatus?: Record<string, number>
  projectsByStatus?: Record<string, number>
  courseCompletionRate?: number
  // admin
  totalUsers?: number
  usersByRole?: Record<string, number>
  totalCourses?: number
  totalProjects?: number
  recentInvoices?: any[]
  recentUsers?: any[]
  // PM
  pendingApprovals?: number
  overdueInvoices?: number
  managedProjects?: number
  recentApprovals?: any[]
  teamTraining?: any[]
  // PA
  managedCourses?: number
  pendingInvoices?: number
  // trainee
  myEnrollments?: { count: number; byStatus: Record<string, number> }
  myCertificates?: number
  availableCourses?: number
  recentActivity?: any[]
}

export function DashboardView() {
  const user = useAuthStore((s) => s.user)
  const navigate = useViewStore((s) => s.navigate)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<DashboardData>("/api/reports/dashboard")
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        <div className="size-5 rounded-full border-2 border-primary border-t-transparent animate-spin mr-3" />
        Memuat papan pemuka...
      </div>
    )
  }

  if (!data) {
    return <EmptyState icon={BarChart3} title="Tidak dapat memuat papan pemuka" description="Sila log masuk semula." />
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Selamat datang, ${user?.name?.split(" ")[0] || ""}!`}
        description={user ? `${ROLE_LABELS[user.role]} · ${user.department} · ${formatDate(new Date())}` : ""}
      >
        {user?.role === "admin" || user?.role === "project_admin" ? (
          <Button onClick={() => navigate("invoice-form")} className="btn-brand-gradient">
            <Receipt className="size-4 mr-1.5" /> Invois Baharu
          </Button>
        ) : null}
        {user?.role === "trainee" ? (
          <Button onClick={() => navigate("courses")} className="btn-brand-gradient">
            <GraduationCap className="size-4 mr-1.5" /> Terokai Kursus
          </Button>
        ) : null}
      </PageHeader>

      {/* Role-specific dashboard content */}
      {user?.role === "trainee" && <TraineeDashboard data={data} />}
      {user?.role === "project_admin" && <ProjectAdminDashboard data={data} />}
      {user?.role === "project_manager" && <PMDashboard data={data} />}
      {user?.role === "admin" && <AdminDashboard data={data} />}
      {user?.role === "upper_management" && <UpperDashboard data={data} />}
    </div>
  )
}

// ============================
// Trainee dashboard
// ============================
function TraineeDashboard({ data }: { data: DashboardData }) {
  const navigate = useViewStore((s) => s.navigate)
  const byStatus = data.myEnrollments?.byStatus || {}
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Kursus Saya" value={data.myEnrollments?.count ?? 0} icon={BookOpen} tone="primary" sublabel="Jumlah pendaftaran" />
        <StatCard label="Dalam Proses" value={byStatus["dalam_proses"] ?? 0} icon={Activity} tone="amber" sublabel="Sedang dipelajari" />
        <StatCard label="Selesai" value={byStatus["selesai"] ?? 0} icon={CheckCircle2} tone="emerald" sublabel="Kursus tamat" />
        <StatCard label="Sijil" value={data.myCertificates ?? 0} icon={Award} tone="violet" sublabel="Sijil diperoleh" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-5">
        <SectionCard
          title="Aktiviti Pembelajaran Terkini"
          description="Kursus yang anda sedang ikuti"
          className="lg:col-span-2"
          action={<Button variant="ghost" size="sm" onClick={() => navigate("my-learning")}>Lihat semua <ArrowRight className="size-4 ml-1" /></Button>}
        >
          <div className="px-5 pb-4 space-y-2">
            {(data.recentActivity || []).length === 0 ? (
              <EmptyState icon={BookOpen} title="Tiada aktiviti" description="Mula daftar kursus untuk melihat kemajuan anda." />
            ) : (
              data.recentActivity!.map((en: any) => (
                <div
                  key={en.id}
                  onClick={() => navigate("course-detail", { id: en.courseId })}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/40 transition cursor-pointer"
                >
                  <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <BookOpen className="size-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{en.course?.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={en.progress} className="h-1.5 flex-1 max-w-32" />
                      <span className="text-xs text-muted-foreground">{en.progress}%</span>
                    </div>
                  </div>
                  <EnrollmentStatusBadgeMini status={en.status} />
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard title="Sijil Saya" description={`${data.myCertificates ?? 0} sijil diperoleh`}>
          <div className="px-5 pb-5">
            {data.myCertificates && data.myCertificates > 0 ? (
              <div className="text-center py-6">
                <div className="size-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center mx-auto mb-3">
                  <Award className="size-8 text-violet-500" />
                </div>
                <p className="text-2xl font-bold">{data.myCertificates}</p>
                <p className="text-xs text-muted-foreground">Sijil pembelajaran</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("my-learning")}>
                  Lihat sijil
                </Button>
              </div>
            ) : (
              <EmptyState icon={Award} title="Tiada sijil lagi" description="Selesaikan kursus untuk mendapatkan sijil." />
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Kursus Tersedia" description={`${data.availableCourses ?? 0} kursus baharu menanti anda`} className="mt-5">
        <div className="px-5 pb-5">
          <Button onClick={() => navigate("courses")} className="btn-brand-gradient w-full">
            <GraduationCap className="size-4 mr-2" /> Terokai Katalog Kursus
          </Button>
        </div>
      </SectionCard>
    </>
  )
}

// ============================
// Project Admin dashboard
// ============================
function ProjectAdminDashboard({ data }: { data: DashboardData }) {
  const navigate = useViewStore((s) => s.navigate)
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Kursus Diurus" value={data.managedCourses ?? 0} icon={BookOpen} tone="primary" />
        <StatCard label="Invois Draf / Menunggu" value={data.pendingInvoices ?? 0} icon={Clock} tone="amber" />
        <StatCard label="Jumlah Invois" value={formatCurrency(data.totalInvoiced || 0)} icon={Wallet} tone="emerald" />
        <StatCard label="Projek Aktif" value={data.totalProjects ?? 0} icon={Briefcase} tone="sky" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-5">
        <SectionCard title="Invois Terkini yang Dicipta" description="Invois yang anda kemas kini">
          <div className="px-5 pb-4 space-y-2">
            {(data.recentInvoices || []).length === 0 ? (
              <EmptyState icon={Receipt} title="Tiada invois" />
            ) : (
              data.recentInvoices!.slice(0, 5).map((inv: any) => (
                <div
                  key={inv.id}
                  onClick={() => navigate("invoice-detail", { id: inv.id })}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-muted/40 transition cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium font-mono">{inv.invoiceNo}</p>
                    <p className="text-xs text-muted-foreground truncate">{inv.vendorName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(inv.amount)}</p>
                    <InvoiceStatusBadge status={inv.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard title="Tindakan Pantas" description="Akses laju ke operasi biasa">
          <div className="px-5 pb-5 grid grid-cols-2 gap-3">
            <QuickActionCard icon={Receipt} label="Cipta Invois" onClick={() => navigate("invoice-form")} />
            <QuickActionCard icon={FolderKanban} label="Pengurusan Projek" onClick={() => navigate("projects")} />
            <QuickActionCard icon={GraduationCap} label="Tambah Kursus" onClick={() => navigate("courses")} />
            <QuickActionCard icon={BarChart3} label="Laporan" onClick={() => navigate("reports")} />
          </div>
        </SectionCard>
      </div>
    </>
  )
}

// ============================
// Project Manager dashboard
// ============================
function PMDashboard({ data }: { data: DashboardData }) {
  const navigate = useViewStore((s) => s.navigate)
  const byStatus = data.invoicesByStatus || {}
  const pieData = Object.entries(byStatus).map(([status, count]) => ({ name: status, value: count as number }))
  const PIE_COLORS = ["#94a3b8", "#f59e0b", "#0ea5e9", "#10b981", "#f43f5e", "#dc2626"]

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Menunggu Kelulusan" value={data.pendingApprovals ?? 0} icon={Clock} tone="amber" sublabel="Tindakan diperlukan" />
        <StatCard label="Invois Tertunggak" value={data.overdueInvoices ?? 0} icon={AlertTriangle} tone="rose" sublabel="Melebihi tarikh matang" />
        <StatCard label="Jumlah Invois" value={formatCurrency(data.totalInvoiced || 0)} icon={Wallet} tone="primary" />
        <StatCard label="Projek Diurus" value={data.managedProjects ?? 0} icon={FolderKanban} tone="sky" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
        <StatCard label="Jumlah Dibayar" value={formatCurrency(data.totalPaid || 0)} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Jumlah Tertunggak" value={formatCurrency(data.totalOverdue || 0)} icon={AlertTriangle} tone="rose" />
        <StatCard label="Menunggu Bayaran" value={formatCurrency(data.totalPending || 0)} icon={Clock} tone="amber" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-5">
        <SectionCard title="Invois Mengikut Status" className="lg:col-span-2">
          <div className="px-5 pb-5 h-72">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--popover)" }}
                    formatter={(v: number) => [`${v} invois`, ""]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyState icon={BarChart3} title="Tiada data" />}
          </div>
        </SectionCard>

        <SectionCard title="Kelulusan Terkini" description="Invois yang anda luluskan">
          <div className="px-5 pb-4 space-y-2">
            {(data.recentApprovals || []).length === 0 ? (
              <EmptyState icon={CheckCircle2} title="Tiada rekod" />
            ) : (
              data.recentApprovals!.slice(0, 5).map((inv: any) => (
                <div key={inv.id} onClick={() => navigate("invoice-detail", { id: inv.id })} className="flex items-center justify-between gap-2 p-2.5 rounded-lg hover:bg-muted/40 transition cursor-pointer">
                  <div className="min-w-0">
                    <p className="text-xs font-medium font-mono truncate">{inv.invoiceNo}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{inv.vendorName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold">{formatCurrency(inv.amount)}</p>
                    <InvoiceStatusBadge status={inv.status} />
                  </div>
                </div>
              ))
            )}
            <Button variant="ghost" size="sm" className="w-full mt-1" onClick={() => navigate("invoices")}>
              Lihat semua invois <ArrowRight className="size-3.5 ml-1" />
            </Button>
          </div>
        </SectionCard>
      </div>
    </>
  )
}

// ============================
// Admin dashboard
// ============================
function AdminDashboard({ data }: { data: DashboardData }) {
  const navigate = useViewStore((s) => s.navigate)
  const byStatus = data.invoiceCountByStatus || {}
  const pieData = Object.entries(byStatus).map(([status, count]) => ({ name: status, value: count as number }))
  const PIE_COLORS = ["#94a3b8", "#f59e0b", "#0ea5e9", "#10b981", "#f43f5e", "#dc2626"]

  const usersByRole = data.usersByRole || {}
  const roleChartData = Object.entries(usersByRole).map(([role, count]) => ({
    role: ROLE_LABELS[role as keyof typeof ROLE_LABELS] || role,
    count: count as number,
  }))

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Jumlah Pengguna" value={data.totalUsers ?? 0} icon={Users} tone="primary" />
        <StatCard label="Kursus Aktif" value={data.totalCourses ?? 0} icon={BookOpen} tone="emerald" />
        <StatCard label="Projek Aktif" value={data.totalProjects ?? 0} icon={FolderKanban} tone="sky" />
        <StatCard label="Jumlah Invois" value={data.totalInvoiced ? data.totalInvoiced.toLocaleString("ms-MY", { style: "currency", currency: "MYR", maximumFractionDigits: 0 }) : "RM 0"} icon={Wallet} tone="amber" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
        <StatCard label="Dibayar" value={formatCurrency(data.totalPaid || 0)} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Tertunggak" value={formatCurrency(data.totalOverdue || 0)} icon={AlertTriangle} tone="rose" />
        <StatCard label="Menunggu Bayaran" value={formatCurrency(data.totalPending || 0)} icon={Clock} tone="amber" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-5">
        <SectionCard title="Pengguna Mengikut Peranan" className="lg:col-span-2">
          <div className="px-5 pb-5 h-72">
            {roleChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roleChartData} margin={{ top: 10, right: 10, bottom: 30, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="role" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--popover)" }} />
                  <Bar dataKey="count" name="Pengguna" fill="var(--primary)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState icon={Users} title="Tiada data" />}
          </div>
        </SectionCard>

        <SectionCard title="Invois Mengikut Status">
          <div className="px-5 pb-5 h-72">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={85} paddingAngle={3}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--popover)" }} formatter={(v: number) => [`${v} invois`, ""]} />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyState icon={BarChart3} title="Tiada data" />}
          </div>
        </SectionCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-5">
        <SectionCard title="Invois Terkini" action={<Button variant="ghost" size="sm" onClick={() => navigate("invoices")}>Lihat semua <ArrowRight className="size-3.5 ml-1" /></Button>}>
          <div className="px-5 pb-4 space-y-2">
            {(data.recentInvoices || []).slice(0, 5).map((inv: any) => (
              <div key={inv.id} onClick={() => navigate("invoice-detail", { id: inv.id })} className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-muted/40 transition cursor-pointer">
                <div className="min-w-0">
                  <p className="text-sm font-medium font-mono truncate">{inv.invoiceNo}</p>
                  <p className="text-xs text-muted-foreground truncate">{inv.vendorName}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">{formatCurrency(inv.amount)}</p>
                  <InvoiceStatusBadge status={inv.status} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Pengguna Terkini" action={<Button variant="ghost" size="sm" onClick={() => navigate("users")}>Lihat semua <ArrowRight className="size-3.5 ml-1" /></Button>}>
          <div className="px-5 pb-4 space-y-2">
            {(data.recentUsers || []).slice(0, 5).map((u: any) => (
              <div key={u.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition">
                <Avatar className="size-9">
                  <AvatarFallback className="bg-primary/15 text-xs font-semibold">{getInitials(u.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <Badge variant="secondary" className="text-[10px]">{ROLE_LABELS[u.role as keyof typeof ROLE_LABELS]}</Badge>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </>
  )
}

// ============================
// Upper management dashboard
// ============================
function UpperDashboard({ data }: { data: DashboardData }) {
  const navigate = useViewStore((s) => s.navigate)
  const monthData = data.invoicesByMonth || []
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Jumlah Bajet Projek" value={formatCurrency(data.totalBudget || 0)} icon={Wallet} tone="primary" />
        <StatCard label="Jumlah Invois" value={formatCurrency(data.totalInvoiced || 0)} icon={Receipt} tone="amber" />
        <StatCard label="Dibayar" value={formatCurrency(data.totalPaid || 0)} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Tertunggak" value={formatCurrency(data.totalOverdue || 0)} icon={AlertTriangle} tone="rose" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
        <StatCard label="Projek Aktif" value={data.projectsByStatus?.["aktif"] ?? 0} icon={FolderKanban} tone="sky" />
        <StatCard label="Projek Selesai" value={data.projectsByStatus?.["selesai"] ?? 0} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Kadar Tamat Kursus" value={`${(data.courseCompletionRate || 0).toFixed(1)}%`} icon={GraduationCap} tone="violet" />
      </div>

      <SectionCard title="Trend Invois 6 Bulan" description="Jumlah invois vs jumlah dibayar setiap bulan" className="mt-5">
        <div className="px-5 pb-5 h-80">
          {monthData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="paidGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--popover)" }} formatter={(v: number) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="totalAmount" name="Jumlah Invois" stroke="var(--chart-1)" fill="url(#totalGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="paidAmount" name="Dibayar" stroke="var(--chart-2)" fill="url(#paidGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyState icon={BarChart3} title="Tiada data" />}
        </div>
      </SectionCard>

      <div className="grid lg:grid-cols-2 gap-4 mt-5">
        <SectionCard title="Status Invois">
          <div className="px-5 pb-5 space-y-2">
            {Object.entries(data.invoicesByStatus || {}).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <InvoiceStatusBadge status={status as InvoiceStatus} />
                <span className="text-sm font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Status Projek">
          <div className="px-5 pb-5 space-y-2">
            {Object.entries(data.projectsByStatus || {}).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <Badge variant="secondary" className="capitalize">{status}</Badge>
                <span className="text-sm font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </>
  )
}

// ============================
// Helpers
// ============================
function EnrollmentStatusBadgeMini({ status }: { status: string }) {
  const cls: Record<string, string> = {
    belum_mula: "bg-muted text-muted-foreground",
    dalam_proses: "bg-amber-500/15 text-amber-600",
    selesai: "bg-emerald-500/15 text-emerald-600",
  }
  const labels: Record<string, string> = { belum_mula: "Belum Mula", dalam_proses: "Dalam Proses", selesai: "Selesai" }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${cls[status] || "bg-muted"}`}>{labels[status] || status}</span>
}

function QuickActionCard({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="glass rounded-xl p-3 flex items-center gap-2.5 hover:ring-1 hover:ring-primary/30 transition text-left">
      <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
        <Icon className="size-4" />
      </div>
      <span className="text-xs font-medium">{label}</span>
    </button>
  )
}
