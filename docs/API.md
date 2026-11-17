# Everlink API Reference

Base path: `/api/v1`

All resources are JSON unless noted. Authentication uses the session cookie `everlink_session` set by `POST /api/v1/auth/login`. The cookie is `HttpOnly`, `SameSite=Lax`, and expires after 30 days or when revoked. Sending a bearer token is not supported.

## Conventions

**Success:** `{ ...data }` with an appropriate status (`200`, `201`, or `204` where nothing is returned).

**Errors:** every failure uses one envelope:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Administrator access required.",
    "details": {}
  }
}
```

| Status | Codes you will see |
| --- | --- |
| 400 | `BAD_REQUEST` |
| 401 | `UNAUTHORIZED`, `INVALID_CREDENTIALS` |
| 403 | `FORBIDDEN`, `EMAIL_UNVERIFIED`, `ACCOUNT_SUSPENDED` |
| 404 | `NOT_FOUND` |
| 409 | `CONFLICT` |
| 413 | `FILE_TOO_LARGE` |
| 422 | `VALIDATION_ERROR` (with `details` keyed by field) |
| 429 | `RATE_LIMITED` (with `retryAfterSeconds`) |
| 500 | `INTERNAL` (details are never leaked) |
| 503 | `TRANSLATION_NOT_CONFIGURED` |

**Origin checks:** state-changing requests (`POST`, `PATCH`, `DELETE`) that include an `Origin` header must come from the same host or from `APP_URL`. Cross-origin writes are rejected with `403`.

**Rate limits:** applied per IP and bucket. Auth, upload, admin and messaging buckets are stricter. Responses include `X-RateLimit-Remaining` and `X-RateLimit-Reset` when a limit is enforced.

**Pagination:** list endpoints that paginate use `limit` plus `cursor` and return `{ items, nextCursor }` (posts use `{ posts, nextCursor }`). Pass `cursor` back unchanged. A `null` cursor means the end.

**Authorization:** users only act on their own resources. Staff routes require `MODERATOR` or `ADMIN`; admin-only mutations are marked below. Ownership and privacy are checked on the server, never inferred from the client.

---

## Authentication

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/auth/register` | `username`, `displayName`, `email`, `password`, `dateOfBirth`, `acceptTerms`. Enforces 13+ and the registration setting. Creates a session and sends a verification email. |
| `POST` | `/auth/login` | `email`, `password`. Returns `{ requires2fa: true }` when TOTP is enabled, otherwise sets the session cookie. |
| `POST` | `/auth/email-code/request` | `{ email }`. Emails a single-use 6-digit code. Always returns `{ ok: true }` so account existence is not revealed. |
| `POST` | `/auth/email-code/verify` | `{ email, code }`. Signs in and marks the email verified. Returns `{ requires2fa: true }` when TOTP is enabled. |
| `POST` | `/auth/2fa/challenge` | `code` or recovery code, completes a pending 2FA login. |
| `POST` | `/auth/logout` | Revokes the current session and clears the cookie. |
| `GET` | `/auth/me` | Current user summary. |
| `POST` | `/auth/verify-email` | `{ token }` from the verification email. |
| `POST` | `/auth/resend-verification` | Re-sends the verification email. |
| `POST` | `/auth/forgot-password` | `{ email }`. Always returns success to avoid account enumeration. |
| `POST` | `/auth/reset-password` | `{ token, password }`. Revokes existing sessions. |
| `POST` | `/auth/2fa/setup` | Starts TOTP enrollment, returns secret and QR data URL. |
| `POST` | `/auth/2fa/enable` | `{ code }`. Returns one-time recovery codes. |
| `POST` | `/auth/2fa/disable` | Password or recovery code. |

Example:

```bash
curl -c cookies.txt -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","password":"your-password"}'
```

For local testing, run `npm run db:seed` first to create development accounts. The production database ships without demo users.

---

