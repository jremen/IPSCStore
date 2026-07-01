# Scoring

Scoring is the act of entering a shooter's hits and time for a stage. The app shows a different input sheet for every scoring type, but the lifecycle is the same.

## Lifecycle

1. **Pick a stage** — header button (mobile) or tab strip (desktop).
2. **Pick a shooter** — the shooter list on the left, or the **Next** / **Prev** buttons in the header.
3. **Enter hits** — paper / steel / no-shoot / NPM depending on the scoring type.
4. **Enter time** — bottom of the sheet (or top, on mobile).
5. **Confirm and save** — admins save immediately. Remote scorers get a summary view to review before submitting.

A green check mark next to a shooter means they are scored for the active stage.

## Conflict protection

If a shooter has already been scored and you try to save a new score for the same (stage, shooter) as a non-admin, the server rejects the save with a **409 Conflict** and the host's existing score is kept. The offline sync manager discards its stale local copy and refreshes from the server.

Admins are not blocked — they can re-save to correct an error. The change is recorded in the audit log.

## Desktop vs mobile

The scoring UI is responsive. The same component renders two layouts:

- **Desktop (≥ 1024px)**: paper targets in a two-column grid on the left, steel targets + procedurals in a sidebar on the right, time at the bottom. Stage picker is a horizontal tab strip.
- **Mobile**: a single column with paper targets first, then steel, then procedurals, then time. The stage picker is a modal opened from the header.

See the dedicated pages for screenshots: [Scoring on desktop](app-tab:scoring) and [Scoring on mobile](app-tab:scoring).
