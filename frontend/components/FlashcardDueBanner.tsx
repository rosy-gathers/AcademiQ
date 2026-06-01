"use client";

import { motion } from "framer-motion";
import { ArrowRight, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { listFlashcards } from "@/lib/api";

export default function FlashcardDueBanner({ userId }: { userId: string }) {
  const [dueCount, setDueCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listFlashcards(userId, true)
      .then((data) => {
        if (!cancelled) setDueCount(data.due_count);
      })
      .catch(() => {
        if (!cancelled) setDueCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (dueCount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface-card border-accent/30 bg-accent-muted/50 px-4 py-3 flex flex-wrap items-center justify-between gap-3"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-accent/20 flex items-center justify-center">
          <RotateCcw className="w-4 h-4 text-accent" />
        </div>
        <p className="text-sm text-foreground">
          <span className="font-semibold text-accent font-mono">{dueCount}</span> flashcard
          {dueCount === 1 ? "" : "s"} due for review
        </p>
      </div>
      <Link
        href="/flashcards"
        className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover transition-colors"
      >
        Start review
        <ArrowRight className="w-4 h-4" />
      </Link>
    </motion.div>
  );
}