## Profiles, settings and account

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/users/[username]` | Profile, counts, relationship state, privacy filter. |
| `GET` | `/users/suggestions` | People suggestions; query `q`, `limit`, `sort`. |
| `POST` | `/onboarding` | Completes profile, interests and languages. |
| `GET` / `PATCH` | `/settings` | Account settings. |
| `PATCH` / `POST` | `/settings/profile` | Update profile fields. |
| `POST` | `/settings/password` | Current password plus new password. |
| `GET` | `/settings/sessions` | List active sessions. |
| `DELETE` | `/settings/sessions` | Revoke one (`id`) or all other sessions. |
| `GET` | `/settings/export` | JSON export of the caller's data. |
| `POST` | `/settings/delete` | Deactivates and anonymizes the account. |
| `GET` / `POST` / `DELETE` | `/follows` | Follow, unfollow, and list follow state. |
| `GET` / `POST` / `PATCH` | `/friends` | Friend requests and responses. |
| `GET` / `POST` / `DELETE` | `/blocks` | Block and unblock people. |

---

## Posts, comments and reactions

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/posts` | `mode=for-you\|following\|latest\|bookmarks`, `limit`, `cursor`, optional `community`, `hashtag`, `country`, `search`, `author`. |
| `POST` | `/posts` | Body from `postSchema`: `body`, `type`, `visibility`, `communityId`, `countryCode`, `linkUrl`, `media[]`, `pollOptions[]`. Requires a verified email. |
| `GET` / `PATCH` / `DELETE` | `/posts/[id]` | Read, edit body/visibility, soft delete. Author or staff only for writes. |
| `GET` / `POST` | `/posts/[id]/comments` | Threaded comments (`parentId`). |
| `DELETE` | `/comments/[id]` | Author or staff. |
| `POST` | `/reactions` | `{ targetType: "POST"\|"COMMENT", targetId, type }`. Toggles a reaction. |
| `POST` | `/posts/[id]/bookmark` | Toggle bookmark. |
| `POST` | `/posts/[id]/repost` | Toggle repost. |
| `POST` | `/posts/[id]/poll` | Cast or change a poll vote. |
| `POST` / `GET` | `/reports` | Submit a report (`targetType`, `targetId`, `reason`, `details`); staff can list. |
| `GET` | `/hashtags` | Trending hashtags. |
| `GET` | `/search` | Global search across people, posts, communities, hashtags. |

---

## Communities

| Method | Path | Notes |
| --- | --- | --- |
| `GET` / `POST` | `/communities` | List or create. Creation requires a verified email. |
| `GET` / `PATCH` / `DELETE` | `/communities/[slug]` | Detail, edit (admin/owner), delete (owner). |
| `POST` / `DELETE` | `/communities/[slug]` (join actions) | Join, leave, or request access for restricted communities. |
| `GET` / `PATCH` / `DELETE` | `/communities/[slug]/members` | List members; change roles; remove members. |
| `POST` | `/communities/[slug]/invite` | Invite by username. |
| `GET` / `POST` | `/communities/[slug]/events` | List and create events. |
| `GET` / `PATCH` | `/community-invitations` | List invitations and requests; accept or decline. |

Community feed posts use `GET /posts?community=slug`.

---

## Moments (stories)

| Method | Path | Notes |
| --- | --- | --- |
| `GET` / `POST` | `/stories` | Feed of active stories or create one (`TEXT`, `IMAGE`, `VIDEO`; audience `PUBLIC`, `FOLLOWERS`, `CLOSE_FRIENDS`). |
| `DELETE` | `/stories/[id]` | Author only. |
| `POST` | `/stories/[id]/view` | Record a view. |
| `GET` | `/stories/[id]/viewers` | Author only. |
| `POST` | `/stories/[id]/react` | React to a moment. |
| `POST` | `/stories/[id]/reply` | Reply, delivered as a direct message. |

Moments expire 24 hours after creation.

---

## Messaging

| Method | Path | Notes |
| --- | --- | --- |
| `GET` / `POST` | `/conversations` | List or start a direct/group conversation. |
| `GET` / `PATCH` / `DELETE` | `/conversations/[id]` | Detail, rename/archive/mute, leave or delete. |
| `GET` / `POST` | `/conversations/[id]/messages` | History with cursor, or send a message with optional attachments. |
| `POST` | `/conversations/[id]/read` | Mark read up to a message. |
| `GET` | `/messages` | Inbox summary with unread counts. |

Realtime events are emitted over Socket.IO after the HTTP write succeeds (`message:new`, `message:delivered`, `message:read`, `typing`).

