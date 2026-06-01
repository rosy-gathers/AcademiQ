"use client";

import { Bookmark } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/dashboard/EmptyState";
import { GlowButton } from "@/components/ui/GlowButton";
import { PageHeader } from "@/components/ui/PageHeader";
import ReadAloudButton from "@/components/ReadAloudButton";
import {
  listSavedDocuments,
  removeSavedDocument,
  type SavedDocument,
} from "@/lib/offline-store";

export default function SavedPage() {
  const [items, setItems] = useState<SavedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listSavedDocuments();
      setItems(data);
      setSelectedId((prev) => {
        if (prev && data.some((d) => d.documentId === prev)) return prev;
        return data[0]?.documentId ?? null;
      });
    } catch {
      setItems([]);
      setSelectedId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = items.find((i) => i.documentId === selectedId) ?? null;

  const handleRemove = async (documentId: string) => {
    await removeSavedDocument(documentId);
    await load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Saved for later"
        subtitle='Notes saved on this device for offline reading. Use "Save for later" on any lecture while online.'
      />

      {loading && (
        <div className="flex items-center gap-2 py-12 justify-center text-sm text-muted">
          <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          Loading saved items…
        </div>
      )}

      {!loading && items.length === 0 && (
        <EmptyState
          icon={Bookmark}
          title="Nothing saved yet"
          description="Open a lecture and tap Save for later to keep notes on this device."
          action={<GlowButton href="/dashboard">Go to dashboard</GlowButton>}
        />
      )}

      {!loading && items.length > 0 && (
        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          <aside className="space-y-2">
            {items.map((item) => (
              <button
                key={item.documentId}
                type="button"
                onClick={() => setSelectedId(item.documentId)}
                className={`w-full text-left rounded-xl border px-3 py-3 transition-all ${
                  selectedId === item.documentId
                    ? "border-accent/40 bg-accent-muted shadow-glow-sm"
                    : "border-subtle bg-card hover:bg-elevated"
                }`}
              >
                <p className="font-medium text-sm text-foreground truncate">{item.filename}</p>
                <p className="text-xs text-foreground-secondary mt-1 truncate">
                  {item.courseName || "No course"}
                </p>
                <p className="text-xs text-muted mt-1 font-mono">
                  Saved {new Date(item.savedAt).toLocaleString()}
                </p>
              </button>
            ))}
          </aside>

          {selected && (
            <article className="surface-card p-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{selected.filename}</h2>
                  <p className="text-sm text-foreground-secondary mt-1">
                    {selected.courseName || "Unknown course"}
                  </p>
                  {(selected.folder || (selected.tags?.length ?? 0) > 0) && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {selected.folder && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-accent-muted text-accent border border-accent/20">
                          {selected.folder}
                        </span>
                      )}
                      {(selected.tags ?? []).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-0.5 rounded-full bg-elevated text-muted border border-subtle font-mono"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/documents/${selected.documentId}`}
                    className="text-sm text-accent hover:text-accent-hover font-medium"
                  >
                    Open online →
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleRemove(selected.documentId)}
                    className="text-sm text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {!selected.summary &&
                !(selected.keyConcepts?.length ?? 0) &&
                !(selected.vivaQuestions?.length ?? 0) && (
                  <p className="text-sm text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
                    No notes were saved. Generate notes online, then save again.
                  </p>
                )}

              {selected.summary && (
                <section>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">Summary</h3>
                    <ReadAloudButton
                      text={selected.summary}
                      lang="auto"
                      passageId={`saved-${selected.documentId}-summary`}
                    />
                  </div>
                  <p className="text-sm text-foreground-secondary leading-relaxed whitespace-pre-wrap">
                    {selected.summary}
                  </p>
                </section>
              )}

              {(selected.keyConcepts?.length ?? 0) > 0 && (
                <section>
                  <h3 className="text-lg font-semibold text-foreground mb-3">Key concepts</h3>
                  <ul className="space-y-2">
                    {selected.keyConcepts!.map((item, index) => (
                      <li
                        key={`${item.concept}-${index}`}
                        className="surface-card p-4 text-sm border-subtle"
                      >
                        <p className="font-medium text-foreground">{item.concept}</p>
                        <p className="text-foreground-secondary mt-1">{item.explanation}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {(selected.vivaQuestions?.length ?? 0) > 0 && (
                <section>
                  <h3 className="text-lg font-semibold text-foreground mb-3">Viva practice</h3>
                  <ul className="space-y-3">
                    {selected.vivaQuestions!.map((item, index) => (
                      <li
                        key={`${item.question}-${index}`}
                        className="surface-card p-4 text-sm border-subtle"
                      >
                        <p className="font-medium text-foreground">{item.question}</p>
                        <p className="text-foreground-secondary mt-2">
                          <span className="font-semibold text-success">Answer: </span>
                          {item.answer}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </article>
          )}
        </div>
      )}
    </div>
  );
}
