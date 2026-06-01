"use client";

import { motion } from "framer-motion";
import { FileText, Flame, HelpCircle, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ApiError, getWeakConcepts, listFlashcards, listQuizAttempts } from "@/lib/api";

function computeQuizAverage(percentages: number[]): number | null {
  if (percentages.length === 0) return null;
  const sum = percentages.reduce((acc, p) => acc + p, 0);
  return Math.round(sum / percentages.length);
}

type StatCardProps = {
  label: string;
  value: string | number;
  sub?: string;
  icon: typeof FileText;
  delay: number;
  accent?: "default" | "success" | "warning";
};

function StatCard({ label, value, sub, icon: Icon, delay, accent = "default" }: StatCardProps) {
  const valueColor =
    accent === "success"
      ? "text-success"
      : accent === "warning"
        ? "text-amber-400"
        : "text-accent";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className="surface-card surface-card-hover p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted uppercase tracking-wider mb-2">
            {label}
          </p>
          <p className={`text-3xl font-bold font-mono tabular-nums leading-none ${valueColor}`}>
            {value}
          </p>
          {sub && <p className="text-xs text-foreground-secondary mt-2">{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl bg-accent-muted flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-accent" />
        </div>
      </div>
    </motion.div>
  );
}

export default function DashboardStatCards({
  userId,
  documentCount,
  loadingDocs,
}: {
  userId: string;
  documentCount: number;
  loadingDocs: boolean;
}) {
  const [quizAvg, setQuizAvg] = useState<number | null>(null);
  const [dueToday, setDueToday] = useState(0);
  const [weakCount, setWeakCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [quizzes, weak, flashcards] = await Promise.all([
          listQuizAttempts(userId),
          getWeakConcepts(userId),
          listFlashcards(userId, true),
        ]);
        if (!cancelled) {
          setQuizAvg(
            computeQuizAverage(quizzes.attempts.map((a) => a.percentage))
          );
          setDueToday(flashcards.due_count);
          setWeakCount(weak.weak_concepts.length);
        }
      } catch (err) {
        if (!cancelled && !(err instanceof ApiError)) {
          setQuizAvg(null);
          setDueToday(0);
          setWeakCount(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (userId) load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const stats = useMemo(
    () => [
      {
        label: "Documents",
        value: loadingDocs ? "—" : documentCount,
        sub: "In your library",
        icon: FileText,
        accent: "default" as const,
      },
      {
        label: "Quiz avg",
        value: loading ? "—" : quizAvg === null ? "—" : `${quizAvg}%`,
        sub: quizAvg === null ? "No quizzes yet" : "Across all attempts",
        icon: Trophy,
        accent: "success" as const,
      },
      {
        label: "Due today",
        value: loading ? "—" : dueToday,
        sub: dueToday === 1 ? "Flashcard to review" : "Flashcards to review",
        icon: Flame,
        accent: "warning" as const,
      },
      {
        label: "Weak concepts",
        value: loading ? "—" : weakCount,
        sub: "From quiz history",
        icon: HelpCircle,
        accent: "default" as const,
      },
    ],
    [documentCount, loadingDocs, loading, quizAvg, dueToday, weakCount]
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <StatCard key={stat.label} {...stat} delay={i * 0.06} />
      ))}
    </div>
  );
}
