import { MonitorUp } from "lucide-react";

import { FaceFrameControls } from "@/components/recording/face-frame-controls";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { Wallpaper } from "@/lib/api";
import type { FaceFrame } from "@/lib/recording/face-frame";

// The whole "setup" stage: pick a wallpaper, size/round/place the face-cam
// frame, choose whether cam/mic start on, then share a screen. Every
// choice here is reflected live on the preview canvas the page renders
// directly above this panel, so none of it has to be imagined — none of
// it touches the camera or screen, either; that's only ever requested
// once "Choose what to share" below is clicked.
export function CaptureSetupPanel({
  wallpapers,
  wallpapersLoading,
  selectedWallpaperId,
  onSelectWallpaper,
  faceFrame,
  onFaceFrameChange,
  includeWebcam,
  onIncludeWebcamChange,
  includeMic,
  onIncludeMicChange,
  onStartSetup,
}: {
  wallpapers: Wallpaper[];
  wallpapersLoading: boolean;
  selectedWallpaperId: string | null;
  onSelectWallpaper: (id: string) => void;
  faceFrame: FaceFrame;
  onFaceFrameChange: (frame: FaceFrame) => void;
  includeWebcam: boolean;
  onIncludeWebcamChange: (checked: boolean) => void;
  includeMic: boolean;
  onIncludeMicChange: (checked: boolean) => void;
  onStartSetup: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium">Wallpaper</p>
        {wallpapersLoading ? (
          <div className="flex justify-center py-8">
            <Spinner className="h-5 w-5 text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {wallpapers.map((wallpaper) => (
              <button
                key={wallpaper.id}
                type="button"
                onClick={() => onSelectWallpaper(wallpaper.id)}
                className={`relative aspect-video rounded-lg bg-cover bg-center ring-2 ring-offset-2 ring-offset-background transition ${
                  selectedWallpaperId === wallpaper.id ? "ring-primary" : "ring-transparent hover:ring-border"
                }`}
                style={{ backgroundImage: `url(${wallpaper.url})` }}
                aria-label={wallpaper.name}
                aria-pressed={selectedWallpaperId === wallpaper.id}
              >
                {selectedWallpaperId === wallpaper.id && (
                  <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <FaceFrameControls faceFrame={faceFrame} onFaceFrameChange={onFaceFrameChange} disabled={!includeWebcam} />

      <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeWebcam}
            onChange={(e) => onIncludeWebcamChange(e.target.checked)}
            className="accent-primary"
          />
          Start with face cam on
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeMic}
            onChange={(e) => onIncludeMicChange(e.target.checked)}
            className="accent-primary"
          />
          Start with microphone on
        </label>
      </div>

      <div className="space-y-2">
        <Button type="button" onClick={onStartSetup} className="w-full sm:w-auto">
          <MonitorUp className="h-4 w-4" />
          Choose what to share
        </Button>
        <p className="text-xs text-muted-foreground">
          Tip: share a different window, or your whole screen — not this browser tab — to avoid an infinite mirror
          effect (this tab showing itself, recursively).
        </p>
      </div>
    </div>
  );
}
