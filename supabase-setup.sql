-- ================================================================
-- LMS-ITS PERKESO — Complete Database Setup for Supabase
-- Sistem Pengurusan Pembelajaran & Penjejakan Invois
-- Unit Pengurusan Projek (PMU), PERKESO
--
-- Project: https://scpcngecvirvakdjxngu.supabase.co
-- Generated: 29 Julai 2026
--
-- CARA GUNA:
--   1. Buka Supabase Dashboard → SQL Editor
--   2. Salin dan tampal seluruh skrip ini
--   3. Klik 'Run' untuk mencipta skema + data dummy
-- ================================================================

-- ================================================================
-- BAHAGIAN 1: SKEMA PANGKALAN DATA (DDL)
-- ================================================================

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";
-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'trainee',
    "department" TEXT NOT NULL DEFAULT 'PMU',
    "position" TEXT,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Umum',
    "level" TEXT NOT NULL DEFAULT 'Pertengahan',
    "duration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "instructor" TEXT,
    "thumbnailUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'aktif',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'pdf',
    "url" TEXT NOT NULL,
    "description" TEXT,
    "duration" DOUBLE PRECISION,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'belum_mula',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "certificateUrl" TEXT,
    "lastAccessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "passScore" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "duration" INTEGER NOT NULL DEFAULT 15,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'single',
    "options" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "QuizAttempt" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "earnedPoints" INTEGER NOT NULL DEFAULT 0,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "answers" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "description" TEXT,
    "budget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "projectManagerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'aktif',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "vendorEmail" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draf',
    "attachmentUrl" TEXT,
    "attachmentName" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "remarks" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "InvoiceHistory" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "remarks" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvoiceHistory_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "category" TEXT NOT NULL DEFAULT 'invoice',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_userId_courseId_key" ON "Enrollment"("userId", "courseId");
-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNo_key" ON "Invoice"("invoiceNo");
-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_projectManagerId_fkey" FOREIGN KEY ("projectManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "InvoiceHistory" ADD CONSTRAINT "InvoiceHistory_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "InvoiceHistory" ADD CONSTRAINT "InvoiceHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ================================================================
-- BAHAGIAN 2: DATA DUMMY (DML)
-- ================================================================

-- Seed data for LMS-ITS PERKESO (Supabase PostgreSQL)
-- Auto-generated from SQLite dummy database
-- Timestamps converted from epoch ms to PostgreSQL TIMESTAMP

-- Temporarily disable FK constraints for clean insertion order
SET session_replication_role = 'replica';

-- User (10 records)
INSERT INTO "User" ("id", "email", "password", "name", "role", "department", "position", "phone", "avatarUrl", "isActive", "lastLoginAt", "createdAt", "updatedAt") VALUES ('cms5sb3pk0000q881r9r64c47', 'admin@perkeso.gov.my', 'hash_admin123', 'Aisyah binti Rahman', 'admin', 'PMU', 'Pentadbir Sistem', '+603-4264-5555', NULL, true, NULL, to_timestamp(1785311393672 / 1000.0), to_timestamp(1785311393672 / 1000.0));
INSERT INTO "User" ("id", "email", "password", "name", "role", "department", "position", "phone", "avatarUrl", "isActive", "lastLoginAt", "createdAt", "updatedAt") VALUES ('cms5sb3pl0002q881n77kjv7f', 'pm2@perkeso.gov.my', 'hash_pm123', 'Siti Nurhaliza binti Abdullah', 'project_manager', 'PMU', 'Pengurus Projek', '+603-4264-5557', NULL, true, NULL, to_timestamp(1785311393673 / 1000.0), to_timestamp(1785311393673 / 1000.0));
INSERT INTO "User" ("id", "email", "password", "name", "role", "department", "position", "phone", "avatarUrl", "isActive", "lastLoginAt", "createdAt", "updatedAt") VALUES ('cms5sb3pl0003q881es4f12xr', 'padmin@perkeso.gov.my', 'hash_padmin123', 'Tan Wei Ming', 'project_admin', 'PMU', 'Pentadbir Projek', '+603-4264-5558', NULL, true, NULL, to_timestamp(1785311393673 / 1000.0), to_timestamp(1785311393673 / 1000.0));
INSERT INTO "User" ("id", "email", "password", "name", "role", "department", "position", "phone", "avatarUrl", "isActive", "lastLoginAt", "createdAt", "updatedAt") VALUES ('cms5sb3pl0004q881ax4i3t5t', 'padmin2@perkeso.gov.my', 'hash_padmin123', 'Lim Mei Ling', 'project_admin', 'PMU', 'Pentadbir Projek', '+603-4264-5559', NULL, true, NULL, to_timestamp(1785311393674 / 1000.0), to_timestamp(1785311393674 / 1000.0));
INSERT INTO "User" ("id", "email", "password", "name", "role", "department", "position", "phone", "avatarUrl", "isActive", "lastLoginAt", "createdAt", "updatedAt") VALUES ('cms5sb3pm0005q881lboq4dv6', 'staff1@perkeso.gov.my', 'hash_staff123', 'Nurul Aini binti Yusof', 'trainee', 'PMU', 'Pegawai Latihan', '+603-4264-5560', NULL, true, NULL, to_timestamp(1785311393674 / 1000.0), to_timestamp(1785311393674 / 1000.0));
INSERT INTO "User" ("id", "email", "password", "name", "role", "department", "position", "phone", "avatarUrl", "isActive", "lastLoginAt", "createdAt", "updatedAt") VALUES ('cms5sb3pm0006q881wp6f3asp', 'staff2@perkeso.gov.my', 'hash_staff123', 'Ahmad Zulkifli bin Ibrahim', 'trainee', 'PMU', 'Pegawai Operasi', '+603-4264-5561', NULL, true, NULL, to_timestamp(1785311393674 / 1000.0), to_timestamp(1785311393674 / 1000.0));
INSERT INTO "User" ("id", "email", "password", "name", "role", "department", "position", "phone", "avatarUrl", "isActive", "lastLoginAt", "createdAt", "updatedAt") VALUES ('cms5sb3pm0007q881wm0lm9rw', 'staff3@perkeso.gov.my', 'hash_staff123', 'Kavitha a/p Raju', 'trainee', 'PMU', 'Pegawai Kewangan', '+603-4264-5562', NULL, true, NULL, to_timestamp(1785311393675 / 1000.0), to_timestamp(1785311393675 / 1000.0));
INSERT INTO "User" ("id", "email", "password", "name", "role", "department", "position", "phone", "avatarUrl", "isActive", "lastLoginAt", "createdAt", "updatedAt") VALUES ('cms5sb3pn0008q881hniw86wt', 'staff4@perkeso.gov.my', 'hash_staff123', 'Roziana binti Othman', 'trainee', 'PMU', 'Pegawai Pentadbiran', '+603-4264-5563', NULL, true, NULL, to_timestamp(1785311393675 / 1000.0), to_timestamp(1785311393675 / 1000.0));
INSERT INTO "User" ("id", "email", "password", "name", "role", "department", "position", "phone", "avatarUrl", "isActive", "lastLoginAt", "createdAt", "updatedAt") VALUES ('cms5sb3pn0009q8813pybljv6', 'upper@perkeso.gov.my', 'hash_upper123', 'Dato'' Ramli bin Saad', 'upper_management', 'PMU', 'Pengurus Atasan', '+603-4264-5500', NULL, true, NULL, to_timestamp(1785311393675 / 1000.0), to_timestamp(1785311393675 / 1000.0));
INSERT INTO "User" ("id", "email", "password", "name", "role", "department", "position", "phone", "avatarUrl", "isActive", "lastLoginAt", "createdAt", "updatedAt") VALUES ('cms5sb3pk0001q8817ph5me2e', 'pm@perkeso.gov.my', 'hash_pm123', 'Mohd Faizal bin Hassan', 'project_manager', 'PMU', 'Pengurus Projek Senior', '+603-4264-5556', NULL, true, NULL, to_timestamp(1785311393672 / 1000.0), to_timestamp(1785311393672 / 1000.0));

