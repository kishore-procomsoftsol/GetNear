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
