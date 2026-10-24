import { describe, it, expect } from "vitest";
import {
  completion,
  deleteDraft,
  listDrafts,
  newDraft,
  noteLength,
  saveDraft,
  validateNote,
} from "./model";
class MemoryStorage implements Storage {
  data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  key(i: number) {
    return [...this.data.keys()][i] ?? null;
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
}
describe("device draft persistence", () => {
  it("creates, reads, updates, and deletes the same draft without duplicates", () => {
    const store = new MemoryStorage();
    const draft = { ...newDraft(), note: "Fishing nets recovered" };
    saveDraft(draft, store);
    expect(listDrafts(store)[0]).toEqual(draft);
    saveDraft({ ...draft, note: "Bottles recovered too" }, store);
    const saved = listDrafts(store);
    expect(saved).toHaveLength(1);
    expect(saved[0].note).toBe("Bottles recovered too");
    expect(saved[0].capturedAt).toBe(draft.capturedAt);
    deleteDraft(draft.id, store);
    expect(listDrafts(store)).toEqual([]);
  });
  it("keeps legacy account drafts available in the shared device workspace", () => {
    const store = new MemoryStorage();
    const legacy = {
      ...newDraft(),
      ownerId: "previous-account",
      note: "Existing cleanup",
    };
    const guest = { ...newDraft(), note: "New cleanup" };
    saveDraft(legacy, store);
    saveDraft(guest, store);
    expect(listDrafts(store)).toHaveLength(2);
    saveDraft({ ...legacy, note: "Edited without signing in" }, store);
    expect(listDrafts(store).find((d) => d.id === legacy.id)?.note).toBe(
      "Edited without signing in",
    );
    deleteDraft(legacy.id, store);
    expect(listDrafts(store)).toEqual([guest]);
  });
  it("preserves the previous version if a write fails", () => {
    const store = new MemoryStorage();
    const draft = { ...newDraft(), note: "Saved note" };
    saveDraft(draft, store);
    store.setItem = () => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    };
    expect(() => saveDraft({ ...draft, note: "Unsaved edit" }, store)).toThrow(
      "Storage may be full",
    );
    expect(listDrafts(store)[0].note).toBe("Saved note");
    expect(() => deleteDraft(draft.id, store)).toThrow("Could not save");
    expect(listDrafts(store)).toHaveLength(1);
  });
  it("never overwrites corrupted storage on a save", () => {
    const store = new MemoryStorage();
    store.setItem("fragile:v1:drafts", "broken-json");
    expect(() => saveDraft(newDraft(), store)).toThrow("left untouched");
    expect(store.getItem("fragile:v1:drafts")).toBe("broken-json");
  });
  it("rejects invalid location and time data before storage", () => {
    const store = new MemoryStorage();
    expect(() =>
      saveDraft(
        {
          ...newDraft(),
          location: { latitude: 100, longitude: 0, accuracy: 5 },
        },
        store,
      ),
    ).toThrow("invalid data");
    expect(() =>
      saveDraft({ ...newDraft(), capturedAt: "invalid" }, store),
    ).toThrow("invalid data");
    expect(store.length).toBe(0);
  });
  it("validates the 500-character note boundary and derives completion", () => {
    expect(() => validateNote("a".repeat(500))).not.toThrow();
    expect(() => validateNote("a".repeat(501))).toThrow("500");
    expect(noteLength("🌊")).toBe(1);
    expect(completion(newDraft())).toBe(1);
    expect(completion({ ...newDraft(), note: "   " })).toBe(1);
  });
});
