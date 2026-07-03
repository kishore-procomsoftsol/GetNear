-- =============================================================================
-- GetNear V1 — Places Cache Table
-- Migration: 012_create_places_cache.sql
-- Description: Creates the places_cache table for caching Google Places API
--              responses, with indexes on cache_key, expires_at, and place_id.
-- Requirements: 4.4
-- =============================================================================

-- ---------------------------------------------------------------------------
-- places_cache
-- ---------------------------------------------------------------------------

CREATE TABLE places_cache (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key     TEXT NOT NULL UNIQUE,
  place_id      TEXT,
  endpoint_type TEXT NOT NULL CHECK (endpoint_type IN ('nearby', 'search', 'details', 'photo')),
  response_data JSONB NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

CREATE INDEX idx_places_cache_key      ON places_cache (cache_key);
CREATE INDEX idx_places_cache_expires  ON places_cache (expires_at);
CREATE INDEX idx_places_cache_place_id ON places_cache (place_id);
