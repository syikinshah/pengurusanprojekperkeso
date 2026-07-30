"use client"

import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import { api } from "@/lib/api-client"
import { useViewStore } from "@/lib/auth-store"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Award,
  ShieldCheck,
  Printer,
  Download,
  GraduationCap,
  Sparkles,
  Loader2,
} from "lucide-react"
import { formatDate } from "@/lib/types"
import type { Course, User } from "@/lib/types"

interface CertificateData {
  certificateId: string
  issuedAt: string
  certificateUrl: string
  enrollment: {
    id: string
    progress: number
    status: string
    enrolledAt: string
    completedAt: string | null
  }
  course: Pick<
    Course,
    "id" | "title" | "description" | "category" | "level" | "duration" | "instructor"
  > & { creator?: { id: string; name: string } }
  user: Pick<User, "id" | "name" | "email" | "role" | "department" | "position">
}

export function CertificateView() {
  const params = useViewStore((s) => s.params)
  const navigate = useViewStore((s) => s.navigate)
  const enrollmentId = params.id

  const [cert, setCert] = useState<CertificateData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const load = useCallback(async () => {
    if (!enrollmentId) return
    setLoading(true)
    try {
      const res = await api.get<{ ok: boolean; certificate: CertificateData }>(
        `/api/certificate/${enrollmentId}`,
      )
      setCert(res.certificate)
      setNotFound(false)
    } catch (e: unknown) {
      // 403/404 -> show empty state
      setNotFound(true)
      // suppress toast spam - just visual empty state
    } finally {
      setLoading(false)
    }
  }, [enrollmentId])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-3 text-primary" />
        Memuat sijil...
      </div>
    )
  }

  if (notFound || !cert) {
    return (
      <div className="space-y-4 animate-fade-in-up">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("my-learning")}
          className="-ml-2"
        >
          <ArrowLeft className="size-4 mr-1.5" /> Kembali ke Pembelajaran Saya
        </Button>
        <Card className="glass rounded-2xl p-12 text-center max-w-2xl mx-auto">
          <div className="size-16 rounded-2xl bg-amber-500/12 flex items-center justify-center mx-auto mb-4">
            <Award className="size-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-semibold">Sijil Tidak Tersedia</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Sijil ini belum dikeluarkan. Sila lengkapkan kursus ini terlebih
            dahulu untuk menerima sijil penyempurnaan.
          </p>
          <Button
            onClick={() => navigate("my-learning")}
            className="btn-brand-gradient mt-5"
          >
            <GraduationCap className="size-4 mr-1.5" /> Ke Pembelajaran Saya
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("my-learning")}
          className="-ml-2"
        >
          <ArrowLeft className="size-4 mr-1.5" /> Kembali ke Pembelajaran Saya
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="size-4 mr-1.5" /> Cetak
          </Button>
          <Button
            size="sm"
            className="btn-brand-gradient"
            onClick={() => {
              toast.info("Memuat turun sijil...", {
                description: cert.certificateUrl,
              })
              // POC: just toast since certificate URL is a placeholder
              // In production this would trigger a PDF download.
              setTimeout(() => {
                window.print()
              }, 400)
            }}
          >
            <Download className="size-4 mr-1.5" /> Muat Turun
          </Button>
        </div>
      </div>

      {/* Certificate canvas */}
      <CertificateCanvas cert={cert} />
    </div>
  )
}

