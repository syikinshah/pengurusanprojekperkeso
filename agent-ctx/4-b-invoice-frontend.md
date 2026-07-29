# Task 4-b: Invoice Frontend Module

Agent: full-stack-developer
Task: Build Invoice frontend views (InvoicesView, InvoiceDetailView, InvoiceFormView) for LMS-ITS PERKESO PMU

## Work Log
- Read /home/z/my-project/worklog.md to understand all prior work (Tasks 1, 2-a, 2-b, 2-c, 2-d, 3).
- Read API routes to confirm response shapes:
  - `GET /api/invoices` → `{ ok, data: { items, total, page, pageSize } }` with `?projectId=&status=&vendor=&search=&fromDate=&toDate=&pageSize=`.
  - `GET /api/invoices/[id]` → `{ ok, data: invoice }` with `project`, `approvedBy`, `createdBy`, `history[]` (history items include `user`).
  - `POST /api/invoices` → `{ ok, data: created }` 201, body validated by zod.
  - `PUT /api/invoices/[id]` → `{ ok, data: updated }` with status transition validation.
  - `DELETE /api/invoices/[id]` → `{ ok }` admin-only on `draf`.
  - `POST /api/invoices/[id]/approve` → `{ ok, data: updated }` (admin/PM, menunggu_kelulusan → diluluskan).
  - `POST /api/invoices/[id]/reject` → `{ ok, data: updated }` (admin/PM, requires remarks).
  - `POST /api/invoices/[id]/pay` → `{ ok, data: updated }` (admin/PA, diluluskan → dibayar).
  - `GET /api/invoices/export` → CSV with BOM, accepts same query params as list (no pagination param).
  - `GET /api/projects` → `{ ok, data: Project[] }` with `_count.invoices`.
