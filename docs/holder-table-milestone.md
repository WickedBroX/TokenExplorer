## Holders Table Reliability — Milestone

**Scope:** Fix stale/mixed data on chain switches, tighten filtering/pagination UX, and align client with server data.

### Goals
- No stale rows when changing chain or page size; clear loading state instead.
- Trust server ordering/pagination; avoid client resorting that conflicts with server pages.
- Clean pagination display (Page X, or Page X of Y when total is known).
- Keep search simple and deterministic (one-pass filter on current page data).

### Tasks
- [x] Frontend: keep holders sorted high→low (server + client fallback); keep tiny balances visible.
- [x] Frontend: cache holder queries (1m stale / 5m GC) and stop aggressive invalidation so chain switches reuse warmed data.
- [x] Frontend: tidy pagination display; use server `total` when present; otherwise just “Page X”.
- [x] Backend: add holder cache/warming and normalized quantity parsing to prevent mis-sorts.
- [x] Backend: graceful handling for unsupported chains (e.g., Cronos) instead of 501 errors.
- [x] Backend Optional (speed/accuracy): persist holders in DB with a scheduled refresh; materialized top-N view per chain and aggregated; serve fast “All Chains” from DB and compute accurate totals.
- [x] QA: chain switches (All Chains → single chain), pagination, search, loading/empty states.
- [x] Deploy.

### Next Actions
- [x] Apply DB migrations `009-create-holders-snapshot.sql` and `010-create-holders-views.sql`, then restart backend.
- [ ] QA checklist:
  - Chain switch: All Chains → single chain and back (no stale rows, percentages visible).
  - Ordering: quantities stay high → low across chains and after search.
  - Pagination: labels show Page X of Y when total known; row ranges correct; hasMore works.
  - Fallback message: when a chain is unsupported/unavailable, table shows empty state with warning instead of error.
  - Snapshot freshness: confirm “served from snapshot” warning only when upstream down.
- [x] Deploy backend + frontend once QA passes.

### Workflow & Milestones

1) **Server correctness & cache**
   - Normalize quantities (locale-safe) before sorting/filtering; always return desc order.
   - Add short-lived cache (per chain/page/pageSize) + first-page warmer for popular chains.
   - Return 200 with “not available” note for unsupported chains (Cronos) instead of errors.
   - Update pagination meta: page, pageSize, totalRaw, hasMore, total (when known/stored).

2) **Client alignment**
   - Use server order only; include chain/page/pageSize/search in query keys; reset page on filter change.
   - Show “Page X of Y” when total is known; otherwise “Page X (live)”.
   - Prevent stale rows on chain switches; show loading instead.

3) **Optional speed/accuracy (DB-backed)**
   - Add tables: holders_snapshot (address, balance, chainId, lastSeen), holder_counts (per chain).
   - Scheduled job to refresh per-chain holders; store top-N per chain and aggregated materialized view.
   - “All Chains” uses the aggregated view for fast pages and accurate percentages/totals.
   - Fallback: when upstream is slow/down, serve from DB and flag “data may be stale”.

4) **QA & Deploy**
   - Test chain switches, All Chains → single chain, search, pagination, empty/error states.
   - Deploy once backend + frontend align; monitor API errors and cache hits.

---

## Full Holder Coverage — Milestone

**Goal:** Align the holders table with the full holder count (15k+), by ingesting the complete holder set per chain and serving it from our DB with accurate totals and deep pagination.

### Scope & Approach
- Full per-chain ingestion: paginate through all holders for supported explorers; for chains without tokenholderlist (e.g., Cronos), use chain-specific API/RPC scan.
- Persist all holders into `holders_snapshot` with counts in `holder_counts`; keep snapshots fresh on a schedule with backoff/rate limits.
- Serve holders API (per-chain and All Chains) directly from the DB snapshots with accurate `total` and `hasMore`.
- Frontend: show accurate totals, allow deep pagination (up to 500/page), and surface “data updated” timestamps.

### Tasks
- [ ] Backend: add full-sweep ingestion job (multi-page per chain with backoff) writing into holders_snapshot; include cron scheduler.
- [ ] Backend: make holders API read from snapshots by default for both single chain and All Chains; return accurate totals, lastUpdated.
- [ ] Backend: add fallback path for chains without tokenholderlist (Cronos etc.) via RPC or chain-specific API, or explicitly mark unsupported in counts.
- [ ] Frontend: display accurate total holders, last updated, and deep pagination up to 500/page; keep ordering high→low.
- [ ] QA: verify totals match overview (15k+), chain switching, pagination across many pages, and fallback messaging.
- [ ] Deploy.
