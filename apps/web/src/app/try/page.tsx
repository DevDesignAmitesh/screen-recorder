"use client";

import {
  ArrowLeft,
  Circle,
  Mic,
  MicOff,
  MonitorUp,
  Pause,
  Play,
  RotateCcw,
  Square,
  Video,
  VideoOff,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { SiteHeader } from "@/components/site-header";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Spinner } from "@/components/ui/spinner";
import { ApiError, tryApi, wallpapersApi, type Wallpaper } from "@/lib/api";
import { getDeviceId } from "@/lib/device-id";
import { startCapture, stopStream, type CaptureStreams } from "@/lib/recording/capture";
import { Compositor } from "@/lib/recording/compositor";
import { createRecorder, type RecorderHandle } from "@/lib/recording/recorder";

// Same internal render resolution as /record (see compositor.ts).
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;
const CANVAS_ASPECT = `${CANVAS_WIDTH}/${CANVAS_HEIGHT}`;

// No account, no rate-limiting behind this page — a short cap keeps it a
// taste of the product rather than a free unlimited recorder.
const TRIAL_MAX_SECONDS = 25;

type Stage = "setup" | "live" | "countdown" | "recording" | "paused" | "stopped";

// This page deliberately duplicates most of /record's capture/compositor/
// recorder wiring rather than sharing a hook with it — the two pages' end
// states are different enough (save-to-account vs. watch-only-then-gone)
// that keeping them independent is simpler than refactoring the
// already-stable authenticated flow to accommodate this one. See
// record/page.tsx for the "real" recording flow.
export default function TryPage() {
  const [stage, setStage] = useState<Stage>("setup");
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [wallpapersLoading, setWallpapersLoading] = useState(true);
  const [selectedWallpaperId, setSelectedWallpaperId] = useState<string | null>(null);
  const [includeWebcam, setIncludeWebcam] = useState(true);
  const [includeMic, setIncludeMic] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [camAvailable, setCamAvailable] = useState(true);
  const [micAvailable, setMicAvailable] = useState(true);
  const [cropTop, setCropTop] = useState(0);
  const [cropBottom, setCropBottom] = useState(0);
  const [cropLeft, setCropLeft] = useState(0);
  const [cropRight, setCropRight] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  // null while the one-trial-per-device check is in flight.
  const [alreadyTried, setAlreadyTried] = useState<boolean | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const compositorRef = useRef<Compositor | null>(null);
  const recorderRef = useRef<RecorderHandle | null>(null);
  const streamsRef = useRef<CaptureStreams | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stoppingRef = useRef(false);
  const videoUrlRef = useRef<string | null>(null);

  useEffect(() => {
    compositorRef.current?.setScreenCrop({ top: cropTop, bottom: cropBottom, left: cropLeft, right: cropRight });
  }, [cropTop, cropBottom, cropLeft, cropRight]);

  useEffect(() => {
    wallpapersApi
      .list()
      .then(({ wallpapers }) => {
        setWallpapers(wallpapers);
        setSelectedWallpaperId((current) => current ?? wallpapers[0]?.id ?? null);
      })
      .catch(() => setError("Couldn't load wallpapers"))
      .finally(() => setWallpapersLoading(false));
  }, []);

  // One trial per device, checked up front so someone who already used
  // theirs sees that immediately instead of after going through the
  // screen-share picker. Fails open (assume not-yet-tried) on a network
  // error — a tracking hiccup shouldn't block a legitimate first try.
  useEffect(() => {
    tryApi
      .status(getDeviceId())
      .then(({ alreadyTried }) => setAlreadyTried(alreadyTried))
      .catch(() => setAlreadyTried(false));
  }, []);

  // Belt-and-braces cleanup if the visitor navigates away mid-session.
  useEffect(() => {
    return () => {
      compositorRef.current?.stop();
      stopStream(streamsRef.current?.screenStream);
      stopStream(streamsRef.current?.webcamStream);
      stopStream(streamsRef.current?.micStream);
      if (timerRef.current) clearInterval(timerRef.current);
      if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
    };
  }, []);

  const selectedWallpaper = wallpapers.find((w) => w.id === selectedWallpaperId) ?? null;

  async function handleStartSetup() {
    setError(null);
    try {
      const streams = await startCapture();
      streamsRef.current = streams;

      const camIsAvailable = streams.webcamStream !== null;
      const micIsAvailable = streams.micStream !== null;
      setCamAvailable(camIsAvailable);
      setMicAvailable(micIsAvailable);
      setCamOn(camIsAvailable && includeWebcam);
      setMicOn(micIsAvailable && includeMic);
      if (!camIsAvailable || !micIsAvailable) {
        setError(
          [!camIsAvailable && "No camera available.", !micIsAvailable && "No microphone available."]
            .filter(Boolean)
            .join(" ")
        );
      }

      streams.webcamStream?.getVideoTracks().forEach((t) => (t.enabled = includeWebcam));
      streams.micStream?.getAudioTracks().forEach((t) => (t.enabled = includeMic));

      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = streams.screenStream;
        await screenVideoRef.current.play();
      }
      if (streams.webcamStream && webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = streams.webcamStream;
        await webcamVideoRef.current.play();
      }

      streams.screenStream.getVideoTracks()[0]?.addEventListener("ended", () => {
        void handleStop();
      });

      if (!canvasRef.current) return;
      const compositor = new Compositor(canvasRef.current, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
      compositor.setScreenVideo(screenVideoRef.current);
      compositor.setWebcamVideo(camIsAvailable && includeWebcam ? webcamVideoRef.current : null);
      if (selectedWallpaper) {
        const img = new window.Image();
        img.src = selectedWallpaper.url;
        compositor.setWallpaper(img);
      }
      compositor.start();
      compositorRef.current = compositor;

      setStage("live");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start screen/webcam capture");
    }
  }

  function toggleCam() {
    if (!streamsRef.current?.webcamStream) return;
    const next = !camOn;
    streamsRef.current.webcamStream.getVideoTracks().forEach((t) => (t.enabled = next));
    compositorRef.current?.setWebcamVideo(next ? webcamVideoRef.current : null);
    setCamOn(next);
  }

  function toggleMic() {
    if (!streamsRef.current?.micStream) return;
    const next = !micOn;
    streamsRef.current.micStream.getAudioTracks().forEach((t) => (t.enabled = next));
    setMicOn(next);
  }

  function handleBeginCountdown() {
    setCountdown(3);
    setStage("countdown");
  }

  useEffect(() => {
    if (stage !== "countdown") return;
    if (countdown <= 0) {
      void beginRecording();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [stage, countdown]);

  // Auto-stop once the trial cap is hit — a separate effect (rather than
  // reacting inline in the timer tick) so the actual stop happens as a
  // normal state-driven effect, not a side effect buried in a setState
  // updater. react-hooks/set-state-in-effect flags the setError() call
  // below on principle (effects "shouldn't" set state directly), but
  // there's no derivable-state alternative here — crossing the cap is a
  // genuine one-time event that needs to trigger a real side effect
  // (stopping the recorder), which is exactly what effects are for.
  useEffect(() => {
    if (stage !== "recording") return;
    if (elapsedSeconds >= TRIAL_MAX_SECONDS) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError("That's the trial limit — sign up for unlimited length.");
      void handleStop();
    }
  }, [stage, elapsedSeconds]);

  async function beginRecording() {
    if (!canvasRef.current) return;

    // This is the "tried it" event (see try.routes.ts) — and, since one
    // trial per device is enforced server-side too, also the actual gate.
    // The page-load check above should already have caught a repeat
    // visitor before they got this far; this covers the race where two
    // tabs/attempts land close together.
    try {
      await tryApi.track(getDeviceId());
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        compositorRef.current?.stop();
        stopStream(streamsRef.current?.screenStream);
        stopStream(streamsRef.current?.webcamStream);
        stopStream(streamsRef.current?.micStream);
        setAlreadyTried(true);
        return;
      }
      // Any other failure (network blip, server down) — don't block a
      // legitimate first trial over a tracking hiccup.
    }

    const recorder = createRecorder(canvasRef.current, streamsRef.current?.micStream ?? null);
    recorder.start();
    recorderRef.current = recorder;
    setElapsedSeconds(0);
    timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    setStage("recording");
  }

  function handlePause() {
    recorderRef.current?.pause();
    if (timerRef.current) clearInterval(timerRef.current);
    setStage("paused");
  }

  function handleResume() {
    recorderRef.current?.resume();
    timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    setStage("recording");
  }

  async function handleStop() {
    if (stoppingRef.current) return;
    stoppingRef.current = true;

    if (timerRef.current) clearInterval(timerRef.current);
    compositorRef.current?.stop();

    const blob = recorderRef.current ? await recorderRef.current.stop() : null;

    stopStream(streamsRef.current?.screenStream);
    stopStream(streamsRef.current?.webcamStream);
    stopStream(streamsRef.current?.micStream);

    stoppingRef.current = false;

    if (blob) {
      const url = URL.createObjectURL(blob);
      videoUrlRef.current = url;
      setVideoUrl(url);
      setStage("stopped");
    } else {
      setStage("setup");
    }
  }

  function handleTryAgain() {
    if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
    videoUrlRef.current = null;
    setVideoUrl(null);
    setError(null);
    setElapsedSeconds(0);
    setStage("setup");
  }

  const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, "0");
  const seconds = String(elapsedSeconds % 60).padStart(2, "0");

  if (alreadyTried === null) {
    return (
      <>
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center p-6 pt-28">
          <Spinner className="h-6 w-6 text-muted-foreground" />
        </main>
      </>
    );
  }

  if (alreadyTried) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 pt-28 sm:p-6 sm:pt-32">
          <Link href="/" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <div className="space-y-4 rounded-[1.75rem] border border-border bg-card p-6 text-center">
            <h1 className="font-heading text-xl font-semibold tracking-tight">You&apos;ve already tried Screensy</h1>
            <p className="text-sm text-muted-foreground">
              This device already used its free trial recording. Sign up to keep recording — free, no limits.
            </p>
            <Link href="/signup" className={`${buttonVariants({ variant: "primary" })} w-full sm:w-auto`}>
              Sign up free
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 pt-28 sm:p-6 sm:pt-32">
        <Link href="/" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Try it free</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            No account needed — record up to {TRIAL_MAX_SECONDS} seconds and watch it back right here.
          </p>
        </div>

        {error && <Alert>{error}</Alert>}

        <video ref={screenVideoRef} muted playsInline style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }} />
        <video ref={webcamVideoRef} muted playsInline style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }} />

        {stage === "setup" && (
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
                      onClick={() => setSelectedWallpaperId(wallpaper.id)}
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

            <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeWebcam}
                  onChange={(e) => setIncludeWebcam(e.target.checked)}
                  className="accent-primary"
                />
                Start with face cam on
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeMic}
                  onChange={(e) => setIncludeMic(e.target.checked)}
                  className="accent-primary"
                />
                Start with microphone on
              </label>
            </div>

            <div className="space-y-2">
              <Button type="button" onClick={handleStartSetup} className="w-full sm:w-auto">
                <MonitorUp className="h-4 w-4" />
                Choose what to share
              </Button>
              <p className="text-xs text-muted-foreground">
                Tip: share a different window, or your whole screen — not this browser tab — to avoid an infinite
                mirror effect (this tab showing itself, recursively).
              </p>
            </div>
          </div>
        )}

        {/* Always mounted (even during "setup") so canvasRef.current exists
            before handleStartSetup constructs the Compositor — it's just
            hidden until there's actually something to preview. */}
        <div
          className={`relative w-full overflow-hidden rounded-lg bg-black ${stage === "setup" || stage === "stopped" ? "hidden" : ""}`}
          style={{ aspectRatio: CANVAS_ASPECT }}
        >
          <canvas ref={canvasRef} className="h-full w-full" />
          {stage === "countdown" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-6xl font-bold text-white">
              {countdown}
            </div>
          )}
        </div>

        {stage === "live" && (
          <div className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-[1.75rem] border border-border bg-card p-4 sm:grid-cols-2">
            <p className="col-span-1 text-sm font-medium sm:col-span-2">
              Crop out a taskbar or tab bar <span className="font-normal text-muted-foreground">(if it&apos;s showing)</span>
            </p>
            <CropSlider label="Top" value={cropTop} onChange={setCropTop} />
            <CropSlider label="Bottom" value={cropBottom} onChange={setCropBottom} />
            <CropSlider label="Left" value={cropLeft} onChange={setCropLeft} />
            <CropSlider label="Right" value={cropRight} onChange={setCropRight} />
          </div>
        )}

        {(stage === "live" || stage === "recording" || stage === "paused") && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {(stage === "recording" || stage === "paused") && (
              <span className="flex items-center gap-2 font-mono text-lg">
                {stage === "recording" && <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />}
                {minutes}:{seconds} <span className="text-sm font-normal text-muted-foreground">/ {TRIAL_MAX_SECONDS}s</span>
              </span>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                {camAvailable && (
                  <IconButton label={camOn ? "Turn camera off" : "Turn camera on"} onClick={toggleCam}>
                    {camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                  </IconButton>
                )}
                {micAvailable && (
                  <IconButton label={micOn ? "Mute mic" : "Unmute mic"} onClick={toggleMic}>
                    {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                  </IconButton>
                )}
                {stage === "recording" && (
                  <IconButton label="Pause recording" onClick={handlePause}>
                    <Pause className="h-5 w-5" />
                  </IconButton>
                )}
                {stage === "paused" && (
                  <IconButton label="Resume recording" onClick={handleResume}>
                    <Play className="h-5 w-5" />
                  </IconButton>
                )}
                {(stage === "recording" || stage === "paused") && (
                  <IconButton label="Stop recording" variant="destructive" onClick={() => void handleStop()}>
                    <Square className="h-5 w-5" />
                  </IconButton>
                )}
              </div>

              {stage === "live" && (
                <Button type="button" onClick={handleBeginCountdown} className="w-full sm:w-auto">
                  <Circle className="h-4 w-4 fill-current" />
                  Start recording
                </Button>
              )}
            </div>
          </div>
        )}

        {stage === "stopped" && videoUrl && (
          <div className="space-y-4 rounded-[1.75rem] border border-border bg-card p-6">
            <h2 className="font-heading text-lg font-semibold tracking-tight">Here&apos;s your trial recording</h2>

            <video src={videoUrl} controls playsInline className="w-full rounded-lg bg-black" style={{ aspectRatio: CANVAS_ASPECT }} />

            <Alert>You won&apos;t be able to save this video — it&apos;s just for trying things out.</Alert>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className={`${buttonVariants({ variant: "primary" })} w-full sm:w-auto`}>
                Sign up to save your recordings
              </Link>
              <Button type="button" variant="ghost" onClick={handleTryAgain} className="w-full sm:w-auto">
                <RotateCcw className="h-4 w-4" />
                Try again
              </Button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function CropSlider({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="flex items-center gap-3 text-sm">
      <span className="w-14 shrink-0 text-muted-foreground">{label}</span>
      <input
        type="range"
        min={0}
        max={0.3}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-primary"
      />
      <span className="w-10 shrink-0 text-right font-mono text-xs text-muted-foreground">{Math.round(value * 100)}%</span>
    </label>
  );
}
