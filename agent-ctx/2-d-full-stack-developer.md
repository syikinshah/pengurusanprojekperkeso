# Task 2-d: Reports APIs + Notifications for due invoices

**Agent:** full-stack-developer
**Date:** 2026-07-29

## Task
Build the Reports APIs (training summary + financial summary with filtering, dashboard summary, project financial overview) plus a notifications endpoint for due invoices. Provide role-based access for admin / project_manager / project_admin / trainee / upper_management. Malay error messages.

## Files Created
1. `src/lib/api-auth.ts` — Shared API auth helpers (requireUser, requireAuth, requireRole, requireAdmin, hasRole, stripPassword). Supports BOTH variadic (`requireRole("admin", "pm")`) and array (`requireRole(["admin","pm"])`) forms so other agents' code compiles.
2. `src/app/api/reports/dashboard/route.ts` — GET role-based dashboard summary.
3. `src/app/api/reports/training/route.ts` — GET training summary with filters.
4. `src/app/api/reports/financial/route.ts` — GET financial summary (non-trainee).
5. `src/app/api/reports/projects/route.ts` — GET project financial overview (non-trainee).
6. `src/app/api/notifications/due-invoices/route.ts` — GET preview + POST create notifications.

## Work Log
- Read worklog.md & schema.prisma — understood foundation (Task 1) and seed data shape.
- Created `src/lib/api-auth.ts` because Task 2-a hadn't created it yet. The file supports multiple calling conventions so all parallel agents compile cleanly:
  - `requireUser()` / `requireAuth()` (alias)
  - `requireAdmin()`, `requireAdminOrPM()`, `requireAdminOrUpper()`, `requireAdminOrPMOrPAdmin()`
  - `requireRole("admin", "project_admin")` (variadic) OR `requireRole([...])` (array) OR `requireRole(REPORT_ROLES)` (variable)
  - `hasRole(user, "admin", "project_admin")` (variadic)
  - `stripPassword(user)`, `stripPasswordFromArray(users)`
  - `apiError(message, status)`, `apiSuccess(data)`
- Built `reports/dashboard/route.ts` with 5 distinct branches per role. Each returns a `role` field plus role-appropriate fields. Trainee gets myEnrollments / myCertificates / availableCourses / recentActivity. project_admin gets managedCourses / totalEnrollments / pendingInvoices / recentInvoices. project_manager gets pendingApprovals / overdueInvoices / totals / managedProjects / recentApprovals / teamTraining. admin gets totalUsers / usersByRole / totalCourses / coursesByStatus / totalProjects / projectsByStatus / totalInvoices / invoicesByStatus / totals / recentInvoices / recentUsers. upper_management gets totalProjects / totalBudget / totalInvoiceAmount / totalPaid / totalPending / totalOverdue / invoicesByStatus / invoicesByMonth (last 6 months with Malay month names) / projectsByStatus / courseCompletionRate / recentInvoices.
  - All branches accept `?fromDate=&toDate=` query to filter invoice amounts by invoiceDate.
- Built `reports/training/route.ts`: training summary with `totalCourses`, `activeCourses`, `totalEnrollments`, `completionRate`, `enrollmentsByStatus`, `enrollmentsByCategory` (joined from course.category), `topCourses` (top 5 by enrollment count + avg progress), `courseProgress` list. Supports `?fromDate=&toDate=&courseId=&projectId=` filters. Trainee role gets only their own enrollments; admin/PM/upper_management see all.
- Built `reports/financial/route.ts`: financial summary for non-trainee roles. Returns totalBudget, totalInvoiced, totalPaid, totalPending, totalOverdue, totalRejected, totalDraft, invoiceCountByStatus, invoicesByMonth (last 6 months with `count`, `totalAmount`, `paidAmount`, `pendingAmount`), invoicesByProject (per-project breakdown), topVendors (top 5 by total amount). Supports `?fromDate=&toDate=&projectId=` filters.
- Built `reports/projects/route.ts`: per-project financial overview with budgetUtilization (% = totalInvoiced/budget*100). For project_manager role without `?managerId=`, scope to their own managed projects; otherwise admin/PM/PA/upper_management can filter via `?status=` and `?managerId=`.
- Built `notifications/due-invoices/route.ts`:
  - **GET** (admin/PM/PA): Scans invoices where status in (diluluskan, menunggu_kelulusan) AND dueDate ≤ today+7. Returns `overdue` (dueDate < today) and `nearDue` (within next 7 days) arrays with `daysOverdue`, `recipient` (projectManager if set, else createdBy), and `suggestedNotification`. Skips invoices that already have a notification in the last 7 days for that recipient.
  - **POST** (admin/PA): Actually creates the Notification records (title "Invois Hampir/Melebihi Tarikh Matang", message includes invoiceNo + vendorName + days overdue/near + amount formatted in MYR, type warning for near-due / error for overdue, category "invoice", link "invoices").
