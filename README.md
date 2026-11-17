# EVERLINK

**Connect Beyond Boundaries.**

Everlink is a full-stack global social network: public marketing pages, email/password accounts with 2FA, profiles, a media feed, people discovery, a country hub map, Random Connect, realtime messaging, communities, 24-hour Moments, live rooms over WebRTC, notifications, and a staff dashboard.

This repository contains a working Next.js 15 application backed by PostgreSQL and Prisma. It was built to run locally without paid third-party services. Features that need external credentials (SMTP, a translation provider, hosted Redis, TURN) are documented honestly and degrade to clear errors or local fallbacks instead of pretending to work.

---

## Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 15.5 App Router, React 19, TypeScript strict |
| Styling | Tailwind CSS 3.4, custom shadcn-style primitives, lucide-react |
| Server | Custom Node HTTP server (`server.mjs`) with Socket.IO attached |
| Database | PostgreSQL 16 + Prisma 6 (`prisma/schema.prisma`, ~30 models) |
| Auth | Argon2id, database sessions with SHA-256 token hashes, TOTP 2FA (AES-256-GCM at rest) |
| Validation | Zod v3, shared request schemas in `src/lib/validation.ts` |
| Realtime | Socket.IO (presence, messages, typing, read receipts, Random Connect, live signaling) |
| Media | Local disk storage with MIME and magic-byte validation |
| Tests | Vitest 3 (unit, API security, database integration) |

---

## Quick start

Requirements: Node.js 20+ and PostgreSQL 14+ (16 recommended).

```bash
# 1. Install dependencies (also runs prisma generate)
npm install

# 2. Create your environment file
cp .env.example .env
# Edit DATABASE_URL, AUTH_SECRET and ENCRYPTION_KEY (see the comments in the file)

# 3. Create the schema and development seed
npx prisma migrate deploy
npm run db:seed

# 4. Start the app (custom server + Socket.IO)
npm run dev
```

Open http://localhost:3000.

### Local TURN relay for live rooms

The repository includes a small UDP TURN relay for development. Set `TURN_EMBEDDED="true"` and matching `TURN_USERNAME`, `TURN_CREDENTIAL`, `TURN_URLS` in `.env`; `npm run dev` and `npm start` will start it on UDP 3478. To run it separately, use `npm run turn:start`. Use one or the other, not both, because they bind the same port. The browser reaches the relay at the address in `TURN_URLS`, so use `127.0.0.1` for a single machine or the LAN address for other devices.

Production deployments should use coturn or a hosted TURN service. See `docs/DEPLOYMENT.md` section 9.

### Portable PostgreSQL helper (Windows, this checkout)

This workspace includes `scripts/pg.mjs`, which manages a local PostgreSQL cluster in `.pgdata`:

```bash
npm run db:start    # starts on port 5433 by default
npm run db:status
npm run db:stop
```

It expects PostgreSQL binaries at `C:\tools\pgsql\bin`. Override with `PG_BIN` and `PG_PORT`. Point `DATABASE_URL` at the same port, for example:

```text
postgresql://postgres@localhost:5433/everlink?schema=public
```

### Portable Redis helper (Windows, this checkout)

`scripts/redis.mjs` manages a local Redis server for shared rate limits, Socket.IO events, and presence across app instances:

```bash
npm run redis:start    # listens on 127.0.0.1:6379
npm run redis:status
npm run redis:stop
```

It expects `redis-server.exe` at `C:\tools\redis` and uses `.redisdata` for data. Override with `REDIS_BIN` and `REDIS_PORT`, then set `REDIS_URL="redis://127.0.0.1:6379"`. Without Redis the app still runs, but rate limits and realtime state stay inside one process.

### Local LibreTranslate (Windows, this checkout)

`npm run lt:start` runs a self-hosted LibreTranslate API on `http://127.0.0.1:5000` with the Tagalog and English Argos models. This is the recommended free setup for Tagalog; MyMemory returns unreliable results for it.

One-time setup:

```bash
winget install --id Python.Python.3.12 -e --scope user
"$LOCALAPPDATA/Programs/Python/Python312/python.exe" -m venv C:/tools/libretranslate-venv
C:/tools/libretranslate-venv/Scripts/python.exe -m pip install "libretranslate==1.9.6"
```

Then set:

