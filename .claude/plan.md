# Plan: Real-time scoring/results updates via Server-Sent Events

## Goal
When any client saves a score via the existing Hono `PUT /api/matches/:matchId/stages/:stageId/scores/:registrationId` endpoint, the main Electron app (and any other open client on the same match) should automatically refresh scoring progress and results without requiring a page reload.

## Approach: Server-Sent Events (SSE)

WebSockets are overkill for a one-way server→client push. SSE is simpler, works over standard HTTP, plays nicely with Hono, and lets us reuse the existing auth middleware.

### Backend changes

1. **Create `/backend/src/services/events.ts`**
   - Export a singleton `EventBroadcaster` that keeps a list of active SSE connections.
   - Provide `broadcast(event, data)` to send JSON events to all connected clients.
   - Provide `addClient(res)` / `removeClient(res)` for connection lifecycle.

2. **Add SSE endpoint in `/backend/src/app.ts`**
   - `GET /api/events` opens an SSE stream.
   - Reuse existing `authMiddleware` (or a public variant) so admin sessions can connect.
   - Send an initial `connected` event, then keep the connection alive with periodic heartbeat comments.
   - Clean up on close/error.

3. **Emit events from scoring routes (`/backend/src/routes/scoring.ts`)**
   - After a successful score upsert + stage recalculation, call `eventBroadcaster.broadcast('score:saved', { matchId, stageId, registrationId })`.
   - Optionally emit `stage:recalculated` as well.

### Frontend changes

1. **Create `/frontend/src/services/sse.ts`**
   - `connectToEventStream()` opens an `EventSource` to `/api/events`.
   - Reconnect with exponential backoff on unexpected close/error.
   - Dispatch typed events via a small pub/sub so stores/components can subscribe.

2. **Create `/frontend/src/hooks/useRealtimeUpdates.ts`**
   - Single hook that manages the SSE connection for the lifetime of the app.
   - Subscribes to `score:saved` and triggers appropriate store refetches.
   - Uses `useScoringStore` and `useResultsStore` actions.

3. **Integrate with stores/components**
   - In `AppLayout`, mount `<RealtimeUpdatesProvider />` (or call `useRealtimeUpdates`) once.
   - When `score:saved` arrives:
     - If the current user is admin and on the scoring tab, call `fetchScoringProgress(activeMatchId)` and reload the current score if the active stage/registration matches.
     - If on the results tab, call the relevant `fetch*` methods in `useResultsStore`.
     - If on the matches/stages tab, optionally refresh match progress indicator.
   - Existing 30 s polling in `PublicResultsView` can remain as a fallback but can be disabled/reduced when SSE is connected.

### Optional: event filtering
- Each SSE client can pass its current `matchId` as a query parameter (`/api/events?matchId=...`).
- `EventBroadcaster.broadcast` filters connections so clients only receive events for the match they are viewing.
- This avoids unnecessary refreshes for admins not currently viewing the affected match.

### Files to change
- `backend/src/services/events.ts` *(new)*
- `backend/src/app.ts`
- `backend/src/routes/scoring.ts`
- `frontend/src/services/sse.ts` *(new)*
- `frontend/src/hooks/useRealtimeUpdates.ts` *(new)*
- `frontend/src/components/layout/AppLayout.tsx`
- `frontend/src/components/results/PublicResultsView.tsx` (reduce/remove polling)
- `frontend/src/components/layout/MatchProgress.tsx` (reduce/remove polling)

### Verification
1. Open Electron app admin on scoring tab.
2. From a second device/browser, save a score for a stage.
3. Confirm the Electron app updates scoring progress and/or results without reload.
