import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/client/client.js";

// Prisma 7 + the "prisma-client" generator (see prisma/schema.prisma) no
// longer reads DATABASE_URL implicitly — the client is handed a driver
// adapter explicitly. @prisma/adapter-pg wraps `pg` (node-postgres),
// which works fine under Bun.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Reuse a single PrismaClient instance across hot-reloads in dev
// (bun --watch) to avoid exhausting Postgres connections.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = global.__prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}

export * from "../generated/client/client.js";
