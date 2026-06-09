# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IPSC/USPSA scoring application — full-stack app for managing shooting matches, shooters, scoring, and results. Inspired by WinMSS and Practiscore.

## Tech Stack

- **Frontend**: React 19 + Vite 6 + TypeScript + Flowbite React (UI components) + Tailwind CSS + Zustand (state)
- **Backend**: Hono 4 (Node.js) + TypeScript + `postgres` npm package (SQL driver)
- **Database**: PostgreSQL 16
- **Dev**: Docker Compose (hot reload for both frontend and backend)
- **PDF Export**: jspdf + jspdf-autotable (client-side)
- **CSV**: csv-parse (server-side import), server-generated CSV export

## Commands

```bash
# Start everything
docker compose up

# Backend only (needs local postgres)
cd backend && npm run dev

# Frontend only (proxies API to localhost:3001)
cd frontend && npm run dev

# Build frontend for production
cd frontend && npm run build

# Install dependencies (run in each directory)
cd backend && npm install
cd frontend && npm install
```

## Electron Build

**IMPORTANT: Always rebuild frontend and backend from clean state before packaging.** The Electron app must always reflect the latest source code — never package from stale `dist/` artifacts.

```bash
# Full build (from project root) — rebuilds frontend + backend + bundles + packages
npm run build:mac    # Universal macOS (arm64 + x64)
npm run build:win    # Windows x64
npm run build:linux  # Linux x64

# Before any Electron build, ALWAYS clean and rebuild:
rm -rf frontend/dist
npm run build:frontend   # fresh Vite build
npm run build:backend    # fresh tsc + copy migrations
cd electron && npm run bundle-backend   # fresh esbuild bundle
```

The `download-pg` scripts fetch PostgreSQL binaries into `electron/resources/pg/`. The `afterPack` hook thins universal Mach-O binaries per-architecture so `@electron/universal` can merge them correctly.

## Architecture

### Backend (`backend/src/`)
- **Entry**: `index.ts` — Hono server, runs migrations on startup, mounts all routes
- **DB**: `db/client.ts` (postgres connection), `db/migrate.ts` (migration runner), `db/migrations/` (numbered SQL files)
- **Routes**: One file per domain — `matches.ts`, `stages.ts`, `shooters.ts`, `registrations.ts`, `scoring.ts`, `results.ts`, `uploads.ts`, `import.ts`
- **Scoring calc**: `utils/scoringCalc.ts` — Pure functions for Comstock/Virginia Count/Fixed Time/Chrono scoring algorithms. This is the most critical file to get right.
- **File storage**: `utils/fileStorage.ts` — Stage image upload handling

### Frontend (`frontend/src/`)
- **Entry**: `main.tsx` → `App.tsx` → `AppLayout.tsx` (tab-based navigation, no router)
- **Stores** (`stores/`): `uiStore` (tabs, active match), `matchStore`, `stageStore`, `shooterStore`, `scoringStore`, `resultsStore`
- **API service**: `services/api.ts` — Typed fetch wrappers for all backend endpoints
- **Scoring UI**: `components/scoring/ScoringSheet.tsx` — Mobile-first per-shooter score entry (the core UI)
- **Client scoring preview**: `utils/scoring.ts` — Mirrors `scoringCalc.ts` for live score preview

### Database Schema (7 tables)
`matches` → `stages` (cascade), `match_registrations` (cascade), `stage_scores` (cascade) → `target_scores` (cascade), `chrono_results` (cascade)
`shooters` — persistent across all matches, RESTRICT on delete if registered

Key design: `match_registrations` has nullable override columns (`division`, `category`, `power_factor`) that fall through to the shooter's defaults when NULL. This allows per-match property changes without mutating the shooter record.

### Scoring Flow
1. Range master selects stage → selects shooter → fills scoring sheet (time + per-target hits)
2. On save: backend calculates raw_points/penalties/net_points/hit_factor using `scoringCalc.ts`
3. After save: triggers stage recalculation (re-ranks all shooters, updates stage_percent/stage_points)
4. DQ shooters get 0 stage_points across all stages; DNF shooters get 0 on the missed stage only

## Scoring Rules

| Zone | Major | Minor | Penalty | Points |
|------|-------|-------|---------|--------|
| A    | 5     | 5     | Miss    | -10    |
| C    | 4     | 3     | No-shoot| -10    |
| D    | 2     | 1     | FTSA    | -10    |
| Steel| 5     | 5     | Procedural | -10 |

- **Comstock**: Best N hits per target × PF values, hit_factor = net_points / time
- **Virginia Count**: Same as Comstock + extra shot/hit/stacking penalties (-10 each). No steel.
- **Fixed Time**: Misses are NO penalty. Overtime shots = -5. Score = net_points directly (no hit factor).
- **Chrono**: PF = (bullet_weight × avg_velocity) / 1000. USPSA Major≥165, IPSC Major≥170. Minor≥125.
- **Stage points**: stage_percent = (HF / highest_HF) × 100, stage_points = (stage_percent / 100) × max_points

## Coding Principles

These principles MUST be followed for all frontend code. Violations in existing code should be fixed when touched.

1. **Separate components in separate files** — Don't create long files with hundreds of lines. Each component gets its own file. If a file exceeds ~150 lines, split it.
2. **No duplicate code** — For common logic, create hooks and export functions. If two components do the same thing, extract it.
3. **Non-UI logic lives in hooks** — States, functions, useEffect, computed variables, etc. must be tied into custom hooks. Components should only contain JSX + hook calls.
4. **No prop drilling** — Don't pass props down or up between components if the data can come from the same global Zustand store or a common hook.
5. **Call hooks and functions directly** — Variables, functions, hooks etc. should be called right inside the component that uses them, not passed down through props.
6. **Only pass callbacks for parent reactions** — Only pass a callback function from a child component if the parent needs to react to it (e.g., child calls onClick → parent changes state). Never pass data or handlers that the child could access itself.

## Key Patterns

- Per-target score storage in `target_scores` table — essential for "best N hits per target" and Virginia Count extra-hit detection
- `flowbite-react` for all UI components (Modal, Table, Card, Badge, Tabs, Alert, etc.)
- Mobile-first scoring UI: 44px+ touch targets, sticky bottom save bar, time input always at top of scoring sheet
- Global CSV import via `shared/CSVImportExport` component — works for shooters, registrations, and scores
- Environment config: `.env.example` at root, Docker Compose passes env vars to containers