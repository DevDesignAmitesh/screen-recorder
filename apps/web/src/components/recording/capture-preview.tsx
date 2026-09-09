import type { RefObject } from "react";

import { FaceFrameTapOverlay } from "@/components/recording/face-frame-tap-overlay";
import type { FaceFrame } from "@/lib/recording/face-frame";
import { CANVAS_ASPECT } from "@/lib/recording/use-screen-recording";

// The composited canvas + countdown-number overlay. Always mounted (just
// hidden via `hidden`) rather than conditionally rendered — canvasRef.current
// needs to exist before the compositor is constructed.
//
// Before a screen is shared this same canvas is the setup preview: the
// chosen wallpaper and a placeholder standing in for the screen (see
// compositor.ts) — no camera is requested this early, so there's no real
// face-cam feed yet either. Passing `faceFrame` + `onFaceFrameChange`
// overlays a "tap to adjust frame" hint over where that face cam will
// sit, opening arrow buttons to nudge its position.
//
// Once a recording is stopped, this frame swaps the (now-frozen,
// nothing-playing) canvas out for a real `<video controls>` playing the
// finished blob back — one frame doing double duty, rather than a static
// canvas plus a second player stacked below it.
export function CapturePreview({
  canvasRef,
  countdown,
  showCountdown,
  hidden,
  playbackUrl,
  faceFrame,
  onFaceFrameChange,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  countdown: number;
  showCountdown: boolean;
  hidden: boolean;
  /** Object URL of the finished recording — when set, replaces the canvas
   * with a playable `<video>` in this same frame. */
  playbackUrl?: string | null;
  /** Pass both to show the tap-to-adjust overlay on the preview; omit
   * either (e.g. while recording) and the preview is display-only. */
  faceFrame?: FaceFrame;
  onFaceFrameChange?: (frame: FaceFrame) => void;
}) {
  const showFaceFrameOverlay = Boolean(faceFrame && onFaceFrameChange && !playbackUrl && !showCountdown);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-lg bg-black ${hidden ? "hidden" : ""}`}
      style={{ aspectRatio: CANVAS_ASPECT }}
    >
      <canvas ref={canvasRef} className={`h-full w-full ${playbackUrl ? "hidden" : ""}`} />
      {playbackUrl && <video src={playbackUrl} controls playsInline className="h-full w-full" />}
      {showFaceFrameOverlay && faceFrame && onFaceFrameChange && (
        <FaceFrameTapOverlay faceFrame={faceFrame} onFaceFrameChange={onFaceFrameChange} />
      )}
      {showCountdown && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-6xl font-bold text-white">
          {countdown}
        </div>
      )}
    </div>
  );
}
