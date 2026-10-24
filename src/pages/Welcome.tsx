import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ChevronRight,
  MapPin,
  HardDrive,
  ShieldCheck,
} from "lucide-react";
export default function Welcome() {
  return (
    <main className="welcome page">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow light">
            <span className="live-dot" /> OCEAN FIELD LOG · SDG 14
          </div>
          <h1>
            A cleaner ocean.
            <br />
            One log at a time.
          </h1>
          <p>
            Record what you recover. Keep a traceable record of every cleanup,
            even out at sea.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="button primary">
              Start your field log <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="hero-login">
              Already registered? Sign in <ChevronRight size={16} />
            </Link>
          </div>
        </div>
        <OceanArt />
      </section>
      <div className="welcome-bottom">
        <div>
          <span className="eyebrow">BUILT FOR THE FIELD</span>
          <h2>
            Focus on the cleanup.
            <br />
            Keep the details here.
          </h2>
        </div>
        <Feature
          icon={<MapPin />}
          title="Capture the moment"
          text="Record your location, device time, and photo evidence."
        />
        <Feature
          icon={<HardDrive />}
          title="Keep it on your device"
          text="Save drafts, revisit notes, and continue without a connection."
        />
      </div>
      <div className="prototype-note">
        <ShieldCheck size={17} />
        <p>
          This is a local demo. Accounts and drafts stay in this browser; there
          is no server or upload service. Use a demo password.
        </p>
      </div>
    </main>
  );
}
function OceanArt() {
  return (
    <div className="ocean-art" aria-hidden="true">
      <div className="art-orbit orbit-one" />
      <div className="art-orbit orbit-two" />
      <div className="art-sun" />
      <svg viewBox="0 0 500 380" className="ocean-svg">
        <path d="M-20 180 Q60 100 140 180 T300 180 T460 180 T620 180" />
        <path d="M-20 225 Q60 145 140 225 T300 225 T460 225 T620 225" />
        <path d="M-20 270 Q60 190 140 270 T300 270 T460 270 T620 270" />
      </svg>
      <div className="art-label">
        <span className="live-dot" /> EVERY CLEANUP COUNTS
      </div>
      <div className="art-coordinates">
        13°45′ N &nbsp; 100°30′ E<br />
        <span>LEAVE ONLY A CLEANER SHORE</span>
      </div>
    </div>
  );
}
function Feature({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="feature">
      <span className="feature-icon">{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
