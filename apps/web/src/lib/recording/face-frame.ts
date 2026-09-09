// The face-cam overlay's geometry — width, height, corner rounding, and
// position — shared by the compositor (which draws it onto the recorded
// canvas) and the UI (the size/rounding sliders + the tap-to-adjust
// overlay on the preview).
//
// Everything here is stored as *fractions* of the canvas rather than
// pixels, so a frame configured against the on-screen preview lands in
// exactly the same spot on the 1920x1080 render canvas regardless of how
// big the preview happens to be rendered.

export interface FaceFrame {
  /** Width, as a fraction of the canvas's own width (0-1). */
  width: number;
  /** Height, as a fraction of the canvas's own height (0-1). */
  height: number;
  /** Corner rounding: 0 is a sharp rectangle, 1 rounds each corner by
   * half the frame's shorter side — a circle when width and height
   * happen to render to the same pixel size, a capsule/pill otherwise. */
  borderRadius: number;
  /** Centre of the frame, as fractions of canvas width/height (0-1). */
  x: number;
  y: number;
}

// Wide open on purpose — the width/height controls are free-typed number
// inputs, not sliders, so these only guard against a degenerate (zero,
// negative, or bigger-than-the-canvas) frame rather than steering the
// user toward some "normal" range.
export const FACE_FRAME_MIN_WIDTH = 0.01;
export const FACE_FRAME_MAX_WIDTH = 1;
export const FACE_FRAME_MIN_HEIGHT = 0.01;
export const FACE_FRAME_MAX_HEIGHT = 1;

/** How far one nudge-button tap moves the frame, as a fraction of the
 * canvas's own width/height — i.e. the same units as x/y. */
export const FACE_FRAME_NUDGE_STEP = 0.025;

// Matches what the overlay used to be hardcoded to before it became
// configurable: a 220px circle inset 48px from the bottom-right of a
// 1920x1080 canvas.
export const DEFAULT_FACE_FRAME: FaceFrame = {
  width: 220 / 1920,
  height: 220 / 1080,
  borderRadius: 1,
  x: (1920 - 48 - 110) / 1920,
  y: (1080 - 48 - 110) / 1080,
};

export interface FrameRect {
  /** Left edge, in canvas pixels. */
  x: number;
  /** Top edge, in canvas pixels. */
  y: number;
  w: number;
  h: number;
}

function clampWidth(width: number): number {
  return Math.min(FACE_FRAME_MAX_WIDTH, Math.max(FACE_FRAME_MIN_WIDTH, width));
}

function clampHeight(height: number): number {
  return Math.min(FACE_FRAME_MAX_HEIGHT, Math.max(FACE_FRAME_MIN_HEIGHT, height));
}

function clampBorderRadius(radius: number): number {
  return Math.min(1, Math.max(0, radius));
}

/** The frame's box in canvas pixels, given the canvas's real dimensions. */
export function faceFrameRect(frame: FaceFrame, canvasWidth: number, canvasHeight: number): FrameRect {
  const w = canvasWidth * clampWidth(frame.width);
  const h = canvasHeight * clampHeight(frame.height);
  return { x: canvasWidth * frame.x - w / 2, y: canvasHeight * frame.y - h / 2, w, h };
}

/** Corner radius in canvas px — 0 is a sharp rectangle, and half the
 * shorter side (a full stadium/circle shape) at borderRadius 1. */
export function faceFrameRadius(frame: FaceFrame, rect: FrameRect): number {
  return (Math.min(rect.w, rect.h) / 2) * clampBorderRadius(frame.borderRadius);
}

/** Keeps the frame's centre far enough from the edges that the whole
 * frame stays on canvas, and every field within its valid range. Because
 * width/height are already fractions of the canvas's own width/height,
 * half of each lines up directly with x/y's units — no aspect-ratio
 * conversion needed. */
export function clampFaceFramePosition(frame: FaceFrame): FaceFrame {
  const width = clampWidth(frame.width);
  const height = clampHeight(frame.height);
  const halfX = width / 2;
  const halfY = height / 2;
  return {
    width,
    height,
    borderRadius: clampBorderRadius(frame.borderRadius),
    x: Math.min(1 - halfX, Math.max(halfX, frame.x)),
    y: Math.min(1 - halfY, Math.max(halfY, frame.y)),
  };
}

export type FaceFrameNudgeDirection = "up" | "down" | "left" | "right";

const NUDGE_DELTAS: Record<FaceFrameNudgeDirection, { x: number; y: number }> = {
  up: { x: 0, y: -FACE_FRAME_NUDGE_STEP },
  down: { x: 0, y: FACE_FRAME_NUDGE_STEP },
  left: { x: -FACE_FRAME_NUDGE_STEP, y: 0 },
  right: { x: FACE_FRAME_NUDGE_STEP, y: 0 },
};

/** Moves the frame one step (see FACE_FRAME_NUDGE_STEP) in a direction,
 * clamped back onto the canvas — the only way to reposition the frame,
 * used by the "tap to adjust" overlay's arrow buttons. */
export function nudgeFaceFrame(frame: FaceFrame, direction: FaceFrameNudgeDirection): FaceFrame {
  const delta = NUDGE_DELTAS[direction];
  return clampFaceFramePosition({ ...frame, x: frame.x + delta.x, y: frame.y + delta.y });
}

const STORAGE_KEY = "screensy:face-frame";

/** Reads the last-used frame back out of localStorage. Returns the
 * default for a first-time visitor, and for anything stored that doesn't
 * still parse as a valid frame (older/corrupt values). */
export function loadFaceFrame(): FaceFrame {
  if (typeof window === "undefined") return DEFAULT_FACE_FRAME;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FACE_FRAME;
    const parsed = JSON.parse(raw) as Partial<FaceFrame>;
    if (!parsed || typeof parsed !== "object") return DEFAULT_FACE_FRAME;
    const { width, height, borderRadius, x, y } = parsed;
    if (
      typeof width !== "number" ||
      typeof height !== "number" ||
      typeof borderRadius !== "number" ||
      typeof x !== "number" ||
      typeof y !== "number"
    ) {
      // Covers older stored shapes (shape/size) too — they just fail this
      // check and fall back to the default rather than needing a migration.
      return DEFAULT_FACE_FRAME;
    }
    if (![width, height, borderRadius, x, y].every(Number.isFinite)) return DEFAULT_FACE_FRAME;
    return { width: clampWidth(width), height: clampHeight(height), borderRadius: clampBorderRadius(borderRadius), x, y };
  } catch {
    // Private-mode / disabled storage — not worth failing over.
    return DEFAULT_FACE_FRAME;
  }
}

export function saveFaceFrame(frame: FaceFrame): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(frame));
  } catch {
    // Same as above — storage being unavailable just means it won't stick.
  }
}
