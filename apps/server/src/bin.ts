import cluster from "cluster";
import os from "os";
import { app } from "./index.js";

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const cpusLength = os.cpus().length;

// Clustering is disabled by default: the recording-stream feature
// (lib/recording-sessions.ts) keeps in-flight recording chunks in a plain
// in-process Map, which is NOT shared across cluster worker processes —
// each worker has its own heap. With clustering on, a chunk-upload request
// and the later download-and-delete request can land on different workers,
// making sessions silently "disappear". Re-enable clustering (set
// ENABLE_CLUSTER=true) only once that registry is backed by something
// actually shared across processes (Redis, etc).
const clusterEnabled = process.env.ENABLE_CLUSTER === "true" && process.env.NODE_ENV !== "development";

if (clusterEnabled && cluster.isPrimary) {
  for (let i = 0; i <= cpusLength; i++) {
    cluster.fork();
  }
  cluster.on("exit", () => cluster.fork());
} else {
  app.listen(PORT, () => console.log("code is running at ", PORT));
}