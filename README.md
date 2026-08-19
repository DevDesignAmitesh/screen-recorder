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
- **S3-compatible storage** (`packages/video-storage`) — wallpaper images
  and exported recordings
- **Resend** via `packages/notifications` — OTP verification email

## Layout

```
apps/
  web/              Next.js app (UI + recording engine)
  server/            Express API
    src/routes/       auth, wallpapers, templates, recordings (skeletons)
    src/middleware/    requireAuth guard (skeleton)
packages/
  db/                Prisma schema + generated client
  notifications/     channel-based OTP sender (email/Resend now, sms/Twilio later)
  video-storage/     S3-compatible bucket wrapper (upload/sign/delete)
```

## Getting started

```bash
docker compose up -d                 # local Postgres (postgres:17-alpine), see docker-compose.yml
bun install
cp .env.example .env                # fill in RESEND_API_KEY, STORAGE_*, JWT_SECRET
cp .env.example packages/db/.env    # DATABASE_URL for the prisma CLI (prisma.config.ts reads it)
cp .env.example apps/server/.env    # DATABASE_URL + everything else for the running API
bun run db:generate                  # generate the Prisma client (packages/db/generated/client)
bun run db:migrate                   # create the Postgres schema
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

## Status

Phase 0 (this scaffold): folder structure + Express route skeletons in place,
nothing implemented yet. See route files in `apps/server/src/routes/` for
what each endpoint will do.
