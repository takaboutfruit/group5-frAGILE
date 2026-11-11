import type { Draft } from "./model";
import { isDraft, listDrafts, validateNote } from "./model";
export const MATERIALS = [
  "PET (bottles)",
  "HDPE (containers)",
  "Fishing nets/gear",
  "Foam/Styrofoam",
  "Mixed plastic",
  "Other",
];
export const LEVELS = ["Low", "Medium", "High"];
export type Status =
  | "DRAFT"
  | "COMMITTED"
  | "SYNCING"
  | "SYNCED"
  | "SYNC_FAILED";
export interface RecordData extends Draft {
  sourceLogId?: string;
  status: Status;
  reference: string;
  weightKg: number | null;
  materialType: string;
  materialDescription: string;
  contaminationLevel: string;
  signatureDataUrl: string;
  receiptImageId: string | null;
  submittedAt?: string;
  syncError?: string;
}
type Store = Pick<Storage, "getItem" | "setItem">;
const KEY = "fragile:v2:records";
const next: Record<Status, Status[]> = {
  DRAFT: ["COMMITTED"],
  COMMITTED: ["SYNCING"],
  SYNCING: ["SYNCED", "SYNC_FAILED"],
  SYNCED: [],
  SYNC_FAILED: ["SYNCING"],
};
export function fromDraft(d: Draft): RecordData {
  return {
    ...d,
    sourceLogId: d.id,
    status: "DRAFT",
    reference: "",
    weightKg: null,
    materialType: "",
    materialDescription: "",
    contaminationLevel: "",
    signatureDataUrl: "",
    receiptImageId: null,
  };
}
export function validateRecord(r: RecordData) {
  const errors: Record<string, string> = {};
  if (!/^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/.test(r.reference.trim()))
    errors.reference =
      "Reference is required: use letters, numbers and hyphens.";
  if (
    typeof r.weightKg !== "number" ||
    !Number.isFinite(r.weightKg) ||
    r.weightKg <= 0
  )
    errors.weightKg = "Weight must be a positive number in kg.";
  if (!MATERIALS.includes(r.materialType))
    errors.materialType = "Select a material type.";
  if (r.materialType === "Other" && !r.materialDescription.trim())
    errors.materialDescription = "Describe the other material.";
  if (!LEVELS.includes(r.contaminationLevel))
    errors.contaminationLevel = "Select a contamination level.";
  if (!/^data:image\/png;base64,.+/.test(r.signatureDataUrl))
    errors.signatureDataUrl = "Signature is required.";
  return errors;
}
export function transition(r: RecordData, status: Status): RecordData {
  if (!next[r.status]?.includes(status))
    throw Error("Invalid record transition.");
  if (status === "COMMITTED" && Object.keys(validateRecord(r)).length)
    throw Error("Complete the required record details first.");
  const now = new Date().toISOString();
  return {
    ...r,
    status,
    updatedAt: now,
    ...(status === "COMMITTED" ? { submittedAt: now } : {}),
    syncError: undefined,
  };
}
function isRecord(v: unknown): v is RecordData {
  const r = v as RecordData;
  return (
    !!r &&
    isDraft(r) &&
    typeof r.id === "string" &&
    r.id.length > 0 &&
    Object.hasOwn(next, r.status) &&
    [
      "reference",
      "materialType",
      "materialDescription",
      "contaminationLevel",
      "signatureDataUrl",
      "createdAt",
      "updatedAt",
      "note",
    ].every((k) => typeof r[k as keyof RecordData] === "string") &&
    (r.weightKg === null ||
      (typeof r.weightKg === "number" && Number.isFinite(r.weightKg))) &&
    (r.receiptImageId === null || typeof r.receiptImageId === "string")
  );
}
export function listRecords(storage: Store = localStorage): RecordData[] {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return [];
    const rows: unknown = JSON.parse(raw);
    if (
      !Array.isArray(rows) ||
      !rows.every(isRecord) ||
      new Set(rows.map((r) => r.id)).size !== rows.length
    )
      throw Error();
    return rows;
  } catch {
    throw Error(
      "Could not read records. Existing data has been left untouched.",
    );
  }
}
export function saveRecord(r: RecordData, storage: Store = localStorage) {
  if (!isRecord(r)) throw Error("Invalid record data.");
  validateNote(r.note);
  if (r.status === "DRAFT") {
    const errors = validateRecord(r);
    for (const key of [
      "reference",
      "weightKg",
      "materialType",
      "contaminationLevel",
    ] as const) {
      if (r[key] !== "" && r[key] !== null && errors[key])
        throw Error(errors[key]);
    }
  }
  const records = listRecords(storage);
  const prev = records.find((p) => p.id === r.id);
  if (prev && prev.status !== "DRAFT") {
    const details = (v: RecordData) =>
      JSON.stringify({
        ...v,
        status: undefined,
        updatedAt: undefined,
        syncError: undefined,
      });
    if (details(prev) !== details(r))
      throw Error("This record is locked. Create a new log to change details.");
  }
  if (prev && prev.status !== r.status && !next[prev.status].includes(r.status))
    throw Error("Invalid record transition.");
  if (!prev && r.status !== "DRAFT" && r.status !== "COMMITTED")
    throw Error("Save the draft before syncing.");
  if (r.status === "COMMITTED" && Object.keys(validateRecord(r)).length)
    throw Error("Complete the required record details first.");
  try {
    storage.setItem(
      KEY,
      JSON.stringify([...records.filter((p) => p.id !== r.id), r]),
    );
  } catch {
    throw Error(
      "Could not save on this device. Storage may be full or disabled. Your previous record and current edits are safe.",
    );
  }
}
export function validateReceipt(file: Pick<File, "type" | "size">) {
  if (!["image/jpeg", "image/png"].includes(file.type))
    throw Error("Choose a JPEG or PNG receipt.");
  if (file.size >= 3 * 1024 * 1024)
    throw Error("Choose a receipt smaller than 3 MB.");
}
export const statusLabel: Record<Status, string> = {
  DRAFT: "Draft",
  COMMITTED: "Pending Upload",
  SYNCING: "Syncing",
  SYNCED: "Uploaded (simulated)",
  SYNC_FAILED: "Failed",
};

// Project source logs into the queue by ID; reading the queue never creates copies.
export function listLogRecords(storage: Store = localStorage): RecordData[] {
  const sources = listDrafts(storage);
  const sourceIds = new Set(sources.map((source) => source.id));
  // Keep final snapshots and legacy records; hide unfinished records whose source was deleted.
  const records = new Map(
    listRecords(storage)
      .filter(
        (r) =>
          r.status !== "DRAFT" ||
          !r.sourceLogId ||
          sourceIds.has(r.sourceLogId),
      )
      .map((r) => [r.id, r]),
  );
  for (const source of sources) {
    const record = records.get(source.id);
    records.set(
      source.id,
      !record
        ? fromDraft(source)
        : record.status === "DRAFT"
          ? {
              ...record,
              ...source,
              updatedAt:
                record.updatedAt > source.updatedAt
                  ? record.updatedAt
                  : source.updatedAt,
            }
          : record,
    );
  }
  return [...records.values()].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}
