-- =============================================================================
-- GetNear V1 — Initial Schema Migration
-- Migration: 001_initial_schema.sql
-- Description: Creates all 17 tables, PostGIS extension, indexes, and the
--              search_vector trigger for the businesses table.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS postgis;

-- ---------------------------------------------------------------------------
-- 3.6 categories
-- (Created before businesses because businesses.category_id references it)
-- ---------------------------------------------------------------------------

CREATE TABLE categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL UNIQUE,
  slug          TEXT NOT NULL UNIQUE,
  icon          TEXT,
  color         TEXT,
  parent_id     UUID REFERENCES categories(id),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true
);

-- ---------------------------------------------------------------------------
-- 3.1 users
-- ---------------------------------------------------------------------------

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT,
  phone           TEXT UNIQUE,
  email           TEXT UNIQUE,
  avatar_url      TEXT,
  role            TEXT NOT NULL DEFAULT 'customer'
                    CHECK (role IN ('customer', 'business', 'admin')),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  plus_expires_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role  ON users(role);

-- ---------------------------------------------------------------------------
-- 3.2 businesses
-- ---------------------------------------------------------------------------

CREATE TABLE businesses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE,
  category_id   UUID REFERENCES categories(id),
  type          TEXT NOT NULL CHECK (type IN ('physical', 'service', 'online')),
  description   TEXT,
  phone         TEXT,
  email         TEXT,
  website       TEXT,
  whatsapp      TEXT,
  address       TEXT,
  city          TEXT,
  state         TEXT,
  pin           TEXT,
  location      GEOGRAPHY(POINT, 4326),   -- PostGIS point (lng, lat)
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'active', 'rejected', 'suspended')),
  verified      BOOLEAN NOT NULL DEFAULT false,
  rating_avg    NUMERIC(3,2) DEFAULT 0,
  review_count  INTEGER DEFAULT 0,
  view_count    INTEGER DEFAULT 0,
  search_vector TSVECTOR,                 -- Full-text search vector
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_businesses_location ON businesses USING GIST(location);
CREATE INDEX idx_businesses_search   ON businesses USING GIN(search_vector);
CREATE INDEX idx_businesses_status   ON businesses(status);
CREATE INDEX idx_businesses_category ON businesses(category_id);
CREATE INDEX idx_businesses_owner    ON businesses(owner_id);
CREATE INDEX idx_businesses_city     ON businesses(city);

-- Auto-update search_vector on INSERT or UPDATE
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

CREATE TRIGGER trg_business_search_vector
  BEFORE INSERT OR UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_business_search_vector();

-- ---------------------------------------------------------------------------
-- 3.3 business_photos
-- ---------------------------------------------------------------------------

CREATE TABLE business_photos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  url           TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  is_primary    BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_business_photos_business ON business_photos(business_id);

-- ---------------------------------------------------------------------------
-- 3.4 business_hours
-- ---------------------------------------------------------------------------

CREATE TABLE business_hours (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  day         SMALLINT NOT NULL CHECK (day BETWEEN 0 AND 6), -- 0 = Sunday
  open_time   TIME,
  close_time  TIME,
  is_closed   BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (business_id, day)
);

-- ---------------------------------------------------------------------------
-- 3.5 business_services
-- ---------------------------------------------------------------------------

CREATE TABLE business_services (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  price         NUMERIC(10,2),
  description   TEXT,
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_business_services_business ON business_services(business_id);

-- ---------------------------------------------------------------------------
-- 3.7 reviews
-- ---------------------------------------------------------------------------

CREATE TABLE reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text        TEXT,
  photos      TEXT[],
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, business_id)   -- one review per user per business
);

CREATE INDEX idx_reviews_business ON reviews(business_id);
CREATE INDEX idx_reviews_user     ON reviews(user_id);

-- ---------------------------------------------------------------------------
-- 3.9 collections
-- (Created before saved_places because saved_places.collection_id references it)
-- ---------------------------------------------------------------------------

