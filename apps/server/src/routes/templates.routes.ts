import { Router } from "express";

export const templatesRouter: Router = Router();

/**
 * GET /api/v1/templates
 *
 * List face-cam layout templates available to the current user:
 *   1. Built-in presets (isDefault: true — e.g. bottom-right circle,
 *      bottom-left rounded square, side strip), shared by everyone.
 *   2. This user's own saved custom templates (ownerId: req.user.id).
 * Each template describes webcam position/shape/size so the client's
 * canvas compositor can apply it directly.
 */
templatesRouter.get("/", (req, res) => {
  res.status(501).json({ error: "GET /templates not implemented yet" });
});

/**
 * POST /api/v1/templates
 *
 * Save a custom template preset. Protected by `requireAuth`.
 *   1. Validate body: { name, position, shape, size, ... }.
 *   2. Create a Template row owned by req.user.id.
 *   3. Respond 201 with the created template.
 */
templatesRouter.post("/", (req, res) => {
  res.status(501).json({ error: "POST /templates not implemented yet" });
});

/**
 * PUT /api/v1/templates/:id
 *
 * Update a template the current user owns. Protected by `requireAuth`.
 *   1. Look up by id; 404 if missing, 403 if not owned by req.user.
 *   2. Validate + apply the partial update, save.
 */
templatesRouter.put("/:id", (req, res) => {
  res.status(501).json({ error: "PUT /templates/:id not implemented yet" });
});

/**
 * DELETE /api/v1/templates/:id
 *
 * Delete a custom template the current user owns. Protected by `requireAuth`.
 * Built-in default templates cannot be deleted this way.
 */
templatesRouter.delete("/:id", (req, res) => {
  res.status(501).json({ error: "DELETE /templates/:id not implemented yet" });
});
