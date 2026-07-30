# Task 4-c Agent: Admin Views (Projects, Users, Reports, Settings)

## Task
Build 6 frontend views in `src/components/views/admin-views.tsx` for the LMS-ITS PERKESO system:
- `ProjectsView` — Projects list with summary stats + create dialog
- `ProjectDetailView` — Project detail with invoices + edit/delete
- `UsersView` — User management table with inline role/status/password actions
- `UserFormView` — Create/edit user form
- `ReportsView` — Training + Financial + Projects reports with Recharts
- `SettingsView` — Profile, change password, system info (admin)

## Work Log
- Read `/home/z/my-project/worklog.md` to understand all prior work (Tasks 1, 2-a..d, 3, plus sibling tasks 4-a/4-b that produced `lms-views.tsx`, `invoice-views.tsx`).
- Read every backend route file that admin-views will fetch from, to confirm response shapes:
  - `src/app/api/projects/route.ts` → `GET` returns `{ ok, data: Project[] }` (with `?summary=true` adds `invoiceSummary{total,paid,pending,count}` per project).
  - `src/app/api/projects/[id]/route.ts` → `GET` returns `{ ok, data: {...project, projectManager, invoices, summary{count,total,paid,pending,draft,rejected} }`. `PUT` returns `{ ok, data: project }`. `DELETE` returns `{ ok }` or 400 error if invoices linked.
  - `src/app/api/users/route.ts` → `GET` returns a **bare array** (not envelope-wrapped). `POST` returns `{ ok, user }` (201).
  - `src/app/api/users/[id]/route.ts` → `GET` returns a **bare user object**. `PUT` returns `{ ok, user }` (admin can edit role+isActive+email; self can edit limited fields).
  - `src/app/api/users/[id]/password/route.ts` → `PUT` accepts `{ oldPassword, newPassword }` for self, `{ newPassword }` for admin reset of others. Returns `{ ok }`.
  - `src/app/api/reports/training/route.ts` → `{ ok, role, isTrainee, totalCourses, activeCourses, totalEnrollments, completionRate, enrollmentsByStatus, enrollmentsByCategory, topCourses[], courseProgress[] }`. Accepts `?fromDate=&toDate=`.
  - `src/app/api/reports/financial/route.ts` → `{ ok, role, totalBudget, totalInvoiced, totalPaid, totalPending, totalOverdue, totalRejected, totalDraft, invoiceCountByStatus, invoicesByMonth[], invoicesByProject[], topVendors[] }`. Accepts `?fromDate=&toDate=&projectId=`.
  - `src/app/api/reports/projects/route.ts` → `{ ok, role, count, projects[] }` where each project has `{ id, projectName, budget, status, startDate, endDate, projectManager:{id,name}|null, invoiceCount, totalInvoiced, totalPaid, totalPending, totalOverdue, budgetUtilization }`. Accepts `?status=&managerId=`.
  - `src/app/api/notifications/due-invoices/route.ts` → `GET` returns `{ ok, overdue:{count,items[]}, nearDue:{count,items[]}, totalCandidates }` where each item has `{ invoice, daysOverdue, recipient, suggestedNotification:{title,message,type} }`. `POST` returns `{ ok, created, notifications, message? }`.
  - `src/app/api/reports/dashboard/route.ts` → used by SettingsView to load system info (admin reads `totalUsers`, `usersByRole`, `totalCourses`, `totalProjects`).
- Read `src/components/shared.tsx`, `src/lib/auth-store.ts`, `src/lib/api-client.ts`, `src/lib/types.ts`, `src/components/dashboard.tsx`, `src/components/app-shell.tsx`, `src/app/page.tsx` to understand conventions (Zustand view router, `api` helpers, glassmorphism classes, StatCard/SectionCard/PageHeader/EmptyState/LoadingState/ProjectStatusBadge/InvoiceStatusBadge/getInitials).
- Confirmed shadcn/ui components available (Tabs, Table, Dialog, AlertDialog, Select, Switch, Input, Textarea, Label, Button, Badge, Avatar, Progress, DropdownMenu, ScrollArea).
- Confirmed Recharts deps (`recharts` v2.15) and pattern from dashboard.tsx (ResponsiveContainer, BarChart, PieChart, AreaChart with linear gradients, proper Tooltip/Legend/CartesianGrid).

