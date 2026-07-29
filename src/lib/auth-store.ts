"use client"

import { create } from "zustand"
import { api } from "@/lib/api-client"
import type { User, Role, Notification } from "@/lib/types"

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
  notifications: Notification[]
  unreadCount: number
  init: () => Promise<void>
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  loadNotifications: () => Promise<void>
  markNotificationRead: (id: string) => Promise<void>
  markAllNotificationsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  error: null,
  notifications: [],
  unreadCount: 0,

  init: async () => {
    set({ loading: true, error: null })
    try {
      const { user } = await api.get<{ user: User | null }>("/api/auth/session")
      set({ user, loading: false })
      if (user) {
        get().loadNotifications()
      }
    } catch (e) {
      set({ user: null, loading: false, error: (e as Error).message })
    }
  },

  login: async (email, password) => {
    set({ error: null })
    try {
      const res = await api.post<{ ok: boolean; user: User; error?: string }>(
        "/api/auth/login",
        { email, password },
      )
      if (res.ok && res.user) {
        set({ user: res.user, loading: false })
        get().loadNotifications()
        return true
      } else {
        set({ error: res.error || "Log masuk gagal" })
        return false
      }
    } catch (e) {
      set({ error: (e as Error).message })
      return false
    }
  },

  logout: async () => {
    try {
      await api.post("/api/auth/logout")
    } catch {
      // ignore
    }
    set({ user: null, notifications: [], unreadCount: 0 })
  },

  refreshUser: async () => {
    const { user } = await api.get<{ user: User | null }>("/api/auth/session")
    set({ user })
  },

  loadNotifications: async () => {
    try {
      const res = await api.get<{ notifications: Notification[]; unreadCount: number }>(
        "/api/notifications",
      )
      set({ notifications: res.notifications || [], unreadCount: res.unreadCount || 0 })
    } catch {
      // ignore
    }
  },

  markNotificationRead: async (id: string) => {
    try {
      await api.post(`/api/notifications/${id}/read`)
      set((s) => ({
        notifications: s.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
        unreadCount: Math.max(0, s.unreadCount - 1),
      }))
    } catch {
      // ignore
    }
  },

  markAllNotificationsRead: async () => {
    try {
      await api.post("/api/notifications/read-all")
      set((s) => ({
        notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }))
    } catch {
      // ignore
    }
  },

  deleteNotification: async (id: string) => {
    try {
      await api.del(`/api/notifications/${id}`)
      set((s) => ({
        notifications: s.notifications.filter((n) => n.id !== id),
      }))
    } catch {
      // ignore
    }
  },
}))

// Navigation store for SPA view routing within / route
export type ViewKey =
  | "dashboard"
  | "courses"
  | "course-detail"
  | "my-learning"
  | "quiz"
  | "certificate"
  | "invoices"
  | "invoice-detail"
  | "invoice-form"
  | "projects"
  | "project-detail"
  | "users"
  | "user-form"
  | "reports"
  | "settings"
  | "notifications"

interface ViewState {
  view: ViewKey
  params: Record<string, string>
  navigate: (view: ViewKey, params?: Record<string, string>) => void
}

export const useViewStore = create<ViewState>((set) => ({
  view: "dashboard",
  params: {},
  navigate: (view, params = {}) => {
    set({ view, params })
    // Scroll to top on view change
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  },
}))

// Role-based permission helpers (client-side)
export const ROLE_ACCESS: Record<Role, { modules: string[] }> = {
  admin: {
    modules: ["dashboard", "courses", "my-learning", "invoices", "projects", "users", "reports", "settings", "notifications"],
  },
  project_manager: {
    modules: ["dashboard", "courses", "my-learning", "invoices", "projects", "reports", "notifications"],
  },
  project_admin: {
    modules: ["dashboard", "courses", "my-learning", "invoices", "projects", "notifications", "settings"],
  },
  trainee: {
    modules: ["dashboard", "courses", "my-learning", "notifications"],
  },
  upper_management: {
    modules: ["dashboard", "reports", "notifications"],
  },
}

export function canAccess(role: Role | undefined, view: string): boolean {
  if (!role) return false
  return ROLE_ACCESS[role]?.modules.includes(view) ?? false
}
