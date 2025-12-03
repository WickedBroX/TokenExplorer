# Backend Next Steps

With the backend running under systemd and the health endpoint live, the remaining work centers on turning on the persistent store and validating end-to-end ingestion.

## 1. Provision & Configure Postgres
- Create a managed Postgres instance (preferred) **or** bring up the Docker Compose stack from `bzr-backend/deploy/postgres` (`docker compose up -d`).
- Allow inbound connections from the application server (for Compose, bind to a private interface or use an SSH tunnel).
- Create a database/user pair (defaults match the Compose file: `bzr_transfers` / `bzr`).
- Update `/var/www/bzr-backend/.env` with one of the following:
  ```env
  TRANSFERS_DATABASE_URL=postgres://bzr:strong-password@db-host:5432/bzr_transfers
  TRANSFERS_DATA_SOURCE=store
  TRANSFERS_STALE_THRESHOLD_SECONDS=900
  TRANSFERS_INGEST_INTERVAL_MS=30000
  TRANSFERS_INGEST_CONCURRENCY=2
  INGESTER_SUPERVISOR=systemd
  ```
- Optionally tune per-chain settings (page size, max pages) before enabling ingestion.

## 2. Restart Services & Monitor
```bash
ssh root@159.198.70.88 "systemctl restart bzr-backend bzr-ingester"
ssh root@159.198.70.88 "systemctl status bzr-backend bzr-ingester"
ssh root@159.198.70.88 "journalctl -u bzr-ingester -n 200 --no-pager"
```
- Expect the ingester to remain `active (running)` once the database connection succeeds. If PM2 or other process managers are installed on the server, disable them so systemd remains the single source of truth (the backend service now stays active under systemd).
- `journalctl` should log per-chain ingestion cycles instead of immediate exits.

## 3. Validate Persistent Store Data
- Poll the health endpoint until `status` transitions from `upstream-only` → `degraded` → `ok`.
- Confirm `chains[]` entries populate with `ready: true`, `indexLagSeconds` reasonable, and `lastSuccessAt` timestamps advancing.
- Hit `/api/transfers?source=store` (or default if `TRANSFERS_DATA_SOURCE=store`) to ensure responses include the new metadata and totals.

## 4. Optional Hardening
- Adjust `RestartSec` / `StartLimitIntervalSec` for `bzr-ingester.service` once ingestion is stable.
- Add alerting around `/api/health` (status != `ok`, `meta.stale = true`, `services.ingester.summary.chainsFailing > 0`).
- Extend the test suite with integration coverage that seeds a temporary Postgres instance (e.g., using `pg-mem` or dockerized Postgres) to assert API outputs.

## 5. Follow-on Features
- Analytics endpoints: verify they consume persistent snapshots and expose the enhanced metadata downstream.
- Frontend updates: surface health statuses or stale warnings in the UI so operators notice ingestion lag quickly.
- Deployment pipeline: integrate the new systemd units into CI/CD (e.g., GitHub Actions + rsync) to make releases repeatable.

Once the database credentials are in place and the ingester is healthy, we can shift focus to data quality checks and UI wiring.
