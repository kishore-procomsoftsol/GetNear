-- =============================================================================
-- GetNear V1 — Triggers Migration
-- Migration: 002_triggers.sql
-- Description: Adds database triggers for:
--   1. Auto-updating businesses.search_vector on INSERT/UPDATE.
--   2. Recalculating businesses.rating_avg / review_count on reviews
--      INSERT/UPDATE/DELETE.
--   3. Auto-updating the updated_at column on users, businesses, reviews,
--      and bookings whenever a row is modified.
-- Requirements: 15.2, 14.11
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Trigger 1: trg_business_search_vector
-- Auto-updates businesses.search_vector on INSERT or UPDATE.
-- The function was first defined in 001_initial_schema.sql; we use
-- CREATE OR REPLACE here so this migration is idempotent and can be re-run
-- safely (e.g. after a schema reset or in a fresh environment).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_business_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.city, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.address, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger so this migration is idempotent.
DROP TRIGGER IF EXISTS trg_business_search_vector ON businesses;

CREATE TRIGGER trg_business_search_vector
  BEFORE INSERT OR UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_business_search_vector();

-- ---------------------------------------------------------------------------
-- Trigger 2: trg_update_business_rating
-- Recalculates businesses.rating_avg and businesses.review_count whenever a
-- row is inserted into, updated in, or deleted from the reviews table.
--
-- Behaviour:
--   • On INSERT / UPDATE  — uses NEW.business_id to identify the business.
--   • On DELETE           — uses OLD.business_id to identify the business.
--   • When all reviews for a business are deleted, rating_avg and
--     review_count are both set to 0 (COALESCE handles the NULL from AVG).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_business_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_business_id UUID;
BEGIN
  -- Determine which business to update based on the DML operation.
  IF TG_OP = 'DELETE' THEN
    v_business_id := OLD.business_id;
  ELSE
    v_business_id := NEW.business_id;
  END IF;

  UPDATE businesses
  SET
    rating_avg   = COALESCE(
                     (SELECT ROUND(AVG(rating)::NUMERIC, 2)
                      FROM reviews
                      WHERE business_id = v_business_id),
                     0
                   ),
    review_count = (SELECT COUNT(*)
                    FROM reviews
                    WHERE business_id = v_business_id),
    updated_at   = now()
  WHERE id = v_business_id;

  RETURN NULL;  -- AFTER trigger; return value is ignored for row triggers.
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger so this migration is idempotent.
DROP TRIGGER IF EXISTS trg_update_business_rating ON reviews;

CREATE TRIGGER trg_update_business_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_business_rating();

-- ---------------------------------------------------------------------------
-- Trigger 3: trg_set_updated_at
-- Generic BEFORE UPDATE trigger that stamps updated_at = now() on any table
-- that carries an updated_at column.  Applied to: users, businesses, reviews,
-- bookings.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- users
DROP TRIGGER IF EXISTS trg_set_updated_at_users ON users;
CREATE TRIGGER trg_set_updated_at_users
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- businesses
DROP TRIGGER IF EXISTS trg_set_updated_at_businesses ON businesses;
CREATE TRIGGER trg_set_updated_at_businesses
  BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- reviews
DROP TRIGGER IF EXISTS trg_set_updated_at_reviews ON reviews;
CREATE TRIGGER trg_set_updated_at_reviews
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- bookings
DROP TRIGGER IF EXISTS trg_set_updated_at_bookings ON bookings;
CREATE TRIGGER trg_set_updated_at_bookings
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
