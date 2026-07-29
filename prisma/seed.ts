import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

// Hash a simple password (dummy, plaintext for POC)
const hash = (p: string) => `hash_${p}`

async function main() {
  console.log('🌱 Seeding LMS-ITS database...')

  // Clear existing data
  await db.notification.deleteMany()
  await db.invoiceHistory.deleteMany()
  await db.invoice.deleteMany()
  await db.project.deleteMany()
  await db.quizAttempt.deleteMany()
  await db.question.deleteMany()
  await db.quiz.deleteMany()
  await db.material.deleteMany()
  await db.enrollment.deleteMany()
  await db.course.deleteMany()
  await db.user.deleteMany()

  // ============================
  // USERS
  // ============================
  const users = await Promise.all([
    db.user.create({ data: { email: 'admin@perkeso.gov.my', password: hash('admin123'), name: 'Aisyah binti Rahman', role: 'admin', department: 'PMU', position: 'Pentadbir Sistem', phone: '+603-4264-5555' } }),
    db.user.create({ data: { email: 'pm@perkeso.gov.my', password: hash('pm123'), name: 'Mohd Faizal bin Hassan', role: 'project_manager', department: 'PMU', position: 'Pengurus Projek Senior', phone: '+603-4264-5556' } }),
    db.user.create({ data: { email: 'pm2@perkeso.gov.my', password: hash('pm123'), name: 'Siti Nurhaliza binti Abdullah', role: 'project_manager', department: 'PMU', position: 'Pengurus Projek', phone: '+603-4264-5557' } }),
    db.user.create({ data: { email: 'padmin@perkeso.gov.my', password: hash('padmin123'), name: 'Tan Wei Ming', role: 'project_admin', department: 'PMU', position: 'Pentadbir Projek', phone: '+603-4264-5558' } }),
    db.user.create({ data: { email: 'padmin2@perkeso.gov.my', password: hash('padmin123'), name: 'Lim Mei Ling', role: 'project_admin', department: 'PMU', position: 'Pentadbir Projek', phone: '+603-4264-5559' } }),
    db.user.create({ data: { email: 'staff1@perkeso.gov.my', password: hash('staff123'), name: 'Nurul Aini binti Yusof', role: 'trainee', department: 'PMU', position: 'Pegawai Latihan', phone: '+603-4264-5560' } }),
    db.user.create({ data: { email: 'staff2@perkeso.gov.my', password: hash('staff123'), name: 'Ahmad Zulkifli bin Ibrahim', role: 'trainee', department: 'PMU', position: 'Pegawai Operasi', phone: '+603-4264-5561' } }),
    db.user.create({ data: { email: 'staff3@perkeso.gov.my', password: hash('staff123'), name: 'Kavitha a/p Raju', role: 'trainee', department: 'PMU', position: 'Pegawai Kewangan', phone: '+603-4264-5562' } }),
    db.user.create({ data: { email: 'staff4@perkeso.gov.my', password: hash('staff123'), name: 'Roziana binti Othman', role: 'trainee', department: 'PMU', position: 'Pegawai Pentadbiran', phone: '+603-4264-5563' } }),
    db.user.create({ data: { email: 'upper@perkeso.gov.my', password: hash('upper123'), name: 'Dato\' Ramli bin Saad', role: 'upper_management', department: 'PMU', position: 'Pengurus Atasan', phone: '+603-4264-5500' } }),
  ])

  const [admin, pm1, pm2, padmin1, padmin2, t1, t2, t3, t4] = users
  console.log(`✓ Created ${users.length} users`)

  // ============================
  // COURSES (LMS)
  // ============================
  const courses = await Promise.all([
    db.course.create({
      data: {
        title: 'Asas Pengurusan Projek (PMBOK 7)',
        description: 'Kursus asas pengurusan projek mengikut rangka kerja PMBOK edisi ke-7. Merangkumi 5 kumpulan proses dan 10 kawasan pengetahuan.',
        category: 'Pengurusan',
        level: 'Asas',
        duration: 12,
        instructor: 'Mohd Faizal bin Hassan',
        status: 'aktif',
        createdBy: padmin1.id,
      }
    }),
    db.course.create({
      data: {
        title: 'Agile & Scrum Methodology',
        description: 'Pengenalan kepada metodologi Agile dan rangka kerja Scrum untuk pengurusan projek software. Termasuk peranan Scrum Master, Product Owner dan acara-acara Scrum.',
        category: 'Teknikal',
        level: 'Pertengahan',
        duration: 8,
        instructor: 'Tan Wei Ming',
        status: 'aktif',
        createdBy: padmin1.id,
      }
    }),
    db.course.create({
      data: {
        title: 'Pengurusan Invois & Kawalan Kewangan Projek',
        description: 'Kursus pengurusan kewangan projek, penjejakan invois, kawalan bajet dan pelaporan kewangan mengikut garis panduan perbendaharaan.',
        category: 'Kewangan',
        level: 'Pertengahan',
        duration: 10,
        instructor: 'Lim Mei Ling',
        status: 'aktif',
        createdBy: padmin2.id,
      }
    }),
    db.course.create({
      data: {
        title: 'Keselamatan Siber & Perlindungan Data',
        description: 'Kesedaran keselamatan siber, perlindungan data peribadi (PDPA), dan amalan terbaik keselamatan maklumat untuk kakitangan.',
        category: 'Teknologi',
        level: 'Asas',
        duration: 6,
        instructor: 'Tan Wei Ming',
        status: 'aktif',
        createdBy: padmin1.id,
      }
    }),
    db.course.create({
      data: {
        title: 'Microsoft Power BI untuk Pelaporan Projek',
        description: 'Membina dashboard interaktif dan laporan visual menggunakan Power BI untuk pemantauan prestasi dan kewangan projek.',
        category: 'Teknologi',
        level: 'Lanjutan',
        duration: 14,
        instructor: 'Lim Mei Ling',
        status: 'aktif',
        createdBy: padmin2.id,
      }
    }),
    db.course.create({
      data: {
        title: 'Komunikasi Berkesan & Pengurusan Pasukan',
        description: 'Kemahiran komunikasi profesional, pengurusan konflik dalam pasukan, dan kepimpinan kolaboratif untuk pengurus projek.',
        category: 'Pengurusan',
        level: 'Pertengahan',
        duration: 9,
        instructor: 'Siti Nurhaliza binti Abdullah',
        status: 'aktif',
        createdBy: padmin2.id,
      }
    }),
    db.course.create({
      data: {
        title: 'Procurement & Kontrak Vendor PERKESO',
        description: 'Proses perolehan, pengurusan kontrak vendor, penilaian prestasi vendor dan pematuhan polisi perbendaharaan.',
        category: 'Pengurusan',
        level: 'Lanjutan',
        duration: 11,
        instructor: 'Mohd Faizal bin Hassan',
        status: 'draf',
        createdBy: padmin1.id,
      }
    }),
  ])
  console.log(`✓ Created ${courses.length} courses`)

  // ============================
  // MATERIALS
  // ============================
  const materialsData = [
    // Course 0: Asas Pengurusan Projek
    { courseIdx: 0, title: 'Pengenalan PMBOK 7 - Sistem Penyampaian Nilai', type: 'pdf', url: '/materials/pmbok7-intro.pdf', duration: 45, order: 1 },
    { courseIdx: 0, title: 'Video: 12 Prinsip Pengurusan Projek', type: 'video', url: '/materials/pmbok-principles.mp4', duration: 30, order: 2 },
    { courseIdx: 0, title: 'Slaid: Kumpulan Proses & Kawasan Pengetahuan', type: 'slide', url: '/materials/pmbok-processes.pdf', duration: 60, order: 3 },
    { courseIdx: 0, title: 'Dokumen: Templat Rancangan Projek (Project Charter)', type: 'document', url: '/materials/project-charter-template.docx', duration: 20, order: 4 },
    // Course 1: Agile & Scrum
    { courseIdx: 1, title: 'Pengenalan Agile Manifesto', type: 'pdf', url: '/materials/agile-manifesto.pdf', duration: 25, order: 1 },
    { courseIdx: 1, title: 'Video: Scrum Framework Overview', type: 'video', url: '/materials/scrum-overview.mp4', duration: 40, order: 2 },
    { courseIdx: 1, title: 'Slaid: Acara-acara Scrum', type: 'slide', url: '/materials/scrum-events.pdf', duration: 35, order: 3 },
    // Course 2: Pengurusan Invois
    { courseIdx: 2, title: 'Garis Panduan Pengurusan Invois PERKESO', type: 'pdf', url: '/materials/invoice-guidelines.pdf', duration: 50, order: 1 },
    { courseIdx: 2, title: 'Video: Aliran Kelulusan Invois', type: 'video', url: '/materials/invoice-approval-flow.mp4', duration: 25, order: 2 },
    { courseIdx: 2, title: 'Slaid: Kawalan Bajet Projek', type: 'slide', url: '/materials/budget-control.pdf', duration: 45, order: 3 },
    // Course 3: Keselamatan Siber
    { courseIdx: 3, title: 'Pengenalan PDPA & Perlindungan Data', type: 'pdf', url: '/materials/pdpa-intro.pdf', duration: 30, order: 1 },
    { courseIdx: 3, title: 'Video: Phishing & Ancaman Siber', type: 'video', url: '/materials/phishing-threats.mp4', duration: 20, order: 2 },
    // Course 4: Power BI
    { courseIdx: 4, title: 'Pemasangan & Persediaan Power BI Desktop', type: 'pdf', url: '/materials/powerbi-setup.pdf', duration: 40, order: 1 },
    { courseIdx: 4, title: 'Video: Membina Visual Asas', type: 'video', url: '/materials/powerbi-visuals.mp4', duration: 55, order: 2 },
    { courseIdx: 4, title: 'Slaid: DAX Functions Asas', type: 'slide', url: '/materials/dax-basics.pdf', duration: 60, order: 3 },
    // Course 5: Komunikasi
    { courseIdx: 5, title: 'Prinsip Komunikasi Berkesan', type: 'pdf', url: '/materials/communication-principles.pdf', duration: 35, order: 1 },
    { courseIdx: 5, title: 'Video: Pengurusan Konflik', type: 'video', url: '/materials/conflict-management.mp4', duration: 30, order: 2 },
    // Course 6: Procurement
    { courseIdx: 6, title: 'Proses Perolehan PERKESO', type: 'pdf', url: '/materials/procurement-process.pdf', duration: 60, order: 1 },
  ]

  for (const m of materialsData) {
    await db.material.create({
      data: {
        courseId: courses[m.courseIdx].id,
        title: m.title,
        type: m.type,
        url: m.url,
        duration: m.duration,
        order: m.order,
      }
    })
  }
  console.log(`✓ Created ${materialsData.length} materials`)

  // ============================
  // QUIZZES & QUESTIONS
  // ============================
  const quiz1 = await db.quiz.create({
    data: {
      courseId: courses[0].id,
      title: 'Penilaian Asas PMBOK 7',
      description: 'Ujian kefahaman konsep asas PMBOK 7 edisi.',
      passScore: 70,
      duration: 20,
      order: 1,
    }
  })
  const q1Questions = [
    { text: 'Berapakah kumpulan proses (process groups) dalam PMBOK 7?', type: 'single', options: JSON.stringify(['3', '5', '7', '10']), answer: JSON.stringify([1]), points: 2 },
    { text: 'Yang manakah kawasan pengetahuan (knowledge area) dalam PMBOK?', type: 'multiple', options: JSON.stringify(['Pengurusan Skop', 'Pengurusan Masa', 'Pengurusan Pasukan', 'Semua di atas']), answer: JSON.stringify([3]), points: 2 },
    { text: 'Project Charter adalah dokumen yang diluluskan oleh penaja projek.', type: 'true_false', options: JSON.stringify(['Benar', 'False']), answer: JSON.stringify([0]), points: 1 },
    { text: 'Manakah yang BUKAN merupakan prinsip PMBOK 7?', type: 'single', options: JSON.stringify(['Kepimpinan Berbelas kasihan', 'Pemikiran Sistem', 'Pengurusan Hierarki', 'Menyesuaikan dengan kompleksiti']), answer: JSON.stringify([2]), points: 2 },
    { text: 'Risk Management adalah sebahagian daripada kawasan pengetahuan PMBOK.', type: 'true_false', options: JSON.stringify(['Benar', 'False']), answer: JSON.stringify([0]), points: 1 },
  ]
  for (let i = 0; i < q1Questions.length; i++) {
    await db.question.create({ data: { quizId: quiz1.id, ...q1Questions[i], order: i + 1 } })
  }

  const quiz2 = await db.quiz.create({
    data: {
      courseId: courses[1].id,
      title: 'Penilaian Agile & Scrum',
      description: 'Ujian kefahaman metodologi Agile dan Scrum.',
      passScore: 60,
      duration: 15,
      order: 1,
    }
  })
  const q2Questions = [
    { text: 'Apakah tempoh standard Sprint dalam Scrum?', type: 'single', options: JSON.stringify(['1 minggu', '2-4 minggu', '1 bulan', '3 bulan']), answer: JSON.stringify([1]), points: 2 },
    { text: 'Yang manakah peranan utama dalam Scrum?', type: 'multiple', options: JSON.stringify(['Scrum Master', 'Product Owner', 'Project Sponsor', 'Developer']), answer: JSON.stringify([0, 1, 3]), points: 3 },
    { text: 'Daily Standup adalah mesyuarat formal berdurasi 1 jam.', type: 'true_false', options: JSON.stringify(['Benar', 'False']), answer: JSON.stringify([1]), points: 1 },
    { text: 'Apakah output utama Sprint Planning?', type: 'single', options: JSON.stringify(['Sprint Backlog', 'Product Backlog', 'Burndown Chart', 'Release Plan']), answer: JSON.stringify([0]), points: 2 },
  ]
  for (let i = 0; i < q2Questions.length; i++) {
    await db.question.create({ data: { quizId: quiz2.id, ...q2Questions[i], order: i + 1 } })
  }

  const quiz3 = await db.quiz.create({
    data: {
      courseId: courses[2].id,
      title: 'Penilaian Pengurusan Invois',
      description: 'Ujian kefahaman aliran kelulusan invois dan kawalan kewangan.',
      passScore: 65,
      duration: 18,
      order: 1,
    }
  })
  const q3Questions = [
    { text: 'Status invois "Menunggu Kelulusan" bermaksud invois menunggu kelulusan daripada?', type: 'single', options: JSON.stringify(['Admin Sistem', 'Pengurus Projek', 'Pentadbir Projek', 'Peserta Latihan']), answer: JSON.stringify([1]), points: 2 },
    { text: 'Invois tertunggak (overdue) berlaku apabila?', type: 'multiple', options: JSON.stringify(['Tarikh matang telah dilebihi', 'Status masih belum dibayar', 'Vendor menuntut bayaran', 'Semua di atas']), answer: JSON.stringify([3]), points: 2 },
    { text: 'Audit trail invois merekodkan setiap perubahan status.', type: 'true_false', options: JSON.stringify(['Benar', 'False']), answer: JSON.stringify([0]), points: 1 },
    { text: 'Dokumen sokongan invois boleh dalam format?', type: 'multiple', options: JSON.stringify(['PDF', 'JPEG', 'PNG', 'Word']), answer: JSON.stringify([0, 1, 2]), points: 2 },
  ]
  for (let i = 0; i < q3Questions.length; i++) {
    await db.question.create({ data: { quizId: quiz3.id, ...q3Questions[i], order: i + 1 } })
  }
  console.log(`✓ Created 3 quizzes with ${q1Questions.length + q2Questions.length + q3Questions.length} questions`)

  // ============================
  // ENROLLMENTS
  // ============================
  const enrollmentsData = [
    { userIdx: 5, courseIdx: 0, progress: 100, status: 'selesai', completedAt: new Date('2026-06-15'), certificateUrl: '/certs/cert-001.pdf' },
    { userIdx: 5, courseIdx: 1, progress: 60, status: 'dalam_proses' },
    { userIdx: 5, courseIdx: 3, progress: 100, status: 'selesai', completedAt: new Date('2026-07-02'), certificateUrl: '/certs/cert-002.pdf' },
    { userIdx: 6, courseIdx: 0, progress: 75, status: 'dalam_proses' },
    { userIdx: 6, courseIdx: 2, progress: 40, status: 'dalam_proses' },
    { userIdx: 6, courseIdx: 4, progress: 25, status: 'dalam_proses' },
    { userIdx: 7, courseIdx: 2, progress: 100, status: 'selesai', completedAt: new Date('2026-07-10'), certificateUrl: '/certs/cert-003.pdf' },
    { userIdx: 7, courseIdx: 5, progress: 50, status: 'dalam_proses' },
    { userIdx: 8, courseIdx: 0, progress: 0, status: 'belum_mula' },
    { userIdx: 8, courseIdx: 3, progress: 100, status: 'selesai', completedAt: new Date('2026-07-15'), certificateUrl: '/certs/cert-004.pdf' },
    { userIdx: 8, courseIdx: 5, progress: 80, status: 'dalam_proses' },
    { userIdx: 1, courseIdx: 1, progress: 100, status: 'selesai', completedAt: new Date('2026-05-20'), certificateUrl: '/certs/cert-005.pdf' },
    { userIdx: 2, courseIdx: 4, progress: 30, status: 'dalam_proses' },
  ]
  for (const e of enrollmentsData) {
    await db.enrollment.create({
      data: {
        userId: users[e.userIdx].id,
        courseId: courses[e.courseIdx].id,
        progress: e.progress,
        status: e.status,
        completedAt: e.completedAt || null,
        certificateUrl: e.certificateUrl || null,
        lastAccessedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      }
    })
  }
  console.log(`✓ Created ${enrollmentsData.length} enrollments`)

  // ============================
  // PROJECTS
  // ============================
  const projects = await Promise.all([
    db.project.create({
      data: {
        projectName: 'Sistem Pentauliahan Pekerja (Onboarding Portal)',
        description: 'Pembangunan portal pentauliahan digital untuk pekerja baharu PERKESO.',
        budget: 450000,
        projectManagerId: pm1.id,
        status: 'aktif',
        startDate: new Date('2026-01-15'),
        endDate: new Date('2026-12-31'),
      }
    }),
    db.project.create({
      data: {
        projectName: 'Naik Taraf Sistem iGFMAS Modul Pembayaran',
        description: 'Penambahbaikan modul pembayaran dalam sistem kewangan iGFMAS.',
        budget: 1200000,
        projectManagerId: pm2.id,
        status: 'aktif',
        startDate: new Date('2026-02-01'),
        endDate: new Date('2027-01-31'),
      }
    }),
    db.project.create({
      data: {
        projectName: 'Pelaksanaan CRM untuk Cawangan PERKESO',
        description: 'Pengukuhan sistem pengurusan hubungan pelanggan di 10 cawangan utama.',
        budget: 850000,
        projectManagerId: pm1.id,
        status: 'aktif',
        startDate: new Date('2026-03-10'),
        endDate: new Date('2026-11-30'),
      }
    }),
    db.project.create({
      data: {
        projectName: 'Migrasi Data Pencen ke Cloud AWS',
        description: 'Pemindahan pangkalan data pencen lama kepada penyelesaian cloud AWS.',
        budget: 320000,
        projectManagerId: pm2.id,
        status: 'aktif',
        startDate: new Date('2026-04-01'),
        endDate: new Date('2026-09-30'),
      }
    }),
    db.project.create({
      data: {
        projectName: 'Latihan Keselamatan Siber Kakitangan 2026',
        description: 'Program latihan kesedaran keselamatan siber untuk semua kakitangan PERKESO.',
        budget: 180000,
        projectManagerId: pm1.id,
        status: 'selesai',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-06-30'),
      }
    }),
    db.project.create({
      data: {
        projectName: 'Pembangunan Aplikasi Mobile PERKESO Care',
        description: 'Aplikasi mudah alih untuk carian caruman dan tuntutan PERKESO.',
        budget: 670000,
        projectManagerId: pm2.id,
        status: 'aktif',
        startDate: new Date('2026-02-15'),
        endDate: new Date('2027-02-14'),
      }
    }),
  ])
  console.log(`✓ Created ${projects.length} projects`)

  // ============================
  // INVOICES
  // ============================
  const today = new Date()
  const daysAgo = (n: number) => new Date(today.getTime() - n * 86400000)
  const daysAhead = (n: number) => new Date(today.getTime() + n * 86400000)

  const invoicesData: Array<{
    no: string; projIdx: number; vendor: string; vemail?: string; amount: number; invDate: Date; dueDate: Date; status: string; attachment?: string; attName?: string; approvedByIdx?: number; remarks?: string; createdByIdx: number;
  }> = [
    { no: 'INV-2026-001', projIdx: 0, vendor: 'TechSoft Solutions Sdn Bhd', vemail: 'finance@techsoft.com.my', amount: 45000, invDate: daysAgo(45), dueDate: daysAgo(15), status: 'dibayar', attachment: '/invoices/inv-001.pdf', attName: 'INV-2026-001-TechSoft.pdf', approvedByIdx: 1, remarks: 'Pembayaran fasa 1 - siap dan disahkan', createdByIdx: 3 },
    { no: 'INV-2026-002', projIdx: 0, vendor: 'DesignPro Studio', amount: 18000, invDate: daysAgo(20), dueDate: daysAhead(10), status: 'diluluskan', attachment: '/invoices/inv-002.pdf', attName: 'INV-2026-002-DesignPro.pdf', approvedByIdx: 1, remarks: 'Diluluskan untuk bayaran fasa 2', createdByIdx: 4 },
    { no: 'INV-2026-003', projIdx: 1, vendor: 'GlobalTech Systems Sdn Bhd', amount: 150000, invDate: daysAgo(15), dueDate: daysAgo(2), status: 'tertunggak', attachment: '/invoices/inv-003.pdf', attName: 'INV-2026-003-GlobalTech.pdf', approvedByIdx: 2, remarks: 'Diluluskan tetapi bayaran belum dibuat', createdByIdx: 3 },
    { no: 'INV-2026-004', projIdx: 1, vendor: 'DataNexus Sdn Bhd', amount: 75000, invDate: daysAgo(8), dueDate: daysAhead(22), status: 'menunggu_kelulusan', attachment: '/invoices/inv-004.pdf', attName: 'INV-2026-004-DataNexus.pdf', remarks: 'Menunggu semakan PM', createdByIdx: 4 },
    { no: 'INV-2026-005', projIdx: 2, vendor: 'CloudFirst Consulting', amount: 95000, invDate: daysAgo(30), dueDate: daysAgo(0), status: 'dibayar', attachment: '/invoices/inv-005.pdf', attName: 'INV-2026-005-CloudFirst.pdf', approvedByIdx: 1, remarks: 'Pembayaran siap', createdByIdx: 3 },
    { no: 'INV-2026-006', projIdx: 2, vendor: 'SalesForce Malaysia', amount: 280000, invDate: daysAgo(5), dueDate: daysAhead(25), status: 'menunggu_kelulusan', attachment: '/invoices/inv-006.pdf', attName: 'INV-2026-006-SalesForce.pdf', remarks: 'Jumlah besar - memerlukan kelulusan PM dan Kewangan', createdByIdx: 4 },
    { no: 'INV-2026-007', projIdx: 3, vendor: 'AWS Malaysia Sdn Bhd', amount: 60000, invDate: daysAgo(25), dueDate: daysAhead(5), status: 'diluluskan', attachment: '/invoices/inv-007.pdf', attName: 'INV-2026-007-AWS.pdf', approvedByIdx: 2, remarks: 'Diluluskan - bayaran dalam proses', createdByIdx: 3 },
    { no: 'INV-2026-008', projIdx: 3, vendor: 'Migrator Pro Sdn Bhd', amount: 42000, invDate: daysAgo(10), dueDate: daysAhead(20), status: 'menunggu_kelulusan', attachment: '/invoices/inv-008.pdf', attName: 'INV-2026-008-Migrator.pdf', remarks: 'Penghantaran dokumen lengkap', createdByIdx: 4 },
    { no: 'INV-2026-009', projIdx: 4, vendor: 'CyberSafe Training', amount: 25000, invDate: daysAgo(60), dueDate: daysAgo(30), status: 'dibayar', attachment: '/invoices/inv-009.pdf', attName: 'INV-2026-009-CyberSafe.pdf', approvedByIdx: 1, remarks: 'Bayaran penuh - projek selesai', createdByIdx: 3 },
    { no: 'INV-2026-010', projIdx: 4, vendor: 'LearnHub Asia', amount: 12000, invDate: daysAgo(50), dueDate: daysAgo(20), status: 'ditolak', attachment: '/invoices/inv-010.pdf', attName: 'INV-2026-010-LearnHub.pdf', approvedByIdx: 1, remarks: 'Ditolak - dokumentasi tidak lengkap. Sila hantar semula dengan kontrak ditandatangani.', createdByIdx: 4 },
    { no: 'INV-2026-011', projIdx: 5, vendor: 'MobileFirst Sdn Bhd', amount: 85000, invDate: daysAgo(3), dueDate: daysAhead(27), status: 'draf', createdByIdx: 3 },
    { no: 'INV-2026-012', projIdx: 5, vendor: 'UIUX Studio Asia', amount: 35000, invDate: daysAgo(2), dueDate: daysAhead(28), status: 'draf', createdByIdx: 4 },
    { no: 'INV-2026-013', projIdx: 0, vendor: 'TechSoft Solutions Sdn Bhd', vemail: 'finance@techsoft.com.my', amount: 52000, invDate: daysAgo(1), dueDate: daysAhead(29), status: 'menunggu_kelulusan', attachment: '/invoices/inv-013.pdf', attName: 'INV-2026-013-TechSoft.pdf', remarks: 'Pembayaran fasa akhir', createdByIdx: 3 },
    { no: 'INV-2026-014', projIdx: 1, vendor: 'InfraBuild Sdn Bhd', amount: 95000, invDate: daysAgo(40), dueDate: daysAgo(10), status: 'tertunggak', attachment: '/invoices/inv-014.pdf', attName: 'INV-2026-014-InfraBuild.pdf', approvedByIdx: 2, remarks: 'Diluluskan - tertunggak bayaran', createdByIdx: 3 },
    { no: 'INV-2026-015', projIdx: 2, vendor: 'MarketPro Agency', amount: 22000, invDate: daysAgo(35), dueDate: daysAhead(5), status: 'dibayar', attachment: '/invoices/inv-015.pdf', attName: 'INV-2026-015-MarketPro.pdf', approvedByIdx: 1, remarks: 'Bayaran selesai', createdByIdx: 4 },
  ]

  for (const inv of invoicesData) {
    const approvedBy = inv.approvedByIdx !== undefined ? users[inv.approvedByIdx].id : null
    const approvedAt = approvedBy ? (inv.status === 'diluluskan' || inv.status === 'dibayar' || inv.status === 'tertunggak' || inv.status === 'ditolak' ? daysAgo(Math.floor(Math.random() * 10) + 1) : null) : null
    const paidAt = inv.status === 'dibayar' ? daysAgo(Math.floor(Math.random() * 5)) : null

    const created = await db.invoice.create({
      data: {
        invoiceNo: inv.no,
        projectId: projects[inv.projIdx].id,
        vendorName: inv.vendor,
        vendorEmail: inv.vemail,
        amount: inv.amount,
        invoiceDate: inv.invDate,
        dueDate: inv.dueDate,
        status: inv.status,
        attachmentUrl: inv.attachment || null,
        attachmentName: inv.attName || null,
        approvedById: approvedBy,
        approvedAt: approvedAt,
        paidAt: paidAt,
        remarks: inv.remarks,
        createdById: users[inv.createdByIdx].id,
      }
    })

    // History records
    await db.invoiceHistory.create({ data: { invoiceId: created.id, action: 'created', toStatus: 'draf', userId: users[inv.createdByIdx].id, createdAt: inv.invDate } })
    if (inv.status !== 'draf') {
      await db.invoiceHistory.create({ data: { invoiceId: created.id, action: 'status_changed', fromStatus: 'draf', toStatus: 'menunggu_kelulusan', userId: users[inv.createdByIdx].id, createdAt: new Date(inv.invDate.getTime() + 86400000) } })
    }
    if (approvedBy && (inv.status === 'diluluskan' || inv.status === 'dibayar' || inv.status === 'tertunggak')) {
      await db.invoiceHistory.create({ data: { invoiceId: created.id, action: 'approved', fromStatus: 'menunggu_kelulusan', toStatus: 'diluluskan', userId: approvedBy, remarks: inv.remarks, createdAt: approvedAt! } })
    }
    if (inv.status === 'ditolak' && approvedBy) {
      await db.invoiceHistory.create({ data: { invoiceId: created.id, action: 'rejected', fromStatus: 'menunggu_kelulusan', toStatus: 'ditolak', userId: approvedBy, remarks: inv.remarks, createdAt: approvedAt! } })
    }
    if (inv.status === 'dibayar') {
      await db.invoiceHistory.create({ data: { invoiceId: created.id, action: 'paid', fromStatus: 'diluluskan', toStatus: 'dibayar', userId: users[inv.createdByIdx].id, remarks: 'Pembayaran berjaya dilakukan', createdAt: paidAt! } })
    }
    if (inv.status === 'tertunggak') {
      await db.invoiceHistory.create({ data: { invoiceId: created.id, action: 'status_changed', fromStatus: 'diluluskan', toStatus: 'tertunggak', userId: approvedBy, remarks: 'Invois tertunggak - melebihi tarikh matang', createdAt: new Date() } })
    }
  }
  console.log(`✓ Created ${invoicesData.length} invoices with history`)

  // ============================
  // NOTIFICATIONS
  // ============================
  const notifData = [
    { userIdx: 1, title: 'Invois Tertunggak Memerlukan Tindakan', message: 'INV-2026-003 daripada GlobalTech Systems Sdn Bhd telah melebihi tarikh matang. Sila uruskan bayaran.', type: 'error', category: 'invoice', link: 'invoices' },
    { userIdx: 1, title: 'Invois Baharu Menunggu Kelulusan', message: 'INV-2026-013 sebanyak RM 52,000 menunggu kelulusan anda.', type: 'warning', category: 'invoice', link: 'invoices' },
    { userIdx: 2, title: '2 Invois Menunggu Kelulusan', message: 'Anda mempunyai 2 invois menunggu semakan: INV-2026-004 dan INV-2026-008.', type: 'warning', category: 'invoice', link: 'invoices' },
    { userIdx: 2, title: 'Invois Besar Memerlukan Perhatian', message: 'INV-2026-006 sebanyak RM 280,000 memerlukan kelulusan PM dan Kewangan.', type: 'warning', category: 'invoice', link: 'invoices' },
    { userIdx: 5, title: 'Selamat Datang ke LMS PERKESO', message: 'Anda telah didaftarkan ke 3 kursus latihan. Sila mula pembelajaran anda.', type: 'info', category: 'course', link: 'my-learning' },
    { userIdx: 5, title: 'Sijil Diterima', message: 'Tahniah! Anda telah menamatkan kursus "Asas Pengurusan Projek (PMBOK 7)". Sijil sedia untuk dimuat turun.', type: 'success', category: 'course', link: 'my-learning' },
    { userIdx: 6, title: 'Kursus Baharu Tersedia', message: 'Kursus "Pengurusan Invois & Kawalan Kewangan Projek" kini tersedia untuk pendaftaran.', type: 'info', category: 'course', link: 'courses' },
    { userIdx: 7, title: 'Sijil Diterima', message: 'Tahniah! Anda telah menamatkan kursus Pengurusan Invois.', type: 'success', category: 'course', link: 'my-learning' },
    { userIdx: 8, title: 'Selamat Datang ke LMS PERKESO', message: 'Anda telah didaftarkan ke 3 kursus. Mulakan pembelajaran anda sekarang.', type: 'info', category: 'course', link: 'my-learning' },
    { userIdx: 9, title: 'Laporan Kewangan Bulanan Sedia', message: 'Laporan ringkasan kewangan projek untuk Julai 2026 sedia untuk semakan.', type: 'info', category: 'system', link: 'reports' },
  ]
  for (const n of notifData) {
    await db.notification.create({
      data: {
        userId: users[n.userIdx].id,
        title: n.title,
        message: n.message,
        type: n.type,
        category: n.category,
        link: n.link,
        isRead: Math.random() > 0.5,
        createdAt: new Date(Date.now() - Math.random() * 5 * 86400000),
      }
    })
  }
  console.log(`✓ Created ${notifData.length} notifications`)

  console.log('\n🎉 Seed completed successfully!')
  console.log('\n📋 Login credentials (email / password):')
  console.log('  Admin Sistem     : admin@perkeso.gov.my / admin123')
  console.log('  Pengurus Projek  : pm@perkeso.gov.my / pm123')
  console.log('  Admin Projek     : padmin@perkeso.gov.my / padmin123')
  console.log('  Peserta Latihan  : staff1@perkeso.gov.my / staff123')
  console.log('  Pengurusan Atasan: upper@perkeso.gov.my / upper123')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
