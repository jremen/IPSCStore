# IPSC Score — Security Audit & Hardening Plan

**Threat model:** Server on public WiFi. Public accesses `/vysledky` (results).
Scorers access `/hodnotenie` (scoring). Admin manages the system.
All three surfaces share one origin/port over plain HTTP.

---

## Critical Findings

### 1. Auth middleware mounted on wrong path — nearly everything is anonymous-writable

`backend/src/app.ts:118-120` — middleware is applied to
`/api/matches/:matchId/stages/:stageId/scores/*` **only**.
Everything else outside that prefix is anonymous-readable **and** anonymous-writable.

Unprotected on public WiFi (no admin token, no stage token):

| Endpoint | Damage |
|---|---|
| `POST /api/matches` | Create a fake match |
| `PUT/DELETE /api/matches/:id` | Rename or delete any match (cascades to all scores) |
| `PUT /api/matches/:id/set-current` | Hijack which match is shown on `/vysledky` |
| `POST/PUT/DELETE /api/shooters[/:id]` and `/bulk` | Edit/delete any shooter, add fake ones |
| `POST/PUT/DELETE /api/matches/:id/registrations[/:id]` and `/bulk` | Re-squad, change division/PF, **DQ/undq** anyone |
| `POST/PUT/DELETE /api/matches/:id/stages`, `/api/stages/:id` | Edit any stage (re-points targets, change scoring type, delete stages and all their scores via cascade) |
| `POST /api/stages/:id/image` | Replace stage briefing image |
| `POST /api/matches/:id/stages/:stageId/recalculate` | DoS / re-rank |
| `POST /api/matches/:id/recalculate` | DoS / re-rank |
| `POST /api/import/*` | Bulk overwrite with attacker CSV |
| `POST /api/backup` | **Full DB dump including admin_password_hash and stages.password_hash** |
| `POST /api/restore` | **Drop and replace the database with arbitrary SQL** |
| `GET /api/shooters` | Enumerate all shooters/PII (names + emails) |

### 2. No rate limiting / brute-force protection

- `POST /api/auth/admin-login` — no lockout, no throttling.
- `POST /api/auth/stage-login` — same, also no per-stage throttling.
- `GET /api/auth/stages` lists every stage that has a password set,
  so an attacker knows which stage IDs to brute.

### 3. Default admin password `"admin"` is hard-coded

`DEFAULT_ADMIN_PASSWORD = 'admin'` in `backend/src/routes/auth.ts:12`.
If the operator never changes the password, that literal is the admin credential.

### 4. Stage password hash exposed for offline-mode cache

`GET /api/matches/:id/stages` returns `password_hash` to every caller.
Offline bcrypt cracking becomes possible (cost 10, min 4 chars).

### 5. No transport security

- Plain `http` everywhere. CORS is `origin: '*'`.
- Every password and token is sniffable on public WiFi.

### 6. Sessions not rotated on privilege change

`PUT /api/auth/admin-password` does **not** invalidate existing `admin_sessions`.
A stolen token keeps working for up to 24h.

### 7. PII leakage on public surface

`/api/shooters`, `/api/shooters/tags`, registration CSV all expose
full PII (email, region) without authentication.

### 8. ScoreLock bypass via DELETE cascades

Anonymous attacker can `DELETE /api/matches/:id/stages/:sid` (no auth)
and the FK cascade wipes all scores. Then fresh writes are no longer locked.

### 9. No input/output hardening

No body-size limits, no security headers, no CSP, no audit logging.

---

## Hardening Plan (single PR, all P0 + P1)

### A. Route → Role Matrix

