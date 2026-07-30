"use client"

import { useEffect, useState } from "react"
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  Receipt,
  FolderKanban,
  Users,
  BarChart3,
  Settings,
  Bell,
  LogOut,
  Shield,
  Menu,
  X,
  ChevronDown,
  Search,
  Sun,
  Moon,
} from "lucide-react"
import { useAuthStore, useViewStore, canAccess, type ViewKey } from "@/lib/auth-store"
import { ROLE_LABELS } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface NavItem {
  key: ViewKey
  label: string
  icon: React.ComponentType<{ className?: string }>
  group: "lms" | "invoice" | "admin" | "general"
}

const ALL_NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Papan Pemuka", icon: LayoutDashboard, group: "general" },
  // LMS Module
  { key: "courses", label: "Katalog Kursus", icon: GraduationCap, group: "lms" },
  { key: "my-learning", label: "Pembelajaran Saya", icon: BookOpen, group: "lms" },
  // Invoice Module
  { key: "invoices", label: "Penjejakan Invois", icon: Receipt, group: "invoice" },
  { key: "projects", label: "Pengurusan Projek", icon: FolderKanban, group: "invoice" },
  // Admin
  { key: "users", label: "Pengguna", icon: Users, group: "admin" },
  { key: "reports", label: "Laporan & Analitik", icon: BarChart3, group: "admin" },
  { key: "settings", label: "Tetapan", icon: Settings, group: "general" },
]

