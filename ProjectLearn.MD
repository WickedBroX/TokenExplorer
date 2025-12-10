# ProjectLearn

High-level documentation to help any engineer or AI take over the project quickly. Covers stack, structure, data flows, key endpoints, and deployment.

## 1) Stack at a Glance
- **Frontend:** React 19 + TypeScript, Vite (rolldown-vite), Tailwind CSS, TanStack Query, Recharts, Lucide icons.
- **Backend:** Node.js 20, Express 5, Axios, PostgreSQL (primary datastore), dotenv, rate limiting, helmet, compression.
- **Ingestion/Jobs:** `bzr-backend/ingester.js` and holders snapshot refresh inside `holdersService`.
- **Auth/Security:** JWT for admin, bcrypt for passwords, CORS/helmet/rate-limit on API.
- **Deployment:** rsync + npm install + migrations + systemd. Scripts live in `/Users/wickedbro/Desktop/TokenExplorer/scripts` and `bzr-backend/deploy/systemd`.
- **Environments:** `.env` in backend (loaded by dotenv). DB: PostgreSQL on server (`bzr_transfers`).

## 2) Repository Layout (top-level)
- `bzr-backend/` — Express API + ingestion + migrations.
- `bzr-frontend/` — React SPA.
- `docs/` — milestone trackers, holder plan, etc.
- `scripts/` — deployment helpers (`deploy-backend.sh`, `deploy-frontend.sh`, etc.).
- `API-NEW.txt` — bundle endpoints for multi-chain supply (max/total/circulating).
- `backup/` — restore points.

## 3) Backend Details (bzr-backend)
### Key Entry Points
- `server.js` — boots Express, wires controllers, middleware (helmet, compression, rate limits).
- `ingester.js` — background ingestion for transfers across chains.

### Notable Directories
- `src/controllers/`
  - `infoController.js` — `/api/info`, `/api/price`; pulls Etherscan V2 + bundle overrides. Max/circulating now overridden by bundle (`/maxcoins`, `/circulating`).
  - `holdersController.js` — holders list, pagination, supply metadata; now allows larger page sizes (up to 500).
- `src/services/`
  - `holdersService.js` — fetch from explorers, snapshot-first, force-live option, backfill scheduler, pagination helpers, CSV export support.
  - `tokenService.js` — price lookup (used by `infoController`).
  - `configService.js` — token address + chain config.
- `migrations/` — Postgres schema (token_info, transfers, holders_snapshot, holder_counts, etc.).
- `deploy/systemd/` — service unit files for backend + ingester.
- `scripts/` — `migrate.js`, start scripts, seed helpers.

### Data Flow (Holders)
1. `/api/holders` -> `holdersController` -> `holdersService`.
2. Service uses snapshot (Postgres holders_snapshot) if available; otherwise hits explorers per chain; supports backfill and `forceLive`.
3. Pagination enforced, sorting by quantity descending; percentage bars calculated client-side using supplied totalSupply.
4. CSV export uses the same data (Rank, Address, Chain, Quantity, Value).

### Data Flow (Supply Info)
1. `infoController` calls Etherscan V2 for base token details.
2. Overrides total supply with bundle `maxcoins`; overrides circulating with bundle `circulating` (absolute value, micro-scaling by decimals).
3. Persists to `token_info` table (formatted + raw). `_source` indicates upstream/bundle.

### Environment / Config
- `.env` (server): includes DB URL, ETHERSCAN_V2_API_KEY, chain-specific keys, BZR_BUNDLE_BASE_URL (default `https://bzr-bundle.info-exchangepro3617.workers.dev`), overrides for max/circ.
- DB: Postgres at `127.0.0.1:5432/bzr_transfers` (user/pass in server env).
- Ports: API on 3001 (behind nginx on production).

## 4) Frontend Details (bzr-frontend)
### Entry & Routing
- `src/main.tsx` bootstraps React with router/layouts.
- `src/layouts/MainLayout.tsx` wraps pages.
- Key pages: `src/pages/TransfersPage.tsx`, `HoldersPage.tsx`, `InfoPage.tsx`, `AboutPage.tsx`, `AdminPage.tsx`.

### State/Data
- TanStack Query hooks under `src/hooks/api/`:
  - `useTokenInfo` — calls `/api/info?cb=<ts>` (cache-busted, zero stale); returns supply/metadata.
  - `useMarketOverview`, `useTokenPrice`, `useTokenStats` — market + price endpoints.
  - `useHolders` — pulls holders list with pagination/filtering.