// ============================
// Certificate canvas
// ============================
function CertificateCanvas({ cert }: { cert: CertificateData }) {
  const completedDate = cert.enrollment.completedAt || cert.issuedAt
  const certIdShort = cert.certificateId.slice(-8).toUpperCase()

  return (
    <Card className="glass-strong rounded-2xl p-0 overflow-hidden">
      <div className="relative p-8 sm:p-12 lg:p-16">
        {/* Decorative outer frame */}
        <div className="absolute inset-4 sm:inset-6 border-2 border-primary/40 rounded-xl pointer-events-none" />
        <div className="absolute inset-6 sm:inset-8 border border-primary/20 rounded-lg pointer-events-none" />

        {/* Corner accents */}
        <CornerAccents />

        <div className="relative text-center px-2 sm:px-6">
          {/* Brand header */}
          <div className="flex flex-col items-center gap-2 mb-6">
            <div className="size-14 rounded-2xl bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center shadow-lg">
              <ShieldCheck className="size-8 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground">
                PERTUBUHAN KESELAMATAN SOSIAL
              </p>
              <p className="text-[10px] tracking-[0.15em] text-muted-foreground/80 mt-0.5">
                UNIT PENGURUSAN PROJEK · LMS-ITS
              </p>
            </div>
          </div>

          <Separator className="max-w-md mx-auto bg-primary/30" />

          {/* Title */}
          <div className="mt-7 mb-2">
            <div className="inline-flex items-center gap-2 mb-3">
              <Sparkles className="size-4 text-amber-500" />
              <span className="text-xs uppercase tracking-[0.25em] font-semibold text-muted-foreground">
                Sijil Penyempurnaan Kursus
              </span>
              <Sparkles className="size-4 text-amber-500" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gradient">
              CERTIFICATE OF COMPLETION
            </h1>
          </div>

          {/* "This is to certify that" */}
          <p className="text-sm text-muted-foreground mt-6">
            Ini adalah untuk mengesahkan bahawa
          </p>

          {/* Name */}
          <p
            className="mt-3 text-3xl sm:text-4xl font-semibold italic text-foreground"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {cert.user.name}
          </p>

          {/* Department / position */}
          {cert.user.position && (
            <p className="text-xs text-muted-foreground mt-2">
              {cert.user.position}
              {cert.user.department ? ` · ${cert.user.department}` : ""}
            </p>
          )}

          {/* Course title */}
          <p className="text-sm text-muted-foreground mt-7">
            telah berjaya menamatkan kursus latihan
          </p>
          <p className="mt-2 text-xl sm:text-2xl font-bold text-foreground px-2">
            {cert.course.title}
          </p>

          {/* Course meta */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 mt-4 text-xs text-muted-foreground">
            <span>Kategori: <strong className="text-foreground">{cert.course.category}</strong></span>
            <span>Tahap: <strong className="text-foreground">{cert.course.level}</strong></span>
            <span>Tempoh: <strong className="text-foreground">{cert.course.duration} jam</strong></span>
            {cert.course.instructor && (
              <span>Pensyarah: <strong className="text-foreground">{cert.course.instructor}</strong></span>
            )}
          </div>

          {/* Bottom row: signatures + meta */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12 sm:mt-16">
            <div className="text-center">
              <div className="border-t border-foreground/40 pt-2 mx-auto max-w-[200px]">
                <p className="text-sm font-semibold">{formatDate(completedDate)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">
                  Tarikh Penyempurnaan
                </p>
              </div>
            </div>

            <div className="text-center flex flex-col items-center">
              <div className="size-12 rounded-full bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center mb-1.5">
                <Award className="size-6 text-white" />
              </div>
              <p className="text-[10px] font-mono text-muted-foreground">
                {certIdShort}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">
                No. Sijil
              </p>
            </div>

            <div className="text-center">
              <div className="border-t border-foreground/40 pt-2 mx-auto max-w-[200px]">
                <p className="text-sm font-semibold">Mohd Faizal bin Hassan</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">
                  Pengurus Projek · PMU
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <Separator className="max-w-md mx-auto bg-primary/20 mt-10" />
          <p className="text-[10px] text-muted-foreground mt-4 max-w-xl mx-auto leading-relaxed">
            Sijil ini dikeluarkan oleh Unit Pengurusan Projek, Pertubuhan
            Keselamatan Sosial (PERKESO) melalui Sistem Pengurusan Pembelajaran
            & Pengesanan Invois (LMS-ITS). Pengesahan boleh dibuat dengan
            merujuk nombor sijil di atas.
          </p>
        </div>
      </div>
    </Card>
  )
}

// ============================
// Corner accent decorations
// ============================
function CornerAccents() {
  return (
    <>
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 size-8 border-t-2 border-l-2 border-primary/60 rounded-tl-lg pointer-events-none" />
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 size-8 border-t-2 border-r-2 border-primary/60 rounded-tr-lg pointer-events-none" />
      <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 size-8 border-b-2 border-l-2 border-primary/60 rounded-bl-lg pointer-events-none" />
      <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 size-8 border-b-2 border-r-2 border-primary/60 rounded-br-lg pointer-events-none" />
    </>
  )
}
