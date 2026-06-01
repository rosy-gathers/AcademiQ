"use client";

import { motion } from "framer-motion";
import { ArrowRight, Calendar } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ApiError, listStudyPlanReminders } from "@/lib/api";
import type { StudyPlanItem } from "@/types";

function formatDueLabel(iso: string): string {
  const due = new Date(iso);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "Overdue";
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  return `Due in ${diffDays} days`;
}

export default function StudyPlanReminders({ userId }: { userId: string }) {
  const [items, setItems] = useState<StudyPlanItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await listStudyPlanReminders(userId);
        if (!cancelled) setItems(data.items);
      } catch (err) {
        if (!cancelled) {
          if (!(err instanceof ApiError && err.code === "REQUEST_FAILED")) {
            setItems([]);
          }
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

  if (loading || items.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface-card border-amber-500/20 bg-amber-500/5 px-4 py-3 flex flex-wrap items-start justify-between gap-3"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-4 h-4 text-amber-400" />
          <p className="text-sm font-semibold text-amber-200">
            Study reminders ({items.length})
          </p>
        </div>
        <ul className="space-y-1">
          {items.slice(0, 3).map((item) => (
            <li key={item.id} className="text-sm text-foreground-secondary truncate">
              <span className="font-medium text-foreground">{item.title}</span>
              <span className="text-amber-400/80"> · {formatDueLabel(item.due_at)}</span>
            </li>
          ))}
          {items.length > 3 && (
            <li className="text-xs text-muted">+{items.length - 3} more</li>
          )}
        </ul>
      </div>
      <Link
        href="/study-plan"
        className="shrink-0 inline-flex items-center gap-1 text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors"
      >
        Open plan
        <ArrowRight className="w-4 h-4" />
      </Link>
    </motion.div>
  );
}