-- Course (7 records)
INSERT INTO "Course" ("id", "title", "description", "category", "level", "duration", "instructor", "thumbnailUrl", "status", "createdBy", "createdAt", "updatedAt") VALUES ('cms5sb3pp000bq881pei6y2a6', 'Microsoft Power BI untuk Pelaporan Projek', 'Membina dashboard interaktif dan laporan visual menggunakan Power BI untuk pemantauan prestasi dan kewangan projek.', 'Teknologi', 'Lanjutan', 14, 'Lim Mei Ling', NULL, 'aktif', 'cms5sb3pl0004q881ax4i3t5t', to_timestamp(1785311393678 / 1000.0), to_timestamp(1785311393678 / 1000.0));
INSERT INTO "Course" ("id", "title", "description", "category", "level", "duration", "instructor", "thumbnailUrl", "status", "createdBy", "createdAt", "updatedAt") VALUES ('cms5sb3pq000dq881l9ahb23c', 'Komunikasi Berkesan & Pengurusan Pasukan', 'Kemahiran komunikasi profesional, pengurusan konflik dalam pasukan, dan kepimpinan kolaboratif untuk pengurus projek.', 'Pengurusan', 'Pertengahan', 9, 'Siti Nurhaliza binti Abdullah', NULL, 'aktif', 'cms5sb3pl0004q881ax4i3t5t', to_timestamp(1785311393678 / 1000.0), to_timestamp(1785311393678 / 1000.0));
INSERT INTO "Course" ("id", "title", "description", "category", "level", "duration", "instructor", "thumbnailUrl", "status", "createdBy", "createdAt", "updatedAt") VALUES ('cms5sb3pq000fq881bf5mplqe', 'Procurement & Kontrak Vendor PERKESO', 'Proses perolehan, pengurusan kontrak vendor, penilaian prestasi vendor dan pematuhan polisi perbendaharaan.', 'Pengurusan', 'Lanjutan', 11, 'Mohd Faizal bin Hassan', NULL, 'draf', 'cms5sb3pl0003q881es4f12xr', to_timestamp(1785311393679 / 1000.0), to_timestamp(1785311393679 / 1000.0));
INSERT INTO "Course" ("id", "title", "description", "category", "level", "duration", "instructor", "thumbnailUrl", "status", "createdBy", "createdAt", "updatedAt") VALUES ('cms5sb3pq000hq88104s1ez7j', 'Pengurusan Invois & Kawalan Kewangan Projek', 'Kursus pengurusan kewangan projek, penjejakan invois, kawalan bajet dan pelaporan kewangan mengikut garis panduan perbendaharaan.', 'Kewangan', 'Pertengahan', 10, 'Lim Mei Ling', NULL, 'aktif', 'cms5sb3pl0004q881ax4i3t5t', to_timestamp(1785311393679 / 1000.0), to_timestamp(1785311393679 / 1000.0));
INSERT INTO "Course" ("id", "title", "description", "category", "level", "duration", "instructor", "thumbnailUrl", "status", "createdBy", "createdAt", "updatedAt") VALUES ('cms5sb3pr000jq881413j52q5', 'Agile & Scrum Methodology', 'Pengenalan kepada metodologi Agile dan rangka kerja Scrum untuk pengurusan projek software. Termasuk peranan Scrum Master, Product Owner dan acara-acara Scrum.', 'Teknikal', 'Pertengahan', 8, 'Tan Wei Ming', NULL, 'aktif', 'cms5sb3pl0003q881es4f12xr', to_timestamp(1785311393679 / 1000.0), to_timestamp(1785311393679 / 1000.0));
INSERT INTO "Course" ("id", "title", "description", "category", "level", "duration", "instructor", "thumbnailUrl", "status", "createdBy", "createdAt", "updatedAt") VALUES ('cms5sb3pr000lq881fmp9nax8', 'Keselamatan Siber & Perlindungan Data', 'Kesedaran keselamatan siber, perlindungan data peribadi (PDPA), dan amalan terbaik keselamatan maklumat untuk kakitangan.', 'Teknologi', 'Asas', 6, 'Tan Wei Ming', NULL, 'aktif', 'cms5sb3pl0003q881es4f12xr', to_timestamp(1785311393679 / 1000.0), to_timestamp(1785311393679 / 1000.0));
INSERT INTO "Course" ("id", "title", "description", "category", "level", "duration", "instructor", "thumbnailUrl", "status", "createdBy", "createdAt", "updatedAt") VALUES ('cms5sb3pr000nq8819h92t4yb', 'Asas Pengurusan Projek (PMBOK 7)', 'Kursus asas pengurusan projek mengikut rangka kerja PMBOK edisi ke-7. Merangkumi 5 kumpulan proses dan 10 kawasan pengetahuan.', 'Pengurusan', 'Asas', 12, 'Mohd Faizal bin Hassan', NULL, 'aktif', 'cms5sb3pl0003q881es4f12xr', to_timestamp(1785311393680 / 1000.0), to_timestamp(1785311393680 / 1000.0));

-- Material (18 records)
INSERT INTO "Material" ("id", "courseId", "title", "type", "url", "description", "duration", "order", "createdAt") VALUES ('cms5sb3ps000pq881edo1zj4k', 'cms5sb3pr000nq8819h92t4yb', 'Pengenalan PMBOK 7 - Sistem Penyampaian Nilai', 'pdf', '/materials/pmbok7-intro.pdf', NULL, 45, 1, to_timestamp(1785311393681 / 1000.0));
INSERT INTO "Material" ("id", "courseId", "title", "type", "url", "description", "duration", "order", "createdAt") VALUES ('cms5sb3pt000rq8812tm2h4or', 'cms5sb3pr000nq8819h92t4yb', 'Video: 12 Prinsip Pengurusan Projek', 'video', '/materials/pmbok-principles.mp4', NULL, 30, 2, to_timestamp(1785311393682 / 1000.0));
INSERT INTO "Material" ("id", "courseId", "title", "type", "url", "description", "duration", "order", "createdAt") VALUES ('cms5sb3pu000tq88190wot5z2', 'cms5sb3pr000nq8819h92t4yb', 'Slaid: Kumpulan Proses & Kawasan Pengetahuan', 'slide', '/materials/pmbok-processes.pdf', NULL, 60, 3, to_timestamp(1785311393682 / 1000.0));
INSERT INTO "Material" ("id", "courseId", "title", "type", "url", "description", "duration", "order", "createdAt") VALUES ('cms5sb3pu000vq881f2kfytye', 'cms5sb3pr000nq8819h92t4yb', 'Dokumen: Templat Rancangan Projek (Project Charter)', 'document', '/materials/project-charter-template.docx', NULL, 20, 4, to_timestamp(1785311393683 / 1000.0));
INSERT INTO "Material" ("id", "courseId", "title", "type", "url", "description", "duration", "order", "createdAt") VALUES ('cms5sb3pv000xq881h2lr39yh', 'cms5sb3pr000jq881413j52q5', 'Pengenalan Agile Manifesto', 'pdf', '/materials/agile-manifesto.pdf', NULL, 25, 1, to_timestamp(1785311393684 / 1000.0));
INSERT INTO "Material" ("id", "courseId", "title", "type", "url", "description", "duration", "order", "createdAt") VALUES ('cms5sb3pw000zq881lnmmv2cf', 'cms5sb3pr000jq881413j52q5', 'Video: Scrum Framework Overview', 'video', '/materials/scrum-overview.mp4', NULL, 40, 2, to_timestamp(1785311393684 / 1000.0));
INSERT INTO "Material" ("id", "courseId", "title", "type", "url", "description", "duration", "order", "createdAt") VALUES ('cms5sb3px0011q8819s3yx66m', 'cms5sb3pr000jq881413j52q5', 'Slaid: Acara-acara Scrum', 'slide', '/materials/scrum-events.pdf', NULL, 35, 3, to_timestamp(1785311393685 / 1000.0));
INSERT INTO "Material" ("id", "courseId", "title", "type", "url", "description", "duration", "order", "createdAt") VALUES ('cms5sb3py0013q881viij16kc', 'cms5sb3pq000hq88104s1ez7j', 'Garis Panduan Pengurusan Invois PERKESO', 'pdf', '/materials/invoice-guidelines.pdf', NULL, 50, 1, to_timestamp(1785311393686 / 1000.0));
INSERT INTO "Material" ("id", "courseId", "title", "type", "url", "description", "duration", "order", "createdAt") VALUES ('cms5sb3pz0015q881hha052pg', 'cms5sb3pq000hq88104s1ez7j', 'Video: Aliran Kelulusan Invois', 'video', '/materials/invoice-approval-flow.mp4', NULL, 25, 2, to_timestamp(1785311393687 / 1000.0));
INSERT INTO "Material" ("id", "courseId", "title", "type", "url", "description", "duration", "order", "createdAt") VALUES ('cms5sb3pz0017q881nrp80clj', 'cms5sb3pq000hq88104s1ez7j', 'Slaid: Kawalan Bajet Projek', 'slide', '/materials/budget-control.pdf', NULL, 45, 3, to_timestamp(1785311393688 / 1000.0));
INSERT INTO "Material" ("id", "courseId", "title", "type", "url", "description", "duration", "order", "createdAt") VALUES ('cms5sb3q00019q881gy75qvea', 'cms5sb3pr000lq881fmp9nax8', 'Pengenalan PDPA & Perlindungan Data', 'pdf', '/materials/pdpa-intro.pdf', NULL, 30, 1, to_timestamp(1785311393688 / 1000.0));
INSERT INTO "Material" ("id", "courseId", "title", "type", "url", "description", "duration", "order", "createdAt") VALUES ('cms5sb3q0001bq8818sva7cfz', 'cms5sb3pr000lq881fmp9nax8', 'Video: Phishing & Ancaman Siber', 'video', '/materials/phishing-threats.mp4', NULL, 20, 2, to_timestamp(1785311393689 / 1000.0));
INSERT INTO "Material" ("id", "courseId", "title", "type", "url", "description", "duration", "order", "createdAt") VALUES ('cms5sb3q0001dq881u3cke8if', 'cms5sb3pp000bq881pei6y2a6', 'Pemasangan & Persediaan Power BI Desktop', 'pdf', '/materials/powerbi-setup.pdf', NULL, 40, 1, to_timestamp(1785311393689 / 1000.0));
INSERT INTO "Material" ("id", "courseId", "title", "type", "url", "description", "duration", "order", "createdAt") VALUES ('cms5sb3q1001fq8816u64z0pc', 'cms5sb3pp000bq881pei6y2a6', 'Video: Membina Visual Asas', 'video', '/materials/powerbi-visuals.mp4', NULL, 55, 2, to_timestamp(1785311393689 / 1000.0));
INSERT INTO "Material" ("id", "courseId", "title", "type", "url", "description", "duration", "order", "createdAt") VALUES ('cms5sb3q1001hq88105f99gc9', 'cms5sb3pp000bq881pei6y2a6', 'Slaid: DAX Functions Asas', 'slide', '/materials/dax-basics.pdf', NULL, 60, 3, to_timestamp(1785311393690 / 1000.0));
INSERT INTO "Material" ("id", "courseId", "title", "type", "url", "description", "duration", "order", "createdAt") VALUES ('cms5sb3q2001jq881zv3n4l1h', 'cms5sb3pq000dq881l9ahb23c', 'Prinsip Komunikasi Berkesan', 'pdf', '/materials/communication-principles.pdf', NULL, 35, 1, to_timestamp(1785311393690 / 1000.0));
INSERT INTO "Material" ("id", "courseId", "title", "type", "url", "description", "duration", "order", "createdAt") VALUES ('cms5sb3q2001lq8812a961dik', 'cms5sb3pq000dq881l9ahb23c', 'Video: Pengurusan Konflik', 'video', '/materials/conflict-management.mp4', NULL, 30, 2, to_timestamp(1785311393691 / 1000.0));
INSERT INTO "Material" ("id", "courseId", "title", "type", "url", "description", "duration", "order", "createdAt") VALUES ('cms5sb3q3001nq881tvbbi2v6', 'cms5sb3pq000fq881bf5mplqe', 'Proses Perolehan PERKESO', 'pdf', '/materials/procurement-process.pdf', NULL, 60, 1, to_timestamp(1785311393691 / 1000.0));

