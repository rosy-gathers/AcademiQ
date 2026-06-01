"use client";

import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/components/dashboard/EmptyState";
import { ApiError, getWeakConcepts } from "@/lib/api";
import type { WeakConceptItem } from "@/types";

const CHART_TOOLTIP_STYLE = {
  backgroundColor: "#12121A",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
  color: "#FAFAFA",
  fontSize: 12,
};

function truncateLabel(label: string, max = 28): string {
  return label.length > max ? `${label.slice(0, max)}…` : label;
}

export default function WeakConceptsChart({ userId }: { userId: string }) {
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
        if (!cancelled) setItems(data.weak_concepts.slice(0, 8));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load analytics");
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

  const chartData = useMemo(
    () =>
      items.map((item) => ({
        concept: truncateLabel(item.concept),
        fullConcept: item.concept,
        wrong_count: item.wrong_count,
      })),
    [items]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
      className="surface-card p-6"
    >
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="w-5 h-5 text-accent" />
        <h2 className="text-lg font-semibold text-foreground">Weak concepts</h2>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
          <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          Loading chart…
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {!loading && !error && chartData.length === 0 && (
        <EmptyState
          icon={BarChart3}
          title="No weak spots yet"
          description="Complete a quiz to see which topics need more practice — we'll chart them here."
        />
      )}

      {!loading && !error && chartData.length > 0 && (
        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.06)"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fill: "#71717A", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="concept"
                width={100}
                tick={{ fill: "#A1A1AA", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                cursor={{ fill: "rgba(124, 111, 247, 0.08)" }}
                formatter={(value: number) => [`${value} misses`, "Wrong"]}
                labelFormatter={(_label, payload) =>
                  (payload?.[0]?.payload as { fullConcept?: string })?.fullConcept ?? _label
                }
              />
              <Bar
                dataKey="wrong_count"
                fill="#7C6FF7"
                radius={[0, 6, 6, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {!loading && !error && chartData.length > 0 && (
        <p className="text-xs text-muted mt-4">Ranked by quiz miss count</p>
      )}
    </motion.div>
  );
}
