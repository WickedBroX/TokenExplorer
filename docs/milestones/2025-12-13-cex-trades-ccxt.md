# Milestone: CEX Trades (CCXT) — Gate.io + MEXC + KuCoin

**Created:** 2025-12-13  
**Restore point:** `restore-points/cex-ccxt-start-2025-12-13_111021/`  
**Goal:** Add CEX trade + daily volume ingestion and UI, without impacting existing DEX/transfers functionality.

## Decisions (locked)
- **Exchanges (MVP):** Gate.io, MEXC, KuCoin
- **Library:** CCXT (open-source, REST polling; no WebSockets/CCXT Pro for MVP)
- **Source of truth:** CEX data is off-chain; keep clearly separated from DEX/on-chain data.
- **Enablement:** feature-flagged (`CEX_ENABLED=0/1`) and safe-by-default (off unless explicitly enabled).

## Data to Display (MVP)
- **Recent CEX trades** per exchange + symbol:
  - Timestamp/Age, Side, Price, Amount (BZR), Value (quote), Exchange, Pair
- **Daily total volume**
  - 24h volume (quote, ideally stablecoin), trade count
  - Daily chart series (last N days)

## Backend Work Items
- [ ] DB migration: `cex_markets`, `cex_trades`, `cex_daily_stats`, `cex_ingest_state`
- [ ] CCXT exchange adapters (Gate.io, MEXC, KuCoin) with `enableRateLimit`
- [ ] Ingestion loop (polling) w/ backoff + per-market cursor
- [ ] API endpoints:
  - [ ] `GET /api/cex/markets`
  - [ ] `GET /api/cex/trades`
  - [ ] `GET /api/cex/volume/daily`
- [ ] Admin/config path to set tracked markets (env-based first; UI later if needed)

## Frontend Work Items
- [ ] New page/tab: `CEX Trades`
- [ ] Mobile + desktop layouts matching DEX polish
- [ ] KPI row: 24h volume + 24h trades (top of page)
- [ ] CSV export

## Safety / QA Checklist
- [ ] Defaults do nothing unless `CEX_ENABLED=1`
- [ ] Per-exchange failures never crash the ingester
- [ ] Idempotent inserts via unique constraints
- [ ] Rate limit + concurrency caps
- [ ] Clear “CEX” labeling everywhere (avoid mixing with DEX)

## Notes
- If BZR is not listed on an exchange, ingestion should report “market not found” and continue.
- Prefer stable-quote pairs (`*/USDT`, `*/USDC`) for meaningful USD-ish volume without conversions.

## Market Discovery (CCXT)
**Scan target:** Gate.io, MEXC, KuCoin  
**Token:** `BZR`  
**Result:** Only **MEXC** exposes `BZR/USDT` via CCXT market listings; Gate.io and KuCoin report no `BZR/*` markets.

Suggested env:
- `CEX_EXCHANGES=mexc`
- `CEX_MARKETS=mexc:BZR/USDT`