CREATE TABLE collections (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  icon       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_collections_user ON collections(user_id);

-- ---------------------------------------------------------------------------
-- 3.8 saved_places
-- ---------------------------------------------------------------------------

CREATE TABLE saved_places (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES collections(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, business_id)
);

CREATE INDEX idx_saved_places_user       ON saved_places(user_id);
CREATE INDEX idx_saved_places_collection ON saved_places(collection_id);

-- ---------------------------------------------------------------------------
-- 3.10 search_history
-- ---------------------------------------------------------------------------

CREATE TABLE search_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  query      TEXT NOT NULL,
  lat        DOUBLE PRECISION,
  lng        DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_search_history_user ON search_history(user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 3.11 leads
-- ---------------------------------------------------------------------------

CREATE TABLE leads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  type        TEXT NOT NULL
                CHECK (type IN ('call', 'direction', 'whatsapp', 'save', 'view', 'website')),
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_business ON leads(business_id, created_at DESC);
CREATE INDEX idx_leads_type     ON leads(business_id, type);

-- ---------------------------------------------------------------------------
-- 3.12 offers
-- ---------------------------------------------------------------------------

CREATE TABLE offers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  valid_until DATE,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_offers_business ON offers(business_id);

-- ---------------------------------------------------------------------------
-- 3.13 bookings
-- ---------------------------------------------------------------------------

CREATE TABLE bookings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  time        TIME NOT NULL,
  party_size  SMALLINT,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_user     ON bookings(user_id);
CREATE INDEX idx_bookings_business ON bookings(business_id, date);

-- ---------------------------------------------------------------------------
-- 3.14 messages
-- ---------------------------------------------------------------------------

CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  text        TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_sender   ON messages(sender_id, created_at DESC);
CREATE INDEX idx_messages_receiver ON messages(receiver_id, created_at DESC);
CREATE INDEX idx_messages_thread   ON messages(
  LEAST(sender_id, receiver_id),
  GREATEST(sender_id, receiver_id),
  created_at DESC
);

-- ---------------------------------------------------------------------------
-- 3.15 notifications
-- ---------------------------------------------------------------------------

CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT,
  type       TEXT NOT NULL
               CHECK (type IN ('system', 'lead', 'review', 'booking', 'message', 'offer', 'broadcast')),
  data       JSONB,
  is_read    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 3.16 admin_logs
-- ---------------------------------------------------------------------------

CREATE TABLE admin_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID NOT NULL REFERENCES users(id),
  action      TEXT NOT NULL,
  target_type TEXT NOT NULL,  -- 'business' | 'user' | 'category' | 'report'
  target_id   UUID,
  note        TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_logs_admin  ON admin_logs(admin_id, created_at DESC);
CREATE INDEX idx_admin_logs_target ON admin_logs(target_type, target_id);

-- ---------------------------------------------------------------------------
-- 3.17 reports
-- ---------------------------------------------------------------------------

CREATE TABLE reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  reason      TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'dismissed', 'actioned')),
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_business ON reports(business_id);
CREATE INDEX idx_reports_status   ON reports(status);
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
-- =============================================================================
-- GetNear V1 — Row Level Security Policies
-- Migration: 003_rls_policies.sql
-- Description: Enables RLS on all 17 tables and defines access policies
--              based on user identity (auth.uid()) and role (users.role).
-- Requirement: 17.7
-- Design ref:  §13.1
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper function: check if the current user has the 'admin' role
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM users
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Drop existing policies (idempotency — safe to re-run)
-- ---------------------------------------------------------------------------

-- users
DROP POLICY IF EXISTS "users_select_own_or_admin"    ON users;
DROP POLICY IF EXISTS "users_insert_own"             ON users;
DROP POLICY IF EXISTS "users_update_own_or_admin"    ON users;
DROP POLICY IF EXISTS "users_delete_admin"           ON users;

-- businesses
DROP POLICY IF EXISTS "businesses_select"                  ON businesses;
DROP POLICY IF EXISTS "businesses_insert_authenticated"    ON businesses;
DROP POLICY IF EXISTS "businesses_update_owner_or_admin"   ON businesses;
DROP POLICY IF EXISTS "businesses_delete_owner_or_admin"   ON businesses;

-- business_photos
DROP POLICY IF EXISTS "business_photos_select_all"    ON business_photos;
DROP POLICY IF EXISTS "business_photos_insert_owner"  ON business_photos;
DROP POLICY IF EXISTS "business_photos_update_owner"  ON business_photos;
DROP POLICY IF EXISTS "business_photos_delete_owner"  ON business_photos;

-- business_hours
DROP POLICY IF EXISTS "business_hours_select_all"    ON business_hours;
DROP POLICY IF EXISTS "business_hours_insert_owner"  ON business_hours;
DROP POLICY IF EXISTS "business_hours_update_owner"  ON business_hours;
DROP POLICY IF EXISTS "business_hours_delete_owner"  ON business_hours;

-- business_services
DROP POLICY IF EXISTS "business_services_select_all"    ON business_services;
DROP POLICY IF EXISTS "business_services_insert_owner"  ON business_services;
DROP POLICY IF EXISTS "business_services_update_owner"  ON business_services;
DROP POLICY IF EXISTS "business_services_delete_owner"  ON business_services;

-- categories
DROP POLICY IF EXISTS "categories_select_all"    ON categories;
DROP POLICY IF EXISTS "categories_insert_admin"  ON categories;
DROP POLICY IF EXISTS "categories_update_admin"  ON categories;
DROP POLICY IF EXISTS "categories_delete_admin"  ON categories;

-- reviews
DROP POLICY IF EXISTS "reviews_select_all"   ON reviews;
DROP POLICY IF EXISTS "reviews_insert_own"   ON reviews;
DROP POLICY IF EXISTS "reviews_update_own"   ON reviews;
DROP POLICY IF EXISTS "reviews_delete_own"   ON reviews;