```text
TRANSLATION_PROVIDER="libretranslate"
TRANSLATION_BASE_URL="http://127.0.0.1:5000"
TRANSLATION_API_KEY=""
```

The first `npm run lt:start` downloads the Argos models (a few hundred MB) into `%LOCALAPPDATA%\argos-translate\packages`. Use `npm run lt:status` and `npm run lt:stop`. Override the binary or loaded languages with `LT_BIN` and `LT_LOAD_ONLY` (comma-separated codes). Only loaded languages can be translated, so add more codes if you need other pairs. Logs go to `libretranslate.log`.

### Development seed accounts

The seed is for development only and refuses to run in production. Run `npm run db:seed` against a local database to create sample people, posts, reports and communities. Never seed a production database. The production database that ships with this project has no demo users.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Custom server in development mode with HMR and Socket.IO |
| `npm run build` | Production build (`next build`) |
| `npm start` | Production server (`node server.mjs` with `NODE_ENV=production`) |
| `npm test` | Vitest unit, security and database integration tests |
| `npm run test:watch` | Vitest in watch mode |
| `npm run db:migrate` | Create and apply a development migration |
| `npm run db:deploy` | Apply committed migrations |
| `npm run db:seed` | Insert development data |
| `npm run db:studio` | Prisma Studio |
| `npm run db:start` / `db:stop` / `db:status` | Portable local PostgreSQL helper |
| `npm run turn:start` | Standalone local TURN relay (UDP 3478) for live rooms |
| `npm run redis:start` / `redis:stop` / `redis:status` | Portable local Redis helper for shared rate limits and multi-instance realtime |
| `npm run lt:start` / `lt:stop` / `lt:status` | Local LibreTranslate API on 127.0.0.1:5000 with Tagalog and English models |

---

## Feature status

### Implemented and exercised against the running app

- **Public site**: landing page, features, about, help, contact form, privacy, terms, community guidelines.
- **Accounts**: registration with age gate (13+), Argon2id passwords, passwordless email sign-in codes, email verification, password reset, login, logout, session listing and revocation, account deactivation and data export.
- **Two-factor authentication**: TOTP setup with QR code, recovery codes, challenge at login, disable with password or recovery code.
- **Profiles**: display name, bio, avatar and cover uploads, country, website, pronouns, interests, languages, follow/friends, privacy controls.
- **Feed**: text, image, video, link and poll posts; public, followers and community audiences; reactions, threaded comments, reposts, bookmarks, reports, hashtags; for-you, following, latest and bookmarks tabs; cursor pagination.
- **Discovery**: people suggestions, search across people/posts/communities/hashtags, trending hashtags, follow suggestions.
- **World**: natural-earth map rendered with d3-geo, country hubs with people, communities and posts, activity totals.
- **Random Connect**: opt-in queue, topic and language preferences, age-safe matching (adults with adults, minors within 2 years), blocks respected, hourly limits and cooldown, realtime match notification, auto-created conversation.
- **Messaging**: direct and group conversations, attachments, replies, typing indicators, delivery and read receipts, unread counts, presence, mute/archive, realtime via Socket.IO. With `REDIS_URL`, the Socket.IO Redis adapter and shared presence carry events across app instances.
- **Language Bridge**: server-side translation endpoint with MyMemory, LibreTranslate and Google adapters. Source language is detected locally (script heuristics plus tinyld), credentials stay on the server, and without configuration the endpoint returns HTTP 503, never fake text. The bundled local LibreTranslate setup (Tagalog and English models) was exercised against the running app and returns correct results for short Tagalog phrases. Only the language models you load are available. MyMemory is free and keyless but unreliable for Tagalog; prefer local LibreTranslate or Google when quality matters.
- **Communities**: create (public, private, restricted), join/request/invite, member roles (owner, admin, moderator, member), house rules, events, community feed, invite management, join requests, leave/remove.
- **Moments**: 24-hour text, image and video stories with audience choices, viewer list, reactions and replies.
- **Live rooms**: public or private rooms, invitations, WebRTC mesh with STUN and optional TURN relay, camera/mic toggles, participant list, live chat, host controls (mute, promote, end). The bundled relay was verified with a TURN allocation inside the configured port range.
- **Notifications**: persistent notifications with preferences, deduplication, realtime badge updates, mark read/all read, and browser push through VAPID/Web Push. The server-to-push-service path was exercised against Windows Push Notification Service; actual display depends on device permission and OS settings.
- **Admin dashboard** (`/admin`, staff only): overview metrics, user management (suspend, restore, verify, roles), post removal, report queue with resolution notes, community suspension, moderation history, audit log, analytics (30-day series, top countries, communities, hashtags), registration setting.
- **Security**: origin checks on state-changing API calls, per-bucket rate limits, HttpOnly SameSite session cookies, hashed session and recovery tokens, upload magic-byte checks, audit logging, RBAC enforced on every admin route.
- **Tests**: 47 Vitest tests covering validation contracts, API error envelopes, origin checks, rate limiting, utility logic, and database constraints/cascades.

