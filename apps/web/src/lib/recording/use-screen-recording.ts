"use client";

// Shared mechanics behind both /record and /try — wallpaper fetch/
// selection, screen+face-cam capture, compositor wiring, cam/mic toggles,
// crop state, countdown, pause/resume/stop, and wall-clock duration
// tracking. The two pages differ only in what happens before a recording
// is allowed to start (record: nothing; try: a one-trial-per-device gate)
// and after it stops (record: save-to-account; try: watch-only) — both
// handled via the options below and the returned `recordingBlob` /
// `finalDurationSeconds`, letting each page own its own "stopped" UI.

import { useEffect, useRef, useState } from "react";

import { wallpapersApi, type Wallpaper } from "@/lib/api";
import { startCapture, stopStream, type CaptureStreams } from "@/lib/recording/capture";
import { Compositor } from "@/lib/recording/compositor";
import { createRecorder, type RecorderHandle } from "@/lib/recording/recorder";

// Internal render resolution for the composited canvas — fixed regardless
// of the actual screen resolution being shared (see compositor.ts). 16:9
// — standard widescreen, plays natively everywhere (YouTube etc).
export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;
export const CANVAS_ASPECT = `${CANVAS_WIDTH}/${CANVAS_HEIGHT}`;

export type Stage = "setup" | "live" | "countdown" | "recording" | "paused" | "stopped";

export interface UseScreenRecordingOptions {
  /** Auto-stops once elapsedSeconds reaches this. Omit for no cap. */
  maxSeconds?: number;
  /** Called once when that cap is actually hit, right before stopping. */
  onCapReached?: () => void;
  /** Awaited right before the recorder actually starts (post-countdown).
   * Return false to abort — the hook tears the capture down itself and
   * calls onRecordingBlocked, so callers don't have to duplicate that. */
  onBeforeRecordingStart?: () => Promise<boolean>;
  onRecordingBlocked?: () => void;
  /** Called once a finished recording's blob is ready (right when
   * `recordingBlob`/`finalDurationSeconds` are set) — for callers that
   * need to react immediately (e.g. building an object URL for
   * playback) without deriving it via an effect watching recordingBlob. */
  onStopped?: (blob: Blob) => void;
}

export function useScreenRecording(options: UseScreenRecordingOptions = {}) {
  const { maxSeconds, onCapReached, onBeforeRecordingStart, onRecordingBlocked, onStopped } = options;

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
  // driven by a plain setInterval and is itself subject to background-tab
  // throttling (see compositor.ts). Date.now() isn't affected by that, so
  // it stays accurate even if the displayed timer visibly lags.
  const recordStartRef = useRef<number | null>(null);
  const pausedMsRef = useRef(0);
  const pauseStartedRef = useRef<number | null>(null);

  // Live-updates the compositor whenever a crop slider moves (compositor
  // only exists once handleStartSetup has run).
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

  // Belt-and-braces cleanup if the caller's page unmounts mid-session.
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

  /** Backs out of the "live" preview (screen shared, not recording yet)
   * back to setup — e.g. to pick a different wallpaper or re-share a
   * different window. Unlike resetToSetup (which only clears recording
   * state after a stop), this actually tears down the in-progress capture
   * streams and compositor, since nothing else has stopped them yet. */
  function handleCancelLive() {
    compositorRef.current?.stop();
    stopStream(streamsRef.current?.screenStream);
    stopStream(streamsRef.current?.webcamStream);
    stopStream(streamsRef.current?.micStream);
    compositorRef.current = null;
    streamsRef.current = null;
    setStage("setup");
  }

  function handleBeginCountdown() {
    setCountdown(3);
    setStage("countdown");
  }

  async function beginRecording() {
    if (!canvasRef.current) return;

    if (onBeforeRecordingStart) {
      const allowed = await onBeforeRecordingStart();
      if (!allowed) {
        compositorRef.current?.stop();
        stopStream(streamsRef.current?.screenStream);
        stopStream(streamsRef.current?.webcamStream);
        stopStream(streamsRef.current?.micStream);
        setStage("setup");
        onRecordingBlocked?.();
        return;
      }
    }

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

  useEffect(() => {
    if (stage !== "countdown") return;
    if (countdown <= 0) {
      // react-hooks/set-state-in-effect flags this because beginRecording
      // itself sets state — but it only ever runs once, in response to
      // the user-initiated countdown finishing, never during a render pass.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void beginRecording();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, countdown]);

  // Auto-stop once a configured cap is hit — a separate effect (rather
  // than reacting inline in the timer tick) so the stop happens as a
  // normal state-driven effect, not a side effect buried in a setState
  // updater.
  useEffect(() => {
    if (stage !== "recording" || maxSeconds === undefined) return;
    if (elapsedSeconds >= maxSeconds) {
      onCapReached?.();
      void handleStop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, elapsedSeconds, maxSeconds]);

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
      onStopped?.(blob);
      setStage("stopped");
    } else {
      setStage("setup");
    }
  }

  /** Back to a clean slate for another recording. Callers with their own
   * extra "stopped"-stage state (a title field, a video preview URL, …)
   * should clear that themselves alongside calling this. */
  function resetToSetup() {
    setRecordingBlob(null);
    setElapsedSeconds(0);
    setFinalDurationSeconds(0);
    setStage("setup");
  }

  return {
    stage,
    wallpapers,
    wallpapersLoading,
    selectedWallpaperId,
    setSelectedWallpaperId,
    includeWebcam,
    setIncludeWebcam,
    includeMic,
    setIncludeMic,
    camOn,
    micOn,
    camAvailable,
    micAvailable,
    toggleCam,
    toggleMic,
    cropTop,
    setCropTop,
    cropBottom,
    setCropBottom,
    cropLeft,
    setCropLeft,
    cropRight,
    setCropRight,
    countdown,
    elapsedSeconds,
    error,
    setError,
    recordingBlob,
    finalDurationSeconds,
    fileExtension,
    canvasRef,
    screenVideoRef,
    webcamVideoRef,
    handleStartSetup,
    handleBeginCountdown,
    handleCancelLive,
    handlePause,
    handleResume,
    handleStop,
    resetToSetup,
  };
}