| Method + path | Public | Scorer | Admin |
|---|---|---|---|
| `GET /api/auth/me`, `/api/auth/stages`, `/api/matches/current` | ✓ | ✓ | ✓ |
| `GET /api/matches` (current only) | ✓ | ✓ | ✓ |
| `GET /api/matches/:id`, `/api/matches/:id/results/*` | ✓ | ✓ | ✓ |
| `GET /api/matches/:id/scoring-progress` | — | ✓ | ✓ |
| `GET /api/matches/:id/stages`, `/api/stages/:id` (limited fields, no hash) | ✓ | ✓ | ✓ |
| `GET /api/shooters`, `/api/shooters/:id`, `/api/shooters/tags` | — | — | ✓ |
| `GET /api/matches/:id/registrations` (no email/region) | ✓ | ✓ | ✓ |
| `GET /api/matches/:id/registrations/export/csv` | — | — | ✓ |
| `GET /api/matches/:id/export` | — | — | ✓ |
| `GET /api/uploads/:filename` | ✓ | ✓ | ✓ |
| `GET /api/lan-info`, `/api/health`, `/api/events` | ✓ | ✓ | ✓ |
| `POST /api/auth/*-login`, `POST /api/auth/logout` | ✓ | ✓ | ✓ |
| `PUT /api/auth/admin-password` | — | — | ✓ |
| `PUT /api/matches/:m/stages/:s/scores/:r` | — | ✓ (locked stage) | ✓ |
| `POST /api/matches/:m/stages/:s/recalculate` | — | — | ✓ |
| All other POST/PUT/DELETE | — | — | ✓ |

### B. Token & Session Hardening

- `PUT /api/auth/admin-password` bumps `session_epoch` in `app_settings`.
- `authMiddleware` checks `admin_sessions.epoch = app_settings.session_epoch`.
- Add `POST /api/auth/admin-logout-all` (admin only) — deletes all sessions + bumps epoch.
- Stage sessions: add `last_used_at`, sweep tokens unused for 7 days.

### C. Rate Limiting (in-DB, no extra services)

- New table `auth_attempts (id, kind, key, ok, attempted_at)`.
- New `backend/src/middleware/rateLimit.ts`:
  - Admin: 5 fails / 15 min / IP → 429.
  - Stage: 10 fails / 15 min / (IP, stageId) → 429.
  - Successful logins clear the counter.

### D. Password Policy

- Admin: minimum 10 chars, reject "admin"/"password"/"1234" etc.
- Stage: minimum 8 chars.
- Bump bcrypt cost from 10 → 12 on new hashes.
- `currentPassword` and `newPassword` must differ.

### E. No-Leak Stage Reads

- New `publicStageSummary()` projection drops `password_hash`.
- Frontend offline: `POST /api/auth/stage-hash` (server-side bcrypt compare, never returns hash).

### F. PII Scrubbing for `/vysledky`

- Strip `email`, `region`, `winmss_member_id` from public responses.
- Env flag `PUBLIC_HIDE_EMAIL=true` (default true).
- Keep: first_name, last_name, division, category, power_factor, squad, is_dq, dq_reason.

### G. Transport — TLS Support

- `BIND_ADDRESS` (default `0.0.0.0`), `TLS_CERT_PATH`, `TLS_KEY_PATH` (optional).
- If TLS paths set, use `https.createServer` with certs.
- Docker dev: Caddy sidecar for TLS termination.
- Electron default: bind to `127.0.0.1` for admin, LAN scoring separate.

### H. CORS & Security Headers

