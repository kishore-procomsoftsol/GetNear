# Implementation Plan: Google Places Integration

## Overview

Replace the internal Supabase-based business listing system with a Google Places API proxy architecture. All place discovery, search, and detail requests will flow through the Express backend, which manages caching, rate limiting, and API key security. The frontend transitions from internal business data to proxied Google Places data.

## Tasks

- [x] 1. Database migrations and schema changes
  - [x] 1.1 Create the `places_cache` table with indexes
    - Create a new SQL migration file for the `places_cache` table
    - Include columns: id (UUID PK), cache_key (TEXT UNIQUE), place_id (TEXT), endpoint_type (TEXT with CHECK constraint), response_data (JSONB), created_at (TIMESTAMPTZ), expires_at (TIMESTAMPTZ)
    - Add indexes on cache_key, expires_at, and place_id
    - _Requirements: 4.4_

  - [x] 1.2 Migrate the `saved_places` table to use Place IDs
    - Drop the `business_id` column from `saved_places`
    - Add `place_id TEXT NOT NULL` column
    - Add unique constraint on (user_id, place_id)
    - _Requirements: 6.1, 6.4_

- [x] 2. Core backend services
  - [x] 2.1 Implement GooglePlacesService (`api/src/lib/googlePlaces.ts`)
    - Create the service with methods: nearbySearch, textSearch, placeDetails, placePhoto
    - Use `fetch` with 5-second AbortController timeout for all Google API calls
    - Map Google response fields to the PlaceSummary and PlaceDetailsResult interfaces
    - Handle Google status codes (OK, ZERO_RESULTS, OVER_QUERY_LIMIT, REQUEST_DENIED, INVALID_REQUEST)
    - Read API key from `GOOGLE_PLACES_API_KEY` environment variable
    - _Requirements: 1.2, 1.3, 2.1, 2.2, 3.1, 5.1, 9.1_

  - [x] 2.2 Implement CacheService (`api/src/lib/placesCache.ts`)
    - Create cache key builder with coordinate rounding to 3 decimal places
    - Implement `get(cacheKey)` — return cached data if not expired, null otherwise
    - Implement `set(cacheKey, placeId, endpointType, data, ttlSeconds)` — upsert into places_cache
    - Implement `cleanup()` — delete expired entries, trigger when table exceeds 10,000 rows
    - Use Supabase client from existing `api/src/lib/supabase.ts`
    - _Requirements: 4.1, 4.2, 4.3, 4.5_

  - [x] 2.3 Write property tests for cache key determinism and spatial bucketing
    - **Property 2: Cache key determinism and uniqueness**
    - **Property 3: Coordinate spatial bucketing**
    - **Validates: Requirements 4.1, 4.2**

  - [x] 2.4 Write property tests for cache round-trip and TTL correctness
    - **Property 1: Cache round-trip preserves data**
    - **Property 4: Cache TTL correctness**
    - **Validates: Requirements 4.1, 4.2, 4.3**

- [x] 3. API routes and middleware
  - [x] 3.1 Create places rate limiter middleware (`api/src/middleware/placesRateLimit.ts`)
    - Configure rate limit of 30 requests per minute per IP for places endpoints
    - Return 429 with "Too Many Requests" message when exceeded
    - _Requirements: 5.3, 5.4_

  - [x] 3.2 Create places router (`api/src/routes/places.ts`)
    - Implement `GET /places/nearby` — validate lat/lng required, radius optional (default 5000, max 50000); use cache-first pattern; return up to 10 PlaceSummary items
    - Implement `GET /places/search` — validate query required; support lat, lng, radius, type, openNow, pageToken params; use cache-first pattern; return PlaceSummary array with nextPageToken
    - Implement `GET /places/:placeId` — validate placeId format; use cache-first pattern; return PlaceDetailsResult with max 5 reviews
    - Implement `GET /places/photo` — validate ref required; proxy image from Google; set `Cache-Control: public, max-age=86400` header; return binary image
    - Wire GooglePlacesService and CacheService into each handler
    - _Requirements: 1.1, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 9.1, 9.2, 9.3_

  - [x] 3.3 Register the places router in `api/src/routes/index.ts`
    - Import and mount placesRouter at `/places`
    - Remove the dashboard router import and registration
    - _Requirements: 8.3_

  - [x] 3.4 Write property tests for response transformation and output capping
    - **Property 8: Response transformation completeness**
    - **Property 9: Output collection capping**
    - **Validates: Requirements 1.1, 1.3, 2.2, 3.1, 3.2**

  - [x] 3.5 Write property test for rate limit enforcement
    - **Property 7: Rate limit enforcement**
    - **Validates: Requirements 5.3, 5.4**

