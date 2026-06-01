"use client";

import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

import type { SourceCitation } from "@/types";

export default function SourceCitations({
  sources,
  title = "Sources from your lecture",
  compact = false,
}: {
  sources: SourceCitation[];
  title?: string;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(!compact);

  if (!sources.length) return null;

  return (
    <div className="mt-2 border border-subtle rounded-xl bg-elevated/50 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left text-xs font-semibold text-foreground-secondary hover:bg-elevated transition-colors"
      >
        <span>
          {title} ({sources.length})
        </span>
        <motion.span animate={{ rotate: expanded ? 180 : 0 }}>
          <ChevronDown className="w-4 h-4 text-muted" />
        </motion.span>
      </button>
      {expanded && (
        <ul className="px-3 pb-3 space-y-2 max-h-48 overflow-y-auto border-t border-subtle">
          {sources.map((src) => (
            <li
              key={`${src.chunk_index}-${src.index}`}
              className="text-xs text-foreground-secondary border-l-2 border-accent pl-2"
            >
              <span className="font-medium text-accent font-mono">
                Chunk {(src.chunk_index ?? 0) + 1}
              </span>
              <p className="mt-0.5 leading-relaxed">{src.excerpt}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
