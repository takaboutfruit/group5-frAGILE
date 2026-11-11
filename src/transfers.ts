import type { Draft } from "./model";
import { isDraft, listDrafts } from "./model";
export type TransferStatus = "COMMITTED" | "SYNCING" | "UPLOADED" | "FAILED";
export interface LogTransfer extends Draft {
  status: TransferStatus;
  committedAt: string;
  uploadedAt?: string;
  syncError?: string;
}
type Store = Pick<Storage, "getItem" | "setItem">;
const KEY = "fragile:v2:log-transfers";
const next: Record<TransferStatus, TransferStatus[]> = {
  COMMITTED: ["SYNCING"],
  SYNCING: ["UPLOADED", "FAILED"],
  UPLOADED: [],
  FAILED: ["SYNCING"],
};
export const transferLabel: Record<TransferStatus, string> = {
  COMMITTED: "Pending Upload",
  SYNCING: "Syncing",
  UPLOADED: "Uploaded (simulated)",
  FAILED: "Failed",
};
export function listTransfers(storage: Store = localStorage): LogTransfer[] {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return [];
    const rows: unknown = JSON.parse(raw);
    if (
      !Array.isArray(rows) ||
      !rows.every(
        (r) =>
          isDraft(r) &&
          Object.hasOwn(next, (r as LogTransfer).status) &&
          typeof (r as LogTransfer).committedAt === "string",
      ) ||
      new Set(rows.map((r) => r.id)).size !== rows.length
    )
      throw Error();
    return rows;
  } catch {
    throw Error(
      "Could not read log transfers. Existing data has been left untouched.",
    );
  }
}
function write(rows: LogTransfer[], storage: Store) {
  try {
    storage.setItem(KEY, JSON.stringify(rows));
    if (typeof window !== "undefined")
      queueMicrotask(() =>
        window.dispatchEvent(new Event("fragile:transfers")),
      );
  } catch {
    throw Error(
      "Could not save log transfers. Your saved logs and selections are safe. Free device storage and retry.",
    );
  }
}
export function commitLogs(ids: string[], storage: Store = localStorage) {
  if (!ids.length) throw Error("Select at least one saved log to commit.");
  const sources = listDrafts(storage);
  const transfers = listTransfers(storage);
  const now = new Date().toISOString();
  const added: LogTransfer[] = [];
  for (const id of new Set(ids)) {
    const source = sources.find((d) => d.id === id);
    if (!source)
      throw Error(
        "A selected log is no longer available. Refresh My logs and retry.",
      );
    if (!transfers.some((t) => t.id === id))
      added.push({ ...source, status: "COMMITTED", committedAt: now });
  }
  if (added.length) write([...transfers, ...added], storage);
}
export function updateTransfers(
  ids: string[],
  status: TransferStatus,
  storage: Store = localStorage,
  syncError?: string,
): LogTransfer[] {
  const rows = listTransfers(storage);
  const selected = new Set(ids);
  if (
    !selected.size ||
    [...selected].some((id) => {
      const current = rows.find((r) => r.id === id);
      return !current || !next[current.status].includes(status);
    })
  )
    throw Error(
      "Invalid log transfer transition. Refresh the queue and retry.",
    );
  const now = new Date().toISOString();
  const updated = rows.map((r) =>
    selected.has(r.id)
      ? {
          ...r,
          status,
          syncError,
          ...(status === "UPLOADED" ? { uploadedAt: now } : {}),
        }
      : r,
  );
  write(updated, storage);
  return updated.filter((r) => selected.has(r.id));
}
export function updateTransfer(
  id: string,
  status: TransferStatus,
  storage: Store = localStorage,
  syncError?: string,
) {
  return updateTransfers([id], status, storage, syncError)[0];
}
export function listUploadedLogs(storage: Store = localStorage) {
  return listTransfers(storage).filter((r) => r.status === "UPLOADED");
}
