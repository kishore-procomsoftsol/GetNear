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
