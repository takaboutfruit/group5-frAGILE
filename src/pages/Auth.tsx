import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Waves,
  ShieldCheck,
  Check,
  LoaderCircle,
} from "lucide-react";
import type { User } from "../model";
import { register, login } from "../model";
import { Alert, Modal } from "../components/ui";
import { message } from "../utils";
export default function Auth({
  mode,
  onLogin,
}: {
  mode: "register" | "login";
  onLogin: (user: User) => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);
  const [terms, setTerms] = useState(false);
  const navigate = useNavigate();
  const signup = mode === "register";
  useEffect(() => {
    setError("");
    setCreated(false);
  }, [mode]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const data = new FormData(e.currentTarget);
    const password = String(data.get("password"));
    if (signup && password !== data.get("confirm")) {
      setError("Your passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      if (signup) {
        await register(
          String(data.get("name")),
          String(data.get("email")),
          password,
        );
        setCreated(true);
      } else {
        onLogin(await login(String(data.get("email")), password));
        navigate("/");
      }
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-layout page">
      <section className="auth-story">
        <div className="eyebrow">YOUR OCEAN FIELD COMPANION</div>
        <h1>
          Make your
          <br />
          cleanup count.
        </h1>
        <p>
          A location. A photo. A few words.
          <br />A record of the difference you made.
        </p>
        <div className="auth-wave">
          <Waves size={120} strokeWidth={0.8} />
        </div>
        <div className="auth-story-bottom">
          <ShieldCheck size={20} />
          <span>
            Local demo accounts.
            <br />
            Your records stay on this device.
          </span>
        </div>
      </section>
      <section className="auth-card">
        {created ? (
          <div className="auth-success">
            <span className="large-check">
              <Check size={32} />
            </span>
            <span className="eyebrow">YOU’RE ALL SET</span>
            <h2>Welcome aboard.</h2>
            <p>
              Your demo account was created on this device. Sign in to start
              your first cleanup log.
            </p>
            <Link className="button primary full" to="/login">
              Sign in <ArrowRight size={18} />
            </Link>
          </div>
        ) : (
          <>
            <span className="eyebrow">
              {signup ? "JOIN frAGILE" : "WELCOME BACK"}
            </span>
            <h2>{signup ? "Create your account" : "Sign in to frAGILE"}</h2>
            <p className="auth-intro">
              {signup
                ? "Start keeping a record of your ocean cleanups."
                : "Your next cleanup starts with a field log."}
            </p>
            {error && <Alert>{error}</Alert>}
            <form onSubmit={submit} key={mode}>
              {signup && (
                <label>
                  Full name
                  <input
                    name="name"
                    placeholder="e.g. Maya Chen"
                    autoComplete="name"
                    required
                    maxLength={100}
                  />
                </label>
              )}
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  maxLength={254}
                />
              </label>
              <label>
                Password
                <input
                  name="password"
                  aria-label="Password"
                  aria-describedby={signup ? "password-hint" : undefined}
                  type="password"
                  placeholder={
                    signup ? "At least 8 characters" : "Your demo password"
                  }
                  minLength={signup ? 8 : undefined}
                  autoComplete={signup ? "new-password" : "current-password"}
                  required
                />
                {signup && (
                  <small id="password-hint">
                    Use a demo password, not one you use elsewhere.
                  </small>
                )}
              </label>
              {signup && (
                <>
                  <label>
                    Confirm password
                    <input
                      name="confirm"
                      type="password"
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                      required
                    />
                  </label>
                  <label className="checkbox-label">
                    <input name="terms" type="checkbox" required />
                    <span>
                      I agree to the{" "}
                      <button
                        type="button"
                        className="inline-link"
                        onClick={() => setTerms(true)}
                      >
                        demo terms & privacy notice
                      </button>
                      .
                    </span>
                  </label>
                </>
              )}
              <button className="button primary full" disabled={busy}>
                {busy ? <LoaderCircle className="spin" size={18} /> : null}
                {busy ? "Please wait…" : signup ? "Create account" : "Sign in"}
                {!busy && <ArrowRight size={18} />}
              </button>
            </form>
            <p className="auth-switch">
              {signup ? "Already have an account?" : "New to frAGILE?"}{" "}
              <Link to={signup ? "/login" : "/register"}>
                {signup ? "Sign in" : "Create an account"}
              </Link>
            </p>
            <p className="auth-disclaimer">
              Prototype only. Data is stored in this browser and is not backed
              up or protected by server authentication.
            </p>
          </>
        )}
      </section>
      {terms && (
        <Modal title="Demo terms & privacy" onClose={() => setTerms(false)}>
          <p>
            This prototype stores your name, email, a password verifier, and
            cleanup drafts in this browser. Nothing is uploaded. Anyone with
            access to browser storage may access or modify this data.
          </p>
          <p>
            Use test details and a unique demo password. Clearing browser data
            permanently removes your account and drafts. This demo is not
            intended for sensitive or operational records.
          </p>
          <button
            className="button primary full"
            onClick={() => setTerms(false)}
          >
            Understood
          </button>
        </Modal>
      )}
    </main>
  );
}
