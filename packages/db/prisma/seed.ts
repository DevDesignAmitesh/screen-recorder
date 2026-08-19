// Seeds the curated default wallpapers (see apps/web/public/wallpapers/).
// Safe to re-run: skips any default wallpaper that already exists by name.
//
// Run with: bun run packages/db/prisma/seed.ts (or `bun run db:seed` from
// the repo root).

import { prisma } from "../src/index.js";

const DEFAULT_WALLPAPERS = [
  { name: "Sunset", url: "/wallpapers/sunset.svg" },
  { name: "Ocean", url: "/wallpapers/ocean.svg" },
  { name: "Violet", url: "/wallpapers/violet.svg" },
  { name: "Forest", url: "/wallpapers/forest.svg" },
  { name: "Midnight", url: "/wallpapers/midnight.svg" },
];

async function main() {
  for (const wallpaper of DEFAULT_WALLPAPERS) {
    const existing = await prisma.wallpaper.findFirst({
      where: { name: wallpaper.name, isDefault: true },
    });
    if (existing) {
      console.log(`skip (already exists): ${wallpaper.name}`);
      continue;
    }
    await prisma.wallpaper.create({
      data: { ...wallpaper, isDefault: true, ownerId: null },
    });
    console.log(`created: ${wallpaper.name}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
