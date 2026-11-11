import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Plus,
  FilePenLine,
  Camera,
  HardDrive,
  Waves,
  MapPin,
  Clock3,
  ArrowRight,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import {
  commitLogs,
  listTransfers,
  transferLabel,
  missingLogFields,
} from "../transfers";
import type { TransferStatus } from "../transfers";
import type { Draft } from "../model";
import { listDrafts, deleteDraft } from "../model";
import { Alert, Modal, Badge } from "../components/ui";
import { message, date, shortId } from "../utils";
function completion(d: Draft) {
  return [
    !!d.location,
    Number.isFinite(Date.parse(d.capturedAt)),
    !!d.photo,
  ].filter(Boolean).length;
}
export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [committing, setCommitting] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState<string[]>([]);
  const [commitError, setCommitError] = useState("");
  function confirmCommit() {
    try {
      commitLogs(selectedLogs);
      setCommitting(false);
      navigate("/sync");
    } catch (e) {
      setCommitError(message(e));
    }
  }
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [statuses, setStatuses] = useState<Record<string, TransferStatus>>({});
  const [error, setError] = useState("");
  const [target, setTarget] = useState<Draft | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [notice, setNotice] = useState(
    location.state?.saved ? "Draft saved on this device." : "",
  );
  function load() {
    try {
      setDrafts(listDrafts());
      setStatuses(
        Object.fromEntries(listTransfers().map((r) => [r.id, r.status])),
      );
      setError("");
    } catch (e) {
      setError(message(e));
    }
  }
  useEffect(() => {
    load();
    const sync = () => load();
    window.addEventListener("storage", sync);
    window.addEventListener("fragile:transfers", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("fragile:transfers", sync);
    };
  }, []);
  function remove() {
    if (!target) return;
    try {
      deleteDraft(target.id);
      setTarget(null);
      setNotice("Draft deleted from this device.");
      load();
    } catch (e) {
      setDeleteError(message(e));
    }
  }
  return (
    <main className="dashboard page">
      <div className="page-title-row">
        <div>
          <div className="eyebrow">YOUR OCEAN FIELDWORK</div>
          <h1>
            My field logs<span className="title-dot">.</span>
          </h1>
          <p>
            Capture your fieldwork here. Save drafts anytime; commit completed
            logs when they’re ready to upload.
          </p>
        </div>
        <div className="dashboard-actions">
          <Link className="button primary" to="/logs/new">
            <Plus size={18} /> Create log
          </Link>
          <button
            className="button secondary"
            disabled={!drafts.some((d) => !statuses[d.id])}
            onClick={() => {
              setSelectedLogs([]);
              setCommitError("");
              setCommitting(true);
            }}
          >
            Commit Logs
          </button>
        </div>
      </div>
      {notice && (
        <Alert success onDismiss={() => setNotice("")}>
          {notice}
        </Alert>
      )}
      {error && (
        <>
          <Alert>{error}</Alert>
          <button className="text-button" onClick={load}>
            Try reading drafts again
          </button>
        </>
      )}
      <div className="stats-grid">
        <div className="stat">
          <span className="stat-icon">
            <FilePenLine size={21} />
          </span>
          <div>
            <strong>{drafts.length.toString().padStart(2, "0")}</strong>
            <span>Saved logs</span>
          </div>
        </div>
        <div className="stat">
          <span className="stat-icon">
            <Camera size={21} />
          </span>
          <div>
            <strong>
              {drafts
                .filter((d) => d.photo)
                .length.toString()
                .padStart(2, "0")}
            </strong>
            <span>Photos recorded</span>
          </div>
        </div>
        <div className="stat stat-storage">
          <span className="stat-icon">
            <HardDrive size={21} />
          </span>
          <div>
            <strong>On this device</strong>
            <span>Local field logs</span>
          </div>
          <span className="live-dot" />
        </div>
      </div>
      <div className="section-title">
        <h2>
          Saved logs <span>{drafts.length}</span>
        </h2>
        <span className="muted small">Most recently saved first</span>
      </div>
      {!error && drafts.length === 0 ? (
        <section className="empty-state">
          <div className="empty-illustration">
            <Waves size={72} strokeWidth={1} />
            <span>
              <Plus size={19} />
            </span>
          </div>
          <span className="eyebrow">A FRESH START</span>
          <h2>Your next cleanup belongs here.</h2>
          <p>
            Capture the location, add a photo, and note what you recovered.
            <br />
            Your progress stays with you on this device.
          </p>
          <Link className="button primary" to="/logs/new">
            <Plus size={18} /> Create your first log
          </Link>
          <span className="empty-footnote">
            <HardDrive size={14} /> No connection needed to save a draft
          </span>
        </section>
      ) : (
        <div className="draft-grid">
          {drafts.map((d) => (
            <article className="draft-card" key={d.id}>
              <div className={`draft-image ${d.photo ? "" : "no-photo"}`}>
                {d.photo ? (
                  <img src={d.photo} alt="Cleanup evidence" />
                ) : (
                  <>
                    <Waves size={66} strokeWidth={1} />
                    <span>No photo yet</span>
                  </>
                )}
                <Badge>
                  {statuses[d.id] ? transferLabel[statuses[d.id]] : "Draft"}
                </Badge>
              </div>
              <div className="draft-content">
                <div className="draft-card-title">
                  <h3>Log #{shortId(d.id)}</h3>
                  <span className="small muted">
                    {completion(d)}/3 required fields
                  </span>
                </div>
                <p className="draft-note">
                  {d.note || "No cleanup note added yet."}
                </p>
                <div className="draft-meta">
                  <span>
                    <MapPin size={14} />
                    {d.location
                      ? `${d.location.latitude.toFixed(4)}°, ${d.location.longitude.toFixed(4)}°`
                      : "Location not added"}
                  </span>
                  <span>
                    <Clock3 size={14} />
                    {date(d.capturedAt)}
                  </span>
                </div>
                <div className="progress-track">
                  <span style={{ width: `${(completion(d) / 3) * 100}%` }} />
                </div>
                {statuses[d.id] && (
                  <Link
                    to={statuses[d.id] === "UPLOADED" ? "/uploaded" : "/sync"}
                    className="text-button"
                  >
                    {statuses[d.id] === "UPLOADED"
                      ? "View uploaded logs"
                      : "View in Sync Queue"}
                  </Link>
                )}
                <div className="draft-card-footer">
                  {!statuses[d.id] && (
                    <>
                      <Link to={`/logs/${d.id}`} className="text-button">
                        Edit draft <ArrowRight size={15} />
                      </Link>
                      <button
                        className="icon-button delete-button"
                        aria-label={`Delete draft ${shortId(d.id)}`}
                        onClick={() => {
                          setTarget(d);
                          setDeleteError("");
                        }}
                      >
                        <Trash2 size={17} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <aside className="storage-note">
        <ShieldCheck size={19} />
        <p>
          <strong>Your fieldwork stays with you.</strong> Drafts are saved in
          this browser. Clearing browser data will remove them. This prototype
          does not upload or back up records.
        </p>
      </aside>
      {committing && (
        <Modal
          title="Commit selected logs?"
          onClose={() => setCommitting(false)}
        >
          <p>
            Select the saved logs to commit. Confirmed logs are locked and added
            to Sync Queue. Unselected logs remain drafts.
          </p>
          {drafts
            .filter((d) => !statuses[d.id])
            .map((d) => (
              <label key={d.id} className="commit-choice">
                <input
                  type="checkbox"
                  disabled={missingLogFields(d).length > 0}
                  checked={selectedLogs.includes(d.id)}
                  onChange={(e) =>
                    setSelectedLogs((ids) =>
                      e.target.checked
                        ? [...ids, d.id]
                        : ids.filter((id) => id !== d.id),
                    )
                  }
                />
                <span>
                  Log #{shortId(d.id)} · {d.note || "No note"}
                  {missingLogFields(d).length > 0 && (
                    <small className="commit-missing">
                      Needs {missingLogFields(d).join(" and ")}. Edit this draft
                      before committing.
                    </small>
                  )}
                </span>
              </label>
            ))}
          {commitError && <Alert>{commitError}</Alert>}
          <div className="modal-actions">
            <button
              className="button primary"
              disabled={!selectedLogs.length}
              onClick={confirmCommit}
            >
              Confirm Commit
            </button>
            <button
              className="button secondary"
              onClick={() => setCommitting(false)}
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}
      {target && (
        <Modal title="Delete this draft?" onClose={() => setTarget(null)}>
          <p>
            This permanently removes this draft and its photo from this device.
            This action cannot be undone.
          </p>
          <div className="delete-preview">
            <strong>Log #{shortId(target.id)}</strong>
            <p>{target.note || "No note added"}</p>
            <small>Last saved {date(target.updatedAt)}</small>
          </div>
          {deleteError && <Alert>{deleteError}</Alert>}
          <div className="modal-actions">
            <button className="button danger full" onClick={remove}>
              <Trash2 size={17} />
              Delete draft
            </button>
            <button
              className="button secondary full"
              onClick={() => setTarget(null)}
            >
              Keep draft
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