-- Quiz (3 records)
INSERT INTO "Quiz" ("id", "courseId", "title", "description", "passScore", "duration", "order", "createdAt") VALUES ('cms5sb3q3001pq8813kqzafwu', 'cms5sb3pr000nq8819h92t4yb', 'Penilaian Asas PMBOK 7', 'Ujian kefahaman konsep asas PMBOK 7 edisi.', 70, 20, 1, to_timestamp(1785311393692 / 1000.0));
INSERT INTO "Quiz" ("id", "courseId", "title", "description", "passScore", "duration", "order", "createdAt") VALUES ('cms5sb3qa0021q881ujkcackk', 'cms5sb3pr000jq881413j52q5', 'Penilaian Agile & Scrum', 'Ujian kefahaman metodologi Agile dan Scrum.', 60, 15, 1, to_timestamp(1785311393699 / 1000.0));
INSERT INTO "Quiz" ("id", "courseId", "title", "description", "passScore", "duration", "order", "createdAt") VALUES ('cms5sb3qe002bq881jusycgv9', 'cms5sb3pq000hq88104s1ez7j', 'Penilaian Pengurusan Invois', 'Ujian kefahaman aliran kelulusan invois dan kawalan kewangan.', 65, 18, 1, to_timestamp(1785311393702 / 1000.0));

-- Question (13 records)
INSERT INTO "Question" ("id", "quizId", "text", "type", "options", "answer", "points", "order") VALUES ('cms5sb3q5001rq8815xc3bym8', 'cms5sb3q3001pq8813kqzafwu', 'Berapakah kumpulan proses (process groups) dalam PMBOK 7?', 'single', '["3","5","7","10"]', '[1]', 2, 1);
INSERT INTO "Question" ("id", "quizId", "text", "type", "options", "answer", "points", "order") VALUES ('cms5sb3q7001tq881wtflpdul', 'cms5sb3q3001pq8813kqzafwu', 'Yang manakah kawasan pengetahuan (knowledge area) dalam PMBOK?', 'multiple', '["Pengurusan Skop","Pengurusan Masa","Pengurusan Pasukan","Semua di atas"]', '[3]', 2, 2);
INSERT INTO "Question" ("id", "quizId", "text", "type", "options", "answer", "points", "order") VALUES ('cms5sb3q8001vq8817pwtns6f', 'cms5sb3q3001pq8813kqzafwu', 'Project Charter adalah dokumen yang diluluskan oleh penaja projek.', 'true_false', '["Benar","False"]', '[0]', 1, 3);
INSERT INTO "Question" ("id", "quizId", "text", "type", "options", "answer", "points", "order") VALUES ('cms5sb3q9001xq881zjyimimr', 'cms5sb3q3001pq8813kqzafwu', 'Manakah yang BUKAN merupakan prinsip PMBOK 7?', 'single', '["Kepimpinan Berbelas kasihan","Pemikiran Sistem","Pengurusan Hierarki","Menyesuaikan dengan kompleksiti"]', '[2]', 2, 4);
INSERT INTO "Question" ("id", "quizId", "text", "type", "options", "answer", "points", "order") VALUES ('cms5sb3qa001zq8811xnsz2kg', 'cms5sb3q3001pq8813kqzafwu', 'Risk Management adalah sebahagian daripada kawasan pengetahuan PMBOK.', 'true_false', '["Benar","False"]', '[0]', 1, 5);
INSERT INTO "Question" ("id", "quizId", "text", "type", "options", "answer", "points", "order") VALUES ('cms5sb3qb0023q88133wz6lpk', 'cms5sb3qa0021q881ujkcackk', 'Apakah tempoh standard Sprint dalam Scrum?', 'single', '["1 minggu","2-4 minggu","1 bulan","3 bulan"]', '[1]', 2, 1);
INSERT INTO "Question" ("id", "quizId", "text", "type", "options", "answer", "points", "order") VALUES ('cms5sb3qc0025q881dm77pd99', 'cms5sb3qa0021q881ujkcackk', 'Yang manakah peranan utama dalam Scrum?', 'multiple', '["Scrum Master","Product Owner","Project Sponsor","Developer"]', '[0,1,3]', 3, 2);
INSERT INTO "Question" ("id", "quizId", "text", "type", "options", "answer", "points", "order") VALUES ('cms5sb3qd0027q8814fg2un7u', 'cms5sb3qa0021q881ujkcackk', 'Daily Standup adalah mesyuarat formal berdurasi 1 jam.', 'true_false', '["Benar","False"]', '[1]', 1, 3);
INSERT INTO "Question" ("id", "quizId", "text", "type", "options", "answer", "points", "order") VALUES ('cms5sb3qd0029q881ojwauzup', 'cms5sb3qa0021q881ujkcackk', 'Apakah output utama Sprint Planning?', 'single', '["Sprint Backlog","Product Backlog","Burndown Chart","Release Plan"]', '[0]', 2, 4);
INSERT INTO "Question" ("id", "quizId", "text", "type", "options", "answer", "points", "order") VALUES ('cms5sb3qf002dq8816qqvea8s', 'cms5sb3qe002bq881jusycgv9', 'Status invois "Menunggu Kelulusan" bermaksud invois menunggu kelulusan daripada?', 'single', '["Admin Sistem","Pengurus Projek","Pentadbir Projek","Peserta Latihan"]', '[1]', 2, 1);
INSERT INTO "Question" ("id", "quizId", "text", "type", "options", "answer", "points", "order") VALUES ('cms5sb3qg002fq881sibk7yuv', 'cms5sb3qe002bq881jusycgv9', 'Invois tertunggak (overdue) berlaku apabila?', 'multiple', '["Tarikh matang telah dilebihi","Status masih belum dibayar","Vendor menuntut bayaran","Semua di atas"]', '[3]', 2, 2);
INSERT INTO "Question" ("id", "quizId", "text", "type", "options", "answer", "points", "order") VALUES ('cms5sb3qg002hq881559teq8l', 'cms5sb3qe002bq881jusycgv9', 'Audit trail invois merekodkan setiap perubahan status.', 'true_false', '["Benar","False"]', '[0]', 1, 3);
INSERT INTO "Question" ("id", "quizId", "text", "type", "options", "answer", "points", "order") VALUES ('cms5sb3qh002jq881j6emynqx', 'cms5sb3qe002bq881jusycgv9', 'Dokumen sokongan invois boleh dalam format?', 'multiple', '["PDF","JPEG","PNG","Word"]', '[0,1,2]', 2, 4);

