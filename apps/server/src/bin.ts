import cluster from "cluster";
import os from "os";
import { app } from "./index.js";

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const cpusLength = os.cpus().length

if (process.env.NODE_ENV === "development") {
  app.listen(PORT, () => console.log("code is running at ", PORT));
} else {
  if (cluster.isPrimary) {
    for (let i = 0; i <= cpusLength; i++) {
      cluster.fork();
    }
    cluster.on("exit", () => cluster.fork());
  } else {
    app.listen(PORT, () => console.log("code is running at ", PORT));
  }
}