# Security Model

This document describes what Everlink protects, how, and where the remaining risks are. It reflects the code in this repository, not aspirations.

## Secrets and configuration

- `AUTH_SECRET` signs and hashes security-relevant values. Generate it with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.
- `ENCRYPTION_KEY` is a 32-byte hex key used to encrypt TOTP secrets at rest with AES-256-GCM.
- Never commit `.env`. Only `.env.example` is tracked, and it contains placeholders.
- Provider credentials (SMTP, translation, Redis) are read on the server only. No integration key is ever sent to the browser.
- Startup does not currently validate that these secrets are present. **Operators must set `AUTH_SECRET`, `ENCRYPTION_KEY`, and `APP_URL` before deployment.**

## Authentication

- Passwords are hashed with Argon2id (`@node-rs/argon2`, 19 MiB memory, 2 iterations, 1 lane, 32-byte output). Plaintext passwords are never logged or stored.
- Sessions are random 32-byte tokens in an `HttpOnly`, `SameSite=Lax`, `Secure`-in-production cookie. Only a SHA-256 hash of the token is stored in the database, so a database leak does not expose usable sessions.
- Sessions expire after 30 days, are revoked on password reset, suspension, and explicit logout. Users can review and revoke sessions in Settings.
- Onboarding is required before most actions. Posting, commenting, messaging and community creation require a verified email.
- Login attempts are limited per IP and per email (8 attempts per 15 minutes per email).
- Login errors do not reveal whether an email exists. Forgot-password always returns the same response.

## Two-factor authentication

- TOTP secrets are encrypted at rest with AES-256-GCM using `ENCRYPTION_KEY`.
- Enrollment requires a valid code before enabling. Ten recovery codes are generated, displayed once, and stored only as SHA-256 hashes.
- A recovery code is removed after use. Disabling 2FA requires the account password or a valid recovery code.
- Pending 2FA sessions cannot access authenticated resources until the challenge is completed.

## Authorization and RBAC

- Every route resolves the session on the server (`requireApiUser`, `requireVerifiedApiUser`, `requireStaffApi`, `requireAdminApi`). Client state is never trusted.
- Three roles: `USER`, `MODERATOR`, `ADMIN`. Staff pages redirect non-staff to `/home`. Admin-only mutations reject moderators with `403` and are verified by tests.
- Resource ownership, membership, privacy and block relationships are checked inside each route. Private profiles, private communities and private live rooms are filtered server-side.
- Staff cannot suspend themselves, and only administrators can change roles or suspend another administrator.
- Suspension revokes all sessions for the target account.

## CSRF and cross-origin protection

- Session cookies are `SameSite=Lax`.
- State-changing API requests that include an `Origin` header are checked against `Host` and `APP_URL`. Mismatches return `403`.
- Requests without an `Origin` header (for example, server-to-server or some native clients) are allowed, which is standard for cookie-plus-origin defense but means the protection depends on browsers sending `Origin` on cross-site writes. Keep `APP_URL` correct in production.

## Rate limiting and abuse controls

- A fixed-window limiter runs per IP and bucket. Login, registration, password reset, uploads, reports, Random Connect and admin actions have dedicated limits.
- With `REDIS_URL` set, limits are shared across instances. Without it, limits are per process.
- Random Connect enforces an hourly match cap, a cooldown, previous-partner avoidance, and blocks in both directions.
- Uploads are limited by kind (image, video, audio, file) and validated by both declared MIME type and magic bytes. Files with mismatched content are rejected.
- Uploaded filenames are generated UUIDs. Path traversal is rejected when serving stored files, and private files require an authorized session.

## Data protection

- Notifications and messages respect user preferences and block relationships.
- Account deletion anonymizes the login identifiers, replaces the password hash, revokes sessions, soft-deletes authored content, and removes social graph rows. A JSON export is available before deletion.
- Audit logs and moderation actions record staff decisions. They are readable by all staff in `/admin/moderation`.
- The development seed creates demo accounts and content. It is guarded to refuse production execution.

## HTTP and browser hardening

`next.config.ts` sets:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(self), microphone=(self), geolocation=()`

`X-Powered-By` is disabled. React escapes rendered text, and link URLs in posts are constrained to `http(s)` by validation.

## Known gaps and operational requirements

These are honest limitations, not hidden behavior:

1. **No Content-Security-Policy.** Add one at the reverse proxy for production, including `connect-src` for your Socket.IO origin.
2. **No OAuth provider support.** Do not advertise social login.
3. **TURN is optional.** WebRTC defaults to a public STUN server. Set `TURN_URLS`, `TURN_USERNAME` and `TURN_CREDENTIAL` for networks that require relay. Without TURN, strict corporate and mobile NATs will fail to connect.
4. **Socket.IO runs in-process.** Multi-instance deployment needs the Redis adapter and sticky sessions. Presence and the Random Connect queue are also process-local.
5. **Local disk uploads.** Back up `storage/uploads`. There is no S3 code path. Serving uploads from an app server is acceptable for a small deployment but use a CDN in front of it at scale.
6. **No malware scanning.** Magic-byte checks prevent obvious spoofing, not malicious payloads. Scan uploads if you accept files from untrusted users at scale.
7. **No automated alerting.** Audit logs and API errors are written to the server console and database, but there is no pager or SIEM integration.
8. **SMTP delivery is optional.** Without SMTP, verification and reset links are only written to the local outbox. The register and resend endpoints also return the verification link to the signed-in account owner so a self-hosted instance without mail can still be activated, but that link does not prove email ownership. Password reset links are returned in the response only when `DEMO_MODE=true` (or outside production), because that endpoint is unauthenticated and returning a reset token publicly would allow account takeover. Configure SMTP before opening registration to the public.
9. **Registration toggle is the only site-wide switch.** There is no maintenance mode. Closing registration is enforced server-side in the register route.
10. **No automated dependency or container scanning in CI.** Run `npm audit` and pin updates as part of your release process.

## Reporting a vulnerability

Do not open a public issue with exploit details. Contact the maintainer privately and include reproduction steps. Rotate `AUTH_SECRET` and `ENCRYPTION_KEY` if you suspect they were exposed; rotating `ENCRYPTION_KEY` invalidates existing TOTP enrollments.
