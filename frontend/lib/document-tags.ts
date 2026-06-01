/** Parse comma-separated tags from upload or settings inputs. */
export function parseTagsInput(value: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of value.split(/[,;]/)) {
    const tag = part.trim().slice(0, 50);
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= 20) break;
  }
  return out;
}

export function formatTagsInput(tags: string[] | undefined | null): string {
  return (tags ?? []).join(", ");
}
