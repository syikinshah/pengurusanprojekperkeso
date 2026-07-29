"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  FileText,
  PlayCircle,
  Presentation,
  File,
  Link as LinkIcon,
  type LucideIcon,
} from "lucide-react"

// ============================
// Course category badge (color-coded)
// ============================
const CATEGORY_TONES: Record<string, string> = {
  Teknikal: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  Pengurusan: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  Kewangan: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  Teknologi: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  Umum: "bg-muted text-muted-foreground",
}

export function CategoryBadge({ category }: { category: string }) {
  const tone = CATEGORY_TONES[category] || CATEGORY_TONES["Umum"]
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
        tone,
      )}
    >
      {category}
    </span>
  )
}

// ============================
// Course level badge (color-coded)
// ============================
const LEVEL_TONES: Record<string, string> = {
  Asas: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  Pertengahan: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  Lanjutan: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
}

export function LevelBadge({ level }: { level: string }) {
  const tone = LEVEL_TONES[level] || "bg-muted text-muted-foreground"
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
        tone,
      )}
    >
      {level}
    </span>
  )
}

// ============================
// Material type icon helper
// ============================
export const MATERIAL_ICON: Record<string, LucideIcon> = {
  pdf: FileText,
  video: PlayCircle,
  slide: Presentation,
  document: File,
  link: LinkIcon,
}

export const MATERIAL_TYPE_LABEL: Record<string, string> = {
  pdf: "PDF",
  video: "Video",
  slide: "Slaid",
  document: "Dokumen",
  link: "Pautan",
}

export const MATERIAL_TYPE_TONE: Record<string, string> = {
  pdf: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  video: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  slide: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  document: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  link: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
}

export function MaterialTypeBadge({ type }: { type: string }) {
  const tone = MATERIAL_TYPE_TONE[type] || "bg-muted text-muted-foreground"
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide",
        tone,
      )}
    >
      {MATERIAL_TYPE_LABEL[type] || type}
    </span>
  )
}

// ============================
// Course list category + level option arrays
// ============================
export const CATEGORIES = ["Teknikal", "Pengurusan", "Kewangan", "Teknologi", "Umum"] as const
export const LEVELS = ["Asas", "Pertengahan", "Lanjutan"] as const
export const MATERIAL_TYPES = ["pdf", "video", "slide", "link", "document"] as const

// ============================
// Course status badge (Aktif / Tidak Aktif / Draf)
// ============================
const STATUS_TONES: Record<string, string> = {
  aktif: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  tidak_aktif: "bg-muted text-muted-foreground",
  draf: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
}

export function CourseStatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONES[status] || "bg-muted text-muted-foreground"
  const labels: Record<string, string> = {
    aktif: "Aktif",
    tidak_aktif: "Tidak Aktif",
    draf: "Draf",
  }
  return (
    <Badge
      variant="outline"
      className={cn("border-0 font-medium", tone)}
    >
      {labels[status] || status}
    </Badge>
  )
}

// ============================
// Format duration (hours / minutes) for course and material
// ============================
export function formatCourseDuration(hours: number): string {
  if (!hours || hours <= 0) return "-"
  return `${hours} jam`
}

export function formatMaterialDuration(minutes?: number | null): string {
  if (!minutes || minutes <= 0) return "-"
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}j ${m}m` : `${h} jam`
}
