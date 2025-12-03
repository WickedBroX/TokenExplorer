# Phase A Implementation Plan — Transfer Ingestion & Cache Warmers

**Milestone:** Backend Stability & Analytics  
**Phase:** A — Transfer Ingestion & Cache Warmers  
**Target Completion:** 2025-11-24  
**Primary Owners:** Backend (ingestion/API), DevOps (infrastructure)

---

## 1. Objectives
- Serve `/api/transfers` (single-chain & aggregate) predominantly from a persistent store.  
- Eliminate burst traffic to upstream explorers by introducing rate-aware ingestion workers.  
- Re-enable cache warmers with controlled concurrency, feeding from the new data pipeline.  
- Surface warm status & diagnostics so operations can verify freshness.

---

## 2. Scope & Deliverables
| Deliverable | Description | Acceptance Criteria |
| --- | --- | --- |
| D1 | Transfer persistence layer | Schema created, CRUD tested, write throughput ≥ 50 tx/s, retention ≥ 90 days |
| D2 | Chain ingestion workers | Backfills historical data, streams new pages, respects rate limits |
| D3 | API integration | `/api/transfers` reads from store, honors pagination/filters, includes freshness metadata |
| D4 | Warm status service | `/api/cache-health` exposes per-chain ingest lag + last success |

Out of scope: analytics aggregation (Phase C), UI changes beyond new metadata display.

---

## 3. Constraints & Dependencies
- **Upstream limits:** Etherscan 10 req/sec per key, Cronos API variable latency.  
- **Infrastructure:** Needs Redis or Postgres instance accessible from backend subnet.  
- **Security:** Secrets managed via `.env` or secrets manager; no plain-text in repo.  
- **Data volume:** Estimate 3–5M transfers across chains → plan for ~2 GB raw storage.

Dependencies on DevOps to provision datastore + secure credentials (see Timeline §8).

---

## 4. Architecture Overview
```
        +--------------+        +----------------+        +-------------------+
        |  Schedulers  | -----> |  Ingestion Job | -----> | Persistent Store  |
        +--------------+        +----------------+        +-------------------+
                |                          |                           |
                |                          v                           v
                |                +----------------+          +-------------------+
                |                | Dedup & Normal |          | Cache Warm Service|
                |                +----------------+          +-------------------+
                |                          |                           |
                +--------------------------+---------------------------+
                                           v
                                  +----------------+
                                  |  API Layer     |
                                  | (/api/transfers)
                                  +----------------+
```

### Key Components
1. **Schedulers** — per-chain cron/queue driving historical backfill + incremental fetch.
2. **Ingestion Job** — fetches from upstream, enforces rate limits, writes normalized rows.
3. **Persistent Store** — Postgres (recommended) or Redis Streams for ordered storage.
4. **Cache Warm Service** — precomputes frequently requested pages/aggregates.
5. **API Layer** — reads from store/cache, attaches metadata (staleness, source).

---

## 5. Data Model (Postgres Recommended)
```sql
CREATE TABLE transfers (
  id BIGSERIAL PRIMARY KEY,
  chain_id INTEGER NOT NULL,
  block_number BIGINT NOT NULL,
  tx_hash BYTEA NOT NULL,
  log_index INTEGER NOT NULL,
  time_stamp TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  from_address BYTEA NOT NULL,
  to_address BYTEA NOT NULL,
  value NUMERIC(78, 0) NOT NULL,
  gas_used BIGINT,
  gas_price BIGINT,
  input BYTEA,
  method_id CHAR(10),
  payload JSONB,
  inserted_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(chain_id, tx_hash, log_index)
);

CREATE INDEX idx_transfers_chain_time ON transfers(chain_id, time_stamp DESC);
CREATE INDEX idx_transfers_chain_block ON transfers(chain_id, block_number DESC);
```

Additional tables:
- `ingest_cursors(chain_id INT PRIMARY KEY, last_block BIGINT, last_tx_hash BYTEA, updated_at TIMESTAMP)`  
- `ingest_events(id BIGSERIAL, chain_id INT, status TEXT, message TEXT, occurred_at TIMESTAMP)` for monitoring.

If Redis is chosen: use sorted sets per chain (`zadd transfers:<chainId> timestamp txJson`).

---

## 6. Ingestion Pipeline
### 6.1 Historical Backfill
- **Strategy:** iterate backward from latest block using existing `tokentx` window, store pages until earliest required date.  
- **Rate Control:** `p-limit` (concurrency=1) with 1.5s delay between requests per chain; track current rate via token bucket.  
- **Retries:** exponential backoff (1s, 2s, 4s, 8s, max 1m) with jitter for HTTP 429/5xx.  
- **Dedup:** rely on `UNIQUE` constraint + UPSERT; log duplicates.

