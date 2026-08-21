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
// Chunks stream to the server as they're produced (see
// apps/server/src/lib/recording-sessions.ts) instead of piling up in the
// browser's own memory for the whole recording — each chunk is dropped
// from the client the moment the server acks it. That only works if the
// server actually is reachable and keeps working, so this degrades
// gracefully at two points:
//  - If starting the server-side session fails at all, the whole
//    recording just behaves exactly like before: everything buffered
//    locally, nothing ever sent anywhere until the very end.
//  - If a chunk fails mid-recording (after retries) on a session that had
//    been working, that one spot in the video is a small gap — the
//    earlier chunks are already gone from the browser by then, so there's
//    nothing to fall back to for them specifically. But if the server
//    never worked at all for this recording (dead from the very first
//    chunk), everything reroutes to local buffering instead, so a
//    server that's down for the whole session still produces a complete
//    (fully local) recording.

import { ApiError, recordingsApi } from "@/lib/api";

export type StopResult = { source: "server"; sessionId: string; mimeType: string } | { source: "local"; blob: Blob };

export interface RecorderHandle {
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  /** Stops recording and resolves with either a server-side session to
   * download-and-delete, or a local Blob if streaming never worked out. */
  stop: () => Promise<StopResult>;
  /** "mp4" or "webm", matching whatever container was actually used. */
  readonly fileExtension: "mp4" | "webm";
}

export type CapReason = "size-limit" | "time-limit";

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

// ~2s per uploaded chunk (vs. the 250ms MediaRecorder flush this used
// before streaming existed) — cuts request volume roughly 8x while still
// only ever holding a couple of seconds of un-acked data in the browser.
const CHUNK_TIMESLICE_MS = 2000;
const MAX_CHUNK_RETRIES = 4;

export function createRecorder(
  canvas: HTMLCanvasElement,
  micStream: MediaStream | null,
  token: string | null,
  onCapped?: (reason: CapReason) => void
): RecorderHandle {
  const outputStream = canvas.captureStream(30);
  micStream?.getAudioTracks().forEach((track) => outputStream.addTrack(track));

  const mimeType = pickSupportedMimeType();
  const fileExtension: "mp4" | "webm" = mimeType?.startsWith("video/mp4") ? "mp4" : "webm";
  const blobType = mimeType?.split(";")[0] ?? "video/webm";

  const mediaRecorder = new MediaRecorder(outputStream, mimeType ? { mimeType } : undefined);

  // Local fallback — only ever populated when server streaming isn't
  // available for this recording, or for a chunk that permanently failed
  // before the server ever worked at all (see file header). Keyed by
  // sequence so it reassembles in the right order regardless of which
  // retry finishes first.
  const localChunks = new Map<number, Blob>();
  const inFlightUploads = new Set<Promise<void>>();
  let sessionId: string | null = null;
  let sequence = 0;
  let hasStreamedAny = false;
  let cappedReason: CapReason | null = null;

  async function uploadChunk(id: string, seq: number, blob: Blob, authToken: string, attempt = 0): Promise<void> {
    try {
      await recordingsApi.streamChunk(id, seq, blob, authToken);
      hasStreamedAny = true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 413) {
        cappedReason = err.message === "time-limit" ? "time-limit" : "size-limit";
        onCapped?.(cappedReason);
        return;
      }
      if (attempt < MAX_CHUNK_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
        return uploadChunk(id, seq, blob, authToken, attempt + 1);
      }
      // Retries exhausted. If the server had never worked for this
      // recording at all, treat it as dead — recover this chunk locally
      // and route everything from here on to local buffering too.
      // Otherwise this is a rare mid-stream blip after otherwise-healthy
      // streaming: accept a small gap here and keep going (the earlier
      // chunks are already gone from the browser either way).
      if (!hasStreamedAny) {
        sessionId = null;
        localChunks.set(seq, blob);
      }
    }
  }

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size === 0 || cappedReason) return;
    const seq = sequence++;
    if (sessionId && token) {
      const currentSessionId = sessionId;
      const currentToken = token;
      const upload: Promise<void> = uploadChunk(currentSessionId, seq, event.data, currentToken).finally(() =>
        inFlightUploads.delete(upload)
      );
      inFlightUploads.add(upload);
    } else {
      localChunks.set(seq, event.data);
    }
  };

  let resolveStop: ((result: StopResult) => void) | null = null;

  async function finalize() {
    // Let any in-flight uploads (including backoff retries) settle first —
    // otherwise we might build the local fallback before a chunk that was
    // still retrying gets its chance to land somewhere.
    await Promise.allSettled([...inFlightUploads]);

    if (sessionId && token) {
      try {
        await recordingsApi.streamFinish(sessionId, token);
      } catch {
        // Non-fatal — finish is just bookkeeping; download works without it.
      }
      resolveStop?.({ source: "server", sessionId, mimeType: blobType });
      return;
    }

    const orderedLocal = [...localChunks.entries()].sort(([a], [b]) => a - b).map(([, blob]) => blob);
    resolveStop?.({ source: "local", blob: new Blob(orderedLocal, { type: blobType }) });
  }

  mediaRecorder.onstop = () => {
    void finalize();
  };

  return {
    fileExtension,
    start: async () => {
      if (token) {
        try {
          const { sessionId: id } = await recordingsApi.streamStart(mimeType ?? blobType, token);
          sessionId = id;
        } catch {
          sessionId = null; // fall back to fully local for this whole recording
        }
      }
      mediaRecorder.start(CHUNK_TIMESLICE_MS);
    },
    pause: () => mediaRecorder.pause(),
    resume: () => mediaRecorder.resume(),
    stop: () =>
      new Promise<StopResult>((resolve) => {
        resolveStop = resolve;
        if (mediaRecorder.state === "inactive") {
          void finalize();
          return;
        }
        mediaRecorder.stop();
      }),
  };
}
