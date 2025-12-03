-- Migration: 004-create-backfill-progress.sql
-- Created at: 2025-11-20
-- Description: Create table to track historical backfill progress

BEGIN;

CREATE TABLE IF NOT EXISTS transfer_backfill_progress (
  chain_id INTEGER PRIMARY KEY,
  target_block BIGINT NOT NULL,
  last_processed_block BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, error
  total_transfers_backfilled BIGINT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  meta JSONB
);

COMMIT;
