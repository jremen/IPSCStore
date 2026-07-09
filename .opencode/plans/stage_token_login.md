# Plan: Auto-login range officers via /hodnotenie stage link tokens

## Decisions made
- **TTL**: 5 hours default (configurable in modal: 1h / 4h / 5h / 8h)
- **Usage**: Single-use (each scan consumes the token)
- **Pill behavior**: The existing `🎯 Scoring` pill now opens a per-stage picker instead of showing a single bare `/hodnotenie` QR
- **Fallback**: Bare `/scoring` URL still works — range officer enters password manually if they don't have a tokenized QR

## The mechanism

1. **Admin** clicks `🎯 Scoring` pill in the header → opens the new **stage picker modal** showing all stages with passwords set
2. Admin clicks **Generate QR** for a stage → server mints a short-lived single-use token bound to that stage → modal displays the QR + URL + expiry
3. **Range officer** scans the QR → opens `http://<lan-ip>:3001/scoring?stageToken=<token>` on their phone
4. `StageLoginPage` detects the `?stageToken=...` in the URL on mount → calls `POST /api/auth/stage-link-redeem` → gets back a real session token → calls `authStore.loginWithToken(...)` → lands on the scoring screen for that stage, no password prompt
5. URL is cleaned up via `history.replaceState` so the token doesn't leak via referer
6. If the token is invalid/expired/already-used, the user sees a brief error and falls through to the normal password form

## Files to change

### Backend (3 new + 1 modified)

**`backend/src/db/migrations/0XX_stage_link_tokens.sql`** (new)
- `stage_link_tokens` table: `id` (32-byte hex), `match_id`, `stage_id`, `created_by`, `created_at`, `expires_at`, `redeemed_at`, `redeemed_ip`, `revoked_at`
- Indexes on `stage_id` and `expires_at` for cleanup

**`backend/src/services/stageLinkTokens.ts`** (new, ~80 lines)
- `createStageLinkToken(stageId, ttlSeconds, adminSessionId?)` → generates random token, inserts row, returns it
- `redeemStageLinkToken(token, clientIp)` → validates, marks redeemed, returns session info
- `revokeStageLinkTokensForStage(stageId)` → admin "revoke all" for a stage
- `cleanupExpiredTokens()` → called on startup, `DELETE WHERE expires_at < NOW() - 7 days`

**`backend/src/routes/auth.ts`** (modified)
- `POST /api/auth/stage-link-token` (admin-only): mints a token
- `POST /api/auth/stage-link-redeem` (public): redeems a token, issues session
- `DELETE /api/auth/stage-link-token` (admin-only): revokes all tokens for current match

**`backend/src/app.ts`** (no changes)
- New routes are added to the existing `authRoutes` mount

### Frontend (1 new + 4 modified)

**`frontend/src/components/layout/StageLinkModal.tsx`** (new, ~150 lines)
- Fetches stages with `password_set: true` via existing `api.auth.getStages(matchId)`
- Per-stage row: stage name + "Generate QR" button
- After mint: shows QR code (reuses `useQRCode` hook) + URL + expiry countdown + Print / Download PDF / Revoke buttons
- "Generate all" button for batch minting
- "Revoke all" button for the current match (calls the DELETE endpoint)

**`frontend/src/services/api.ts`** (modified)
- `auth.createStageLinkToken(stageId, ttlSeconds)`
- `auth.redeemStageLinkToken(token)`
- `auth.revokeStageLinkTokens()`

**`frontend/src/stores/authStore.ts`** (modified)
- New `loginWithToken({ stageId, stageName, matchId, token })` action — same shape as `login()` but skips password verification
- Sets the same `localStorage` keys (`auth_token`, `auth_stage_id`, `auth_stage_name`, `auth_match_id`, `auth_role`)

**`frontend/src/pages/StageLoginPage.tsx`** (modified)
- On mount: check `window.location.search` for `?stageToken=...`
- If present: call `api.auth.redeemStageLinkToken(token)` → on success, call `authStore.loginWithToken(...)` and clean the URL
- On error: show a small "Link expired or already used" banner above the password form

**`frontend/src/components/layout/LanUrlBadge.tsx`** (modified)
- The `🎯 Scoring` button now opens `StageLinkModal` instead of `QRCodeModal`
- `QRCodeModal` for scoring mode is removed from this badge (no longer needed there)

## Tradeoffs accepted

- **No password in URL** — consistent with existing security model
- **5h TTL** — long enough for a typical day, short enough to limit exposure if a QR is photographed
- **Single-use** — more secure; a re-scan needs a new QR
- **Revoke is match-wide, not per-token** — simpler UX, tokens are short-lived anyway
- **Reuse existing stageToken session model** — no parallel auth system, just a new way to bootstrap into the same session

## Verification plan

1. **Happy path**: admin mints QR for Stage 1 → phone scans → lands on scoring screen without prompt → URL is clean
2. **Single-use**: same QR scanned again on second phone → shows "Link already used" → falls back to password form
3. **Expiration**: mint with 30s TTL, wait 60s, try redeem → 410 Gone, fallback to password
4. **Revocation**: admin clicks "Revoke all" → tokens invalidated → next redeem fails
5. **Password change while token active**: token still works (bound to stage, not password)
6. **Offline**: phone already has `/hodnotenie` cached, scans QR while offline → SW serves shell, redeem API fails, password form shown with offline banner
7. **Security**: token is 32 random bytes (256 bits entropy), admin-only mint, single-use, short TTL

## What I'm NOT changing

- Existing `stageLogin` password flow — still works for users without a QR
- `Scoring` component — already works once `authStore` has a valid `stageToken`
- `password_hash` storage or exposure
- Service worker — HTML cache covers `/hodnotenie?stageToken=...` automatically
- `LocalNetwork`/`isAdmin` semantics

## GrayMatter writes (post-implementation)

- Stage link token pattern: server mints short-lived single-use bearer token; `/scoring?stageToken=...` auto-redeems on mount
- Auto-login flow: `StageLoginPage` detects query param, calls `redeemStageLinkToken`, then `authStore.loginWithToken`. Falls back to password form on error. URL cleaned via `history.replaceState`
