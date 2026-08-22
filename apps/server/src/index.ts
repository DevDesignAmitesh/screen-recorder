import cors from "cors";
import express, { type Express } from "express";

// Auth + recordings are unmounted below — the product is a single no-auth
// record-and-download page now, with nothing to attach a per-account
// history to. Left importable (not deleted) so they're a one-line
// restore if accounts come back.
import { authRouter } from "./routes/auth.routes.js";
import { recordingsRouter } from "./routes/recordings.routes.js";
import { tryRouter } from "./routes/try.routes.js";
import { wallpapersRouter } from "./routes/wallpapers.routes.js";

export const app: Express = express();

app.use(
  cors({
    origin: ["http://localhost:3000", "https://screensy.amitesh.work"], 
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// app.use("/api/v1/auth", authRouter);
app.use("/api/v1/wallpapers", wallpapersRouter);
// app.use("/api/v1/recordings", recordingsRouter);
app.use("/api/v1/try", tryRouter);
