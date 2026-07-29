"use client"

import { useState, useEffect } from "react"
import { useAuthStore } from "@/lib/auth-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { GraduationCap, Shield, AlertCircle, Loader2, Lock, Mail, Sparkles } from "lucide-react"
import { toast } from "sonner"

const DEMO_ACCOUNTS = [
  { label: "Pentadbir Sistem", email: "admin@perkeso.gov.my", password: "admin123", role: "admin", color: "from-violet-500/20 to-fuchsia-500/20" },
  { label: "Pengurus Projek", email: "pm@perkeso.gov.my", password: "pm123", role: "pm", color: "from-emerald-500/20 to-teal-500/20" },
  { label: "Pentadbir Projek", email: "padmin@perkeso.gov.my", password: "padmin123", role: "padmin", color: "from-amber-500/20 to-orange-500/20" },
  { label: "Peserta Latihan", email: "staff1@perkeso.gov.my", password: "staff123", role: "trainee", color: "from-sky-500/20 to-cyan-500/20" },
  { label: "Pengurusan Atasan", email: "upper@perkeso.gov.my", password: "upper123", role: "upper", color: "from-rose-500/20 to-pink-500/20" },
]

export function LoginPage() {
  const login = useAuthStore((s) => s.login)
  const error = useAuthStore((s) => s.error)
  const [email, setEmail] = useState("admin@perkeso.gov.my")
  const [password, setPassword] = useState("admin123")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const ok = await login(email, password)
    setSubmitting(false)
    if (ok) {
      toast.success("Selamat datang ke LMS-ITS PERKESO!")
    }
  }

  const fillDemo = (acc: typeof DEMO_ACCOUNTS[number]) => {
    setEmail(acc.email)
    setPassword(acc.password)
  }

  return (
    <div className="app-bg min-h-screen w-full flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-5xl grid lg:grid-cols-[1.1fr_1fr] gap-6 lg:gap-10 items-center">
        {/* Left: Brand panel */}
        <div className="hidden lg:flex flex-col justify-center p-8 text-foreground">
          <div className="flex items-center gap-3 mb-6">
            <div className="size-14 rounded-2xl glass-strong flex items-center justify-center">
              <Shield className="size-8 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold tracking-widest text-primary uppercase">PERKESO</p>
              <p className="text-sm text-muted-foreground">Unit Pengurusan Projek</p>
            </div>
          </div>
          <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-4">
            Sistem Pengurusan <br />
            Pembelajaran <span className="text-gradient">&amp;</span> Penjejakan Invois
          </h1>
          <p className="text-muted-foreground text-base mb-8 max-w-md">
            Platform bersepadu untuk pengurusan latihan kakitangan dan penjejakan pembayaran invois
            projek PERKESO. Direka untuk pasukan Pengurusan Projek &amp; Pentadbiran Projek.
          </p>

          <div className="grid grid-cols-2 gap-3 max-w-md">
            <FeatureCard icon={<GraduationCap className="size-5" />} title="Modul LMS" desc="Kursus, kuiz & sijil" />
            <FeatureCard icon={<Shield className="size-5" />} title="Modul Invois" desc="Kelulusan & audit trail" />
            <FeatureCard icon={<Sparkles className="size-5" />} title="Papan Pemuka" desc="Pemantauan real-time" />
            <FeatureCard icon={<Mail className="size-5" />} title="Notifikasi" desc="Peringatan automatik" />
          </div>
        </div>

        {/* Right: Login card */}
        <div className="w-full">
          <Card className="glass-strong rounded-2xl border-border/60">
            <CardHeader className="space-y-3 pb-2">
              <div className="lg:hidden flex items-center gap-3 mb-2">
                <div className="size-12 rounded-xl glass flex items-center justify-center">
                  <Shield className="size-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-wider text-primary uppercase">PERKESO PMU</p>
                  <p className="text-xs text-muted-foreground">LMS-ITS</p>
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">Log Masuk Sistem</CardTitle>
              <CardDescription>
                Sila log masuk menggunakan e-mel &amp; kata laluan PERKESO anda.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mel</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@perkeso.gov.my"
                      required
                      className="glass-input pl-9"
                      autoComplete="email"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Kata Laluan</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="glass-input pl-9"
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
                    <AlertCircle className="size-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="btn-brand-gradient w-full h-11 rounded-xl font-medium"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Sedang log masuk...
                    </>
                  ) : (
                    "Log Masuk"
                  )}
                </Button>
              </form>

              <div className="pt-2 border-t border-border/50">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Akaun demo (klik untuk autosi):
                </p>
                <div className="grid gap-1.5">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => fillDemo(acc)}
                      className={`group flex items-center justify-between rounded-lg px-3 py-2 text-left bg-gradient-to-r ${acc.color} hover:ring-1 hover:ring-primary/30 transition`}
                    >
                      <div>
                        <p className="text-xs font-semibold">{acc.label}</p>
                        <p className="text-[11px] text-muted-foreground">{acc.email}</p>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground/80 group-hover:text-foreground">
                        {acc.password}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          <p className="text-center text-xs text-muted-foreground mt-4">
            © 2026 PERKESO · Unit Pengurusan Projek · v1.0 (POC)
          </p>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="glass rounded-xl p-3 flex items-start gap-2.5">
      <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold">{title}</p>
        <p className="text-[11px] text-muted-foreground">{desc}</p>
      </div>
    </div>
  )
}
