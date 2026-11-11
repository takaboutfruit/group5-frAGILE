import type { Draft } from "./model";
import { isDraft, validateNote } from "./model";
import { listUploadedLogs } from "./transfers";
export const MATERIALS = [
  "PET (bottles)",
  "HDPE (containers)",
  "Fishing nets/gear",
  "Foam/Styrofoam",
  "Mixed plastic",
  "Other",
];
export const LEVELS = ["Low", "Medium", "High"];
export type Status = "DRAFT" | "SUBMITTED";
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
const next: Record<Status, Status[]> = { DRAFT: ["SUBMITTED"], SUBMITTED: [] };
const legacyFinalStatuses = ["COMMITTED", "SYNCING", "SYNCED", "SYNC_FAILED"];
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
function referenceConflict(
  r: RecordData,
  records: RecordData[],
): string | undefined {
  const key = r.reference.trim().toUpperCase();
  if (
    key &&
    records.some(
      (other) =>
        other.id !== r.id && other.reference.trim().toUpperCase() === key,
    )
  )
    return "This Reference ID is already used by another record. Enter a unique Reference ID.";
}
export function validateRecord(r: RecordData, records: RecordData[] = []) {
  const errors: Record<string, string> = {};
  if (!/^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/.test(r.reference.trim()))
    errors.reference =
      "Reference is required: use letters, numbers and hyphens.";
  if (!errors.reference) {
    const conflict = referenceConflict(r, records);
    if (conflict) errors.reference = conflict;
  }
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
  if (status === "SUBMITTED" && Object.keys(validateRecord(r)).length)
    throw Error("Complete the required record details first.");
  const now = new Date().toISOString();
  return {
    ...r,
    status,
    updatedAt: now,
    ...(status === "SUBMITTED" ? { submittedAt: now } : {}),
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
    (Object.hasOwn(next, r.status) || legacyFinalStatuses.includes(r.status)) &&
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
    return rows.map((r) => ({
      ...r,
      status: r.status === "DRAFT" ? "DRAFT" : "SUBMITTED",
    }));
  } catch {
    throw Error(
      "Could not read records. Existing data has been left untouched.",
    );
  }
}
export function saveRecord(r: RecordData, storage: Store = localStorage) {
  if (!isRecord(r) || !Object.hasOwn(next, r.status))
    throw Error("Invalid record data.");
  validateNote(r.note);
  const records = listRecords(storage);
  const conflict = referenceConflict(r, records);
  if (conflict) throw Error(conflict);
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
  if (r.status === "SUBMITTED" && Object.keys(validateRecord(r)).length)
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
  SUBMITTED: "Submitted",
};

// Final record creation happens only after its field log was uploaded.
export function recordForUploadedLog(
  id: string,
  storage: Store = localStorage,
): RecordData {
  const saved = listRecords(storage).find((r) => r.id === id);
  // Preserve read access to final records saved by earlier versions.
  if (saved && saved.status !== "DRAFT") return saved;
  const uploaded = listUploadedLogs(storage).find((r) => r.id === id);
  if (!uploaded)
    throw Error(
      "Choose an uploaded log from Uploaded Logs before creating a record.",
    );
  const source: Draft = {
    id: uploaded.id,
    ownerId: uploaded.ownerId,
    createdAt: uploaded.createdAt,
    updatedAt: uploaded.updatedAt,
    capturedAt: uploaded.capturedAt,
    timezone: uploaded.timezone,
    location: uploaded.location,
    photo: uploaded.photo,
    note: uploaded.note,
  };
  return saved
    ? { ...saved, ...source, updatedAt: saved.updatedAt }
    : fromDraft(source);
}
