import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Waves } from "lucide-react";
import { Brand } from "./components/ui";
import Welcome from "./pages/Welcome";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import RecordEditor from "./pages/RecordEditor";
import UploadedLogs from "./pages/UploadedLogs";
import SyncQueue from "./pages/SyncQueue";
import Editor, { EditorRoute } from "./pages/Editor";
export default function App() {
  const [online, setOnline] = useState(navigator.onLine);
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  useEffect(() => {
    const change = () => setOnline(navigator.onLine);
    window.addEventListener("online", change);
    window.addEventListener("offline", change);
    return () => {
      window.removeEventListener("online", change);
      window.removeEventListener("offline", change);
    };
  }, []);
  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <Brand />
          <div
            data-testid="connectivity"
            className={`workflow-status ${online ? "connected" : "disconnected"}`}
            role="status"
          >
            {online ? "Online" : "Offline"}
          </div>
          <nav aria-label="Main navigation">
            {[
              {
                to: "/logs",
                label: "My logs",
                active: location.pathname.startsWith("/logs"),
              },
              {
                to: "/sync",
                label: "Sync queue",
                active: location.pathname === "/sync",
              },
              {
                to: "/uploaded",
                label: "Records",
                active:
                  location.pathname === "/uploaded" ||
                  location.pathname.startsWith("/records"),
              },
              {
                to: "/register",
                label: "Create account",
                active: location.pathname === "/register",
              },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                aria-current={item.active ? "page" : undefined}
                className={item.active ? "nav-active" : ""}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <Routes>
        <Route path="/sync" element={<SyncQueue />} />
        <Route path="/uploaded" element={<UploadedLogs />} />
        <Route path="/pending" element={<Navigate to="/uploaded" replace />} />
        <Route
          path="/records/new"
          element={<Navigate to="/uploaded" replace />}
        />
        <Route path="/records/:id" element={<RecordEditor />} />
        <Route path="/" element={<Welcome />} />
        <Route path="/register" element={<Register />} />
        <Route path="/logs" element={<Dashboard />} />
        <Route path="/logs/new" element={<Editor key="new" />} />
        <Route path="/logs/:id" element={<EditorRoute />} />
        <Route
          path="*"
          element={
            <main className="narrow page">
              <h1>Page not found</h1>
              <p>Let’s get you back to your field logs.</p>
              <Link className="button primary" to="/logs">
                Back to my logs
              </Link>
            </main>
          }
        />
      </Routes>
      <div id="notifications" aria-label="Notifications" />
      <footer className="site-footer">
        <span>
          <Waves size={16} /> Small actions. Cleaner oceans.
        </span>
        <span>
          Sprint 2 prototype <span className="footer-dot">·</span> Stored on
          this device
        </span>
      </footer>
    </div>
  );
}
