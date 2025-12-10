## Holders Page Upgrade — Plan & Tracker

**Restore point:** `backup/checkpoints/2025-12-10-holders-plan/` (frontend + backend)

### Goals
- Add percentage column with visual bar (per-chain balance / chain total supply).
- Show full holder list (no dust filtering), support deep pagination to surface tiny balances.
- Keep existing rank/address/quantity/value columns; maintain responsive layout.

### Milestones & Status
- [x] Data shape audit (API response, pagination, totalSupply source per chain)
- [x] Backend: expose chain total supply to holders API (or use bundle API per chain); remove dust filtering; allow larger page sizes
- [x] Frontend: holders table updates (percentage column + bar, pagination controls, precision)
- [ ] QA: cross-chain spot checks vs explorer (ETH/BSC/Polygon/Arbitrum/Optimism/Base/Mantle/zkSync/Avalanche/Cronos)
- [x] Deploy (backend + frontend)

### Working Notes
- Bundle API per-chain supply endpoints available (e.g., `.../totalcoins?chains=bsc`) returning `55,555,555.555...` per chain; global returns `555,555,555.555...`.
- Current backend holders service filtered out balances below `1e-6` BZR and capped `pageSize` at 100; frontend always fetched `page=1` and sorted client-side.
- Need server-provided pagination (page, pageSize, total/hasMore if available) to let UI fetch later pages and display tiny balances.
- Backend updated: pageSize cap raised to 200; dust filter removed; holders response now includes `hasMore`, `totalRaw`, and per-chain `supply.totalSupply` from the bundle API.
- Frontend updated: percentage column + bar (per-row vs chain total supply), mobile percentage display, pagination controls (prev/next; up to 200 per page), respects server pagination.
