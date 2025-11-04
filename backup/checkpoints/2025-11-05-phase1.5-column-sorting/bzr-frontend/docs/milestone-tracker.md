# BZR Explorer Improvement Milestones

This tracker translates the recent audit into concrete milestones. Each milestone groups related enhancements so we can ship value incrementally while keeping the scope visible.

## Milestone Overview

| ID | Name | Goal | Target Window | Status |
| --- | --- | --- | --- | --- |
| M1 | Stabilize Data Fetching | Harden client data flows and error handling. | Week 1 | Complete |
| M2 | UI/UX Polish | Address usability gaps in search, modal, and feedback patterns. | Week 2 | Complete |
| M3 | Backend Resilience | Improve API reliability, caching, and observability. | Week 3 | In Progress |
| M4 | Developer Experience | Add linting, type safety checks, and CI automation. | Week 4 | Backlog |

> **Legend**: Backlog → Not started • In Progress → Actively being worked • Blocked → Requires input • Complete → Delivered

---

## Milestone Details

### M1 – Stabilize Data Fetching
- [x] Refactor `fetchData` into a dedicated hook/service using `useCallback` to control dependencies.
- [x] Introduce `AbortController`-based timeouts with graceful error surface (including non-2xx responses).
- [x] Add separate `isRefreshing` state so manual refresh keeps content visible.
- [x] Normalize API response typing (align `tokenDecimal` and BigInt operations, add shared utilities).
- Owner: **TBD**  
- Dependencies: None  
- Risk: Low (mostly client-side refactors)

### M2 – UI/UX Polish
- [x] Replace disabled search input with an informative call-to-action or roadmap tooltip.
- [x] Swap alert dialogs for non-blocking toast/banner messaging.
- [x] Add ARIA live region feedback for copy-to-clipboard actions in the modal.
- [x] Make transaction modal address/value styling accessible (monospace option, responsive truncation).
- Owner: **TBD**  
- Dependencies: M1 (shared utilities for formatting)

### M3 – Backend Resilience
- [x] Enforce numeric sorting (`Number(timeStamp)`) and validate API responses before caching.
- [x] Return upstream failure messages with 502 responses instead of generic 500s.
- [x] Implement request throttling/retry strategy to respect Etherscan limits.
- [x] Expose cache age and health metrics endpoint.
- Owner: **TBD**  
- Dependencies: Environment configuration updates (API keys, telemetry)

### M4 – Developer Experience
- [ ] Add ESLint + Prettier with workspace-wide scripts (`lint`, `format`).
- [ ] Document setup steps, env requirements, and deployment checklist in README.
- [ ] Introduce CI workflow to run lint, type-check, and tests on push/PRs.
- [ ] Scaffold Jest/Vitest smoke tests for frontend hooks and backend endpoints.
- Owner: **TBD**  
- Dependencies: M1–M3 outputs inform test coverage

---

## Tracking & Reporting
- Update status weekly in standup with owners and blockers.
- Link PRs/issues next to each checklist item once created.
- Revisit scope at the end of each milestone window; slide or split items as needed.

_Last updated: 2025-11-03_
