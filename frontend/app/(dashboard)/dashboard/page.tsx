"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FolderOpen, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import DashboardStatCards from "@/components/dashboard/DashboardStatCards";
import DocumentGridCard from "@/components/dashboard/DocumentGridCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import WeakConceptsChart from "@/components/dashboard/WeakConceptsChart";
import { GlowButton } from "@/components/ui/GlowButton";
import DocumentLibraryFilters from "@/components/DocumentLibraryFilters";
import DocumentSearchResults from "@/components/DocumentSearchResults";
import FlashcardDueBanner from "@/components/FlashcardDueBanner";
import LibrarySearchBar from "@/components/LibrarySearchBar";
import StudyPlanReminders from "@/components/StudyPlanReminders";
import { listDocuments, searchDocuments } from "@/lib/api";
import { useDashboardUser } from "@/lib/dashboard-context";
import type { Document, DocumentSearchHit } from "@/types";

export default function DashboardPage() {
  const { userId } = useDashboardUser();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [folderFilter, setFolderFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchResults, setSearchResults] = useState<DocumentSearchHit[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const isSearching = debouncedSearch.length >= 2;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (isSearching) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await listDocuments(userId, {
          folder: folderFilter || undefined,
          tag: tagFilter || undefined,
        });
        if (!cancelled) setDocuments(data.documents);
      } catch {
        if (!cancelled) setDocuments([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [userId, folderFilter, tagFilter, isSearching]);

  useEffect(() => {
    let cancelled = false;

    async function runSearch() {
      if (!isSearching) {
        setSearchResults([]);
        setSearchLoading(false);
        return;
      }
      setSearchLoading(true);
      try {
        const data = await searchDocuments(userId, debouncedSearch, {
          folder: folderFilter || undefined,
          tag: tagFilter || undefined,
        });
        if (!cancelled) setSearchResults(data.results);
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }

    runSearch();
    return () => {
      cancelled = true;
    };
  }, [userId, debouncedSearch, folderFilter, tagFilter, isSearching]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-foreground-secondary mt-1">
            Your lectures, progress, and topics to review
          </p>
        </div>
        <GlowButton href="/upload" className="!py-2.5">
          <Plus className="w-4 h-4" />
          Upload lecture
        </GlowButton>
      </motion.div>

      <StudyPlanReminders userId={userId} />
      <FlashcardDueBanner userId={userId} />

      {/* Top stat cards */}
      <DashboardStatCards
        userId={userId}
        documentCount={documents.length}
        loadingDocs={loading && !isSearching}
      />

      {/* Weak concepts chart */}
      <WeakConceptsChart userId={userId} />

      {/* Documents section */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 className="text-lg font-semibold text-foreground">Recent documents</h2>
          <Link
            href="/library"
            className="text-sm text-accent hover:text-accent-hover font-medium transition-colors"
          >
            Full library →
          </Link>
        </div>

        <div className="mb-4">
          <LibrarySearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            disabled={searchLoading}
          />
        </div>

        <DocumentLibraryFilters
          userId={userId}
          folderFilter={folderFilter}
          tagFilter={tagFilter}
          onFolderChange={setFolderFilter}
          onTagChange={setTagFilter}
        />

        {isSearching ? (
          <DocumentSearchResults
            query={debouncedSearch}
            results={searchResults}
            loading={searchLoading}
          />
        ) : (
          <>
            {loading && (
              <div className="flex items-center gap-2 py-12 justify-center text-sm text-muted">
                <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                Loading documents…
              </div>
            )}

            {!loading && documents.length === 0 && (
              <EmptyState
                icon={folderFilter || tagFilter ? Search : FolderOpen}
                title={
                  folderFilter || tagFilter
                    ? "No matching documents"
                    : "No lectures yet"
                }
                description={
                  folderFilter || tagFilter
                    ? "Try clearing filters or search with different keywords."
                    : "Upload a PDF or audio lecture to generate notes, quizzes, and chat."
                }
                action={
                  !folderFilter && !tagFilter ? (
                    <GlowButton href="/upload">
                      <Plus className="w-4 h-4" />
                      Upload your first lecture
                    </GlowButton>
                  ) : undefined
                }
              />
            )}

            {!loading && documents.length > 0 && (
              <AnimatePresence mode="popLayout">
                <div className="grid sm:grid-cols-2 gap-4">
                  {documents.map((doc, i) => (
                    <DocumentGridCard
                      key={doc.id}
                      doc={doc}
                      index={i}
                      onDeleted={(id) =>
                        setDocuments((prev) => prev.filter((d) => d.id !== id))
                      }
                    />
                  ))}
                </div>
              </AnimatePresence>
            )}
          </>
        )}
      </section>
    </div>
  );
}