-- Enrollment (13 records)
INSERT INTO "Enrollment" ("id", "userId", "courseId", "progress", "status", "enrolledAt", "completedAt", "certificateUrl", "lastAccessedAt", "createdAt", "updatedAt") VALUES ('cms5sb3qi002lq881ykg8ssv6', 'cms5sb3pm0005q881lboq4dv6', 'cms5sb3pr000nq8819h92t4yb', 100, 'selesai', to_timestamp(1785311393707 / 1000.0), to_timestamp(1781481600000 / 1000.0), '/certs/cert-001.pdf', to_timestamp(1784543875908 / 1000.0), to_timestamp(1785311393707 / 1000.0), to_timestamp(1785311393707 / 1000.0));
INSERT INTO "Enrollment" ("id", "userId", "courseId", "progress", "status", "enrolledAt", "completedAt", "certificateUrl", "lastAccessedAt", "createdAt", "updatedAt") VALUES ('cms5sb3qj002nq8819w8omk0k', 'cms5sb3pm0005q881lboq4dv6', 'cms5sb3pr000jq881413j52q5', 60, 'dalam_proses', to_timestamp(1785311393708 / 1000.0), NULL, NULL, to_timestamp(1782903993128 / 1000.0), to_timestamp(1785311393708 / 1000.0), to_timestamp(1785311393708 / 1000.0));
INSERT INTO "Enrollment" ("id", "userId", "courseId", "progress", "status", "enrolledAt", "completedAt", "certificateUrl", "lastAccessedAt", "createdAt", "updatedAt") VALUES ('cms5sb3qk002pq881kq69xlxm', 'cms5sb3pm0005q881lboq4dv6', 'cms5sb3pr000lq881fmp9nax8', 100, 'selesai', to_timestamp(1785311393708 / 1000.0), to_timestamp(1782950400000 / 1000.0), '/certs/cert-002.pdf', to_timestamp(1783719629645 / 1000.0), to_timestamp(1785311393708 / 1000.0), to_timestamp(1785311393708 / 1000.0));
INSERT INTO "Enrollment" ("id", "userId", "courseId", "progress", "status", "enrolledAt", "completedAt", "certificateUrl", "lastAccessedAt", "createdAt", "updatedAt") VALUES ('cms5sb3qk002rq881ijoivvj8', 'cms5sb3pm0006q881wp6f3asp', 'cms5sb3pr000nq8819h92t4yb', 75, 'dalam_proses', to_timestamp(1785311393709 / 1000.0), NULL, NULL, to_timestamp(1784971962083 / 1000.0), to_timestamp(1785311393709 / 1000.0), to_timestamp(1785311393709 / 1000.0));
INSERT INTO "Enrollment" ("id", "userId", "courseId", "progress", "status", "enrolledAt", "completedAt", "certificateUrl", "lastAccessedAt", "createdAt", "updatedAt") VALUES ('cms5sb3ql002tq881pc4nterw', 'cms5sb3pm0006q881wp6f3asp', 'cms5sb3pq000hq88104s1ez7j', 40, 'dalam_proses', to_timestamp(1785311393709 / 1000.0), NULL, NULL, to_timestamp(1783298937977 / 1000.0), to_timestamp(1785311393709 / 1000.0), to_timestamp(1785311393709 / 1000.0));
INSERT INTO "Enrollment" ("id", "userId", "courseId", "progress", "status", "enrolledAt", "completedAt", "certificateUrl", "lastAccessedAt", "createdAt", "updatedAt") VALUES ('cms5sb3ql002vq881e9t72avq', 'cms5sb3pm0006q881wp6f3asp', 'cms5sb3pp000bq881pei6y2a6', 25, 'dalam_proses', to_timestamp(1785311393709 / 1000.0), NULL, NULL, to_timestamp(1782815857801 / 1000.0), to_timestamp(1785311393709 / 1000.0), to_timestamp(1785311393709 / 1000.0));
INSERT INTO "Enrollment" ("id", "userId", "courseId", "progress", "status", "enrolledAt", "completedAt", "certificateUrl", "lastAccessedAt", "createdAt", "updatedAt") VALUES ('cms5sb3ql002xq881ri530jsy', 'cms5sb3pm0007q881wm0lm9rw', 'cms5sb3pq000hq88104s1ez7j', 100, 'selesai', to_timestamp(1785311393710 / 1000.0), to_timestamp(1783641600000 / 1000.0), '/certs/cert-003.pdf', to_timestamp(1783465794551 / 1000.0), to_timestamp(1785311393710 / 1000.0), to_timestamp(1785311393710 / 1000.0));
INSERT INTO "Enrollment" ("id", "userId", "courseId", "progress", "status", "enrolledAt", "completedAt", "certificateUrl", "lastAccessedAt", "createdAt", "updatedAt") VALUES ('cms5sb3qn002zq881jctgsxny', 'cms5sb3pm0007q881wm0lm9rw', 'cms5sb3pq000dq881l9ahb23c', 50, 'dalam_proses', to_timestamp(1785311393711 / 1000.0), NULL, NULL, to_timestamp(1784329815860 / 1000.0), to_timestamp(1785311393711 / 1000.0), to_timestamp(1785311393711 / 1000.0));
INSERT INTO "Enrollment" ("id", "userId", "courseId", "progress", "status", "enrolledAt", "completedAt", "certificateUrl", "lastAccessedAt", "createdAt", "updatedAt") VALUES ('cms5sb3qn0031q881970hvx8x', 'cms5sb3pn0008q881hniw86wt', 'cms5sb3pr000nq8819h92t4yb', 0, 'belum_mula', to_timestamp(1785311393712 / 1000.0), NULL, NULL, to_timestamp(1785238577982 / 1000.0), to_timestamp(1785311393712 / 1000.0), to_timestamp(1785311393712 / 1000.0));
INSERT INTO "Enrollment" ("id", "userId", "courseId", "progress", "status", "enrolledAt", "completedAt", "certificateUrl", "lastAccessedAt", "createdAt", "updatedAt") VALUES ('cms5sb3qo0033q881oozrojeh', 'cms5sb3pn0008q881hniw86wt', 'cms5sb3pr000lq881fmp9nax8', 100, 'selesai', to_timestamp(1785311393712 / 1000.0), to_timestamp(1784073600000 / 1000.0), '/certs/cert-004.pdf', to_timestamp(1784253026368 / 1000.0), to_timestamp(1785311393712 / 1000.0), to_timestamp(1785311393712 / 1000.0));
INSERT INTO "Enrollment" ("id", "userId", "courseId", "progress", "status", "enrolledAt", "completedAt", "certificateUrl", "lastAccessedAt", "createdAt", "updatedAt") VALUES ('cms5sb3qo0035q881wuyecc5e', 'cms5sb3pn0008q881hniw86wt', 'cms5sb3pq000dq881l9ahb23c', 80, 'dalam_proses', to_timestamp(1785311393713 / 1000.0), NULL, NULL, to_timestamp(1784656994387 / 1000.0), to_timestamp(1785311393713 / 1000.0), to_timestamp(1785311393713 / 1000.0));
INSERT INTO "Enrollment" ("id", "userId", "courseId", "progress", "status", "enrolledAt", "completedAt", "certificateUrl", "lastAccessedAt", "createdAt", "updatedAt") VALUES ('cms5sb3qp0037q881ycbaybka', 'cms5sb3pk0001q8817ph5me2e', 'cms5sb3pr000jq881413j52q5', 100, 'selesai', to_timestamp(1785311393713 / 1000.0), to_timestamp(1779235200000 / 1000.0), '/certs/cert-005.pdf', to_timestamp(1783308699469 / 1000.0), to_timestamp(1785311393713 / 1000.0), to_timestamp(1785311393713 / 1000.0));
INSERT INTO "Enrollment" ("id", "userId", "courseId", "progress", "status", "enrolledAt", "completedAt", "certificateUrl", "lastAccessedAt", "createdAt", "updatedAt") VALUES ('cms5sb3qq0039q881qfoh179i', 'cms5sb3pl0002q881n77kjv7f', 'cms5sb3pp000bq881pei6y2a6', 30, 'dalam_proses', to_timestamp(1785311393714 / 1000.0), NULL, NULL, to_timestamp(1784806341480 / 1000.0), to_timestamp(1785311393714 / 1000.0), to_timestamp(1785311393714 / 1000.0));