-- saved_places
DROP POLICY IF EXISTS "saved_places_select_own"  ON saved_places;
DROP POLICY IF EXISTS "saved_places_insert_own"  ON saved_places;
DROP POLICY IF EXISTS "saved_places_update_own"  ON saved_places;
DROP POLICY IF EXISTS "saved_places_delete_own"  ON saved_places;

-- collections
DROP POLICY IF EXISTS "collections_select_own"  ON collections;
DROP POLICY IF EXISTS "collections_insert_own"  ON collections;
DROP POLICY IF EXISTS "collections_update_own"  ON collections;
DROP POLICY IF EXISTS "collections_delete_own"  ON collections;

-- search_history
DROP POLICY IF EXISTS "search_history_select_own"  ON search_history;
DROP POLICY IF EXISTS "search_history_insert_own"  ON search_history;
DROP POLICY IF EXISTS "search_history_delete_own"  ON search_history;

-- leads
DROP POLICY IF EXISTS "leads_select_owner"        ON leads;
DROP POLICY IF EXISTS "leads_insert_service_role" ON leads;

-- offers
DROP POLICY IF EXISTS "offers_select"         ON offers;
DROP POLICY IF EXISTS "offers_insert_owner"   ON offers;
DROP POLICY IF EXISTS "offers_update_owner"   ON offers;
DROP POLICY IF EXISTS "offers_delete_owner"   ON offers;

-- bookings
DROP POLICY IF EXISTS "bookings_select"      ON bookings;
DROP POLICY IF EXISTS "bookings_insert_own"  ON bookings;
DROP POLICY IF EXISTS "bookings_update"      ON bookings;
DROP POLICY IF EXISTS "bookings_delete"      ON bookings;

-- messages
DROP POLICY IF EXISTS "messages_select_participant"  ON messages;
DROP POLICY IF EXISTS "messages_insert_own"          ON messages;
DROP POLICY IF EXISTS "messages_update_receiver"     ON messages;
DROP POLICY IF EXISTS "messages_delete_own"          ON messages;

-- notifications
DROP POLICY IF EXISTS "notifications_select_own"  ON notifications;
DROP POLICY IF EXISTS "notifications_update_own"  ON notifications;

-- admin_logs
DROP POLICY IF EXISTS "admin_logs_select_admin"  ON admin_logs;
DROP POLICY IF EXISTS "admin_logs_insert_admin"  ON admin_logs;

-- reports
DROP POLICY IF EXISTS "reports_select"              ON reports;
DROP POLICY IF EXISTS "reports_insert_authenticated" ON reports;
DROP POLICY IF EXISTS "reports_update_admin"        ON reports;

-- ---------------------------------------------------------------------------
-- 3.1 users
-- ---------------------------------------------------------------------------

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own row; admins can read all rows
CREATE POLICY "users_select_own_or_admin"
  ON users
  FOR SELECT
  USING (
    auth.uid() = id
    OR is_admin()
  );

-- Authenticated users can insert their own row (signup / upsert via auth trigger)
CREATE POLICY "users_insert_own"
  ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own row; admins can update any row
CREATE POLICY "users_update_own_or_admin"
  ON users
  FOR UPDATE
  USING (
    auth.uid() = id
    OR is_admin()
  )
  WITH CHECK (
    auth.uid() = id
    OR is_admin()
  );

-- Only admins can delete user rows
CREATE POLICY "users_delete_admin"
  ON users
  FOR DELETE
  USING (is_admin());

-- ---------------------------------------------------------------------------
-- 3.2 businesses
-- ---------------------------------------------------------------------------

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Active businesses are readable by everyone;
-- owners can see their own regardless of status;
-- admins can see all
CREATE POLICY "businesses_select"
  ON businesses
  FOR SELECT
  USING (
    status = 'active'
    OR owner_id = auth.uid()
    OR is_admin()
  );

-- Any authenticated user can insert a new listing
CREATE POLICY "businesses_insert_authenticated"
  ON businesses
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND owner_id = auth.uid()
  );

-- Owners can update their own listing; admins can update any
CREATE POLICY "businesses_update_owner_or_admin"
  ON businesses
  FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR is_admin()
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR is_admin()
  );

-- Owners or admins can delete a listing
CREATE POLICY "businesses_delete_owner_or_admin"
  ON businesses
  FOR DELETE
  USING (
    owner_id = auth.uid()
    OR is_admin()
  );

-- ---------------------------------------------------------------------------
-- 3.3 business_photos
-- ---------------------------------------------------------------------------

ALTER TABLE business_photos ENABLE ROW LEVEL SECURITY;

-- Readable by everyone
CREATE POLICY "business_photos_select_all"
  ON business_photos
  FOR SELECT
  USING (true);

