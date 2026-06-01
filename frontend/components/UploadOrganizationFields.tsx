"use client";

type Props = {
  folder: string;
  tagsInput: string;
  onFolderChange: (value: string) => void;
  onTagsChange: (value: string) => void;
  disabled?: boolean;
};

export default function UploadOrganizationFields({
  folder,
  tagsInput,
  onFolderChange,
  onTagsChange,
  disabled,
}: Props) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-2">
          Folder (optional)
        </label>
        <input
          className="w-full rounded-xl border border-subtle bg-elevated px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 disabled:opacity-50"
          placeholder="e.g. Semester 6"
          value={folder}
          onChange={(e) => onFolderChange(e.target.value)}
          disabled={disabled}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-2">
          Tags (optional)
        </label>
        <input
          className="w-full rounded-xl border border-subtle bg-elevated px-4 py-2.5 text-sm text-foreground font-mono placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 disabled:opacity-50"
          placeholder="midterm, os, week-3"
          value={tagsInput}
          onChange={(e) => onTagsChange(e.target.value)}
          disabled={disabled}
        />
        <p className="text-xs text-muted mt-1.5">Comma-separated</p>
      </div>
    </div>
  );
}
