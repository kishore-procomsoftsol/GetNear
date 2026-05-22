-- =============================================================================
-- GetNear V1 — Sponsored Listings
-- Migration: 009_sponsored_listings.sql
-- Description: Adds is_sponsored and sponsored_until columns to businesses.
-- =============================================================================

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS is_sponsored BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS sponsored_until TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_businesses_sponsored ON businesses(is_sponsored) WHERE is_sponsored = true;
