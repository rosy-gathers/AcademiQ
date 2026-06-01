"use client";

import { motion } from "framer-motion";
import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import ReadAloudButton from "@/components/ReadAloudButton";
import SourceCitations from "@/components/SourceCitations";
import { getChatWebSocketUrl } from "@/lib/api";
import type { SpeechLang } from "@/lib/tts";
import type { ChatMessage, SourceCitation } from "@/types";

function LanguageBadge({
  languageOverride,
  detectedLang,
  langAuto,
}: {
  languageOverride: string;
  detectedLang: string;
  langAuto: boolean;
}) {
  const isBn =
    detectedLang.toLowerCase().includes("bengali") ||
    detectedLang.toLowerCase().includes("bangla") ||
    detectedLang === "bn" ||
    detectedLang === "বাংলা";
  const code = languageOverride === "bn" || (languageOverride === "auto" && isBn) ? "BN" : "EN";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold font-mono border ${
        code === "BN"
          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
          : "bg-accent-muted text-accent border-accent/30"
      }`}
      title={
        languageOverride !== "auto"
          ? `Fixed: ${detectedLang}`
          : langAuto
            ? `Auto-detected: ${detectedLang}`
            : `Responding in: ${detectedLang}`
      }
    >
      {code}
    </span>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-elevated border border-subtle rounded-2xl rounded-bl-md px-4 py-3 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-2 h-2 rounded-full bg-muted"
            animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function ChatPanel({
  documentId,
  userId,
  userEmail,
  languageOverride = "auto",
}: {
  documentId: string;
  userId: string;
  userEmail?: string;
  languageOverride?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [detectedLang, setDetectedLang] = useState("English");
  const [langAuto, setLangAuto] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ws = new WebSocket(getChatWebSocketUrl(documentId));

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    ws.onmessage = (event) => {
      let parsed: Record<string, unknown> | null = null;
      try {
        parsed = JSON.parse(event.data);
      } catch {
        parsed = null;
      }

      if (parsed) {
        if (parsed.type === "done") {
          setIsStreaming(false);
          if (typeof parsed.session_id === "string") {
            setSessionId(parsed.session_id);
          }
          const sources = parsed.sources as SourceCitation[] | undefined;
          if (sources?.length) {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return [...prev.slice(0, -1), { ...last, sources }];
              }
              return prev;
            });
          }
          return;
        }
        if (parsed.type === "language" && typeof parsed.value === "string") {
          setDetectedLang(parsed.value);
          setLangAuto(Boolean(parsed.auto_detected));
          return;
        }
        if (parsed.error) {
          setIsStreaming(false);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                typeof parsed.message === "string"
                  ? parsed.message
                  : "Something went wrong.",
              timestamp: new Date().toISOString(),
            },
          ]);
          return;
        }
      }

      const token = event.data as string;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return [...prev.slice(0, -1), { ...last, content: last.content + token }];
        }
        return [
          ...prev,
          {
            role: "assistant",
            content: token,
            timestamp: new Date().toISOString(),
          },
        ];
      });
    };

    wsRef.current = ws;
    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [documentId]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    const userMsg: ChatMessage = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);

    wsRef.current.send(
      JSON.stringify({
        message: text,
        user_id: userId,
        user_email: userEmail ?? null,
        session_id: sessionId,
      })
    );
    setInput("");
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const showTypingIndicator =
    isStreaming && messages[messages.length - 1]?.role !== "assistant";

  const speechLang: SpeechLang =
    languageOverride === "en" || languageOverride === "bn"
      ? languageOverride
      : "auto";

  return (
    <div className="flex flex-col h-full min-h-[400px] bg-card">
      {/* Header with language badge */}
      <div className="shrink-0 px-4 py-3 border-b border-subtle flex items-center justify-between gap-3 bg-elevated/50">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Document tutor</p>
          <p className="text-xs text-muted truncate">
            {connected ? "Connected" : "Connecting…"}
            <span
              className={`ml-2 inline-block w-1.5 h-1.5 rounded-full ${
                connected ? "bg-success" : "bg-amber-400 animate-pulse"
              }`}
            />
          </p>
        </div>
        <LanguageBadge
          languageOverride={languageOverride}
          detectedLang={detectedLang}
          langAuto={langAuto}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted text-center py-12">
            Ask anything about this lecture — in English or বাংলা.
          </p>
        )}
        {messages.map((msg, i) => (
          <motion.div
            key={`${msg.timestamp}-${i}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[75%] px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                msg.role === "user"
                  ? "bg-accent text-white rounded-2xl rounded-br-md shadow-glow-sm"
                  : "bg-elevated text-foreground border border-subtle rounded-2xl rounded-bl-md"
              }`}
            >
              {msg.content}
            </div>
            {msg.role === "assistant" && msg.content.trim() && !isStreaming && (
              <div className="mt-1.5 ml-1">
                <ReadAloudButton
                  text={msg.content}
                  lang={speechLang}
                  passageId={`chat-${i}`}
                  disabled={isStreaming}
                />
              </div>
            )}
            {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
              <div className="max-w-[85%] sm:max-w-[75%] w-full mt-1">
                <SourceCitations
                  sources={msg.sources}
                  title="Grounded in lecture"
                  compact
                />
              </div>
            )}
          </motion.div>
        ))}
        {showTypingIndicator && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-subtle p-4 flex gap-2 bg-elevated/30">
        <input
          className="flex-1 rounded-xl border border-subtle bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 disabled:opacity-50"
          placeholder="Ask about this lecture…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          disabled={!connected || isStreaming}
        />
        <button
          type="button"
          onClick={sendMessage}
          disabled={!connected || isStreaming || !input.trim()}
          className="btn-glow !p-2.5 !px-3 disabled:opacity-50"
          aria-label="Send message"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