---

## Random Connect

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/connect` | Current queue or match status. |
| `POST` | `/connect` | `{ action: "join"\|"leave"\|"skip", topics[], language }`. |

Matching rules enforced server-side: both accounts active and onboarded, Random Connect enabled, no blocks either direction, not the previous partner, language/topic compatibility, adult-to-adult or minor-to-minor within two years, hourly cap and cooldown. Matches create a `RANDOM` conversation and a realtime event.

---

## Live rooms

| Method | Path | Notes |
| --- | --- | --- |
| `GET` / `POST` | `/live` | List public rooms or create one. |
| `GET` / `PATCH` | `/live/[id]` | Detail; host actions such as end, mute, promote, invite. Private rooms require an invitation. |
| `POST` / `DELETE` | `/live/[id]/join` | Join or leave a room. |

Media never passes through the server. The server relays WebRTC offers, answers and ICE candidates over Socket.IO (`webrtc:signal`) and tracks room membership, chat and mute state.

---

## Notifications

| Method | Path | Notes |
| --- | --- | --- |
| `GET` / `PATCH` / `DELETE` | `/notifications` | List, mark all read, clear. |
| `PATCH` / `DELETE` | `/notifications/[id]` | Mark one read or delete it. |

Notification preferences live in `PATCH /settings`. Duplicate notifications are suppressed with `dedupeKey` where the event is repeatable.

### Web Push

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/push/public-key` | VAPID public key. Returns `503 PUSH_NOT_CONFIGURED` when VAPID keys are absent. |
| `POST` | `/push/subscribe` | Saves a browser `PushSubscription` for the signed-in user. |
| `DELETE` | `/push/subscribe` | Removes the subscription by `endpoint`. |

Push delivery is sent from `createNotification` and requires `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`.

---

## Media and translation

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/uploads` | `multipart/form-data` with `file` and `kind` (`AVATAR`, `COVER`, `POST`, `STORY`, `MESSAGE`). Validates MIME type, size and magic bytes. |
| `GET` | `/files/[scope]/[...segments]` | Serves stored files. Private files require an authorized session. |
| `POST` | `/translate` | `{ text, targetLang, sourceType?, sourceId? }`. Server-only provider call. Returns `503` when no provider is configured. |

---

## World and search

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/world` | Totals and country activity (`country` for a hub). |
| `GET` | `/search` | `q` search across people, posts, communities and hashtags. |

---

## Admin (staff only)

All routes require a `MODERATOR` or `ADMIN` session and are rate limited. Routes marked **admin** reject moderators with `403`.

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/admin/overview` | Counts, 7-day signups, pending reports, recent users, audit preview. |
| `GET` | `/admin/users` | Filters `q`, `status`, `role`, `cursor`. |
| `PATCH` | `/admin/users/[id]` | `action`: `SUSPEND`, `RESTORE`, `VERIFY`, `MAKE_MODERATOR`, `MAKE_USER`, `MAKE_ADMIN`. Role changes and suspending an admin require **admin**. Suspension revokes sessions. |
| `GET` | `/admin/posts` | Search and paginate live posts with report counts. |
| `DELETE` | `/admin/posts/[id]` | Soft delete and audit. |
| `GET` | `/admin/reports` | Optional `status`; returns reports and status counts. |
| `PATCH` | `/admin/reports/[id]` | `action`: `REVIEWING`, `RESOLVE`, `DISMISS`; `note`, `removeContent`, `suspendTarget`. |
| `GET` | `/admin/communities` | List communities. |
| `PATCH` | `/admin/communities/[id]` | `action`: `SUSPEND` or `RESTORE` (**admin**). |
| `GET` | `/admin/moderation` | Moderation actions and audit log. |
| `GET` | `/admin/analytics` | 30-day series, top countries, communities and hashtags. |
| `GET` | `/admin/settings` | Site settings and detected integration flags. |
| `PATCH` | `/admin/settings` | `registrationOpen` (**admin**). Writes an audit entry. |
| `GET` / `PATCH` | `/admin/contact` | Read and resolve contact messages. |

Every admin mutation writes a `ModerationAction` and/or `AuditLog` row and notifies the affected member where appropriate.
