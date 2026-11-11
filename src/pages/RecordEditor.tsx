import { useEffect, useRef, useState } from "react";
import {
  Link,
  useBlocker,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";
import type { RecordData } from "../records";
import {
  fromDraft,
  listRecords,
  saveRecord,
  transition,
  validateRecord,
  validateReceipt,
  MATERIALS,
  LEVELS,
  statusLabel,
} from "../records";
import { listDrafts, newDraft } from "../model";
import { deleteReceipt, getReceipt, putReceipt } from "../receiptStore";
import { Alert, Modal, Badge } from "../components/ui";
import Signature from "../components/Signature";
import { preparePhoto } from "../photo";
import { date, message, shortId } from "../utils";
function initialRecord(id?: string) {
  if (!id) return fromDraft(newDraft());
  const existing = listRecords().find((r) => r.id === id);
  if (existing) return existing;
  const draft = listDrafts().find((d) => d.id === id);
  if (draft) return fromDraft(draft);
  throw Error("This record could not be found on this device.");
}
export default function RecordEditor() {
  const { id } = useParams();
  return <RecordForm key={id || "new"} id={id} />;
}
function RecordForm({ id }: { id?: string }) {
  const [initial] = useState(() => {
    try {
      return { record: initialRecord(id), error: "" };
    } catch (e) {
      return { record: null, error: message(e) };
    }
  });
  const [record, setRecord] = useState(initial.record);
  const [baseline, setBaseline] = useState(initial.record);
  const [error, setError] = useState("");
  const location = useLocation();
  const [notice, setNotice] = useState(
    location.state?.saved ? "Draft saved on this device." : "",
  );
  const [busy, setBusy] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState("");
  const [preview, setPreview] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [confirmation, setConfirmation] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [clear, setClear] = useState(false);
  const navigate = useNavigate();
  const bypass = useRef(false);
  const fileRequest = useRef(0);
  const stagedImages = useRef(new Set<string>());
  const locked = !!record && record.status !== "DRAFT";
  const dirty =
    JSON.stringify(record) !== JSON.stringify(baseline) || !!preview;
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !bypass.current &&
      dirty &&
      currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    let active = true;
    let url = "";
    setReceiptUrl("");
    if (record?.receiptImageId)
      void getReceipt(record.receiptImageId)
        .then((blob) => {
          if (active) {
            url = URL.createObjectURL(blob);
            setReceiptUrl(url);
          }
        })
        .catch((e) => {
          if (active) setError(message(e));
        });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [record?.receiptImageId]);
  useEffect(() => {
    if (!preview) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(preview);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [preview]);
  useEffect(
    () => () => {
      fileRequest.current++;
      for (const imageId of stagedImages.current)
        void deleteReceipt(imageId).catch(() => {});
      stagedImages.current.clear();
    },
    [],
  );
  if (!record)
    return (
      <main className="narrow page">
        <Alert>{initial.error}</Alert>
        <Link to="/sync">Back to Sync Queue</Link>
      </main>
    );
  const r = record;
  function update(patch: Partial<RecordData>) {
    if (locked) return;
    setRecord((v) => (v ? { ...v, ...patch } : v));
    setError("");
    setNotice("");
  }
  async function selectReceipt(file?: File) {
    if (!file) return;
    const request = ++fileRequest.current;
    setBusy(true);
    setError("");
    try {
      validateReceipt(file);
      const data = await preparePhoto(file);
      const blob = await (await fetch(data)).blob();
      if (request === fileRequest.current) setPreview(blob);
    } catch (e) {
      if (request === fileRequest.current) setError(message(e));
    } finally {
      if (request === fileRequest.current) setBusy(false);
    }
  }
  async function useReceipt() {
    if (!preview) return;
    setBusy(true);
    try {
      const imageId = await putReceipt(preview);
      for (const old of stagedImages.current)
        void deleteReceipt(old).catch(() => {});
      stagedImages.current.clear();
      stagedImages.current.add(imageId);
      update({ receiptImageId: imageId });
      setPreview(null);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function persist(final = false) {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      if (final && r.receiptImageId) await getReceipt(r.receiptImageId);
      const saved = final
        ? transition(r, "COMMITTED")
        : { ...r, updatedAt: new Date().toISOString() };
      saveRecord(saved);
      for (const imageId of stagedImages.current) {
        if (imageId !== saved.receiptImageId)
          void deleteReceipt(imageId).catch(() => {});
      }
      stagedImages.current.clear();
      setRecord(saved);
      setBaseline(saved);
      setConfirmation(false);
      if (
        baseline?.receiptImageId &&
        baseline.receiptImageId !== saved.receiptImageId
      )
        void deleteReceipt(baseline.receiptImageId).catch(() => {});
      if (final) setSubmitted(true);
      else setNotice("Draft saved on this device.");
      if (!id) {
        bypass.current = true;
        navigate(`/records/${saved.id}`, {
          replace: true,
          state: { saved: !final, submitted: final },
        });
      }
    } catch (e) {
      setConfirmation(false);
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  function submit() {
    const errors = validateRecord(r);
    if (Object.keys(errors).length) {
      setError(
        "Please complete required fields. " + Object.values(errors).join(" "),
      );
      return;
    }
    setConfirmation(true);
  }
  function cancel() {
    if (
      record?.receiptImageId &&
      record.receiptImageId !== baseline?.receiptImageId
    )
      void deleteReceipt(record.receiptImageId).catch(() => {});
    stagedImages.current.clear();
    setRecord(baseline);
    setPreview(null);
    setError("");
    setNotice("Edits cancelled. Saved data preserved.");
  }
  const complete = Object.keys(validateRecord(r)).length === 0;
  return (
    <main className="narrow page record-page">
      <div className="eyebrow">OFFLINE DATA COLLECTION</div>
      <h1>{locked ? "Your final record." : "Complete your record."}</h1>
      <p>
        Log #{shortId(r.id)} · <Badge>{statusLabel[r.status]}</Badge>
      </p>
      <div className="record-links">
        <Link to="/sync">View Sync Queue</Link>
        <Link to="/logs">My field logs</Link>
      </div>
      <div className="notice neutral">
        <p>
          Saved on this device. Uploads are simulated; no data is sent to a
          server.
        </p>
      </div>
      {(submitted || locked) && (
        <Alert success>
          <span>Record submitted</span> · Locked locally · Ready for simulated
          sync.
        </Alert>
      )}
      {error && !preview && <Alert>{error}</Alert>}
      {notice && <Alert success>{notice}</Alert>}
      <fieldset disabled={locked || busy} className="record-fields">
        <section className="record-section">
          <h2>Reference & weight</h2>
          <label>
            Reference ID
            <input
              id="record-reference"
              value={r.reference}
              onChange={(e) => update({ reference: e.target.value })}
              placeholder="REF-12345"
              maxLength={100}
            />
          </label>
          <p className="small muted">Letters, numbers and hyphens. Required.</p>
          <label>
            Weight (kg)
            <input
              type="number"
              step="any"
              id="record-weight"
              value={r.weightKg ?? ""}
              onChange={(e) =>
                update({
                  weightKg:
                    e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </label>
        </section>
        <section className="record-section">
          <h2>Material & contamination</h2>
          <label>
            Material type
            <select
              id="record-material"
              value={r.materialType}
              onChange={(e) => update({ materialType: e.target.value })}
            >
              <option value="">Choose a material</option>
              {MATERIALS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          {r.materialType === "Other" && (
            <label>
              Describe material
              <textarea
                value={r.materialDescription}
                maxLength={500}
                onChange={(e) =>
                  update({ materialDescription: e.target.value })
                }
              />
            </label>
          )}
          <p className="small muted">
            Default material options are bundled on this device and available
            offline.
          </p>
          <label>
            Contamination level
            <select
              id="record-contamination"
              value={r.contaminationLevel}
              onChange={(e) => update({ contaminationLevel: e.target.value })}
            >
              <option value="">Choose a level</option>
              {LEVELS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
        </section>
        <section className="record-section">
          <h2 id="record-receipt">Receipt</h2>
          <p>
            JPEG or PNG, smaller than 3 MB. Camera capture or image selection.
          </p>
          {receiptUrl && (
            <img
              className="receipt-image"
              src={receiptUrl}
              alt="Saved receipt"
            />
          )}
          <label className="button secondary">
            {r.receiptImageId ? "Retake receipt" : "Receipt image"}
            <input
              className="sr-only"
              type="file"
              aria-label={r.receiptImageId ? "Retake receipt" : "Receipt image"}
              accept="image/jpeg,image/png"
              capture="environment"
              onChange={(e) => {
                void selectReceipt(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {r.receiptImageId && (
            <button
              className="text-button delete-button"
              onClick={() => setClear(true)}
            >
              Remove receipt
            </button>
          )}
        </section>
        <section className="record-section">
          <h2 id="record-signature">Signature</h2>
          <Signature
            value={r.signatureDataUrl}
            disabled={locked || busy}
            onChange={(signatureDataUrl) => update({ signatureDataUrl })}
          />
        </section>
      </fieldset>
      <section className="record-section">
        <h2>Review & submit</h2>
        <dl className="record-summary">
          <dt>
            Reference{" "}
            {!locked && (
              <a
                className="summary-edit"
                href="#record-reference"
                aria-label="Edit reference"
              >
                Edit
              </a>
            )}
          </dt>
          <dd>{r.reference || "Not added"}</dd>
          <dt>
            Weight{" "}
            {!locked && (
              <a
                className="summary-edit"
                href="#record-weight"
                aria-label="Edit weight"
              >
                Edit
              </a>
            )}
          </dt>
          <dd>{r.weightKg ?? "Not added"} kg</dd>
          <dt>
            Material{" "}
            {!locked && (
              <a
                className="summary-edit"
                href="#record-material"
                aria-label="Edit material"
              >
                Edit
              </a>
            )}
          </dt>
          <dd>
            {r.materialType || "Not selected"}{" "}
            {r.materialType === "Other" ? r.materialDescription : ""}
          </dd>
          <dt>
            Contamination{" "}
            {!locked && (
              <a
                className="summary-edit"
                href="#record-contamination"
                aria-label="Edit contamination"
              >
                Edit
              </a>
            )}
          </dt>
          <dd>{r.contaminationLevel || "Not selected"}</dd>
          <dt>
            Signature{" "}
            {!locked && (
              <a
                className="summary-edit"
                href="#record-signature"
                aria-label="Edit signature"
              >
                Edit
              </a>
            )}
          </dt>
          <dd>{r.signatureDataUrl ? "Captured" : "Required"}</dd>
          <dt>
            Receipt{" "}
            {!locked && (
              <a
                className="summary-edit"
                href="#record-receipt"
                aria-label="Edit receipt"
              >
                Edit
              </a>
            )}
          </dt>
          <dd>{r.receiptImageId ? "Attached" : "Not added"}</dd>
          <dt>Location GPS</dt>
          <dd>
            {r.location
              ? `${r.location.latitude}°, ${r.location.longitude}°`
              : "Not recorded"}
          </dd>
          <dt>Date & time</dt>
          <dd>{date(r.capturedAt)}</dd>
          <dt>Cleanup note</dt>
          <dd>{r.note || "Not added"}</dd>
          <dt>Photo</dt>
          <dd>{r.photo ? "Attached" : "Optional — not added"}</dd>
        </dl>
        {r.photo && (
          <img className="receipt-image" src={r.photo} alt="Cleanup evidence" />
        )}
        {!locked && (
          <>
            <p>
              {complete
                ? "Required details complete."
                : "Complete the required details before submitting."}{" "}
              Once submitted, this record is locked locally.
            </p>
            <div className="record-actions">
              <button
                className="button primary"
                disabled={busy || !!preview}
                onClick={submit}
              >
                Submit Final Record
              </button>
              <button
                className="button secondary"
                disabled={busy || !!preview}
                onClick={() => void persist()}
              >
                Save as Draft
              </button>
              <button className="text-button" disabled={busy} onClick={cancel}>
                Cancel edits
              </button>
            </div>
          </>
        )}
        {locked && (
          <div className="record-actions">
            <Link className="button primary" to="/sync">
              View Sync Queue
            </Link>
            <Link className="button secondary" to="/records/new">
              Create New Record
            </Link>
          </div>
        )}
      </section>
      {preview && (
        <Modal title="Receipt preview" onClose={() => setPreview(null)}>
          {error && <Alert>{error}</Alert>}
          <img
            className="receipt-image"
            src={previewUrl}
            alt="New receipt preview"
          />
          <div className="modal-actions">
            <button
              className="button primary"
              disabled={busy}
              onClick={() => void useReceipt()}
            >
              Use receipt
            </button>
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setPreview(null)}
            >
              Discard preview
            </button>
          </div>
        </Modal>
      )}
      {clear && (
        <Modal title="Remove receipt?" onClose={() => setClear(false)}>
          <p>Your saved image is preserved until you save these edits.</p>
          <button
            className="button danger"
            onClick={() => {
              update({ receiptImageId: null });
              setClear(false);
            }}
          >
            Remove image
          </button>
          <button className="button secondary" onClick={() => setClear(false)}>
            Keep receipt
          </button>
        </Modal>
      )}
      {confirmation && (
        <Modal
          title={
            !r.photo
              ? "No photo attached. Submit anyway?"
              : "Submit and lock this record?"
          }
          onClose={() => setConfirmation(false)}
        >
          <p>
            {!r.photo ? "A cleanup photo is optional. " : ""}This saves and
            locks the record on this device. Nothing is sent online.
          </p>
          <div className="modal-actions">
            <button
              className="button primary"
              disabled={busy}
              onClick={() => void persist(true)}
            >
              {!r.photo ? "Submit Anyway" : "Confirm submission"}
            </button>
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setConfirmation(false)}
            >
              Keep editing
            </button>
          </div>
        </Modal>
      )}
      {blocker.state === "blocked" && (
        <Modal title="Discard unsaved changes?" onClose={() => blocker.reset()}>
          <button className="button primary" onClick={() => blocker.reset()}>
            Keep editing
          </button>
          <button
            className="button secondary"
            onClick={() => blocker.proceed()}
          >
            Leave without saving
          </button>
        </Modal>
      )}
    </main>
  );
}
