# Scoring on mobile

On a phone, the scoring UI collapses to a single column. The shooter works through paper targets, then steel, then time, then saves.

![Mobile scoring sheet](/docs/screenshots/scoring-mobile-ipsc.png)

## Layout

- **Top bar** — the active stage as a button (tap to switch stages via the modal), the stage briefing icon.
- **Shooter list** — tap any shooter name to start scoring them. The list is full-screen.
- **Sheet** — paper targets stacked vertically (one per row), then steel targets in a row, then NPM/no-shoot if applicable, then procedurals, then time at the bottom.
- **DQ button** — at the very bottom.
- **Save** — large button at the bottom, sticky.

## Switching stages

The stage picker is a modal opened from the header. It shows all stages for the current match with a check mark on scored shooters.

## Offline mode

If the network drops, scores are queued in IndexedDB and synced as soon as the device is back online. The same conflict protection as desktop applies: if a host already has a different score, the local copy is discarded and the host version is loaded.

The header shows a small offline indicator with the count of pending saves.

## Summary view (remote scorers)

After entering all fields, mobile scorers see a summary card showing the inputs and the calculated score. They tap **Confirm** to submit. The match host then approves or rejects.

![Mobile summary view](/docs/screenshots/scoring-mobile-summary.png)

**To do this in the app:** [Go to scoring](app-tab:scoring)
