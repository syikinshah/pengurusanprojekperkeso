# LMS-ITS PERKESO

### Sistem Pengurusan Pembelajaran & Penjejakan Pembayaran Invois
### Learning Management System + Invoice Tracking System
### Unit Pengurusan Projek (PMU), PERKESO

---

## 📋 Pengenalan

Sistem bersepadu yang menggabungkan **Modul LMS** (pengurusan kursus latihan, pendaftaran peserta, kuiz/penilaian, sijil) dan **Modul Penjejakan Pembayaran Invois** (pengurusan rekod invois projek, aliran kelulusan, audit trail, pelaporan kewangan) khusus untuk pasukan Pengurusan Projek dan Pentadbiran Projek PERKESO.

Dibangunkan mengikut **Dokumen Keperluan Produk (PRD) v1.0** bertarikh 29 Julai 2026.

---

## 🛠️ Tindanan Teknologi

| Lapisan | Teknologi |
|---------|-----------|
| Framework | Next.js 16 (App Router) |
| Bahasa | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) |
| Pangkalan Data | **Supabase (PostgreSQL)** + Prisma ORM |
| Carta | Recharts |
| State | Zustand (client) + TanStack Query (server) |
| Ikon | Lucide React |
| Auth | Cookie-based session (HMAC-like signing, POC) |

> **Pangkalan Data**: Supabase PostgreSQL (production) — lihat bahagian pemasangan di bawah. SQLite tersedia sebagai fallback untuk pembangunan tempatan.

---

## ✅ Keperluan Fungsian (FR-01 hingga FR-23)

### Modul Pengesahan & Pengurusan Pengguna
- ✅ **FR-01** Log masuk e-mel + kata laluan
- ✅ **FR-02** Log keluar + sesi automatik (7 hari)
- ✅ **FR-03** CRUD pengguna (admin)
- ✅ **FR-04** Papan pemuka berbeza mengikut peranan (5 peranan)

### Modul LMS
- ✅ **FR-05** Cipta kursus (tajuk, penerangan, kategori, tempoh, bahan)
- ✅ **FR-06** Muat naik bahan pembelajaran (PDF, video, slaid, dokumen)
- ✅ **FR-07** Senarai kursus + pendaftaran peserta
- ✅ **FR-08** Jejak kemajuan pembelajaran (peratus, modul selesai)
- ✅ **FR-09** Modul kuiz/penilaian dengan skor automatik
- ✅ **FR-10** Sijil digital selepas lulus kursus
- ✅ **FR-11** Laporan kemajuan latihan pasukan (PM)

### Modul Penjejakan Pembayaran Invois
- ✅ **FR-12** Cipta rekod invois (no. invois, vendor, projek, jumlah, tarikh)
- ✅ **FR-13** Muat naik dokumen sokongan invois
- ✅ **FR-14** Status invois: Draf, Menunggu Kelulusan, Diluluskan, Dibayar, Ditolak, Tertunggak
- ✅ **FR-15** PM lulus/tolak invois dengan catatan
- ✅ **FR-16** Notifikasi dalam sistem untuk invois hampir tamat tempoh
- ✅ **FR-17** Papan pemuka ringkasan kewangan (jumlah, dibayar, tertunggak)
- ✅ **FR-18** Penapisan & carian invois (projek, vendor, status, julat tarikh)
- ✅ **FR-19** Eksport senarai invois ke CSV
- ✅ **FR-20** Audit trail / sejarah perubahan status setiap invois

### Modul Pelaporan
- ✅ **FR-21** Laporan ringkasan latihan
- ✅ **FR-22** Laporan ringkasan kewangan projek (carta)
- ✅ **FR-23** Penapisan laporan mengikut tempoh & projek

---

## 👥 Peranan Pengguna & Kawalan Akses (RBAC)

| Peranan | LMS | Invois | Kebenaran Khas |
|---------|-----|--------|----------------|
| **Pentadbir Sistem** | Penuh | Penuh | Konfigurasi sistem, urus pengguna |
| **Pengurus Projek (PM)** | Lihat & jejak pasukan | Lulus/tolak invois, semua laporan | Kelulusan pembayaran |
| **Pentadbir Projek** | Urus kandungan kursus & pendaftaran | Cipta/kemas kini rekod invois | Muat naik dokumen invois |
| **Peserta Latihan** | Ikuti kursus, ambil kuiz | Tiada akses | Lihat sijil sendiri |
| **Pengurusan Atasan** | Lihat laporan | Lihat laporan (read-only) | Pemantauan |

