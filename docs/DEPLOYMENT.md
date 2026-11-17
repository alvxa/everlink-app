# Deployment Guide

Everlink runs as a single Node process serving Next.js and Socket.IO together. The steps below describe a realistic single-instance deployment, followed by what must change before scaling out.

## 1. Prerequisites

- Node.js 20 or newer (tested on Node 22).
- PostgreSQL 14 or newer. A managed instance is recommended.
- A reverse proxy with TLS termination (Nginx, Caddy, or a cloud load balancer).
- Persistent disk for `storage/uploads` and, if SMTP is not configured, `storage/mail`.

## 2. Environment

Copy `.env.example` to `.env` on the server and set at minimum:

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Use `?schema=public` and TLS parameters your provider requires. |
| `APP_URL` | Yes | Public HTTPS origin. Used in emails, metadata and origin checks. |
| `AUTH_SECRET` | Yes | Long random string. Rotating it invalidates pending tokens. |
| `ENCRYPTION_KEY` | Yes | 64 hex characters. Rotating it invalidates existing TOTP enrollments. |
| `PORT` | No | Defaults to `3000`. The process binds it directly. |
| `HOSTNAME` | No | Defaults to `localhost`. Set `0.0.0.0` when running in a container or VM behind a proxy. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Strongly recommended | Without SMTP, verification and reset links go only to the local outbox. |
| `REDIS_URL` | Optional | Shared rate limits, Socket.IO events and presence across processes. |
| `TRANSLATION_PROVIDER`, `TRANSLATION_API_KEY`, `TRANSLATION_BASE_URL` | Optional | Without a provider, `/api/v1/translate` returns 503. |

Generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Set `NODE_ENV=production` for the running process. Session cookies become `Secure` in production, so the site must be served over HTTPS.

## 3. Database

```bash
npm ci
npx prisma migrate deploy
```

Do not run `npm run db:seed` in production. The seed is development-only and refuses to execute with `NODE_ENV=production`.

Create a database backup schedule before launch. At minimum, take nightly logical dumps and test a restore.

## 4. Build and start

```bash
npm run build
npm start
```

`npm start` runs `node server.mjs` with `NODE_ENV=production`. The custom server is required: it mounts Socket.IO on the same port and handles the Next.js request handler plus WebSocket upgrades.

Using a process manager:

```bash
pm2 start server.mjs --name everlink --update-env
pm2 save
```

Or a systemd unit that runs `node /srv/everlink/server.mjs` with `WorkingDirectory=/srv/everlink`, `EnvironmentFile=/srv/everlink/.env`, and a restart policy.

## 5. Reverse proxy and WebSockets

The proxy must forward both HTTP and WebSocket traffic to the Node port. Example Nginx server block:

```nginx
server {
  listen 443 ssl http2;
  server_name everlink.example.com;

  ssl_certificate     /etc/letsencrypt/live/everlink.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/everlink.example.com/privkey.pem;

  client_max_body_size 100m;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 600s;
  }
}
```

Notes:

- `client_max_body_size` must exceed your largest allowed upload (see `UPLOAD_LIMITS` in `src/lib/constants.ts`).
- Do not cache `/api/*` or the Socket.IO endpoints.
- Set `APP_URL` to the exact public origin so origin checks accept legitimate writes.

## 6. Storage and backups

- Uploads are written to `storage/uploads` on local disk. Mount a persistent volume and include it in backups.
- Serve the app from one machine or share the uploads directory across instances. A CDN can be placed in front of `/api/v1/files/*` for public assets.
- There is no S3 code path in this build. Do not set S3 variables expecting them to work.

## 7. Email

Configure SMTP before opening registration. Verify delivery by registering a test account and completing the verification link. Without SMTP, `storage/mail/outbox.log` grows and the register/resend API responses return the verification link to the account owner so a self-hosted instance can still be activated. That fallback does not prove email ownership, so do not rely on it for public signups.

Local development uses Mailpit: `winget install axllent.mailpit`, run `mailpit`, then set `SMTP_HOST=127.0.0.1` and `SMTP_PORT=1025`. Messages and passwordless sign-in codes appear at `http://127.0.0.1:8025`.

Most providers require a verified sending domain and may throttle new senders. Warm up the domain gradually.

## 8. Translation (optional)

Set one of:

- `TRANSLATION_PROVIDER=libretranslate` with `TRANSLATION_BASE_URL` pointing at a LibreTranslate service, and `TRANSLATION_API_KEY` only when that service requires one. Self-hosting is the free option with usable Tagalog output. On this Windows checkout, `npm run lt:start` runs a local service on `http://127.0.0.1:5000` with the `en` and `tl` models; see the README for the one-time Python setup. In production, run LibreTranslate as its own service (the official Docker image or a Python venv) and load the languages you need. Only loaded models are translated; missing pairs return `502`.
- `TRANSLATION_PROVIDER=mymemory` with no key. Free daily character quota; the API returns `429 TRANSLATION_QUOTA_EXCEEDED` when exhausted. Source detection runs locally (script heuristics plus tinyld) because MyMemory rejects `AUTO`. MyMemory is crowd-sourced and returns unreliable Tagalog, so use LibreTranslate or Google when output quality matters.
- `TRANSLATION_PROVIDER=libretranslate` against a hosted instance with `TRANSLATION_API_KEY` when the operator requires a key.
- `TRANSLATION_PROVIDER=google` with `TRANSLATION_API_KEY`. Best quality, requires billing.