## File Created
`src/components/views/admin-views.tsx` (~3,444 lines)

### Structure
- Shared local interfaces: `ProjectListItem`, `ProjectDetail`, `TrainingReport`, `FinancialReport`, `ProjectsReportItem`, `ProjectsReport`, `DueInvoicesResponse`.
- Shared helpers: `currencyTooltip`, `safeReadError`, `ALL_PROJECT_STATUSES`, `ALL_ROLES`, `CHART_COLORS`, `tooltipStyle`.

### 1. `ProjectsView`
- Fetches `/api/projects?summary=true` and `/api/users?role=project_manager` (for manager filter dropdown).
- Stats row: Total Projek, Aktif, Selesai, Jumlah Bajet (StatCards).
- Filter bar: search input, status Select, manager Select, refresh button.
- Responsive grid (1/2/3 cols) of glass cards: name+description, status badge, projectManager (avatar initials), budget, date range, invoice summary (count/total/paid/pending), budget utilization Progress bar.
- Click card → `navigate("project-detail", { id })`.
- "Projek Baharu" button (admin/p_admin) opens `CreateProjectDialog` (POST `/api/projects` with full form: name, description, budget, managerId, status, start/end dates). Toast + refresh on success.

### 2. `ProjectDetailView`
- Reads `useViewStore.params.id`.
- Fetches `/api/projects/${id}`. Handles 404/error.
- Back button → `navigate("projects")`.
- Header: projectName, status badge, description, Edit (admin/p_admin), Delete (admin only — AlertDialog with confirmation; handles 400 from backend with toast error).
- Info card (2/3 width): projectManager avatar+name+email, budget, start/end dates, budget utilization Progress.
- Summary card (1/3 width): total, paid, pending, draft, rejected (formatted currency).
- Invoices section: shadcn Table of invoices (invoiceNo, vendor, amount, status, date). Click row → `navigate("invoice-detail", { id })`.
- `EditProjectDialog` pre-fills from existing project, PUT `/api/projects/${id}`. On save, calls `onSaved` callback which re-fetches project detail.

### 3. `UsersView`
- Fetches `/api/users` (bare array response — handled).
- Stats row: Total Pengguna + counts per role (admin/PM/p_admin/trainee/upper) — 6 StatCards.
- Filter bar: search (name/email/dept/pos), role Select, active Select (all/active/inactive).
- Sticky-header scrollable table with custom scrollbar (`scroll-area` class).
- Columns: avatar+name+email, role (clickable badge that opens DropdownMenu to change role inline → PUT with `{ role }`), department+position, phone, status badge, last login (`formatDateTime` or "Belum pernah"), actions (View → navigate to user-form with id, Toggle status → PUT with `{ isActive }`, Reset password → opens `ResetPasswordDialog`).
- "Pengguna Baharu" button → `navigate("user-form")`.
- `ResetPasswordDialog`: admin-only PUT `/api/users/${id}/password` with `{ newPassword }` (admin path — no oldPassword required by backend).

### 4. `UserFormView`
- Reads optional `useViewStore.params.id` for edit mode.
- Edit mode fetches `/api/users/${id}` to pre-fill.
- Form: Nama Penuh (required), E-mel (required + email regex validation), Peranan (Select — disabled on edit if not admin), Jabatan (default "PMU"), Jawatan, Telefon, Kata Laluan (required on create, optional on edit), Status Aktif (Switch, edit+admin only).
- Submit:
  - Create → POST `/api/users`. Toast + `navigate("users")`.
  - Edit → PUT `/api/users/${id}` with appropriate fields (admin: includes role + isActive; self: limited). If editing self → `refreshUser()` to update auth store. Toast + `navigate("users")`.
- Validation: required name, email format, password length ≥6 on create.