---

## 🎨 Reka Bentuk UI/UX

- **Tema**: Identiti korporat PERKESO (teal/emerald)
- **Kesan Glassmorphism**: Sidebar, kad, input, modals dengan latar belakang kabur
- **Responsif**: Mobile-first (desktop & tablet)
- **Mod Gelap/Cerah**: Soki tema automatik
- **Penanda Warna Status**: Hijau (Dibayar), Kuning (Menunggu), Merah (Tertunggak), dll.
- **Bahasa**: Bahasa Malaysia sebagai bahasa utama

---

## 🚀 Pemasangan & Menjalankan

### Pilihan A: Supabase PostgreSQL (Production)

```bash
# 1. Pasang dependencies
bun install

# 2. Cipta pangkalan data di Supabase
#    Buka Supabase Dashboard → SQL Editor
#    Salin & tampal kandungan fail: supabase-setup.sql
#    Klik "Run" untuk cipta skema + data dummy

# 3. Konfigurasi .env (sudah disediakan)
#    DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
#    atau guna connection pooler:
#    DATABASE_URL=postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres

# 4. Jana Prisma client
bun run db:generate

# 5. Jalankan pelayan
bun run dev
# Buka http://localhost:3000
```

### Pilihan B: SQLite (Pembangunan Tempatan / Preview)

```bash
# Untuk persekitaran tanpa akses Supabase (cth: sandbox)
bash dev-sqlite.sh
# Skrip ini menukar Prisma ke SQLite, jana semula client, dan mulakan dev server
```

### Konfigurasi Supabase

| Tetapan | Nilai |
|---------|-------|
| Project URL | `https://scpcngecvirvakdjxngu.supabase.co` |
| Project Ref | `scpcngecvirvakdjxngu` |
| Region | ap-southeast-1 (Singapore) |
| Connection String (Direct) | `postgresql://postgres:[PASSWORD]@db.scpcngecvirvakdjxngu.supabase.co:5432/postgres` |
| Connection String (Pooler) | `postgresql://postgres.scpcngecvirvakdjxngu:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres` |

> **Nota**: Kata laluan mengandungi `@` — URL-encode sebagai `%40` dalam connection string.

### Akaun Demo (Pangkalan Data Dummy)

| Peranan | E-mel | Kata Laluan |
|---------|-------|------------|
| Pentadbir Sistem | `admin@perkeso.gov.my` | `admin123` |
| Pengurus Projek | `pm@perkeso.gov.my` | `pm123` |
| Pentadbir Projek | `padmin@perkeso.gov.my` | `padmin123` |
| Peserta Latihan | `staff1@perkeso.gov.my` | `staff123` |
| Pengurusan Atasan | `upper@perkeso.gov.my` | `upper123` |

---

## 🗄️ Struktur Pangkalan Data Dummy

12 model Prisma dengan data realistik:

| Model | Bil. Rekod (Seed) |
|-------|-------------------|
| User | 10 (5 peranan) |
| Course | 7 |
| Material | 18 |
| Enrollment | 13 |
| Quiz | 3 |
| Question | 13 |
| QuizAttempt | (semasa ujian) |
| Project | 6 |
| Invoice | 15 (pelbagai status) |
| InvoiceHistory | ~45 (audit trail) |
| Notification | 10 |

Skema penuh: `prisma/schema.prisma`
Skrip seed: `prisma/seed.ts`

---

## 📂 Struktur Projek