- Utilities:
  - `src/utils/exportUtils.ts` — CSV export (Rank, Address, Chain, Quantity, Value).
  - `src/utils/api.ts` — API base URL.
  - `src/utils/formatters.ts` — number and USD formatting.

### Components of Note
- `TokenOverviewHeader.tsx` — top stats card; now prefers bundle-provided max/circulating from `/api/info` and falls back to market API if missing.
- `HoldersTab.tsx` — holders table + mobile cards; sorting by balance, per-chain filter, CSV export, percentage bars.
- `Admin` forms for content management (social links, footer, etc.), with drag/drop work in docs.

### Styling/Build
- Tailwind (v4 config), custom CSS via classes.
- Vite (rolldown-vite), React 19, TypeScript 5.9.
- Icons via `lucide-react`.

## 5) Deployment & Ops
- **Backend deploy:** `SSH_PASSWORD=... ./scripts/deploy-backend.sh`
  - Rsync to `/var/www/bzr-backend`, npm install, run migrations, restart systemd services.
  - Services: `bzr-backend`, `bzr-ingester`.
- **Frontend deploy:** `SSH_PASSWORD=... ./scripts/deploy-frontend.sh`
  - Builds via Vite, rsync `dist` to server web root.
- **Health checks:** `https://bazaars.io/api/health`, `https://bazaars.io/api/info`.
- **Logs (server):** `journalctl -u bzr-backend -u bzr-ingester -n 100 --no-pager`.

## 6) External Data Sources
- **Bundle multi-chain (authoritative supply):**
  - Max: `https://bzr-bundle.info-exchangepro3617.workers.dev/maxcoins`
  - Circulating: `https://bzr-bundle.info-exchangepro3617.workers.dev/circulating`
  - Chain-specific via `?chains=eth|bsc|pol|...` (see `API-NEW.txt`).
- **Explorer APIs:** Etherscan-like endpoints per chain (configured in `config/chains`, keys in `.env`).
- **Price/market:** Token price service (server) and market overview endpoints (frontend hooks).

## 7) DB Schema (summary)
- `token_info` — token metadata, raw/formatted supply, source_data, timestamps.
- `transfers_*` tables — per-chain transfer data (ingester).
- `holders_snapshot` — cached holders by chain/page.
- `holder_counts` — aggregated counts across chains.
- `settings` — admin-configurable settings (social links, menus).

## 8) Current Supply Behavior
- Backend `/api/info`:
  - **Max supply** = bundle `maxcoins` (scaled to raw by decimals) if available; else upstream.
  - **Circulating** = bundle `circulating` (abs, scaled) if available; else upstream.
- Frontend:
  - Supply card pulls from `/api/info` (cache-busted) and prefers those values over market API.

## 9) How to Run Locally
```bash
# Backend
cd bzr-backend
npm install
cp .env.example .env   # if present; otherwise set env vars manually
npm run migrate
npm start              # or npm run dev

# Frontend
cd bzr-frontend
npm install
npm run dev            # Vite dev server
```

## 10) Quick Reference Commands
- Deploy backend: `SSH_PASSWORD=... ./scripts/deploy-backend.sh`
- Deploy frontend: `SSH_PASSWORD=... ./scripts/deploy-frontend.sh`
- Force info refresh: `curl "https://bazaars.io/api/info?force=true"`
- Check holders: `curl "https://bazaars.io/api/holders?chainId=1&page=1&pageSize=50"`

## 11) Known Focus Areas
- Holders: snapshot caching, multi-chain aggregation, CSV export.
- Supply: bundle overrides for max/circulating to avoid stale explorer data.
- Admin: content management (social links, footer), drag/drop roadmap.

## 12) Files Worth Reading First
- Backend: `server.js`, `src/controllers/infoController.js`, `src/services/holdersService.js`, `src/controllers/holdersController.js`, `deploy/systemd/*`.
- Frontend: `src/hooks/api/useTokenInfo.ts`, `src/components/TokenOverviewHeader.tsx`, `src/components/HoldersTab.tsx`, `src/utils/exportUtils.ts`, `src/layouts/MainLayout.tsx`.

This document is intentionally concise but covers how the pieces fit together. Use it to onboard new contributors or other AI agents rapidly.
