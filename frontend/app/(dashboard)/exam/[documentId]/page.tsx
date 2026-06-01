"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import ExamQuizCard from "@/components/ExamQuizCard";
import { getDocument } from "@/lib/api";
import { useDashboardUser } from "@/lib/dashboard-context";
import type { Document } from "@/types";

export default function ExamSessionPage() {
  const params = useParams();
  const documentId = params.documentId as string;
  const { userId } = useDashboardUser();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocument(documentId)
      .then(setDocument)
      .catch(() => setDocument(null))
      .finally(() => setLoading(false));
  }, [documentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        <p className="text-sm text-muted">Loading exam…</p>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-400">Lecture not found.</p>
        <Link
          href="/exam"
          className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent-hover"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to exam mode
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-2xl"
    >
      <div>
        <Link
          href="/exam"
          className="inline-flex items-center gap-2 text-sm text-foreground-secondary hover:text-accent transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All exams
        </Link>
        <h1 className="text-2xl font-bold text-foreground mt-3 truncate">{document.filename}</h1>
        <p className="text-sm text-foreground-secondary">
          {document.course_name || "Exam session"}
        </p>
      </div>

      <ExamQuizCard
        documentId={documentId}
        documentName={document.filename}
        courseName={document.course_name}
        userId={userId}
      />
    </motion.div>
  );
}
