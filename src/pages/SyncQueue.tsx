import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { LogTransfer } from "../transfers";
import {
  listTransfers,
  updateTransfer,
  updateTransfers,
  transferLabel,
} from "../transfers";
import { useOnline } from "../connectivity";
import { Alert, Badge } from "../components/ui";
import { date, message, shortId } from "../utils";
const running = new Set<string>();
export default function SyncQueue() {
  const online = useOnline();
  const [rows, setRows] = useState<LogTransfer[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [outcome, setOutcome] = useState("success");
  const [busy, setBusy] = useState(false);
  const interrupted = useRef(false);
  function load() {
    try {
      for (const t of listTransfers())
        if (t.status === "SYNCING" && !running.has(t.id))
          updateTransfer(
            t.id,
            "FAILED",
            localStorage,
            "Upload interrupted. Retry when online.",
          );
      setRows(listTransfers().filter((t) => t.status !== "UPLOADED"));
      setError("");
    } catch (e) {
      setError(message(e));
    }
  }
  useEffect(() => {
    load();
    window.addEventListener("storage", load);
    window.addEventListener("fragile:transfers", load);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener("fragile:transfers", load);
    };
  }, []);
  async function upload() {
    setError("");
    setNotice("");
    if (!navigator.onLine) {
      setError(
        "You’re offline. Reconnect before uploading; your committed logs are safe.",
      );
      return;
    }
    let ids: string[] = [];
    const stop = () => {
      interrupted.current = true;
    };
    try {
      const all = listTransfers();
      if (all.some((t) => t.status === "SYNCING")) return;
      ids = all
        .filter((t) => t.status === "COMMITTED" || t.status === "FAILED")
        .map((t) => t.id);
      if (!ids.length) {
        setError("No committed logs are waiting to upload.");
        return;
      }
      ids.forEach((id) => running.add(id));
      window.addEventListener("offline", stop);
      interrupted.current = false;
      setBusy(true);
      updateTransfers(ids, "SYNCING");
      setRows(listTransfers().filter((t) => t.status !== "UPLOADED"));
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const failed =
        outcome !== "success" || interrupted.current || !navigator.onLine;
      if (failed) {
        const reason =
          outcome === "fail"
            ? "Simulated upload failed. Retry the same log."
            : "Upload interrupted. Your log is preserved; retry when online.";
        updateTransfers(ids, "FAILED", localStorage, reason);
        setError(reason);
      } else {
        updateTransfers(ids, "UPLOADED");
        setNotice(
          "Logs uploaded successfully (simulated). They are now available on Uploaded Logs.",
        );
      }
      setRows(listTransfers().filter((t) => t.status !== "UPLOADED"));
    } catch (e) {
      setError(message(e));
    } finally {
      ids.forEach((id) => running.delete(id));
      window.removeEventListener("offline", stop);
      setBusy(false);
    }
  }
  return (
    <main className="narrow page queue-page">
      <div className="eyebrow">COMMITTED FIELD LOGS</div>
      <h1>Synchronization Queue.</h1>
      <p>
        Only logs confirmed with Commit Logs in My logs appear here. Successful
        uploads leave this queue.
      </p>
      <div className="record-links">
        <Link to="/logs">My field logs</Link>
        <Link to="/uploaded">Uploaded Logs</Link>
      </div>
      <div
        className={`connection-status ${online ? "connected" : "disconnected"}`}
      >
        {online
          ? "Online · Simulated upload available"
          : "Offline · Logs saved on device"}
      </div>
      <div className="queue-stats">
        <div>
          <strong>{rows.length}</strong>Total Queued
        </div>
        <div>
          <strong>{rows.filter((r) => r.status !== "FAILED").length}</strong>
          Waiting to Sync
        </div>
        <div>
          <strong>{rows.filter((r) => r.status === "FAILED").length}</strong>
          Failed
        </div>
      </div>
      {error && <Alert>{error}</Alert>}
      {notice && <Alert success>{notice}</Alert>}
      {!rows.length && (
        <section className="empty-state">
          <h2>Your sync queue is empty.</h2>
          <p>
            Save logs in My logs, then select Commit Logs. Uploaded logs are
            available on the separate Uploaded Logs page.
          </p>
        </section>
      )}
      <div className="queue-list">
        {rows.map((t) => (
          <article key={t.id} data-testid="queue-row" className="queue-row">
            <div className="queue-row-top">
              <strong>Log #{shortId(t.id)}</strong>
              <Badge>{transferLabel[t.status]}</Badge>
            </div>
            <p>{t.note || "Cleanup log"}</p>
            <p className="small muted">Captured: {date(t.capturedAt)}</p>
            {t.photo && (
              <img
                className="receipt-image"
                src={t.photo}
                alt="Committed cleanup evidence"
              />
            )}
            {t.syncError && <p className="queue-error">{t.syncError}</p>}
          </article>
        ))}
      </div>
      <section className="record-section">
        <button
          className="button secondary full"
          onClick={load}
          disabled={busy}
        >
          Refresh Local Queue
        </button>
      </section>
      {rows.length > 0 && (
        <section className="record-section">
          <h2>Upload Log</h2>
          <p>
            Upload all committed logs in this queue. Local simulation only; no
            data is sent to a server.
          </p>
          <label>
            Simulation outcome
            <select
              value={outcome}
              disabled={busy || rows.some((t) => t.status === "SYNCING")}
              onChange={(e) => setOutcome(e.target.value)}
            >
              <option value="success">Success</option>
              <option value="fail">Failure</option>
              <option value="interrupt">Interrupted</option>
            </select>
          </label>
          <button
            className="button primary full"
            disabled={busy || rows.some((t) => t.status === "SYNCING")}
            onClick={() => void upload()}
          >
            {busy || rows.some((t) => t.status === "SYNCING")
              ? "Syncing…"
              : rows.some((t) => t.status === "FAILED")
                ? "Try Again"
                : "Upload Log"}
          </button>
        </section>
      )}
      <aside className="field-tip">
        <span>DEMO OPERATIONAL BOUNDARIES</span>Load before switching Chrome
        Network to Offline. Commit locally while offline; reconnect to upload.
        Offline reload is outside scope.
      </aside>
    </main>
  );
}
