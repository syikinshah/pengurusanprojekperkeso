# Task 2-b — LMS APIs (Courses, Materials, Enrollments, Quizzes/Attempts, Certificate)

**Agent:** full-stack-developer
**Task:** Build all LMS-related API routes (Courses, Materials, Enrollments, Quizzes, QuizAttempts, Certificate) under `src/app/api/`.

## Files Created (13 files)

| # | File | Methods | Purpose |
|---|------|---------|---------|
| 1 | `src/app/api/courses/route.ts` | GET, POST | List courses (with creator + _count), create course (admin/p_admin only). Non-privileged users only see `aktif` courses. |
| 2 | `src/app/api/courses/[id]/route.ts` | GET, PUT, DELETE | Course detail (materials sorted, quizzes with questions, creator, _count enrollments). PUT: admin/p_admin. DELETE: admin (cascade). |
| 3 | `src/app/api/courses/[id]/materials/route.ts` | GET, POST | List materials (sorted by order), create material (auto-increment order if not provided). |
| 4 | `src/app/api/courses/[id]/materials/[materialId]/route.ts` | PUT, DELETE | Update/delete material (admin/p_admin). |
| 5 | `src/app/api/courses/[id]/enroll/route.ts` | POST | Self-enroll (any role). Returns existing if already enrolled. |
| 6 | `src/app/api/enrollments/route.ts` | GET | List enrollments. Self by default. PM/upper_management without userId returns all (reporting). Privileged users can pass ?userId=. Filter by ?courseId= and ?status=. |
| 7 | `src/app/api/enrollments/[id]/route.ts` | GET, PATCH, DELETE | Get/patch/unenroll. PATCH auto-derives status from progress; if status becomes `selesai` & cert is null, generates `/certs/cert-{id}.pdf`. |
| 8 | `src/app/api/quizzes/route.ts` | POST | Create quiz (admin/p_admin). Body: { courseId, title, description?, passScore?, duration? }. |
| 9 | `src/app/api/quizzes/[id]/route.ts` | GET, PUT, DELETE | Get quiz with questions. **CRITICAL:** trainees get questions WITHOUT `answer` field; admin/p_admin see answers (for grading). PUT/DELETE: admin/p_admin. |
| 10 | `src/app/api/quizzes/[id]/questions/route.ts` | POST | Create question. Body: { text, type, options: string[], answer: number[], points?, order? }. Options/answer stored as JSON strings (schema constraint). |
| 11 | `src/app/api/quizzes/[id]/attempt/route.ts` | POST | Submit attempt. Body: { answers: Record<qId, number[]> }. Computes score (order-insensitive match), creates attempt, updates enrollment progress if passed (monotonic — never downgrades). Returns { attempt, score, passed, correctAnswers }. |
| 12 | `src/app/api/quizzes/[id]/attempts/route.ts` | GET | List attempts for quiz. Default: current user. ?userId= filter (admin/PM only). Sorted by completedAt desc. |
| 13 | `src/app/api/certificate/[enrollmentId]/route.ts` | GET | Returns certificate data: { enrollment, course, user, certificateId, issuedAt, certificateUrl }. 404 if not completed or no cert URL. |

## Design Decisions

- **Auth helper reuse**: All routes use `requireUser()`, `requireRole(...)`, `requireAdmin()`, `requireAdminOrPMOrPAdmin()`, `hasRole()` from `src/lib/api-auth.ts` (created in Task 2-a). All error messages in Bahasa Malaysia.
- **Response envelope**: Every response uses `{ ok: true, ... }` or `{ ok: false, error: string }` with appropriate HTTP status.
- **Password stripping**: Used Prisma `select` to never return `password` in user relations.
- **Zod validation**: All POST/PUT/PATCH bodies validated with zod; specific Malay error messages.
- **Quiz attempt scoring**: Order-insensitive comparison of selected vs correct answer indexes (sort + compare). Multi-answer questions support partial credit only if exact match — simple for POC.
- **Enrollment progress fix**: Attempt handler uses `Math.max(existing.progress, computedProgress)` so passing a quiz never downgrades a previously-completed enrollment. Status is only downgraded from `selesai` if explicitly set; auto-derived status does not downgrade.
- **Auto-derived status logic in PATCH**: progress >= 100 → selesai (+ completedAt + cert URL); 0 < progress < 100 → dalam_proses; 0 → belum_mula. Explicit status override takes precedence.
- **Cascade deletes**: Course delete cascades to materials, quizzes, questions, attempts, enrollments (per Prisma schema `onDelete: Cascade`).
- **Question/answer field omission for trainees**: `GET /api/quizzes/[id]` strips the `answer` field from each question when requester is not admin/p_admin — trainees only see {id, quizId, text, type, options, points, order}.

## Testing Performed (live against dev server)

