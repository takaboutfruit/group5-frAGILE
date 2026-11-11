import { describe, it, expect } from "vitest";
import type { RecordData } from "./records";
import { newDraft } from "./model";
import {
  fromDraft,
  validateRecord,
  saveRecord,
  listRecords,
  transition,
  MATERIALS,
  validateReceipt,
} from "./records";
const memory = () => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => {
      m.set(k, v);
    },
  };
};
const valid = (): RecordData => ({
  ...fromDraft(newDraft()),
  reference: "REF-12345",
  weightKg: 12.5,
  materialType: MATERIALS[0],
  contaminationLevel: "Low",
  signatureDataUrl: "data:image/png;base64,abc",
});
describe("Sprint 2 record contract", () => {
  it("imports Sprint 1 data without mutating the source", () => {
    const d = { ...newDraft(), note: "Nets" };
    const r = fromDraft(d);
    expect(r.id).toBe(d.id);
    expect(r.note).toBe("Nets");
    expect(r.status).toBe("DRAFT");
    expect("status" in d).toBe(false);
  });
  it("validates required fields, reference, finite positive weight and enums", () => {
    expect(validateRecord(valid())).toEqual({});
    const r = {
      ...valid(),
      reference: "bad !",
      weightKg: Infinity,
      materialType: "Unknown",
      contaminationLevel: "Unknown",
      signatureDataUrl: "",
    };
    expect(Object.keys(validateRecord(r))).toEqual(
      expect.arrayContaining([
        "reference",
        "weightKg",
        "materialType",
        "contaminationLevel",
        "signatureDataUrl",
      ]),
    );
  });
  it.each([0, -1, NaN, Infinity])("rejects weight %s", (weightKg) =>
    expect(validateRecord({ ...valid(), weightKg })).toHaveProperty("weightKg"),
  );
  it("requires an Other description and permits an optional photo", () => {
    expect(
      validateRecord({ ...valid(), materialType: "Other" }),
    ).toHaveProperty("materialDescription");
    expect(
      validateRecord({
        ...valid(),
        materialType: "Other",
        materialDescription: "Sacks",
      }),
    ).toEqual({});
  });
  it("submits once and rejects subsequent record transitions", () => {
    const r = valid();
    const final = transition(r, "SUBMITTED");
    expect(final.id).toBe(r.id);
    expect(() => transition(final, "DRAFT")).toThrow("transition");
    expect(() => transition(final, "SUBMITTED")).toThrow("transition");
  });
  it("refuses incomplete final submissions", () =>
    expect(() => transition(fromDraft(newDraft()), "SUBMITTED")).toThrow(
      "required",
    ));
  it("upserts, restores and locks final records", () => {
    const s = memory();
    let r = valid();
    saveRecord(r, s);
    saveRecord({ ...r, weightKg: 14 }, s);
    expect(listRecords(s)).toHaveLength(1);
    r = transition({ ...r, weightKg: 14 }, "SUBMITTED");
    saveRecord(r, s);
    expect(() => saveRecord({ ...r, reference: "CHANGED" }, s)).toThrow(
      "locked",
    );
    expect(listRecords(s)[0].weightKg).toBe(14);
  });
  it("preserves prior data on storage failure and malformed JSON", () => {
    const s = memory();
    const original = valid();
    saveRecord(original, s);
    const before = s.getItem("fragile:v2:records");
    expect(() =>
      saveRecord(
        { ...original, weightKg: 20 },
        {
          ...s,
          setItem: () => {
            throw Error("full");
          },
        },
      ),
    ).toThrow("save");
    expect(s.getItem("fragile:v2:records")).toBe(before);
    s.setItem("fragile:v2:records", "broken");
    expect(() => saveRecord(valid(), s)).toThrow("untouched");
    expect(s.getItem("fragile:v2:records")).toBe("broken");
  });
  it("rejects unsupported or oversized receipt files", () => {
    expect(() => validateReceipt({ type: "text/plain", size: 10 })).toThrow(
      "JPEG",
    );
    expect(() =>
      validateReceipt({ type: "image/png", size: 3 * 1024 * 1024 }),
    ).toThrow("3 MB");
    expect(() =>
      validateReceipt({ type: "image/png", size: 10 }),
    ).not.toThrow();
  });
});