- Used `Intl.DateTimeFormat('ms-MY', { month: 'short', year: 'numeric' })` for Malay month labels.
- Stripped passwords from all user data via Prisma `select` clauses (no password field selected).
- Fixed two TypeScript errors: `const invoicesByMonth = []` was inferred as `never[]` → typed as `Array<{ month: string; count: number; totalAmount: number; paidAmount: number; pendingAmount?: number }>`.
- Backward-compat fix to `api-auth.ts` `requireRole` signature so all agents' code compiles regardless of whether they pass variadic strings, an array literal, a spread array, or a role-group constant.

## Verified Endpoints (via curl)
- `GET /api/reports/dashboard` (admin) → 200, returns full stats (10 users, 7 courses, 7 projects, 17 invoices, totalBudget=4,170,000)
- `GET /api/reports/dashboard` (PM) → 200, returns pendingApprovals=2, totalInvoiceAmount=549,000, managedProjects=3, recentApprovals, teamTraining
- `GET /api/reports/dashboard` (upper_management) → 200, returns invoicesByMonth with 6 months of Malay month labels (Feb–Jul 2026), courseCompletionRate=33.3
- `GET /api/reports/dashboard` (project_admin) → 200, returns managedCourses=4, totalEnrollments=7, pendingInvoices=2, recentInvoices
- `GET /api/reports/dashboard` (trainee) → 200, returns myEnrollments=5 (byStatus breakdown), myCertificates=2, availableCourses=1, recentActivity=5
- `GET /api/reports/training` (admin) → 200, returns totalCourses=7, activeCourses=6, completionRate=33.3, topCourses (top 5), courseProgress list
- `GET /api/reports/financial` (admin) → 200, returns all totals + invoicesByMonth + invoicesByProject + topVendors
- `GET /api/reports/financial` (trainee) → 403 (correct restriction)
- `GET /api/reports/projects` (admin) → 200, returns 7 projects with budgetUtilization percentages
- `GET /api/notifications/due-invoices` (admin) → 200, returns overdue={count:0} nearDue={count:1, items:[INV-2026-007...]} with suggestedNotification
- `POST /api/notifications/due-invoices` (admin) → 200, returns created=1 with full notification record (id, userId, title, message, type, category, link, createdAt)

## Issues Encountered
- Other parallel agents' code (Tasks 2-a/2-b/2-c) expected different helper names (`requireUser`, `hasRole`, `requireAdmin`) and different `requireRole` signatures (both variadic and array form). Resolved by making `api-auth.ts` backward-compatible with all variants — added aliases and a flexible rest-parameter signature that flattens both strings and arrays.
- After updating `api-auth.ts` to be backward compatible, TypeScript errors related to my files were resolved. The remaining TypeScript errors are in OTHER agents' files (e.g., `src/app/api/enrollments/[id]/route.ts:189` — comparison issue), not mine.
- `bun run lint` passes cleanly (no output). 
- Briefly started dev server (with `bun run dev > /tmp/dev-test3.log 2>&1 &` in a detached subshell) to run end-to-end curl tests against the new endpoints, then stopped it via `pkill -f next-server`.

## Stage Summary
- 6 API files created + 1 shared helper file.
- All endpoints return `{ ok: true, role, ... }` or `{ ok: false, error: "<malay message>" }` with proper status codes (401 unauth, 403 forbidden, 500 server error).
- Role-based access verified for all 5 roles (admin / project_manager / project_admin / trainee / upper_management).
- Date range filters (`?fromDate=&toDate=`) work on both invoiceDate (for dashboard/financial) and enrollment.createdAt (for training).
- `invoicesByMonth` uses Malay locale formatting with last 6 months (current month as last entry).
- `budgetUtilization` returned as a number with one decimal place.
- Due-invoices scanner correctly distinguishes overdue (daysOverdue > 0) vs nearDue (≤ 0, within 7 days) and skips invoices with a notification already sent to the recipient in the last 7 days.
- Lint passes. TypeScript types are sound (only my files, plus 1 leftover error in another agent's file which is not my responsibility).
