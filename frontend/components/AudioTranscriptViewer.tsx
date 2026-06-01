"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ApiError, getAudioTranscript } from "@/lib/api";
import type { TranscriptChapter, TranscriptSegment } from "@/types";

function formatTime(seconds: number): string {
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const SPEAKER_COLORS: Record<string, string> = {
  "Speaker 1": "bg-accent-muted text-accent border border-accent/20",
  "Speaker 2": "bg-success/15 text-success border border-success/30",
};

export default function AudioTranscriptViewer({
  documentId,
}: {
  documentId: string;
}) {
  const [transcript, setTranscript] = useState<Awaited<
    ReturnType<typeof getAudioTranscript>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChapter, setActiveChapter] = useState<number | "all">("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAudioTranscript(documentId);
      setTranscript(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load transcript"
      );
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    load();
  }, [load]);

  const visibleSegments = useMemo(() => {
    if (!transcript) return [];
    if (activeChapter === "all") return transcript.segments;
    return transcript.segments.filter((s) => s.chapter_id === activeChapter);
  }, [transcript, activeChapter]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted">
        <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        Loading transcript…
      </div>
    );
  }

  if (error || !transcript) {
    return (
      <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
        {error ?? "Transcript unavailable"}
      </p>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="grid sm:grid-cols-3 gap-3">
        {[
          { label: "Duration", value: formatTime(transcript.duration_seconds) },
          { label: "Chapters", value: String(transcript.chapters.length) },
          { label: "Speakers", value: transcript.speakers.join(", ") || "—" },
        ].map((stat) => (
          <div key={stat.label} className="surface-card p-4">
            <p className="text-xs text-muted uppercase font-medium tracking-wider">{stat.label}</p>
            <p className="text-lg font-semibold text-foreground font-mono mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveChapter("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            activeChapter === "all"
              ? "bg-accent text-white border-accent shadow-glow-sm"
              : "border-subtle text-foreground-secondary hover:bg-elevated"
          }`}
        >
          All
        </button>
        {transcript.chapters.map((ch: TranscriptChapter) => (
          <button
            key={ch.id}
            type="button"
            onClick={() => setActiveChapter(ch.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border max-w-[200px] truncate transition-all ${
              activeChapter === ch.id
                ? "bg-accent text-white border-accent shadow-glow-sm"
                : "border-subtle text-foreground-secondary hover:bg-elevated"
            }`}
            title={ch.title}
          >
            {ch.title}
          </button>
        ))}
      </div>

      <div className="surface-card divide-y divide-subtle max-h-[480px] overflow-y-auto">
        {visibleSegments.map((seg: TranscriptSegment, i: number) => {
          const speaker = seg.speaker ?? "Speaker 1";
          const color =
            SPEAKER_COLORS[speaker] ?? "bg-elevated text-foreground-secondary border border-subtle";
          return (
            <div key={`${seg.start}-${i}`} className="p-4 hover:bg-elevated/50 transition-colors">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
                  {speaker}
                </span>
                <span className="text-xs text-muted font-mono">{formatTime(seg.start)}</span>
                {seg.chapter_id != null && (
                  <span className="text-xs text-muted font-mono">Ch. {seg.chapter_id}</span>
                )}
              </div>
              <p className="text-sm text-foreground-secondary leading-relaxed">{seg.text}</p>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted">
        Chapters are auto-marked about every 5 minutes. Speaker labels alternate when
        there is a pause — useful for Q&amp;A segments. Generate notes from the Notes
        tab when ready.
      </p>
    </div>
  );
}
