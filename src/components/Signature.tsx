import { useEffect, useRef } from "react";
import type { PointerEvent } from "react";
export default function Signature({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  useEffect(() => {
    const el = canvas.current!;
    const ctx = el.getContext("2d")!;
    ctx.clearRect(0, 0, el.width, el.height);
    if (value) {
      const im = new Image();
      let active = true;
      im.onload = () => {
        if (active) ctx.drawImage(im, 0, 0, el.width, el.height);
      };
      im.src = value;
      return () => {
        active = false;
      };
    }
  }, [value]);
  function point(e: PointerEvent<HTMLCanvasElement>) {
    const el = e.currentTarget,
      b = el.getBoundingClientRect();
    return [
      ((e.clientX - b.left) * el.width) / b.width,
      ((e.clientY - b.top) * el.height) / b.height,
    ];
  }
  function start(e: PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = el.getContext("2d")!;
    const [x, y] = point(e);
    ctx.strokeStyle = "#103e55";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
  }
  function move(e: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = e.currentTarget.getContext("2d")!;
    ctx.lineTo(...(point(e) as [number, number]));
    ctx.stroke();
  }
  function finish() {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(canvas.current!.toDataURL("image/png"));
  }
  return (
    <div className="signature-field">
      <canvas
        ref={canvas}
        width={640}
        height={200}
        aria-label="Draw signature"
        role="img"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerCancel={finish}
      />
      <p className="small muted">
        Draw with your mouse, finger or pen.{" "}
        {value ? "Signature captured." : "Signature required."}
      </p>
      <button
        type="button"
        className="button secondary"
        disabled={disabled || !value}
        onClick={() => onChange("")}
      >
        Clear Signature
      </button>
    </div>
  );
}
