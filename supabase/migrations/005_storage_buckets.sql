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
