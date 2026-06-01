"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ApiError, listQuizAttempts } from "@/lib/api";
import type { QuizAttemptSummary } from "@/types";

function computeStudyStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const daySet = new Set(
    dates.map((d) => new Date(d).toISOString().slice(0, 10))
  );
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);

  const todayKey = cursor.toISOString().slice(0, 10);
  if (!daySet.has(todayKey)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  let streak = 0;
  while (daySet.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

function formatChartDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function DashboardStats({ userId }: { userId: string }) {
  const [attempts, setAttempts] = useState<QuizAttemptSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await listQuizAttempts(userId);
        if (!cancelled) {
          setAttempts([...data.attempts].reverse());
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Failed to load quiz stats"
          );
          setAttempts([]);
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

  const chartData = useMemo(
    () =>
      attempts.map((a, i) => ({
        name: formatChartDate(a.taken_at) || `Quiz ${i + 1}`,
        percentage: a.percentage,
        label: `${a.score}/${a.total}`,
      })),
    [attempts]
  );

  const studyStreak = useMemo(
    () => computeStudyStreak(attempts.map((a) => a.taken_at)),
    [attempts]
  );

  const avgScore = attempts.length
    ? Math.round(attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length)
    : null;

  return (
    <div className="space-y-4">
      {/* Stat pills */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Study streak</p>
          <div className="flex items-end gap-1.5">
            <span className="text-3xl font-bold text-indigo-600 leading-none">
              {loading ? "—" : studyStreak}
            </span>
            <span className="text-sm text-slate-500 mb-0.5">
              {studyStreak === 1 ? "day" : "days"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Consecutive quiz days</p>
        </div>

        <div className="card p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Avg. score</p>
          <div className="flex items-end gap-1.5">
            <span className="text-3xl font-bold text-emerald-600 leading-none">
              {loading ? "—" : avgScore !== null ? `${avgScore}%` : "—"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Across all quizzes</p>
        </div>
      </div>

      {/* Chart card */}
      <div className="card p-5">
        <h2 className="section-title mb-4">Recent quiz scores</h2>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
            Loading scores…
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        {!loading && !error && chartData.length === 0 && (
          <div className="text-center py-8">
            <p className="text-3xl mb-2">📊</p>
            <p className="text-sm text-slate-500">Complete a quiz to see your score history.</p>
          </div>
        )}

        {!loading && !error && chartData.length > 0 && (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={24}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  unit="%"
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    fontSize: 12,
                  }}
                  formatter={(value: number, _name, props) => [
                    `${value}% (${(props.payload as { label: string }).label})`,
                    "Score",
                  ]}
                />
                <Bar
                  dataKey="percentage"
                  fill="url(#barGrad)"
                  radius={[6, 6, 0, 0]}
                />
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#818cf8" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <p className="text-xs text-slate-400 mt-3">Last {attempts.length} quiz attempts</p>
      </div>
    </div>
  );
}