1. **Login as admin** → POST `/api/auth/login` (200)
2. **GET /api/courses** (admin) → 200, returns 7 courses including the draft (admin sees all statuses) with `_count` {materials, enrollments, quizzes}.
3. **POST /api/quizzes** (admin) → 201, created new quiz with `order: 2` (auto-incremented after seed's `order: 1`).
4. **POST /api/quizzes/[id]/questions** (admin) → 201, created question with `options` and `answer` stored as JSON strings.
5. **GET /api/quizzes/[id]** as **admin** → 200, **includes `answer` field** in each question. ✓
6. **GET /api/quizzes/[id]** as **trainee** → 200, **omits `answer` field** from each question (critical security requirement verified). ✓
7. **POST /api/quizzes/[id]/attempt** as trainee (all-correct answers) → 201 with `{ score: 100, passed: true, correctAnswers }`. Enrollment lastAccessedAt updated.
8. **GET /api/enrollments** as trainee → 200, returns only the trainee's own enrollments (3 rows).
9. **PATCH /api/enrollments/[id]** as admin → 200, successfully reset progress/status/cert.
10. **DELETE /api/quizzes/[id]** (admin) → 200, cascade-deleted test quiz + question + attempt.
11. **GET /api/certificate/[enrollmentId]** for completed enrollment → 200 with full cert data (enrollment, course, user, certificateId, issuedAt, certificateUrl).
12. **GET /api/certificate/[enrollmentId]** for in-progress enrollment → 404 with Malay error `"Sijil belum tersedia. Sila lengkapkan kursus terlebih dahulu."`. ✓
13. **POST /api/courses/[id]/enroll** (trainee) → 201 with new enrollment (progress 0, status `belum_mula`). ✓
14. **POST /api/courses/[id]/materials** (admin) → 201, auto-set `order: 5` (after existing 4). ✓
15. **GET /api/courses/[id]/materials** → 200, materials sorted by `order`.
16. **PUT /api/courses/[id]/materials/[materialId]** (admin) → 200, updates material title.
17. **DELETE /api/courses/[id]/materials/[materialId]** (admin) → 200, deletes material.
18. **GET /api/quizzes/[id]/attempts** as admin → 200, returns admin's own attempts (empty).
19. **GET /api/quizzes/[id]/attempts?userId=traineeId** as admin → 200, returns trainee's attempt.

## Issues Encountered & Resolved

1. **Initial attempt handler bug** (caught during testing): When a user passed a newly-added quiz, my code computed `ratio = passedCount / totalQuizzes` and could **downgrade** a previously-completed enrollment (e.g., 100% → 50%). Fixed by using `Math.max(existing.progress, computedProgress)` and never downgrading `status` from `selesai` via auto-derivation. Verified by re-test: passing the PMBOK quiz as staff1 (who was already 100%/selesai on PMBOK 7) kept enrollment at progress 100 / selesai / cert-001.pdf.

2. **Sandbox filesystem oddity (cosmetic only)**: The `[materialId]` directory under `src/app/api/courses/[id]/materials/` is stored on the OS as `aterialId]` (without leading `[`) — appears to be an overlayfs / sandbox display quirk. Next.js correctly routes the dynamic segment anyway — verified via live curl PUT/DELETE/POST tests returning 200/201. Python `os.path.isfile()` confirms the route file exists at the expected `[materialId]/route.ts` logical path. No fix needed; routes work end-to-end.

## Lint Result

```
$ bun run lint
$ eslint .
---EXIT:0---
```

No lint errors.

## Endpoints Summary Table (for frontend SPA later)

| Verb | Path | Auth | Notes |
|------|------|------|-------|
| GET | `/api/courses` | auth | search, category, level, status filters; non-admin only sees aktif |
| POST | `/api/courses` | admin/p_admin | create |
| GET | `/api/courses/:id` | auth | full course detail with materials/quizzes/questions/creator |
| PUT | `/api/courses/:id` | admin/p_admin | update fields |
| DELETE | `/api/courses/:id` | admin | cascade |
| GET | `/api/courses/:id/materials` | auth | sorted by order |
| POST | `/api/courses/:id/materials` | admin/p_admin | create, auto-order |
| PUT | `/api/courses/:id/materials/:materialId` | admin/p_admin | update |
| DELETE | `/api/courses/:id/materials/:materialId` | admin/p_admin | delete |
| POST | `/api/courses/:id/enroll` | auth | self-enroll, idempotent |
| GET | `/api/enrollments` | auth | userId/courseId/status filters; PM/upper get all |
| GET | `/api/enrollments/:id` | auth+owner/admin | with course/user |
| PATCH | `/api/enrollments/:id` | auth+owner/admin | auto-derive status; auto-cert on selesai |
| DELETE | `/api/enrollments/:id` | auth+owner/admin | unenroll |
| POST | `/api/quizzes` | admin/p_admin | create |
| GET | `/api/quizzes/:id` | auth | trainee omits answers |
| PUT | `/api/quizzes/:id` | admin/p_admin | update |
| DELETE | `/api/quizzes/:id` | admin/p_admin | cascade to questions/attempts |
| POST | `/api/quizzes/:id/questions` | admin/p_admin | create question (JSON-encoded options/answer) |
| POST | `/api/quizzes/:id/attempt` | auth | submit answers; auto-update enrollment |
| GET | `/api/quizzes/:id/attempts` | auth | userId filter; sorted desc |
| GET | `/api/certificate/:enrollmentId` | auth+owner/admin | 404 if not completed |
