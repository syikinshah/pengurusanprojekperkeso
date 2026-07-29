// Shared types for the LMS-ITS system (mirrors Prisma models for client use)

export type Role =
  | "admin"
  | "project_manager"
  | "project_admin"
  | "trainee"
  | "upper_management";

export type CourseStatus = "aktif" | "tidak_aktif" | "draf";
export type EnrollmentStatus = "belum_mula" | "dalam_proses" | "selesai";
export type InvoiceStatus =
  | "draf"
  | "menunggu_kelulusan"
  | "diluluskan"
  | "dibayar"
  | "ditolak"
  | "tertunggak";
export type ProjectStatus = "aktif" | "selesai" | "ditangguh" | "dibatalkan";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  department: string;
  position?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Material {
  id: string;
  courseId: string;
  title: string;
  type: "pdf" | "video" | "slide" | "link" | "document";
  url: string;
  description?: string | null;
  duration?: number | null;
  order: number;
  createdAt: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  duration: number;
  instructor?: string | null;
  thumbnailUrl?: string | null;
  status: CourseStatus;
  createdBy: string;
  creator?: Pick<User, "id" | "name">;
  createdAt: string;
  updatedAt: string;
  materials?: Material[];
  quizzes?: Quiz[];
  enrollments?: Enrollment[];
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  user?: User;
  course?: Course;
  progress: number;
  status: EnrollmentStatus;
  enrolledAt: string;
  completedAt?: string | null;
  certificateUrl?: string | null;
  lastAccessedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  id: string;
  quizId: string;
  text: string;
  type: "single" | "multiple" | "true_false";
  options: string[];
  answer: number[];
  points: number;
  order: number;
}

export interface Quiz {
  id: string;
  courseId: string;
  title: string;
  description?: string | null;
  passScore: number;
  duration: number;
  order: number;
  createdAt: string;
  questions?: Question[];
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  score: number;
  totalPoints: number;
  earnedPoints: number;
  passed: boolean;
  answers: string;
  startedAt: string;
  completedAt?: string | null;
}

export interface Project {
  id: string;
  projectName: string;
  description?: string | null;
  budget: number;
  projectManagerId?: string | null;
  projectManager?: User | null;
  status: ProjectStatus;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
  invoices?: Invoice[];
  _count?: { invoices: number };
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  projectId: string;
  project?: Project;
  vendorName: string;
  vendorEmail?: string | null;
  amount: number;
  invoiceDate: string;
  dueDate: string;
  status: InvoiceStatus;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  approvedById?: string | null;
  approvedBy?: User | null;
  approvedAt?: string | null;
  paidAt?: string | null;
  remarks?: string | null;
  createdById?: string | null;
  createdBy?: User | null;
  createdAt: string;
  updatedAt: string;
  history?: InvoiceHistory[];
}

export interface InvoiceHistory {
  id: string;
  invoiceId: string;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  remarks?: string | null;
  userId?: string | null;
  user?: User | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  category: "invoice" | "course" | "system" | "general";
  isRead: boolean;
  link?: string | null;
  createdAt: string;
}

// Role labels in Bahasa Malaysia
export const ROLE_LABELS: Record<Role, string> = {
  admin: "Pentadbir Sistem",
  project_manager: "Pengurus Projek",
  project_admin: "Pentadbir Projek",
  trainee: "Peserta Latihan",
  upper_management: "Pengurusan Atasan",
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draf: "Draf",
  menunggu_kelulusan: "Menunggu Kelulusan",
  diluluskan: "Diluluskan",
  dibayar: "Dibayar",
  ditolak: "Ditolak",
  tertunggak: "Tertunggak",
};

export const INVOICE_STATUS_CLASS: Record<InvoiceStatus, string> = {
  dibayar: "status-dibayar",
  diluluskan: "status-diluluskan",
  menunggu_kelulusan: "status-menunggu",
  draf: "status-draf",
  ditolak: "status-ditolak",
  tertunggak: "status-tertunggak",
};

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  belum_mula: "Belum Mula",
  dalam_proses: "Dalam Proses",
  selesai: "Selesai",
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  aktif: "Aktif",
  selesai: "Selesai",
  ditangguh: "Ditangguh",
  dibatalkan: "Dibatalkan",
};

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ms-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function daysBetween(a: string | Date, b: string | Date): number {
  const d1 = new Date(a).getTime();
  const d2 = new Date(b).getTime();
  return Math.round((d2 - d1) / 86400000);
}
