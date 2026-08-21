"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ApiError, recordingsApi, wallpapersApi, type Wallpaper } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { startCapture, stopStream, type CaptureStreams } from "@/lib/recording/capture";
import { Compositor } from "@/lib/recording/compositor";
import { createRecorder, type RecorderHandle } from "@/lib/recording/recorder";

// Internal render resolution for the composited canvas — fixed regardless
// of the actual screen resolution being shared (see compositor.ts). 16:9
// — standard widescreen, plays natively everywhere (YouTube etc).
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;
const CANVAS_ASPECT = `${CANVAS_WIDTH}/${CANVAS_HEIGHT}`;

type Stage = "setup" | "live" | "countdown" | "recording" | "paused" | "stopped";

export default function RecordPage() {
  const router = useRouter();
  const { user, token, loading } = useAuth();

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
  // How much of each edge of the raw screen-share to cut off — for
  // trimming out a browser tab bar or OS taskbar, which we can't reliably
  // detect automatically. Fractions of the video, 0–0.3 (30%).
  const [cropTop, setCropTop] = useState(0);
  const [cropBottom, setCropBottom] = useState(0);
  const [cropLeft, setCropLeft] = useState(0);
  const [cropRight, setCropRight] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [finalDurationSeconds, setFinalDurationSeconds] = useState(0);
  const [fileExtension, setFileExtension] = useState<"mp4" | "webm">("webm");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const compositorRef = useRef<Compositor | null>(null);
  const recorderRef = useRef<RecorderHandle | null>(null);
  const streamsRef = useRef<CaptureStreams | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stoppingRef = useRef(false);
  // Wall-clock bookkeeping for the *saved* duration — deliberately not
  // derived from the elapsedSeconds display counter above, since that's
  // driven by a plain setInterval and is itself subject to the same
  // background-tab throttling described in compositor.ts. Date.now()
  // isn't affected by that, so it stays accurate even if the displayed
  // timer visibly lags while the tab is backgrounded.
  const recordStartRef = useRef<number | null>(null);
  const pausedMsRef = useRef(0);
  const pauseStartedRef = useRef<number | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  // Live-updates the compositor whenever a crop slider moves (compositor
  // only exists once handleStartSetup has run, i.e. from "live" onward —
  // the sliders aren't shown before that).
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

  // Belt-and-braces cleanup if the user navigates away mid-session.
  useEffect(() => {
    return () => {
      compositorRef.current?.stop();
      stopStream(streamsRef.current?.screenStream);
      stopStream(streamsRef.current?.webcamStream);
      stopStream(streamsRef.current?.micStream);
      if (timerRef.current) clearInterval(timerRef.current);
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

      // Apply the setup screen's initial on/off choice to the freshly
      // captured tracks (whichever were actually granted).
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

      // If the user stops sharing via the browser's own "Stop sharing" bar.
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
    // Removes (or restores) the overlay itself, not just freezing/blacking
    // it out — an off camera means no circle drawn at all.
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
      beginRecording();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, countdown]);

  function beginRecording() {
    if (!canvasRef.current) return;
    const recorder = createRecorder(canvasRef.current, streamsRef.current?.micStream ?? null);
    setFileExtension(recorder.fileExtension);
    recorder.start();
    recorderRef.current = recorder;
    recordStartRef.current = Date.now();
    pausedMsRef.current = 0;
    pauseStartedRef.current = null;
    setElapsedSeconds(0);
    timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    setStage("recording");
  }

  function handlePause() {
    recorderRef.current?.pause();
    if (timerRef.current) clearInterval(timerRef.current);
    pauseStartedRef.current = Date.now();
    setStage("paused");
  }

  function handleResume() {
    recorderRef.current?.resume();
    if (pauseStartedRef.current !== null) {
      pausedMsRef.current += Date.now() - pauseStartedRef.current;
      pauseStartedRef.current = null;
    }
    timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    setStage("recording");
  }

  async function handleStop() {
    if (stoppingRef.current) return;
    stoppingRef.current = true;

    if (timerRef.current) clearInterval(timerRef.current);
    compositorRef.current?.stop();

    // Wall-clock duration (see the refs' comment above) — not the
    // possibly-throttled elapsedSeconds display counter.
    let pausedMs = pausedMsRef.current;
    if (pauseStartedRef.current !== null) {
      pausedMs += Date.now() - pauseStartedRef.current;
      pauseStartedRef.current = null;
    }
    const durationMs = recordStartRef.current ? Date.now() - recordStartRef.current - pausedMs : elapsedSeconds * 1000;
    setFinalDurationSeconds(Math.max(0, Math.round(durationMs / 1000)));

    const blob = recorderRef.current ? await recorderRef.current.stop() : null;

    stopStream(streamsRef.current?.screenStream);
    stopStream(streamsRef.current?.webcamStream);
    stopStream(streamsRef.current?.micStream);

    stoppingRef.current = false;

    if (blob) {
      setRecordingBlob(blob);
      setStage("stopped");
    } else {
      setStage("setup");
    }
  }

  /** Downloads the file locally, then logs the metadata — always in that
   * order, so a history entry never exists without the user actually
   * having the video. */
  async function handleSaveRecording() {
    if (!recordingBlob || !token) return;
    setSaving(true);
    setError(null);
    try {
      const url = URL.createObjectURL(recordingBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.trim() || "recording"}.${fileExtension}`;
      a.click();
      URL.revokeObjectURL(url);

      await recordingsApi.create(
        {
          title: title.trim() || "Untitled recording",
          duration: finalDurationSeconds,
          wallpaperId: selectedWallpaperId ?? undefined,
        },
        token
      );
      setSaved(true);
      // Brief pause so "Saved ✓" is actually visible before navigating away.
      setTimeout(() => router.push("/dashboard"), 900);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save recording");
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    setRecordingBlob(null);
    setTitle("");
    setSaved(false);
    setElapsedSeconds(0);
    setFinalDurationSeconds(0);
    setStage("setup");
  }

  if (loading || !user) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </main>
    );
  }

  const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, "0");
  const seconds = String(elapsedSeconds % 60).padStart(2, "0");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-6">
      <Link href="/dashboard" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Dashboard
      </Link>

      <h1 className="font-heading text-2xl font-semibold tracking-tight">Record</h1>

      {error && <Alert>{error}</Alert>}

      {/* Hidden video elements feeding the compositor — not display:none so
          the browser keeps decoding frames from them reliably. */}
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
        className={`relative w-full overflow-hidden rounded-lg bg-black ${stage === "setup" ? "hidden" : ""}`}
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
            Crop out a taskbar or tab bar <span className="font-normal text-muted-foreground">(if it's showing)</span>
          </p>
          <CropSlider label="Top" value={cropTop} onChange={setCropTop} />
          <CropSlider label="Bottom" value={cropBottom} onChange={setCropBottom} />
          <CropSlider label="Left" value={cropLeft} onChange={setCropLeft} />
          <CropSlider label="Right" value={cropRight} onChange={setCropRight} />
        </div>
      )}

      {stage !== "setup" && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {(stage === "recording" || stage === "paused") && (
            <span className="flex items-center gap-2 font-mono text-lg">
              {stage === "recording" && <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />}
              {minutes}:{seconds}
            </span>
          )}

          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
            {(stage === "live" || stage === "recording" || stage === "paused") && (
              <>
                {camAvailable && (
                  <Button type="button" variant="outline" onClick={toggleCam} className="w-full sm:w-auto">
                    {camOn ? "Turn camera off" : "Turn camera on"}
                  </Button>
                )}
                {micAvailable && (
                  <Button type="button" variant="outline" onClick={toggleMic} className="w-full sm:w-auto">
                    {micOn ? "Mute mic" : "Unmute mic"}
                  </Button>
                )}
              </>
            )}

            {stage === "live" && (
              <Button type="button" onClick={handleBeginCountdown} className="col-span-2 w-full sm:w-auto">
                Start recording
              </Button>
            )}
            {stage === "recording" && (
              <>
                <Button type="button" variant="outline" onClick={handlePause} className="w-full sm:w-auto">
                  Pause
                </Button>
                <Button type="button" variant="destructive" onClick={() => void handleStop()} className="w-full sm:w-auto">
                  Stop
                </Button>
              </>
            )}
            {stage === "paused" && (
              <>
                <Button type="button" variant="outline" onClick={handleResume} className="w-full sm:w-auto">
                  Resume
                </Button>
                <Button type="button" variant="destructive" onClick={() => void handleStop()} className="w-full sm:w-auto">
                  Stop
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {stage === "stopped" && recordingBlob && (
        <div className="space-y-4 rounded-[1.75rem] border border-border bg-card p-6">
          <h2 className="font-heading text-lg font-semibold tracking-tight">Recording finished</h2>

          <div className="space-y-1">
            <label htmlFor="title" className="text-sm font-medium">
              Title
            </label>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled recording"
            />
          </div>

          {saved && <Alert variant="success">Saved to your history.</Alert>}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              onClick={() => void handleSaveRecording()}
              disabled={saving || saved}
              className="w-full sm:w-auto"
            >
              {saving && <Spinner className="h-4 w-4" />}
              {saved ? "Saved ✓" : saving ? "Saving…" : `Download & save (.${fileExtension})`}
            </Button>
            <Button type="button" variant="ghost" onClick={handleDiscard} className="w-full sm:w-auto">
              Discard & record another
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            The video file only downloads to your computer — it&apos;s never uploaded. This saves the file locally
            first, then logs the title/duration/wallpaper to your history.
          </p>
        </div>
      )}
    </main>
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
