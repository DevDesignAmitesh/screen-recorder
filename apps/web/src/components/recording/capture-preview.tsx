import type { RefObject } from "react";

import { CANVAS_ASPECT } from "@/lib/recording/use-screen-recording";

// The composited canvas + countdown-number overlay. Always mounted (just
// hidden via `hidden`) rather than conditionally rendered — canvasRef.current
// needs to exist before handleStartSetup constructs the Compositor.
//
// Once a recording is stopped, this same frame swaps the (now-frozen,
// nothing-playing) canvas out for a real `<video controls>` playing the
// finished blob back — one frame doing double duty, rather than a static
// canvas plus a second player stacked below it.
export function CapturePreview({
  canvasRef,
  countdown,
  showCountdown,
  hidden,
  playbackUrl,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  countdown: number;
  showCountdown: boolean;
  hidden: boolean;
  /** Object URL of the finished recording — when set, replaces the canvas
   * with a playable `<video>` in this same frame. */
  playbackUrl?: string | null;
}) {
  return (
    <div
      className={`relative w-full overflow-hidden rounded-lg bg-black ${hidden ? "hidden" : ""}`}
      style={{ aspectRatio: CANVAS_ASPECT }}
    >
      <canvas ref={canvasRef} className={`h-full w-full ${playbackUrl ? "hidden" : ""}`} />
      {playbackUrl && <video src={playbackUrl} controls playsInline className="h-full w-full" />}
      {showCountdown && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-6xl font-bold text-white">
          {countdown}
        </div>
      )}
    </div>
  );
}