-- Only the business owner can insert photos for their business
CREATE POLICY "business_photos_insert_owner"
  ON business_photos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE id = business_id
        AND owner_id = auth.uid()
    )
  );

-- Only the business owner can update their photos
CREATE POLICY "business_photos_update_owner"
  ON business_photos
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE id = business_id
        AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE id = business_id
        AND owner_id = auth.uid()
    )
  );

-- Only the business owner can delete their photos
CREATE POLICY "business_photos_delete_owner"
  ON business_photos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE id = business_id
        AND owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 3.4 business_hours
-- ---------------------------------------------------------------------------

ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;

-- Readable by everyone
CREATE POLICY "business_hours_select_all"
  ON business_hours
  FOR SELECT
  USING (true);

-- Only the business owner can insert hours
CREATE POLICY "business_hours_insert_owner"
  ON business_hours
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE id = business_id
        AND owner_id = auth.uid()
    )
  );

-- Only the business owner can update hours
CREATE POLICY "business_hours_update_owner"
  ON business_hours
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE id = business_id
        AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE id = business_id
        AND owner_id = auth.uid()
    )
  );

-- Only the business owner can delete hours
CREATE POLICY "business_hours_delete_owner"
  ON business_hours
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE id = business_id
        AND owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 3.5 business_services
-- ---------------------------------------------------------------------------

ALTER TABLE business_services ENABLE ROW LEVEL SECURITY;

-- Readable by everyone
CREATE POLICY "business_services_select_all"
  ON business_services
  FOR SELECT
  USING (true);

-- Only the business owner can insert services
CREATE POLICY "business_services_insert_owner"
  ON business_services
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE id = business_id
        AND owner_id = auth.uid()
    )
  );

-- Only the business owner can update services
CREATE POLICY "business_services_update_owner"
  ON business_services
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE id = business_id
        AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE id = business_id
        AND owner_id = auth.uid()
    )
  );

-- Only the business owner can delete services
CREATE POLICY "business_services_delete_owner"
  ON business_services
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE id = business_id
        AND owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 3.6 categories
-- ---------------------------------------------------------------------------

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Readable by everyone
CREATE POLICY "categories_select_all"
  ON categories
  FOR SELECT
  USING (true);

-- Only admins can insert categories
CREATE POLICY "categories_insert_admin"
  ON categories
  FOR INSERT
  WITH CHECK (is_admin());

-- Only admins can update categories
CREATE POLICY "categories_update_admin"
  ON categories
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Only admins can delete categories
CREATE POLICY "categories_delete_admin"
  ON categories
  FOR DELETE
  USING (is_admin());

-- ---------------------------------------------------------------------------
-- 3.7 reviews
-- ---------------------------------------------------------------------------

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Readable by everyone
CREATE POLICY "reviews_select_all"
  ON reviews
  FOR SELECT
  USING (true);

-- Authenticated users can insert their own reviews
CREATE POLICY "reviews_insert_own"
  ON reviews
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

-- Users can update their own reviews
CREATE POLICY "reviews_update_own"
  ON reviews
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own reviews
CREATE POLICY "reviews_delete_own"
  ON reviews
  FOR DELETE
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3.8 saved_places
-- ---------------------------------------------------------------------------

ALTER TABLE saved_places ENABLE ROW LEVEL SECURITY;

-- Users can only read their own saved places
CREATE POLICY "saved_places_select_own"
  ON saved_places
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can only insert their own saved places
CREATE POLICY "saved_places_insert_own"
  ON saved_places
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

-- Users can only update their own saved places
CREATE POLICY "saved_places_update_own"
  ON saved_places
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can only delete their own saved places
CREATE POLICY "saved_places_delete_own"
  ON saved_places
  FOR DELETE
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3.9 collections
-- ---------------------------------------------------------------------------

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

-- Users can only read their own collections
CREATE POLICY "collections_select_own"
  ON collections
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can only insert their own collections
CREATE POLICY "collections_insert_own"
  ON collections
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

-- Users can only update their own collections
CREATE POLICY "collections_update_own"
  ON collections
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can only delete their own collections
CREATE POLICY "collections_delete_own"
  ON collections
  FOR DELETE
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3.10 search_history
-- ---------------------------------------------------------------------------

ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- Users can only read their own search history
CREATE POLICY "search_history_select_own"
  ON search_history
  FOR SELECT
  USING (user_id = auth.uid());

-- Authenticated users can insert search history entries
-- (user_id may be null for anonymous searches; policy allows auth.uid() IS NOT NULL)
CREATE POLICY "search_history_insert_own"
  ON search_history
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can only delete their own search history
CREATE POLICY "search_history_delete_own"
  ON search_history
  FOR DELETE
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3.11 leads
-- ---------------------------------------------------------------------------

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Business owners can read leads for their own businesses
CREATE POLICY "leads_select_owner"
  ON leads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE id = business_id
        AND owner_id = auth.uid()
    )
  );