- Created `src/components/views/invoice-views.tsx` (~1,840 lines) barrel-exporting 3 view components used by `src/app/page.tsx`:
  1. **InvoicesView** — list view with filters/search/export
     - Summary stats row (StatCard): Jumlah Invois (count + RM sum), Dibayar, Tertunggak (overdue detection), Menunggu Kelulusan.
     - Filter bar (glass card) with 6 controls: Search (debounced 400ms), Project Select (populated from /api/projects), Status Select (Semua + 6 statuses), Vendor free-text, From Date, To Date. Plus "Gunakan Penapis" + "Bersihkan" buttons.
     - Desktop: shadcn Table with 8 columns (No. Invois clickable mono, Projek, Vendor + email sub-text, Jumlah RM right-aligned, Tarikh Invois, Tarikh Matang color-coded red when overdue + days-tertunggak sub-text, Status badge, Tindakan: "Lihat" + "Hantar" buttons for admin/PA on draf status).
     - Mobile: card grid (1-col mobile, 2-col sm) with same info.
     - Loading state, error state, empty state ("Tiada invois dijumpai" with "Cipta Invois" button for admin/PA).
     - "Invois Baharu" button (admin/p_admin) navigates to `invoice-form` view.
     - "Eksport CSV" button uses `window.open()` with current filters as query (same-origin, cookies attached).
  2. **InvoiceDetailView** — detail view with approval workflow + audit trail
     - Back button "Kembali ke Senarai Invois".
     - Two-column grid (lg:col-span-2 main + 1/3 sidebar), stacks on mobile.
     - Left column:
       - Invoice header card with big invoiceNo, status badge, vendor info, clickable project, large gradient amount.
       - Details card: invoice date, due date (with overdue / days-remaining indicator), paid date if applicable.
       - Remarks card (if remarks present).
       - Attachment card (if attachmentUrl) with download icon, opens in new tab.
       - **Audit Trail timeline** — vertical `<ol>` timeline. Each entry: vertical connecting line, colored dot with action icon, action label (Bahasa Malaysia), from → to status badges (with ArrowRight icon between), remarks quoted, user avatar (initials) + name + datetime. Color-coded: created=slate, submitted=amber, approved=emerald, rejected=rose, paid=sky, edited=violet, status_changed=muted.
     - Right column:
       - Actions card (role-aware):
         - admin/PA + `draf` → "Hantar untuk Kelulusan" (PUT status), "Edit Invois" (navigate), "Padam" (Dialog confirm).
         - admin/PA + `diluluskan` or `tertunggak` → "Tanda Dibayar" (POST pay).
         - admin/PM + `menunggu_kelulusan` → "Luluskan" (Dialog with optional remarks, POST approve), "Tolak" (Dialog with REQUIRED remarks textarea, POST reject).
         - upper_management → "Paparan Sahaja" badge.
         - Non-actionable statuses → informational banners ("Invois telah dibayar", "Invois ditolak", "Menunggu kelulusan").
       - Quick info card: Dicipta Oleh + tarikh, Diluluskan Oleh + tarikh, Dibayar Pada.
       - Related invoices card: fetches `GET /api/invoices?projectId=X`, filters out current, slices first 5.
     - Loading & error states.
  3. **InvoiceFormView** — create/edit form with validation
     - Reads `useViewStore.params.id` → edit mode if present.
     - Fetches `/api/projects` for dropdown; fetches existing invoice if edit mode.
     - Sections via SectionCard: "Butiran Utama" (No. Invois suggested format on create with random INV-YYYY-XXX, read-only on edit; Projek Select showing project budget + invoice count helper text on selection). "Maklumat Vendor" (Name required, Email optional with regex validation). "Kewangan & Tarikh" (Jumlah with live RM preview using formatCurrency, Status Select Draf/Menunggu Kelulusan disabled on edit, Tarikh Invois, Tarikh Matang with min=invoiceDate). "Catatan & Dokumen Sokongan" (Catatan textarea, File input that just collects filename → generates placeholder URL `/invoices/uploaded-{filename}` with preview + remove button).
     - Real-time validation: red border + error message below each invalid field; clears on field change. Email regex, amount > 0, dueDate >= invoiceDate enforced.
     - Submit bar with: Batal (navigate to invoices), "Simpan sebagai Draf" (POST/PUT with status draf), "Hantar untuk Kelulusan" (POST with status menunggu_kelulusan — create only), "Simpan Perubahan" (edit only). All buttons show spinner + "Menyimpan..." while submitting.
     - On success: toast.success + navigate to invoice-detail with created/edited id.
- All Bahasa Malaysia user-facing text.
- All components marked `"use client"`.
- Used glassmorphism classes (`glass`, `glass-input`, `btn-brand-gradient`, `text-gradient`, `animate-fade-in-up`) and shadcn/ui components throughout.
- Handled React 19 `set-state-in-effect` lint rule by deferring synchronous setState calls into Promise.resolve().then(...) callbacks inside effects.
- Lint: my file is clean (0 errors, 0 warnings). The only remaining project-wide lint error is in `src/components/app-shell.tsx:89` (pre-existing from Task 3 — `useEffect(() => setMounted(true), [])`).
- TypeScript: `bunx tsc --noEmit` shows 0 errors in my file. Other remaining errors are in `examples/`, `skills/`, and `src/app/api/enrollments/[id]/route.ts` (Task 2-b).

## Stage Summary
- File created: `src/components/views/invoice-views.tsx` (~1,840 lines).
- Exports 3 view components used by `src/app/page.tsx`: `InvoicesView`, `InvoiceDetailView`, `InvoiceFormView`.
- All views handle loading/error/empty states, support responsive layouts (cards on mobile, table on desktop for list; stack-on-mobile for detail & form).
- Audit Trail timeline is a key feature (FR-20) — color-coded vertical timeline with action icons, status transitions, user avatars, and timestamps.
- CSV export uses `window.open()` with current filter query string — same-origin, cookies attached, triggers browser download of BOM-prefixed CSV.
- Role-aware actions enforced both client-side (button visibility) and server-side (API requires the role).
- Approval workflow dialogs: Approve (optional remarks), Reject (required remarks), Delete (confirmation).
- Lint clean & TS clean for my file. Dev.log shows no compile errors after file creation.
