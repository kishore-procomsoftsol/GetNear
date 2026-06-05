# Implementation Plan: Listing Page Enhancements

## Overview

This plan implements four enhancements to the GetNear listing page: fixing Google Map rendering, adding SEO-friendly slug URLs, displaying customer reviews, and building admin review management. Tasks are ordered to build foundational changes first (database, API), then frontend components, and finally wire everything together.

## Tasks

- [x] 1. Database migration and slug infrastructure
  - [x] 1.1 Create database migration for review status column and rating recalculation function
    - Create `supabase/migrations/010_review_moderation.sql`
    - Add `status` column (text, default 'approved') to the `reviews` table if not already present, with CHECK constraint for values ('pending', 'approved', 'rejected')
    - Create `recalculate_business_rating(p_business_id uuid)` PostgreSQL function that updates `rating_avg` and `review_count` on the businesses table using only approved reviews
    - Add index on `reviews(business_id, status)` for efficient filtered queries
    - _Requirements: 4.3, 4.5_

  - [x] 1.2 Add slug-based lookup utilities to the API
    - Create a `isUUID` helper function in `api/src/utils/identifiers.ts` that detects UUID v4 format strings
    - Create a `isValidSlug` helper function that validates slug format (3–120 chars, lowercase alphanumeric segments separated by single hyphens)
    - Export both functions for use in route handlers
    - _Requirements: 2.1, 2.4_

  - [x] 1.3 Write property tests for slug validation and UUID classification
    - **Property 1: Slug Format Validation** — generate random strings and verify acceptance/rejection matches the regex `[a-z0-9]+(?:-[a-z0-9]+)*` with length 3–120
    - **Property 2: UUID vs Slug Identifier Classification** — generate UUID v4 strings and non-UUID strings, verify correct classification
    - **Validates: Requirements 2.1, 2.4**

- [x] 2. API route enhancements
  - [x] 2.1 Update `GET /businesses/:id` to support slug-based lookup
    - Modify `api/src/routes/businesses.ts` route handler for `/:id`
    - Use the `isUUID` helper to detect whether the parameter is a UUID or slug
    - Query by `id` column if UUID, or by `slug` column otherwise
    - Return 404 if no business found for either identifier type
    - Maintain existing non-active business visibility logic (owner-only access)
    - _Requirements: 2.2, 2.4, 2.8_

  - [x] 2.2 Update reviews endpoint to filter by status
    - Modify `GET /businesses/:id/reviews` in `api/src/routes/reviews.ts`
    - Add `.eq('status', 'approved')` filter so only approved reviews are returned to customers
    - Ensure `users(id, name, avatar_url)` join is included in the select
    - _Requirements: 3.1, 3.4_

  - [x] 2.3 Add admin review management API routes
    - Add routes to `api/src/routes/admin.ts`:
      - `GET /admin/reviews` — paginated list with filters (business, rating, date range, status), 20 per page, max 50
      - `PUT /admin/reviews/:id/approve` — set status to 'approved', call `recalculate_business_rating`, log action
      - `PUT /admin/reviews/:id` — edit review text (validate 1–1000 chars), log original text in admin_logs
      - `DELETE /admin/reviews/:id` — delete review, call `recalculate_business_rating`, log action
    - All routes require admin authentication and use existing `logAdminAction` helper
    - Return 404 if review not found for approve/edit/delete
    - Return 400 with validation error for invalid text length on edit
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [x] 2.4 Write property tests for pagination clamping and rating consistency
    - **Property 5: Pagination Limit Clamping** — generate random integers, verify effective limit equals `min(max(value, 1), 50)`
    - **Property 7: Rating Consistency After Moderation** — generate sets of reviews with ratings 1–5, verify mean calculation and count match the function output
    - **Validates: Requirements 3.4, 4.1, 4.3, 4.5**

  - [x] 2.5 Write property tests for admin filter correctness and review text validation
    - **Property 6: Admin Filter Correctness** — generate review sets and filter combinations, verify all results match ALL active filter criteria
    - **Property 8: Review Text Length Validation** — generate strings of varying lengths, verify accept/reject at the 0, 1, 1000, and 1001 boundaries
    - **Validates: Requirements 4.2, 4.8**

