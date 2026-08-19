# screen-recorder

Windows-friendly screen recorder: screen share + face cam + custom wallpaper
backgrounds + face-cam templates, composited and recorded entirely in the
browser, with an account/library layer on top.

## Stack

- **Bun** — package manager + JS runtime
- **Turborepo** — monorepo task orchestration
- **TypeScript** everywhere
- **Next.js** (`apps/web`) — frontend + the client-side recording engine
  (screen/webcam capture, canvas compositing, `MediaRecorder`)
- **Express** (`apps/server`) — REST API
- **PostgreSQL + Prisma** (`packages/db`) — data layer
- **Resend** via `packages/notifications` — currently unused; reserved for
  a future forgot-password flow

### Auth (v1)

Deliberately simple: email + password only, no email verification step —
signup creates the account and logs you in immediately. No OTP, no
forgot-password yet (planned as its own later phase).

### Storage model (v1)

Recordings are **never uploaded anywhere** — the browser composites and
records the video client-side and saves it straight to the user's own
filesystem (download / File System Access API). The server only stores
metadata about each recording (title, duration, when, which wallpaper/
template was used) so we can show a history and counts — there's no
server-side copy of the video to play back. This keeps v1 free of any
cloud storage bill or file-upload engineering.

Wallpapers, for now, are curated defaults only — static images in
`apps/web/public/wallpapers/`, referenced by URL in the `Wallpaper` table
(seeded via `packages/db/prisma/seed.ts`). Custom wallpaper upload is
deferred — there's no storage service in this codebase; one would need to
be added when that (or a future opt-in "save recording to cloud" feature)
gets picked up.

## Layout

```
apps/
  web/              Next.js app — auth pages (signup/login/dashboard) + the recording engine (later phases)
  server/            Express API
    src/routes/       auth (implemented), wallpapers/templates/recordings (skeletons)
    src/middleware/    requireAuth guard (implemented)
    src/lib/           jwt + password hashing helpers
packages/
  common/            shared Zod schemas + inferred types (auth, more later) — used by both apps/server and apps/web
  db/                Prisma schema + generated client + default-wallpaper seed
  notifications/     channel-based OTP sender (email/Resend) — unused in v1, reserved for forgot-password later
```

## Getting started

```bash
docker compose up -d                 # local Postgres (postgres:17-alpine), see docker-compose.yml
bun install
cp .env.example .env                # fill in JWT_SECRET
cp .env.example packages/db/.env    # DATABASE_URL for the prisma CLI (prisma.config.ts reads it)
cp .env.example apps/server/.env    # DATABASE_URL + JWT_SECRET for the running API
bun run db:generate                  # generate the Prisma client (packages/db/generated/client)
bun run db:migrate                   # create the Postgres schema
bun run db:seed                      # seed the curated default wallpapers
bun run dev                           # runs apps/web + apps/server via turbo
```

Local Postgres defaults (from `docker-compose.yml`): `postgresql://postgres:postgres@localhost:5432/screen_recorder`.

### Prisma notes (v7)

`packages/db` uses the newer `prisma-client` generator (not the older
`prisma-client-js`) targeting the `bun` runtime, and Prisma 7 no longer
reads the connection string from `schema.prisma` — it lives in
`packages/db/prisma.config.ts` (CLI: generate/migrate/studio) and is passed
explicitly to `PrismaClient` at runtime via `@prisma/adapter-pg` in
`packages/db/src/index.ts`. Both need `DATABASE_URL` in their own process
env (`packages/db/.env` for the CLI, `apps/server/.env` for the running API).

### Workspace packages shipping raw TypeScript

`packages/*` have no build step — they're consumed as source, via a plain
`"exports": { ".": "./src/index.ts" }` in each package's `package.json`
(no `main`/`types` needed — every resolver here reads `exports`). Bun/tsc
resolve that natively, and Turbopack transpiles workspace packages
automatically, so no `transpilePackages` entry is needed in
`apps/web/next.config.ts`. Each package's `src/index.ts` exports everything
directly rather than re-exporting through a `./other-file.js`-style barrel.

## Status

**Phase 0** (scaffold): done — monorepo structure, Express route skeletons.

**Phase 1** (auth): done — signup, login, `/me`, `requireAuth` middleware,
and the corresponding Next.js pages (`/signup`, `/login`, `/dashboard`)
with a token persisted client-side. Forgot-password intentionally deferred.

Wallpapers/templates/recordings routes are still skeletons — see
`apps/server/src/routes/` for what each will do.
