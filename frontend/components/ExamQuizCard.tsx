"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import SourceCitations from "@/components/SourceCitations";
import {
  ApiError,
  generateQuiz,
  getQuiz,
  submitQuizAttempt,
} from "@/lib/api";
import {
  buildExamReportText,
  downloadExamReport,
  type ExamReportData,
} from "@/lib/exam-report";
import type {
  MCQOptions,
  QuestionResult,
  QuizAttemptResponse,
  QuizDifficulty,
  QuizQuestion,
  SourceCitation,
} from "@/types";

type Phase = "setup" | "exam" | "results";

const TIME_PRESETS = [
  { label: "5 min", seconds: 5 * 60 },
  { label: "10 min", seconds: 10 * 60 },
  { label: "15 min", seconds: 15 * 60 },
  { label: "20 min", seconds: 20 * 60 },
  { label: "30 min", seconds: 30 * 60 },
];

function getOptions(question: QuizQuestion): { key: string; label: string }[] {
  const opts = question.options;
  if (typeof opts === "object" && opts !== null && "A" in opts) {
    const mcq = opts as MCQOptions;
    return (["A", "B", "C", "D"] as const).map((key) => ({
      key,
      label: mcq[key],
    }));
  }
  return Object.entries(opts as Record<string, string>).map(([key, label]) => ({
    key,
    label,
  }));
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ExamQuizCard({
  documentId,
  documentName,
  courseName,
  userId,
}: {
  documentId: string;
  documentName: string;
  courseName?: string | null;
  userId: string;
}) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [difficulty, setDifficulty] = useState<QuizDifficulty>("medium");
  const [numQuestions, setNumQuestions] = useState(10);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(15 * 60);

  const [quizId, setQuizId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<QuizAttemptResponse | null>(null);
  const [fullQuestions, setFullQuestions] = useState<QuizQuestion[]>([]);
  const [quizSources, setQuizSources] = useState<SourceCitation[]>([]);
  const [showExplanations, setShowExplanations] = useState(false);

  const [secondsLeft, setSecondsLeft] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const examStartedAt = useRef<number | null>(null);
  const submittedRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeUpNotice, setTimeUpNotice] = useState(false);

  const submitExam = useCallback(
    async (forced = false) => {
      if (!quizId || submittedRef.current) return;
      submittedRef.current = true;

      const elapsed = examStartedAt.current
        ? Math.min(
            timeLimitSeconds,
            Math.floor((Date.now() - examStartedAt.current) / 1000)
          )
        : timeLimitSeconds;

      setLoading(true);
      setError(null);
      if (forced) setTimeUpNotice(true);

      try {
        const attempt = await submitQuizAttempt(quizId, userId, answers, {
          mode: "exam",
          timeLimitSeconds,
          elapsedSeconds: elapsed,
        });
        setResults(attempt);
        setElapsedSeconds(elapsed);

        const full = await getQuiz(quizId);
        setFullQuestions(full.questions as QuizQuestion[]);
        setPhase("results");
      } catch (err) {
        submittedRef.current = false;
        setError(
          err instanceof ApiError ? err.message : "Failed to submit exam"
        );
      } finally {
        setLoading(false);
      }
    },
    [quizId, userId, answers, timeLimitSeconds]
  );

  useEffect(() => {
    if (phase !== "exam" || secondsLeft <= 0) return;

    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          void submitExam(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [phase, secondsLeft, submitExam]);

  const handleStartExam = async () => {
    setLoading(true);
    setError(null);
    setTimeUpNotice(false);
    submittedRef.current = false;
    try {
      const data = await generateQuiz(
        documentId,
        difficulty,
        numQuestions,
        true
      );
      setQuizId(data.quiz_id);
      setQuestions(data.questions);
      setQuizSources(data.source_citations ?? []);
      setCurrentIndex(0);
      setAnswers({});
      setResults(null);
      setFullQuestions([]);
      setShowExplanations(false);
      setSecondsLeft(timeLimitSeconds);
      examStartedAt.current = Date.now();
      setPhase("exam");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to start exam"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (optionKey: string) => {
    setAnswers((prev) => ({ ...prev, [String(currentIndex)]: optionKey }));
  };

  const resetExam = () => {
    setPhase("setup");
    setQuizId(null);
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers({});
    setResults(null);
    setError(null);
    setTimeUpNotice(false);
    submittedRef.current = false;
    examStartedAt.current = null;
  };

  const buildReportData = (): ExamReportData | null => {
    if (!results) return null;
    const qs = fullQuestions.length > 0 ? fullQuestions : questions;
    return {
      documentName,
      courseName,
      difficulty,
      score: results.score,
      total: results.total,
      percentage: results.percentage,
      elapsedSeconds,
      timeLimitSeconds,
      takenAt: new Date().toISOString(),
      results: results.results,
      questions: qs,
    };
  };

  const handleExport = (format: "txt" | "json") => {
    const data = buildReportData();
    if (!data) return;
    downloadExamReport(data, format);
  };

  const handleCopyReport = async () => {
    const data = buildReportData();
    if (!data) return;
    await navigator.clipboard.writeText(buildExamReportText(data));
  };

  if (phase === "setup") {
    return (
      <div className="space-y-6 max-w-xl">
        <div className="surface-card border-accent/20 bg-accent-muted/20 p-5">
          <h2 className="font-semibold text-foreground">Exam mode</h2>
          <ul className="text-sm text-foreground-secondary mt-2 space-y-1 list-disc list-inside">
            <li>Timed — auto-submits when time runs out</li>
            <li>No hints or explanations during the exam</li>
            <li>Download a score report when finished</li>
          </ul>
        </div>

        <div>
          <span className="label-field">
            Difficulty
          </span>
          <div className="flex gap-2">
            {(["easy", "medium", "hard"] as QuizDifficulty[]).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setDifficulty(level)}
                className={`px-4 py-2.5 rounded-xl text-sm border capitalize transition-all ${
                  difficulty === level
                    ? "bg-accent text-white border-accent shadow-glow-sm"
                    : "border-subtle text-foreground-secondary hover:bg-elevated"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label-field">
            Questions: {numQuestions}
          </label>
          <input
            type="range"
            min={5}
            max={20}
            value={numQuestions}
            onChange={(e) => setNumQuestions(Number(e.target.value))}
            className="w-full accent-accent"
          />
        </div>

        <div>
          <span className="label-field">
            Time limit
          </span>
          <div className="flex flex-wrap gap-2">
            {TIME_PRESETS.map((preset) => (
              <button
                key={preset.seconds}
                type="button"
                onClick={() => setTimeLimitSeconds(preset.seconds)}
                className={`px-3 py-1.5 rounded-xl text-sm border transition-all ${
                  timeLimitSeconds === preset.seconds
                    ? "bg-accent text-white border-accent shadow-glow-sm"
                    : "border-subtle text-foreground-secondary hover:bg-elevated"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="alert-error">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleStartExam}
          disabled={loading}
          className="btn-glow !py-3 disabled:opacity-50"
        >
          {loading ? "Preparing exam..." : "Start exam"}
        </button>
      </div>
    );
  }

  if (phase === "results" && results) {
    const reportQuestions = fullQuestions.length > 0 ? fullQuestions : questions;

    return (
      <div className="space-y-6 max-w-2xl">
        {timeUpNotice && (
          <p className="text-sm text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
            Time expired — your answers were submitted automatically.
          </p>
        )}

        <div className="surface-card border-accent/30 bg-accent-muted/30 p-8 text-center shadow-glow-sm">
          <p className="text-sm uppercase tracking-wide text-muted">Exam complete</p>
          <p className="text-4xl font-bold mt-2 text-foreground font-mono">
            {results.score} / {results.total}
          </p>
          <p className="text-accent mt-1 font-mono text-xl">{results.percentage}%</p>
          <p className="text-xs text-muted mt-3 font-mono">
            Time: {formatTimer(elapsedSeconds)} of {formatTimer(timeLimitSeconds)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleExport("txt")}
            className="btn-glow !py-2"
          >
            Download report (.txt)
          </button>
          <button
            type="button"
            onClick={() => handleExport("json")}
            className="btn-ghost !py-2"
          >
            Download JSON
          </button>
          <button
            type="button"
            onClick={() => void handleCopyReport()}
            className="btn-ghost !py-2"
          >
            Copy report
          </button>
        </div>

        {results.wrong_concepts.length > 0 && (
          <div className="surface-card border-amber-500/20 bg-amber-500/5 p-4">
            <h3 className="text-sm font-semibold text-amber-200 mb-2">
              Topics to review
            </h3>
            <ul className="list-disc list-inside text-sm text-foreground-secondary">
              {results.wrong_concepts.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <button
            type="button"
            onClick={() => setShowExplanations((v) => !v)}
            className="text-sm text-accent font-medium hover:text-accent-hover"
          >
            {showExplanations ? "Hide explanations" : "Show explanations"}
          </button>
        </div>

        {quizSources.length > 0 && (
          <SourceCitations
            sources={quizSources}
            title="Exam grounded in these lecture sections"
          />
        )}

        {showExplanations && (
          <div className="space-y-3">
            {results.results.map((item: QuestionResult) => {
              const q = reportQuestions[item.question_index];
              return (
                <div
                  key={item.question_index}
                  className={`surface-card p-4 text-sm ${
                    item.correct ? "border-success/30" : "border-red-500/30"
                  }`}
                >
                  <p className="font-medium text-foreground">{q?.question}</p>
                  <p className="mt-2 text-foreground-secondary font-mono text-xs">
                    You: {item.chosen || "—"} · Correct: {item.correct_answer}
                  </p>
                  {q?.explanation && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-muted">
                        Why this answer?
                      </p>
                      <p className="mt-1 text-foreground-secondary">{q.explanation}</p>
                    </div>
                  )}
                  {item.sources && item.sources.length > 0 && (
                    <SourceCitations
                      sources={item.sources}
                      title="Supporting excerpts"
                      compact
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={resetExam}
          className="btn-ghost !py-2"
        >
          Take another exam
        </button>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  if (!currentQuestion) return null;

  const options = getOptions(currentQuestion);
  const selectedAnswer = answers[String(currentIndex)];
  const allAnswered = questions.every((_, i) => answers[String(i)] !== undefined);
  const timerUrgent = secondsLeft <= 60;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-semibold text-foreground uppercase tracking-wide">
          Exam in progress
        </span>
        <div
          className={`text-lg font-mono font-bold px-4 py-1.5 rounded-xl border ${
            timerUrgent
              ? "bg-red-500/15 text-red-400 border-red-500/40 animate-pulse shadow-glow-sm"
              : "bg-elevated text-foreground border-subtle"
          }`}
        >
          {formatTimer(secondsLeft)}
        </div>
      </div>

      <p className="text-xs text-muted font-mono">
        No hints · Question {currentIndex + 1} of {questions.length}
      </p>

      <div className="w-full bg-elevated rounded-full h-2 border border-subtle overflow-hidden">
        <div
          className="bg-accent h-2 rounded-full transition-all shadow-glow-sm"
          style={{
            width: `${((currentIndex + 1) / questions.length) * 100}%`,
          }}
        />
      </div>

      <p className="text-lg font-medium text-foreground">
        {currentQuestion.question}
      </p>

      <div className="grid gap-3">
        {options.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => handleSelect(key)}
            className={`text-left px-5 py-4 rounded-xl border text-base transition-all ${
              selectedAnswer === key
                ? "border-accent bg-accent-muted shadow-glow-sm"
                : "border-subtle bg-elevated hover:border-accent/40"
            }`}
          >
            <span className="font-mono font-bold mr-3 text-accent">{key}.</span>
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p className="alert-error">{error}</p>
      )}

      <div className="flex flex-wrap gap-2 justify-between">
        <button
          type="button"
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          className="btn-ghost !py-2 disabled:opacity-40"
        >
          Previous
        </button>
        <div className="flex gap-2">
          {currentIndex < questions.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentIndex((i) => i + 1)}
              className="btn-glow !py-2"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void submitExam(false)}
              disabled={!allAnswered || loading}
              className="btn-glow !py-2 disabled:opacity-50"
            >
              {loading ? "Submitting…" : "Submit exam"}
            </button>
          )}
        </div>
      </div>

      {!allAnswered && currentIndex === questions.length - 1 && (
        <p className="text-xs text-amber-400">
          Answer all questions before submitting.
        </p>
      )}
    </div>
  );
}