- [x] 3. Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Frontend listing page restructure (slug URLs and map fix)
  - [x] 4.1 Rename listing route from `[id]` to `[slug]` and implement redirect logic
    - Move `apps/web/app/(customer)/listing/[id]/page.tsx` to `apps/web/app/(customer)/listing/[slug]/page.tsx`
    - Update the page component to extract `slug` from params instead of `id`
    - Add UUID detection: if the param matches UUID v4 format, fetch business by UUID, get the slug, then `router.replace(/listing/${slug})`
    - For non-UUID params, fetch business via `GET /businesses/${slug}`
    - Update all internal links in the page to use slug-based URLs
    - _Requirements: 2.1, 2.2, 2.5, 2.6, 2.7_

  - [x] 4.2 Add Next.js middleware for 301 redirect from UUID to slug URLs
    - Create or update `apps/web/middleware.ts` to intercept `/listing/{uuid}` requests
    - Match UUID v4 pattern in the path segment
    - Fetch business slug from API and respond with 301 redirect to `/listing/{slug}`
    - Pass through non-UUID listing URLs unchanged
    - _Requirements: 2.6_

  - [x] 4.3 Write property test for UUID redirect detection
    - **Property 3: UUID Access Redirects to Slug** — generate UUID v4 strings and verify they are detected for redirect, while non-UUID slugs pass through
    - **Validates: Requirements 2.6**

  - [x] 4.4 Verify Google Maps integration on listing page
    - Confirm `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is referenced in environment configuration (`.env.example`, `.env.local`)
    - Verify `LazyMapView` is rendered with `center`, `markers`, and `zoom={15}` when `business.lat && business.lng` are truthy
    - Verify the "Map not available" fallback renders when coordinates are null or map errors
    - Ensure the map container has a minimum height of 96px (`h-24` class)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 5. Frontend reviews display
  - [x] 5.1 Create `ReviewCard` component
    - Create `apps/web/components/listings/ReviewCard.tsx`
    - Accept props: reviewer name, avatar_url (nullable), rating (1–5), created_at, text (nullable)
    - Display avatar image or initial fallback (first letter of name in a colored circle)
    - Display star rating using existing `RatingStars` component or inline stars
    - Display relative date using a date utility (e.g., "2 days ago")
    - Truncate review text to 150 characters with ellipsis if longer; show full text if ≤150 chars
    - _Requirements: 3.2_

  - [x] 5.2 Write property test for review text truncation
    - **Property 4: Review Card Text Truncation** — generate strings of varying lengths, verify displayed text is at most 150 chars and ends with "…" when original exceeds 150
    - **Validates: Requirements 3.2**

  - [x] 5.3 Create `ReviewsSection` component
    - Create `apps/web/components/listings/ReviewsSection.tsx`
    - Accept props: `businessId`, `reviewCount`, `slug`
    - Fetch `GET /businesses/${businessId}/reviews?limit=3` on mount with AbortController (10s timeout)
    - Display skeleton placeholders while loading (3 card-shaped skeletons)
    - Render `ReviewCard` for each returned review
    - Show "No reviews yet" placeholder when no reviews exist
    - Show "View all" link (to `/listing/${slug}/reviews`) when `reviewCount > 3`
    - Hide entire section silently on API error or timeout
    - _Requirements: 3.1, 3.3, 3.5, 3.6, 3.7_

  - [x] 5.4 Integrate `ReviewsSection` into the listing page
    - Replace the hardcoded "What people say" section in the listing page with `<ReviewsSection>`
    - Pass `businessId={business.id}`, `reviewCount={business.review_count}`, `slug={slug}`
    - _Requirements: 3.1, 3.5_

- [x] 6. Checkpoint - Ensure frontend builds and tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Admin review management UI
  - [x] 7.1 Create admin reviews page with table and filters
    - Create `apps/admin/app/(admin)/reviews/page.tsx`
    - Fetch `GET /admin/reviews` with pagination (20 per page)
    - Display table with columns: business name, reviewer name, rating, review text (truncated), date, status
    - Add filter controls: business search, rating range dropdown, date range picker, status select (pending/approved/rejected)
    - Add pagination controls (previous/next) at table footer
    - _Requirements: 4.1, 4.2_

  - [x] 7.2 Implement review moderation actions (approve, edit, delete)
    - Add "Approve" button for pending/rejected reviews — calls `PUT /admin/reviews/:id/approve`
    - Add "Edit" action that opens a modal/dialog with textarea (max 1000 chars) — calls `PUT /admin/reviews/:id`
    - Add "Delete" action with confirmation dialog — calls `DELETE /admin/reviews/:id`
    - Show success/error toast notifications after each action
    - Refresh the reviews list after any successful action
    - Handle 404 (review not found) and 400 (validation error) responses gracefully
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [x] 7.3 Add reviews link to admin sidebar navigation
    - Update the admin layout sidebar in `apps/admin/app/(admin)/layout.tsx`
    - Add a "Reviews" navigation item linking to `/reviews`
    - Use appropriate icon (e.g., MessageSquare from lucide-react)
    - _Requirements: 4.1_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The Google Maps fix (4.4) is primarily a configuration verification — the existing `MapView` component already handles dynamic script loading and error fallback correctly
- The `recalculate_business_rating` function is the single source of truth for rating consistency after any moderation action

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3", "4.1", "4.4", "5.1"] },
    { "id": 3, "tasks": ["2.4", "2.5", "4.2", "5.2", "5.3"] },
    { "id": 4, "tasks": ["4.3", "5.4", "7.1"] },
    { "id": 5, "tasks": ["7.2", "7.3"] }
  ]
}
```