-- Leads are inserted by the API using the service role key (bypasses RLS).
-- This policy allows direct inserts when needed (e.g. anonymous lead events
-- routed through the API with service role bypass).
CREATE POLICY "leads_insert_service_role"
  ON leads
  FOR INSERT
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 3.12 offers
-- ---------------------------------------------------------------------------

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- Active offers are readable by everyone;
-- business owners can see all their own offers regardless of is_active
CREATE POLICY "offers_select"
  ON offers
  FOR SELECT
  USING (
    is_active = true
    OR EXISTS (
      SELECT 1 FROM businesses
      WHERE id = business_id
        AND owner_id = auth.uid()
    )
  );

-- Only the business owner can insert offers
CREATE POLICY "offers_insert_owner"
  ON offers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE id = business_id
        AND owner_id = auth.uid()
    )
  );

-- Only the business owner can update offers
CREATE POLICY "offers_update_owner"
  ON offers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE id = business_id
        AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE id = business_id
        AND owner_id = auth.uid()
    )
  );

-- Only the business owner can delete offers
CREATE POLICY "offers_delete_owner"
  ON offers
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE id = business_id
        AND owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 3.13 bookings
-- ---------------------------------------------------------------------------

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Users can read their own bookings;
-- business owners can read bookings for their business
CREATE POLICY "bookings_select"
  ON bookings
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM businesses
      WHERE id = business_id
        AND owner_id = auth.uid()
    )
  );

-- Authenticated users can insert their own bookings
CREATE POLICY "bookings_insert_own"
  ON bookings
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

-- Users can update their own bookings (e.g. cancel);
-- business owners can update bookings for their business (e.g. confirm/complete)
CREATE POLICY "bookings_update"
  ON bookings
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM businesses
      WHERE id = business_id
        AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM businesses
      WHERE id = business_id
        AND owner_id = auth.uid()
    )
  );

-- Users can delete their own bookings; business owners can delete bookings for their business
CREATE POLICY "bookings_delete"
  ON bookings
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM businesses
      WHERE id = business_id
        AND owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 3.14 messages
-- ---------------------------------------------------------------------------

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users can read messages where they are the sender or the receiver
CREATE POLICY "messages_select_participant"
  ON messages
  FOR SELECT
  USING (
    sender_id = auth.uid()
    OR receiver_id = auth.uid()
  );

-- Authenticated users can send messages (insert as sender)
CREATE POLICY "messages_insert_own"
  ON messages
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND sender_id = auth.uid()
  );

-- Only the receiver can update a message (e.g. mark is_read = true)
CREATE POLICY "messages_update_receiver"
  ON messages
  FOR UPDATE
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

-- Users can delete their own sent messages
CREATE POLICY "messages_delete_own"
  ON messages
  FOR DELETE
  USING (sender_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3.15 notifications
-- ---------------------------------------------------------------------------

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
CREATE POLICY "notifications_select_own"
  ON notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- Notifications are inserted by the service role (API/server) only.
-- The API uses the service role key to send notifications (broadcasts,
-- booking alerts, etc.), which bypasses RLS entirely — no INSERT policy needed.

-- Users can update their own notifications (e.g. mark as read)
CREATE POLICY "notifications_update_own"
  ON notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3.16 admin_logs
-- ---------------------------------------------------------------------------

ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read admin logs
CREATE POLICY "admin_logs_select_admin"
  ON admin_logs
  FOR SELECT
  USING (is_admin());

-- Only admins can insert admin log entries
CREATE POLICY "admin_logs_insert_admin"
  ON admin_logs
  FOR INSERT
  WITH CHECK (is_admin());

-- ---------------------------------------------------------------------------
-- 3.17 reports
-- ---------------------------------------------------------------------------

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Reporters can read their own reports; admins can read all
CREATE POLICY "reports_select"
  ON reports
  FOR SELECT
  USING (
    reporter_id = auth.uid()
    OR is_admin()
  );

-- Authenticated users can submit reports
CREATE POLICY "reports_insert_authenticated"
  ON reports
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND reporter_id = auth.uid()
  );

-- Only admins can update reports (resolve, dismiss, action)
CREATE POLICY "reports_update_admin"
  ON reports
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());
-- =============================================================================
-- GetNear V1 — Seed Categories
-- Migration: 004_seed_categories.sql
-- Description: Seeds the categories table with 8 top-level parent categories
--              and subcategories for Food, Services, Healthcare, Shops,
--              Education, and Entertainment.
--              Uses gen_random_uuid() for IDs and references parent categories
--              by slug via subquery.
--              Uses INSERT ... ON CONFLICT (slug) DO NOTHING for idempotency.
-- Requirements: 2.5, 10.5
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Top-Level Categories (parent_id = NULL)
-- ---------------------------------------------------------------------------

