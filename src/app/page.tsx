"use client"

import { useEffect } from "react"
import { useAuthStore, useViewStore } from "@/lib/auth-store"
import { LoginPage } from "@/components/login-page"
import { AppShell } from "@/components/app-shell"
import { DashboardView } from "@/components/dashboard"
import { CoursesView, CourseDetailView, MyLearningView, QuizView, CertificateView } from "@/components/views/lms-views"
import { InvoicesView, InvoiceDetailView, InvoiceFormView } from "@/components/views/invoice-views"
import { ProjectsView, ProjectDetailView, UsersView, UserFormView, ReportsView, SettingsView } from "@/components/views/admin-views"
import { Loader2 } from "lucide-react"

export default function HomePage() {
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)
  const init = useAuthStore((s) => s.init)
  const view = useViewStore((s) => s.view)

  useEffect(() => {
    init()
  }, [init])

  if (loading) {
    return (
      <div className="app-bg min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Memuat LMS-ITS PERKESO...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  return (
    <AppShell>
      <ViewRouter view={view} />
    </AppShell>
  )
}

function ViewRouter({ view }: { view: string }) {
  switch (view) {
    case "dashboard":
      return <DashboardView />
    case "courses":
      return <CoursesView />
    case "course-detail":
      return <CourseDetailView />
    case "my-learning":
      return <MyLearningView />
    case "quiz":
      return <QuizView />
    case "certificate":
      return <CertificateView />
    case "invoices":
      return <InvoicesView />
    case "invoice-detail":
      return <InvoiceDetailView />
    case "invoice-form":
      return <InvoiceFormView />
    case "projects":
      return <ProjectsView />
    case "project-detail":
      return <ProjectDetailView />
    case "users":
      return <UsersView />
    case "user-form":
      return <UserFormView />
    case "reports":
      return <ReportsView />
    case "settings":
      return <SettingsView />
    default:
      return <DashboardView />
  }
}
