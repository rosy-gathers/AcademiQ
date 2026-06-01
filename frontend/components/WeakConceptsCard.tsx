"use client";

import { useEffect, useState } from "react";

import { ApiError, getWeakConcepts } from "@/lib/api";
import type { WeakConceptItem } from "@/types";

export default function WeakConceptsCard({ userId }: { userId: string }) {
  const [items, setItems] = useState<WeakConceptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getWeakConcepts(userId);
        if (!cancelled) {
          setItems(data.weak_concepts);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Failed to load analytics"
          );
          setItems([]);
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

  const maxCount = Math.max(...items.map((i) => i.wrong_count), 1);

  const colors = ["bg-red-500", "bg-orange-500", "bg-amber-500", "bg-yellow-500", "bg-lime-500"];

  return (
    <div className="card p-6 h-full flex flex-col">
      <h2 className="section-title mb-4">📌 Focus on these topics</h2>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
          Loading…
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
          <p className="text-3xl mb-2">🎉</p>
          <p className="text-sm text-slate-500">Complete a quiz to see which topics need more practice.</p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <ul className="space-y-3 flex-1">
          {items.map((item, i) => (
            <li key={item.concept}>
              <div className="flex items-center justify-between text-sm mb-1.5 gap-2">
                <span className="text-slate-800 font-medium truncate flex-1">{item.concept}</span>
                <span className="text-xs font-semibold text-slate-500 shrink-0 tabular-nums">
                  {item.wrong_count}×
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${colors[i % colors.length]} rounded-full transition-all duration-500`}
                  style={{ width: `${(item.wrong_count / maxCount) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-slate-400 mt-4">Based on your quiz attempts</p>
    </div>
  );
}
