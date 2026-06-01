"use client";

import { useState } from "react";

import { ApiError, updateDocumentOrganization } from "@/lib/api";
import { formatTagsInput, parseTagsInput } from "@/lib/document-tags";
import type { Document } from "@/types";

export default function DocumentOrganizationSettings({
  document,
  onUpdated,
}: {
  document: Document;
  onUpdated?: (doc: Document) => void;
}) {
  const [folder, setFolder] = useState(document.folder ?? "");
  const [tagsInput, setTagsInput] = useState(formatTagsInput(document.tags));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const updated = await updateDocumentOrganization(document.id, {
        folder: folder.trim() || null,
        tags: parseTagsInput(tagsInput),
      });
      onUpdated?.(updated);
      setFolder(updated.folder ?? "");
      setTagsInput(formatTagsInput(updated.tags));
      setMessage("Organization saved.");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not save folder/tags."
      );
    } finally {
      setSaving(false);
    }
  };

  const dirty =
    folder.trim() !== (document.folder ?? "").trim() ||
    parseTagsInput(tagsInput).join("|") !==
      (document.tags ?? []).join("|");

  return (
    <section className="surface-card p-4 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Folder &amp; tags</h2>
        <p className="text-xs text-muted mt-0.5">
          Group lectures on your dashboard by folder or filter by tag.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Folder</label>
          <input
            className="w-full rounded-xl border border-subtle bg-elevated px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
            placeholder="Semester 6"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            disabled={saving}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Tags</label>
          <input
            className="w-full rounded-xl border border-subtle bg-elevated px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
            placeholder="midterm, os"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            disabled={saving}
          />
        </div>
      </div>

      {(document.folder || (document.tags?.length ?? 0) > 0) && (
        <div className="flex flex-wrap gap-2 text-xs">
          {document.folder && (
            <span className="px-2 py-0.5 rounded-full bg-accent-muted text-accent border border-accent/20">
              {document.folder}
            </span>
          )}
          {(document.tags ?? []).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full bg-elevated text-muted border border-subtle font-mono"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty}
          className="btn-glow !py-2 !px-4 text-sm disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save organization"}
        </button>
        {message && <span className="text-xs text-success">{message}</span>}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </section>
  );
}
