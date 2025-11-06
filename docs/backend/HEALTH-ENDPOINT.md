# Backend Health Endpoint

The backend exposes a consolidated status endpoint at `/api/health`. It combines process uptime, persistent-store readiness, and transfer-ingester telemetry so external monitors can detect degradation early.

## Response Shape

```json
{
  "status": "ok | degraded | initializing | upstream-only | disabled",
  "timestamp": "2025-11-05T23:01:30.456Z",
  "uptimeSeconds": 15234,
  "uptime": {
    "seconds": 15234,
    "startedAt": "2025-11-05T19:47:36.012Z"
  },
  "meta": {
    "ready": true,
    "stale": false,
    "indexLagSec": 42,
    "totalTransfers": 1249876
  },
  "store": {
    "enabled": true,
    "ready": true,
    "error": null
  },
  "chains": [
    {
      "chainId": 1,
      "chainName": "Ethereum",
      "ready": true,
      "stale": false,
      "indexLagSeconds": 12,
      "totalTransfers": 532112,
      "firstTime": "2024-11-03T08:00:00.000Z",
      "lastTime": "2025-11-05T22:58:42.000Z",
      "updatedAt": "2025-11-05T22:59:01.000Z",
      "lastSuccessAt": "2025-11-05T22:59:01.000Z",
      "lastErrorAt": null,
      "consecutiveFailures": 0,
      "backoffUntil": null,
      "meta": {
        "inserted": 120,
        "pagesAttempted": 3,
        "durationMs": 1800
      },
      "lagHuman": "12s"
    }
  ],
  "services": {
    "backend": {
      "pid": 600514,
      "status": "ok"
    },
    "ingester": {
      "managedBy": "systemd",
      "status": "ok",
      "lastSuccessAt": "2025-11-05T22:59:01.000Z",
      "lastErrorAt": null,
      "summary": {
        "chains": 10,
        "chainsReady": 10,
        "chainsStale": 0,
        "chainsFailing": 0,
        "maxConsecutiveFailures": 0,
        "maxBackoffUntil": null,
        "maxLagSeconds": 42
      }
    }
  },
  "warnings": []
}
```

## Field Glossary

- `status`: Overall service health. `degraded` indicates stale snapshots or ingestion backoffs; `upstream-only` means persistent store is disabled.
- `meta.ready`: All chains have at least one persisted snapshot and the store is ready to serve traffic.
- `meta.indexLagSec`: Longest lag (seconds) among chains. Compare against `TRANSFERS_STALE_THRESHOLD_SECONDS`.
- `store.enabled`: Reflects whether Postgres configuration is present.
- `chains[]`: Per-chain snapshots sourced from the persistent store, including readiness, lag, last success/error timestamps, and ingester metadata.
- `services.ingester.summary`: Aggregated ingest metrics (counts of ready/stale chains, maximum consecutive failures, highest backoff).
- `warnings`: Array of human-readable alerts (e.g., `STORE_DATA_STALE`, `STORE_DISABLED`, `STORE_INITIALIZING`).

## Monitoring Recommendations

- Alert if `status` != `ok` for more than two consecutive polls.
- Alert if `meta.stale` is `true` or `meta.indexLagSec` exceeds expected SLA.
- Track `services.ingester.summary.chainsFailing`; non-zero values indicate repeated ingestion errors.
- When `store.enabled` is `false`, the API is relying on upstream providers and may be rate-limited—investigate `.env` configuration and the Postgres connection.

## Related Commands

```bash
# Check health locally on the server
curl http://localhost:3001/api/health | jq

# View systemd-managed services
systemctl status bzr-backend bzr-ingester

# Inspect recent logs
journalctl -u bzr-backend -u bzr-ingester -n 200 --no-pager
```

Keep the ingester service running alongside the backend to maintain fresh snapshots and accurate health reporting.