-- Project (6 records)
INSERT INTO "Project" ("id", "projectName", "description", "budget", "projectManagerId", "status", "startDate", "endDate", "createdAt", "updatedAt") VALUES ('cms5sb3qr003dq8819c2rqpxh', 'Naik Taraf Sistem iGFMAS Modul Pembayaran', 'Penambahbaikan modul pembayaran dalam sistem kewangan iGFMAS.', 1200000, 'cms5sb3pl0002q881n77kjv7f', 'aktif', to_timestamp(1769904000000 / 1000.0), to_timestamp(1801353600000 / 1000.0), to_timestamp(1785311393715 / 1000.0), to_timestamp(1785311393715 / 1000.0));
INSERT INTO "Project" ("id", "projectName", "description", "budget", "projectManagerId", "status", "startDate", "endDate", "createdAt", "updatedAt") VALUES ('cms5sb3qr003cq8814i7hzcj5', 'Sistem Pentauliahan Pekerja (Onboarding Portal)', 'Pembangunan portal pentauliahan digital untuk pekerja baharu PERKESO.', 450000, 'cms5sb3pk0001q8817ph5me2e', 'aktif', to_timestamp(1768435200000 / 1000.0), to_timestamp(1798675200000 / 1000.0), to_timestamp(1785311393715 / 1000.0), to_timestamp(1785311393715 / 1000.0));
INSERT INTO "Project" ("id", "projectName", "description", "budget", "projectManagerId", "status", "startDate", "endDate", "createdAt", "updatedAt") VALUES ('cms5sb3qs003fq881if1eq80t', 'Latihan Keselamatan Siber Kakitangan 2026', 'Program latihan kesedaran keselamatan siber untuk semua kakitangan PERKESO.', 180000, 'cms5sb3pk0001q8817ph5me2e', 'selesai', to_timestamp(1767225600000 / 1000.0), to_timestamp(1782777600000 / 1000.0), to_timestamp(1785311393716 / 1000.0), to_timestamp(1785311393716 / 1000.0));
INSERT INTO "Project" ("id", "projectName", "description", "budget", "projectManagerId", "status", "startDate", "endDate", "createdAt", "updatedAt") VALUES ('cms5sb3qs003jq8819zyx322y', 'Pelaksanaan CRM untuk Cawangan PERKESO', 'Pengukuhan sistem pengurusan hubungan pelanggan di 10 cawangan utama.', 850000, 'cms5sb3pk0001q8817ph5me2e', 'aktif', to_timestamp(1773100800000 / 1000.0), to_timestamp(1795996800000 / 1000.0), to_timestamp(1785311393717 / 1000.0), to_timestamp(1785311393717 / 1000.0));
INSERT INTO "Project" ("id", "projectName", "description", "budget", "projectManagerId", "status", "startDate", "endDate", "createdAt", "updatedAt") VALUES ('cms5sb3qt003lq881awcubbhc', 'Migrasi Data Pencen ke Cloud AWS', 'Pemindahan pangkalan data pencen lama kepada penyelesaian cloud AWS.', 320000, 'cms5sb3pl0002q881n77kjv7f', 'aktif', to_timestamp(1775001600000 / 1000.0), to_timestamp(1790726400000 / 1000.0), to_timestamp(1785311393717 / 1000.0), to_timestamp(1785311393717 / 1000.0));
INSERT INTO "Project" ("id", "projectName", "description", "budget", "projectManagerId", "status", "startDate", "endDate", "createdAt", "updatedAt") VALUES ('cms5sb3qs003hq8818ztjmpvh', 'Pembangunan Aplikasi Mobile PERKESO Care', 'Aplikasi mudah alih untuk carian caruman dan tuntutan PERKESO.', 670000, 'cms5sb3pl0002q881n77kjv7f', 'aktif', to_timestamp(1771113600000 / 1000.0), to_timestamp(1802563200000 / 1000.0), to_timestamp(1785311393716 / 1000.0), to_timestamp(1785311393716 / 1000.0));

