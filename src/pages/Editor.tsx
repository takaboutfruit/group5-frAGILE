import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useBlocker, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  HardDrive,
  LoaderCircle,
  MapPin,
  RefreshCw,
} from "lucide-react";
import type { Draft } from "../model";
import {
  completion,
  listDrafts,
  newDraft,
  noteLength,
  saveDraft,
} from "../model";
import { Alert, Badge, Modal } from "../components/ui";
import { preparePhoto } from "../photo";
import { message, date, shortId } from "../utils";
export function EditorRoute() {
  const { id } = useParams();
  return <Editor key={id} id={id} />;
}
const steps = [
  { title: "Location", icon: MapPin },
  { title: "Date & time", icon: Clock3 },
  { title: "Photo", icon: Camera },
  { title: "Note", icon: FileText },
  { title: "Review", icon: CheckCircle2 },
];
export default function Editor({ id }: { id?: string }) {
  const [initial] = useState(() => {
    try {
      const draft = id ? listDrafts().find((d) => d.id === id) : newDraft();
      return {
        draft,
        error: draft ? "" : "This draft could not be found on this device.",
      };
    } catch (e) {
      return { draft: undefined, error: message(e) };
    }
  });
  const [draft, setDraft] = useState<Draft | undefined>(initial.draft);
  const [baseline, setBaseline] = useState(JSON.stringify(initial.draft));
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const bypass = useRef(false);
  const active = useRef(true);
  const gpsRequest = useRef(0);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      gpsRequest.current++;
    };
  }, []);
  const dirty = JSON.stringify(draft) !== baseline || !!preview;
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !bypass.current &&
      dirty &&
      currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty && !bypass.current) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function update(patch: Partial<Draft>) {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    setError("");
  }
  function locate() {
    setGpsError("");
    if (!navigator.geolocation) {
      setGpsError(
        "Location is not supported by this browser. You can continue without it.",
      );
      return;
    }
    setGpsBusy(true);
    const request = ++gpsRequest.current;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!active.current || request !== gpsRequest.current) return;
        update({
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
        });
        setGpsBusy(false);
      },
      (e) => {
        if (!active.current || request !== gpsRequest.current) return;
        setGpsBusy(false);
        setGpsError(
          e.code === 1
            ? "Location permission was denied. Allow location in your browser’s site settings and try again, or continue without it."
            : e.code === 3
              ? "Finding your location took too long. Move to an open area and try again, or continue without it."
              : "GPS is unavailable. Try again in an open area, or continue without location.",
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }
  async function selectPhoto(file?: File) {
    if (!file) return;
    setPhotoBusy(true);
    setError("");
    try {
      const value = await preparePhoto(file);
      if (active.current) setPreview(value);
    } catch (e) {
      if (active.current) setError(message(e));
    } finally {
      if (active.current) setPhotoBusy(false);
    }
  }
  function save() {
    if (!draft) return;
    if (!draft.location && !draft.photo && !draft.note.trim()) {
      setError("Add a location, photo, or note before saving your draft.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const saved = { ...draft, updatedAt: new Date().toISOString() };
      saveDraft(saved);
      setBaseline(JSON.stringify(saved));
      bypass.current = true;
      navigate("/logs", { state: { saved: true } });
    } catch (e) {
      setError(message(e));
      setSaving(false);
    }
  }
  if (!draft)
    return (
      <main className="narrow page">
        <Link to="/logs" className="back-link">
          <ArrowLeft size={16} /> My logs
        </Link>
        <h1>Draft unavailable</h1>
        <Alert>{initial.error}</Alert>
        <Link to="/logs" className="button primary">
          Back to my logs
        </Link>
      </main>
    );
  const validNote = noteLength(draft.note) <= 500;
  return (
    <main className="editor page">
      <Link to="/logs" className="back-link">
        <ArrowLeft size={16} /> My field logs
      </Link>
      <div className="page-title-row">
        <div>
          <div className="eyebrow">OCEAN FIELD LOG · #{shortId(draft.id)}</div>
          <h1>
            {id ? "Edit your draft" : "Record a cleanup"}
            <span className="title-dot">.</span>
          </h1>
          <p>
            {id
              ? "Pick up where you left off. Make every detail count."
              : "Capture the details now. Keep a record of your impact."}
          </p>
        </div>
        <Badge>
          <HardDrive size={13} />
          {dirty
            ? "Unsaved changes"
            : id
              ? "Saved on device"
              : "New log · not saved"}
        </Badge>
      </div>
      <div className="editor-layout">
        <aside className="editor-sidebar">
          <div className="step-nav" aria-label="Recording steps">
            {steps.map((s, i) => (
              <button
                key={s.title}
                className={`step-button ${i === step ? "current" : ""}`}
                aria-current={i === step ? "step" : undefined}
                onClick={() => {
                  setStep(i);
                  setError("");
                }}
              >
                <span className="step-number">{i + 1}</span>
                <span>{s.title}</span>
                {i === step ? <ChevronRight size={16} /> : null}
              </button>
            ))}
          </div>
          <div className="sidebar-note">
            <HardDrive size={20} />
            <strong>Made for the field</strong>
            <p>
              Your draft is saved on this device when you select Save draft. No
              upload or connection needed.
            </p>
          </div>
        </aside>
        <div className="editor-main">
          <div className="step-heading">
            <span className="eyebrow">STEP {step + 1} OF 5</span>
            <span className="small muted">
              {completion(draft)} of 4 items captured
            </span>
          </div>
          {error && <Alert>{error}</Alert>}
          {step === 0 && (
            <section className="capture-section">
              <div className="section-icon">
                <MapPin size={24} />
              </div>
              <h2>Where’s the cleanup?</h2>
              <p>
                Record your current GPS coordinates to put this cleanup on the
                map.
              </p>
              <div
                className={`location-card ${draft.location ? "has-location" : ""}`}
              >
                <div className="location-map" aria-hidden="true">
                  <div className="map-land land-one" />
                  <div className="map-land land-two" />
                  <div className="map-grid" />
                  <span className="map-pin">
                    <MapPin size={25} />
                  </span>
                  <span className="map-caption">
                    LOCATION ILLUSTRATION · NOT A LIVE MAP
                  </span>
                </div>
                <div className="location-details">
                  <span className="eyebrow">CURRENT GPS LOCATION</span>
                  {draft.location ? (
                    <>
                      <strong className="coordinates">
                        {Math.abs(draft.location.latitude).toFixed(4)}°{" "}
                        {draft.location.latitude >= 0 ? "N" : "S"}
                        <br />
                        {Math.abs(draft.location.longitude).toFixed(4)}°{" "}
                        {draft.location.longitude >= 0 ? "E" : "W"}
                      </strong>
                      <span className="location-accuracy">
                        <CheckCircle2 size={15} />
                        Accuracy ±{Math.round(draft.location.accuracy)} m
                      </span>
                    </>
                  ) : (
                    <>
                      <h3>
                        {gpsBusy
                          ? "Finding your location…"
                          : "A place for your impact"}
                      </h3>
                      <p>
                        Use your device’s location to capture coordinates. You
                        can skip this if GPS is unavailable.
                      </p>
                    </>
                  )}
                  <button
                    className="button secondary"
                    onClick={locate}
                    disabled={gpsBusy}
                  >
                    {gpsBusy ? (
                      <LoaderCircle size={16} className="spin" />
                    ) : (
                      <MapPin size={16} />
                    )}{" "}
                    {gpsBusy
                      ? "Finding GPS signal…"
                      : draft.location
                        ? "Refresh location"
                        : "Find my location"}
                  </button>
                </div>
              </div>
              {gpsError && <Alert>{gpsError}</Alert>}
              {draft.location && (
                <p className="inline-success">
                  <CheckCircle2 size={16} /> Location captured. Save your draft
                  to keep it.
                </p>
              )}
              <div className="field-tip">
                <span>FIELD TIP</span>For a more accurate reading, move to an
                open area with a clear view of the sky.
              </div>
            </section>
          )}
          {step === 1 && (
            <section className="capture-section">
              <div className="section-icon">
                <Clock3 size={24} />
              </div>
              <h2>A moment worth recording.</h2>
              <p>
                Your device time was captured automatically when this log was
                created.
              </p>
              <div className="time-card">
                <div className="time-card-label">
                  <Clock3 size={21} />
                  <Badge>Device time</Badge>
                </div>
                <h3>
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: "full",
                  }).format(new Date(draft.capturedAt))}
                </h3>
                <strong>
                  {new Intl.DateTimeFormat(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  }).format(new Date(draft.capturedAt))}
                </strong>
                <p>{draft.timezone} · Device timezone</p>
                <div className="time-card-bottom">
                  <CheckCircle2 size={16} /> Captured for this log
                </div>
              </div>
              <button
                className="text-button"
                onClick={() =>
                  update({
                    capturedAt: new Date().toISOString(),
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                  })
                }
              >
                <RefreshCw size={15} /> Use current device time
              </button>
              <div className="field-tip">
                <span>GOOD TO KNOW</span>Check your device clock. This prototype
                records device time; it does not verify it against a server.
              </div>
            </section>
          )}
          {step === 2 && (
            <section className="capture-section">
              <div className="section-icon">
                <Camera size={24} />
              </div>
              <h2>Show what you recovered.</h2>
              <p>
                Add a photo of the collected waste. A picture tells the rest of
                the story.
              </p>
              {preview || draft.photo ? (
                <div className="photo-preview">
                  <img
                    src={(preview || draft.photo)!}
                    alt={
                      preview
                        ? "New cleanup photo preview"
                        : "Saved cleanup evidence"
                    }
                  />
                  <div>
                    <Camera size={17} />
                    <span>
                      {preview
                        ? "Preview only · choose Use photo to attach"
                        : "Photo attached to this log"}
                    </span>
                  </div>
                </div>
              ) : (
                <label className={`photo-drop ${photoBusy ? "busy" : ""}`}>
                  <span className="photo-drop-icon">
                    {photoBusy ? (
                      <LoaderCircle className="spin" size={30} />
                    ) : (
                      <Camera size={30} />
                    )}
                  </span>
                  <strong>
                    {photoBusy
                      ? "Preparing your photo…"
                      : "Capture the cleanup"}
                  </strong>
                  <span>Take a photo or choose one from your device</span>
                  <span className="photo-formats">
                    JPG, PNG or WebP · up to 15 MB
                  </span>
                  <input
                    aria-label="Take or choose a photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    disabled={photoBusy}
                    onChange={(e) => {
                      void selectPhoto(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
              {preview && (
                <div className="photo-actions">
                  <button
                    className="button primary"
                    onClick={() => {
                      update({ photo: preview });
                      setPreview(null);
                    }}
                  >
                    <Check size={17} /> Use photo
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => setPreview(null)}
                  >
                    Discard preview
                  </button>
                </div>
              )}
              {(preview || draft.photo) && (
                <div className="photo-actions">
                  <label className="button secondary">
                    {photoBusy ? (
                      <LoaderCircle className="spin" size={16} />
                    ) : (
                      <Camera size={16} />
                    )}
                    Replace photo
                    <input
                      className="sr-only"
                      type="file"
                      aria-label="Replace photo"
                      accept="image/jpeg,image/png,image/webp"
                      capture="environment"
                      disabled={photoBusy}
                      onChange={(e) => {
                        void selectPhoto(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {draft.photo && !preview && (
                    <button
                      className="text-button delete-button"
                      onClick={() => update({ photo: null })}
                    >
                      Remove photo
                    </button>
                  )}
                </div>
              )}
              <div className="field-tip">
                <span>FIELD TIP</span>Keep the recovered waste in view. Photos
                are resized for device storage and are never uploaded in this
                demo. If camera permission is denied, choose an existing photo.
              </div>
            </section>
          )}
          {step === 3 && (
            <section className="capture-section">
              <div className="section-icon">
                <FileText size={24} />
              </div>
              <h2>Add the little details.</h2>
              <p>
                What did you recover? A short note helps tell the story of this
                cleanup.
              </p>
              <label className="note-label">
                Cleanup note <span>Optional</span>
                <textarea
                  value={draft.note}
                  maxLength={500}
                  rows={8}
                  placeholder="e.g. Fishing nets and plastic bottles near the reef. Heavy current; all collected waste secured on deck."
                  onChange={(e) => update({ note: e.target.value })}
                />
              </label>
              <div className={`note-counter ${validNote ? "" : "invalid"}`}>
                <span>
                  Waste type, sea conditions, or anything worth remembering.
                </span>
                <span>{noteLength(draft.note)}/500</span>
              </div>
              {!validNote && (
                <Alert>Shorten this note to 500 characters or fewer.</Alert>
              )}
              <div className="field-tip">
                <span>A LITTLE INSPIRATION</span>Think about the types of
                plastic, conditions at sea, collection hazards, or what would
                help on your next visit.
              </div>
            </section>
          )}
          {step === 4 && (
            <section className="capture-section">
              <div className="section-icon">
                <CheckCircle2 size={24} />
              </div>
              <h2>A record of your impact.</h2>
              <p>
                Review your cleanup details, then save your progress as a draft.
              </p>
              <div className="review-card">
                <div className="review-card-heading">
                  <h3>Log #{shortId(draft.id)}</h3>
                  <Badge>Draft</Badge>
                </div>
                <Summary draft={draft} onEdit={setStep} />
                {draft.photo && (
                  <img
                    className="review-photo"
                    src={draft.photo}
                    alt="Cleanup evidence to save"
                  />
                )}
                {draft.note && <p className="review-note">{draft.note}</p>}
              </div>
              <div className="notice neutral">
                <HardDrive size={20} />
                <p>
                  This draft stays on this device. It has not been uploaded. You
                  can come back and edit it anytime.
                </p>
              </div>
            </section>
          )}
          <div className="editor-actions">
            <button
              className="button secondary"
              onClick={() =>
                step === 0 ? navigate("/logs") : setStep(step - 1)
              }
            >
              <ArrowLeft size={16} />
              {step === 0 ? "Cancel" : "Back"}
            </button>
            <div className="editor-actions-right">
              {step < 4 && (
                <button
                  className="text-button save-early"
                  onClick={save}
                  disabled={!validNote || photoBusy || !!preview || saving}
                >
                  Save draft
                </button>
              )}
              <button
                className="button primary"
                disabled={
                  step === 4 && (!validNote || photoBusy || !!preview || saving)
                }
                onClick={() => (step === 4 ? save() : setStep(step + 1))}
              >
                {step === 4 ? (
                  <>
                    <Check size={17} />
                    Save draft
                  </>
                ) : (
                  <>
                    {step === 0 && !draft.location
                      ? "Continue without location"
                      : `Next: ${steps[step + 1].title}`}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
          {preview && step !== 2 && (
            <p className="preview-reminder">
              You have an unaccepted photo preview. Return to Photo to use or
              discard it before saving.
            </p>
          )}
          <div className="editor-local-note">
            <HardDrive size={13} />{" "}
            {dirty
              ? "Changes not saved yet"
              : id
                ? "Your saved draft is on this device"
                : "Your log will stay on this device"}
          </div>
        </div>
      </div>
      {blocker.state === "blocked" && (
        <Modal title="Discard unsaved changes?" onClose={() => blocker.reset()}>
          <p>
            Your latest edits have not been saved on this device. Leave without
            saving, or keep editing your log.
          </p>
          <div className="modal-actions">
            <button
              className="button primary full"
              onClick={() => blocker.reset()}
            >
              Keep editing
            </button>
            <button
              className="button secondary full"
              onClick={() => blocker.proceed()}
            >
              Leave without saving
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
function Summary({
  draft,
  onEdit,
}: {
  draft: Draft;
  onEdit: (step: number) => void;
}) {
  const items = [
    {
      label: "Location",
      detail: draft.location
        ? `${draft.location.latitude.toFixed(4)}°, ${draft.location.longitude.toFixed(4)}°`
        : "Not added",
      done: !!draft.location,
    },
    { label: "Date & time", detail: date(draft.capturedAt), done: true },
    {
      label: "Photo",
      detail: draft.photo ? "Attached" : "Not added",
      done: !!draft.photo,
    },
    {
      label: "Note",
      detail: draft.note.trim() ? "Added" : "Not added",
      done: !!draft.note.trim(),
    },
  ];
  return (
    <>
      <p className="small muted">{completion(draft)} of 4 items captured</p>
      <div className="progress-track">
        <span style={{ width: `${(completion(draft) / 4) * 100}%` }} />
      </div>
      <div className="summary-items">
        {items.map((item, i) => (
          <div className="summary-item" key={item.label}>
            <span className={item.done ? "check-icon" : "empty-check"}>
              {item.done ? <Check size={12} /> : null}
            </span>
            <div>
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
            </div>
            <button className="text-button" onClick={() => onEdit(i)}>
              Edit
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
