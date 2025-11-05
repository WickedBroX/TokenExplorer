# 🚀 Backend Stability & Analytics Milestone

**Owner:** Engineering (Backend + Data)  
**Start Date:** 2025-11-05  
**Target Completion:** 2025-12-15  
**Status:** 🟡 Planned

---

## 🎯 Mission
Deliver a rock-solid backend that can serve accurate, high-resolution analytics without tripping upstream rate limits, even as the frontend scales. This milestone implements the “Suggested upgrades” roadmap: persistent transfer ingestion, precise totals, restored analytics, resilient pricing, and better observability.

---

## 📦 Deliverables by Phase

### Phase A — Transfer Ingestion & Cache Warmers
**Goal:** Serve `/api/transfers` primarily from local storage instead of live upstream hits.

| Item | Description | Owner | Success Criteria |
| --- | --- | --- | --- |
| A1 | Deploy Redis/Postgres (or Pick) for transfer persistence | Backend | DB reachable from API server with basic schema |
| A2 | Implement ingestion worker per chain w/ rate-aware scheduler | Backend | <=1 upstream call/sec per key, retries w/ backoff |
| A3 | Migrate `/api/transfers` to read from store, expose warm status | Backend | 95th percentile latency < 300ms, zero Etherscan bursts |
| A4 | Re-enable cache warming using queue | Backend | Warm status dashboard shows Fresh for all chains |

**Dependencies:** Infrastructure access, credentials for datastore.  
**Risks:** Schema design, Cronos log volume.

---

### Phase B — Accurate Totals & Data Quality
**Goal:** Eliminate approximated counts and align cached data with reality.

| Item | Description | Owner | Success Criteria |
| --- | --- | --- | --- |
| B1 | Persist per-chain totals with upstream metadata | Backend | Totals endpoint includes `sourceTimestamp` + `accuracy` |
| B2 | Cronos reconciliation job (compare log fetch vs actual transfers) | Backend | Cronos `/api/transfers` returns >= 1 page of real data |
| B3 | Data validation suite (counts vs explorers) | QA/Data | Nightly report <2% variance or alerts raised |
| B4 | Holder/stats fallback uses last-known-good instead of zero | Backend | Outage simulation returns cached values with `stale=true` |

---

### Phase C — Analytics Engine Rebuild
**Goal:** Restore “world class” analytics endpoint on top of the new store.

| Item | Description | Owner | Success Criteria |
| --- | --- | --- | --- |
| C1 | Daily aggregation job (per chain & global) | Data | Aggregates persisted with retention 90 days |
| C2 | `/api/analytics` returns metrics, predictions, anomalies | Backend | Matches frontend schema, <200ms response |
| C3 | Backfill historical analytics once | Data | 90 days computed without timeouts |
| C4 | Update frontend to consume backend analytics only | Frontend | Client build removes local aggregation code |

---

### Phase D — Pricing & Finality Resilience
**Goal:** Harden secondary endpoints against upstream instability.

| Item | Description | Owner | Success Criteria |
| --- | --- | --- | --- |
| D1 | Multi-source price fetch with health scoring | Backend | `/api/token-price` includes `sources[]` + best pick |
| D2 | Circuit breaker for failing providers (Etherscan, RPC) | Backend | Fallback metrics show open/closed state |
| D3 | Configurable cache TTL per endpoint (env-driven) | DevOps | Runtime change without redeploy |
| D4 | SLA dashboard for price/finality latency | Data/DevOps | Grafana/Log output with 1h & 24h stats |

---

### Phase E — Ops & Monitoring
**Goal:** Visibility into health, rate limits, and worker status.

| Item | Description | Owner | Success Criteria |
| --- | --- | --- | --- |
| E1 | `/api/health` expanded (uptime, queue depth, rate-limit hits) | Backend | Returns 200 with detailed JSON |
| E2 | Structured logging + log rotation | DevOps | Logs parseable by stackdriver/ELK |
| E3 | Alerting rules (rate limit spikes, worker failure) | DevOps | Slack/email alert within 5 minutes |
| E4 | Runbook & on-call checklist | Ops | Document stored in repo/docs |

---

## 🔄 Timeline Snapshot

| Week | Focus |
| --- | --- |
| W1 | Phase A (transfer store + queue) |
| W2 | Phase B (totals accuracy, Cronos fix) |
| W3 | Phase C (analytics rebuild) |
| W4 | Phase D/E (resilience + monitoring) |

Adjust as upstream constraints surface.

---

## ✅ Acceptance Criteria
1. Backend runs 48h under load test without Etherscan 10/sec violations.  
2. `/api/transfers` & `/api/analytics` serve purely from internal cache/store.  
3. Totals accuracy variance < 2% compared to spot-check explorers.  
4. Token price endpoint reports multiple sources and never returns null unless all fail.  
5. Health dashboard + runbook provide clear remediation steps.

---

## 📎 Supporting Artifacts
- Existing diagnostics: `ANALYTICS-ENDPOINT-DEPLOYED.md`  
- Prior phases: see `backup/` checkpoint files for baseline  
- To-be-created: ingestion worker repo or scripts

---

**Next Action:** Approve milestone scope → spin up infrastructure task for Phase A.