-- Invoice (15 records)
INSERT INTO "Invoice" ("id", "invoiceNo", "projectId", "vendorName", "vendorEmail", "amount", "invoiceDate", "dueDate", "status", "attachmentUrl", "attachmentName", "approvedById", "approvedAt", "paidAt", "remarks", "createdById", "createdAt", "updatedAt") VALUES ('cms5sb3qw003nq881u5vtihm2', 'INV-2026-001', 'cms5sb3qr003cq8814i7hzcj5', 'TechSoft Solutions Sdn Bhd', 'finance@techsoft.com.my', 45000, to_timestamp(1781423393719 / 1000.0), to_timestamp(1784015393719 / 1000.0), 'dibayar', '/invoices/inv-001.pdf', 'INV-2026-001-TechSoft.pdf', 'cms5sb3pk0001q8817ph5me2e', to_timestamp(1784706593719 / 1000.0), to_timestamp(1785311393719 / 1000.0), 'Pembayaran fasa 1 - siap dan disahkan', 'cms5sb3pl0003q881es4f12xr', to_timestamp(1785311393720 / 1000.0), to_timestamp(1785311393720 / 1000.0));
INSERT INTO "Invoice" ("id", "invoiceNo", "projectId", "vendorName", "vendorEmail", "amount", "invoiceDate", "dueDate", "status", "attachmentUrl", "attachmentName", "approvedById", "approvedAt", "paidAt", "remarks", "createdById", "createdAt", "updatedAt") VALUES ('cms5sb3r1003xq881ko29bywj', 'INV-2026-002', 'cms5sb3qr003cq8814i7hzcj5', 'DesignPro Studio', NULL, 18000, to_timestamp(1783583393719 / 1000.0), to_timestamp(1786175393719 / 1000.0), 'diluluskan', '/invoices/inv-002.pdf', 'INV-2026-002-DesignPro.pdf', 'cms5sb3pk0001q8817ph5me2e', to_timestamp(1784620193719 / 1000.0), NULL, 'Diluluskan untuk bayaran fasa 2', 'cms5sb3pl0004q881ax4i3t5t', to_timestamp(1785311393725 / 1000.0), to_timestamp(1785311393725 / 1000.0));
INSERT INTO "Invoice" ("id", "invoiceNo", "projectId", "vendorName", "vendorEmail", "amount", "invoiceDate", "dueDate", "status", "attachmentUrl", "attachmentName", "approvedById", "approvedAt", "paidAt", "remarks", "createdById", "createdAt", "updatedAt") VALUES ('cms5sb3r50045q88102lfi94y', 'INV-2026-003', 'cms5sb3qr003dq8819c2rqpxh', 'GlobalTech Systems Sdn Bhd', NULL, 150000, to_timestamp(1784015393719 / 1000.0), to_timestamp(1785138593719 / 1000.0), 'tertunggak', '/invoices/inv-003.pdf', 'INV-2026-003-GlobalTech.pdf', 'cms5sb3pl0002q881n77kjv7f', to_timestamp(1785052193719 / 1000.0), NULL, 'Diluluskan tetapi bayaran belum dibuat', 'cms5sb3pl0003q881es4f12xr', to_timestamp(1785311393729 / 1000.0), to_timestamp(1785311393729 / 1000.0));
INSERT INTO "Invoice" ("id", "invoiceNo", "projectId", "vendorName", "vendorEmail", "amount", "invoiceDate", "dueDate", "status", "attachmentUrl", "attachmentName", "approvedById", "approvedAt", "paidAt", "remarks", "createdById", "createdAt", "updatedAt") VALUES ('cms5sb3r8004fq881taquwxya', 'INV-2026-004', 'cms5sb3qr003dq8819c2rqpxh', 'DataNexus Sdn Bhd', NULL, 75000, to_timestamp(1784620193719 / 1000.0), to_timestamp(1787212193719 / 1000.0), 'menunggu_kelulusan', '/invoices/inv-004.pdf', 'INV-2026-004-DataNexus.pdf', NULL, NULL, NULL, 'Menunggu semakan PM', 'cms5sb3pl0004q881ax4i3t5t', to_timestamp(1785311393732 / 1000.0), to_timestamp(1785311393732 / 1000.0));
INSERT INTO "Invoice" ("id", "invoiceNo", "projectId", "vendorName", "vendorEmail", "amount", "invoiceDate", "dueDate", "status", "attachmentUrl", "attachmentName", "approvedById", "approvedAt", "paidAt", "remarks", "createdById", "createdAt", "updatedAt") VALUES ('cms5sb3ra004lq881npgmnb2b', 'INV-2026-005', 'cms5sb3qs003jq8819zyx322y', 'CloudFirst Consulting', NULL, 95000, to_timestamp(1782719393719 / 1000.0), to_timestamp(1785311393719 / 1000.0), 'dibayar', '/invoices/inv-005.pdf', 'INV-2026-005-CloudFirst.pdf', 'cms5sb3pk0001q8817ph5me2e', to_timestamp(1785052193719 / 1000.0), to_timestamp(1785138593719 / 1000.0), 'Pembayaran siap', 'cms5sb3pl0003q881es4f12xr', to_timestamp(1785311393735 / 1000.0), to_timestamp(1785311393735 / 1000.0));
INSERT INTO "Invoice" ("id", "invoiceNo", "projectId", "vendorName", "vendorEmail", "amount", "invoiceDate", "dueDate", "status", "attachmentUrl", "attachmentName", "approvedById", "approvedAt", "paidAt", "remarks", "createdById", "createdAt", "updatedAt") VALUES ('cms5sb3re004vq881gy5tj343', 'INV-2026-006', 'cms5sb3qs003jq8819zyx322y', 'SalesForce Malaysia', NULL, 280000, to_timestamp(1784879393719 / 1000.0), to_timestamp(1787471393719 / 1000.0), 'menunggu_kelulusan', '/invoices/inv-006.pdf', 'INV-2026-006-SalesForce.pdf', NULL, NULL, NULL, 'Jumlah besar - memerlukan kelulusan PM dan Kewangan', 'cms5sb3pl0004q881ax4i3t5t', to_timestamp(1785311393739 / 1000.0), to_timestamp(1785311393739 / 1000.0));
INSERT INTO "Invoice" ("id", "invoiceNo", "projectId", "vendorName", "vendorEmail", "amount", "invoiceDate", "dueDate", "status", "attachmentUrl", "attachmentName", "approvedById", "approvedAt", "paidAt", "remarks", "createdById", "createdAt", "updatedAt") VALUES ('cms5sb3rh0051q8817vk18dyo', 'INV-2026-007', 'cms5sb3qt003lq881awcubbhc', 'AWS Malaysia Sdn Bhd', NULL, 60000, to_timestamp(1783151393719 / 1000.0), to_timestamp(1785743393719 / 1000.0), 'diluluskan', '/invoices/inv-007.pdf', 'INV-2026-007-AWS.pdf', 'cms5sb3pl0002q881n77kjv7f', to_timestamp(1785224993719 / 1000.0), NULL, 'Diluluskan - bayaran dalam proses', 'cms5sb3pl0003q881es4f12xr', to_timestamp(1785311393742 / 1000.0), to_timestamp(1785311393742 / 1000.0));
INSERT INTO "Invoice" ("id", "invoiceNo", "projectId", "vendorName", "vendorEmail", "amount", "invoiceDate", "dueDate", "status", "attachmentUrl", "attachmentName", "approvedById", "approvedAt", "paidAt", "remarks", "createdById", "createdAt", "updatedAt") VALUES ('cms5sb3s10059q8817zt4rlge', 'INV-2026-008', 'cms5sb3qt003lq881awcubbhc', 'Migrator Pro Sdn Bhd', NULL, 42000, to_timestamp(1784447393719 / 1000.0), to_timestamp(1787039393719 / 1000.0), 'menunggu_kelulusan', '/invoices/inv-008.pdf', 'INV-2026-008-Migrator.pdf', NULL, NULL, NULL, 'Penghantaran dokumen lengkap', 'cms5sb3pl0004q881ax4i3t5t', to_timestamp(1785311393761 / 1000.0), to_timestamp(1785311393761 / 1000.0));
INSERT INTO "Invoice" ("id", "invoiceNo", "projectId", "vendorName", "vendorEmail", "amount", "invoiceDate", "dueDate", "status", "attachmentUrl", "attachmentName", "approvedById", "approvedAt", "paidAt", "remarks", "createdById", "createdAt", "updatedAt") VALUES ('cms5sb3sb005fq881am29zw1u', 'INV-2026-009', 'cms5sb3qs003fq881if1eq80t', 'CyberSafe Training', NULL, 25000, to_timestamp(1780127393719 / 1000.0), to_timestamp(1782719393719 / 1000.0), 'dibayar', '/invoices/inv-009.pdf', 'INV-2026-009-CyberSafe.pdf', 'cms5sb3pk0001q8817ph5me2e', to_timestamp(1784447393719 / 1000.0), to_timestamp(1785052193719 / 1000.0), 'Bayaran penuh - projek selesai', 'cms5sb3pl0003q881es4f12xr', to_timestamp(1785311393771 / 1000.0), to_timestamp(1785311393771 / 1000.0));
INSERT INTO "Invoice" ("id", "invoiceNo", "projectId", "vendorName", "vendorEmail", "amount", "invoiceDate", "dueDate", "status", "attachmentUrl", "attachmentName", "approvedById", "approvedAt", "paidAt", "remarks", "createdById", "createdAt", "updatedAt") VALUES ('cms5sb3se005pq881cn0ypo84', 'INV-2026-010', 'cms5sb3qs003fq881if1eq80t', 'LearnHub Asia', NULL, 12000, to_timestamp(1780991393719 / 1000.0), to_timestamp(1783583393719 / 1000.0), 'ditolak', '/invoices/inv-010.pdf', 'INV-2026-010-LearnHub.pdf', 'cms5sb3pk0001q8817ph5me2e', to_timestamp(1784792993719 / 1000.0), NULL, 'Ditolak - dokumentasi tidak lengkap. Sila hantar semula dengan kontrak ditandatangani.', 'cms5sb3pl0004q881ax4i3t5t', to_timestamp(1785311393774 / 1000.0), to_timestamp(1785311393774 / 1000.0));
INSERT INTO "Invoice" ("id", "invoiceNo", "projectId", "vendorName", "vendorEmail", "amount", "invoiceDate", "dueDate", "status", "attachmentUrl", "attachmentName", "approvedById", "approvedAt", "paidAt", "remarks", "createdById", "createdAt", "updatedAt") VALUES ('cms5sb3sh005xq881z6l4ku5l', 'INV-2026-011', 'cms5sb3qs003hq8818ztjmpvh', 'MobileFirst Sdn Bhd', NULL, 85000, to_timestamp(1785052193719 / 1000.0), to_timestamp(1787644193719 / 1000.0), 'draf', NULL, NULL, NULL, NULL, NULL, NULL, 'cms5sb3pl0003q881es4f12xr', to_timestamp(1785311393777 / 1000.0), to_timestamp(1785311393777 / 1000.0));
INSERT INTO "Invoice" ("id", "invoiceNo", "projectId", "vendorName", "vendorEmail", "amount", "invoiceDate", "dueDate", "status", "attachmentUrl", "attachmentName", "approvedById", "approvedAt", "paidAt", "remarks", "createdById", "createdAt", "updatedAt") VALUES ('cms5sb3si0061q881suux2xsj', 'INV-2026-012', 'cms5sb3qs003hq8818ztjmpvh', 'UIUX Studio Asia', NULL, 35000, to_timestamp(1785138593719 / 1000.0), to_timestamp(1787730593719 / 1000.0), 'draf', NULL, NULL, NULL, NULL, NULL, NULL, 'cms5sb3pl0004q881ax4i3t5t', to_timestamp(1785311393779 / 1000.0), to_timestamp(1785311393779 / 1000.0));
INSERT INTO "Invoice" ("id", "invoiceNo", "projectId", "vendorName", "vendorEmail", "amount", "invoiceDate", "dueDate", "status", "attachmentUrl", "attachmentName", "approvedById", "approvedAt", "paidAt", "remarks", "createdById", "createdAt", "updatedAt") VALUES ('cms5sb3sk0065q881u8aa8vo6', 'INV-2026-013', 'cms5sb3qr003cq8814i7hzcj5', 'TechSoft Solutions Sdn Bhd', 'finance@techsoft.com.my', 52000, to_timestamp(1785224993719 / 1000.0), to_timestamp(1787816993719 / 1000.0), 'menunggu_kelulusan', '/invoices/inv-013.pdf', 'INV-2026-013-TechSoft.pdf', NULL, NULL, NULL, 'Pembayaran fasa akhir', 'cms5sb3pl0003q881es4f12xr', to_timestamp(1785311393780 / 1000.0), to_timestamp(1785311393780 / 1000.0));
INSERT INTO "Invoice" ("id", "invoiceNo", "projectId", "vendorName", "vendorEmail", "amount", "invoiceDate", "dueDate", "status", "attachmentUrl", "attachmentName", "approvedById", "approvedAt", "paidAt", "remarks", "createdById", "createdAt", "updatedAt") VALUES ('cms5sb3sm006bq8816v30yqds', 'INV-2026-014', 'cms5sb3qr003dq8819c2rqpxh', 'InfraBuild Sdn Bhd', NULL, 95000, to_timestamp(1781855393719 / 1000.0), to_timestamp(1784447393719 / 1000.0), 'tertunggak', '/invoices/inv-014.pdf', 'INV-2026-014-InfraBuild.pdf', 'cms5sb3pl0002q881n77kjv7f', to_timestamp(1784792993719 / 1000.0), NULL, 'Diluluskan - tertunggak bayaran', 'cms5sb3pl0003q881es4f12xr', to_timestamp(1785311393782 / 1000.0), to_timestamp(1785311393782 / 1000.0));
INSERT INTO "Invoice" ("id", "invoiceNo", "projectId", "vendorName", "vendorEmail", "amount", "invoiceDate", "dueDate", "status", "attachmentUrl", "attachmentName", "approvedById", "approvedAt", "paidAt", "remarks", "createdById", "createdAt", "updatedAt") VALUES ('cms5sb3so006lq881j6yhp6ht', 'INV-2026-015', 'cms5sb3qs003jq8819zyx322y', 'MarketPro Agency', NULL, 22000, to_timestamp(1782287393719 / 1000.0), to_timestamp(1785743393719 / 1000.0), 'dibayar', '/invoices/inv-015.pdf', 'INV-2026-015-MarketPro.pdf', 'cms5sb3pk0001q8817ph5me2e', to_timestamp(1784879393719 / 1000.0), to_timestamp(1784965793719 / 1000.0), 'Bayaran selesai', 'cms5sb3pl0004q881ax4i3t5t', to_timestamp(1785311393785 / 1000.0), to_timestamp(1785311393785 / 1000.0));

