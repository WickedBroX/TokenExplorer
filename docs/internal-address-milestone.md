# Milestone: Internal Transactions Tab + Address Detail Pages

**Goal:** Add an Internal Transactions view (per-chain + All Chains) and native Address detail pages inside BZR Scan, following existing multi-chain/provider patterns.

**Scope Constraints**
- Do not break existing Transfers/Holders flows or caching.
- Use existing Etherscan V2 + Cronos Blockscout provider helpers and key-rotation/backoff.
- Keep UI consistent with current dashboard/table system.

---

## Milestones & Status

### 1) Backend — Internal Transactions API
**Status:** ✅ Completed  
**Routes:** `GET /api/internal-transfers`

**Requirements**
- Params: `chainId` (0=All), `page`, `pageSize`, `sort`, optional `address`.
- Per-chain: Etherscan V2 `module=account&action=txlistinternal`.
- All Chains: parallel per-chain fetch, merge + sort, then paginate.
- Cronos: return empty with warning if upstream doesn’t support internal list.
- Caching/backoff similar to `transfersService`.

**Tasks**
- [x] Add route + controller
- [x] Implement service w/ aggregation + stale-cache fallback
- [x] Add to `server.js` mounts

### 2) Backend — Address Detail API
**Status:** ✅ Completed  
**Routes:** `GET /api/address/:address`

**Requirements**
- Return per-chain BZR token balances + total across chains.
- Include lightweight activity summary (transfer count and latest transfers).
- Use short-TTL caching.

**Tasks**
- [x] Add route + controller
- [x] Implement service: balances via providers + DB activity
- [x] Wire into `server.js`

### 3) Frontend — Internal Transactions Page
**Status:** ✅ Completed  
**Routes:** `/internal`

**Requirements**
- Table UX mirrors Transfers page (chain selector, pagination, sort, search by address/hash).
- Uses new `useInternalTransfers` hook.
- Add nav item.

**Tasks**
- [x] Add hook `useInternalTransfers`
- [x] Add page `InternalTransfersPage`
- [x] Add route + nav item

### 4) Frontend — Address Pages
**Status:** ✅ Completed  
**Routes:** `/address/:address`

**Requirements**
- Show address header, copy, per-chain balances + total.
- Tabs/sections for Transfers and Internal Transfers for that address.
- Clicking an address in Transfers/Holders routes internally; keep an external-explorer icon.
- Global search routes addresses to `/address/:address`.

**Tasks**
- [x] Add hook `useAddressDetails`
- [x] Add page `AddressPage`
- [x] Update address links + global search routing

---

## Optional (Speed/Accuracy)
**Status:** ⏳ Optional  
- [ ] Store internal transfers snapshots (persistent mode)
- [ ] Add per-address caching + background refresh
- [ ] Add “Top internal callers” summary on address page

---

## Notes / Decisions
- Internal tx upstream limits vary by chain; aggregation uses “hasMore” heuristics.
- Address balances use token contract from admin-config.