Without configuration the feature is visible but returns a clear 503. This is intentional; no fake translations are produced. Translation results are cached per post, comment, message or story, so changing providers does not rewrite previously cached text.

## 9. Live rooms (TURN)

Set STUN and TURN through environment variables read on the server and passed to the browser:

- `STUN_URLS` defaults to `stun:stun.l.google.com:19302`. Comma-separated values are accepted.
- `TURN_URLS`, `TURN_USERNAME`, `TURN_CREDENTIAL` enable relay for strict NATs.

TURN credentials are exposed to browsers by design, so use short-lived credentials from your TURN provider.

### Built-in relay (development and single-node deployments)

The repository includes a UDP TURN relay powered by `node-turn`:

- `TURN_EMBEDDED="true"` starts it inside `server.mjs`.
- `npm run turn:start` runs it as a separate process. Do not use both at once; they bind the same port.
- `TURN_PORT` (default 3478), `TURN_REALM`, `TURN_MIN_PORT` and `TURN_MAX_PORT` (default 49160-49200) control the listener and relay range.
- `TURN_LISTEN_IPS` optionally restricts bind addresses; empty means every interface.
- `TURN_EXTERNAL_IP` sets the advertised relay address when the host sits behind NAT.

Open UDP 3478 and the relay range on the host firewall. The bundled relay is UDP only and intended for development or a small single-node deployment. It is not a replacement for coturn under load.

Verify the relay from the app host after restarting the server:

- `GET /api/v1/admin/settings` should return `"turnConfigured": true`.
- Log in as staff and open `/admin/settings`; the Live relay (TURN) row should show configured.
- A TURN Allocate request with the configured long-term credentials should return success and a relay address inside the configured port range.

### coturn (production)

Run coturn on a Linux host with a public IP:

```conf
listening-port=3478
tls-listening-port=5349
min-port=49160
max-port=49200
realm=everlink.example
lt-cred-mech
user=everlink:<strong-password>
fingerprint
no-cli
no-multicast-peers
# external-ip=<public-ip>/<private-ip>   # when the host is behind 1:1 NAT
# cert=/etc/letsencrypt/live/turn.everlink.example/fullchain.pem
# pkey=/etc/letsencrypt/live/turn.everlink.example/privkey.pem
```

Then set:

```text
TURN_EMBEDDED="false"
TURN_URLS="turn:turn.everlink.example:3478?transport=udp,turn:turn.everlink.example:3478?transport=tcp"
TURN_USERNAME="everlink"
TURN_CREDENTIAL="<same password as coturn>"
```

Open UDP and TCP 3478, the relay range UDP 49160-49200, and TCP 5349 when TLS is enabled. Restrict the relay range in both coturn and the cloud firewall. Prefer short-lived credentials generated by your TURN provider when one is available.

Live media requires HTTPS in production. Camera and microphone permissions are requested by the browser.

## 10. Browser push

Generate a VAPID key pair with `npx web-push generate-vapid-keys` and set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT`. Push delivery requires HTTPS in production; `http://localhost` is treated as a secure context. Users opt in from Settings > Notifications.

## 11. Health and operations

- Liveness: `GET /login` should return `200`.
- Database: `npx prisma migrate status`.
- Logs: API errors are logged with `[api] unhandled error`; mail issues log `[mail]`. Centralize the process output.
- Backups: database nightly, uploads nightly, and keep `.env` in a secrets manager, not in the repository.

## 11. Post-deploy checklist

1. `NODE_ENV=production`, HTTPS reachable, `APP_URL` correct.
2. `AUTH_SECRET` and `ENCRYPTION_KEY` are strong and unique to this environment.
3. Migrations applied and `prisma migrate status` is clean.
4. No seed data in the production database.
5. SMTP verified with a real signup and password reset.
6. A staff account exists with a real email and 2FA enabled.
7. Uploads survive a restart (persistent volume).
8. Backups restore successfully in a staging database.
9. Rate limits behave with and without Redis, depending on your topology.

## 12. Scaling limits

`REDIS_URL` enables the Socket.IO Redis adapter and a shared presence counter, so these work across processes:

- Socket.IO events, including messages, typing, read receipts and live-room signaling.
- Presence online/offline state and the initial online list.
- Rate limits.

Sticky sessions are still required at the proxy for Socket.IO HTTP long-polling. WebSocket-only clients do not need them.

The Random Connect queue and in-memory socket throttles remain per-process. Run matching on a single instance, or extend the queue to Redis before scaling that feature. Uploads are stored on local disk, so instances also need a shared uploads volume or a CDN in front of `/api/v1/files/*`.

For a local Redis on this Windows checkout, see `npm run redis:start` in the README. In production use a managed Redis with persistence and authentication, and set `REDIS_URL` on every instance.

Presence counters live in Redis. Graceful shutdown removes them, but a hard crash can leave a stale online entry until the key expires. Clear `everlink:presence:*` during maintenance if stale presence is visible.

## 13. Rollback

1. Keep the previous release directory and database backup.
2. Stop the process, restore the previous code, run `npx prisma migrate status`.
3. If a migration must be reverted, restore the database from the pre-deploy backup. Prisma migrations are forward-only by default.
4. Start the previous version and verify login, feed, messaging and admin access.