describe("draft field updates", () => {
  it("keeps missing draft fields editable but rejects invalid entered values before save", () => {
    const s = memory();
    const r = fromDraft(newDraft());
    saveRecord(r, s);
    expect(() => saveRecord({ ...r, weightKg: -2 }, s)).toThrow("Weight");
    expect(() => saveRecord({ ...r, reference: "bad !" }, s)).toThrow(
      "Reference",
    );
    expect(listRecords(s)[0].weightKg).toBeNull();
  });
  it("rejects stale draft overwrites of final records", () => {
    const s = memory();
    const r = valid();
    saveRecord(r, s);
    saveRecord(transition(r, "SUBMITTED"), s);
    expect(() => saveRecord({ ...r, weightKg: 55 }, s)).toThrow("locked");
    expect(listRecords(s)[0].status).toBe("SUBMITTED");
  });
});
it("rejects malformed persisted cleanup fields without overwriting storage", () => {
  const s = memory();
  const r = {
    ...valid(),
    location: { latitude: 100, longitude: 0, accuracy: 1 },
  };
  s.setItem("fragile:v2:records", JSON.stringify([r]));
  expect(() => listRecords(s)).toThrow("untouched");
});

it("submits a completed final record without starting a log upload", () => {
  const s = memory();
  const r = transition(valid(), "SUBMITTED");
  saveRecord(r, s);
  expect(listRecords(s)[0].status).toBe("SUBMITTED");
  expect(s.getItem("fragile:v2:log-transfers")).toBeNull();
  expect(() => transition(r, "SYNCING" as RecordData["status"])).toThrow(
    "transition",
  );
});
it("does not allow final records to use field-log commit or sync transitions", () => {
  expect(() =>
    transition(valid(), "COMMITTED" as RecordData["status"]),
  ).toThrow("transition");
});
it("reads legacy submitted records without treating them as log uploads or rewriting them", () => {
  const s = memory();
  const legacy = { ...valid(), status: "SYNCED" };
  s.setItem("fragile:v2:records", JSON.stringify([legacy]));
  expect(listRecords(s)[0].status).toBe("SUBMITTED");
  expect(JSON.parse(s.getItem("fragile:v2:records")!)[0].status).toBe("SYNCED");
});
describe("unique Reference IDs", () => {
  it("rejects duplicates across drafts and submitted records without changing storage", () => {
    const s = memory();
    const first = valid();
    saveRecord(first, s);
    const before = s.getItem("fragile:v2:records");
    expect(() =>
      saveRecord({ ...valid(), reference: " ref-12345 " }, s),
    ).toThrow("already used");
    expect(s.getItem("fragile:v2:records")).toBe(before);
    saveRecord(transition(first, "SUBMITTED"), s);
    expect(() => saveRecord({ ...valid(), reference: "REF-12345" }, s)).toThrow(
      "already used",
    );
  });
  it("allows the same record to retain its reference and different records to use different references", () => {
    const s = memory();
    const first = valid();
    saveRecord(first, s);
    saveRecord({ ...first, weightKg: 25 }, s);
    saveRecord({ ...valid(), reference: "REF-OTHER" }, s);
    expect(listRecords(s)).toHaveLength(2);
  });
  it("flags duplicates for inline validation but does not reserve empty draft references", () => {
    const first = valid();
    expect(
      validateRecord({ ...valid(), reference: "ref-12345" }, [first]),
    ).toHaveProperty("reference", expect.stringContaining("already used"));
    expect(validateRecord(first, [first])).not.toHaveProperty("reference");
    const s = memory();
    saveRecord(fromDraft(newDraft()), s);
    saveRecord(fromDraft(newDraft()), s);
    expect(listRecords(s)).toHaveLength(2);
  });
});
