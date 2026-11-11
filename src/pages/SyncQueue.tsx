import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CloudUpload, RefreshCw, FileText } from "lucide-react";
import type { RecordData } from "../records";
import {
  listRecords,
  listLogRecords,
  saveRecord,
  statusLabel,
  transition,
} from "../records";
import { useOnline } from "../connectivity";
import { Alert, Badge } from "../components/ui";
import { date, message, shortId } from "../utils";
const running = new Set<string>();
export default function SyncQueue({ pending = false }: { pending?: boolean }) {
  const online = useOnline();
  const [rows, setRows] = useState<RecordData[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState("");
  const [outcome, setOutcome] = useState("success");
  const [busy, setBusy] = useState(false);
  const interrupted = useRef(false);
  function load() {
    try {
      let records = listLogRecords();
      for (const r of records) {
        if (r.status === "SYNCING" && !running.has(r.id)) {
          saveRecord({
            ...transition(r, "SYNC_FAILED"),
            syncError:
              "The previous upload was interrupted. Retry this record.",
          });
        }
      }
      records = listLogRecords();
      setRows(records);
      setError("");
    } catch (e) {
      setError(message(e));
    }
  }
  useEffect(() => {
    load();
    window.addEventListener("storage", load);
    return () => window.removeEventListener("storage", load);
  }, []);
  useEffect(() => {
    const stop = () => {
      interrupted.current = true;
    };
    window.addEventListener("offline", stop);
    return () => window.removeEventListener("offline", stop);
  }, []);
  async function upload() {
    setError("");
    setNotice("");
    if (!navigator.onLine) {
      setError(
        "You’re offline. Your record is saved; reconnect before syncing.",
      );
      return;
    }
    let r: RecordData | undefined;
    try {
      r = listRecords().find((v) => v.id === selected);
    } catch (e) {
      setError(message(e));
      return;
    }
    if (!r || !["COMMITTED", "SYNC_FAILED"].includes(r.status)) {
      setError("Please select a valid committed log before uploading.");
      return;
    }
    if (running.has(r.id)) return;
    running.add(r.id);
    interrupted.current = false;
    setBusy(true);
    try {
      saveRecord(transition(r, "SYNCING"));
      setRows(listLogRecords());
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const current = listRecords().find((v) => v.id === r.id)!;
      if (
        outcome === "fail" ||
        outcome === "interrupt" ||
        interrupted.current ||
        !navigator.onLine
      ) {
        const reason =
          interrupted.current || outcome === "interrupt" || !navigator.onLine
            ? "Upload interrupted. Your log is preserved; retry when online."
            : "Simulated upload failed. Your log is preserved; try again.";
        saveRecord({
          ...transition(current, "SYNC_FAILED"),
          syncError: reason,
        });
        setError(reason);
      } else {
        saveRecord(transition(current, "SYNCED"));
        setNotice(
          "Log uploaded successfully! Local simulation only — no data left this device.",
        );
      }
      setRows(listLogRecords());
    } catch (e) {
      setError(message(e));
    } finally {
      running.delete(r.id);
      setBusy(false);
    }
  }
  const waiting = rows.filter(
    (r) =>
      r.status === "DRAFT" ||
      r.status === "COMMITTED" ||
      r.status === "SYNC_FAILED" ||
      r.status === "SYNCING",
  );
  const visible = pending ? (online ? waiting : []) : rows;
  const recordIds = new Set(listRecordIds());
  function listRecordIds() {
    try {
      return listRecords().map((r) => r.id);
    } catch {
      return [];
    }
  }
  const picked = rows.find((r) => r.id === selected);
  return (
    <main className="narrow page queue-page">
      <div className="eyebrow">SAVED ON THIS DEVICE</div>
      <h1>{pending ? "Pending logs." : "Synchronization Queue."}</h1>
      <p>
        View logs waiting to be synchronized. This prototype simulates uploads
        locally.
      </p>
      <div className="record-links">
        <Link to="/logs/new">Create log</Link>
        <Link to={pending ? "/sync" : "/pending"}>
          {pending ? "View Sync Queue" : "Fetch Pending Logs"}
        </Link>
      </div>
      <div
        className={`connection-status ${online ? "connected" : "disconnected"}`}
        role="status"
      >
        {online
          ? "Online · Simulated upload available"
          : "Offline · Saved on device"}
      </div>
      <div className="queue-stats">
        <div>
          <strong>{waiting.length}</strong>Total Queued
        </div>
        <div>
          <strong>
            {waiting.filter((r) => r.status !== "SYNC_FAILED").length}
          </strong>
          Waiting to Sync
        </div>
        <div>
          <strong>
            {rows.filter((r) => r.status === "SYNC_FAILED").length}
          </strong>
          Failed
        </div>
      </div>
      {pending && !online && (
        <Alert>
          Reconnect to fetch pending logs. Your logs remain saved on this
          device.
        </Alert>
      )}
      {error && <Alert>{error}</Alert>}
      {notice && <Alert success>{notice}</Alert>}
      {!visible.length && (!pending || online) && (
        <section className="empty-state">
          <CloudUpload size={50} />
          <h2>{pending ? "No pending logs." : "Your sync queue is empty."}</h2>
          <p>
            No queued logs on this device. This does not confirm server
            synchronization.
          </p>
        </section>
      )}
      <div className="queue-list">
        {visible.map((r) => (
          <article
            className={`queue-row ${selected === r.id ? "selected" : ""}`}
            key={r.id}
            data-testid="queue-row"
          >
            <div className="queue-row-top">
              <strong>
                <FileText size={18} /> Log #{shortId(r.id)}
              </strong>
              <Badge>
                {r.status === "DRAFT"
                  ? "Pending Record"
                  : statusLabel[r.status]}
              </Badge>
            </div>
            <p>{r.reference || r.note || "Cleanup record"}</p>
            <p className="small muted">Updated: {date(r.updatedAt)}</p>
            {r.syncError && <p className="queue-error">{r.syncError}</p>}
            <div className="record-actions">
              {r.status === "DRAFT" ? (
                pending ? (
                  <Link to={`/records/${r.id}`}>
                    {recordIds.has(r.id) ? "Continue Record" : "New Record"}
                  </Link>
                ) : (
                  <Link to="/pending">View pending log</Link>
                )
              ) : (
                <Link to={`/records/${r.id}`}>View record</Link>
              )}
              {["COMMITTED", "SYNC_FAILED"].includes(r.status) && (
                <label className="queue-select">
                  <input
                    type="radio"
                    name="selected-log"
                    value={r.id}
                    checked={selected === r.id}
                    disabled={busy}
                    onChange={() => setSelected(r.id)}
                  />{" "}
                  Select log
                </label>
              )}
            </div>
          </article>
        ))}
      </div>
      <div className="record-section">
        <p className="small muted">
          Refresh reads records on this device. It does not connect to a server.
        </p>
        <button
          className="button secondary full"
          onClick={load}
          disabled={busy}
        >
          <RefreshCw size={16} /> Refresh Local Queue
        </button>
      </div>
      {(!pending || online) && waiting.some((r) => r.status !== "DRAFT") && (
        <section className="record-section">
          <h2>
            <CloudUpload size={22} /> Upload Log
          </h2>
          <p>Choose a committed log above. Nothing is sent online.</p>
          <label>
            Simulation outcome
            <select
              aria-label="Simulation outcome"
              value={outcome}
              disabled={busy}
              onChange={(e) => setOutcome(e.target.value)}
            >
              <option value="success">Success</option>
              <option value="fail">Failure</option>
              <option value="interrupt">Interrupted</option>
            </select>
          </label>
          <button
            className="button primary full"
            disabled={busy}
            onClick={() => void upload()}
          >
            {busy
              ? "Syncing…"
              : picked?.status === "SYNC_FAILED"
                ? "Try Again"
                : "Upload Log"}
          </button>
        </section>
      )}
      <aside className="field-tip">
        <span>DEMO OPERATIONAL BOUNDARIES</span>Load the app before switching
        Chrome Network to Offline. Local edits and saves keep working. Reconnect
        before simulated upload. Offline reload and cold-start are outside
        Sprint 2.
      </aside>
    </main>
  );
}
