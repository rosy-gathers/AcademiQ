"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface-card border-dashed border-accent/20 p-12 sm:p-16 text-center"
    >
      <div className="mx-auto w-16 h-16 rounded-2xl bg-accent-muted flex items-center justify-center mb-5 shadow-glow-sm">
        <Icon className="w-8 h-8 text-accent" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-foreground-secondary max-w-sm mx-auto mb-6">{description}</p>
      {action}
    </motion.div>
  );
}
