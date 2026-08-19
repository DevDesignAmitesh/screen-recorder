import { createRecordingSchema } from "@screen-recorder/common";
import { prisma } from "@screen-recorder/db";
import { Router } from "express";

import { requireAuth } from "../middleware/auth.js";

const WALLPAPER_SUMMARY_SELECT = { id: true, name: true, url: true } as const;

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
 * by `requireAuth`. Returns metadata only (title, duration, createdAt,
 * wallpaper used) — there's no video file to link to or play back.
 */
recordingsRouter.get("/", requireAuth, async (req, res) => {
  const recordings = await prisma.recording.findMany({
    where: { ownerId: req.user!.id },
    orderBy: { createdAt: "desc" },
    include: { wallpaper: { select: WALLPAPER_SUMMARY_SELECT } },
  });
  res.status(200).json({ recordings });
});

/**
 * POST /api/v1/recordings
 *
 * Log a finished recording the user just saved locally. Protected by
 * `requireAuth`. No file is attached — the browser already saved the
 * video itself; this just records what happened.
 */
recordingsRouter.post("/", requireAuth, async (req, res) => {
  const parsed = createRecordingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  const { title, duration, wallpaperId } = parsed.data;

  if (wallpaperId) {
    const wallpaper = await prisma.wallpaper.findUnique({ where: { id: wallpaperId } });
    if (!wallpaper) {
      res.status(400).json({ error: "Unknown wallpaperId" });
      return;
    }
  }

  const recording = await prisma.recording.create({
    data: { title, duration, wallpaperId, ownerId: req.user!.id },
  });

  res.status(201).json({ recording });
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
recordingsRouter.delete("/:id", requireAuth, async (req, res) => {
  const recording = await prisma.recording.findUnique({ where: { id: req.params.id } });
  if (!recording) {
    res.status(404).json({ error: "Recording not found" });
    return;
  }
  if (recording.ownerId !== req.user!.id) {
    res.status(403).json({ error: "You don't own this recording" });
    return;
  }

  await prisma.recording.delete({ where: { id: recording.id } });
  res.status(204).send();
});
