"use client";

import { motion } from "framer-motion";
import { FileText, Upload, Waves } from "lucide-react";
import { useState } from "react";

import AudioUploadZone from "@/components/AudioUploadZone";
import UploadZone from "@/components/UploadZone";
import { useDashboardUser } from "@/lib/dashboard-context";

type UploadTab = "pdf" | "audio";

export default function UploadPage() {
  const { userId, user } = useDashboardUser();
  const [tab, setTab] = useState<UploadTab>("pdf");

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center sm:text-left"
      >
        <div className="inline-flex items-center justify-center sm:justify-start gap-2 mb-3">
          <div className="w-10 h-10 rounded-xl bg-accent-muted flex items-center justify-center">
            <Upload className="w-5 h-5 text-accent" />
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
          Upload lecture
        </h1>
        <p className="text-sm text-foreground-secondary mt-2 max-w-lg">
          PDF slides or recorded audio — both become searchable notes, quizzes, and
          chat in English or বাংলা.
        </p>
      </motion.div>

      {/* Tab switcher */}
      <div className="surface-card p-1.5 flex gap-1">
        {(
          [
            { id: "pdf" as const, label: "PDF lecture", icon: FileText },
            { id: "audio" as const, label: "Audio recording", icon: Waves },
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`relative flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                active ? "text-accent" : "text-foreground-secondary hover:text-foreground"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="upload-tab"
                  className="absolute inset-0 bg-accent-muted border border-accent/25 rounded-xl shadow-glow-sm"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon className={`w-4 h-4 relative z-10 ${active ? "text-accent" : ""}`} />
              <span className="relative z-10 hidden sm:inline">{item.label}</span>
              <span className="relative z-10 sm:hidden">
                {item.id === "pdf" ? "PDF" : "Audio"}
              </span>
            </button>
          );
        })}
      </div>

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {tab === "pdf" ? (
          <UploadZone userId={userId} userEmail={user.email} />
        ) : (
          <AudioUploadZone userId={userId} userEmail={user.email} />
        )}
      </motion.div>
    </div>
  );
}
