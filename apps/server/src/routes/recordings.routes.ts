import { Router } from "express";

export const recordingsRouter: Router = Router();

// v1 design note: recordings are never uploaded to the server. The browser
// composites + records the video client-side and saves it straight to the
// user's own filesystem (download / File System Access API). These routes
// only ever deal with metadata — a history of what was recorded, not the
// video bytes themselves. There's no storage service in this codebase;
// a possible future "save to cloud" opt-in would need one added.

/**
 * GET /api/v1/recordings
 *
 * List the current user's recording history (their dashboard). Protected
 * by `requireAuth`. Supports pagination later (?cursor/?limit). Returns
 * metadata only (title, duration, createdAt, wallpaper/template used) —
 * there's no video file to link to or play back.
 */
recordingsRouter.get("/", (req, res) => {
  res.status(501).json({ error: "GET /recordings not implemented yet" });
});

/**
 * POST /api/v1/recordings
 *
 * Log a finished recording the user just saved locally. Protected by
 * `requireAuth`.
 *   1. Validate body: { title, duration, wallpaperId?, templateId? }.
 *      No file is attached — the browser already saved the video itself.
 *   2. Create a Recording row (ownerId, title, duration, wallpaperId,
 *      templateId).
 *   3. Respond 201 with the created recording record.
 */
recordingsRouter.post("/", (req, res) => {
  res.status(501).json({ error: "POST /recordings not implemented yet" });
});

/**
 * GET /api/v1/recordings/:id
 *
 * Fetch a single recording's metadata. Protected by `requireAuth`;
 * 403 if the recording isn't owned by req.user. No playback URL is
 * returned — there's no server-side copy of the video.
 */
recordingsRouter.get("/:id", (req, res) => {
  res.status(501).json({ error: "GET /recordings/:id not implemented yet" });
});

/**
 * DELETE /api/v1/recordings/:id
 *
 * Delete a recording history entry the current user owns. Protected by
 * `requireAuth`. Just removes the DB row — there's no stored file to
 * clean up.
 */
recordingsRouter.delete("/:id", (req, res) => {
  res.status(501).json({ error: "DELETE /recordings/:id not implemented yet" });
});
