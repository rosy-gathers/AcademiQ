"use client";

import { useState } from "react";

import { ApiError, updateDocumentLanguage } from "@/lib/api";
import type { Document, LanguageCode, LanguageOverride } from "@/types";

const OPTIONS: { value: LanguageOverride; label: string; hint: string }[] = [
  {
    value: "auto",
    label: "Auto-detect",
    hint: "Best for mixed English/Bengali PDFs — chat detects each message",
  },
  {
    value: "en",
    label: "English",
    hint: "Always respond and generate notes in English",
  },
  {
    value: "bn",
    label: "বাংলা",
    hint: "Always respond and generate notes in Bengali",
  },
];

export default function DocumentLanguageSettings({
  document,
  onUpdated,
}: {
  document: Document;
  onUpdated?: (doc: Document) => void;
}) {
  const current = (document.language_override ?? "auto") as LanguageOverride;
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (value: LanguageOverride) => {
    if (value === current) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const updated = await updateDocumentLanguage(document.id, value);
      onUpdated?.(updated);
      setMessage(
        value === "auto"
          ? "Language set to auto-detect for this lecture."
          : `Language locked to ${value === "bn" ? "Bengali" : "English"} for this lecture.`
      );
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to update language"
      );
    } finally {
      setSaving(false);
    }
  };

  const activeHint = OPTIONS.find((o) => o.value === current)?.hint;

  return (
    <div className="surface-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Lecture language</h2>
          <p className="text-xs text-muted mt-0.5">
            Overrides auto-detection for chat and note generation
          </p>
        </div>
        {saving && <span className="text-xs text-muted">Saving…</span>}
      </div>

      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={saving}
            onClick={() => void handleChange(opt.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all disabled:opacity-50 ${
              current === opt.value
                ? "bg-accent text-white border-accent shadow-glow-sm"
                : "border-subtle text-foreground-secondary hover:bg-elevated"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {activeHint && <p className="text-xs text-foreground-secondary mt-3">{activeHint}</p>}
      {message && <p className="text-xs text-success mt-2">{message}</p>}
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );
}

export function effectiveNotesLanguage(
  override: LanguageOverride | string | undefined
): LanguageCode | null {
  if (override === "en" || override === "bn") return override;
  return null;
}
