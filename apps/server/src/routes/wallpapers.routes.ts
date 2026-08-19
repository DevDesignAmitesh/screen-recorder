import { Router } from "express";

export const wallpapersRouter: Router = Router();

/**
 * GET /api/v1/wallpapers
 *
 * List wallpapers available to the current user:
 *   1. Default/curated wallpapers (isDefault: true, shared by everyone).
 *   2. This user's own uploaded wallpapers (ownerId: req.user.id).
 * Public defaults should be visible even to logged-out users; combine
 * with req.user (if present) to also include their custom ones.
 */
wallpapersRouter.get("/", (req, res) => {
  res.status(501).json({ error: "GET /wallpapers not implemented yet" });
});

/**
 * POST /api/v1/wallpapers
 *
 * Upload a custom wallpaper image. Protected by `requireAuth`.
 *   1. Accept a multipart image upload (multer or similar), validate
 *      type/size (e.g. png/jpg/webp, capped at a few MB).
 *   2. Upload the file via @screen-recorder/video-storage (S3-compatible
 *      bucket, under a per-user prefix like `wallpapers/{userId}/...`).
 *   3. Create a Wallpaper row (ownerId, url/key, isDefault: false).
 *   4. Respond 201 with the created wallpaper record.
 */
wallpapersRouter.post("/", (req, res) => {
  res.status(501).json({ error: "POST /wallpapers not implemented yet" });
});

/**
 * DELETE /api/v1/wallpapers/:id
 *
 * Delete a wallpaper the current user owns. Protected by `requireAuth`.
 *   1. Look up the wallpaper by id; 404 if missing.
 *   2. 403 if it doesn't belong to req.user (or is a default wallpaper).
 *   3. Delete the object from S3 via @screen-recorder/video-storage,
 *      then delete the DB row.
 */
wallpapersRouter.delete("/:id", (req, res) => {
  res.status(501).json({ error: "DELETE /wallpapers/:id not implemented yet" });
});
