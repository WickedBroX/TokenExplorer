-- Migration: 002-create-transfer-tables.sql
-- Created at: 2025-11-19
-- Description: Initial schema for transfer events and ingestion tracking

BEGIN;

CREATE TABLE IF NOT EXISTS transfer_events (
  chain_id INTEGER NOT NULL,
  block_number BIGINT NOT NULL,
  tx_hash TEXT NOT NULL,
  log_index INTEGER NOT NULL,
  time_stamp TIMESTAMPTZ NOT NULL,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  value TEXT NOT NULL,
  method_id TEXT,
  payload JSONB NOT NULL,
  inserted_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (chain_id, tx_hash, log_index)
);

CREATE INDEX IF NOT EXISTS idx_transfer_events_chain_time ON transfer_events (chain_id, time_stamp DESC);
CREATE INDEX IF NOT EXISTS idx_transfer_events_chain_block ON transfer_events (chain_id, block_number DESC);

CREATE TABLE IF NOT EXISTS transfer_ingest_cursors (
  chain_id INTEGER PRIMARY KEY,
  last_block_number BIGINT,
  last_tx_hash TEXT,
  last_log_index INTEGER,
  last_time TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transfer_ingest_events (
  id BIGSERIAL PRIMARY KEY,
  chain_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  meta JSONB,
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transfer_warm_jobs (
  id BIGSERIAL PRIMARY KEY,
  chain_id INTEGER NOT NULL,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  payload JSONB
);

CREATE TABLE IF NOT EXISTS transfer_chain_totals (
  chain_id INTEGER PRIMARY KEY,
  total_transfers BIGINT NOT NULL DEFAULT 0,
  total_volume_raw NUMERIC(78, 0) NOT NULL DEFAULT 0,
  first_time TIMESTAMPTZ,
  last_time TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transfer_chain_totals_updated_at ON transfer_chain_totals (updated_at DESC);

CREATE TABLE IF NOT EXISTS transfer_daily_aggregates (
  chain_id INTEGER NOT NULL,
  day DATE NOT NULL,
  transfer_count INTEGER NOT NULL DEFAULT 0,
  volume_raw NUMERIC(78, 0) NOT NULL DEFAULT 0,
  unique_addresses INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (chain_id, day)
);

CREATE INDEX IF NOT EXISTS idx_transfer_daily_aggregates_day ON transfer_daily_aggregates (day DESC);

CREATE TABLE IF NOT EXISTS transfer_ingest_status (
  chain_id INTEGER PRIMARY KEY,
  ready BOOLEAN NOT NULL DEFAULT FALSE,
  last_success_at TIMESTAMPTZ,
  last_error_at TIMESTAMPTZ,
  last_error TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  backoff_until TIMESTAMPTZ,
  meta JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMIT;