-- InvoiceHistory (43 records)
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3qx003pq881s68cjrin', 'cms5sb3qw003nq881u5vtihm2', 'created', NULL, 'draf', NULL, 'cms5sb3pl0003q881es4f12xr', to_timestamp(1781423393719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3qy003rq881i2bmelpa', 'cms5sb3qw003nq881u5vtihm2', 'status_changed', 'draf', 'menunggu_kelulusan', NULL, 'cms5sb3pl0003q881es4f12xr', to_timestamp(1781509793719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3qz003tq881yzwf70k8', 'cms5sb3qw003nq881u5vtihm2', 'approved', 'menunggu_kelulusan', 'diluluskan', 'Pembayaran fasa 1 - siap dan disahkan', 'cms5sb3pk0001q8817ph5me2e', to_timestamp(1784706593719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3r0003vq8817pd303vi', 'cms5sb3qw003nq881u5vtihm2', 'paid', 'diluluskan', 'dibayar', 'Pembayaran berjaya dilakukan', 'cms5sb3pl0003q881es4f12xr', to_timestamp(1785311393719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3r2003zq881vvlm5ewm', 'cms5sb3r1003xq881ko29bywj', 'created', NULL, 'draf', NULL, 'cms5sb3pl0004q881ax4i3t5t', to_timestamp(1783583393719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3r30041q881hqlowkpu', 'cms5sb3r1003xq881ko29bywj', 'status_changed', 'draf', 'menunggu_kelulusan', NULL, 'cms5sb3pl0004q881ax4i3t5t', to_timestamp(1783669793719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3r40043q8814rn0a2v4', 'cms5sb3r1003xq881ko29bywj', 'approved', 'menunggu_kelulusan', 'diluluskan', 'Diluluskan untuk bayaran fasa 2', 'cms5sb3pk0001q8817ph5me2e', to_timestamp(1784620193719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3r50047q8814ywkvjdr', 'cms5sb3r50045q88102lfi94y', 'created', NULL, 'draf', NULL, 'cms5sb3pl0003q881es4f12xr', to_timestamp(1784015393719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3r60049q881khresoro', 'cms5sb3r50045q88102lfi94y', 'status_changed', 'draf', 'menunggu_kelulusan', NULL, 'cms5sb3pl0003q881es4f12xr', to_timestamp(1784101793719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3r6004bq881i5f90g6j', 'cms5sb3r50045q88102lfi94y', 'approved', 'menunggu_kelulusan', 'diluluskan', 'Diluluskan tetapi bayaran belum dibuat', 'cms5sb3pl0002q881n77kjv7f', to_timestamp(1785052193719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3r7004dq8819rfwt8mq', 'cms5sb3r50045q88102lfi94y', 'status_changed', 'diluluskan', 'tertunggak', 'Invois tertunggak - melebihi tarikh matang', 'cms5sb3pl0002q881n77kjv7f', to_timestamp(1785311393730 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3r9004hq881k593ok8u', 'cms5sb3r8004fq881taquwxya', 'created', NULL, 'draf', NULL, 'cms5sb3pl0004q881ax4i3t5t', to_timestamp(1784620193719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3r9004jq881gn2afgqw', 'cms5sb3r8004fq881taquwxya', 'status_changed', 'draf', 'menunggu_kelulusan', NULL, 'cms5sb3pl0004q881ax4i3t5t', to_timestamp(1784706593719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3rb004nq881tgtrwfie', 'cms5sb3ra004lq881npgmnb2b', 'created', NULL, 'draf', NULL, 'cms5sb3pl0003q881es4f12xr', to_timestamp(1782719393719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3rc004pq8818r07ozgr', 'cms5sb3ra004lq881npgmnb2b', 'status_changed', 'draf', 'menunggu_kelulusan', NULL, 'cms5sb3pl0003q881es4f12xr', to_timestamp(1782805793719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3rd004rq881ydjotq2v', 'cms5sb3ra004lq881npgmnb2b', 'approved', 'menunggu_kelulusan', 'diluluskan', 'Pembayaran siap', 'cms5sb3pk0001q8817ph5me2e', to_timestamp(1785052193719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3re004tq88144vhm7lv', 'cms5sb3ra004lq881npgmnb2b', 'paid', 'diluluskan', 'dibayar', 'Pembayaran berjaya dilakukan', 'cms5sb3pl0003q881es4f12xr', to_timestamp(1785138593719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3rf004xq881dvn1w2nw', 'cms5sb3re004vq881gy5tj343', 'created', NULL, 'draf', NULL, 'cms5sb3pl0004q881ax4i3t5t', to_timestamp(1784879393719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3rg004zq8811fckiw49', 'cms5sb3re004vq881gy5tj343', 'status_changed', 'draf', 'menunggu_kelulusan', NULL, 'cms5sb3pl0004q881ax4i3t5t', to_timestamp(1784965793719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3ri0053q881s5rd5sum', 'cms5sb3rh0051q8817vk18dyo', 'created', NULL, 'draf', NULL, 'cms5sb3pl0003q881es4f12xr', to_timestamp(1783151393719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3ri0055q8815gwy5frg', 'cms5sb3rh0051q8817vk18dyo', 'status_changed', 'draf', 'menunggu_kelulusan', NULL, 'cms5sb3pl0003q881es4f12xr', to_timestamp(1783237793719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3rj0057q88145b5q36r', 'cms5sb3rh0051q8817vk18dyo', 'approved', 'menunggu_kelulusan', 'diluluskan', 'Diluluskan - bayaran dalam proses', 'cms5sb3pl0002q881n77kjv7f', to_timestamp(1785224993719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3s7005bq881zmdyd16q', 'cms5sb3s10059q8817zt4rlge', 'created', NULL, 'draf', NULL, 'cms5sb3pl0004q881ax4i3t5t', to_timestamp(1784447393719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3sa005dq881rqc1ju1n', 'cms5sb3s10059q8817zt4rlge', 'status_changed', 'draf', 'menunggu_kelulusan', NULL, 'cms5sb3pl0004q881ax4i3t5t', to_timestamp(1784533793719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3sc005hq881bvtcebd4', 'cms5sb3sb005fq881am29zw1u', 'created', NULL, 'draf', NULL, 'cms5sb3pl0003q881es4f12xr', to_timestamp(1780127393719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3sc005jq881qonxqaod', 'cms5sb3sb005fq881am29zw1u', 'status_changed', 'draf', 'menunggu_kelulusan', NULL, 'cms5sb3pl0003q881es4f12xr', to_timestamp(1780213793719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3sd005lq881gmn70a38', 'cms5sb3sb005fq881am29zw1u', 'approved', 'menunggu_kelulusan', 'diluluskan', 'Bayaran penuh - projek selesai', 'cms5sb3pk0001q8817ph5me2e', to_timestamp(1784447393719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3sd005nq881ik5292hr', 'cms5sb3sb005fq881am29zw1u', 'paid', 'diluluskan', 'dibayar', 'Pembayaran berjaya dilakukan', 'cms5sb3pl0003q881es4f12xr', to_timestamp(1785052193719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3sf005rq88120415edc', 'cms5sb3se005pq881cn0ypo84', 'created', NULL, 'draf', NULL, 'cms5sb3pl0004q881ax4i3t5t', to_timestamp(1780991393719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3sf005tq88172p8fnje', 'cms5sb3se005pq881cn0ypo84', 'status_changed', 'draf', 'menunggu_kelulusan', NULL, 'cms5sb3pl0004q881ax4i3t5t', to_timestamp(1781077793719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3sg005vq881htvw4fv3', 'cms5sb3se005pq881cn0ypo84', 'rejected', 'menunggu_kelulusan', 'ditolak', 'Ditolak - dokumentasi tidak lengkap. Sila hantar semula dengan kontrak ditandatangani.', 'cms5sb3pk0001q8817ph5me2e', to_timestamp(1784792993719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3si005zq881vxfdm2sq', 'cms5sb3sh005xq881z6l4ku5l', 'created', NULL, 'draf', NULL, 'cms5sb3pl0003q881es4f12xr', to_timestamp(1785052193719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3sj0063q88125o7m79q', 'cms5sb3si0061q881suux2xsj', 'created', NULL, 'draf', NULL, 'cms5sb3pl0004q881ax4i3t5t', to_timestamp(1785138593719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3sk0067q881m29dv2d6', 'cms5sb3sk0065q881u8aa8vo6', 'created', NULL, 'draf', NULL, 'cms5sb3pl0003q881es4f12xr', to_timestamp(1785224993719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3sl0069q881jri9p6hh', 'cms5sb3sk0065q881u8aa8vo6', 'status_changed', 'draf', 'menunggu_kelulusan', NULL, 'cms5sb3pl0003q881es4f12xr', to_timestamp(1785311393719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3sn006dq8814i2698hq', 'cms5sb3sm006bq8816v30yqds', 'created', NULL, 'draf', NULL, 'cms5sb3pl0003q881es4f12xr', to_timestamp(1781855393719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3sn006fq88162vx5rpy', 'cms5sb3sm006bq8816v30yqds', 'status_changed', 'draf', 'menunggu_kelulusan', NULL, 'cms5sb3pl0003q881es4f12xr', to_timestamp(1781941793719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3so006hq881kqdg1irh', 'cms5sb3sm006bq8816v30yqds', 'approved', 'menunggu_kelulusan', 'diluluskan', 'Diluluskan - tertunggak bayaran', 'cms5sb3pl0002q881n77kjv7f', to_timestamp(1784792993719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3so006jq881ax8e3ot9', 'cms5sb3sm006bq8816v30yqds', 'status_changed', 'diluluskan', 'tertunggak', 'Invois tertunggak - melebihi tarikh matang', 'cms5sb3pl0002q881n77kjv7f', to_timestamp(1785311393784 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3sp006nq881qd8ozk2l', 'cms5sb3so006lq881j6yhp6ht', 'created', NULL, 'draf', NULL, 'cms5sb3pl0004q881ax4i3t5t', to_timestamp(1782287393719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3sq006pq8816as8russ', 'cms5sb3so006lq881j6yhp6ht', 'status_changed', 'draf', 'menunggu_kelulusan', NULL, 'cms5sb3pl0004q881ax4i3t5t', to_timestamp(1782373793719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3sr006rq881l2dhhq81', 'cms5sb3so006lq881j6yhp6ht', 'approved', 'menunggu_kelulusan', 'diluluskan', 'Bayaran selesai', 'cms5sb3pk0001q8817ph5me2e', to_timestamp(1784879393719 / 1000.0));
INSERT INTO "InvoiceHistory" ("id", "invoiceId", "action", "fromStatus", "toStatus", "remarks", "userId", "createdAt") VALUES ('cms5sb3sr006tq881938oi86t', 'cms5sb3so006lq881j6yhp6ht', 'paid', 'diluluskan', 'dibayar', 'Pembayaran berjaya dilakukan', 'cms5sb3pl0004q881ax4i3t5t', to_timestamp(1784965793719 / 1000.0));

-- Notification (10 records)
INSERT INTO "Notification" ("id", "userId", "title", "message", "type", "category", "isRead", "link", "createdAt") VALUES ('cms5sb3st006vq8816qnamx1w', 'cms5sb3pk0001q8817ph5me2e', 'Invois Tertunggak Memerlukan Tindakan', 'INV-2026-003 daripada GlobalTech Systems Sdn Bhd telah melebihi tarikh matang. Sila uruskan bayaran.', 'error', 'invoice', false, 'invoices', to_timestamp(1785049485076 / 1000.0));
INSERT INTO "Notification" ("id", "userId", "title", "message", "type", "category", "isRead", "link", "createdAt") VALUES ('cms5sb3su006xq881u4cs970q', 'cms5sb3pk0001q8817ph5me2e', 'Invois Baharu Menunggu Kelulusan', 'INV-2026-013 sebanyak RM 52,000 menunggu kelulusan anda.', 'warning', 'invoice', false, 'invoices', to_timestamp(1785138942104 / 1000.0));
INSERT INTO "Notification" ("id", "userId", "title", "message", "type", "category", "isRead", "link", "createdAt") VALUES ('cms5sb3su006zq881iigvpwlg', 'cms5sb3pl0002q881n77kjv7f', '2 Invois Menunggu Kelulusan', 'Anda mempunyai 2 invois menunggu semakan: INV-2026-004 dan INV-2026-008.', 'warning', 'invoice', true, 'invoices', to_timestamp(1785306863408 / 1000.0));
INSERT INTO "Notification" ("id", "userId", "title", "message", "type", "category", "isRead", "link", "createdAt") VALUES ('cms5sb3sv0071q881c34fk4zj', 'cms5sb3pl0002q881n77kjv7f', 'Invois Besar Memerlukan Perhatian', 'INV-2026-006 sebanyak RM 280,000 memerlukan kelulusan PM dan Kewangan.', 'warning', 'invoice', true, 'invoices', to_timestamp(1785190543800 / 1000.0));
INSERT INTO "Notification" ("id", "userId", "title", "message", "type", "category", "isRead", "link", "createdAt") VALUES ('cms5sb3sx0073q8819jygg0xn', 'cms5sb3pm0005q881lboq4dv6', 'Selamat Datang ke LMS PERKESO', 'Anda telah didaftarkan ke 3 kursus latihan. Sila mula pembelajaran anda.', 'info', 'course', true, 'my-learning', to_timestamp(1785204719598 / 1000.0));
INSERT INTO "Notification" ("id", "userId", "title", "message", "type", "category", "isRead", "link", "createdAt") VALUES ('cms5sb3sz0075q881fxa3ls7s', 'cms5sb3pm0005q881lboq4dv6', 'Sijil Diterima', 'Tahniah! Anda telah menamatkan kursus "Asas Pengurusan Projek (PMBOK 7)". Sijil sedia untuk dimuat turun.', 'success', 'course', false, 'my-learning', to_timestamp(1784919737786 / 1000.0));
INSERT INTO "Notification" ("id", "userId", "title", "message", "type", "category", "isRead", "link", "createdAt") VALUES ('cms5sb3sz0077q881oo1p05sm', 'cms5sb3pm0006q881wp6f3asp', 'Kursus Baharu Tersedia', 'Kursus "Pengurusan Invois & Kawalan Kewangan Projek" kini tersedia untuk pendaftaran.', 'info', 'course', false, 'courses', to_timestamp(1785261171686 / 1000.0));
INSERT INTO "Notification" ("id", "userId", "title", "message", "type", "category", "isRead", "link", "createdAt") VALUES ('cms5sb3t00079q8819tm31upw', 'cms5sb3pm0007q881wm0lm9rw', 'Sijil Diterima', 'Tahniah! Anda telah menamatkan kursus Pengurusan Invois.', 'success', 'course', false, 'my-learning', to_timestamp(1785030633639 / 1000.0));
INSERT INTO "Notification" ("id", "userId", "title", "message", "type", "category", "isRead", "link", "createdAt") VALUES ('cms5sb3t1007bq8817mkaqzde', 'cms5sb3pn0008q881hniw86wt', 'Selamat Datang ke LMS PERKESO', 'Anda telah didaftarkan ke 3 kursus. Mulakan pembelajaran anda sekarang.', 'info', 'course', false, 'my-learning', to_timestamp(1785170415772 / 1000.0));
INSERT INTO "Notification" ("id", "userId", "title", "message", "type", "category", "isRead", "link", "createdAt") VALUES ('cms5sb3t2007dq88149u3mlrh', 'cms5sb3pn0009q8813pybljv6', 'Laporan Kewangan Bulanan Sedia', 'Laporan ringkasan kewangan projek untuk Julai 2026 sedia untuk semakan.', 'info', 'system', true, 'reports', to_timestamp(1784972746191 / 1000.0));

SET session_replication_role = 'origin';

-- Seed complete! LMS-ITS PERKESO dummy data loaded.
--
-- Login credentials:
--   admin@perkeso.gov.my / admin123 (Pentadbir Sistem)
--   pm@perkeso.gov.my / pm123 (Pengurus Projek)
--   padmin@perkeso.gov.my / padmin123 (Pentadbir Projek)
--   staff1@perkeso.gov.my / staff123 (Peserta Latihan)
--   upper@perkeso.gov.my / upper123 (Pengurusan Atasan)
