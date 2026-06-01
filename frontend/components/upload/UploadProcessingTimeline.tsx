"use client";

import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";

export type TimelineStep = {
  id: string;
  label: string;
};

type UploadProcessingTimelineProps = {
  steps: TimelineStep[];
  currentStepId: string | null;
  failed?: boolean;
};

function stepIndex(steps: TimelineStep[], id: string | null): number {
  if (!id) return -1;
  return steps.findIndex((s) => s.id === id);
}

export default function UploadProcessingTimeline({
  steps,
  currentStepId,
  failed = false,
}: UploadProcessingTimelineProps) {
  const currentIdx = stepIndex(steps, currentStepId);
  if (currentIdx < 0 && !failed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface-card p-5"
    >
      <div className="flex items-center justify-between gap-2">
        {steps.map((step, i) => {
          const isComplete = currentIdx > i || (currentStepId === "done" && step.id === "done");
          const isCurrent = step.id === currentStepId;
          const isPending = currentIdx < i;

          return (
            <div key={step.id} className="flex flex-1 items-center min-w-0">
              <div className="flex flex-col items-center flex-1 min-w-0">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    failed && isCurrent
                      ? "border-red-500 bg-red-500/15"
                      : isComplete
                        ? "border-success bg-success/15 shadow-glow-sm"
                        : isCurrent
                          ? "border-accent bg-accent-muted shadow-glow"
                          : "border-subtle bg-elevated"
                  }`}
                >
                  {isComplete ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : isCurrent && !failed ? (
                    <Loader2 className="w-4 h-4 text-accent animate-spin" />
                  ) : (
                    <span
                      className={`text-xs font-mono font-bold ${
                        isPending ? "text-muted" : "text-foreground-secondary"
                      }`}
                    >
                      {i + 1}
                    </span>
                  )}
                </div>
                <p
                  className={`mt-2 text-xs font-medium text-center truncate w-full px-1 ${
                    isCurrent
                      ? failed
                        ? "text-red-400"
                        : "text-accent"
                      : isComplete
                        ? "text-success"
                        : "text-muted"
                  }`}
                >
                  {step.label}
                </p>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-1 mb-6 rounded-full transition-colors duration-500 ${
                    currentIdx > i ? "bg-success/60" : "bg-elevated"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
