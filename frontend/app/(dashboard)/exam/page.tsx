"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Target } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import DocumentGridCard from "@/components/dashboard/DocumentGridCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { GlowButton } from "@/components/ui/GlowButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { listDocuments } from "@/lib/api";
import { useDashboardUser } from "@/lib/dashboard-context";
import type { Document } from "@/types";

export default function ExamHubPage() {
  const { userId } = useDashboardUser();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listDocuments(userId)
      .then((d) => setDocuments(d.documents.filter((doc) => doc.status === "ready")))
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <div className="space-y-8 max-w-3xl">
      <PageHeader
        title="Exam mode"
        subtitle="Timed practice exams with no hints — export your score report when done"
      />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="surface-card border-accent/20 bg-accent-muted/20 p-6"
      >
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <Target className="w-5 h-5 text-accent" />
          Before you start
        </h2>
        <ul className="text-sm text-foreground-secondary mt-3 space-y-2 list-disc list-inside">
          <li>Choose a lecture that has finished processing (status: ready)</li>
          <li>Pick a time limit — the exam auto-submits when time runs out</li>
          <li>Explanations appear only after submission, in your downloadable report</li>
        </ul>
      </motion.div>

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Select a lecture</h2>

        {loading && (
          <div className="flex items-center gap-2 py-12 justify-center text-sm text-muted">
            <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            Loading lectures…
          </div>
        )}

        {!loading && documents.length === 0 && (
          <EmptyState
            icon={Target}
            title="No ready lectures"
            description="Upload and process a lecture first, then return here to start a timed exam."
            action={
              <GlowButton href="/upload">
                Upload lecture
              </GlowButton>
            }
          />
        )}

        {!loading && documents.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-4">
            {documents.map((doc, i) => (
              <Link key={doc.id} href={`/exam/${doc.id}`} className="block">
                <DocumentGridCard doc={doc} index={i} />
              </Link>
            ))}
          </div>
        )}
      </section>

      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-foreground-secondary hover:text-accent transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </Link>
    </div>
  );
}
