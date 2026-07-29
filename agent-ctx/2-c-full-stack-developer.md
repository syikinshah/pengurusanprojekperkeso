# Task 2-c: Projects + Invoices APIs (CRUD, approve/reject, audit trail, export CSV, notifications)

**Agent:** full-stack-developer
**Task ID:** 2-c
**Status:** Completed
**Date:** 2026-07-29

## Files Created

All under `src/app/api/`:

1. **`projects/route.ts`** — GET (list with filters: status, search, managerId, summary), POST (create, PA/admin only, validates projectManager role)
2. **`projects/[id]/route.ts`** — GET (with manager, invoices, summary stats), PUT (update, validates PM role on reassignment), DELETE (admin only; blocks if invoices exist)
3. **`invoices/route.ts`** — GET (paginated with filters: projectId, status, vendor, search, fromDate, toDate, dueFrom, dueTo, sort, order) + POST (admin/PA; validates invoiceNo uniqueness, amount > 0, dueDate >= invoiceDate; creates history `created` (and `submitted` if status=menunggu_kelulusan))
4. **`invoices/[id]/route.ts`** — GET (with project/approvedBy/createdBy/history), PUT (free edits on draf/menunggu_kelulusan; locked to remarks/attachment only on diluluskan/dibayar/ditolak/tertunggak; validates status transitions), DELETE (admin only; only on `draf` status)
5. **`invoices/[id]/approve/route.ts`** — POST (admin/PM; requires menunggu_kelulusan → diluluskan; sets approvedById, approvedAt; creates history + notification to createdBy)
6. **`invoices/[id]/reject/route.ts`** — POST (admin/PM; remarks required; menunggu_kelulusan → ditolak; creates history + error notification)
7. **`invoices/[id]/pay/route.ts`** — POST (admin/PA; requires diluluskan → dibayar; sets paidAt; creates history + notifications to approvedBy & createdBy with formatted amount)
8. **`invoices/[id]/history/route.ts`** — GET (non-trainee; returns InvoiceHistory with user, sorted asc)
9. **`invoices/export/route.ts`** — GET (non-trainee; CSV with BOM; columns: InvoiceNo, ProjectName, VendorName, VendorEmail, Amount (RM), InvoiceDate, DueDate, Status, ApprovedBy, Remarks, CreatedAt; uses Intl.NumberFormat ms-MY; escapes commas/quotes/newlines)
10. **`notifications/route.ts`** — GET (any user, supports unreadOnly + category filters, returns unreadCount) + POST (admin/PA/PM; creates notification for any user)
11. **`notifications/[id]/read/route.ts`** — POST + PATCH (owner only; marks isRead=true)
12. **`notifications/read-all/route.ts`** — POST (marks all current user's notifications as read; returns count)
13. **`notifications/[id]/route.ts`** — DELETE (owner or admin)

## Notes for Other Agents

- I rely on the shared `src/lib/api-auth.ts` (Task 2-a). It exports `requireAuth`, `requireRole`, `requireUser`, `requireAdmin`, `ADMIN_ROLES`, `PA_ROLES`, `PM_ROLES`, `REPORT_ROLES`, `apiError`, `apiSuccess`, `stripPassword`, `hasRole`. The version I saw supports both calling conventions (variadic + array).
- **PM_ROLES includes `upper_management`** — that role is read-only per PRD! So for approve/reject, I deliberately used `requireRole(["admin", "project_manager"])` instead of PM_ROLES to exclude upper_management.
- All Malay error messages are explicit and specific.
- Prisma `$transaction` is used for atomic multi-write operations (invoice + history + notifications).
- Invoice status transitions are strict: `draf → menunggu_kelulusan → diluluskan → dibayar`, `menunggu_kelulusan → ditolak`, `diluluskan → tertunggak`, `ditolak → draf` (re-submit).
- Invoice CSV export uses UTF-8 BOM so Excel renders Malay characters correctly.

## Issues Encountered & Resolved

1. Initial `api-auth.ts` was written by me with a different convention; then Task 2-a rewrote it. I refactored my code to use the `requireRole([roles])` + `{ ok: true, user } | { ok: false, response }` convention.
2. One TS error in `invoices/[id]/route.ts` line 129 — `allowed.includes(status)` with `status: unknown`. Fixed by casting `status` to string via `statusStr = status as string`.
3. No lint errors remain in any of my files.
