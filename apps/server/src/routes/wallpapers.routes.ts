import { prisma } from "@screen-recorder/db";
import { Router } from "express";

export const wallpapersRouter: Router = Router();

// v1 design note: only curated default wallpapers exist for now (seeded
// via packages/db/prisma/seed.ts, served as static assets from apps/web/public
// and referenced by URL in the Wallpaper table). Custom wallpaper upload
// is deferred to a later phase — it'll need a real storage service
// (there's none in this codebase yet) to hold user-uploaded images.

/**
 * GET /api/v1/wallpapers
 *
 * List the curated default wallpapers. Public — no auth required. Once
 * custom upload ships, this would also merge in the logged-in user's own
 * wallpapers (ownerId: req.user.id) when a valid token is present.
 */
wallpapersRouter.get("/", async (_req, res) => {
  const wallpapers = await prisma.wallpaper.findMany({
    where: { isDefault: true },
    orderBy: { createdAt: "asc" },
  });
  res.status(200).json({ wallpapers });
});

/**
 * POST /api/v1/wallpapers
 *
 * Deferred for v1 — custom wallpaper upload needs a real storage service
 * standing up first (none exists in this codebase yet). Once it does:
 * accept a multipart image upload, validate it, upload it, then create
 * a Wallpaper row (ownerId, url, isDefault: false).
 */
wallpapersRouter.post("/", (req, res) => {
  res.status(501).json({ error: "Custom wallpaper upload isn't available yet" });
});

/**
 * DELETE /api/v1/wallpapers/:id
 *
 * Deferred for v1 along with upload — nothing to delete until users can
 * upload their own wallpapers. Default wallpapers are never deletable
 * via this route.
 */
wallpapersRouter.delete("/:id", (req, res) => {
  res.status(501).json({ error: "Custom wallpaper upload isn't available yet" });
});
