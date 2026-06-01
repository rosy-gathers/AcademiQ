"use client";

import Link from "next/link";

import { labelMatchType } from "@/lib/search-labels";
import type { DocumentSearchHit } from "@/types";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ready: "bg-success/15 text-success border-success/30",
    processing: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    failed: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize shrink-0 border ${
        styles[status] ?? "bg-elevated text-muted border-subtle"
      }`}
    >
      {status}
    </span>
  );
}

export default function DocumentSearchResults({
  query,
  results,
  loading,
}: {
  query: string;
  results: DocumentSearchHit[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 justify-center text-sm text-muted">
        <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        Searching…
      </div>
    );
  }

  if (query.trim().length < 2) {
    return (
      <p className="text-sm text-muted">
        Type at least 2 characters to search titles, course names, folders, tags,
        notes, and lecture text.
      </p>
    );
  }

  if (results.length === 0) {
    return (
      <p className="text-sm text-foreground-secondary surface-card px-4 py-3">
        No results for &ldquo;{query}&rdquo;. Try another keyword or clear folder/tag
        filters.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted font-mono">
        {results.length} result{results.length === 1 ? "" : "s"} for &ldquo;{query}
        &rdquo;
      </p>
      <ul className="space-y-3">
        {results.map((hit) => (
          <li key={hit.document_id}>
            <Link
              href={`/documents/${hit.document_id}`}
              className="block surface-card surface-card-hover p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium text-foreground">{hit.filename}</h3>
                <StatusBadge status={hit.status} />
              </div>
              <p className="text-sm text-foreground-secondary mt-1">
                {hit.course_name || "No course name"}
                {hit.source_type === "audio" && (
                  <span className="text-accent"> · Audio</span>
                )}
              </p>
              {(hit.folder || (hit.tags?.length ?? 0) > 0) && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {hit.folder && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-elevated border border-subtle text-foreground-secondary">
                      {hit.folder}
                    </span>
                  )}
                  {(hit.tags ?? []).slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 rounded-full bg-elevated border border-subtle text-muted font-mono"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-sm text-foreground-secondary mt-3 leading-relaxed bg-elevated rounded-lg px-3 py-2 border border-subtle">
                {hit.snippet}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {hit.match_in.map((kind) => (
                  <span
                    key={kind}
                    className="text-xs px-2 py-0.5 rounded-full bg-accent-muted text-accent border border-accent/20"
                  >
                    {labelMatchType(kind)}
                  </span>
                ))}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
