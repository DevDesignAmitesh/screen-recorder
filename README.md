# Screensy

Windows-friendly screen recorder: screen share + face cam + custom wallpaper
backgrounds, composited and recorded entirely in the browser, with an
account/history layer on top. (Repo/package names still say `screen-recorder`
internally — that's just infrastructure naming, not user-facing.)

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
metadata about each recording (title, duration, when, which wallpaper was
used) so we can show a history and counts — there's no server-side copy of
the video to play back. This keeps v1 free of any cloud storage bill or
file-upload engineering.

Wallpapers, for now, are curated defaults only — static images in
`apps/web/public/wallpapers/`, referenced by URL in the `Wallpaper` table
(seeded via `packages/db/prisma/seed.ts`). Custom wallpaper upload is
deferred — there's no storage service in this codebase; one would need to
be added when that (or a future opt-in "save recording to cloud" feature)
gets picked up.

### No face-cam templates (v1)

There's no template/position picker for the webcam overlay — it's a fixed
circle in the bottom-right corner (see `apps/web/src/lib/recording/compositor.ts`).
Deliberately cut for v1 to keep scope down; the `Template` model/routes
that used to exist for this were removed.

## Layout

```
apps/
  web/
    src/app/           signup, login, dashboard, record (all implemented)
    src/lib/recording/ capture.ts (getDisplayMedia/getUserMedia), compositor.ts
                         (canvas drawing loop), recorder.ts (MediaRecorder wrapper)
  server/
    src/routes/         auth + wallpapers + recordings (all implemented — the
                         only gaps left are GET/DELETE on a single recording)
    src/middleware/     requireAuth guard
    src/lib/            jwt + password hashing helpers
packages/
  common/            shared Zod schemas + inferred types (auth, recordings) — used by both apps/server and apps/web
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

**Phase 0** (scaffold): done.

**Phase 1** (auth): done — signup, login, `/me`, `requireAuth` middleware,
and the corresponding Next.js pages (`/signup`, `/login`, `/dashboard`)
with a token persisted client-side. Forgot-password intentionally deferred.

**Phase 2** (recording engine): done — `/record` page, behind auth. Screen +
webcam + mic capture (webcam/mic always requested together up front so they
can be toggled live), canvas compositor (wallpaper background, padded/
rounded screen frame, fixed circular webcam overlay that's fully removed
— not just blacked out — when the camera's toggled off), countdown,
start/pause/resume/stop, live mute-mic/toggle-camera during recording,
`MediaRecorder` → MP4 where the browser supports encoding it (feature-detected,
falls back to WebM otherwise) → local download, and a single "Download &
save" action that downloads first and only then logs the metadata
(`POST /api/v1/recordings`) — never the other way around. `GET /api/v1/wallpapers`,
`POST /api/v1/recordings`, and `GET /api/v1/recordings` are all real; only
per-recording GET/DELETE are still skeleton stubs. The dashboard renders
the history list.

The compositor's draw loop uses `setInterval`, not `requestAnimationFrame`
— rAF is throttled to effectively paused by the browser when the tab
running the recorder itself is backgrounded (switching tabs mid-recording),
which froze the recorded video while audio (a separate, unaffected
pipeline) kept going. `setInterval` doesn't have that problem.

### How to test Phase 2

1. `docker compose up -d`, `bun run dev` from the repo root. If you only
   changed server code, note `apps/server`'s `dev` script has no
   `--watch` — restart that process manually to pick up changes.
2. Sign up / log in, then go to `/dashboard` → "New recording".
3. Pick a wallpaper (a checkmark badge shows which one's selected), leave
   face cam + mic checked, click "Choose what to share" — pick a
   **different window or your whole screen**, not this tab (sharing this
   tab causes an infinite mirror effect — the app can hint the picker
   toward "Entire Screen" but can't fully prevent this).
4. Confirm the live preview: wallpaper behind a rounded screen-share
   frame, your face in a circle bottom-right.
5. Try switching to another tab mid-preview/recording and back — video
   should keep updating, not freeze.
6. "Start recording" → 3-2-1 countdown → recording (timer). Try "Turn
   camera off" (circle should disappear entirely, not just go black) and
   "Mute mic", then turn them back on. Try Pause/Resume.
7. "Stop" → give it a title → "Download & save" — confirm the file
   downloads (as `.mp4` if your browser supports MediaRecorder-to-MP4,
   otherwise `.webm`) and check the row landed:
   `docker exec screen-recorder-postgres psql -U postgres -d screen_recorder -c 'SELECT * FROM "Recording";'`
8. Back on `/dashboard`, confirm the recording shows up in the history list.

Known rough edges to expect: no template/position choice (fixed bottom-right
circle), no system/tab audio mixing (mic only), can't fully prevent
self-capture (only hinted against).
