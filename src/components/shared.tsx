"use client"

import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"
import { ReactNode } from "react"
import { INVOICE_STATUS_CLASS, INVOICE_STATUS_LABELS, ENROLLMENT_STATUS_LABELS, PROJECT_STATUS_LABELS, type InvoiceStatus, type EnrollmentStatus, type ProjectStatus } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"

// ============================
// Stat card
// ============================
export function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  tone = "primary",
  trend,
}: {
  label: string
  value: ReactNode
  sublabel?: string
  icon: LucideIcon
  tone?: "primary" | "emerald" | "amber" | "rose" | "violet" | "sky"
  trend?: { value: string; direction: "up" | "down" | "neutral" }
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary/12 text-primary",
    emerald: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
    rose: "bg-rose-500/12 text-rose-600 dark:text-rose-400",
    violet: "bg-violet-500/12 text-violet-600 dark:text-violet-400",
    sky: "bg-sky-500/12 text-sky-600 dark:text-sky-400",
  }
  return (
    <Card className="glass rounded-2xl p-5 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold mt-2 leading-tight truncate">{value}</p>
          {sublabel && <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>}
          {trend && (
            <div
              className={cn(
                "inline-flex items-center gap-1 text-xs font-medium mt-2 px-1.5 py-0.5 rounded",
                trend.direction === "up" && "bg-emerald-500/12 text-emerald-600",
                trend.direction === "down" && "bg-rose-500/12 text-rose-600",
                trend.direction === "neutral" && "bg-muted text-muted-foreground",
              )}
            >
              {trend.direction === "up" && <ArrowUpRight className="size-3" />}
              {trend.direction === "down" && <ArrowDownRight className="size-3" />}
              {trend.value}
            </div>
          )}
        </div>
        <div className={cn("size-11 rounded-xl flex items-center justify-center shrink-0", tones[tone])}>
          <Icon className="size-5" />
        </div>
      </div>
    </Card>
  )
}

// ============================
// Section card (with header)
// ============================
export function SectionCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={cn("glass rounded-2xl", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 p-5 pb-3">
          <div>
            {title && <p className="font-semibold">{title}</p>}
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={cn(!title && !action && "p-5")}>{children}</div>
    </Card>
  )
}

// ============================
// Status badge
// ============================
export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
        INVOICE_STATUS_CLASS[status],
      )}
    >
      {INVOICE_STATUS_LABELS[status]}
    </span>
  )
}

export function EnrollmentStatusBadge({ status }: { status: EnrollmentStatus }) {
  const cls: Record<EnrollmentStatus, string> = {
    belum_mula: "bg-muted text-muted-foreground",
    dalam_proses: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    selesai: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  }
  return (
    <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium", cls[status])}>
      {ENROLLMENT_STATUS_LABELS[status]}
    </span>
  )
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const cls: Record<ProjectStatus, string> = {
    aktif: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    selesai: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    ditangguh: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    dibatalkan: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  }
  return (
    <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium", cls[status])}>
      {PROJECT_STATUS_LABELS[status]}
    </span>
  )
}

// ============================
// Page header
// ============================
export function PageHeader({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </div>
  )
}

// ============================
// Empty state
// ============================
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="size-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
        <Icon className="size-7 text-muted-foreground" />
      </div>
      <p className="font-medium">{title}</p>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ============================
// Loading state
// ============================
export function LoadingState({ label = "Memuat data..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
      <div className="size-5 rounded-full border-2 border-primary border-t-transparent animate-spin mr-3" />
      {label}
    </div>
  )
}

// ============================
// Avatar fallback initials
// ============================
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}
