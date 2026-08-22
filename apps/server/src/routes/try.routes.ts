import { prisma } from "@screen-recorder/db";
import { Router } from "express";

export const tryRouter: Router = Router();

// Anonymous per-device recording tracking for the no-account product — see
// apps/web/src/app/page.tsx and lib/device-id.ts. Deliberately not tied to
// auth/User at all; the whole point is it works with no account.
//
// This started out gating a single one-trial-per-device try-before-you-buy
// flow (see the commented-out block below) — the product is now just "the
// recorder", so /track is pure counting: every finished recording adds one
// row, and row count per deviceId is however many videos that device has
// made. Nothing here ever blocks a recording.

const MAX_DEVICE_ID_LENGTH = 100;

/**
 * POST /api/v1/try/track
 *
 * Logs one recording having finished for this device — always creates a
 * new row, never blocks. Row count per deviceId = videos created.
 */
tryRouter.post("/track", async (req, res) => {
  const deviceId = req.body?.deviceId;
  if (typeof deviceId !== "string" || deviceId.length === 0 || deviceId.length > MAX_DEVICE_ID_LENGTH) {
    res.status(400).json({ error: "Invalid deviceId" });
    return;
  }

  // Old one-trial-per-device gate — kept for reference/restore, not deleted:
  // const existing = await prisma.trialAttempt.findFirst({ where: { deviceId } });
  // if (existing) {
  //   res.status(409).json({ error: "already-tried" });
  //   return;
  // }

  await prisma.trialAttempt.create({ data: { deviceId } });
  res.status(201).json({ ok: true });
});

/**
 * GET /api/v1/try/status?deviceId=...
 *
 * Read-only count of how many recordings this device has logged. Not
 * called by the main page's happy path today — kept for a possible future
 * "you've made N recordings" display.
 */
tryRouter.get("/status", async (req, res) => {
  const deviceId = req.query.deviceId;
  if (typeof deviceId !== "string" || deviceId.length === 0 || deviceId.length > MAX_DEVICE_ID_LENGTH) {
    res.status(400).json({ error: "Invalid deviceId" });
    return;
  }

  // Old boolean "already used their one trial?" shape — kept for
  // reference/restore, not deleted:
  // const existing = await prisma.trialAttempt.findFirst({ where: { deviceId } });
  // res.status(200).json({ alreadyTried: existing !== null });

  const count = await prisma.trialAttempt.count({ where: { deviceId } });
  res.status(200).json({ count });
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

/**
 * GET /api/v1/try/devices?key=...
 *
 * Every device id that's made a recording, with how many — same
 * shared-secret guard as /stats. Highest-count device first.
 */
tryRouter.get("/devices", async (req, res) => {
  const key = req.query.key;
  const expected = process.env.TRY_STATS_KEY;
  if (!expected || key !== expected) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const grouped = await prisma.trialAttempt.groupBy({
    by: ["deviceId"],
    _count: { deviceId: true },
    orderBy: { _count: { deviceId: "desc" } },
  });

  res.status(200).json({
    devices: grouped.map((g) => ({ deviceId: g.deviceId, count: g._count.deviceId })),
  });
});
