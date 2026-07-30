"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { toast } from "sonner"
import { api } from "@/lib/api-client"
import { useViewStore } from "@/lib/auth-store"
import {
  EmptyState,
  LoadingState,
} from "@/components/shared"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  ArrowLeft,
  ArrowRight,
  HelpCircle,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Award,
  Send,
  AlertTriangle,
  Sparkles,
  Trophy,
} from "lucide-react"
import type { Quiz, Question } from "@/lib/types"
import { cn } from "@/lib/utils"

interface QuizQuestion extends Omit<Question, "answer"> {
  answer?: number[]
}

interface QuizDetail extends Omit<Quiz, "questions"> {
  course?: { id: string; title: string }
  questions: QuizQuestion[]
}

interface AttemptResult {
  attempt: {
    id: string
    score: number
    earnedPoints: number
    totalPoints: number
    passed: boolean
  }
  score: number
  passed: boolean
  correctAnswers: Record<string, number[]>
}

export function QuizView() {
  const params = useViewStore((s) => s.params)
  const navigate = useViewStore((s) => s.navigate)
  const quizId = params.id

  const [quiz, setQuiz] = useState<QuizDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number[]>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<AttemptResult | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadQuiz = useCallback(async () => {
    if (!quizId) return
    setLoading(true)
    try {
      const res = await api.get<{ ok: boolean; quiz: QuizDetail }>(
        `/api/quizzes/${quizId}`,
      )
      setQuiz(res.quiz)
      setAnswers({})
      setResult(null)
      setCurrent(0)
      setElapsed(0)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Kuiz tidak dijumpai.")
      setQuiz(null)
    } finally {
      setLoading(false)
    }
  }, [quizId])

  useEffect(() => {
    loadQuiz()
  }, [loadQuiz])

  // Timer (visual only, no auto-submit)
  useEffect(() => {
    if (loading || !quiz || result) return
    timerRef.current = setInterval(() => {
      setElapsed((e) => e + 1)
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [loading, quiz, result])

  const handleSelect = (questionId: string, idx: number, type: string) => {
    setAnswers((prev) => {
      const cur = prev[questionId] || []
      if (type === "single" || type === "true_false") {
        return { ...prev, [questionId]: [idx] }
      }
      // multiple
      if (cur.includes(idx)) {
        return { ...prev, [questionId]: cur.filter((i) => i !== idx) }
      }
      return { ...prev, [questionId]: [...cur, idx] }
    })
  }

  const handleSubmit = async () => {
    if (!quiz || !quizId) return
    setSubmitting(true)
    try {
      const res = await api.post<AttemptResult>(`/api/quizzes/${quizId}/attempt`, {
        answers,
      })
      setResult(res)
      if (timerRef.current) clearInterval(timerRef.current)
      if (res.passed) {
        toast.success(`Tahniah! Anda lulus dengan ${Math.round(res.score)}%.`)
      } else {
        toast.error(`Anda tidak lulus. Skor: ${Math.round(res.score)}%.`)
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal menghantar jawapan.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleRetry = () => {
    setAnswers({})
    setResult(null)
    setCurrent(0)
    setElapsed(0)
  }

  if (loading) {
    return <LoadingState label="Memuat kuiz..." />
  }

  if (!quiz) {
    return (
      <EmptyState
        icon={HelpCircle}
        title="Kuiz tidak dijumpai"
        description="Kuiz mungkin telah dialih keluar atau ID tidak sah."
        action={
          <Button onClick={() => navigate("courses")} variant="outline">
            <ArrowLeft className="size-4 mr-1.5" /> Kembali ke Katalog
          </Button>
        }
      />
    )
  }

  if (result) {
    return (
      <QuizResultView
        quiz={quiz}
        answers={answers}
        result={result}
        onRetry={handleRetry}
        onBack={() =>
          quiz.course
            ? navigate("course-detail", { id: quiz.course.id })
            : navigate("my-learning")
        }
        onCertificate={() => {
          // Find user's enrollment for this course - navigate to my-learning so user can pick cert
          // The certificate view expects enrollment id, but we don't have it here directly.
          // We could fetch /api/enrollments?courseId=... then navigate to certificate
          navigate("my-learning")
          toast.info("Lihat sijil anda di Pembelajaran Saya.")
        }}
      />
    )
  }

  const total = quiz.questions.length
  const currentQ = quiz.questions[current]
  const answeredCount = Object.keys(answers).filter(
    (k) => (answers[k] || []).length > 0,
  ).length
  const progress = total > 0 ? (answeredCount / total) * 100 : 0
  const allAnswered = answeredCount === total

  return (
    <div className="space-y-5 animate-fade-in-up max-w-3xl mx-auto">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          quiz.course
            ? navigate("course-detail", { id: quiz.course.id })
            : navigate("my-learning")
        }
        className="-ml-2"
      >
        <ArrowLeft className="size-4 mr-1.5" /> Kembali ke Kursus
      </Button>

      {/* Quiz header */}
      <Card className="glass rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 mb-1.5">
              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium inline-flex items-center gap-1.5">
                <HelpCircle className="size-3.5" /> Kuiz
              </span>
              {quiz.course && (
                <span className="text-xs text-muted-foreground truncate">
                  {quiz.course.title}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold leading-tight">{quiz.title}</h1>
            {quiz.description && (
              <p className="text-sm text-muted-foreground mt-1.5">
                {quiz.description}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1.5">
              <Sparkles className="size-3.5" /> Lulus ≥ {quiz.passScore}%
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground inline-flex items-center gap-1.5">
              <Clock className="size-3.5" /> {quiz.duration} min
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground border-t pt-3 mt-3">
          <span>Soalan: <strong className="text-foreground">{total}</strong></span>
          <span>Jawapan: <strong className="text-foreground">{answeredCount}/{total}</strong></span>
          <span>Mata Penuh: <strong className="text-foreground">
            {quiz.questions.reduce((s, q) => s + (q.points || 0), 0)}
          </strong></span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" /> Tempoh: {formatElapsed(elapsed)}
          </span>
        </div>
      </Card>

      {/* Question progress dots */}
      <div className="flex flex-wrap items-center gap-1.5">
        {quiz.questions.map((q, i) => {
          const ans = (answers[q.id] || []).length > 0
          const isCurrent = i === current
          return (
            <button
              key={q.id}
              onClick={() => setCurrent(i)}
              className={cn(
                "size-7 rounded-md text-xs font-medium border transition",
                isCurrent && "ring-2 ring-primary",
                ans
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:bg-muted",
              )}
              aria-label={`Soalan ${i + 1}${ans ? " (dijawab)" : ""}`}
            >
              {i + 1}
            </button>
          )
        })}
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Soalan {current + 1} dari {total}</span>
          <span>{answeredCount}/{total} dijawab</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Question card */}
      {currentQ && (
        <QuestionCard
          question={currentQ}
          selected={answers[currentQ.id] || []}
          onSelect={(idx) => handleSelect(currentQ.id, idx, currentQ.type)}
          index={current}
          total={total}
        />
      )}

      {/* Navigation + Submit */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
        >
          <ArrowLeft className="size-4 mr-1.5" /> Sebelumnya
        </Button>

        <div className="flex items-center gap-2">
          {allAnswered ? (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-brand-gradient"
            >
              {submitting ? (
                <>
                  <span className="size-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-1.5" />
                  Menghantar...
                </>
              ) : (
                <>
                  <Send className="size-4 mr-1.5" /> Hantar Jawapan
                </>
              )}
            </Button>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={submitting} className="btn-brand-gradient">
                  <Send className="size-4 mr-1.5" /> Hantar Jawapan
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="glass-strong">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="size-5 text-amber-500" />
                    Soalan belum dijawab
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Anda hanya menjawab {answeredCount} dari {total} soalan.
                    Soalan yang tidak dijawab akan dianggap salah. Adakah anda
                    ingin teruskan?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleSubmit}
                    className="btn-brand-gradient"
                  >
                    Ya, Hantar Sekarang
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <Button
          variant="outline"
          onClick={() => setCurrent((c) => Math.min(total - 1, c + 1))}
          disabled={current === total - 1}
        >
          Seterusnya <ArrowRight className="size-4 ml-1.5" />
        </Button>
      </div>
    </div>
  )
}

// ============================
// Question card
// ============================
function QuestionCard({
  question,
  selected,
  onSelect,
  index,
  total,
}: {
  question: QuizQuestion
  selected: number[]
  onSelect: (idx: number) => void
  index: number
  total: number
}) {
  const isMultiple = question.type === "multiple"

  return (
    <Card className="glass rounded-2xl p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 font-bold text-primary text-sm">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-wide font-semibold">
              {typeLabel(question.type)}
            </span>
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Sparkles className="size-3" /> {question.points} mata
            </span>
          </div>
          <h3 className="text-lg font-semibold leading-snug">
            {question.text}
          </h3>
        </div>
      </div>

      {isMultiple && (
        <p className="text-xs text-muted-foreground mb-3 ml-12">
          Pilih semua jawapan yang betul.
        </p>
      )}

      {/* Options */}
      {question.type === "multiple" ? (
        <div className="space-y-2">
          {question.options.map((opt, i) => (
            <OptionCheckbox
              key={i}
              label={opt}
              checked={selected.includes(i)}
              onChange={() => onSelect(i)}
            />
          ))}
        </div>
      ) : (
        <RadioGroup
          value={selected[0] !== undefined ? String(selected[0]) : ""}
          onValueChange={(v) => onSelect(Number(v))}
          className="space-y-2 ml-12"
        >
          {question.options.map((opt, i) => (
            <label
              key={i}
              htmlFor={`q-${question.id}-opt-${i}`}
              className={cn(
                "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition",
                selected[0] === i
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/40",
              )}
            >
              <RadioGroupItem
                id={`q-${question.id}-opt-${i}`}
                value={String(i)}
                className="mt-0.5"
              />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </RadioGroup>
      )}
    </Card>
  )
}

function OptionCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <label
      className={cn(
        "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition",
        checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
      )}
    >
      <Checkbox checked={checked} onCheckedChange={onChange} className="mt-0.5" />
      <span className="text-sm">{label}</span>
    </label>
  )
}

function typeLabel(type: string): string {
  const labels: Record<string, string> = {
    single: "Pilihan Tunggal",
    multiple: "Pilihan Berganda",
    true_false: "Betul / Salah",
  }
  return labels[type] || type
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

// ============================
// Result view
// ============================
function QuizResultView({
  quiz,
  answers,
  result,
  onRetry,
  onBack,
  onCertificate,
}: {
  quiz: QuizDetail
  answers: Record<string, number[]>
  result: AttemptResult
  onRetry: () => void
  onBack: () => void
  onCertificate: () => void
}) {
  const passed = result.passed
  const score = Math.round(result.score)
  const totalPoints = result.attempt.totalPoints
  const earned = result.attempt.earnedPoints

  return (
    <div className="space-y-5 animate-fade-in-up max-w-3xl mx-auto">
      {/* Score banner */}
      <Card
        className={cn(
          "rounded-2xl p-8 text-center",
          passed
            ? "glass-strong border-emerald-300/50"
            : "glass-strong border-rose-300/50",
        )}
      >
        <div
          className={cn(
            "size-20 rounded-2xl flex items-center justify-center mx-auto mb-4",
            passed
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/15 text-rose-600 dark:text-rose-400",
          )}
        >
          {passed ? (
            <Trophy className="size-10" />
          ) : (
            <XCircle className="size-10" />
          )}
        </div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
          {passed ? "Tahniah! Anda Lulus" : "Maaf, Anda Tidak Lulus"}
        </p>
        <h2 className="text-5xl font-bold mb-2">{score}%</h2>
        <p className="text-sm text-muted-foreground">
          Mata: <strong>{earned}</strong> / {totalPoints} · Lulus pada ≥ {quiz.passScore}%
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
          <Button onClick={onBack} variant="outline">
            <ArrowLeft className="size-4 mr-1.5" /> Kembali ke Kursus
          </Button>
          {passed && (
            <Button onClick={onCertificate} className="btn-brand-gradient">
              <Award className="size-4 mr-1.5" /> Lihat Sijil
            </Button>
          )}
          <Button onClick={onRetry} variant="secondary">
            <RotateCcw className="size-4 mr-1.5" /> Cuba Semula
          </Button>
        </div>
      </Card>

      {/* Per-question breakdown */}
      <Card className="glass rounded-2xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <HelpCircle className="size-5 text-primary" /> Penilaian Jawapan
        </h3>
        <div className="space-y-4">
          {quiz.questions.map((q, i) => {
            const userAns = answers[q.id] || []
            const correctAns = result.correctAnswers[q.id] || []
            const isCorrect = arraysEqualUnordered(userAns, correctAns)
            return (
              <div
                key={q.id}
                className={cn(
                  "p-4 rounded-xl border",
                  isCorrect
                    ? "border-emerald-300/60 bg-emerald-50/50 dark:bg-emerald-950/20"
                    : "border-rose-300/60 bg-rose-50/50 dark:bg-rose-950/20",
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "size-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white",
                      isCorrect ? "bg-emerald-500" : "bg-rose-500",
                    )}
                  >
                    {isCorrect ? (
                      <CheckCircle2 className="size-4" />
                    ) : (
                      <XCircle className="size-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-snug mb-1">
                      <span className="text-muted-foreground mr-1.5">
                        {i + 1}.
                      </span>
                      {q.text}
                    </p>
                    <div className="space-y-1 text-sm">
                      <p className={cn(isCorrect ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground")}>
                        <span className="font-medium">Jawapan anda:</span>{" "}
                        {formatOptions(q, userAns) || (
                          <span className="italic text-muted-foreground/70">tidak dijawab</span>
                        )}
                      </p>
                      {!isCorrect && (
                        <p className="text-emerald-700 dark:text-emerald-400">
                          <span className="font-medium">Jawapan betul:</span>{" "}
                          {formatOptions(q, correctAns)}
                        </p>
                      )}
                    </div>
                    <div className="mt-1.5 text-xs text-muted-foreground">
                      Mata: <strong>{isCorrect ? q.points : 0}</strong> / {q.points}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

function formatOptions(q: QuizQuestion, indexes: number[]): string {
  if (!indexes || indexes.length === 0) return ""
  return indexes
    .slice()
    .sort((a, b) => a - b)
    .map((i) => q.options[i])
    .filter(Boolean)
    .join(", ")
}

function arraysEqualUnordered(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  const sa = [...a].map(Number).sort((x, y) => x - y)
  const sb = [...b].map(Number).sort((x, y) => x - y)
  return sa.every((v, i) => v === sb[i])
}
