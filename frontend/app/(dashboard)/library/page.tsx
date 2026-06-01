"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import DocumentLibraryFilters from "@/components/DocumentLibraryFilters";
import DocumentSearchResults from "@/components/DocumentSearchResults";
import LibrarySearchBar from "@/components/LibrarySearchBar";
import { PageHeader } from "@/components/ui/PageHeader";
import { searchDocuments } from "@/lib/api";
import { useDashboardUser } from "@/lib/dashboard-context";
import type { DocumentSearchHit } from "@/types";

export default function LibraryPage() {
  const { userId } = useDashboardUser();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [folderFilter, setFolderFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [results, setResults] = useState<DocumentSearchHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    async function runSearch() {
      if (debouncedQuery.length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await searchDocuments(userId, debouncedQuery, {
          folder: folderFilter || undefined,
          tag: tagFilter || undefined,
        });
        if (!cancelled) setResults(data.results);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    runSearch();
    return () => {
      cancelled = true;
    };
  }, [userId, debouncedQuery, folderFilter, tagFilter]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <PageHeader
        title="Library search"
        subtitle="Find lectures by title, course, tags, AI notes, or full text inside PDFs and transcripts"
        action={
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent-hover font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
        }
      />

      <LibrarySearchBar value={query} onChange={setQuery} disabled={loading} />

      <DocumentLibraryFilters
        userId={userId}
        folderFilter={folderFilter}
        tagFilter={tagFilter}
        onFolderChange={setFolderFilter}
        onTagChange={setTagFilter}
      />

      {debouncedQuery.length < 2 && !loading && (
        <div className="surface-card border-dashed p-12 text-center">
          <Search className="w-10 h-10 text-muted mx-auto mb-3" />
          <p className="text-sm text-foreground-secondary">
            Type at least 2 characters to search your library.
          </p>
        </div>
      )}

      <DocumentSearchResults
        query={debouncedQuery}
        results={results}
        loading={loading && debouncedQuery.length >= 2}
      />
    </motion.div>
  );
}
