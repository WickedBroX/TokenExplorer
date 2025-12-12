# Milestone: DEX Trades (TokenTrade) Tab

**Goal:** Recreate Etherscan’s “Token Trade / DEX Trades” view for BZR using on‑chain Swap logs, persisted in our DB for fast pagination and accurate totals.

**Scope Constraints**
- Do not break existing Transfers/Holders/Analytics flows, caching, or admin-config.
- Reuse existing multi‑chain provider helpers (Etherscan V2 + Blockscout/Cronos proxy) and backoff/key‑rotation patterns.
- Serve UI from DB snapshots after ingestion; never scan logs on every page view.

---

## Milestones & Status

### 1) Backend — DB Schema for DEX Pools & Trades
**Status:** ✅ Completed  
**Tables**
- `dex_pools` (per chain): poolAddress, chainId, dexType, token0, token1, createdBlock, lastSyncedBlock, metadata.
- `dex_trades` (per chain): poolAddress, chainId, txHash, logIndex, blockNumber, timestamp, side (buy/sell), amountBzr, amountQuote, priceUsd, quoteSymbol, trader, createdAt.

**Tasks**
- [x] Add SQL migrations (`011-create-dex-tables.sql`).
- [x] Add indexes for `(chainId, blockNumber DESC)`, `(txHash, logIndex) UNIQUE`, `(poolAddress, blockNumber)`.

---

### 2) Backend — Pool Discovery (Per Chain)
**Status:** ✅ Completed (DexScreener discovery)  
**Requirement**
- Discover all DEX pools containing BZR on each supported chain.
- Initial coverage: Uniswap V2‑style factories (PairCreated) and Uniswap V3‑style factories (PoolCreated). Add other factories later (Sushi, Pancake, etc.) by config.

**Tasks**
- [x] Implement DexScreener‑based pool discovery and upsert into `dex_pools`.
- [x] Add manual trigger (current backfill script runs discovery inline).
- [ ] (Optional accuracy) Add factory-log based discovery per chain (PairCreated/PoolCreated).

---

### 3) Backend — Swap Ingestion & Backfill
**Status:** 🚧 In progress  
**Requirement**
- For each pool, fetch Swap logs from `createdBlock → latest` using provider `getLogs`.
- Decode amounts for V2/V3 pools, infer buy/sell for BZR, compute USD using our price feed at block time (best available).
- Persist into `dex_trades` with idempotency (txHash+logIndex unique).

**Tasks**
- [x] Add `dexTradesService.backfillPool(pool)` (logs + decode + store).
- [x] Add manual script `bzr-backend/scripts/backfill-dex-trades.js`.
- [ ] Add incremental `syncPool` from `lastSyncedBlock`.
- [ ] Add scheduler (staggered runs, similar to holders snapshot refresh).

---

### 4) Backend — API Endpoints
**Status:** ✅ Completed  
**Routes**
- `GET /api/dex-trades` (per chain or chainId=0 aggregated).

**Requirements**
- Params: `chainId` (0=All), `page`, `pageSize`, `sort` (newest/oldest), optional `address` (trader), optional `pool`.
- All Chains: read from DB aggregated view, stable sort by blockNumber DESC, then paginate.
- Return meta: `page`, `pageSize`, `total`, `hasMore`, `lastUpdated`.

**Tasks**
- [x] Add controller + service wiring.
- [ ] (Optional) Add DB view for aggregated reads if needed.

---

### 5) Frontend — DEX Trades Page
**Status:** ✅ Completed  
**Routes**
- `/dex-trades` (nav label: “DEX Trades” or “Trades”).

**Requirements**
- Table UX mirrors Transfers:
  - Chain selector (All Chains supported).
  - Pagination, pageSize selector, newest/oldest sort.
  - Optional search by trader address / tx hash.
  - CSV export of visible rows.
- Rows show: Rank, Tx Hash, Time, Trader, Side, Quantity (BZR), Quote Amount, Price (USD), Value (USD), Chain, Pool (optional).

**Tasks**
- [x] Add `useDexTrades` hook.
- [x] Add `DexTradesPage` with table + filters + CSV export.
- [x] Add nav item and scroll target mapping.
- [x] Deploy frontend bundle (includes DEX Trades nav/tab).

---

### 6) Operations — Initial Backfill
**Status:** ✅ Completed (initial run)  
**Tasks**
- [x] Run `node scripts/backfill-dex-trades.js` on production to create initial snapshot.

---

## Optional (Speed/Accuracy)
**Status:** ⏳ Optional  
- [ ] Add more factories per chain (Sushi/Pancake/Aerodrome/etc.) via admin‑config.
- [ ] Add “DEX summary” widgets on Analytics (24h DEX volume, top pools).
- [ ] Price at block time: integrate TWAP/DEX quote for more accurate historical USD.

---

## Notes / Decisions
- Etherscan Pro V2 has no direct TokenTrade endpoint; this feature is derived from Swap logs.
- CEX trades are **out of scope**; this tab is DEX‑only unless we add another data source later.
- Pool coverage is incremental: start with core factories, expand safely after validation.
