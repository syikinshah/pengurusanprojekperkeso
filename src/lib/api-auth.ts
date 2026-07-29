// API auth helpers - shared across all API route handlers
// Provides permission/role checking for Next.js 16 route handlers.
//
// This module is shared by every parallel backend agent (auth, users,
// courses, quizzes, enrollments, projects, invoices, notifications,
// reports, certificates). It deliberately supports several calling
// conventions so all routes compile without conflict:
//
//   requireUser()                              -> AuthResult
//   requireAuth()                              -> AuthResult  (alias)
//   requireAdmin()                             -> AuthResult
//   requireAdminOrPM()                         -> AuthResult
//   requireAdminOrUpper()                      -> AuthResult
//   requireAdminOrPMOrPAdmin()                  -> AuthResult
//   requireRole("admin", "project_admin")       (variadic strings)
//   requireRole(REPORT_ROLES)                   (single array variable)
//   requireRole([...ALLOWED_ROLES])             (spread array)
//   requireRole(["admin", "project_manager"])   (array literal)
//   hasRole(user, "admin")                      (variadic)
//   hasRole(user, "admin" as Role, "..." as Role)
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import type { Role, User } from "@/lib/types";

// ============================
// Role groups (re-exported so routes can use them directly)
// ============================
export const ADMIN_ROLES: Role[] = ["admin"];
export const PM_ROLES: Role[] = ["admin", "project_manager", "upper_management"];
export const PA_ROLES: Role[] = ["admin", "project_admin"];
export const REPORT_ROLES: Role[] = [
  "admin",
  "project_manager",
  "project_admin",
  "upper_management",
];
export const ALL_ROLES: Role[] = [
  "admin",
  "project_manager",
  "project_admin",
  "trainee",
  "upper_management",
];

// ============================
// Auth result types
// ============================
export type AuthOk = { ok: true; user: User };
export type AuthFail = { ok: false; response: NextResponse };
export type AuthResult = AuthOk | AuthFail;

// ============================
// Core helpers
// ============================

/**
 * Require an authenticated, active user. Returns the user on success or a
 * 401 response on failure. Routes should use:
 *
 *   const auth = await requireUser();
 *   if (!auth.ok) return auth.response;
 *   const user = auth.user;
 */
export async function requireUser(): Promise<AuthResult> {
  const user = await getSessionUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: "Sesi tidak sah atau telah tamat. Sila log masuk semula.",
        },
        { status: 401 }
      ),
    };
  }
  return { ok: true, user };
}

/** Alias for requireUser() - same behaviour. */
export async function requireAuth(): Promise<AuthResult> {
  return requireUser();
}

/**
 * Require the authenticated user to have one of the provided roles.
 * Supports two calling conventions:
 *   requireRole("admin", "project_admin")     // variadic strings
 *   requireRole(REPORT_ROLES)                 // single array
 *   requireRole([...ALLOWED_ROLES])            // spread array
 *   requireRole(["admin", "project_manager"]) // array literal
 */
export async function requireRole(
  ...args: (Role | Role[])[]
): Promise<AuthResult> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const allowed: Role[] = [];
  for (const a of args) {
    if (Array.isArray(a)) {
      allowed.push(...a);
    } else {
      allowed.push(a);
    }
  }

  if (!allowed.includes(auth.user.role as Role)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: "Akses dinafikkan. Anda tidak mempunyai kebenaran untuk tindakan ini.",
        },
        { status: 403 }
      ),
    };
  }
  return auth;
}

/** Shortcut: require admin role. */
export async function requireAdmin(): Promise<AuthResult> {
  return requireRole("admin");
}

/** Shortcut: require admin or project_manager. */
export async function requireAdminOrPM(): Promise<AuthResult> {
  return requireRole("admin", "project_manager");
}

/** Shortcut: require admin or upper_management (e.g. approvals). */
export async function requireAdminOrUpper(): Promise<AuthResult> {
  return requireRole("admin", "upper_management");
}

/** Shortcut: require admin, project_manager, or project_admin. */
export async function requireAdminOrPMOrPAdmin(): Promise<AuthResult> {
  return requireRole("admin", "project_manager", "project_admin");
}

/**
 * Synchronous role check (no DB call). Returns true if the user has one of
 * the provided roles.
 *   hasRole(user, "admin")
 *   hasRole(user, "admin" as Role, "project_admin" as Role)
 */
export function hasRole(user: User, ...roles: Role[]): boolean {
  return roles.includes(user.role as Role);
}

// ============================
// Response helpers
// ============================

/**
 * Strip the password field from a user object before sending to clients.
 * Defensive - getSessionUser already strips, but db.user results do not.
 */
export function stripPassword<T extends { password?: string }>(
  user: T
): Omit<T, "password"> {
  if (!user) return user;
  const { password: _pw, ...rest } = user;
  return rest;
}

/** Strip password from an array of users. */
export function stripPasswordFromArray<T extends { password?: string }>(
  users: T[]
): Omit<T, "password">[] {
  return users.map((u) => stripPassword(u));
}

/** Build an error response with a Malay message. */
export function apiError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/** Build a success response with optional payload. */
export function apiSuccess(data: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: true, ...data });
}
