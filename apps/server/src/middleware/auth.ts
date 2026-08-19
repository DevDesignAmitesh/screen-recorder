import type { NextFunction, Request, Response } from "express";

import { verifyAuthToken } from "../lib/jwt.js";

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
 * Reads the auth token from the `Authorization: Bearer <token>` header
 * (issued at signup/login, see routes/auth.routes.ts), verifies +
 * decodes the JWT, and attaches `{ id, email }` to `req.user`. Responds
 * 401 on a missing/invalid/expired token.
 *
 * Apply this to any route that requires a logged-in user (wallpaper
 * upload, template CRUD, recording save/list/delete, etc).
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;

  if (!token) {
    res.status(401).json({ error: "Missing Authorization bearer token" });
    return;
  }

  try {
    const payload = verifyAuthToken(token);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