- `CORS_ORIGINS` env (CSV). Default `*` becomes opt-in.
- New `securityHeaders.ts`:
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: no-referrer`
  - `X-Frame-Options: DENY`
  - `Content-Security-Policy: default-src 'self'; ...`
  - On HTTPS: `Strict-Transport-Security: max-age=31536000; includeSubDomains`

### I. Frontend Changes

- `authStore.ts` — drop client-side bcrypt, use `/api/auth/stage-hash`.
- `AdminLoginPage.tsx` — first-run forced password setup.
- `PublicResultsView.tsx` / `StageLoginPage.tsx` — no admin endpoints hit.

### J. Audit Log

- New table `audit_log (id, actor_role, actor_token_id, action, target_table, target_id, ip, at, meta)`.
- `audit(c, action, target, meta?)` helper wired into:
  login attempts, password change, score writes, DQ toggles, match/stage delete,
  backup, restore, recalculate, logout-all.
- `GET /api/audit?matchId=…&since=…` (admin only).

### K. File-by-File Changes

| File | Change |
|---|---|
| `backend/src/app.ts` | New middleware order; remove glob; add role checks |
| `backend/src/middleware/roles.ts` | NEW — requireAdmin, requireScorer, methodGuard |
| `backend/src/middleware/rateLimit.ts` | NEW |
| `backend/src/middleware/securityHeaders.ts` | NEW |
| `backend/src/middleware/cors.ts` | Env-driven origin list |
| `backend/src/middleware/auth.ts` | Session-epoch check |
| `backend/src/routes/auth.ts` | Epoch bump, password policy, default-password blocklist |
| `backend/src/routes/stages.ts` | Public projection without hash; stage-hash endpoint |
| `backend/src/routes/scoring.ts` | scoreLock route scope fix; recalculate gets requireAdmin |
| `backend/src/routes/results.ts` | PII scrub on anonymous read |
| `backend/src/routes/registrations.ts` | PII scrub on anonymous read |
| `backend/src/routes/backup.ts` | Require admin + confirmation token; audit |
| `backend/src/routes/matches.ts` | requireAdmin on writes |
| `backend/src/routes/shooters.ts` | requireAdmin on writes; restrict GET to admin |
| `backend/src/routes/matchExport.ts` | Restrict to admin |
| `backend/src/routes/uploads.ts` | Confirm public read stays (briefing images) |
| `backend/src/routes/import.ts` | requireAdmin on writes |
| `backend/src/routes/winmssImport.ts` | requireAdmin on writes |
| `backend/src/services/audit.ts` | NEW — audit helper |
| `backend/src/db/migrations/017_security_hardening.sql` | NEW — tables |
| `backend/src/index.ts` | TLS support, env-driven bind |
| `backend/src/env.ts` | New env vars |
| `frontend/src/stores/authStore.ts` | Drop bcrypt offline, use stage-hash |
| `frontend/src/components/auth/AdminLoginPage.tsx` | First-run forced setup |
| `frontend/src/components/results/PublicResultsView.tsx` | Verify no admin endpoints |
| `frontend/src/components/auth/StageLoginPage.tsx` | No client-side bcrypt |

## Execution Order

1. Schema migration `017_security_hardening.sql`
2. New middleware: `roles.ts`, `rateLimit.ts`, `securityHeaders.ts`
3. `app.ts` rewire — per-route role checks
4. `auth.ts` — epoch, policy, blocklist, cost 12
5. `stages.ts` + `stage-hash` endpoint
6. `scoring.ts` — fix scoreLock route scope
7. Matches, shooters, registrations, export, import, backup, restore — requireAdmin
8. Results + registrations PII scrub
9. Uploads — confirm public read
10. `env.ts` + `index.ts` — TLS, bind address
11. `cors.ts` — env-driven origin
12. Frontend: authStore, AdminLoginPage, PublicResultsView, StageLoginPage
13. Audit service + wiring
14. Verification (11-step smoke list)

## Verification Smoke List

1. `POST /api/matches` (no token) → 401
2. `DELETE /api/shooters/:id` (no token) → 401
3. `GET /api/shooters` (no token) → 401
4. `POST /api/backup` (no token) → 401; with admin token → 200
5. `POST /api/restore` (no token) → 401
6. Brute-force admin password 10 wrong attempts → 429 on 11th
7. `/vysledky` registration list has no `email` / `region`
8. Change admin password → existing token rejected (epoch bump)
9. Scorer auth stage A → attempt stage B write → 403
10. Scorer auth → overwrite existing score → 403
11. TLS smoke: `https://...` returns `Strict-Transport-Security` header

## Out of Scope (P2 — separate PR)

- Audit log viewer UI.
- Argon2id migration.
- CSP per-route relaxation for inline theme init.
- JWT tokens (UUID+DB is fine).
- Splitting `/vysledky` into a separate read-only process.
