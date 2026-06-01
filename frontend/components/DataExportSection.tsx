"use client";

import { Download } from "lucide-react";
import { useState } from "react";

import { downloadUserDataExport } from "@/lib/export-data";

export default function DataExportSection({ userId }: { userId: string }) {
  const [includeChunks, setIncludeChunks] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    setMessage(null);
    try {
      await downloadUserDataExport(userId, includeChunks);
      setMessage("Download started. Check your downloads folder.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="surface-card p-6 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Download className="w-4 h-4 text-accent" />
          Export your data
        </h2>
        <p className="text-sm text-foreground-secondary mt-1">
          Download a JSON backup of your documents, AI notes, quizzes, attempts,
          flashcards, study plan, and chat history.
        </p>
      </div>

      <label className="flex items-start gap-3 text-sm text-foreground-secondary cursor-pointer">
        <input
          type="checkbox"
          checked={includeChunks}
          onChange={(e) => setIncludeChunks(e.target.checked)}
          disabled={exporting}
          className="mt-0.5 rounded border-subtle bg-elevated text-accent focus:ring-accent/30"
        />
        <span>
          Include full lecture text chunks (larger file, useful for archival or
          moving to another tool)
        </span>
      </label>

      {error && <p className="alert-error">{error}</p>}
      {message && <p className="alert-success">{message}</p>}

      <button
        type="button"
        onClick={() => void handleExport()}
        disabled={exporting}
        className="btn-glow !py-2.5 disabled:opacity-50"
      >
        {exporting ? "Preparing export…" : "Download JSON export"}
      </button>
    </section>
  );
}
