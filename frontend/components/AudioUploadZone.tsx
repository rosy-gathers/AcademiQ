"use client";

import { motion } from "framer-motion";
import { Mic, MicOff, Waves } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";

import LanguageToggle from "@/components/upload/LanguageToggle";
import UploadDropzone from "@/components/upload/UploadDropzone";
import UploadProcessingTimeline, {
  type TimelineStep,
} from "@/components/upload/UploadProcessingTimeline";
import UploadOrganizationFields from "@/components/UploadOrganizationFields";
import { ApiError, transcribeAudio } from "@/lib/api";
import type { LanguageOverride } from "@/types";

type AudioStatus =
  | "idle"
  | "uploading"
  | "transcribing"
  | "embedding"
  | "done"
  | "error"
  | "recording";

const AUDIO_TIMELINE_STEPS: TimelineStep[] = [
  { id: "uploading", label: "Uploading" },
  { id: "transcribing", label: "Extracting" },
  { id: "embedding", label: "Embedding" },
  { id: "done", label: "Ready" },
];

const AUDIO_ACCEPT = {
  "audio/mpeg": [".mp3"],
  "audio/wav": [".wav"],
  "audio/webm": [".webm"],
  "audio/ogg": [".ogg"],
  "audio/mp4": [".m4a", ".mp4"],
  "audio/x-m4a": [".m4a"],
};

export default function AudioUploadZone({
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
  const [status, setStatus] = useState<AudioStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isBusy =
    status === "uploading" ||
    status === "transcribing" ||
    status === "embedding" ||
    status === "recording";

  const processAudioFile = useCallback(
    async (file: File) => {
      if (!courseName.trim()) {
        setErrorMessage("Enter a course name first.");
        return;
      }

      setErrorMessage(null);
      setSummary(null);
      setStatus("uploading");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("course_name", courseName.trim());
      formData.append("user_id", userId);
      if (userEmail) formData.append("user_email", userEmail);
      formData.append("language_override", languageOverride);
      formData.append("folder", folder.trim());
      formData.append("tags", tagsInput.trim());

      try {
        setStatus("transcribing");
        const embedTimer = setTimeout(() => setStatus("embedding"), 4000);

        const data = await transcribeAudio(formData);
        clearTimeout(embedTimer);

        setSummary(
          `${data.chapter_count ?? 0} chapters · ${data.segment_count ?? 0} segments · ` +
            `${Math.round(data.duration_seconds ?? 0)}s`
        );
        setStatus("done");
        setTimeout(
          () => router.push(`/documents/${data.document_id}?tab=transcript`),
          600
        );
      } catch (err) {
        setStatus("error");
        const msg =
          err instanceof ApiError ? err.message : "Audio processing failed.";
        setErrorMessage(
          msg.includes("whisper") || msg.includes("WHISPER")
            ? `${msg} Install backend dependency: pip install openai-whisper`
            : msg
        );
      }
    },
    [courseName, folder, tagsInput, languageOverride, userId, userEmail, router]
  );

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (file) await processAudioFile(file);
    },
    [processAudioFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: AUDIO_ACCEPT,
    maxFiles: 1,
    disabled: !courseName.trim() || isBusy || status === "done",
  });

  const startRecording = async () => {
    if (!courseName.trim()) {
      setErrorMessage("Enter a course name before recording.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        setRecordingSeconds(0);
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `lecture-recording-${Date.now()}.webm`, {
          type: "audio/webm",
        });
        setStatus("idle");
        await processAudioFile(file);
      };
      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setStatus("recording");
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch {
      setErrorMessage("Microphone access denied or unavailable.");
      setStatus("error");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      mediaRecorderRef.current?.stop();
    };
  }, []);

  const showTimeline =
    status !== "idle" && status !== "error" && status !== "recording";
  const timelineStep =
    status === "transcribing"
      ? "transcribing"
      : status === "uploading" || status === "embedding" || status === "done"
        ? status
        : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-xl mx-auto"
    >
      <div className="surface-card border-accent/20 bg-accent-muted/30 p-4 text-sm">
        <p className="font-semibold text-foreground flex items-center gap-2">
          <Waves className="w-4 h-4 text-accent" />
          Audio → notes pipeline
        </p>
        <p className="mt-1.5 text-foreground-secondary">
          Upload or record a lecture. We transcribe, chapterize, and index it for
          notes, quiz, and chat.
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-2">
          Course name
        </label>
        <input
          className="w-full rounded-xl border border-subtle bg-elevated px-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-50"
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
      />

      <UploadDropzone
        getRootProps={getRootProps}
        getInputProps={getInputProps}
        isDragActive={isDragActive}
        disabled={!courseName.trim() || isBusy || status === "done"}
        icon={Waves}
        title={isDragActive ? "Drop audio here" : "Drag & drop audio file"}
        subtitle="MP3, WAV, M4A, WebM — or record below"
      />

      <div className="flex justify-center">
        {status !== "recording" ? (
          <button
            type="button"
            onClick={() => void startRecording()}
            disabled={!courseName.trim() || isBusy}
            className="btn-ghost !py-3 !px-6"
          >
            <Mic className="w-4 h-4" />
            Record lecture
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse"
          >
            <MicOff className="w-4 h-4" />
            Stop ({recordingSeconds}s)
          </button>
        )}
      </div>

      {showTimeline && (
        <UploadProcessingTimeline steps={AUDIO_TIMELINE_STEPS} currentStepId={timelineStep} />
      )}

      {summary && status === "done" && (
        <p className="text-sm text-success bg-success/10 border border-success/30 rounded-xl px-4 py-3 text-center font-mono">
          {summary}
        </p>
      )}

      {errorMessage && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-center">
          {errorMessage}
        </p>
      )}
    </motion.div>
  );
}
