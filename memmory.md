# TokenExplorer Memory

Working snapshot for BZR Token Explorer as of now.

## Project Overview
- Multi-chain BZR token explorer (Ethereum, Polygon, BNB, Arbitrum, Base, Avalanche, Optimism, Fantom, Celo, Cronos).
- Frontend: React 19 + TypeScript + Vite (rolldown) + Tailwind, React Query, Recharts.
- Backend: Node/Express 5, Postgres, multi-provider APIs, caching/rate limiting.

## Repository Layout (top level)
- `bzr-frontend/` – React app; see structure below.
- `bzr-backend/` – Express API; see structure below.
- `docs/` – Documentation index, features notes, empty deployment guide placeholder.
- `scripts/` – Deployment/utility scripts (backend, frontend, SSL, backfill, test-search).
- `IMPROVEMENTS-SUMMARY.md` – Completed work log and next targets.
- `README.md` – Project overview and quick start.
- Other: `SSL/`, `SERVER SSL/`, `backup/`, `dist/` folders exist (not yet reviewed).

## Frontend Structure (`bzr-frontend/`)
- Entry: `src/main.tsx`, layout `src/App.tsx`, global styles `src/App.css`/`src/index.css`.
- UI: `src/components/` (charts, tables, headers, modal, ErrorBoundary, icons), `src/layouts/`.
- Pages: `src/pages/` (Admin, Analytics, Holders, Info, Transfers).
- Data/hooks: `src/hooks/api/` (analytics, holders, market, token info/price/stats, transfers, finality), `src/hooks/useAutoRefresh.ts`.
- Config: `src/constants/`, `src/types/`, `src/utils/`, assets in `src/assets/`.
- Tests: `src/hooks/api/__tests__/`, `src/test/` plus Vitest setup.
- Scripts: `npm run dev`, `build`, `lint`, `test`, `test:coverage`, `preview`. Uses Vitest + happy-dom; coverage target ~60% (currently ~15%).

## Backend Structure (`bzr-backend/`)
- Entry: `server.js` (Express 5). TS sources live in `src/` with helpers in `dist/` (not inspected).
- Core folders: `src/controllers/`, `src/routes/`, `src/services/`, `src/providers/`, `src/utils/`, `src/middleware/`, `src/config/chains.js`.
- Data/ingestion: `src/analyticsService.js`, `persistentStore.js`, `transfersIngestion.js`.
- Tests: `src/__tests__/` and `tests/` (Node test runner).
- Scripts: `npm run dev` (nodemon), `start`, `migrate` (`scripts/migrate.js`), `seed:transfers`.
- Needs `.env` (copy from `.env.example` if present; add API keys).

## Documentation
- `docs/README.md` – links and structure overview.
- `docs/features/` – many feature/issue writeups (search fixes, modal responsiveness, analytics, pricing, etc.).
- `docs/deployment/DEPLOYMENT-GUIDE.md` – currently empty placeholder.
- Root `IMPROVEMENTS-SUMMARY.md` – lists completed phases, test status, deferred items (lazy loading/bundle size, TS strict), and next actions.

## Common Workflows
- Setup: Node 20+. Install deps per app (`npm install` in `bzr-frontend` and `bzr-backend`). Create/fill `.env` for backend.
- Run dev: `cd bzr-frontend && npm run dev`; `cd bzr-backend && npm run dev`.
- Tests: frontend `npm run test` / `npm run test:coverage`; backend `npm test`. Target to raise coverage beyond ~15%.
- Build: frontend `npm run build`; backend uses `npm start` (compiled JS in `server.js`; TS via `ts-node` for scripts).
- Deployment: scripts in `/scripts` (`deploy-backend.sh`, `deploy-frontend.sh`, `deploy-backfill-scripts.sh`, `deploy-step1.sh`, `deploy-ssl.sh`); `test-search.sh` for search validation.

## Open Priorities/Notes
- Push test coverage toward 60%+ (current ~15%).
- Deferred: bundle size optimizations/lazy loading, enabling TS strict mode (requires refactors).
- Deployment guide is empty; fill when ready.
