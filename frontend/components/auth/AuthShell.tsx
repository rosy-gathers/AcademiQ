"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
};

export default function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4 py-12">
      <div className="fixed inset-0 mesh-gradient -z-20" />
      <div className="fixed inset-0 hero-gradient -z-10" />
      <motion.div
        className="fixed top-1/4 -left-32 w-96 h-96 rounded-full bg-accent/15 blur-[120px] -z-10"
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center shadow-glow-sm group-hover:shadow-glow transition-shadow">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-lg font-bold text-foreground group-hover:text-accent transition-colors">
              AcademiQ
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-foreground mt-6 tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-foreground-secondary">{subtitle}</p>
        </div>

        <div className="surface-card p-8 shadow-card">{children}</div>

        <div className="text-center text-sm text-foreground-secondary mt-6">{footer}</div>
      </motion.div>
    </div>
  );
}
