import type { NextFunction, Request, Response } from "express";

// Augment Express's Request so downstream handlers can read `req.user`
// once this middleware has run.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

/**
 * requireAuth
 *
 * Skeleton for the auth guard middleware. Once implemented, it will:
 *   1. Read the auth token from the `Authorization: Bearer <token>` header
 *      (issued at login, see routes/auth.routes.ts).
 *   2. Verify + decode the JWT (jsonwebtoken) using the server's secret.
 *   3. On success, attach `{ id, email }` to `req.user` and call `next()`.
 *   4. On missing/invalid/expired token, respond 401 Unauthorized.
 *
 * Apply this to any route that requires a logged-in user (wallpaper upload,
 * template CRUD, recording save/list/delete, etc).
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  res.status(501).json({ error: "requireAuth middleware not implemented yet" });
}
