"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export type DocumentTabId = "notes" | "quiz" | "chat" | "transcript" | "exam";

export type DocumentTab = {
  id: DocumentTabId;
  label: string;
  icon: LucideIcon;
};

type DocumentTabsProps = {
  tabs: DocumentTab[];
  active: DocumentTabId;
  onChange: (id: DocumentTabId) => void;
};

export default function DocumentTabs({ tabs, active, onChange }: DocumentTabsProps) {
  return (
    <div className="surface-card p-1.5 flex flex-wrap gap-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isActive ? "text-accent" : "text-foreground-secondary hover:text-foreground"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="doc-tab-indicator"
                className="absolute inset-0 bg-accent-muted border border-accent/25 rounded-xl shadow-glow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <Icon className={`w-4 h-4 relative z-10 ${isActive ? "text-accent" : ""}`} />
            <span className="relative z-10">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
