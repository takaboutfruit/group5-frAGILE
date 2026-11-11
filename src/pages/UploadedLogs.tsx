import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import type { LogTransfer } from "../transfers";
import { listUploadedLogs } from "../transfers";
import { listRecords } from "../records";
import { Alert, Badge } from "../components/ui";
import { useOnline } from "../connectivity";
import { date, message, shortId } from "../utils";
export default function UploadedLogs() {
  const online = useOnline();
  const [logs, setLogs] = useState<LogTransfer[]>([]);
  const [recordStates, setRecordStates] = useState<Record<string, string>>({});
  const [fetched, setFetched] = useState(() => {
    try {
      return localStorage.getItem("fragile:v2:records-fetched") === "yes";
    } catch {
      return false;
    }
  });
  const [error, setError] = useState("");
  function load() {
    const records = listRecords();
    setLogs(listUploadedLogs());
    setRecordStates(Object.fromEntries(records.map((r) => [r.id, r.status])));
  }
  useEffect(() => {
    if (!fetched) return;
    const refresh = () => {
      try {
        load();
        setError("");
      } catch (e) {
        setError(message(e));
      }
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("fragile:transfers", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("fragile:transfers", refresh);
    };
  }, [fetched]);
  function fetchLogs() {
    if (!navigator.onLine) {
      setError("Reconnect to fetch uploaded logs.");
      return;
    }
    try {
      load();
      localStorage.setItem("fragile:v2:records-fetched", "yes");
      setFetched(true);
      setError("");
    } catch (e) {
      setError(message(e));
    }
  }
  return (
    <main className="narrow page queue-page">
      <div className="eyebrow">UPLOADED FIELD LOGS</div>
      <h1>Records.</h1>
      <p>
        Create or continue a final record from an uploaded log. Your saved
        record progress appears here.
      </p>

      {!fetched && (
        <button className="button primary" onClick={fetchLogs}>
          Fetch Logs
        </button>
      )}
      <p className="small muted">
        Local upload simulation · No server transfer.{" "}
        {online ? "Online" : "Offline"}
      </p>
      {error && <Alert>{error}</Alert>}
      {!fetched && <p>Press Fetch Logs when online to load uploaded logs.</p>}
      {fetched && !error && !logs.length && (
        <section className="empty-state">
          <h2>No uploaded logs.</h2>
          <p>Commit saved logs in My logs, then upload them from Sync Queue.</p>
        </section>
      )}
      <div className="queue-list">
        {logs.map((t) => (
          <article className="queue-row" data-testid="uploaded-log" key={t.id}>
            <div className="queue-row-top">
              <strong>Log #{shortId(t.id)}</strong>
              <Badge>
                {recordStates[t.id] === "SUBMITTED"
                  ? "Final record submitted"
                  : recordStates[t.id] === "DRAFT"
                    ? "Record in progress"
                    : "Ready for record"}
              </Badge>
            </div>
            <p>{t.note || "Cleanup log"}</p>
            <p className="small muted">Captured: {date(t.capturedAt)}</p>
            <Link className="button secondary" to={`/records/${t.id}`}>
              {!recordStates[t.id]
                ? "New Record"
                : recordStates[t.id] === "DRAFT"
                  ? "Continue Record"
                  : "View Final Record"}
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}