### 6.2 Incremental Sync
- Run every 30 seconds per chain.  
- Use cursor (last_block, last_tx_hash/log) to request next pages.  
- Stop when first stored hash matches existing record (already ingested).  
- Emit ingest event metrics (rows inserted, API latency, errors).

### 6.3 Cronos Handling
- Use existing log window logic but persist retrieved logs.  
- Keep separate cursor for `from_block`.  
- Validate mapping to ensure non-empty dataset before flipping API source.

---

## 7. API & Cache Updates
1. **Feature Flag:** `TRANSFERS_DATA_SOURCE=persistent|upstream` to allow progressive rollout.  
2. **Service Layer:** new module `src/services/transfersStore.ts` providing query helpers (paginate, filter by block range).  
3. **Aggregation:** aggregated `/api/transfers` (chainId=0) will query per-chain pages from store, union + sort.  
4. **Metadata:** response gains `source: 'store'|'upstream'`, `lastIngestedAt`, `ingestLagSeconds`.  
5. **Cache Warmers:** use queue to precompute page 1 per chain hourly; store results in NodeCache / Redis.

---

## 8. Timeline & Task Breakdown
| Week | Task | Est. | Owner | Dependencies |
| --- | --- | --- | --- | --- |
| Wk1 Mon | Provision Postgres + secrets | 1d | DevOps | infra ticket |
| Wk1 Tue-Wed | Implement schema + migrate scripts | 1d | Backend | DB provision |
| Wk1 Thu | Prototype ingestion for Ethereum | 1d | Backend | schema |
| Wk1 Fri | Extend ingestion across chains + rate control | 1d | Backend | prototype |
| Wk2 Mon | Implement Cronos ingest module | 1.5d | Backend | ingestion scaffolding |
| Wk2 Tue | Write integration tests (store read/write) | 0.5d | Backend | schema |
| Wk2 Wed | Wire `/api/transfers` to store (feature flag) | 1d | Backend | ingestion writes |
| Wk2 Thu | QA validation + load test | 1d | QA | feature flag |
| Wk2 Fri | Re-enable warmers + update `/api/cache-health` | 0.5d | Backend | store queries |

Buffer reserved for bugfix / upstream hiccups.

---

## 9. Testing Strategy
- **Unit:** ingestion normalizers (Etherscan & Cronos) with recorded fixtures.  
- **Integration:** end-to-end test writing to local Postgres + querying API.  
- **Load:** simulate 10 concurrent API clients fetching pagination to ensure latency < 300ms.  
- **Failover:** kill upstream connectivity → API should serve cached data + warn `source:'store'` with stale timestamp.

---

## 10. Monitoring & Observability
- Log ingestion metrics (rows inserted, duration, rate-limit responses).  
- Expose `/api/cache-health` fields: `ingestLagSeconds`, `lastSuccess`, `queuedJobs`.  
- Add alerts if lag > 5 minutes or ingestion errors > 5/minute.

---

## 11. Rollout Plan
1. Deploy with feature flag set to `upstream`.  
2. Run ingestion jobs for 24h to fill store.  
3. Flip staging API to `store`; validate analytics & totals.  
4. Once stable, flip production flag chain-by-chain.  
5. Monitor metrics + logs for 48h before declaring Phase A complete.

---

## 12. Risks & Mitigations
| Risk | Impact | Mitigation |
| --- | --- | --- |
| Postgres storage cost/exhaustion | High | Partition table monthly, prune >90 days, monitor disk |
| Upstream schema change | Medium | Validation layer, email alerts, fall back to upstream temporarily |
| Cronos rate limits | Medium | Increase backoff, coordinate with Cronos support for higher quota |
| Worker crash | Medium | Use PM2/systemd with restart policy, log alerts |
| Data drift | Medium | Nightly comparison job, diff with Etherscan counts |

---

## 13. Open Questions
1. Confirm datastore choice (Postgres vs Redis vs other).  
2. Decide retention period (90 days default vs longer?).  
3. Clarify storage budget + monitoring pipeline (Grafana/Splunk?).

Once decisions are made, update this doc and create tickets per task.

---

## 14. Implementation Notes — 2025-11-05
- **Datastore:** Postgres via connection string `TRANSFERS_DATABASE_URL`; schema bootstrapped automatically on server start.  
- **Ingestion:** Background loop fetches latest pages per chain (default page size 100, max 5 pages/cycle) with concurrency governed by `TRANSFERS_INGEST_CONCURRENCY`.  
- **Feature Flag:** Set `TRANSFERS_DATA_SOURCE=persistent` to serve `/api/transfers` from the new store; legacy cache warmers auto-disable in this mode.  
- **Health:** `/api/cache-health` now returns store readiness plus ingest lag.  
- **Tests:** Added `node --test` suite using `pg-mem` to validate persistence CRUD and cursor tracking.  
- **Pending:** Provision production Postgres, load secret env vars, and monitor lag via new endpoint; extend ingestion for deep backfill beyond rolling window if longer history required.
