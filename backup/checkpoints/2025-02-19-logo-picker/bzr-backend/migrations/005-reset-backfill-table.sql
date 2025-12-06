-- Migration: 005-reset-backfill-table.sql
-- Created at: 2025-11-20
-- Description: Reset backfill table to ensure correct schema

BEGIN;

DROP TABLE IF EXISTS transfer_backfill_progress;

CREATE TABLE transfer_backfill_progress (
  chain_id INTEGER PRIMARY KEY,
  target_block BIGINT NOT NULL,
  last_processed_block BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  total_transfers_backfilled BIGINT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  meta JSONB
);

COMMIT;
