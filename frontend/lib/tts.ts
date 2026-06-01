export type SpeechLang = "en" | "bn" | "auto";

let activeCancel: (() => void) | null = null;
let voicesCache: SpeechSynthesisVoice[] = [];

function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  const voices = window.speechSynthesis.getVoices();
  if (voices.length) voicesCache = voices;
  return voicesCache;
}

if (typeof window !== "undefined" && window.speechSynthesis) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    voicesCache = window.speechSynthesis.getVoices();
  };
}

export function isTtsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function detectSpeechLang(text: string): "en" | "bn" {
  const bengali = (text.match(/[\u0980-\u09FF]/g) || []).length;
  const letters = (text.match(/\S/g) || []).length;
  if (letters === 0) return "en";
  return bengali / letters > 0.08 ? "bn" : "en";
}

export function cleanTextForSpeech(text: string): string {
  return text
    .replace(/📌\s*Related concepts[\s\S]*$/i, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function pickVoice(lang: "en" | "bn"): SpeechSynthesisVoice | null {
  const voices = loadVoices();
  if (!voices.length) return null;

  const prefs =
    lang === "bn"
      ? ["bn-BD", "bn-IN", "bn", "hi-IN", "en-IN"]
      : ["en-US", "en-GB", "en-AU", "en-IN", "en"];

  for (const code of prefs) {
    const match = voices.find(
      (v) => v.lang === code || v.lang.startsWith(`${code}-`)
    );
    if (match) return match;
  }
  return voices.find((v) => v.lang.startsWith(lang)) ?? voices[0] ?? null;
}

export function stopSpeaking(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  activeCancel = null;
}

export function speakText(
  text: string,
  lang: SpeechLang = "auto"
): { cancel: () => void; utterance: SpeechSynthesisUtterance | null } {
  if (!isTtsSupported()) {
    return { cancel: () => {}, utterance: null };
  }

  stopSpeaking();

  const cleaned = cleanTextForSpeech(text);
  if (!cleaned) {
    return { cancel: () => {}, utterance: null };
  }

  const resolved = lang === "auto" ? detectSpeechLang(cleaned) : lang;
  const utterance = new SpeechSynthesisUtterance(cleaned);
  const voice = pickVoice(resolved);
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang ?? (resolved === "bn" ? "bn-BD" : "en-US");
  utterance.rate = 0.95;
  utterance.pitch = 1;

  const cancel = () => {
    window.speechSynthesis.cancel();
    if (activeCancel === cancel) activeCancel = null;
  };

  utterance.onend = () => {
    if (activeCancel === cancel) activeCancel = null;
  };
  utterance.onerror = () => {
    if (activeCancel === cancel) activeCancel = null;
  };

  activeCancel = cancel;
  window.speechSynthesis.speak(utterance);

  return { cancel, utterance };
}