### Works, but needs configuration for production

| Capability | Requirement | Behavior without configuration |
| --- | --- | --- |
| Email delivery | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Verification/reset links and sign-in codes are written to `storage/mail/outbox.log` and the dev console. The register and resend endpoints also return the verification link to the signed-in account owner so a local or self-hosted instance can be activated without mail. That link does not prove email ownership; configure SMTP before opening registration to the public. For local development, `winget install axllent.mailpit` and SMTP at `127.0.0.1:1025` gives a real inbox at `http://127.0.0.1:8025`. |
| Language Bridge | `TRANSLATION_PROVIDER` plus base URL and key when required, and a running service with the needed language models | `/api/v1/translate` returns `503 TRANSLATION_NOT_CONFIGURED`; returns `502` when the configured service is unreachable or the language pair is not loaded |
| Browser push | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | The settings toggle reports that push is unavailable and no push is sent |
| Distributed rate limits | `REDIS_URL` | Shared fixed-window limiter when Redis is reachable; in-process limiter otherwise |
| Live rooms across restrictive NATs | `TURN_URLS`, `TURN_USERNAME`, `TURN_CREDENTIAL`; optional built-in relay via `TURN_EMBEDDED=true` | STUN-only connectivity; some corporate/mobile networks may fail to connect |
| Multiple app instances | `REDIS_URL` plus sticky sessions at the proxy | Socket.IO events, presence and rate limits cross instances through Redis; the Random Connect queue stays per-process |

### Not implemented in this build

- **OAuth social sign-in** (Google/GitHub). Email/password plus TOTP is the supported sign-in path.
- **S3-compatible object storage.** Uploads are stored on local disk. `S3_*` variables are intentionally absent because no S3 code path exists.
- **Maintenance mode and scheduled publishing.** Both were removed from the interface rather than pretending to work. Registration can still be closed, and posts publish immediately.
- **Native mobile apps.** Everlink is a responsive web app. Browser push works on HTTPS and localhost, but there is no iOS or Android package.

---

## Project layout

```text
server.mjs                  Custom HTTP server, attaches Socket.IO
server/realtime.mjs         Realtime auth, presence, messaging, live signaling
prisma/schema.prisma        Data model and enums
prisma/seed.ts              Development-only seed
src/app/(marketing)/        Public pages
src/app/(auth)/             Login, register, verify, reset, onboarding
src/app/(app)/              Signed-in application shell and pages
src/app/(app)/admin/        Staff dashboard pages
src/app/api/v1/             Versioned REST API
src/components/             UI primitives and feature components
src/lib/                    Auth, queries, validation, API helpers, integrations
src/server/                 Queue/matching and domain services
tests/                      Vitest unit, security and integration tests
docs/                       API, security and deployment documentation
```

---

## Documentation

- [API reference](docs/API.md)
- [Security model](docs/SECURITY.md)
- [Deployment guide](docs/DEPLOYMENT.md)

---

## Known constraints

- Presence, Socket.IO delivery and live-room signaling are shared through Redis when `REDIS_URL` is set. The Random Connect queue and in-memory throttles remain per-process, so run a single instance for matching or add a shared queue.
- The development seed must never be run against production data.
- `next build` needs a reachable database only if you prerender database-backed pages. Every signed-in route is `force-dynamic`, and the build in this repository completes without prerendering them.
- Live video requires a secure context (HTTPS or `localhost`) for camera and microphone access.
- LibreTranslate translates only the language models that are loaded. The local helper loads `en` and `tl`; set `LT_LOAD_ONLY` to add more languages.
