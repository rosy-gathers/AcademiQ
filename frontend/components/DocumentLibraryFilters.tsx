"use client";

import { useEffect, useState, type ReactNode } from "react";

import { getDocumentLabels } from "@/lib/api";

type Props = {
  userId: string;
  folderFilter: string;
  tagFilter: string;
  onFolderChange: (value: string) => void;
  onTagChange: (value: string) => void;
};

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200 ${
        active
          ? "bg-accent text-white border-accent shadow-glow-sm"
          : "border-subtle text-foreground-secondary hover:bg-elevated hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export default function DocumentLibraryFilters({
  userId,
  folderFilter,
  tagFilter,
  onFolderChange,
  onTagChange,
}: Props) {
  const [folders, setFolders] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    getDocumentLabels(userId)
      .then((data) => {
        if (!cancelled) {
          setFolders(data.folders);
          setTags(data.tags);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFolders([]);
          setTags([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const hasFilters = folders.length > 0 || tags.length > 0;
  if (!hasFilters) return null;

  return (
    <div className="space-y-3 mb-4">
      {folders.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted mb-2 uppercase tracking-wider">Folders</p>
          <div className="flex flex-wrap gap-2">
            <FilterPill active={!folderFilter} onClick={() => onFolderChange("")}>
              All
            </FilterPill>
            {folders.map((folder) => (
              <FilterPill
                key={folder}
                active={folderFilter === folder}
                onClick={() => onFolderChange(folderFilter === folder ? "" : folder)}
              >
                {folder}
              </FilterPill>
            ))}
          </div>
        </div>
      )}

      {tags.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted mb-2 uppercase tracking-wider">Tags</p>
          <div className="flex flex-wrap gap-2">
            <FilterPill active={!tagFilter} onClick={() => onTagChange("")}>
              All
            </FilterPill>
            {tags.map((tag) => (
              <FilterPill
                key={tag}
                active={tagFilter === tag}
                onClick={() => onTagChange(tagFilter === tag ? "" : tag)}
              >
                <span className="font-mono">#{tag}</span>
              </FilterPill>
            ))}
          </div>
        </div>
      )}

      {(folderFilter || tagFilter) && (
        <button
          type="button"
          onClick={() => {
            onFolderChange("");
            onTagChange("");
          }}
          className="text-xs text-accent hover:text-accent-hover transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
