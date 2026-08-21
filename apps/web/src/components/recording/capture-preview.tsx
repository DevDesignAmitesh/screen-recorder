import type { RefObject } from "react";

import { CANVAS_ASPECT } from "@/lib/recording/use-screen-recording";

// The composited canvas + countdown-number overlay. Always mounted (just
// hidden via `hidden`) rather than conditionally rendered — canvasRef.current
// needs to exist before handleStartSetup constructs the Compositor.
export function CapturePreview({
  canvasRef,
  countdown,
  showCountdown,
  hidden,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  countdown: number;
  showCountdown: boolean;
  hidden: boolean;
}) {
  return (
    <div
      className={`relative w-full overflow-hidden rounded-lg bg-black ${hidden ? "hidden" : ""}`}
      style={{ aspectRatio: CANVAS_ASPECT }}
    >
      <canvas ref={canvasRef} className="h-full w-full" />
      {showCountdown && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-6xl font-bold text-white">
          {countdown}
        </div>
      )}
    </div>
  );
}
