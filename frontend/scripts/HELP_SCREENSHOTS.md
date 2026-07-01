# Help-system screenshots

The help system displays inline screenshots embedded in markdown files under `public/docs/{en,sk}/`. This directory documents how to regenerate those screenshots when the UI changes.

## Prerequisites

- Backend running on `http://localhost:3001` with default admin password `admin`
- Frontend dev server running on `http://localhost:5173`
- The dev server must have the npm dependencies installed:
  - `react-markdown`
  - `remark-gfm`
  - `yet-another-react-lightbox`

If running in Docker, install the deps inside the container:
```bash
docker exec ipscscore-frontend-1 sh -c 'npm install react-markdown@^9 remark-gfm@^4 yet-another-react-lightbox@^3'
```

## Capture workflow

```bash
# 1. Seed a demo match with stages, shooters, scores, squads, and DQs
npm run seed:help-fixture

# 2. Regenerate all screenshots
npm run screenshots
```

Screenshots are written to `public/docs/screenshots/`. They are referenced from the markdown by relative path (`/docs/screenshots/foo.png`).

## What gets captured

- **Matches**: list, detail view, create modal
- **Stages**: list, add-stage modal
- **Registration**: list, edit modal
- **Squadding**: modal with all 4 squads
- **Scoring (desktop)**: Comstock sheet with shooter selected, IDPA sheet
- **Scoring (mobile)**: 390×844 viewport, sheet with shooter selected
- **Results**: by-division, by-stage, DQ table
- **DQ**: confirm modal opened from the scoring sheet
- **Export buttons**: results page header

## Why a separate demo match?

The seed script creates a complete `Demo Help Match` with 6 stages covering the major scoring types (Comstock, Virginia Count, IDPA, Action Steel, Multi-Gun, Bullseye), 12 shooters across all divisions, scores for stages 1-3, 4 squads, and 2 DQs. This guarantees the screenshots always show a populated UI regardless of what real matches exist on the device.

The script is idempotent: it deletes any prior "Demo Help Match" before recreating.

## Customizing the capture

Edit `scripts/capture-help-screenshots.ts` to change the `SHOTS` array. Each entry has:
- `name`: output filename
- `viewport`: `{ width, height }`
- `setup(page)`: function that navigates the page to the target state before screenshot

The script uses Playwright's chromium in headless mode and runs in a fresh browser context per screenshot, so localStorage is reset between captures.
