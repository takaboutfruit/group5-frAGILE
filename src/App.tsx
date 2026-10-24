import { useEffect, useState } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { ArrowRight, FileText, LogOut, Waves, WifiOff } from "lucide-react";
import type { User } from "./model";
import { currentUser, logout } from "./model";
import { Alert, Brand } from "./components/ui";
import { message } from "./utils";
import Welcome from "./pages/Welcome";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Editor, { EditorRoute } from "./pages/Editor";
export default function App() {
  const [initial] = useState(() => {
    try {
      return { user: currentUser(), error: "" };
    } catch (e) {
      return { user: null, error: message(e) };
    }
  });
  const [user, setUser] = useState<User | null>(initial.user);
  const [error, setError] = useState(initial.error);
  const [online, setOnline] = useState(navigator.onLine);
  const navigate = useNavigate();
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
  async function signout() {
    try {
      logout();
      setUser(null);
      navigate("/login");
    } catch (e) {
      setError(message(e));
    }
  }
  const isEditor = location.pathname.startsWith("/logs/");
  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <Brand />
          <nav aria-label="Main navigation">
            {user ? (
              <>
                <Link to="/" className={!isEditor ? "nav-active" : ""}>
                  <FileText size={17} /> My logs
                </Link>
                {!isEditor && (
                  <button className="nav-signout" onClick={signout}>
                    <LogOut size={16} />
                    <span>Sign out</span>
                  </button>
                )}
                <span className="avatar" title={user.name}>
                  {user.name.slice(0, 1).toUpperCase()}
                </span>
              </>
            ) : (
              <Link
                to={location.pathname === "/login" ? "/register" : "/login"}
              >
                {location.pathname === "/login"
                  ? "Create an account"
                  : "Sign in"}
                <ArrowRight size={16} />
              </Link>
            )}
          </nav>
        </div>
      </header>
      {error && (
        <div className="global-alert">
          <Alert>{error}</Alert>
          <button className="text-button" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      )}
      {!online && (
        <div className="offline-strip">
          <WifiOff size={15} /> You’re offline. You can keep working with your
          saved account and drafts.
        </div>
      )}
      <Routes>
        <Route
          path="/register"
          element={
            user ? (
              <Navigate to="/" replace />
            ) : (
              <Auth mode="register" onLogin={setUser} />
            )
          }
        />
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to="/" replace />
            ) : (
              <Auth mode="login" onLogin={setUser} />
            )
          }
        />
        <Route
          path="/"
          element={user ? <Dashboard user={user} /> : <Welcome />}
        />
        <Route
          path="/logs/new"
          element={
            user ? (
              <Editor key="new" user={user} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/logs/:id"
          element={
            user ? (
              <EditorRoute user={user} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="*"
          element={
            <main className="narrow page">
              <h1>Page not found</h1>
              <p>Let’s get you back to your field logs.</p>
              <Link className="button primary" to="/">
                Back to home
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
