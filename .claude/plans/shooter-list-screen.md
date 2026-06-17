# Plan: Replace ShooterDropdown with a full-screen shooter list

## Goal
Remove the `ShooterDropdown` component and replace it with a separate, full-screen shooter list for the active stage. The list must have:
- A back button to return to the scoring sheet.
- A search input at the top.
- Two sort modes: **None** (default registered order) and **Random** (with a `TbRefresh` icon button to reshuffle randomly).

## Why
The current dropdown becomes unwieldy on mobile with many shooters, and a dedicated screen gives range masters more room for search and an explicit sort mode (useful for randomizing the order in which shooters are scored).

## Files to change
1. **New utility** `frontend/src/utils/shuffleWithSeed.ts` — seeded Fisher-Yates shuffle so the "Random" order stays stable until the user refreshes it.
2. **Modify** `frontend/src/stores/scoringStore.ts` — add `shooterListSort` + `randomSeed` state, `setShooterListSort` + `reshuffleRandomOrder` actions, and an `orderedRegistrations()` getter. Update `nextShooter`/`prevShooter` to use the ordered list so prev/next follow the same order shown in the list.
3. **Modify** `frontend/src/hooks/useScoringNav.tsx` — use `orderedRegistrations()` for the post-save auto-advance so it follows the same order.
4. **New hook** `frontend/src/hooks/useShooterList.ts` — search state, sort toggle, reshuffle, and filtered/sorted list derived from the store.
5. **New component** `frontend/src/components/scoring/ShooterListScreen.tsx` — full-screen overlay (same pattern as `StageDetailsView`) with header + back, search, sort toggle buttons, refresh icon, and scrollable shooter rows.
6. **Modify** `frontend/src/components/scoring/ScoringNav.tsx` — replace `ShooterDropdown` with a button that opens the shooter list; add local state to show/hide the screen.
7. **Delete** `frontend/src/components/scoring/ShooterDropdown.tsx` — no longer used.
8. **Modify** `frontend/src/i18n/locales/en.json` and `sk.json` — add `scoring.shooterList`, `scoring.sortNone`, `scoring.sortRandom`, `scoring.randomizeOrder`.

## Detailed design

### State ownership
- Persistent UI state (`shooterListSort`, `randomSeed`) lives in `scoringStore` so the chosen sort survives opening/closing the list and switching stages.
- Transient search state lives in `useShooterList` (local `useState`).
- List open/close state lives in `ScoringNav` (local `useState`).

### Sorting
- `none`: keep the registration order returned by the API (the default).
- `random`: Fisher-Yates shuffle using `mulberry32(randomSeed)`.
- Refresh button regenerates the seed, producing a new random order.

### Navigation consistency
- `nextShooter`/`prevShooter` will use `orderedRegistrations()` (squad filter + random sort if enabled). This keeps prev/next consistent with the list.
- `useScoringNav.performSave` auto-advance will also use `orderedRegistrations()`.

### UI
- Follow the existing `StageDetailsView` full-screen pattern:
  - Fixed `inset-0 z-50` overlay.
  - Header with back arrow + title.
  - Pinned top controls (search + sort toggle + refresh).
  - Scrollable list of shooters.
  - Pinned bottom back button.
- Each row shows: name, division/category/PF/squad badges, green checkmark if already scored, highlighted background for the currently selected shooter.
- Touch targets stay ≥44px, matching the mobile-first scoring UI.

### Open questions / assumptions
- Random order is global per session (one seed), not per-stage. If you want per-stage random seeds, let me know and I'll store a `Record<stageId, number>` instead.
- The registered order is the order returned by `api.getRegistrations(matchId)`; no extra server-side sorting is added.

## Verification
- `cd frontend && npx tsc --noEmit` passes.
- Manual check: open scoring, tap the shooter selector → list opens → search filters → toggle Random → refresh reshuffles → select shooter → list closes → prev/next follow the chosen order.
