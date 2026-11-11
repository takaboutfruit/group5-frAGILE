import { useState } from "react";
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
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState("");
  function fetchLogs() {
    if (!navigator.onLine) {
      setError("Reconnect to fetch uploaded logs.");
      return;
    }
    try {
      const records = listRecords();
      const uploaded = listUploadedLogs();
      setLogs(uploaded);
      setRecordStates(Object.fromEntries(records.map((r) => [r.id, r.status])));
      setFetched(true);
      setError("");
    } catch (e) {
      setError(message(e));
    }
  }
  return (
    <main className="narrow page queue-page">
      <div className="eyebrow">UPLOADED FIELD LOGS</div>
      <h1>Uploaded logs.</h1>
      <p>
        Fetch previously uploaded logs, then create a final record from an
        existing log. Uncommitted and waiting logs are not shown here.
      </p>
      <div className="record-links">
        <Link to="/logs">My field logs</Link>
        <Link to="/sync">View Sync Queue</Link>
      </div>
      <button className="button primary" onClick={fetchLogs}>
        Fetch Logs
      </button>
      <p className="small muted">
        Local upload simulation · No server transfer.{" "}
        {online ? "Online" : "Offline"}
      </p>
      {error && <Alert>{error}</Alert>}
      {!fetched && <p>Press Fetch Logs when online to load uploaded logs.</p>}
      {fetched && !logs.length && (
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
              <Badge>Uploaded (simulated)</Badge>
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
