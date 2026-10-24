import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Waves,
  ShieldCheck,
  Check,
  LoaderCircle,
} from "lucide-react";
import { register } from "../model";
import { Alert, Modal } from "../components/ui";
import { message } from "../utils";
export default function Register() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);
  const [terms, setTerms] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const data = new FormData(e.currentTarget);
    const password = String(data.get("password"));
    if (password !== data.get("confirm")) {
      setError("Your passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await register(
        String(data.get("name")),
        String(data.get("email")),
        password,
      );
      setCreated(true);
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
            Account creation is optional.
            <br />
            Create and manage logs without registering.
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
              Your demo account was created on this device. Log creation is
              separate—no sign-in is needed, and your existing drafts are
              unchanged.
            </p>
            <Link className="button primary full" to="/logs/new">
              Create log <ArrowRight size={18} />
            </Link>
            <Link className="text-button" to="/logs">
              View my logs
            </Link>
          </div>
        ) : (
          <>
            <span className="eyebrow">JOIN frAGILE · OPTIONAL</span>
            <h2>Create your account</h2>
            <p className="auth-intro">
              Try demo account creation, or create a cleanup log without an
              account.
            </p>
            {error && <Alert>{error}</Alert>}
            <form onSubmit={submit}>
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
                  aria-describedby="password-hint"
                  type="password"
                  placeholder="At least 8 characters"
                  minLength={8}
                  autoComplete="new-password"
                  required
                />
                <small id="password-hint">
                  Use a demo password, not one you use elsewhere.
                </small>
              </label>
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
              <button className="button primary full" disabled={busy}>
                {busy ? <LoaderCircle className="spin" size={18} /> : null}
                {busy ? "Please wait…" : "Create account"}
                {!busy && <ArrowRight size={18} />}
              </button>
            </form>
            <p className="auth-switch">
              <Link to="/logs/new">
                Create a log without an account{" "}
                <ArrowRight
                  size={14}
                  style={{ display: "inline", verticalAlign: "middle" }}
                />
              </Link>
            </p>
            <p className="auth-disclaimer">
              Prototype only. Account creation does not sign you in or link your
              drafts to an account. All drafts are available to anyone using
              this browser.
            </p>
          </>
        )}
      </section>
      {terms && (
        <Modal title="Demo terms & privacy" onClose={() => setTerms(false)}>
          <p>
            This prototype stores your name, email, and a password verifier in
            this browser. Account creation is optional and separate from your
            device’s cleanup drafts. Nothing is uploaded.
          </p>
          <p>
            Use test details and a unique demo password. Anyone using this
            browser can access its drafts. Clearing browser data removes demo
            accounts and drafts. There is no sign-in service in this phase.
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
