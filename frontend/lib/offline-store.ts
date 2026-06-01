import type { KeyConcept, VivaQuestion } from "@/types";

export type SavedDocument = {
  documentId: string;
  filename: string;
  courseName?: string | null;
  folder?: string | null;
  tags?: string[];
  sourceType?: string;
  summary?: string | null;
  keyConcepts?: KeyConcept[] | null;
  vivaQuestions?: VivaQuestion[] | null;
  savedAt: string;
};

const DB_NAME = "academiq-offline";
const STORE = "saved-documents";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available in this browser."));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("Failed to open offline DB"));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "documentId" });
      }
    };
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const store = tx.objectStore(STORE);
        const request = fn(store);
        request.onerror = () => reject(request.error ?? new Error("Offline store error"));
        request.onsuccess = () => resolve(request.result as T);
        tx.oncomplete = () => db.close();
        tx.onerror = () => reject(tx.error ?? new Error("Offline transaction failed"));
      })
  );
}

export async function listSavedDocuments(): Promise<SavedDocument[]> {
  const items = await withStore<SavedDocument[]>("readonly", (store) => store.getAll());
  return items.sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
}

export async function getSavedDocument(
  documentId: string
): Promise<SavedDocument | undefined> {
  return withStore<SavedDocument | undefined>("readonly", (store) =>
    store.get(documentId)
  );
}

export async function isDocumentSaved(documentId: string): Promise<boolean> {
  const item = await getSavedDocument(documentId);
  return Boolean(item);
}

export async function saveDocumentOffline(item: SavedDocument): Promise<void> {
  await withStore("readwrite", (store) => store.put(item));
}

export async function removeSavedDocument(documentId: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(documentId));
}

export function isOfflineCapable(): boolean {
  return typeof indexedDB !== "undefined";
}
