import cors from "cors";
import express, { type Express } from "express";

import { authRouter } from "./routes/auth.routes.js";
import { recordingsRouter } from "./routes/recordings.routes.js";
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

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/wallpapers", wallpapersRouter);
app.use("/api/v1/recordings", recordingsRouter);
