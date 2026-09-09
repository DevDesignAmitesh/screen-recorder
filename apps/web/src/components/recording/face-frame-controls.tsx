"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";

import { DEFAULT_FACE_FRAME, type FaceFrame } from "@/lib/recording/face-frame";

// Width / height / corner-rounding controls for the face-cam overlay.
// Every change lands on the live preview canvas immediately (the
// compositor redraws from the same FaceFrame). Moving the frame around is
// a separate interaction — tap it on the preview above and use the arrow
// buttons that appear (see FaceFrameTapOverlay) — not handled here.
//
// Width/height are free-typed numbers rather than sliders — face-frame.ts
// only clamps them against a degenerate (zero/negative/bigger-than-canvas)
// frame, not toward some "normal" range, so any reasonable size can be
// typed directly instead of hunting for it along a fixed slider track.
export function FaceFrameControls({
  faceFrame,
  onFaceFrameChange,
  disabled = false,
}: {
  faceFrame: FaceFrame;
  onFaceFrameChange: (frame: FaceFrame) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-4 rounded-[1.75rem] border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Face cam frame</p>
        <button
          type="button"
          onClick={() => onFaceFrameChange(DEFAULT_FACE_FRAME)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      </div>

      {disabled && <p className="text-xs text-muted-foreground">Turn the face cam on to customize it.</p>}

      <div className={disabled ? "pointer-events-none space-y-4 opacity-50" : "space-y-4"}>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <FramePercentInput
            label="Width"
            value={faceFrame.width}
            onChange={(width) => onFaceFrameChange({ ...faceFrame, width })}
          />
          <FramePercentInput
            label="Height"
            value={faceFrame.height}
            onChange={(height) => onFaceFrameChange({ ...faceFrame, height })}
          />
        </div>

        <label className="flex items-center gap-3 text-sm">
          <span className="w-14 shrink-0 text-muted-foreground">Corners</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={faceFrame.borderRadius}
            onChange={(e) => onFaceFrameChange({ ...faceFrame, borderRadius: Number(e.target.value) })}
            className="flex-1 accent-primary"
            aria-label="Face cam frame corner rounding"
          />
          <span className="w-10 shrink-0 text-right font-mono text-xs text-muted-foreground">
            {Math.round(faceFrame.borderRadius * 100)}%
          </span>
        </label>

        <p className="text-xs text-muted-foreground">
          To move it, tap the frame on the preview above and use the arrows that appear.
        </p>
      </div>
    </div>
  );
}

/** A free-typed number field for a width/height fraction, shown and
 * entered as a percentage of the canvas. Kept as its own local text state
 * (rather than deriving straight from the numeric prop) so a value being
 * mid-typed — an empty field, a trailing "." — doesn't get stomped by a
 * re-render before the user's finished.
 *
 * Resyncing to the canonical (possibly clamped) value when it changes
 * from outside — the Reset button — is done during render rather than in
 * an effect: React's own "adjusting state when a prop changes" pattern,
 * comparing against a `lastValue` snapshotted from the previous render.
 * It's skipped while the field is focused, so live typing (which flows
 * straight through to the prop on every valid keystroke) doesn't fight
 * itself; blurring resyncs explicitly instead. */
function FramePercentInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const [text, setText] = useState(() => String(Math.round(value * 100)));
  const [lastValue, setLastValue] = useState(value);
  const [focused, setFocused] = useState(false);

  if (value !== lastValue && !focused) {
    setLastValue(value);
    setText(String(Math.round(value * 100)));
  }

  function handleChange(raw: string) {
    setText(raw);
    const parsed = Number(raw);
    if (raw.trim() !== "" && Number.isFinite(parsed)) onChange(parsed / 100);
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={text}
        onFocus={() => setFocused(true)}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => {
          setFocused(false);
          setText(String(Math.round(value * 100)));
          setLastValue(value);
        }}
        className="w-20 rounded-md border border-border bg-background px-2 py-1.5 text-right tabular-nums"
        aria-label={`Face cam frame ${label.toLowerCase()}, percent of canvas`}
      />
      <span className="text-muted-foreground">%</span>
    </label>
  );
}