- [x] 4. Checkpoint - Backend verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Saved places and search history updates
  - [x] 5.1 Update saved places routes to use Place IDs
    - Modify save endpoint to accept `placeId` (string) instead of `businessId`
    - Add duplicate detection returning 409 with ALREADY_SAVED error code
    - Update list endpoint to resolve Place IDs via cache/Google for display data
    - Update delete endpoint to work with place_id
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 5.2 Update search history with deduplication logic
    - Add 60-second deduplication check before inserting new search history entries
    - Ensure list endpoint returns max 50 entries ordered by timestamp descending
    - Verify clear endpoint deletes all entries for the user
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 5.3 Write property tests for saved places and search history
    - **Property 5: Saved place uniqueness enforcement**
    - **Property 6: Search history deduplication**
    - **Property 10: Search history ordering and limit**
    - **Validates: Requirements 6.4, 6.5, 7.2, 7.4**

- [x] 6. Frontend changes
  - [x] 6.1 Update PopularNearYou component to use `/places/nearby`
    - Modify `apps/web/components/home/PopularNearYou.tsx` to call `/places/nearby` endpoint
    - Map PlaceSummary response to existing card UI components
    - Use `/places/photo?ref=...` for place images
    - Handle loading, error, and empty states
    - _Requirements: 1.1, 1.3, 9.1, 11.1_

  - [x] 6.2 Update search page to use `/places/search`
    - Modify search page to call `/places/search` with query, location bias, and filters
    - Support pagination via nextPageToken
    - Display results as PlaceSummary cards with photos
    - Record search history on query submission
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 7.1_

  - [x] 6.3 Create listing detail page at `/listing/[placeId]`
    - Create `apps/web/app/listing/[placeId]/page.tsx`
    - Fetch place details from `/places/:placeId`
    - Display name, address, phone, website, opening hours, rating, reviews (max 5), and photos
    - Show "Place not found" with homepage link for invalid Place IDs
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 10.1, 10.2, 10.3_

- [x] 7. Cleanup and route removal
  - [x] 7.1 Remove business dashboard and add-business flows
    - Delete `apps/web/app/dashboard/` directory
    - Delete `apps/web/app/add-business/` directory
    - Remove business CRUD routes (POST, PUT, DELETE) from `api/src/routes/businesses.ts`
    - Delete `api/src/routes/dashboard.ts`
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 7.2 Add redirects for removed routes
    - Redirect `/dashboard` and `/add-business` navigation to homepage
    - Ensure no dead links remain in navigation components
    - _Requirements: 8.4, 11.2, 11.3_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The Google Maps API key is already available as an environment variable
- The project uses vitest + fast-check for testing (already configured)
- Database migrations target Supabase (PostgreSQL with PostGIS)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3", "2.4", "3.1"] },
    { "id": 3, "tasks": ["3.2"] },
    { "id": 4, "tasks": ["3.3", "3.4", "3.5"] },
    { "id": 5, "tasks": ["5.1", "5.2"] },
    { "id": 6, "tasks": ["5.3", "6.1", "6.2"] },
    { "id": 7, "tasks": ["6.3", "7.1"] },
    { "id": 8, "tasks": ["7.2"] }
  ]
}
```