INSERT INTO categories (id, name, slug, icon, color, parent_id, display_order, is_active)
VALUES
  (gen_random_uuid(), 'Food',          'food',          '🍽️',  '#FF6B35', NULL, 1, true),
  (gen_random_uuid(), 'Services',      'services',      '🔧',  '#4ECDC4', NULL, 2, true),
  (gen_random_uuid(), 'Healthcare',    'healthcare',    '🏥',  '#FF4757', NULL, 3, true),
  (gen_random_uuid(), 'Shops',         'shops',         '🛍️',  '#A29BFE', NULL, 4, true),
  (gen_random_uuid(), 'ATM',           'atm',           '🏧',  '#00B894', NULL, 5, true),
  (gen_random_uuid(), 'Education',     'education',     '📚',  '#FDCB6E', NULL, 6, true),
  (gen_random_uuid(), 'Entertainment', 'entertainment', '🎭',  '#E17055', NULL, 7, true),
  (gen_random_uuid(), 'Travel',        'travel',        '✈️',  '#74B9FF', NULL, 8, true)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Subcategories — Food
-- ---------------------------------------------------------------------------

INSERT INTO categories (id, name, slug, icon, color, parent_id, display_order, is_active)
VALUES
  (gen_random_uuid(), 'Restaurants', 'restaurants', '🍴', '#FF6B35', (SELECT id FROM categories WHERE slug = 'food'), 1, true),
  (gen_random_uuid(), 'Cafes',       'cafes',       '☕', '#FF6B35', (SELECT id FROM categories WHERE slug = 'food'), 2, true),
  (gen_random_uuid(), 'Bakeries',    'bakeries',    '🥐', '#FF6B35', (SELECT id FROM categories WHERE slug = 'food'), 3, true),
  (gen_random_uuid(), 'Street Food', 'street-food', '🌮', '#FF6B35', (SELECT id FROM categories WHERE slug = 'food'), 4, true),
  (gen_random_uuid(), 'Fast Food',   'fast-food',   '🍔', '#FF6B35', (SELECT id FROM categories WHERE slug = 'food'), 5, true)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Subcategories — Services
-- ---------------------------------------------------------------------------

INSERT INTO categories (id, name, slug, icon, color, parent_id, display_order, is_active)
VALUES
  (gen_random_uuid(), 'Salons',   'salons',   '💇', '#4ECDC4', (SELECT id FROM categories WHERE slug = 'services'), 1, true),
  (gen_random_uuid(), 'Gyms',     'gyms',     '🏋️', '#4ECDC4', (SELECT id FROM categories WHERE slug = 'services'), 2, true),
  (gen_random_uuid(), 'Laundry',  'laundry',  '👕', '#4ECDC4', (SELECT id FROM categories WHERE slug = 'services'), 3, true),
  (gen_random_uuid(), 'Repairs',  'repairs',  '🔨', '#4ECDC4', (SELECT id FROM categories WHERE slug = 'services'), 4, true),
  (gen_random_uuid(), 'Cleaning', 'cleaning', '🧹', '#4ECDC4', (SELECT id FROM categories WHERE slug = 'services'), 5, true)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Subcategories — Healthcare
-- ---------------------------------------------------------------------------

INSERT INTO categories (id, name, slug, icon, color, parent_id, display_order, is_active)
VALUES
  (gen_random_uuid(), 'Hospitals',   'hospitals',   '🏨', '#FF4757', (SELECT id FROM categories WHERE slug = 'healthcare'), 1, true),
  (gen_random_uuid(), 'Pharmacies',  'pharmacies',  '💊', '#FF4757', (SELECT id FROM categories WHERE slug = 'healthcare'), 2, true),
  (gen_random_uuid(), 'Clinics',     'clinics',     '🩺', '#FF4757', (SELECT id FROM categories WHERE slug = 'healthcare'), 3, true),
  (gen_random_uuid(), 'Dentists',    'dentists',    '🦷', '#FF4757', (SELECT id FROM categories WHERE slug = 'healthcare'), 4, true),
  (gen_random_uuid(), 'Opticians',   'opticians',   '👓', '#FF4757', (SELECT id FROM categories WHERE slug = 'healthcare'), 5, true)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Subcategories — Shops
-- ---------------------------------------------------------------------------

INSERT INTO categories (id, name, slug, icon, color, parent_id, display_order, is_active)
VALUES
  (gen_random_uuid(), 'Grocery',     'grocery',     '🛒', '#A29BFE', (SELECT id FROM categories WHERE slug = 'shops'), 1, true),
  (gen_random_uuid(), 'Electronics', 'electronics', '📱', '#A29BFE', (SELECT id FROM categories WHERE slug = 'shops'), 2, true),
  (gen_random_uuid(), 'Clothing',    'clothing',    '👗', '#A29BFE', (SELECT id FROM categories WHERE slug = 'shops'), 3, true),
  (gen_random_uuid(), 'Books',       'books',       '📖', '#A29BFE', (SELECT id FROM categories WHERE slug = 'shops'), 4, true),
  (gen_random_uuid(), 'Hardware',    'hardware',    '🔩', '#A29BFE', (SELECT id FROM categories WHERE slug = 'shops'), 5, true)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Subcategories — Education
