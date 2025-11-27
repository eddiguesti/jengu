# Project Documentation Index

Welcome — this is the central entry point for the Jengu documentation.

- **Top-level guidance**: `docs/root/README.md` (recommended landing page)
- **Project-wide guidance**:
  - `docs/root/CLAUDE.md`
  - `docs/root/NEXT-STEPS.md`
  - `docs/root/IMPROVEMENTS-SUMMARY.md`

- **Backend docs**: `docs/backend/README.md`, `docs/backend/README.docker.md`

Developer docs live under `docs/developer/` — check `docs/developer/ARCHITECTURE.md` first when making changes.

How to run locally (high level):

1. Prefer Docker if you don't want to install Node locally:
   - `cd backend && docker compose -f docker-compose.dev.yml up --build`

2. Or install Node 20+ and `pnpm` and run the dev servers:
   - `npm install -g pnpm` (or enable `corepack`)
   - `pnpm install`
   - `pnpm --filter backend run dev`

3. Health check: `curl http://localhost:3001/health`

See `Makefile` at the repo root for convenient targets.
