# CLAUDE.md

> Project-specific instructions for Claude Code working in this repo.

## What this repo is

IPSCScore — an IPSC scoring application. Monorepo: `backend/` (Express + PostgreSQL), `frontend/` (React + Vite), `electron/` (desktop shell). Docker for development.

## Two facts that change how you work here

1. **You have persistent memory** via the graymatter MCP server. Before starting a task, search memory for prior context. After making a durable decision or completing implementation, store a fact. See [`AGENTS.md`](AGENTS.md) for the full workflow, agent_id conventions, and write triggers.
2. **bbolt is single-writer.** Only one MCP server instance may hold the write lock. If you're running alongside another agent or the TUI dashboard and `memory_add` fails with a lock error, degrade gracefully — surface the error to the user, suggest closing competing processes, and don't retry in a loop.

## Codebase basics

- **Build**: `docker compose build frontend && docker compose up -d frontend`
- **Backend**: `npm run dev` inside the backend container
- **Test**: check `package.json` scripts in each workspace
- **Monorepo**: npm workspaces at root (`backend/`, `frontend/`, `electron/`)

## Conventions

- Branches off `main`. Feature branches named `feature/<name>`.
- i18n: common verb labels in `common.*`; entity-type strings use `{{entity}}` interpolation (Slovak grammar).
- UI: prefer flowbite-react `<Button>` over native `<button>`.

## Where docs live

- [`AGENTS.md`](AGENTS.md) — graymatter memory workflow, agent_id scheme, write triggers, anti-patterns
- `frontend/src/i18n/locales/{en,sk}.json` — translation strings
- `docker-compose.yml` — service definitions and volume mounts
