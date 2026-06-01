"use client";

import { Layers } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  ApiError,
  createFlashcard,
  deleteFlashcard,
  generateFlashcardsFromNotes,
  generateFlashcardsFromWeakConcepts,
  listDocuments,
  listFlashcards,
  reviewFlashcard,
} from "@/lib/api";
import { useDashboardUser } from "@/lib/dashboard-context";
import type { Document, Flashcard, FlashcardRating } from "@/types";

type Tab = "review" | "deck" | "build";

function formatNextReview(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d <= now) return "Due now";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function FlashcardsPageContent() {
  const { userId } = useDashboardUser();
  const searchParams = useSearchParams();
  const preselectedDoc = searchParams.get("documentId") ?? "";

  const [tab, setTab] = useState<Tab>("review");
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [allCards, setAllCards] = useState<Flashcard[]>([]);
  const [dueCount, setDueCount] = useState(0);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [reviewIndex, setReviewIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const [buildDocId, setBuildDocId] = useState(preselectedDoc);
  const [manualFront, setManualFront] = useState("");
  const [manualBack, setManualBack] = useState("");
  const [building, setBuilding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [due, all] = await Promise.all([
        listFlashcards(userId, true),
        listFlashcards(userId, false),
      ]);
      setDueCards(due.cards);
      setDueCount(due.due_count);
      setAllCards(all.cards);
      setReviewIndex(0);
      setFlipped(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load flashcards");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
    listDocuments(userId)
      .then((d) => setDocuments(d.documents))
      .catch(() => setDocuments([]));
  }, [load, userId]);

  useEffect(() => {
    if (preselectedDoc) setBuildDocId(preselectedDoc);
  }, [preselectedDoc]);

  const currentCard = dueCards[reviewIndex] ?? null;

  const handleRate = async (rating: FlashcardRating) => {
    if (!currentCard) return;
    setReviewing(true);
    try {
      await reviewFlashcard(currentCard.id, rating);
      const next = dueCards.filter((c) => c.id !== currentCard.id);
      setDueCards(next);
      setDueCount(Math.max(0, dueCount - 1));
      setReviewIndex(0);
      setFlipped(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Review failed");
    } finally {
      setReviewing(false);
    }
  };

  const handleGenerateNotes = async () => {
    if (!buildDocId) {
      setMessage("Select a lecture first.");
      return;
    }
    setBuilding(true);
    setMessage(null);
    setError(null);
    try {
      const res = await generateFlashcardsFromNotes(userId, buildDocId);
      setMessage(
        `Created ${res.created} card(s) from notes` +
          (res.skipped ? ` (${res.skipped} duplicates skipped)` : "") +
          "."
      );
      setTab("review");
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not generate from notes"
      );
    } finally {
      setBuilding(false);
    }
  };

  const handleGenerateWeak = async () => {
    setBuilding(true);
    setMessage(null);
    setError(null);
    try {
      const res = await generateFlashcardsFromWeakConcepts(userId);
      setMessage(
        `Created ${res.created} card(s) from weak concepts` +
          (res.skipped ? ` (${res.skipped} skipped)` : "") +
          "."
      );
      setTab("review");
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not generate from weak concepts"
      );
    } finally {
      setBuilding(false);
    }
  };

  const handleManualCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!manualFront.trim() || !manualBack.trim()) return;
    setBuilding(true);
    setMessage(null);
    try {
      await createFlashcard({
        user_id: userId,
        front: manualFront.trim(),
        back: manualBack.trim(),
        document_id: buildDocId || null,
      });
      setManualFront("");
      setManualBack("");
      setMessage("Card added.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create card");
    } finally {
      setBuilding(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteFlashcard(id);
      await load();
    } catch {
      setError("Failed to delete card");
    }
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: "review", label: `Review${dueCount > 0 ? ` (${dueCount})` : ""}` },
    { id: "deck", label: "All cards" },
    { id: "build", label: "Build deck" },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Flashcards"
        subtitle="Spaced repetition from your notes and quiz weak spots"
      />

      {error && <p className="alert-error">{error}</p>}
      {message && <p className="alert-success">{message}</p>}

      <div className="surface-card p-1.5 flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 min-w-[100px] px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tab === t.id
                ? "bg-accent-muted text-accent border border-accent/25 shadow-glow-sm"
                : "text-foreground-secondary hover:text-foreground hover:bg-elevated"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-8 justify-center text-sm text-muted">
          <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          Loading…
        </div>
      )}

      {!loading && tab === "review" && (
        <div className="space-y-6">
          {!currentCard ? (
            <EmptyState
              icon={Layers}
              title={dueCount === 0 ? "No cards due" : "All caught up"}
              description={
                dueCount === 0
                  ? "Build a deck from notes or weak concepts, then come back to review."
                  : "Great session — check back later for more due cards."
              }
              action={
                <button type="button" onClick={() => setTab("build")} className="btn-glow !py-2">
                  Build flashcards
                </button>
              }
            />
          ) : (
            <>
              <p className="text-xs text-muted text-center font-mono">
                Card {reviewIndex + 1} of {dueCards.length} due
              </p>
              <button
                type="button"
                onClick={() => setFlipped((f) => !f)}
                className="w-full min-h-[240px] surface-card border-2 border-accent/30 p-8 text-left hover:border-accent hover:shadow-glow transition-all"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-3">
                  {flipped ? "Answer" : "Question"}
                </p>
                <p className="text-lg text-foreground whitespace-pre-wrap leading-relaxed">
                  {flipped ? currentCard.back : currentCard.front}
                </p>
                {currentCard.document_filename && (
                  <p className="text-xs text-muted mt-4 truncate">
                    {currentCard.document_filename}
                  </p>
                )}
              </button>
              <p className="text-center text-xs text-muted">
                Tap card to {flipped ? "hide" : "reveal"} answer
              </p>
              {flipped && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      ["again", "Again"],
                      ["hard", "Hard"],
                      ["good", "Good"],
                      ["easy", "Easy"],
                    ] as const
                  ).map(([rating, label]) => (
                    <button
                      key={rating}
                      type="button"
                      disabled={reviewing}
                      onClick={() => handleRate(rating)}
                      className={`py-3 rounded-xl text-sm font-medium border disabled:opacity-50 transition-all ${
                        rating === "again"
                          ? "bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25"
                          : rating === "easy"
                            ? "bg-success/15 text-success border-success/30 hover:bg-success/25"
                            : "bg-elevated text-foreground-secondary border-subtle hover:border-accent/30"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {!loading && tab === "deck" && (
        <div className="space-y-3">
          {allCards.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">No flashcards yet.</p>
          ) : (
            allCards.map((card) => (
              <div
                key={card.id}
                className="surface-card p-4 flex flex-wrap gap-3 justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground line-clamp-2">{card.front}</p>
                  <p className="text-sm text-foreground-secondary mt-1 line-clamp-1">{card.back}</p>
                  <p className="text-xs text-muted mt-2 font-mono">
                    {formatNextReview(card.next_review_at)} · {card.source} · reviewed{" "}
                    {card.repetitions}×
                  </p>
                  {card.document_id && (
                    <Link
                      href={`/documents/${card.document_id}`}
                      className="text-xs text-accent hover:text-accent-hover"
                    >
                      {card.document_filename ?? "Lecture"}
                    </Link>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(card.id)}
                  className="text-sm text-red-400 hover:text-red-300 shrink-0"
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {!loading && tab === "build" && (
        <div className="space-y-6">
          <section className="surface-card p-6 space-y-4">
            <h2 className="text-base font-semibold text-foreground">From lecture notes</h2>
            <p className="text-sm text-foreground-secondary">
              Turns key concepts and viva Q&amp;A from generated notes into cards.
            </p>
            <select
              value={buildDocId}
              onChange={(e) => setBuildDocId(e.target.value)}
              className="select-field"
            >
              <option value="">Select lecture</option>
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.filename}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={building || !buildDocId}
              onClick={handleGenerateNotes}
              className="btn-glow !py-2.5 disabled:opacity-50"
            >
              Generate from notes
            </button>
          </section>

          <section className="surface-card p-6 space-y-4">
            <h2 className="text-base font-semibold text-foreground">From weak concepts</h2>
            <p className="text-sm text-foreground-secondary">
              Creates cards for topics you miss most often on quizzes.
            </p>
            <button
              type="button"
              disabled={building}
              onClick={handleGenerateWeak}
              className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 disabled:opacity-50"
            >
              Generate from weak concepts
            </button>
          </section>

          <form onSubmit={handleManualCreate} className="surface-card p-6 space-y-4">
            <h2 className="text-base font-semibold text-foreground">Add card manually</h2>
            <div>
              <label className="label-field">Front (question)</label>
              <textarea
                required
                rows={2}
                value={manualFront}
                onChange={(e) => setManualFront(e.target.value)}
                className="textarea-field"
              />
            </div>
            <div>
              <label className="label-field">Back (answer)</label>
              <textarea
                required
                rows={3}
                value={manualBack}
                onChange={(e) => setManualBack(e.target.value)}
                className="textarea-field"
              />
            </div>
            <button type="submit" disabled={building} className="btn-ghost !py-2.5 disabled:opacity-50">
              Add card
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function FlashcardsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12 gap-2 text-sm text-muted">
          <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          Loading flashcards…
        </div>
      }
    >
      <FlashcardsPageContent />
    </Suspense>
  );
}
