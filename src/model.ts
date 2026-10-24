export interface User {
  id: string;
  name: string;
  email: string;
  salt: string;
  verifier: string;
}
export interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
}
export interface Draft {
  id: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  capturedAt: string;
  timezone: string;
  location: Location | null;
  photo: string | null;
  note: string;
}
const USERS = "fragile:v1:users";
const DRAFTS = "fragile:v1:drafts";
const SESSION = "fragile:v1:session";
export const NOTE_LIMIT = 500;
export function noteLength(note: string) {
  return Array.from(note).length;
}
export function validateNote(note: string) {
  if (noteLength(note) > NOTE_LIMIT)
    throw new Error("Keep your note to 500 characters or fewer.");
}
function isUser(v: unknown): v is User {
  const u = v as User;
  return (
    !!u &&
    ["id", "name", "email", "salt", "verifier"].every(
      (k) => typeof u[k as keyof User] === "string",
    )
  );
}
function isDraft(v: unknown): v is Draft {
  const d = v as Draft;
  if (
    !d ||
    ![
      "id",
      "ownerId",
      "createdAt",
      "updatedAt",
      "capturedAt",
      "timezone",
      "note",
    ].every((k) => typeof d[k as keyof Draft] === "string")
  )
    return false;
  return (
    (d.photo === null ||
      (typeof d.photo === "string" &&
        /^data:image\/(jpeg|png|webp);base64,/.test(d.photo))) &&
    (d.location === null ||
      (!!d.location &&
        Number.isFinite(d.location.latitude) &&
        Math.abs(d.location.latitude) <= 90 &&
        Number.isFinite(d.location.longitude) &&
        Math.abs(d.location.longitude) <= 180 &&
        Number.isFinite(d.location.accuracy) &&
        d.location.accuracy >= 0)) &&
    [d.createdAt, d.updatedAt, d.capturedAt].every((t) =>
      Number.isFinite(Date.parse(t)),
    )
  );
}
function read<T>(
  key: string,
  check: (v: unknown) => v is T,
  storage: Storage,
): T[] {
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data) || !data.every(check)) throw new Error();
    return data;
  } catch {
    throw new Error(
      "Could not read device storage. Existing data has been left untouched. Check that browser storage is available.",
    );
  }
}
function write(key: string, value: unknown, storage: Storage) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    throw new Error(
      "Could not save on this device. Storage may be full or disabled. Your current edits are still here; free some space and try again.",
    );
  }
}
export function listDrafts(ownerId: string, storage = localStorage) {
  return read(DRAFTS, isDraft, storage)
    .filter((d) => d.ownerId === ownerId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export function saveDraft(draft: Draft, storage = localStorage) {
  validateNote(draft.note);
  if (!isDraft(draft))
    throw new Error(
      "This draft contains invalid data. Please check its details.",
    );
  const drafts = read(DRAFTS, isDraft, storage);
  const existing = drafts.find((d) => d.id === draft.id);
  if (existing && existing.ownerId !== draft.ownerId)
    throw new Error("This draft belongs to another account.");
  write(DRAFTS, [...drafts.filter((d) => d.id !== draft.id), draft], storage);
}
export function deleteDraft(
  ownerId: string,
  id: string,
  storage = localStorage,
) {
  const drafts = read(DRAFTS, isDraft, storage);
  if (!drafts.some((d) => d.ownerId === ownerId && d.id === id))
    throw new Error("This draft is no longer available.");
  write(
    DRAFTS,
    drafts.filter((d) => !(d.ownerId === ownerId && d.id === id)),
    storage,
  );
}
export function newDraft(ownerId: string): Draft {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    ownerId,
    createdAt: now,
    updatedAt: now,
    capturedAt: now,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    location: null,
    photo: null,
    note: "",
  };
}
async function passwordVerifier(password: string, salt: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return Array.from(new Uint8Array(bits), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export async function register(name: string, email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))
    throw new Error("Enter your full name and a valid email address.");
  if (password.length < 8)
    throw new Error("Use a password with at least 8 characters.");
  let users = read(USERS, isUser, localStorage);
  if (users.some((u) => u.email === normalizedEmail))
    throw new Error(
      "This email is already registered on this device. Please sign in.",
    );
  const salt = crypto.randomUUID();
  const user: User = {
    id: crypto.randomUUID(),
    name: name.trim(),
    email: normalizedEmail,
    salt,
    verifier: await passwordVerifier(password, salt),
  };
  users = read(USERS, isUser, localStorage);
  if (users.some((u) => u.email === normalizedEmail))
    throw new Error("This email is already registered. Please sign in.");
  write(USERS, [...users, user], localStorage);
}
export async function login(email: string, password: string) {
  const user = read(USERS, isUser, localStorage).find(
    (u) => u.email === email.trim().toLowerCase(),
  );
  if (!user || user.verifier !== (await passwordVerifier(password, user.salt)))
    throw new Error(
      "Email or password is incorrect. Use an account registered on this device.",
    );
  write(SESSION, user.id, localStorage);
  return user;
}
export function currentUser(): User | null {
  const raw = localStorage.getItem(SESSION);
  if (!raw) return null;
  let id: unknown;
  try {
    id = JSON.parse(raw);
  } catch {
    throw new Error("Could not read your saved session. Please sign in again.");
  }
  return read(USERS, isUser, localStorage).find((u) => u.id === id) ?? null;
}
export function logout() {
  try {
    localStorage.removeItem(SESSION);
  } catch {
    throw new Error(
      "Could not sign out. Please check browser storage and try again.",
    );
  }
}
export function completion(d: Draft) {
  return [!!d.location, !!d.capturedAt, !!d.photo, !!d.note.trim()].filter(
    Boolean,
  ).length;
}
