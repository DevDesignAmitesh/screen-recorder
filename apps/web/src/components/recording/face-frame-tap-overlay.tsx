"use client";

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, X } from "lucide-react";
import { useState, type CSSProperties, type ReactNode } from "react";

import { faceFrameRadius, faceFrameRect, nudgeFaceFrame, type FaceFrame } from "@/lib/recording/face-frame";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/lib/recording/use-screen-recording";

// Sits directly over the preview canvas, exactly on top of where the
// compositor draws the face frame — at the frame's own width/height the
// whole time, both before and after it's tapped, so selecting it to
// adjust never makes it look like the frame itself just shrank. There's
// no dragging: tapping opens arrow buttons, pinned to the frame's own
// edges, that nudge its position a few percent per tap (see
// FACE_FRAME_NUDGE_STEP in face-frame.ts).
//
// The canvas is always rendered at the full 16:9 aspect of the render
// canvas, so its on-screen box is a uniform scale of the 1920x1080 one —
// which means a position expressed as a *fraction* of the element's box
// is already in FaceFrame's own coordinate space, with no need to know
// how big the preview happens to be rendered.

type EdgePosition = "top" | "bottom" | "left" | "right" | "center";

// Each button sits centred on the midpoint of that edge (or the middle,
// for the close button) — translate(-50%, -50%) is what lets a
// fixed-size round button hang half on/half off the frame's own
// boundary regardless of how big or small that boundary is.
const EDGE_STYLE: Record<EdgePosition, CSSProperties> = {
  top: { left: "50%", top: "0%" },
  bottom: { left: "50%", top: "100%" },
  left: { left: "0%", top: "50%" },
  right: { left: "100%", top: "50%" },
  center: { left: "50%", top: "50%" },
};

export function FaceFrameTapOverlay({
  faceFrame,
  onFaceFrameChange,
}: {
  faceFrame: FaceFrame;
  onFaceFrameChange: (frame: FaceFrame) => void;
}) {
  const [adjusting, setAdjusting] = useState(false);

  const rect = faceFrameRect(faceFrame, CANVAS_WIDTH, CANVAS_HEIGHT);
  const radius = faceFrameRadius(faceFrame, rect);
  // Percentages resolve against the element's own width/height, which
  // differ for a non-square frame — give the two axes separate values
  // rather than one shorthand, which would skew the corners.
  const borderRadius = `${(radius / rect.w) * 100}% / ${(radius / rect.h) * 100}%`;

  // Both the tap hint and the adjust-mode controls are positioned at
  // exactly this box — the frame's real width/height — never a
  // separately-sized popover.
  const frameStyle: CSSProperties = {
    left: `${(rect.x / CANVAS_WIDTH) * 100}%`,
    top: `${(rect.y / CANVAS_HEIGHT) * 100}%`,
    width: `${(rect.w / CANVAS_WIDTH) * 100}%`,
    height: `${(rect.h / CANVAS_HEIGHT) * 100}%`,
  };

  function nudge(direction: Parameters<typeof nudgeFaceFrame>[1]) {
    onFaceFrameChange(nudgeFaceFrame(faceFrame, direction));
  }

  if (!adjusting) {
    return (
      <button
        type="button"
        onClick={() => setAdjusting(true)}
        aria-label="Tap to adjust the face cam frame's position"
        className="absolute flex items-center justify-center bg-black/35 px-1 text-center text-[11px] font-medium leading-tight text-white transition-colors hover:bg-black/45"
        style={{ ...frameStyle, borderRadius }}
      >
        Tap to adjust frame
      </button>
    );
  }

  return (
    <div className="absolute z-10" style={frameStyle}>
      {/* Marks the selected frame at its real size — the buttons below
          are what moves it, this is just the "you're editing this"
          outline. */}
      <div
        className="pointer-events-none absolute inset-0 border-2 border-dashed border-white/80"
        style={{ borderRadius }}
      />

      <EdgeButton position="top" label="Move up" onClick={() => nudge("up")}>
        <ArrowUp className="h-4 w-4" />
      </EdgeButton>
      <EdgeButton position="bottom" label="Move down" onClick={() => nudge("down")}>
        <ArrowDown className="h-4 w-4" />
      </EdgeButton>
      <EdgeButton position="left" label="Move left" onClick={() => nudge("left")}>
        <ArrowLeft className="h-4 w-4" />
      </EdgeButton>
      <EdgeButton position="right" label="Move right" onClick={() => nudge("right")}>
        <ArrowRight className="h-4 w-4" />
      </EdgeButton>
      <EdgeButton position="center" label="Done adjusting" onClick={() => setAdjusting(false)} variant="close">
        <X className="h-4 w-4" />
      </EdgeButton>
    </div>
  );
}

function EdgeButton({
  position,
  label,
  onClick,
  children,
  variant = "default",
}: {
  position: EdgePosition;
  label: string;
  onClick: () => void;
  children: ReactNode;
  variant?: "default" | "close";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-white shadow-lg backdrop-blur-sm transition-colors ${
        variant === "close" ? "bg-black/80 hover:bg-black/90" : "bg-black/70 hover:bg-black/85"
      }`}
      style={EDGE_STYLE[position]}
    >
      {children}
    </button>
  );
}
