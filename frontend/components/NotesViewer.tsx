"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Lightbulb, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { effectiveNotesLanguage } from "@/components/DocumentLanguageSettings";
import { EmptyState } from "@/components/dashboard/EmptyState";
import ReadAloudButton from "@/components/ReadAloudButton";
import type { SpeechLang } from "@/lib/tts";
import { ApiError, generateNotes, getNotes } from "@/lib/api";
import type {
  KeyConcept,
  LanguageCode,
  LanguageOverride,
  NoteResponse,
  VivaQuestion,
} from "@/types";

export default function NotesViewer({
  documentId,
  languageOverride = "auto",
  userEmail,
}: {
  documentId: string;
  languageOverride?: LanguageOverride | string;
  userEmail?: string;
}) {
  const [note, setNote] = useState<NoteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedConcept, setExpandedConcept] = useState<number | null>(null);
  const [expandedViva, setExpandedViva] = useState<number | null>(null);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getNotes(documentId);
      setNote(data);
    } catch (err) {
      if (err instanceof ApiError && err.code === "NOT_FOUND") {
        setNote(null);
      } else {
        setError(err instanceof ApiError ? err.message : "Failed to load notes");
      }
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleGenerate = async (language: LanguageCode) => {
    setGenerating(true);
    setError(null);
    try {
      const data = await generateNotes(documentId, language, userEmail);
      setNote({
        id: data.note_id,
        document_id: documentId,
        summary: data.summary,
        key_concepts: data.key_concepts,
        viva_questions: data.viva_questions,
        language,
        created_at: new Date().toISOString(),
      });
      setExpandedConcept(null);
      setExpandedViva(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to generate notes");
    } finally {
      setGenerating(false);
    }
  };

  const keyConcepts = (note?.key_concepts ?? []) as KeyConcept[];
  const vivaQuestions = (note?.viva_questions ?? []) as VivaQuestion[];
  const lockedLang = effectiveNotesLanguage(languageOverride);
  const notesSpeechLang: SpeechLang =
    (note?.language as SpeechLang) ||
    lockedLang ||
    (languageOverride === "en" || languageOverride === "bn"
      ? languageOverride
      : "auto");

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
        <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        Loading notes…
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex flex-wrap gap-2 items-center">
        {lockedLang ? (
          <button
            type="button"
            onClick={() => handleGenerate(lockedLang)}
            disabled={generating}
            className="btn-glow !py-2 !px-4 text-sm disabled:opacity-50"
          >
            {generating ? "Generating…" : note ? "Regenerate notes" : "Generate notes"}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => handleGenerate("en")}
              disabled={generating}
              className="btn-ghost !py-2 !px-4 text-sm disabled:opacity-50"
            >
              {note ? "Regenerate in English" : "Generate in English"}
            </button>
            <button
              type="button"
              onClick={() => handleGenerate("bn")}
              disabled={generating}
              className="btn-ghost !py-2 !px-4 text-sm disabled:opacity-50"
            >
              {note ? "Regenerate in Bengali" : "Generate in বাংলা"}
            </button>
          </>
        )}
        {note && (
          <Link
            href={`/flashcards?documentId=${documentId}`}
            className="ml-auto text-sm font-medium text-accent hover:text-accent-hover transition-colors"
          >
            Create flashcards →
          </Link>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {!note && !generating && !error && (
        <EmptyState
          icon={Sparkles}
          title="No notes yet"
          description={
            lockedLang
              ? `Notes will be generated in ${lockedLang === "bn" ? "Bengali" : "English"} based on your document language setting.`
              : "Choose English or বাংলা to generate structured study notes from this lecture."
          }
          action={
            <div className="flex flex-wrap gap-2 justify-center">
              {!lockedLang ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleGenerate("en")}
                    disabled={generating}
                    className="btn-glow !py-2 !px-5"
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenerate("bn")}
                    disabled={generating}
                    className="btn-ghost !py-2 !px-5"
                  >
                    বাংলা
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => handleGenerate(lockedLang)}
                  disabled={generating}
                  className="btn-glow !py-2 !px-5"
                >
                  Generate notes
                </button>
              )}
            </div>
          }
        />
      )}

      {note?.summary && (
        <section className="surface-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              Summary
            </h2>
            <ReadAloudButton
              text={note.summary}
              lang={notesSpeechLang}
              passageId="notes-summary"
            />
          </div>
          <p className="text-sm text-foreground-secondary leading-relaxed">{note.summary}</p>
        </section>
      )}

      {keyConcepts.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-accent" />
            Key concepts
          </h2>
          <div className="space-y-3">
            {keyConcepts.map((item, index) => {
              const isOpen = expandedConcept === index;
              return (
                <div key={`${item.concept}-${index}`} className="surface-card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedConcept(isOpen ? null : index)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-elevated/50 transition-colors"
                  >
                    <span className="font-medium text-foreground pr-4">{item.concept}</span>
                    <motion.span
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-5 h-5 text-muted shrink-0" />
                    </motion.span>
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-0 text-sm text-foreground-secondary border-t border-subtle space-y-3">
                          <ReadAloudButton
                            text={`${item.concept}. ${item.explanation}`}
                            lang={notesSpeechLang}
                            passageId={`concept-${index}`}
                          />
                          <p className="leading-relaxed">{item.explanation}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {vivaQuestions.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">Viva Q&amp;A</h2>
          <div className="space-y-3">
            {vivaQuestions.map((item, index) => {
              const isOpen = expandedViva === index;
              return (
                <div key={`${item.question}-${index}`} className="surface-card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedViva(isOpen ? null : index)}
                    className="w-full flex items-start justify-between gap-3 px-5 py-4 text-left hover:bg-elevated/50 transition-colors"
                  >
                    <span className="text-sm font-medium text-foreground">
                      <span className="text-accent font-mono mr-2">Q{index + 1}.</span>
                      {item.question}
                    </span>
                    <motion.span
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="shrink-0 mt-0.5"
                    >
                      <ChevronDown className="w-5 h-5 text-muted" />
                    </motion.span>
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 border-t border-subtle space-y-2">
                          <ReadAloudButton
                            text={`Question: ${item.question}. Answer: ${item.answer}`}
                            lang={notesSpeechLang}
                            passageId={`viva-${index}`}
                          />
                          <p className="text-sm text-foreground-secondary leading-relaxed">
                            <span className="font-semibold text-success">Answer: </span>
                            {item.answer}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
