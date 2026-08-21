"use client";

import { ArrowLeft, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { CapturePreview } from "@/components/recording/capture-preview";
import { CaptureSetupPanel } from "@/components/recording/capture-setup-panel";
import { CropControls } from "@/components/recording/crop-controls";
import { RecordingControls } from "@/components/recording/recording-controls";
import { SiteHeader } from "@/components/site-header";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ApiError, tryApi } from "@/lib/api";
import { getDeviceId } from "@/lib/device-id";
import { useScreenRecording, CANVAS_ASPECT } from "@/lib/recording/use-screen-recording";

// No account, no rate-limiting behind this page — a short cap keeps it a
// taste of the product rather than a free unlimited recorder.
const TRIAL_MAX_SECONDS = 25;

// This page shares all its capture/compositor/recorder mechanics and most
// of its JSX with /record via useScreenRecording + components/recording/*
// — see that hook for the shared bits. What's unique here: no auth gate,
// a one-trial-per-device check (gates the whole page, and the recording
// itself as a second line of defense), the trial-length cap, and a
// watch-only "stopped" panel instead of record's save-to-account form.
export default function TryPage() {
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  // null while the one-trial-per-device check is in flight.
  const [alreadyTried, setAlreadyTried] = useState<boolean | null>(null);

  const videoUrlRef = useRef<string | null>(null);

  const {
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
    error: recordingError,
    canvasRef,
    screenVideoRef,
    webcamVideoRef,
    handleStartSetup,
    handleBeginCountdown,
    handlePause,
    handleResume,
    handleStop,
    resetToSetup,
  } = useScreenRecording({
    maxSeconds: TRIAL_MAX_SECONDS,
    onCapReached: () => setError("That's the trial limit — sign up for unlimited length."),
    // This is the "tried it" event (see try.routes.ts) — and, since one
    // trial per device is enforced server-side too, also the actual gate.
    // The page-load status check below should already have caught a
    // repeat visitor before they got this far; this covers the race
    // where two tabs/attempts land close together.
    onBeforeRecordingStart: async () => {
      try {
        await tryApi.track(getDeviceId());
        return true;
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) return false;
        // Any other failure (network blip, server down) — don't block a
        // legitimate first trial over a tracking hiccup.
        return true;
      }
    },
    onRecordingBlocked: () => setAlreadyTried(true),
    onStopped: (blob) => {
      const url = URL.createObjectURL(blob);
      videoUrlRef.current = url;
      setVideoUrl(url);
    },
  });

  // The hook's own `error` is for capture/wallpaper failures; this page
  // also wants to show its own cap/blocked messages through the same
  // Alert, so whichever fired most recently wins.
  const displayError = error ?? recordingError;

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

  // Revoke the object URL whenever it's replaced or the page unmounts.
  useEffect(() => {
    return () => {
      if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
    };
  }, []);

  function handleTryAgain() {
    if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
    videoUrlRef.current = null;
    setVideoUrl(null);
    setError(null);
    resetToSetup();
  }

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

        {displayError && <Alert>{displayError}</Alert>}

        <video ref={screenVideoRef} muted playsInline style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }} />
        <video ref={webcamVideoRef} muted playsInline style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }} />

        {stage === "setup" && (
          <CaptureSetupPanel
            wallpapers={wallpapers}
            wallpapersLoading={wallpapersLoading}
            selectedWallpaperId={selectedWallpaperId}
            onSelectWallpaper={setSelectedWallpaperId}
            includeWebcam={includeWebcam}
            onIncludeWebcamChange={setIncludeWebcam}
            includeMic={includeMic}
            onIncludeMicChange={setIncludeMic}
            onStartSetup={() => void handleStartSetup()}
          />
        )}

        <CapturePreview
          canvasRef={canvasRef}
          countdown={countdown}
          showCountdown={stage === "countdown"}
          hidden={stage === "setup" || stage === "stopped"}
        />

        {stage === "live" && (
          <CropControls
            cropTop={cropTop}
            onCropTopChange={setCropTop}
            cropBottom={cropBottom}
            onCropBottomChange={setCropBottom}
            cropLeft={cropLeft}
            onCropLeftChange={setCropLeft}
            cropRight={cropRight}
            onCropRightChange={setCropRight}
          />
        )}

        {(stage === "live" || stage === "recording" || stage === "paused") && (
          <RecordingControls
            stage={stage}
            elapsedSeconds={elapsedSeconds}
            maxSeconds={TRIAL_MAX_SECONDS}
            camAvailable={camAvailable}
            camOn={camOn}
            onToggleCam={toggleCam}
            micAvailable={micAvailable}
            micOn={micOn}
            onToggleMic={toggleMic}
            onPause={handlePause}
            onResume={handleResume}
            onStop={() => void handleStop()}
            onBeginCountdown={handleBeginCountdown}
          />
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
