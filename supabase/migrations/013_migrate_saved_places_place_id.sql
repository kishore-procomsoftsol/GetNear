-- =============================================================================
-- GetNear V1 — Migrate saved_places to use Google Place IDs
-- Migration: 013_migrate_saved_places_place_id.sql
-- Description: Drops the business_id column from saved_places and adds a
--              place_id TEXT column referencing Google Place IDs. Adds a unique
--              constraint on (user_id, place_id) to prevent duplicate saves.
-- Requirements: 6.1, 6.4
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Drop old business_id column and its constraints
-- ---------------------------------------------------------------------------

-- Drop the existing unique constraint on (user_id, business_id)
ALTER TABLE saved_places DROP CONSTRAINT IF EXISTS saved_places_user_id_business_id_key;

-- Drop the business_id column (also removes its FK constraint and index)
ALTER TABLE saved_places DROP COLUMN IF EXISTS business_id;

-- ---------------------------------------------------------------------------
-- Add place_id column (Google Place ID)
-- ---------------------------------------------------------------------------

ALTER TABLE saved_places ADD COLUMN place_id TEXT NOT NULL;

-- ---------------------------------------------------------------------------
-- Add unique constraint: one user cannot save the same place twice
-- ---------------------------------------------------------------------------

ALTER TABLE saved_places ADD CONSTRAINT uq_saved_places_user_place UNIQUE (user_id, place_id);
