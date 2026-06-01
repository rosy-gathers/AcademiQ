"use client";

import { useCallback, useEffect, useId, useState } from "react";

import {
  isTtsSupported,
  speakText,
  stopSpeaking,
  type SpeechLang,
} from "@/lib/tts";

type ReadAloudButtonProps = {
  text: string;
  lang?: SpeechLang;
  label?: string;
  stopLabel?: string;
  className?: string;
  disabled?: boolean;
  /** Unique id so only one passage highlights as playing */
  passageId?: string;
  onSpeakingChange?: (speaking: boolean) => void;
};

let globalSpeakingId: string | null = null;

export default function ReadAloudButton({
  text,
  lang = "auto",
  label = "Listen",
  stopLabel = "Stop",
  className = "",
  disabled = false,
  passageId,
  onSpeakingChange,
}: ReadAloudButtonProps) {
  const autoId = useId();
  const id = passageId ?? autoId;
  const [speaking, setSpeaking] = useState(false);
  const supported = isTtsSupported();

  const setSpeakingState = useCallback(
    (value: boolean) => {
      setSpeaking(value);
      onSpeakingChange?.(value);
    },
    [onSpeakingChange]
  );

  useEffect(() => {
    return () => {
      if (globalSpeakingId === id) {
        stopSpeaking();
        globalSpeakingId = null;
      }
    };
  }, [id]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (globalSpeakingId === id && !window.speechSynthesis.speaking) {
        globalSpeakingId = null;
        setSpeakingState(false);
      }
    }, 400);
    return () => window.clearInterval(interval);
  }, [id, setSpeakingState]);

  const handleClick = () => {
    if (!supported || disabled || !text.trim()) return;

    if (speaking && globalSpeakingId === id) {
      stopSpeaking();
      globalSpeakingId = null;
      setSpeakingState(false);
      return;
    }

    stopSpeaking();
    globalSpeakingId = id;
    setSpeakingState(true);
    speakText(text, lang);
  };

  if (!supported) {
    return (
      <span
        className={`text-xs text-muted ${className}`}
        title="Text-to-speech is not supported in this browser"
      >
        TTS unavailable
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || !text.trim()}
      className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-lg px-2.5 py-1 border transition-colors disabled:opacity-40 ${
        speaking
          ? "bg-accent-muted border-accent/40 text-accent shadow-glow-sm"
          : "border-subtle text-foreground-secondary hover:bg-elevated hover:text-foreground"
      } ${className}`}
      aria-pressed={speaking}
    >
      <span aria-hidden>{speaking ? "⏹" : "🔊"}</span>
      {speaking ? stopLabel : label}
    </button>
  );
}
