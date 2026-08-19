import cors from "cors";
import express from "express";

import { authRouter } from "./routes/auth.routes.js";
import { recordingsRouter } from "./routes/recordings.routes.js";
import { templatesRouter } from "./routes/templates.routes.js";
import { wallpapersRouter } from "./routes/wallpapers.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// All feature routes are mounted under /api/v1. Route handlers are
// currently skeletons (see each file under src/routes) — they document
// what they'll do via comments and respond 501 until implemented.
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/wallpapers", wallpapersRouter);
app.use("/api/v1/templates", templatesRouter);
app.use("/api/v1/recordings", recordingsRouter);

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.listen(PORT, () => {
  console.log(`server listening on http://localhost:${PORT}`);
});
