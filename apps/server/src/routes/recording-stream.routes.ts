import express, { Router } from "express";

import { requireAuth } from "../middleware/auth.js";
import { appendChunk, createSession, deleteSession, finishSession, getSessionForDownload } from "../lib/recording-sessions.js";

export const recordingStreamRouter: Router = Router();

// Streams a recording's bytes up as it's captured, instead of the browser
// holding the whole thing in memory until it's done. The session lives
// only in-process (see lib/recording-sessions.ts) — never touches
// Postgres, never durably stored. On download, the bytes are handed back
// once and the session is deleted in that same request.

/**
 * POST /api/v1/recordings/stream/start
 *
 * Begins a new upload session for the current user. Wipes any session
 * that user already had in flight — at most one active recording per user.
 */
recordingStreamRouter.post("/start", requireAuth, (req, res) => {
  const mimeType = typeof req.body?.mimeType === "string" ? req.body.mimeType : "application/octet-stream";
  const sessionId = createSession(req.user!.id, mimeType);
  res.status(201).json({ sessionId });
});

/**
 * POST /api/v1/recordings/stream/:sessionId/chunk
 *
 * Appends one chunk of the recording. Raw binary body (not JSON) — parsed
 * by express.raw() scoped to this route alone. The chunk's position in the
 * recording comes from the X-Chunk-Sequence header, since chunks can land
 * out of order when a failed one is retried.
 */
recordingStreamRouter.post(
  "/:sessionId/chunk",
  requireAuth,
  express.raw({ type: "*/*", limit: "10mb" }),
  (req, res) => {
    const sessionId = req.params.sessionId;
    if (!sessionId) {
      res.status(400).json({ error: "Missing session id" });
      return;
    }
    const sequence = Number(req.headers["x-chunk-sequence"]);
    if (!Number.isInteger(sequence) || sequence < 0) {
      res.status(400).json({ error: "Missing or invalid X-Chunk-Sequence header" });
      return;
    }
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ error: "Missing chunk body" });
      return;
    }

    const result = appendChunk(sessionId, req.user!.id, sequence, req.body);
    if (!result.ok) {
      const status = result.reason === "not-found" ? 404 : result.reason === "forbidden" ? 403 : 413;
      res.status(status).json({ error: result.reason });
      return;
    }
    res.status(200).json({ ok: true });
  }
);

/**
 * POST /api/v1/recordings/stream/:sessionId/finish
 *
 * Marks a session as done recording — purely bookkeeping (download works
 * even without this, e.g. if the client never got to call it).
 */
recordingStreamRouter.post("/:sessionId/finish", requireAuth, (req, res) => {
  const sessionId = req.params.sessionId;
  if (!sessionId) {
    res.status(400).json({ error: "Missing session id" });
    return;
  }
  const ok = finishSession(sessionId, req.user!.id);
  if (!ok) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.status(200).json({ ok: true });
});

/**
 * GET /api/v1/recordings/stream/:sessionId/download
 *
 * Streams the assembled recording back and deletes it server-side once
 * the response has fully sent — the "fetch it back, then it's gone" step.
 * A connection that drops mid-download leaves the session intact for a
 * retry (cleaned up later by the inactivity sweep if truly abandoned).
 */
recordingStreamRouter.get("/:sessionId/download", requireAuth, (req, res) => {
  const sessionId = req.params.sessionId;
  if (!sessionId) {
    res.status(400).json({ error: "Missing session id" });
    return;
  }
  const session = getSessionForDownload(sessionId, req.user!.id);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.status(200);
  res.setHeader("Content-Type", session.mimeType.split(";")[0] ?? "application/octet-stream");
  res.setHeader("Content-Length", String(session.totalBytes));
  res.setHeader("Content-Disposition", "attachment");

  res.on("finish", () => deleteSession(sessionId));

  for (const chunk of session.orderedChunks) {
    res.write(chunk);
  }
  res.end();
});
