"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, FileText, FolderOpen, Trash2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { deleteDocument } from "@/lib/api";
import type { Document } from "@/types";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ready: "bg-success/15 text-success border-success/30",
    processing: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    failed: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize border ${
        styles[status] ?? "bg-elevated text-muted border-subtle"
      }`}
    >
      {status}
    </span>
  );
}

function DeleteConfirmModal({
  filename,
  onConfirm,
  onCancel,
  loading,
}: {
  filename: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.2 }}
        className="surface-card w-full max-w-sm p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Delete document?</h3>
            <p className="text-xs text-muted mt-0.5">This cannot be undone.</p>
          </div>
        </div>

        <p className="text-sm text-foreground-secondary leading-relaxed">
          <span className="font-medium text-foreground truncate block">{filename}</span>
          All chunks, notes, and quiz data for this document will be permanently removed.
        </p>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-subtle text-sm font-medium text-foreground-secondary hover:text-foreground hover:border-foreground/20 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-sm font-medium text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function DocumentGridCard({
  doc,
  index,
  onDeleted,
}: {
  doc: Document;
  index: number;
  onDeleted?: (id: string) => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteDocument(doc.id);
      setShowConfirm(false);
      onDeleted?.(doc.id);
    } catch {
      setDeleting(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {showConfirm && (
          <DeleteConfirmModal
            filename={doc.filename}
            onConfirm={handleDelete}
            onCancel={() => setShowConfirm(false)}
            loading={deleting}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ delay: index * 0.04, duration: 0.35 }}
        className="relative group/card"
      >
        {/* Delete button — appears on hover */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowConfirm(true);
          }}
          title="Delete document"
          className="absolute top-3 right-3 z-10 w-7 h-7 rounded-lg bg-red-500/0 hover:bg-red-500/15 border border-transparent hover:border-red-500/30 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all duration-150"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-400" />
        </button>

        <Link
          href={`/documents/${doc.id}`}
          className="group surface-card surface-card-hover block p-5 h-full"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-muted flex items-center justify-center shrink-0 group-hover:shadow-glow-sm transition-shadow">
              <FileText className="w-5 h-5 text-accent" />
            </div>
            <StatusBadge status={doc.status} />
          </div>

          <h3 className="font-semibold text-foreground mt-4 truncate group-hover:text-accent transition-colors">
            {doc.filename}
          </h3>
          <p className="text-sm text-foreground-secondary mt-1 truncate">
            {doc.course_name || "No course name"}
          </p>

          {(doc.folder || (doc.tags?.length ?? 0) > 0) && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {doc.folder && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-elevated border border-subtle text-foreground-secondary">
                  <FolderOpen className="w-3 h-3" />
                  {doc.folder}
                </span>
              )}
              {(doc.tags ?? []).slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded-full bg-elevated border border-subtle text-muted font-mono"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-subtle">
            <p className="text-xs text-muted font-mono">
              {doc.total_chunks} chunks · {new Date(doc.uploaded_at).toLocaleDateString()}
            </p>
            <ChevronRight className="w-4 h-4 text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
          </div>
        </Link>
      </motion.div>
    </>
  );
}
