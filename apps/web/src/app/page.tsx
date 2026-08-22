"use client";

import { Download, RotateCcw, Undo2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { CapturePreview } from "@/components/recording/capture-preview";
import { CaptureSetupPanel } from "@/components/recording/capture-setup-panel";
import { CropControls } from "@/components/recording/crop-controls";
import { RecordingControls } from "@/components/recording/recording-controls";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { tryApi } from "@/lib/api";
import { PRODUCT_NAME } from "@/lib/constants";
import { getDeviceId } from "@/lib/device-id";
import { useScreenRecording } from "@/lib/recording/use-screen-recording";

// This is the whole product now: land, record, download — no account, no
// dashboard, no marketing pitch. This page is what used to be /record,
// ported to the root and stripped of its auth gate. See
// lib/recording/use-screen-recording.ts for the shared capture/compositor/
// recorder mechanics; this page owns only the "stopped" panel and the
// fire-and-forget per-device recording count (see tryApi.track /
// apps/server/src/routes/try.routes.ts — repurposed from a one-trial gate
// into pure counting, nothing here is ever blocked by it).

/** `recording-20260822-143052.webm` — sortable and collision-resistant
 * enough for a locally-downloaded file, no title prompt needed. */
function buildTimestampFilename(ext: string) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `recording-${stamp}.${ext}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [downloadedFilename, setDownloadedFilename] = useState<string | null>(null);

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
    error,
    recordingBlob,
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
  } = useScreenRecording({
    // Downloads the instant a recording is ready, timestamp-named — no
    // title prompt, no extra click. Then logs a device-count row (pure
    // tracking, fire-and-forget, never able to block or delay the
    // download above).
    onStopped: (blob) => {
      const filename = buildTimestampFilename(blob.type.includes("mp4") ? "mp4" : "webm");
      downloadBlob(blob, filename);
      setDownloadedFilename(filename);
      void tryApi.track(getDeviceId()).catch(() => {});
    },
  });

  function handleDownloadAgain() {
    if (!recordingBlob || !downloadedFilename) return;
    downloadBlob(recordingBlob, downloadedFilename);
  }

  function handleDiscard() {
    resetToSetup();
    setDownloadedFilename(null);
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-6">
      <Link href="/" className="font-heading text-lg font-semibold tracking-tight">
        {PRODUCT_NAME}
      </Link>

      {stage === "setup" && (
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Record beautiful videos, right in your browser.
          </h1>
          <p className="text-sm text-muted-foreground">
            Pick a wallpaper, share your screen, hit record — your video downloads straight to your computer.
            No sign-up, nothing ever uploaded.
          </p>
        </div>
      )}

      {error && <Alert>{error}</Alert>}

      {/* Hidden video elements feeding the compositor — not display:none so
          the browser keeps decoding frames from them reliably. */}
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
        hidden={stage === "setup"}
      />

      {stage === "live" && (
        <>
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
          <Button type="button" variant="ghost" size="sm" onClick={handleCancelLive} className="w-fit">
            <Undo2 className="h-4 w-4" />
            Try again / choose a different wallpaper
          </Button>
        </>
      )}

      {(stage === "live" || stage === "recording" || stage === "paused") && (
        <RecordingControls
          stage={stage}
          elapsedSeconds={elapsedSeconds}
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

      {stage === "stopped" && recordingBlob && (
        <div className="space-y-4 rounded-[1.75rem] border border-border bg-card p-6">
          <h2 className="font-heading text-lg font-semibold tracking-tight">Recording finished</h2>

          {downloadedFilename && <Alert variant="success">Downloaded as {downloadedFilename}</Alert>}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="button" onClick={handleDownloadAgain} className="w-full sm:w-auto">
              <Download className="h-4 w-4" />
              Download again
            </Button>
            <Button type="button" variant="ghost" onClick={handleDiscard} className="w-full sm:w-auto">
              <RotateCcw className="h-4 w-4" />
              Discard & record another
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            The video file only downloads to your computer — it&apos;s never uploaded anywhere.
          </p>
        </div>
      )}
    </main>
  );
}
