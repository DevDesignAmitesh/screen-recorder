// Wraps the canvas's live stream (see compositor.ts) + an optional mic
// audio track into a MediaRecorder. v1 only mixes in mic audio, not
// system/tab audio — MediaRecorder's handling of multiple simultaneous
// audio tracks is inconsistent across browsers, so keeping it to a single
// audio source avoids that entirely. Proper mixing (Web Audio API +
// MediaStreamDestination) is a reasonable later improvement.
//
// Prefers MP4 output where the browser actually supports encoding it
// (MediaRecorder producing H.264/AAC directly), falling back to WebM
// where it doesn't — feature-detected via MediaRecorder.isTypeSupported,
// never assumed.
//
// Chunks are buffered via chunk-store.ts (IndexedDB) rather than a plain
// array, so recording a long session doesn't grow the tab's memory usage
// for its whole duration — only reassembling the final Blob on stop does.

import { createChunkStore } from "@/lib/recording/chunk-store";

export interface RecorderHandle {
  start: () => void;
  pause: () => void;
  resume: () => void;
  /** Stops recording and resolves with the finished video blob. */
  stop: () => Promise<Blob>;
  /** "mp4" or "webm", matching whatever container was actually used. */
  readonly fileExtension: "mp4" | "webm";
}

const MIME_TYPE_CANDIDATES = [
  "video/mp4;codecs=avc1.640028,mp4a.40.2",
  "video/mp4;codecs=h264,aac",
  "video/mp4",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

function pickSupportedMimeType(): string | undefined {
  return MIME_TYPE_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));
}

export function createRecorder(canvas: HTMLCanvasElement, micStream: MediaStream | null): RecorderHandle {
  const outputStream = canvas.captureStream(30);
  micStream?.getAudioTracks().forEach((track) => outputStream.addTrack(track));

  const mimeType = pickSupportedMimeType();
  const fileExtension: "mp4" | "webm" = mimeType?.startsWith("video/mp4") ? "mp4" : "webm";
  const blobType = mimeType?.split(";")[0] ?? "video/webm";

  const mediaRecorder = new MediaRecorder(outputStream, mimeType ? { mimeType } : undefined);
  const chunkStore = createChunkStore();

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunkStore.add(event.data);
  };

  async function assembleAndClear(): Promise<Blob> {
    const parts = await chunkStore.readAllInOrder();
    const blob = new Blob(parts, { type: blobType });
    await chunkStore.clear();
    return blob;
  }

  let resolveStop: ((blob: Blob) => void) | null = null;
  mediaRecorder.onstop = () => {
    void assembleAndClear().then((blob) => resolveStop?.(blob));
  };

  return {
    fileExtension,
    start: () => mediaRecorder.start(250), // flush a chunk every 250ms
    pause: () => mediaRecorder.pause(),
    resume: () => mediaRecorder.resume(),
    stop: () =>
      new Promise<Blob>((resolve) => {
        if (mediaRecorder.state === "inactive") {
          void assembleAndClear().then(resolve);
          return;
        }
        resolveStop = resolve;
        mediaRecorder.stop();
      }),
  };
}
