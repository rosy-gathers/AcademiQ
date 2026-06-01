"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { useState } from "react";

import SourceCitations from "@/components/SourceCitations";
import { ApiError, generateQuiz, submitQuizAttempt } from "@/lib/api";
import type {
  MCQOptions,
  QuestionResult,
  QuizAttemptResponse,
  QuizDifficulty,
  QuizQuestion,
  SourceCitation,
} from "@/types";

type Phase = "setup" | "quiz" | "results";

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

function ScoreRing({ percentage }: { percentage: number }) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="8"
        />
        <motion.circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke="#7C6FF7"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
          className="text-3xl font-bold font-mono text-accent"
        >
          {percentage}%
        </motion.span>
      </div>
    </div>
  );
}

export default function QuizCard({
  documentId,
  userId,
}: {
  documentId: string;
  userId: string;
}) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [difficulty, setDifficulty] = useState<QuizDifficulty>("medium");
  const [numQuestions, setNumQuestions] = useState(10);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<QuizAttemptResponse | null>(null);
  const [quizSources, setQuizSources] = useState<SourceCitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await generateQuiz(documentId, difficulty, numQuestions);
      setQuizId(data.quiz_id);
      setQuestions(data.questions);
      setQuizSources(data.source_citations ?? []);
      setCurrentIndex(0);
      setAnswers({});
      setResults(null);
      setPhase("quiz");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to generate quiz");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (optionKey: string) => {
    setAnswers((prev) => ({ ...prev, [String(currentIndex)]: optionKey }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex((i) => i + 1);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const handleSubmit = async () => {
    if (!quizId) return;
    setLoading(true);
    setError(null);
    try {
      const attempt = await submitQuizAttempt(quizId, userId, answers);
      setResults(attempt);
      setPhase("results");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit quiz");
    } finally {
      setLoading(false);
    }
  };

  const resetQuiz = () => {
    setPhase("setup");
    setQuizId(null);
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers({});
    setResults(null);
    setQuizSources([]);
    setError(null);
  };

  const currentQuestion = questions[currentIndex];
  const selectedAnswer = answers[String(currentIndex)];
  const allAnswered =
    questions.length > 0 &&
    questions.every((_, i) => answers[String(i)] !== undefined);
  const progress = questions.length
    ? ((currentIndex + 1) / questions.length) * 100
    : 0;

  if (phase === "setup") {
    return (
      <div className="space-y-6 max-w-xl">
        <div className="surface-card p-6 space-y-6">
          <div>
            <span className="block text-xs font-medium text-muted uppercase tracking-wider mb-3">
              Difficulty
            </span>
            <div className="flex gap-2">
              {(["easy", "medium", "hard"] as QuizDifficulty[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDifficulty(level)}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium capitalize transition-all ${
                    difficulty === level
                      ? "bg-accent text-white shadow-glow-sm"
                      : "bg-elevated border border-subtle text-foreground-secondary hover:border-accent/30"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-3">
              Questions: <span className="text-accent font-mono">{numQuestions}</span>
            </label>
            <input
              type="range"
              min={5}
              max={20}
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
              className="w-full accent-accent"
            />
            <div className="flex justify-between text-xs text-muted font-mono mt-1">
              <span>5</span>
              <span>20</span>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="btn-glow w-full justify-center py-3 disabled:opacity-50"
          >
            {loading ? "Generating quiz…" : "Start quiz"}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "results" && results) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6 max-w-2xl"
      >
        <div className="surface-card p-8 text-center border-accent/20">
          <ScoreRing percentage={results.percentage} />
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6"
          >
            <p className="text-2xl font-bold text-foreground font-mono">
              {results.score} / {results.total}
            </p>
            <p className="text-sm text-foreground-secondary mt-1">correct answers</p>
          </motion.div>
        </div>

        {results.wrong_concepts.length > 0 && (
          <div className="surface-card border-amber-500/20 bg-amber-500/5 p-5">
            <h3 className="text-sm font-semibold text-amber-200 mb-2">Focus on these topics</h3>
            <ul className="space-y-1">
              {results.wrong_concepts.map((concept) => (
                <li key={concept} className="text-sm text-foreground-secondary">
                  · {concept}
                </li>
              ))}
            </ul>
          </div>
        )}

        {quizSources.length > 0 && (
          <SourceCitations
            sources={quizSources}
            title="Quiz grounded in these lecture sections"
          />
        )}

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Breakdown</h3>
          {results.results.map((item: QuestionResult) => (
            <div
              key={item.question_index}
              className={`surface-card p-4 text-sm border ${
                item.correct ? "border-success/30" : "border-red-500/30"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {item.correct ? (
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <p className="font-medium text-foreground">
                  Q{item.question_index + 1}: {item.correct ? "Correct" : "Incorrect"}
                </p>
              </div>
              <p className="text-foreground-secondary font-mono text-xs mt-1">
                You: {item.chosen || "—"} · Answer: {item.correct_answer}
              </p>
              {!item.correct && item.explanation && (
                <p className="mt-2 text-foreground-secondary text-xs leading-relaxed">
                  {item.explanation}
                </p>
              )}
              {item.sources && item.sources.length > 0 && (
                <SourceCitations sources={item.sources} title="Sources" compact />
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={resetQuiz}
          className="btn-ghost w-full justify-center py-3"
        >
          <RotateCcw className="w-4 h-4" />
          Take another quiz
        </button>
      </motion.div>
    );
  }

  if (!currentQuestion) return null;

  const options = getOptions(currentQuestion);

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted font-mono">
          <span className="capitalize">{difficulty}</span>
          <span>
            {currentIndex + 1} / {questions.length}
          </span>
        </div>
        <div className="h-2 bg-elevated rounded-full overflow-hidden border border-subtle">
          <motion.div
            className="h-full bg-accent rounded-full shadow-glow-sm"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          <p className="text-lg sm:text-xl font-semibold text-foreground leading-snug">
            {currentQuestion.question}
          </p>

          <div className="grid gap-3">
            {options.map(({ key, label }) => {
              const selected = selectedAnswer === key;
              return (
                <motion.button
                  key={key}
                  type="button"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => handleSelect(key)}
                  className={`text-left px-5 py-4 rounded-xl border text-base transition-all ${
                    selected
                      ? "border-accent bg-accent-muted shadow-glow-sm"
                      : "border-subtle bg-elevated hover:border-accent/40 hover:bg-card"
                  }`}
                >
                  <span
                    className={`font-mono font-bold mr-3 ${
                      selected ? "text-accent" : "text-muted"
                    }`}
                  >
                    {key}.
                  </span>
                  <span className={selected ? "text-foreground" : "text-foreground-secondary"}>
                    {label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2 justify-between pt-2">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="btn-ghost !py-2 disabled:opacity-40"
        >
          Previous
        </button>

        <div className="flex gap-2">
          {currentIndex < questions.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!selectedAnswer}
              className="btn-glow !py-2 disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!allAnswered || loading}
              className="btn-glow !py-2 disabled:opacity-50"
            >
              {loading ? "Submitting…" : "Submit quiz"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