### 5. `ReportsView`
- Tabs: Ringkasan Latihan | Ringkasan Kewangan | Pelan Kewangan Projek (each tab = own component with its own fetch + loading state).
- **TrainingReportTab**: date range filter, 4 StatCards (Total Kursus, Aktif, Pendaftaran, Kadar Penyempurnaan %), BarChart "Pendaftaran mengikut Status" (belum_mula/dalam_proses/selesai), PieChart "Pendaftaran mengikut Kategori", "Kursus Teratas" table (top 5 by enrollment).
- **FinancialReportTab**: date+project filters, "Eksport Invois CSV" button (`window.open('/api/invoices/export?...')`), "Cek Invois Tertunggak" button → opens Dialog: first GET `/api/notifications/due-invoices` to preview (overdue+nearDue grouped items), then POST to create notifications (admin/p_admin only). 4 StatCards (Bajet/Invois/Dibayar/Tertunggak). AreaChart "Trend Invois 6 Bulan Terakhir" (totalAmount vs paidAmount with linear gradients). PieChart "Invois mengikut Status". BarChart "Invois mengikut Projek" (Jumlah/Dibayar/Tertunggak bars per project). "Vendor Teratas" table.
- **ProjectsReportTab**: status filter, 4 StatCards (totals), BarChart "Bajet vs Invois per Projek", per-project breakdown table with budget utilization Progress.
- All charts use Recharts `ResponsiveContainer` + shadcn CSS vars (`var(--chart-1..5)`), Malay labels, currency tooltips via `formatCurrency`.
- Each tab handles loading + empty states.

### 6. `SettingsView`
- Uses current `user` from `useAuthStore`.
- Tabs: Profil Saya | Tukar Kata Laluan | Sistem (admin only).
- **Profil Saya**: avatar, name (editable), email (read-only), department, position, phone, avatarUrl. Save → PUT `/api/users/${user.id}` + `refreshUser()`.
- **Tukar Kata Laluan**: currentPassword + newPassword + confirmPassword with client-side validation (newPassword === confirmPassword, length ≥6). PUT `/api/users/${user.id}/password` with `{ oldPassword, newPassword }`. Clears form on success.
- **Sistem** (admin only): system info card (version, DB type, total users/courses/projects, server location — fetched from `/api/reports/dashboard`), user role breakdown card, admin actions: "Periksa Invois Tertunggak" button (POST `/api/notifications/due-invoices`), "Tutup Sesi" / logout button.
- Non-admin users get a "Tutup Sesi" button at the bottom of the page.

## Verification
- `bunx eslint src/components/views/admin-views.tsx --max-warnings 0` → exit 0 (clean).
- `bunx tsc --noEmit` → no errors in admin-views.tsx (only pre-existing errors in other agents' files: app-shell.tsx setState-in-effect lint rule, examples/skills folders, lms/course-detail-view.tsx type narrowing — none introduced by my code).
- `bun run lint` reports a single pre-existing error in `src/components/app-shell.tsx:89` (Task 3, not mine); my files contribute zero errors.

## Issues Encountered
- Backend GET `/api/users` returns a bare array (not envelope-wrapped); the api client's `api.get<User[]>` correctly receives the array directly. Code uses `Array.isArray(res) ? res : []` defensively.
- Backend GET `/api/users/[id]` also returns a bare user object (not wrapped); handled.
- Backend GET `/api/projects/[id]` returns `summary` as a nested object (not flattened); my `ProjectDetail` interface mirrors this exactly.
- The dashboard route returns role-specific top-level fields, so `SettingsView` reads `totalUsers`, `usersByRole`, `totalCourses`, `totalProjects` directly.
- During development, the dev server was temporarily down; verified via `bunx tsc --noEmit` and `bunx eslint` instead.

## Stage Summary
- All 6 admin views implemented and lint/TS clean.
- All fetch code adapted to actual backend response shapes (read route files first).
- All text in Bahasa Malaysia; glassmorphism classes (`glass`, `glass-input`, `btn-brand-gradient`, `animate-fade-in-up`, `scroll-area`) applied throughout.
- All loading/empty/error states handled with `LoadingState`, `EmptyState`, and `toast.error`.
- All charts (Recharts) use Malay labels and currency-formatted tooltips.
- `page.tsx` already imports all 6 named views from this file — ready to render.
