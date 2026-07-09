# IPSCScore

**IPSC/USPSA Scoring Application** — a full-stack app for managing practical shooting matches, scoring shooters, and computing results. Inspired by [WinMSS](https://winmss.com) and [Practiscore](https://practiscore.com), designed to run both as a networked web app on LAN and as a standalone desktop application.

## Table of Contents

- [What It Does](#what-it-does)
- [Architecture Overview](#architecture-overview)
- [Local Domain Names](#local-domain-names)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Critical Files](#critical-files)
- [Database Schema](#database-schema)
- [Scoring Rules](#scoring-rules)
- [Scoring Flow](#scoring-flow)
- [Authentication](#authentication)
- [WinMSS Import](#winmss-import)
- [Electron Desktop App](#electron-desktop-app)
- [Internationalization](#internationalization)
- [Windows Compatibility](#windows-compatibility)
- [Coding Principles](#coding-principles)

---

## What It Does

IPSCScore covers the full lifecycle of an IPSC/USPSA shooting match:

1. **Match Management** — Create matches, define stages (with scoring type, target layout, max points), upload stage diagrams.
2. **Shooter Registration** — Maintain a persistent shooter database, register shooters into matches with per-match division/category/power factor overrides.
3. **Live Scoring** — Range officers enter scores per-shooter per-stage: time, per-target hits (A/C/D/M/NS), penalties, steel hits. Mobile-first UI with 44px+ touch targets and sticky save bar.
4. **Results & Rankings** — Automatic hit factor calculation, per-division ranking, stage percent/points, overall match results. Public results view auto-refreshes every 30 seconds.
5. **Data Export** — PDF score sheets, CSV import/export for shooters/registrations/scores, full database backup/restore.
6. **Legacy Import** — Import shooter data and scores from WinMSS `.mdb` database files.

The app is designed for use on a local network at a shooting range: multiple range officers can score different stages simultaneously on tablets/phones, while competitors view live results on a big screen or their own devices.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Electron Shell                      │
│  (optional — bundles everything for desktop use)     │
│                                                       │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ Frontend  │  │   Backend    │  │  PostgreSQL    │  │
│  │ React SPA │◄─┤  Hono API    │◄─┤  (embedded)    │  │
│  │ :5173     │  │  :3001       │  │  :5432         │  │
│  └──────────┘  └──────────────┘  └────────────────┘  │
│                                                       │
└─────────────────────────────────────────────────────┘
```

Without Electron, the same stack runs via **Docker Compose** or directly with `npm run dev` — the frontend proxies API calls to the backend, which connects to any PostgreSQL instance.

---

## LAN Access

The backend listens on **port 3001**. Devices on the same Wi-Fi can reach:

| URL | Purpose | Auth Required |
|-----|---------|---------------|
| `http://<lan-ip>:3001/` | Admin interface | Yes — admin password |
| `http://<lan-ip>:3001/results` | Public results view | No — auto-refreshes every 30s |
| `http://<lan-ip>:3001/scoring` | Stage scoring login | Yes — stage password |
| `http://<lan-ip>:3001/squads` | Public squads view | No |

The backend determines the mode from the URL path (`getDomainMode()` in `app.ts`) and the frontend routes accordingly.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 6 + TypeScript + Tailwind CSS 4 + Flowbite React |
| State | Zustand (7 stores) |
| i18n | i18next (English + Slovak) |
| Backend | Hono 4 (Node.js) + TypeScript |
| Database | PostgreSQL 16 |
| DB Driver | `postgres` npm package |
| PDF Export | jsPDF + jspdf-autotable (client-side) |
| CSV | csv-parse (server import), server-generated CSV export |
| Desktop | Electron 34 + electron-builder |

| Dev | Docker Compose (hot reload for frontend & backend) |

---

## Getting Started

### Docker (recommended for development)

```bash
# Start everything — PostgreSQL, backend, frontend
docker compose up

# App available at http://localhost:5173
# API at http://localhost:3001
# PostgreSQL on port 5434 (host)
```

### Without Docker

```bash
# 1. Start PostgreSQL (requires local instance on port 5432)
# 2. Copy and configure environment
cp .env.example .env

# 3. Backend
cd backend && npm install && npm run dev

# 4. Frontend (in another terminal)
cd frontend && npm install && npm run dev
```

### Electron Desktop App

```bash
# Full build (rebuilds frontend + backend + bundles + packages)
npm run build:mac     # Universal macOS (arm64 + x64)
npm run build:win     # Windows x64
npm run build:linux   # Linux x64
```

> **Important:** Always rebuild from clean state before packaging. Never package from stale `dist/` artifacts.
> ```bash
> rm -rf frontend/dist
> npm run build:frontend
> npm run build:backend
> cd electron && npm run bundle-backend
> ```

### Environment Variables

See `.env.example`:

```env
POSTGRES_DB=ipscscore
POSTGRES_USER=ipscscore
POSTGRES_PASSWORD=ipscscore_dev
DATABASE_URL=postgresql://ipscscore:ipscscore_dev@postgres:5432/ipscscore
PORT=3001
UPLOAD_DIR=/app/uploads
NODE_ENV=development
VITE_API_URL=http://localhost:3001
```

---

## Project Structure

```
IPSCScore/
├── backend/                    # Hono API server
│   └── src/
│       ├── index.ts            # Entry point — Hono server, runs migrations, mounts routes
│       ├── app.ts              # App setup, domain mode middleware, HTML injection
│       ├── env.ts              # Environment config
│       ├── db/
│       │   ├── client.ts       # PostgreSQL connection
│       │   ├── migrate.ts      # Migration runner
│       │   └── migrations/    # 12 numbered SQL migration files
│       ├── middleware/
│       │   ├── auth.ts         # Token-based auth middleware
│       │   ├── cors.ts        # CORS handling
│       │   ├── errorHandler.ts
│       │   ├── requestLogger.ts
│       │   └── scoreLock.ts    # Score locking logic
│       ├── routes/
│       │   ├── auth.ts         # Login, logout, password management
│       │   ├── backup.ts       # Database backup/restore
│       │   ├── import.ts      # Data import
│       │   ├── matches.ts     # Match CRUD
│       │   ├── registrations.ts # Shooter registration
│       │   ├── results.ts      # Results & calculations
│       │   ├── scoring.ts      # Score submission & recalculation
│       │   ├── shooters.ts    # Shooter CRUD
│       │   ├── stages.ts       # Stage CRUD
│       │   ├── uploads.ts      # File uploads
│       │   └── winmssImport.ts # WinMSS .mdb import
│       └── utils/
│           ├── scoringCalc.ts  # Core scoring algorithms (CRITICAL)
│           ├── fileStorage.ts  # Stage image upload handling
│           ├── winmssMapper.ts # WinMSS data mapping
│           ├── pgBin.ts        # PostgreSQL binary utilities
│           └── unaccent.ts     # Unaccent text utility
│
├── frontend/                   # React SPA
│   └── src/
│       ├── main.tsx            # React entry
│       ├── App.tsx             # Root component
│       ├── theme.ts            # Tailwind/Flowbite theme
│       ├── components/
│       │   ├── auth/           # AdminLoginPage, StageLoginPage
│       │   ├── layout/         # AppLayout, Header, LanUrlBadge, TabBar
│       │   ├── match/          # Match CRUD modals + list/detail
│       │   ├── registration/   # Shooter registration + bulk operations
│       │   ├── results/         # Results tables, public view, export
│       │   ├── scoring/        # Scoring sheets (core UI)
│       │   │   ├── shared/     # Reusable scoring widgets (TimeInput, HitCell, etc.)
│       │   │   └── sheets/    # Scoring type-specific sheets (IPSC, Steel, IDPA, etc.)
│       │   ├── settings/       # App settings, theme, language, WinMSS import
│       │   ├── shared/         # Shared components (CSV import, form fields, bulk toolbar)
│       │   ├── shooter/        # Shooter database management
│       │   └── stage/          # Stage CRUD, image upload, print score sheets
│       ├── hooks/              # 11 custom hooks (auth, scoring, device, etc.)
│       ├── stores/             # 7 Zustand stores
│       ├── services/
│       │   └── api.ts          # Typed fetch wrappers for all backend endpoints
│       ├── types/              # TypeScript type definitions
│       ├── utils/              # Client-side scoring, PDF, time formatting
│       └── i18n/               # i18next config + en.json, sk.json locales
│
├── electron/                   # Electron desktop wrapper
│   ├── src/
│   │   ├── main.ts            # Main process — window, menu, PG lifecycle
│   │   ├── preload.ts         # Preload script (exposes getDomainUrls)
│   │   ├── pg-manager.ts     # Embedded PostgreSQL start/stop/seed
│   │   ├── db-config-dialog.ts # DB config UI

│   │   └── logger.ts         # File logging
│   ├── scripts/
│   │   ├── afterPack.js       # Thins universal PG binaries per architecture
│   │   ├── bundle-backend.mjs # esbuild bundle for backend
│   │   ├── download-pg.sh     # Downloads platform-specific PostgreSQL
│   │   └── export-seed-data.sh # Exports seed data dump
│   └── resources/
│       ├── seed-data.dump     # Initial database seed
│       ├── icon.png, icon.svg
│       └── pg/                # Embedded PostgreSQL binaries (downloaded)
│
├── docker-compose.yml         # PostgreSQL + backend + frontend
├── .env.example               # Environment template
└── package.json               # npm workspaces (backend, frontend, electron)
```

---

## Critical Files

These files contain the core domain logic — bugs here directly affect scoring accuracy:

| File | Why It's Critical |
|------|------------------|
| `backend/src/utils/scoringCalc.ts` | Pure functions for Comstock/Virginia Count/Fixed Time/Chrono scoring. The most important file to get right. |
| `backend/src/routes/scoring.ts` | Score save (transaction-wrapped) + stage recalculation using SQL window functions for atomic ranking. |
| `frontend/src/utils/scoring.ts` | Client-side mirror of `scoringCalc.ts` for live score preview before saving. |
| `frontend/src/components/scoring/ScoringSheet.tsx` | Mobile-first per-shooter score entry — the core scoring UI. |
| `backend/src/app.ts` | Domain mode detection based on URL path. |
| `electron/src/pg-manager.ts` | Embedded PostgreSQL lifecycle — start, stop, seed data import on first launch. |
| `electron/src/main.ts` | Electron main process — window management, PG lifecycle. |
| `backend/src/utils/winmssMapper.ts` | WinMSS `.mdb` data mapping — aggregated score handling, tag/region resolution. |

---

## Database Schema

7 tables with cascading deletes:

```
matches ─────┬──► stages (cascade)
              ├──► match_registrations (cascade)
              │         └──► stage_scores (cascade)
              │                   ├──► target_scores (cascade)
              │                   └──► chrono_results (cascade)
shooters ─────────────────► (RESTRICT if registered in any match)
```

**Key design decisions:**
- `match_registrations` has nullable override columns (`division`, `category`, `power_factor`) that fall through to the shooter's defaults when NULL. This allows per-match property changes without mutating the shooter record.
- Per-target score storage in `target_scores` is essential for "best N hits per target" (Comstock) and Virginia Count extra-hit detection.
- `admin_sessions` table stores admin auth tokens (24h expiry).
- `app_settings` table stores admin password hash and app configuration.

**Migrations:** 12 numbered SQL files in `backend/src/db/migrations/` — run automatically on backend startup.

---

## Scoring Rules

| Zone | Major | Minor | Penalty | Points |
|------|-------|-------|---------|--------|
| A    | 5     | 5     | Miss    | -10    |
| C    | 4     | 3     | No-shoot| -10    |
| D    | 2     | 1     | FTSA    | -10    |
| Steel| 5     | 5     | Procedural | -10 |

### Scoring Types

- **Comstock** — Best N hits per target × PF values. Hit factor = net_points / time.
- **Virginia Count** — Same as Comstock + extra shot/hit/stacking penalties (-10 each). No steel.
- **Fixed Time** — Misses are NO penalty. Overtime shots = -5. Score = net_points directly (no hit factor).
- **Chrono** — PF = (bullet_weight × avg_velocity) / 1000. USPSA Major ≥ 165, IPSC Major ≥ 170. Minor ≥ 125.

### Stage Points

- `stage_percent = (HF / highest_HF) × 100`
- `stage_points = (stage_percent / 100) × max_points`
- DQ shooters get 0 stage_points across all stages
- DNF shooters get 0 on the missed stage only

---

## Scoring Flow

1. Range master selects stage → selects shooter → fills scoring sheet (time + per-target hits).
2. On save: backend calculates `raw_points`/`penalties`/`net_points`/`hit_factor` using `scoringCalc.ts`.
3. Score save is wrapped in a **database transaction** — safe for concurrent use by multiple range officers.
4. After save: triggers `recalculateStage()` using SQL CTEs with window functions for **atomic per-division ranking** (no JS loops, no interleaving).
5. Frontend shows live score preview (client-side `scoring.ts`) before saving.

---

## Authentication

Three access levels, determined by domain or login:

| Access | How | What They Can Do |
|--------|-----|-----------------|
| **Public** | `http://<lan-ip>:3001/results` or any URL | View results only, no login needed |
| **Stage Officer** | `http://<lan-ip>:3001/scoring` + stage password | Enter/edit scores for assigned stage |
| **Admin** | `localhost:3001` + admin password | Full access: create matches, register shooters, manage stages, change settings |

- Admin auth uses password + bcrypt-hashed token stored in `admin_sessions` table (24h expiry).
- Default admin password: `admin` (change on first use via Settings).
- `isLocalNetwork` is only for UI routing (which login form to show), not for granting admin access.

---

## WinMSS Import

The app can import shooter data and scores from WinMSS `.mdb` database files:

- WinMSS stores **aggregated totals** per shooter per stage (e.g., `ScoreA=22, ScoreC=8`), not per-target breakdowns.
- WinMSS `ScoreA` **includes steel hits** — steel scores 5 points (same as A), so steel is counted in ScoreA. Must NOT add steel×5 separately.
- `calculateAggregatedScore()` bypasses per-target "best N" capping entirely.
- `distributeHits()` fills targets with A→C→D→miss respecting HPP (hits per paper) capacity for display purposes.
- Tags and regions are resolved from WinMSS lookup tables (`tblTag`, `tblTypeRegion`).

---

## Electron Desktop App

The Electron build bundles **everything** into a standalone desktop application:

- **Frontend** — built by Vite, served as static files.
- **Backend** — bundled by esbuild into a single JS file.
- **PostgreSQL** — platform-specific binaries downloaded into `electron/resources/pg/`.

On first launch, `pg-manager.ts` initializes a PostgreSQL data directory, starts the server, and imports seed data from `seed-data.dump` (using `pg_restore --disable-triggers`). A `.seeded` marker prevents re-import on subsequent starts.

The `afterPack` hook thins universal Mach-O binaries per-architecture so `@electron/universal` can merge them correctly for macOS universal builds.

The LAN URL is displayed in the admin header UI for mobile access.

---

## Internationalization

The app supports **English** and **Slovak** via i18next:

- Locale files: `frontend/src/i18n/locales/en.json`, `sk.json`
- Language selector in Settings
- All UI strings are externalized

---

## Windows Compatibility

- PostgreSQL DLLs must be in the **same directory** as the EXEs (not `lib/`).
- `pg_ctl start -w` can hang — the app uses `waitReady()` TCP check instead.
- Always use `execFile` (not `exec`) to avoid `cmd.exe` quoting issues.
- Windows ARM64 can run x64 binaries through emulation (requires enabling).

---

## Coding Principles

1. **Separate components in separate files** — Each component gets its own file. Files exceeding ~150 lines should be split.
2. **No duplicate code** — Extract common logic into hooks and exported functions.
3. **Non-UI logic lives in hooks** — States, functions, `useEffect`, computed variables must be in custom hooks. Components should only contain JSX + hook calls.
4. **No prop drilling** — Use Zustand stores or shared hooks instead of passing props through multiple levels.
5. **Call hooks and functions directly** — Variables, functions, hooks should be called inside the component that uses them, not passed down.
6. **Only pass callbacks for parent reactions** — Only pass a callback from child to parent if the parent needs to react to it (e.g., `onClick`). Never pass data or handlers the child could access itself.