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
