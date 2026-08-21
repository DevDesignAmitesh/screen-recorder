// In-process registry for in-flight recording uploads (see
// routes/recording-stream.routes.ts). Deliberately NOT backed by Postgres —
// this data is inherently ephemeral (a recording someone hasn't finished
// downloading yet), never needs to survive a restart, and the video bytes
// themselves have no business in a relational DB. It only works correctly
// as long as the server runs single-process — see bin.ts.

const MAX_SESSION_BYTES = 500 * 1024 * 1024; // ~500MB
const MAX_SESSION_MS = 10 * 60 * 1000; // ~10 minutes
const STALE_SESSION_MS = 60 * 60 * 1000; // sweep backstop: 60 minutes of inactivity
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

export type ChunkRejectReason = "not-found" | "forbidden" | "size-limit" | "time-limit";

interface RecordingSession {
  id: string;
  ownerId: string;
  mimeType: string;
  /** Keyed by client-assigned sequence number — chunks can arrive out of
   * order (a retried chunk can resolve after a later one), so we reassemble
   * by sorting these keys rather than trusting arrival order. */
  chunks: Map<number, Buffer>;
  totalBytes: number;
  createdAt: number;
  lastChunkAt: number;
  finished: boolean;
}

const sessions = new Map<string, RecordingSession>();
// One active session per user — starting a new recording wipes whatever
// that user had in flight (the product's own chosen cleanup rule).
const activeSessionByOwner = new Map<string, string>();

export function createSession(ownerId: string, mimeType: string): string {
  const existingId = activeSessionByOwner.get(ownerId);
  if (existingId) {
    sessions.delete(existingId);
  }

  const id = crypto.randomUUID();
  const now = Date.now();
  sessions.set(id, {
    id,
    ownerId,
    mimeType,
    chunks: new Map(),
    totalBytes: 0,
    createdAt: now,
    lastChunkAt: now,
    finished: false,
  });
  activeSessionByOwner.set(ownerId, id);
  return id;
}

export function appendChunk(
  sessionId: string,
  ownerId: string,
  sequence: number,
  buffer: Buffer
): { ok: true } | { ok: false; reason: ChunkRejectReason } {
  const session = sessions.get(sessionId);
  if (!session) return { ok: false, reason: "not-found" };
  if (session.ownerId !== ownerId) return { ok: false, reason: "forbidden" };

  const now = Date.now();
  if (now - session.createdAt > MAX_SESSION_MS) return { ok: false, reason: "time-limit" };
  if (session.totalBytes + buffer.length > MAX_SESSION_BYTES) return { ok: false, reason: "size-limit" };

  session.chunks.set(sequence, buffer);
  session.totalBytes += buffer.length;
  session.lastChunkAt = now;
  return { ok: true };
}

export function finishSession(sessionId: string, ownerId: string): boolean {
  const session = sessions.get(sessionId);
  if (!session || session.ownerId !== ownerId) return false;
  session.finished = true;
  return true;
}

/** Returns the session's bytes in the correct order for download, or null
 * if it doesn't exist / isn't owned by this user. Doesn't require
 * `finished` — a client that never explicitly called finish (e.g. it
 * crashed right after the last chunk) can still recover its recording. */
export function getSessionForDownload(
  sessionId: string,
  ownerId: string
): { mimeType: string; totalBytes: number; orderedChunks: Buffer[] } | null {
  const session = sessions.get(sessionId);
  if (!session || session.ownerId !== ownerId) return null;

  const orderedChunks = [...session.chunks.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, buffer]) => buffer);

  return { mimeType: session.mimeType, totalBytes: session.totalBytes, orderedChunks };
}

export function deleteSession(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session) return;
  sessions.delete(sessionId);
  if (activeSessionByOwner.get(session.ownerId) === sessionId) {
    activeSessionByOwner.delete(session.ownerId);
  }
}

function sweepStaleSessions() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastChunkAt > STALE_SESSION_MS) {
      deleteSession(id);
    }
  }
}

setInterval(sweepStaleSessions, SWEEP_INTERVAL_MS).unref();
