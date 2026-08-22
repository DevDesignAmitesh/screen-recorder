"use client";

import { ArrowLeft, Download, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { CapturePreview } from "@/components/recording/capture-preview";
import { CaptureSetupPanel } from "@/components/recording/capture-setup-panel";
import { CropControls } from "@/components/recording/crop-controls";
import { RecordingControls } from "@/components/recording/recording-controls";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ApiError, recordingsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useScreenRecording } from "@/lib/recording/use-screen-recording";

export default function RecordPage() {
  const router = useRouter();
  const { user, token, loading } = useAuth();

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
    setError,
    recordingBlob,
    finalDurationSeconds,
    fileExtension,
    canvasRef,
    screenVideoRef,
    webcamVideoRef,
    handleStartSetup,
    handleBeginCountdown,
    handlePause,
    handleResume,
    handleStop,
    resetToSetup,
  } = useScreenRecording();

  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

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
    resetToSetup();
    setTitle("");
    setSaved(false);
  }

  if (loading || !user) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </main>
    );
  }

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
              {saving ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />}
              {saved ? "Saved ✓" : saving ? "Saving…" : `Download & save (.${fileExtension})`}
            </Button>
            <Button type="button" variant="ghost" onClick={handleDiscard} className="w-full sm:w-auto">
              <RotateCcw className="h-4 w-4" />
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
