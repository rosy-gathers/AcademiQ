"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiError, getNotes } from "@/lib/api";
import {
  isDocumentSaved,
  removeSavedDocument,
  saveDocumentOffline,
  type SavedDocument,
} from "@/lib/offline-store";
import type { Document } from "@/types";

export default function SaveForLaterButton({ document }: { document: Document }) {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    isDocumentSaved(document.id)
      .then((value) => {
        if (!cancelled) setSaved(value);
      })
      .catch(() => {
        if (!cancelled) setSaved(false);
      });
    return () => {
      cancelled = true;
    };
  }, [document.id]);

  const handleToggle = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      if (saved) {
        await removeSavedDocument(document.id);
        setSaved(false);
        setMessage("Removed from saved.");
      } else {
        let summary: string | null = null;
        let keyConcepts = null;
        let vivaQuestions = null;
        try {
          const notes = await getNotes(document.id);
          summary = notes.summary ?? null;
          keyConcepts = notes.key_concepts ?? null;
          vivaQuestions = notes.viva_questions ?? null;
        } catch (err) {
          if (!(err instanceof ApiError && err.code === "NOT_FOUND")) {
            throw err;
          }
        }

        const payload: SavedDocument = {
          documentId: document.id,
          filename: document.filename,
          courseName: document.course_name,
          folder: document.folder,
          tags: document.tags,
          sourceType: document.source_type,
          summary,
          keyConcepts,
          vivaQuestions,
          savedAt: new Date().toISOString(),
        };
        await saveDocumentOffline(payload);
        setSaved(true);
        setMessage("Saved for offline reading.");
      }
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Could not update saved copy."
      );
    } finally {
      setBusy(false);
      setTimeout(() => setMessage(null), 3000);
    }
  }, [document, saved]);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void handleToggle()}
        disabled={busy}
        className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
          saved
            ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
            : "border-subtle text-foreground-secondary hover:bg-elevated hover:text-foreground"
        } disabled:opacity-50`}
      >
        {busy ? "…" : saved ? "★ Saved" : "Save for later"}
      </button>
      {message && <span className="text-xs text-muted">{message}</span>}
    </div>
  );
}
