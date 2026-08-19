import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 moved the datasource connection URL (and CLI-only config like
// the migrations path) out of schema.prisma and into this file. Runtime
// PrismaClient usage (src/index.ts) configures its own adapter separately
// via @prisma/adapter-pg — this file is read by the `prisma` CLI only
// (generate/migrate/studio), not by the app at runtime.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
