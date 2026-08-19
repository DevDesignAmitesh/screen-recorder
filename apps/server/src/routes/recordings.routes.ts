import { Router } from "express";

export const recordingsRouter: Router = Router();

/**
 * GET /api/v1/recordings
 *
 * List the current user's saved recordings (their library/dashboard).
 * Protected by `requireAuth`. Supports pagination later (?cursor/?limit).
 * Returns metadata (title, duration, createdAt, thumbnail, playback url)
 * — not the raw video bytes.
 */
recordingsRouter.get("/", (req, res) => {
  res.status(501).json({ error: "GET /recordings not implemented yet" });
});

/**
 * POST /api/v1/recordings
 *
 * Save a finished recording to the user's account. Protected by `requireAuth`.
 *   1. Accept the exported video file (multipart) produced client-side
 *      by the canvas/MediaRecorder pipeline, plus metadata (title,
 *      duration, wallpaperId, templateId).
 *   2. Upload the video via @screen-recorder/video-storage to
 *      `recordings/{userId}/...` in the S3-compatible bucket.
 *   3. (Optional) generate/store a thumbnail.
 *   4. Create a Recording row (ownerId, url/key, title, duration,
 *      wallpaperId, templateId).
 *   5. Respond 201 with the created recording record.
 */
recordingsRouter.post("/", (req, res) => {
  res.status(501).json({ error: "POST /recordings not implemented yet" });
});

/**
 * GET /api/v1/recordings/:id
 *
 * Fetch a single recording's details (and a signed playback/download URL
 * from @screen-recorder/video-storage). Protected by `requireAuth`;
 * 403 if the recording isn't owned by req.user.
 */
recordingsRouter.get("/:id", (req, res) => {
  res.status(501).json({ error: "GET /recordings/:id not implemented yet" });
});

/**
 * DELETE /api/v1/recordings/:id
 *
 * Delete a recording the current user owns. Protected by `requireAuth`.
 *   1. Look up by id; 404 if missing, 403 if not owned by req.user.
 *   2. Delete the object from S3 via @screen-recorder/video-storage,
 *      then delete the DB row.
 */
recordingsRouter.delete("/:id", (req, res) => {
  res.status(501).json({ error: "DELETE /recordings/:id not implemented yet" });
});