```
src/
├── app/
│   ├── api/                    # 38 endpoint API (route handlers)
│   │   ├── auth/               # login, logout, session
│   │   ├── users/              # CRUD pengguna
│   │   ├── courses/            # CRUD kursus + materials
│   │   ├── enrollments/        # Pendaftaran & kemajuan
│   │   ├── quizzes/            # Kuiz, soalan, percubaan
│   │   ├── certificate/         # Pengesahan sijil
│   │   ├── projects/           # CRUD projek
│   │   ├── invoices/           # CRUD invois + approve/reject/pay + history + export
│   │   ├── notifications/      # Notifikasi + due-invoices
│   │   └── reports/            # dashboard, training, financial, projects
│   ├── layout.tsx              # Root layout (metadata)
│   ├── page.tsx                # Pintu masuk + SPA view router
│   └── globals.css             # Tema glassmorphism PERKESO
├── components/
│   ├── ui/                     # shadcn/ui (44 komponen)
│   ├── login-page.tsx          # Halaman log masuk
│   ├── app-shell.tsx           # Shell: sidebar + header + footer
│   ├── dashboard.tsx           # 5 papan pemuka khusus peranan
│   ├── shared.tsx              # StatCard, SectionCard, status badges
│   └── views/                  # 16 modul paparan (LMS, Invois, Admin)
└── lib/
    ├── db.ts                   # Prisma client
    ├── auth.ts                  # Sesi cookie (HMAC-like, POC)
    ├── api-auth.ts              # Pembantu kebenaran peranan
    ├── api-client.ts            # Pembungkus fetch
    ├── auth-store.ts            # Zustand: sesi + navigasi SPA
    └── types.ts                 # Jenis dikongsi + pembantu format

prisma/
├── schema.prisma               # Skema 12 model (PostgreSQL/Supabase)
├── seed.ts                     # Data dummy realistik PERKESO
└── gen-seed-sql.ts             # Penjana SQL dari data SQLite

supabase-setup.sql              # Skrip SQL lengkap (skema + data) untuk Supabase
dev-sqlite.sh                   # Skrip pembangunan tempatan (SQLite fallback)
.env                            # Konfigurasi Supabase (committed)
.env.local                      # Override tempatan (gitignored)
```

---

## 🔒 Nota Keselamatan (POC)

Sistem ini adalah **Proof of Concept**:
- Pengesahan sesi berasaskan cookie dengan tandatangan HMAC-like (bukan produksi)
- Kata laluan disimpan sebagai `hash_<plain>` (POC sahaja, gantikan dengan bcrypt/argon2 untuk produksi)
- Tiada integrasi dengan sistem kewangan rasmi PERKESO (iGFMAS)
- Data kewangan sebenar/sensitif TIDAK disimpan
- **Pangkalan data**: Supabase PostgreSQL (cloud) — rujuk `.env` untuk konfigurasi

Untuk fasa produksi: guna NextAuth.js/bcrypt, tambah pengesahan dua faktor (2FA), dan konfigurasi RLS (Row Level Security) Supabase.

---

## 📈 Laporan & Visualisasi

- **Papan Pemuka Pentadbir**: Kad statistik + carta pai (status invois) + carta bar (pengguna mengikut peranan)
- **Papan Pemuka PM**: Kad menunggu kelulusan + tertunggak + carta pai + senarai kelulusan terkini
- **Papan Pemuka Atasan**: Trend invois 6 bulan (area chart) + status invois/projek
- **Laporan Latihan**: Kadar penyempurnaan, pendaftaran mengikut kategori/status
- **Laporan Kewangan**: Jumlah bajet vs dibayar vs tertunggak, vendor teratas
- **Pelan Kewangan Projek**: Penggunaan bajet per projek dengan progress bar

---

## 📝 Dokumentasi Pembangunan

- `worklog.md` — Log kerja semua agen (tahap pengaturcaraan berbantu AI)
- `agent-ctx/` — Konteks terperinci setiap sub-agen

---

## 🏗️ Seni Bina

Model 3-lapisan (3-tier):
1. **Lapisan Persembahan**: Next.js SPA (App Router, komponen React)
2. **Lapisan Logik/API**: Next.js Route Handlers (38 endpoint REST)
3. **Lapisan Data**: Prisma + SQLite (mudah ditukar ke PostgreSQL/MySQL)

---

## 📄 Lesen & Hak Cipta

© 2026 PERKESO · Unit Pengurusan Projek · v1.0 (POC)

Disediakan oleh: Jurutera Perisian, Unit Pengurusan Projek PERKESO
Platform pembangunan berbantu AI: Z.ai (Model GLM 5.2)

---

*— Tamat Dokumen —*
