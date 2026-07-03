# Scoring on desktop

When you sign in as an admin on a desktop browser, or use the desktop app, the scoring layout uses a two-column design with a right-hand sidebar.

![Desktop scoring sheet, IPSC layout](/docs/screenshots/scoring-desktop-ipsc.png)

## Layout

- **Top bar** — back arrow, current stage, current shooter, Next/Prev arrows.
- **Left column** — paper targets in a 2-column grid. Each target has Alpha/Charlie/Delta/Miss buttons. Aggregated zone inputs at the top let you enter a hit count for the whole stage at once.
- **Right sidebar** — steel targets (Hit/Miss per plate), NPM targets, no-shoot hits, and procedurals (PE, FTSA, etc.).
- **Bottom** — time input, par time (Fixed Time only), and the **DQ** button.
- **Live preview** — the small chip in the bottom-right shows the current raw / penalty / net / HF for the active shooter.

## What changes per scoring type

- **Comstock / Virginia / Fixed Time / Hit Factor / Chrono** — see the screenshot above.
- **IDPA** — the paper targets still have A/C/D/M buttons but the colors and points are different (0/−1/−3/−5). IDPA penalty steppers (PE, HNT, FTN, FP, FTDR) appear below the paper targets in the left column. Time input and the live preview (points down + total time) are in the right column.

![Desktop scoring, IDPA](/docs/screenshots/scoring-desktop-idpa.png)

- **Action Steel** — strings of time inputs on the left, per-plate tap grid on the right.
- **Multi-Gun** — single time on the left, per-target neutralized toggles on the right.
- **Bullseye / ISSF / Archery** — ring score buttons per shot.
- **NRL22 / Long Range (PRS)** — per-target hit toggle, no time.

## Saving

Click **Save** to write the score. The shooter row gets a green check mark and the next shooter is selected automatically. Use **Next** / **Prev** in the header to move manually.

## Summary view (remote scorers)

A non-admin scorer sees a **Summary** view after entering hits — they review the inputs and click **Confirm** to submit. The host then accepts or rejects from their device.

![Score summary view](/docs/screenshots/scoring-desktop-summary.png)

**To do this in the app:** [Go to scoring](app-tab:scoring)
