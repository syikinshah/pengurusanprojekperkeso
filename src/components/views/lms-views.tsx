"use client"

// Barrel file re-exporting the 5 LMS frontend views used by the SPA router in
// src/app/page.tsx. Splitting each view into its own file keeps things
// manageable while preserving the existing import contract:
//
//   import { CoursesView, CourseDetailView, MyLearningView, QuizView, CertificateView } from "@/components/views/lms-views"

export { CoursesView } from "@/components/views/lms/courses-view"
export { CourseDetailView } from "@/components/views/lms/course-detail-view"
export { MyLearningView } from "@/components/views/lms/my-learning-view"
export { QuizView } from "@/components/views/lms/quiz-view"
export { CertificateView } from "@/components/views/lms/certificate-view"
