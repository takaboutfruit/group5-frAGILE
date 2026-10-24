import { useEffect, useState } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { FileText, UserPlus, Waves, WifiOff } from "lucide-react";
import { Brand } from "./components/ui";
import Welcome from "./pages/Welcome";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Editor, { EditorRoute } from "./pages/Editor";
export default function App() {
  const [online, setOnline] = useState(navigator.onLine);
  const location = useLocation();
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
          <nav aria-label="Main navigation">
            <Link
              to="/logs"
              className={location.pathname === "/logs" ? "nav-active" : ""}
            >
              <FileText size={17} /> My logs
            </Link>
            <Link
              to="/register"
              className={location.pathname === "/register" ? "nav-active" : ""}
            >
              <UserPlus size={17} /> Create account
            </Link>
          </nav>
        </div>
      </header>
      {!online && (
        <div className="offline-strip">
          <WifiOff size={15} /> You’re offline. You can keep creating logs and
          editing drafts on this device.
        </div>
      )}
      <Routes>
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
      <footer className="site-footer">
        <span>
          <Waves size={16} /> Small actions. Cleaner oceans.
        </span>
        <span>
          Sprint 1 prototype <span className="footer-dot">·</span> Stored on
          this device
        </span>
      </footer>
    </div>
  );
}