-- ---------------------------------------------------------------------------

INSERT INTO categories (id, name, slug, icon, color, parent_id, display_order, is_active)
VALUES
  (gen_random_uuid(), 'Schools',   'schools',   '🏫', '#FDCB6E', (SELECT id FROM categories WHERE slug = 'education'), 1, true),
  (gen_random_uuid(), 'Colleges',  'colleges',  '🎓', '#FDCB6E', (SELECT id FROM categories WHERE slug = 'education'), 2, true),
  (gen_random_uuid(), 'Coaching',  'coaching',  '📝', '#FDCB6E', (SELECT id FROM categories WHERE slug = 'education'), 3, true),
  (gen_random_uuid(), 'Libraries', 'libraries', '📚', '#FDCB6E', (SELECT id FROM categories WHERE slug = 'education'), 4, true)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Subcategories — Entertainment
-- ---------------------------------------------------------------------------

INSERT INTO categories (id, name, slug, icon, color, parent_id, display_order, is_active)
VALUES
  (gen_random_uuid(), 'Cinemas', 'cinemas', '🎬', '#E17055', (SELECT id FROM categories WHERE slug = 'entertainment'), 1, true),
  (gen_random_uuid(), 'Parks',   'parks',   '🌳', '#E17055', (SELECT id FROM categories WHERE slug = 'entertainment'), 2, true),
  (gen_random_uuid(), 'Gaming',  'gaming',  '🎮', '#E17055', (SELECT id FROM categories WHERE slug = 'entertainment'), 3, true),
  (gen_random_uuid(), 'Events',  'events',  '🎪', '#E17055', (SELECT id FROM categories WHERE slug = 'entertainment'), 4, true)
ON CONFLICT (slug) DO NOTHING;
-- =============================================================================
-- GetNear V1 — Supabase Storage Buckets and Storage RLS Policies
-- Migration: 005_storage_buckets.sql
-- Description: Creates public storage buckets for business photos, review
--              photos, and user avatars. Adds Storage RLS policies that
--              mirror the database-level access rules.
-- Requirements: 7.7, 15.6
-- Design ref:   §2.1 (Supabase Storage / CDN via Cloudflare)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Create storage buckets
-- ---------------------------------------------------------------------------
-- business-photos : 5 MB limit, images only (Req 7.7)
-- review-photos   : 5 MB limit, images only (Req 15.6)
-- avatars         : 2 MB limit, images only (Req 6.9)
-- All buckets are public so CDN-served URLs work without signed tokens.
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'business-photos',
    'business-photos',
    true,
    5242880,  -- 5 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'review-photos',
    'review-photos',
    true,
    5242880,  -- 5 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'avatars',
    'avatars',
    true,
    2097152,  -- 2 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  )
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Drop existing Storage RLS policies (idempotency — safe to re-run)
-- ---------------------------------------------------------------------------

-- business-photos
DROP POLICY IF EXISTS "storage_business_photos_select"  ON storage.objects;
DROP POLICY IF EXISTS "storage_business_photos_insert"  ON storage.objects;
DROP POLICY IF EXISTS "storage_business_photos_update"  ON storage.objects;
DROP POLICY IF EXISTS "storage_business_photos_delete"  ON storage.objects;

-- review-photos
DROP POLICY IF EXISTS "storage_review_photos_select"    ON storage.objects;
DROP POLICY IF EXISTS "storage_review_photos_insert"    ON storage.objects;
DROP POLICY IF EXISTS "storage_review_photos_delete"    ON storage.objects;

-- avatars
DROP POLICY IF EXISTS "storage_avatars_select"          ON storage.objects;
DROP POLICY IF EXISTS "storage_avatars_insert"          ON storage.objects;
DROP POLICY IF EXISTS "storage_avatars_update"          ON storage.objects;
DROP POLICY IF EXISTS "storage_avatars_delete"          ON storage.objects;

-- ---------------------------------------------------------------------------
-- Storage RLS policies — business-photos bucket
--
-- Path convention: business-photos/<business_id>/<filename>
-- The first path segment (storage.foldername(name)[1]) is the business_id.
-- Mirrors database RLS on business_photos table (§3.3):
--   SELECT  — public (anyone)
--   INSERT  — business owner only
--   UPDATE  — business owner only
--   DELETE  — business owner only
-- ---------------------------------------------------------------------------

-- Public read access
CREATE POLICY "storage_business_photos_select"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'business-photos');

-- Only the business owner may upload photos
CREATE POLICY "storage_business_photos_insert"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'business-photos'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM businesses
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
    )
  );

