const MATCH_LABELS: Record<string, string> = {
  title: "Title",
  course: "Course",
  folder: "Folder",
  tag: "Tag",
  summary: "Notes summary",
  concept: "Key concept",
  viva: "Viva Q&A",
  content: "Lecture text",
};

export function labelMatchType(kind: string): string {
  return MATCH_LABELS[kind] ?? kind;
}
