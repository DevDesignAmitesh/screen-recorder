import { loginSchema, signupSchema } from "@screen-recorder/common";
import { prisma } from "@screen-recorder/db";
import { Router } from "express";

import { signAuthToken } from "../lib/jwt.js";
import { requireAuth } from "../middleware/auth.js";
import { hashPassword, verifyPassword } from "../lib/password.js";

export const authRouter: Router = Router();

/**
 * POST /api/v1/auth/signup
 *
 * Create a new account with email + password and log the user in
 * immediately — no email verification step (kept deliberately simple
 * for v1).
 */
authRouter.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  const { email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({ data: { email, passwordHash } });

  const token = signAuthToken({ sub: user.id, email: user.email });
  res.status(201).json({ token, user: { id: user.id, email: user.email } });
});

/**
 * POST /api/v1/auth/login
 *
 * Authenticate with email + password and issue an auth token.
 */
authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ error: "User not found please create account" });
    return;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = signAuthToken({ sub: user.id, email: user.email });
  res.status(200).json({ token, user: { id: user.id, email: user.email } });
});

/**
 * POST /api/v1/auth/logout
 *
 * Stateless JWT — there's nothing to invalidate server-side yet. The
 * client just discards the token. Kept as a real endpoint so a future
 * session/refresh-token table has somewhere to plug in revocation.
 */
authRouter.post("/logout", (_req, res) => {
  res.status(200).json({ message: "Logged out" });
});

/**
 * GET /api/v1/auth/me
 *
 * Return the currently authenticated user's profile. Protected by
 * requireAuth — req.user is populated by then.
 */
authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.status(200).json({ user: { id: user.id, email: user.email } });
});
