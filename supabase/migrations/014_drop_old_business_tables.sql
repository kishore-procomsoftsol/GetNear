-- =============================================================================
-- GetNear V1 — Drop Old Business Tables
-- Migration: 014_drop_old_business_tables.sql
-- Description: Removes all tables from the internal business listing system
--              that are no longer needed after migrating to Google Places API.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Drop triggers first (to avoid dependency issues)
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_business_search_vector ON businesses;
DROP TRIGGER IF EXISTS trg_update_business_rating ON reviews;
DROP TRIGGER IF EXISTS trg_set_updated_at_businesses ON businesses;
DROP TRIGGER IF EXISTS trg_set_updated_at_reviews ON reviews;
DROP TRIGGER IF EXISTS trg_set_updated_at_bookings ON bookings;

-- ---------------------------------------------------------------------------
-- Drop functions that are no longer needed
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS update_business_search_vector();
DROP FUNCTION IF EXISTS update_business_rating();

-- ---------------------------------------------------------------------------
-- Drop tables in order (respecting foreign key dependencies)
-- Tables that reference businesses must be dropped first.
-- ---------------------------------------------------------------------------

-- Tables referencing businesses
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS offers CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS business_services CASCADE;
DROP TABLE IF EXISTS business_hours CASCADE;
DROP TABLE IF EXISTS business_photos CASCADE;

-- The businesses table itself
DROP TABLE IF EXISTS businesses CASCADE;

-- Categories table (only referenced by businesses, no longer needed)
DROP TABLE IF EXISTS categories CASCADE;
