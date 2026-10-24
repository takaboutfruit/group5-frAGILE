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
    const draft = { ...newDraft("maya"), note: "Fishing nets recovered" };
    saveDraft(draft, store);
    expect(listDrafts("maya", store)[0]).toEqual(draft);
    saveDraft({ ...draft, note: "Bottles recovered too" }, store);
    const saved = listDrafts("maya", store);
    expect(saved).toHaveLength(1);
    expect(saved[0].note).toBe("Bottles recovered too");
    expect(saved[0].capturedAt).toBe(draft.capturedAt);
    deleteDraft("maya", draft.id, store);
    expect(listDrafts("maya", store)).toEqual([]);
  });
  it("scopes listing and deletion to each demo account", () => {
    const store = new MemoryStorage();
    const draft = newDraft("maya");
    saveDraft(draft, store);
    expect(listDrafts("other", store)).toEqual([]);
    expect(() => deleteDraft("other", draft.id, store)).toThrow(
      "no longer available",
    );
    expect(() => saveDraft({ ...draft, ownerId: "other" }, store)).toThrow(
      "another account",
    );
    expect(listDrafts("maya", store)).toHaveLength(1);
  });
  it("preserves the previous version if a write fails", () => {
    const store = new MemoryStorage();
    const draft = { ...newDraft("maya"), note: "Saved note" };
    saveDraft(draft, store);
    store.setItem = () => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    };
    expect(() => saveDraft({ ...draft, note: "Unsaved edit" }, store)).toThrow(
      "Storage may be full",
    );
    expect(listDrafts("maya", store)[0].note).toBe("Saved note");
    expect(() => deleteDraft("maya", draft.id, store)).toThrow(
      "Could not save",
    );
    expect(listDrafts("maya", store)).toHaveLength(1);
  });
  it("never overwrites corrupted storage on a save", () => {
    const store = new MemoryStorage();
    store.setItem("fragile:v1:drafts", "broken-json");
    expect(() => saveDraft(newDraft("maya"), store)).toThrow("left untouched");
    expect(store.getItem("fragile:v1:drafts")).toBe("broken-json");
  });
  it("rejects invalid location and time data before storage", () => {
    const store = new MemoryStorage();
    expect(() =>
      saveDraft(
        {
          ...newDraft("maya"),
          location: { latitude: 100, longitude: 0, accuracy: 5 },
        },
        store,
      ),
    ).toThrow("invalid data");
    expect(() =>
      saveDraft({ ...newDraft("maya"), capturedAt: "invalid" }, store),
    ).toThrow("invalid data");
    expect(store.length).toBe(0);
  });
  it("validates the 500-character note boundary and derives completion", () => {
    expect(() => validateNote("a".repeat(500))).not.toThrow();
    expect(() => validateNote("a".repeat(501))).toThrow("500");
    expect(noteLength("🌊")).toBe(1);
    expect(completion(newDraft("maya"))).toBe(1);
    expect(completion({ ...newDraft("maya"), note: "   " })).toBe(1);
  });
});
