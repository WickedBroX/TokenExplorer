-- Migration: 003-add-upstream-totals.sql
-- Created at: 2025-11-20
-- Description: Add columns to store upstream total counts and metadata

BEGIN;

ALTER TABLE transfer_chain_totals
ADD COLUMN IF NOT EXISTS upstream_total_transfers BIGINT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS upstream_last_block BIGINT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS upstream_updated_at TIMESTAMPTZ DEFAULT NULL;

COMMIT;
