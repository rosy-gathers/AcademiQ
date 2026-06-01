"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Brain,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { GlowButton } from "@/components/ui/GlowButton";

const FEATURES = [
  {
    icon: BookOpen,
    title: "RAG-Powered Notes",
    description:
      "Upload lecture PDFs or audio and get structured, citation-backed study notes in seconds.",
  },
  {
    icon: Brain,
    title: "Adaptive Quizzes",
    description:
      "AI-generated MCQs with concept tags. Missed answers flow straight into your flashcard deck.",
  },
  {
    icon: MessageCircle,
    title: "Bilingual Chat Tutor",
    description:
      "Ask questions grounded in your syllabus with streaming answers in English or বাংলা.",
  },
] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Animated mesh background */}
      <div className="fixed inset-0 mesh-gradient -z-20" />
      <div className="fixed inset-0 hero-gradient -z-10" />

      {/* Floating orbs */}
      <motion.div
        className="fixed top-1/4 -left-32 w-96 h-96 rounded-full bg-accent/20 blur-[120px] -z-10"
        animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="fixed bottom-1/4 -right-32 w-80 h-80 rounded-full bg-accent/10 blur-[100px] -z-10"
        animate={{ x: [0, -30, 0], y: [0, 40, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Nav */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-50 border-b border-subtle bg-base/80 backdrop-blur-xl"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shadow-glow-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight group-hover:text-accent transition-colors">
              AcademiQ
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-foreground-secondary hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <GlowButton href="/signup" className="!py-2 !px-4 text-sm">
              Get started
              <ArrowRight className="w-4 h-4" />
            </GlowButton>
          </div>
        </div>
      </motion.header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-20 text-center">
        <motion.div
          custom={0}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/30 bg-accent-muted text-xs font-semibold text-accent mb-8"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
          </span>
          Bilingual AI · English &amp; বাংলা
        </motion.div>

        <motion.h1
          custom={1}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-balance leading-[1.08] max-w-4xl mx-auto"
        >
          Study Smarter in{" "}
          <span className="text-gradient">Bengali &amp; English</span>
        </motion.h1>

        <motion.p
          custom={2}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mt-6 text-base sm:text-lg text-foreground-secondary max-w-2xl mx-auto text-balance leading-relaxed"
        >
          Turn lecture PDFs and audio into grounded notes, adaptive quizzes, and a
          conversational tutor — cited, personalized, and exam-ready.
        </motion.p>

        <motion.div
          custom={3}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mt-10 flex flex-col sm:flex-row gap-3 justify-center items-center"
        >
          <GlowButton href="/signup" className="text-base px-8 py-3.5">
            Start for free
            <ArrowRight className="w-5 h-5" />
          </GlowButton>
          <GlowButton href="/login" variant="ghost" className="text-base px-8 py-3.5">
            Sign in
          </GlowButton>
        </motion.div>

        {/* Product preview — workspace UI, not fake dashboard stats */}
        <motion.div
          custom={4}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mt-20 max-w-4xl mx-auto"
        >
          <div className="surface-card overflow-hidden shadow-card border-accent/20">
            <div className="h-10 bg-elevated flex items-center px-4 gap-2 border-b border-subtle">
              <span className="w-3 h-3 rounded-full bg-red-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-success/80" />
              <span className="ml-3 text-xs text-muted font-mono">
                academiq.app/documents/…
              </span>
            </div>
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap gap-2 mb-5">
                {["Notes", "Quiz", "Chat", "Transcript"].map((tab, i) => (
                  <span
                    key={tab}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                      i === 0
                        ? "bg-accent-muted text-accent border border-accent/30"
                        : "bg-elevated text-muted border border-subtle"
                    }`}
                  >
                    {tab}
                  </span>
                ))}
              </div>
              <div className="space-y-3">
                <div className="h-3 rounded-full bg-elevated w-full" />
                <div className="h-3 rounded-full bg-elevated w-11/12" />
                <div className="h-3 rounded-full bg-elevated w-4/5" />
                <div className="h-16 rounded-xl bg-elevated/80 border border-subtle mt-4" />
              </div>
              <p className="text-xs text-muted text-center mt-6">
                Illustration only — sign in to see your documents, scores, and reviews
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features — 3 cards */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Built for serious students
          </h2>
          <p className="mt-3 text-foreground-secondary max-w-lg mx-auto">
            One workspace for upload, learn, quiz, and review — in both languages.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="surface-card surface-card-hover p-8 group"
            >
              <div className="w-12 h-12 rounded-xl bg-accent-muted flex items-center justify-center mb-6 group-hover:shadow-glow-sm transition-shadow duration-300">
                <feature.icon className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-foreground-secondary leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-24 sm:pb-32">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative rounded-3xl overflow-hidden border border-accent/30 p-10 sm:p-14 text-center"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-accent/5 to-transparent" />
          <div className="absolute inset-0 bg-card/60 backdrop-blur-sm" />
          <div className="relative">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">
              Ready to ace your next exam?
            </h2>
            <p className="text-foreground-secondary mb-8 max-w-md mx-auto">
              Join thousands of students using AcademiQ to study smarter, not harder.
            </p>
            <GlowButton href="/signup" className="text-base px-10 py-4 shadow-glow">
              Create your free account
              <ArrowRight className="w-5 h-5" />
            </GlowButton>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-subtle py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted">
          <span className="font-semibold text-accent">AcademiQ</span>
          <p>AI academic copilot · English &amp; বাংলা</p>
        </div>
      </footer>
    </main>
  );
}