const GROUP_LABELS: Record<NavItem["group"], string> = {
  lms: "Modul LMS",
  invoice: "Modul Invois",
  admin: "Pentadbiran",
  general: "Umum",
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const view = useViewStore((s) => s.view)
  const navigate = useViewStore((s) => s.navigate)
  const notifications = useAuthStore((s) => s.notifications)
  const unreadCount = useAuthStore((s) => s.unreadCount)
  const loadNotifications = useAuthStore((s) => s.loadNotifications)
  const markAllRead = useAuthStore((s) => s.markAllNotificationsRead)
  const markRead = useAuthStore((s) => s.markNotificationRead)
  const deleteNotif = useAuthStore((s) => s.deleteNotification)
  const { theme, setTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- next-themes mounted pattern (no external dep to subscribe to)
    setMounted(true)
  }, [])

  // Filter nav items by role
  const navItems = ALL_NAV_ITEMS.filter((item) => canAccess(user?.role, item.key))
  const grouped: Record<string, NavItem[]> = {}
  for (const item of navItems) {
    if (!grouped[item.group]) grouped[item.group] = []
    grouped[item.group].push(item)
  }

  const handleLogout = async () => {
    await logout()
    toast.success("Anda telah log keluar")
  }

  const initials = user
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : ""

  const currentLabel = navItems.find((n) => n.key === view)?.label || "Papan Pemuka"

  return (
    <div className="app-bg min-h-screen flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "glass-sidebar fixed lg:sticky top-0 left-0 z-40 h-screen w-72 shrink-0 flex flex-col transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Brand header */}
        <div className="px-5 py-5 flex items-center justify-between border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl glass flex items-center justify-center">
              <Shield className="size-6 text-sidebar-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-sidebar-foreground leading-tight">
                LMS-ITS PERKESO
              </p>
              <p className="text-[11px] text-sidebar-foreground/60">Unit Pengurusan Projek</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => setMobileOpen(false)}
          >
            <X className="size-5" />
          </Button>
        </div>

        {/* Nav */}
        <ScrollArea className="flex-1 px-3 py-4 scroll-area">
          <nav className="space-y-5">
            {Object.entries(grouped).map(([group, items]) => (
              <div key={group}>
                <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                  {GROUP_LABELS[group as NavItem["group"]]}
                </p>
                <div className="space-y-1">
                  {items.map((item) => {
                    const active = view === item.key
                    const Icon = item.icon
                    return (
                      <button
                        key={item.key}
                        onClick={() => {
                          navigate(item.key)
                          setMobileOpen(false)
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition group",
                          active
                            ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-md"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        )}
                      >
                        <Icon className="size-4.5 shrink-0" />
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.key === "invoices" && unreadCount > 0 && (
                          <span className="size-2 rounded-full bg-chart-5 animate-pulse-soft" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* User card */}
        <div className="border-t border-sidebar-border p-3">
          <div className="glass rounded-xl p-3 flex items-center gap-3">
            <Avatar className="size-9 border border-sidebar-border">
              <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-foreground text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.name}</p>
              <p className="text-[10px] text-sidebar-foreground/60 truncate">
                {user ? ROLE_LABELS[user.role] : ""}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={handleLogout}
              title="Log Keluar"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Backdrop on mobile */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main content area */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Top header */}
        <header className="sticky top-0 z-20 glass border-b border-border/50">
          <div className="flex items-center gap-3 px-4 sm:px-6 py-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-lg font-semibold truncate">{currentLabel}</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {user?.department} · {user ? ROLE_LABELS[user.role] : ""}
              </p>
            </div>

            {/* Search placeholder (decorative) */}
            <div className="hidden md:flex items-center glass-input rounded-lg px-3 py-1.5 w-56 lg:w-72">
              <Search className="size-4 text-muted-foreground mr-2" />
              <input
                placeholder="Cari kursus, invois, projek..."
                className="bg-transparent outline-none text-sm flex-1 placeholder:text-muted-foreground"
                onChange={(e) => {
                  // Simple global search dispatch - handled by individual views
                  window.dispatchEvent(new CustomEvent("global-search", { detail: e.target.value }))
                }}
              />
            </div>

            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-lg"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title={mounted ? (theme === "dark" ? "Mod cerah" : "Mod gelap") : ""}
            >
              {mounted && theme === "dark" ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
            </Button>

            {/* Notifications */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-lg" onClick={() => loadNotifications()}>
                  <Bell className="size-4.5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-chart-5 text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 sm:w-96 p-0 glass-strong rounded-xl border-border/60" align="end">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                  <p className="text-sm font-semibold">Notifikasi</p>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllRead()}
                      className="text-xs text-primary hover:underline"
                    >
                      Tandai semua dibaca
                    </button>
                  )}
                </div>
                <ScrollArea className="h-80 scroll-area">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                      <Bell className="size-8 mx-auto mb-2 opacity-30" />
                      Tiada notifikasi
                    </div>
                  ) : (
                    <div className="divide-y divide-border/40">
                      {notifications.slice(0, 20).map((n) => (
                        <div
                          key={n.id}
                          className={cn(
                            "px-4 py-3 hover:bg-muted/40 transition cursor-pointer flex gap-3",
                            !n.isRead && "bg-primary/5",
                          )}
                          onClick={() => {
                            if (!n.isRead) markRead(n.id)
                            if (n.link) navigate(n.link as ViewKey)
                          }}
                        >
                          <div
                            className={cn(
                              "size-8 rounded-lg flex items-center justify-center shrink-0",
                              n.type === "success" && "bg-emerald-500/15 text-emerald-600",
                              n.type === "warning" && "bg-amber-500/15 text-amber-600",
                              n.type === "error" && "bg-rose-500/15 text-rose-600",
                              n.type === "info" && "bg-sky-500/15 text-sky-600",
                            )}
                          >
                            <Bell className="size-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium leading-snug">{n.title}</p>
                            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                            <p className="text-[10px] text-muted-foreground/70 mt-1">
                              {new Date(n.createdAt).toLocaleString("ms-MY", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteNotif(n.id)
                            }}
                            className="text-muted-foreground/40 hover:text-foreground shrink-0"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-muted/40 transition">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-primary/15 text-foreground text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="size-3.5 text-muted-foreground hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 glass-strong rounded-xl">
                <DropdownMenuLabel>
                  <p className="text-sm font-semibold">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  <Badge variant="secondary" className="mt-1.5 text-[10px]">
                    {user ? ROLE_LABELS[user.role] : ""}
                  </Badge>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("settings")}>
                  <Settings className="size-4 mr-2" /> Tetapan Profil
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="size-4 mr-2" /> Log Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
          <div key={view} className="animate-fade-in-up">{children}</div>
        </main>

        {/* Footer */}
        <footer className="mt-auto border-t border-border/50 glass px-4 sm:px-6 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <p>
              © 2026 PERKESO · Unit Pengurusan Projek · LMS-ITS v1.0
            </p>
            <p className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
              Sistem aktif · Pangkalan data Dummy (POC)
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
