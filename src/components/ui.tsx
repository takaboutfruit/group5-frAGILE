import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Waves, CheckCircle2, TriangleAlert, X } from "lucide-react";
export function Alert({
  children,
  success = false,
}: {
  children: ReactNode;
  success?: boolean;
}) {
  return (
    <div
      className={`notice ${success ? "success" : "warning"}`}
      role={success ? "status" : "alert"}
    >
      {success ? <CheckCircle2 size={20} /> : <TriangleAlert size={20} />}
      <div>{children}</div>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current!;
    el.showModal();
    return () => {
      el.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="modal-title"
      className="modal"
    >
      <button
        className="icon-button modal-close"
        aria-label="Close dialog"
        onClick={onClose}
      >
        <X size={20} />
      </button>
      <div className="modal-symbol">
        <TriangleAlert size={26} />
      </div>
      <h2 id="modal-title">{title}</h2>
      {children}
    </dialog>
  );
}
export function Badge({ children }: { children: ReactNode }) {
  return <span className="badge">{children}</span>;
}
export function Brand() {
  return (
    <Link to="/" className="brand">
      <span className="brand-icon">
        <Waves size={24} />
      </span>
      <span>
        fr<span className="brand-light">AGILE</span>
        <small>OCEAN PLASTIC RECOVERY</small>
      </span>
    </Link>
  );
}
