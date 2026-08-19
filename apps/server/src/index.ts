import cors from "cors";
import express from "express";

import { authRouter } from "./routes/auth.routes.js";
import { recordingsRouter } from "./routes/recordings.routes.js";
import { wallpapersRouter } from "./routes/wallpapers.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/wallpapers", wallpapersRouter);
app.use("/api/v1/recordings", recordingsRouter);

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.listen(PORT, () => {
  console.log(`server listening on http://localhost:${PORT}`);
});
