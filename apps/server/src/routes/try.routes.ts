import { prisma } from "@screen-recorder/db";
import { Router } from "express";

export const tryRouter: Router = Router();

// Anonymous usage tracking for the no-signup /try page — see
// apps/web/src/app/try/page.tsx and lib/device-id.ts. Deliberately not
// tied to auth/User at all; the whole point is it works with no account.

const MAX_DEVICE_ID_LENGTH = 100;

/**
 * POST /api/v1/try/track
 *
 * Logs one trial recording actually being started — but only the first
 * one per device. One trial per device, ever: a repeat deviceId gets a
 * 409 instead of a new row, and the client treats that as "you've
 * already tried this, sign up for more."
 */
tryRouter.post("/track", async (req, res) => {
  const deviceId = req.body?.deviceId;
  if (typeof deviceId !== "string" || deviceId.length === 0 || deviceId.length > MAX_DEVICE_ID_LENGTH) {
    res.status(400).json({ error: "Invalid deviceId" });
    return;
  }

  const existing = await prisma.trialAttempt.findFirst({ where: { deviceId } });
  if (existing) {
    res.status(409).json({ error: "already-tried" });
    return;
  }

  await prisma.trialAttempt.create({ data: { deviceId } });
  res.status(201).json({ ok: true });
});

/**
 * GET /api/v1/try/status?deviceId=...
 *
 * Read-only check for whether this device has already used its one trial
 * — lets the client gate the whole page up front instead of only finding
 * out after someone's gone through the screen-share picker.
 */
tryRouter.get("/status", async (req, res) => {
  const deviceId = req.query.deviceId;
  if (typeof deviceId !== "string" || deviceId.length === 0 || deviceId.length > MAX_DEVICE_ID_LENGTH) {
    res.status(400).json({ error: "Invalid deviceId" });
    return;
  }

  const existing = await prisma.trialAttempt.findFirst({ where: { deviceId } });
  res.status(200).json({ alreadyTried: existing !== null });
});

/**
 * GET /api/v1/try/stats?key=...
 *
 * Total trial attempts + unique devices. There's no admin/role system in
 * this app, so this is guarded by a shared secret (TRY_STATS_KEY env var)
 * instead — paste the URL with the key into a browser to check numbers.
 */
tryRouter.get("/stats", async (req, res) => {
  const key = req.query.key;
  const expected = process.env.TRY_STATS_KEY;
  if (!expected || key !== expected) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [totalAttempts, distinctDevices] = await Promise.all([
    prisma.trialAttempt.count(),
    prisma.trialAttempt.groupBy({ by: ["deviceId"] }),
  ]);

  res.status(200).json({ totalAttempts, uniqueDevices: distinctDevices.length });
});
