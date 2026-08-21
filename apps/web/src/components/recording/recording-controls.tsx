import { Circle, Mic, MicOff, Pause, Play, Square, Video, VideoOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import type { Stage } from "@/lib/recording/use-screen-recording";

// Elapsed timer + the Google-Meet-style camera/mic/pause/resume/stop
// icon-button cluster + the "Start recording" CTA. Shown across
// live/recording/paused — shared between /record and /try, which differ
// only in whether there's a cap to show next to the timer.
export function RecordingControls({
  stage,
  elapsedSeconds,
  maxSeconds,
  camAvailable,
  camOn,
  onToggleCam,
  micAvailable,
  micOn,
  onToggleMic,
  onPause,
  onResume,
  onStop,
  onBeginCountdown,
}: {
  stage: Stage;
  elapsedSeconds: number;
  /** Shown as "/ Ns" next to the timer — omit for no cap. */
  maxSeconds?: number;
  camAvailable: boolean;
  camOn: boolean;
  onToggleCam: () => void;
  micAvailable: boolean;
  micOn: boolean;
  onToggleMic: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onBeginCountdown: () => void;
}) {
  const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, "0");
  const seconds = String(elapsedSeconds % 60).padStart(2, "0");

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {(stage === "recording" || stage === "paused") && (
        <span className="flex items-center gap-2 font-mono text-lg">
          {stage === "recording" && <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />}
          {minutes}:{seconds}
          {maxSeconds !== undefined && (
            <span className="text-sm font-normal text-muted-foreground">/ {maxSeconds}s</span>
          )}
        </span>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          {camAvailable && (
            <IconButton label={camOn ? "Turn camera off" : "Turn camera on"} onClick={onToggleCam}>
              {camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </IconButton>
          )}
          {micAvailable && (
            <IconButton label={micOn ? "Mute mic" : "Unmute mic"} onClick={onToggleMic}>
              {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </IconButton>
          )}
          {stage === "recording" && (
            <IconButton label="Pause recording" onClick={onPause}>
              <Pause className="h-5 w-5" />
            </IconButton>
          )}
          {stage === "paused" && (
            <IconButton label="Resume recording" onClick={onResume}>
              <Play className="h-5 w-5" />
            </IconButton>
          )}
          {(stage === "recording" || stage === "paused") && (
            <IconButton label="Stop recording" variant="destructive" onClick={onStop}>
              <Square className="h-5 w-5" />
            </IconButton>
          )}
        </div>

        {stage === "live" && (
          <Button type="button" onClick={onBeginCountdown} className="w-full sm:w-auto">
            <Circle className="h-4 w-4 fill-current" />
            Start recording
          </Button>
        )}
      </div>
    </div>
  );
}
