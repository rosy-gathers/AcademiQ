"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Brain,
  FileAudio,
  MessageCircle,
  ScrollText,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import AudioTranscriptViewer from "@/components/AudioTranscriptViewer";
import ChatPanel from "@/components/ChatPanel";
import DocumentLanguageSettings from "@/components/DocumentLanguageSettings";
import DocumentOrganizationSettings from "@/components/DocumentOrganizationSettings";
import DocumentTabs, {
  type DocumentTab,
  type DocumentTabId,
} from "@/components/document/DocumentTabs";
import ExamQuizCard from "@/components/ExamQuizCard";
import NotesViewer from "@/components/NotesViewer";
import QuizCard from "@/components/QuizCard";
import SaveForLaterButton from "@/components/SaveForLaterButton";
import { getDocument } from "@/lib/api";
import { useDashboardUser } from "@/lib/dashboard-context";
import type { Document } from "@/types";

function isAudioDocument(doc: Document): boolean {
  return doc.source_type === "audio";
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ready: "bg-success/15 text-success border-success/30",
    processing: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    failed: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  return (
    <span
      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize border ${
        styles[status] ?? "bg-elevated text-muted border-subtle"
      }`}
    >
      {status}
    </span>
  );
}

function DocumentPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const documentId = params.id as string;
  const { userId } = useDashboardUser();

  const [tab, setTab] = useState<DocumentTabId>("notes");
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await getDocument(documentId);
        if (!cancelled) {
          setDocument(data);
          const initial = searchParams.get("tab") as DocumentTabId | null;
          const validTabs: DocumentTabId[] = isAudioDocument(data)
            ? ["notes", "quiz", "chat", "transcript", "exam"]
            : ["notes", "quiz", "chat", "exam"];
          if (initial && validTabs.includes(initial)) {
            setTab(initial);
          }
        }
      } catch {
        if (!cancelled) setDocument(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (documentId) load();
    return () => {
      cancelled = true;
    };
  }, [documentId, searchParams]);

  const tabs: DocumentTab[] = useMemo(() => {
    const base: DocumentTab[] = [
      { id: "notes", label: "Notes", icon: BookOpen },
      { id: "quiz", label: "Quiz", icon: Brain },
      { id: "chat", label: "Chat", icon: MessageCircle },
    ];
    if (document && isAudioDocument(document)) {
      base.push({ id: "transcript", label: "Transcript", icon: ScrollText });
    }
    base.push({ id: "exam", label: "Exam", icon: Target });
    return base;
  }, [document]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        <p className="text-sm text-muted">Loading document…</p>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-400">Document not found.</p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent-hover"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-foreground-secondary hover:text-accent transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
              {document.filename}
            </h1>
            <p className="text-sm text-foreground-secondary mt-1">
              {document.course_name || "Unknown course"}
              {isAudioDocument(document) && document.duration_seconds != null && (
                <span className="text-muted">
                  {" "}
                  · {Math.floor(document.duration_seconds / 60)}m{" "}
                  {document.duration_seconds % 60}s
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SaveForLaterButton document={document} />
            {isAudioDocument(document) && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-accent-muted text-accent border border-accent/20">
                <FileAudio className="w-3.5 h-3.5" />
                Audio
              </span>
            )}
            <StatusBadge status={document.status} />
          </div>
        </div>
      </motion.div>

      {document.status !== "ready" && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          This document is still <strong>{document.status}</strong>. Notes, quiz, and
          chat work best when status is ready.
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <DocumentLanguageSettings document={document} onUpdated={setDocument} />
        <DocumentOrganizationSettings document={document} onUpdated={setDocument} />
      </div>

      <DocumentTabs tabs={tabs} active={tab} onChange={setTab} />

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="min-h-[480px]"
      >
        {tab === "transcript" && isAudioDocument(document) && (
          <AudioTranscriptViewer documentId={documentId} />
        )}
        {tab === "notes" && (
          <NotesViewer
            documentId={documentId}
            languageOverride={document.language_override}
          />
        )}
        {tab === "quiz" && <QuizCard documentId={documentId} userId={userId} />}
        {tab === "exam" && (
          <ExamQuizCard
            documentId={documentId}
            documentName={document.filename}
            courseName={document.course_name}
            userId={userId}
          />
        )}
        {tab === "chat" && (
          <div className="surface-card overflow-hidden h-[min(560px,70vh)] flex flex-col">
            <ChatPanel
              documentId={documentId}
              userId={userId}
              languageOverride={document.language_override ?? "auto"}
            />
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function DocumentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
      }
    >
      <DocumentPageContent />
    </Suspense>
  );
}
