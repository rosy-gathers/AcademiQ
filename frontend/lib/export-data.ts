import { API_URL } from "@/lib/api";

export async function downloadUserDataExport(
  userId: string,
  includeChunks = false
): Promise<void> {
  const params = new URLSearchParams();
  if (includeChunks) params.set("include_chunks", "true");
  const qs = params.toString();
  const url = `${API_URL}/api/export/user/${userId}${qs ? `?${qs}` : ""}`;

  const res = await fetch(url);
  if (!res.ok) {
    let message = `Export failed (${res.status})`;
    try {
      const data = (await res.json()) as { message?: string };
      if (data.message) message = data.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="?([^";]+)"?/);
  const filename =
    match?.[1] ?? `academiq-export-${new Date().toISOString().slice(0, 10)}.json`;

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