-- Only the business owner may replace / update photos
CREATE POLICY "storage_business_photos_update"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'business-photos'
    AND EXISTS (
      SELECT 1 FROM businesses
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'business-photos'
    AND EXISTS (
      SELECT 1 FROM businesses
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
    )
  );

-- Only the business owner may delete photos
CREATE POLICY "storage_business_photos_delete"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'business-photos'
    AND EXISTS (
      SELECT 1 FROM businesses
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Storage RLS policies — review-photos bucket
--
-- Path convention: review-photos/<user_id>/<filename>
-- The first path segment is the uploading user's id.
-- Mirrors database RLS on reviews table (§3.7):
--   SELECT  — public (anyone)
--   INSERT  — any authenticated user (for their own review photos)
--   DELETE  — the uploading user only
-- ---------------------------------------------------------------------------

-- Public read access
CREATE POLICY "storage_review_photos_select"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'review-photos');

-- Any authenticated user may upload review photos under their own user_id folder
CREATE POLICY "storage_review_photos_insert"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'review-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Only the uploading user may delete their own review photos
CREATE POLICY "storage_review_photos_delete"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'review-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Storage RLS policies — avatars bucket
--
-- Path convention: avatars/<user_id>/<filename>
-- The first path segment is the user's id.
-- Mirrors database RLS on users table (§3.1):
--   SELECT  — public (anyone)
--   INSERT  — the owning user only
--   UPDATE  — the owning user only
--   DELETE  — the owning user only
-- ---------------------------------------------------------------------------

-- Public read access
CREATE POLICY "storage_avatars_select"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

-- Only the user may upload their own avatar
CREATE POLICY "storage_avatars_insert"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Only the user may replace their own avatar
CREATE POLICY "storage_avatars_update"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Only the user may delete their own avatar
CREATE POLICY "storage_avatars_delete"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
-- Migration: 006_search_function
-- Creates a PostgreSQL function for full-text + geospatial business search.
-- Requirements: 3.1, 3.2, 3.3, 3.7, 3.8, 3.11

CREATE OR REPLACE FUNCTION search_businesses(
  search_query TEXT DEFAULT '',
  user_lat DOUBLE PRECISION DEFAULT 0,
  user_lng DOUBLE PRECISION DEFAULT 0,
  radius_meters DOUBLE PRECISION DEFAULT 5000,
  filter_category_id UUID DEFAULT NULL,
  filter_min_rating NUMERIC DEFAULT NULL,
  sort_by TEXT DEFAULT 'relevance',
  page_limit INTEGER DEFAULT 20,
  page_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID, owner_id UUID, name TEXT, slug TEXT, category_id UUID,
  type TEXT, description TEXT, phone TEXT, email TEXT, website TEXT,
  whatsapp TEXT, address TEXT, city TEXT, state TEXT, pin TEXT,
  status TEXT, verified BOOLEAN, rating_avg NUMERIC, review_count INTEGER,
  view_count INTEGER, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  lat DOUBLE PRECISION, lng DOUBLE PRECISION, distance_m DOUBLE PRECISION,
  total_count BIGINT
) LANGUAGE sql STABLE AS $$
  SELECT
    b.id, b.owner_id, b.name, b.slug, b.category_id,
    b.type, b.description, b.phone, b.email, b.website,
    b.whatsapp, b.address, b.city, b.state, b.pin,
    b.status, b.verified, b.rating_avg, b.review_count,
    b.view_count, b.created_at, b.updated_at,
    ST_Y(b.location::geometry) AS lat,
    ST_X(b.location::geometry) AS lng,
    ST_Distance(b.location, ST_MakePoint(user_lng, user_lat)::geography) AS distance_m,
    COUNT(*) OVER() AS total_count
  FROM businesses b
  WHERE
    b.status = 'active'
    AND b.location IS NOT NULL
    AND ST_DWithin(b.location, ST_MakePoint(user_lng, user_lat)::geography, radius_meters)
    AND (search_query = '' OR b.search_vector @@ plainto_tsquery('english', search_query))
    AND (filter_category_id IS NULL OR b.category_id = filter_category_id)
    AND (filter_min_rating IS NULL OR b.rating_avg >= filter_min_rating)
  ORDER BY
    CASE WHEN sort_by = 'distance' THEN ST_Distance(b.location, ST_MakePoint(user_lng, user_lat)::geography) END ASC NULLS LAST,
    CASE WHEN sort_by = 'rating' THEN b.rating_avg END DESC NULLS LAST,
    CASE WHEN sort_by = 'newest' THEN EXTRACT(EPOCH FROM b.created_at) END DESC NULLS LAST,
    CASE WHEN sort_by = 'relevance' AND search_query != '' THEN ts_rank(b.search_vector, plainto_tsquery('english', search_query)) END DESC NULLS LAST,
    b.rating_avg DESC NULLS LAST
  LIMIT page_limit OFFSET page_offset;
$$;
