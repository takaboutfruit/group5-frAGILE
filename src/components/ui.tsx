import { useEffect, useRef, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Waves, CheckCircle2, TriangleAlert, X } from "lucide-react";
export function Alert({
  children,
  success = false,
  inline = false,
  onDismiss,
}: {
  children: ReactNode;
  success?: boolean;
  inline?: boolean;
  onDismiss?: () => void;
}) {
  const anchor = useRef<HTMLSpanElement>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [inDialog, setInDialog] = useState(false);
  const [visible, setVisible] = useState(true);
  useLayoutEffect(() => {
    setInDialog(!!anchor.current?.closest("dialog"));
    setTarget(document.getElementById("notifications"));
  }, []);
  useEffect(() => {
    setVisible(true);
  }, [children]);
  useEffect(() => {
    if (inDialog && visible)
      anchor.current?.nextElementSibling?.scrollIntoView({ block: "nearest" });
  }, [inDialog, visible, children]);
  const notice = visible ? (
    <div
      className={`notice ${success ? "success" : "warning"} ${inline || inDialog ? "" : "toast-notice"}`}
      role={success ? "status" : "alert"}
    >
      {success ? <CheckCircle2 size={20} /> : <TriangleAlert size={20} />}
      <div>{children}</div>
      {!inline && (
        <button
          aria-label="Dismiss notification"
          className="icon-button"
          onClick={() => {
            setVisible(false);
            onDismiss?.();
          }}
        >
          <X size={18} />
        </button>
      )}
    </div>
  ) : null;
  return (
    <>
      <span ref={anchor} hidden />
      {inline || inDialog
        ? notice
        : target
          ? createPortal(notice, target)
          : null}
    </>
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
    <Link to="/logs" className="brand">
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

export function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="field-error">
      {message}
    </p>
  ) : null;
}
