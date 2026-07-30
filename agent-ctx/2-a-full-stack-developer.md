# Task 2-a — Auth + Users CRUD APIs

**Agent:** full-stack-developer
**Task:** Build Auth (login/logout/session) + Users CRUD APIs for LMS-ITS PERKESO PMU

## Work Log
- Read `worklog.md` (Task 1 foundation: Prisma schema, seed data, types.ts, auth.ts cookie session helpers).
- Created `src/lib/api-auth.ts` — shared permission/role helpers.
  - Initial version used `requireUser()` / `requireAdmin()` / `hasRole()` style.
  - Discovered parallel agents (Task 2-b/c/d for courses, quizzes, enrollments, projects, invoices, notifications, reports) had overwritten this file with a different convention (`requireAuth()`, `requireRole(array)`, `apiError()`).
  - **Merged** the file to support ALL calling conventions so every parallel route compiles:
    - `requireUser()` and `requireAuth()` both exist (alias)
    - `requireRole(...)` accepts BOTH variadic strings AND a single array
      (`requireRole("admin", "project_admin")` AND `requireRole(REPORT_ROLES)` both work)
    - Added shortcuts: `requireAdmin()`, `requireAdminOrPM()`, `requireAdminOrUpper()`, `requireAdminOrPMOrPAdmin()`
    - `hasRole(user, ...roles)` (variadic)
    - Preserved role constants: `ADMIN_ROLES`, `PM_ROLES`, `PA_ROLES`, `REPORT_ROLES`, `ALL_ROLES`
    - Preserved helpers: `stripPassword`, `stripPasswordFromArray`, `apiError`, `apiSuccess`
    - Defined `AuthResult`/`AuthOk`/`AuthFail` types for `{ ok: true, user } | { ok: false, response }` pattern.
- Created `src/app/api/auth/login/route.ts` — POST, zod-validated, checks `hash_${password}` & `isActive`, sets session cookie, strips password.
- Created `src/app/api/auth/logout/route.ts` — POST, clears session cookie.
- Created `src/app/api/auth/session/route.ts` — GET, returns `{ user }` (null if unauthenticated).
- Created `src/app/api/users/route.ts`:
  - GET: any authenticated user. Supports `?role`, `?search`, `?active` query params. Strips password.
  - POST: admin only. Validates with zod, checks email uniqueness, hashes password as `hash_${pw}`.
- Created `src/app/api/users/[id]/route.ts`:
  - GET: any authenticated user reads any profile.
  - PUT: admin OR self-update (with restricted fields for self). Prevents self-deactivation and password updates via this route.
  - DELETE: admin only, soft-delete (`isActive=false`), cannot delete self.
  - Uses Promise params per Next.js 16.
- Created `src/app/api/users/[id]/password/route.ts` — PUT:
  - Self-change requires `oldPassword` + `newPassword` (verified against `hash_${oldPassword}`).
  - Admin changing someone else's password: only `newPassword` required.
  - Rejects same old/new password.
- All responses use `NextResponse.json()`, return `{ ok: false, error }` on errors with proper status codes (400/401/403/404/500).
- Error messages are in Bahasa Malaysia.
- Every route is wrapped in try/catch with console.error logging.
- Ran `bun run lint` — clean (no errors).
- Ran `bunx tsc --noEmit` — all auth + users routes pass type check. My merged `api-auth.ts` also fixed all parallel agents' type errors (courses, quizzes, projects, invoices, notifications previously had errors due to `requireUser`/`hasRole` not exported — now all resolved).

## Files Created
- `src/lib/api-auth.ts` (merged/rewritten — shared permission helpers, used by all api routes)
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/logout/route.ts`
- `src/app/api/auth/session/route.ts`
- `src/app/api/users/route.ts`
- `src/app/api/users/[id]/route.ts`
- `src/app/api/users/[id]/password/route.ts`

## Issues Encountered
- **Concurrent edits to `src/lib/api-auth.ts`**: A parallel agent had overwritten my initial version of the shared permission helper file with a different API shape. Resolved by merging into a unified file that supports all calling conventions used across the codebase (variadic vs array `requireRole`, `requireUser` vs `requireAuth`, etc.). All routes from other parallel agents now compile cleanly.
- No other issues. Auth and Users APIs are complete and functional.
