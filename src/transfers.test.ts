import { describe, it, expect } from "vitest";
import { newDraft } from "./model";
import {
  commitLogs,
  listTransfers,
  listUploadedLogs,
  updateTransfer,
  updateTransfers,
} from "./transfers";
const memory = () => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => {
      m.set(k, v);
    },
  };
};
describe("field log commit and upload lifecycle", () => {
  it("does not queue a saved log until explicitly selected and committed", () => {
    const s = memory();
    const a = { ...newDraft(), note: "A" },
      b = { ...newDraft(), note: "B" };
    s.setItem("fragile:v1:drafts", JSON.stringify([a, b]));
    expect(listTransfers(s)).toEqual([]);
    commitLogs([a.id], s);
    expect(listTransfers(s)).toHaveLength(1);
    expect(listTransfers(s)[0]).toMatchObject({
      id: a.id,
      note: "A",
      status: "COMMITTED",
    });
    expect(listUploadedLogs(s)).toEqual([]);
    commitLogs([a.id], s);
    expect(listTransfers(s)).toHaveLength(1);
  });
  it("commits selected logs atomically and preserves source details", () => {
    const s = memory();
    const a = newDraft(),
      b = newDraft();
    s.setItem("fragile:v1:drafts", JSON.stringify([a, b]));
    expect(() => commitLogs([a.id, "missing"], s)).toThrow("available");
    expect(listTransfers(s)).toEqual([]);
    commitLogs([a.id, b.id], s);
    expect(listTransfers(s).map((r) => r.id)).toEqual([a.id, b.id]);
    expect(JSON.parse(s.getItem("fragile:v1:drafts")!)).toEqual([a, b]);
  });
  it("keeps failures retryable and fetches only uploaded log snapshots", () => {
    const s = memory();
    const a = { ...newDraft(), note: "Snapshot" };
    s.setItem("fragile:v1:drafts", JSON.stringify([a]));
    commitLogs([a.id], s);
    expect(() => updateTransfer(a.id, "UPLOADED", s)).toThrow("transition");
    updateTransfer(a.id, "SYNCING", s);
    updateTransfer(a.id, "FAILED", s);
    expect(listUploadedLogs(s)).toEqual([]);
    updateTransfer(a.id, "SYNCING", s);
    updateTransfer(a.id, "UPLOADED", s);
    expect(listUploadedLogs(s)).toHaveLength(1);
    expect(listTransfers(s)).toHaveLength(1);
    expect(() => updateTransfer(a.id, "SYNCING", s)).toThrow("transition");
  });
  it("does not lose logs when commit storage fails or is corrupt", () => {
    const s = memory();
    const a = newDraft();
    s.setItem("fragile:v1:drafts", JSON.stringify([a]));
    expect(() =>
      commitLogs([a.id], {
        ...s,
        setItem: () => {
          throw Error("full");
        },
      }),
    ).toThrow("save");
    expect(listTransfers(s)).toEqual([]);
    s.setItem("fragile:v2:log-transfers", "broken");
    expect(() => commitLogs([a.id], s)).toThrow("untouched");
  });
});

it("validates a whole upload batch before changing any selected log", () => {
  const s = memory();
  const a = newDraft(),
    b = newDraft();
  s.setItem("fragile:v1:drafts", JSON.stringify([a, b]));
  commitLogs([a.id, b.id], s);
  const before = s.getItem("fragile:v2:log-transfers");
  expect(() => updateTransfers([a.id, "missing"], "SYNCING", s)).toThrow(
    "transition",
  );
  expect(s.getItem("fragile:v2:log-transfers")).toBe(before);
  updateTransfers([a.id, b.id], "SYNCING", s);
  updateTransfers([a.id, b.id], "UPLOADED", s);
  expect(listUploadedLogs(s)).toHaveLength(2);
});
