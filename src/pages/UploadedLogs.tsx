import { useState, useEffect } from "react";
import { Clock3, MapPin, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import type { LogTransfer } from "../transfers";
import { listUploadedLogs } from "../transfers";
import { listRecords } from "../records";
import { Alert, Badge } from "../components/ui";
import { date, message, shortId } from "../utils";
export default function UploadedLogs() {
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
    <main className="narrow page records-page">
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

      {error && <Alert>{error}</Alert>}
      {!fetched && <p>Press Fetch Logs when online to load uploaded logs.</p>}
      {fetched && !error && !logs.length && (
        <section className="empty-state">
          <h2>No uploaded logs.</h2>
          <p>Commit saved logs in My logs, then upload them from Sync Queue.</p>
        </section>
      )}
      <div className="records-list">
        {logs.map((t) => (
          <article
            className="record-list-card"
            data-testid="uploaded-log"
            key={t.id}
          >
            <div className="record-card-heading">
              <h2>Log #{shortId(t.id)}</h2>
              <Badge>
                {recordStates[t.id] === "SUBMITTED"
                  ? "Final record submitted"
                  : recordStates[t.id] === "DRAFT"
                    ? "Record in progress"
                    : "Ready for record"}
              </Badge>
            </div>
            <div className="record-card-source">
              <div className="record-card-thumbnail">
                {t.photo ? (
                  <img src={t.photo} alt="Uploaded cleanup photo" />
                ) : (
                  <FileText size={28} />
                )}
              </div>
              <div className="record-card-meta">
                <p>
                  <Clock3 size={15} />
                  <span>Captured {date(t.capturedAt)}</span>
                </p>
                <p>
                  <MapPin size={15} />
                  <span>
                    {t.location
                      ? `${t.location.latitude.toFixed(4)}°, ${t.location.longitude.toFixed(4)}°`
                      : "Location not recorded"}
                  </span>
                </p>
              </div>
            </div>
            {t.note.trim() && (
              <div className="record-card-note">
                <span>Cleanup note</span>
                <p>{t.note}</p>
              </div>
            )}
            <div className="record-card-footer">
              <Link
                className={
                  recordStates[t.id] === "SUBMITTED"
                    ? "button secondary"
                    : "button primary"
                }
                to={`/records/${t.id}`}
              >
                {!recordStates[t.id]
                  ? "New Record"
                  : recordStates[t.id] === "DRAFT"
                    ? "Continue Record"
                    : "View Final Record"}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
