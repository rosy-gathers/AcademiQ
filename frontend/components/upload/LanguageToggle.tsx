"use client";

import type { LanguageOverride } from "@/types";

const OPTIONS: { value: LanguageOverride; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "en", label: "English" },
  { value: "bn", label: "বাংলা" },
];

export default function LanguageToggle({
  value,
  onChange,
  disabled,
  hint = "Lecture language",
}: {
  value: LanguageOverride;
  onChange: (v: LanguageOverride) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted uppercase tracking-wider mb-3">{hint}</p>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            disabled={disabled}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all disabled:opacity-50 ${
              value === opt.value
                ? "bg-accent text-white border-accent shadow-glow-sm"
                : "border-subtle text-foreground-secondary hover:bg-elevated hover:border-accent/30"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
