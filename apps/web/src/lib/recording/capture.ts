// Requests the raw media streams: the screen share, plus the webcam and
// microphone. Kept separate from compositor.ts (drawing) and recorder.ts
// (encoding) so each piece is independently testable.

export interface CaptureStreams {
  screenStream: MediaStream;
  /** null if there's no camera, or the user denied permission — screen-only recording still works. */
  webcamStream: MediaStream | null;
  /** null if there's no mic, or the user denied permission — recording is just silent. */
  micStream: MediaStream | null;
}

export async function startCapture(): Promise<CaptureStreams> {
  // `displaySurface: "monitor"` is a hint some browsers use to default the
  // share picker to "Entire Screen" instead of a tab/window — it reduces
  // (doesn't guarantee against) users accidentally sharing the very tab
  // that's recording, which causes an infinite hall-of-mirrors effect.
  const screenStream = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: 30, displaySurface: "monitor" },
    audio: false,
  });

  // Webcam + mic are always requested together up front, in one prompt —
  // even if the user starts with them toggled off in the setup screen.
  // That's deliberate: MediaRecorder doesn't reliably pick up tracks added
  // to its stream after recording has started, so "turn the camera/mic on"
  // mid-recording has to mean re-enabling an already-captured track
  // (instant, well-supported) rather than requesting a fresh one.
  //
  // If this is denied (or there's no camera/mic at all), don't fail the
  // whole capture — fall back to a screen-only recording.
  let webcamStream: MediaStream | null = null;
  let micStream: MediaStream | null = null;
  try {
    const combined = await navigator.mediaDevices.getUserMedia({
      video: { width: 480, height: 480 },
      audio: true,
    });
    webcamStream = new MediaStream(combined.getVideoTracks());
    micStream = new MediaStream(combined.getAudioTracks());
  } catch {
    // No camera/mic, or permission denied — screen-only is still fine.
  }

  return { screenStream, webcamStream, micStream };
}

export function stopStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((track) => track.stop());
}
