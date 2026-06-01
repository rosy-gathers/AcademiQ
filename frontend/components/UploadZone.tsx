"use client";

import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";

import LanguageToggle from "@/components/upload/LanguageToggle";
import UploadDropzone from "@/components/upload/UploadDropzone";
import UploadProcessingTimeline, {
  type TimelineStep,
} from "@/components/upload/UploadProcessingTimeline";
import UploadOrganizationFields from "@/components/UploadOrganizationFields";
import { API_URL } from "@/lib/api";
import type { LanguageOverride } from "@/types";

type UploadStatus =
  | "idle"
  | "uploading"
  | "extracting"
  | "embedding"
  | "done"
  | "error";

type UploadResponseBody = {
  document_id?: string;
  documentId?: string;
  status?: string;
  total_chunks?: number;
  error?: boolean;
  message?: string;
  code?: string;
};

const PDF_TIMELINE_STEPS: TimelineStep[] = [
  { id: "uploading", label: "Uploading" },
  { id: "extracting", label: "Extracting" },
  { id: "embedding", label: "Embedding" },
  { id: "done", label: "Ready" },
];

export default function UploadZone({
  userId,
  userEmail,
}: {
  userId: string;
  userEmail?: string;
}) {
  const router = useRouter();
  const [courseName, setCourseName] = useState("");
  const [folder, setFolder] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [languageOverride, setLanguageOverride] = useState<LanguageOverride>("auto");
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file || !courseName.trim()) {
        setErrorMessage("Enter a course name before uploading.");
        return;
      }

      setErrorMessage(null);
      setStatus("uploading");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("course_name", courseName.trim());
      formData.append("user_id", userId);
      if (userEmail) formData.append("user_email", userEmail);
      formData.append("language_override", languageOverride);
      formData.append("folder", folder.trim());
      formData.append("tags", tagsInput.trim());

      let embeddingTimer: ReturnType<typeof setTimeout> | undefined;

      try {
        setStatus("extracting");
        embeddingTimer = setTimeout(() => setStatus("embedding"), 1200);

        const res = await fetch(`${API_URL}/api/documents/upload`, {
          method: "POST",
          body: formData,
        });

        const data = (await res.json()) as UploadResponseBody;
        console.log("Response status:", res.status);
        console.log("Response data:", data);
        console.log("Upload response:", data);

        const documentId = data.document_id ?? data.documentId;

        if (documentId) {
          if (embeddingTimer) clearTimeout(embeddingTimer);
          setStatus("done");
          setTimeout(() => router.push(`/documents/${documentId}`), 600);
          return;
        }

        if (data.error || !res.ok) {
          setStatus("error");
          setErrorMessage(
            data.message ?? `Upload failed (${res.status}). Try again.`
          );
          return;
        }

        setStatus("error");
        setErrorMessage("Upload failed: no document_id in response.");
      } catch (err) {
        if (embeddingTimer) clearTimeout(embeddingTimer);
        setStatus("error");
        console.error("Upload error:", err);
        setErrorMessage(
          err instanceof Error ? err.message : "Upload failed. Try again."
        );
      }
    },
    [courseName, folder, tagsInput, languageOverride, userId, userEmail, router]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    disabled:
      !courseName.trim() ||
      status === "uploading" ||
      status === "extracting" ||
      status === "embedding" ||
      status === "done",
  });

  const isBusy =
    status === "uploading" || status === "extracting" || status === "embedding";

  const showTimeline = status !== "idle" && status !== "error";
  const timelineStep = status === "error" ? null : status;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-xl mx-auto"
    >
      <div>
        <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-2">
          Course name
        </label>
        <input
          className="w-full rounded-xl border border-subtle bg-elevated px-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 disabled:opacity-50"
          placeholder="e.g. CSE-330 Operating Systems"
          value={courseName}
          onChange={(e) => setCourseName(e.target.value)}
          disabled={isBusy || status === "done"}
        />
      </div>

      <UploadOrganizationFields
        folder={folder}
        tagsInput={tagsInput}
        onFolderChange={setFolder}
        onTagsChange={setTagsInput}
        disabled={isBusy || status === "done"}
      />

      <LanguageToggle
        value={languageOverride}
        onChange={setLanguageOverride}
        disabled={isBusy || status === "done"}
        hint="Lecture language (mixed PDFs → Auto)"
      />

      <UploadDropzone
        getRootProps={getRootProps}
        getInputProps={getInputProps}
        isDragActive={isDragActive}
        disabled={!courseName.trim() || isBusy || status === "done"}
        icon={FileText}
        title={isDragActive ? "Drop your PDF here" : "Drag & drop lecture PDF"}
        subtitle="Or click to browse — max one file"
        footer={
          !courseName.trim() ? (
            <p className="text-xs text-muted mt-4">Enter a course name to enable upload</p>
          ) : undefined
        }
      />

      {showTimeline && (
        <UploadProcessingTimeline
          steps={PDF_TIMELINE_STEPS}
          currentStepId={timelineStep}
        />
      )}

      {errorMessage && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-center">
          {errorMessage}
        </p>
      )}
    </motion.div>
  );
}
