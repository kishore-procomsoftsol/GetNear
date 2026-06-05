# Design Document: Listing Page Enhancements

## Overview

This design covers four enhancements to the GetNear business listing page and associated admin functionality:

1. **Google Map Rendering** — Fix the current "Map not available" state by properly initializing the Google Maps component on the listing page when coordinates are available.
2. **SEO-Friendly Slug URLs** — Replace UUID-based listing URLs (`/listing/{uuid}`) with human-readable slug-based URLs (`/listing/{slug}`), including 301 redirects for backwards compatibility.
3. **Customer Reviews Display** — Fetch and render real customer reviews on the listing page (replacing the placeholder) using the existing Reviews API.
4. **Admin Review Management** — Add review moderation capabilities (approve, edit, delete) to the admin panel with audit logging and automatic rating recalculation.

## Architecture

```mermaid
graph TB
    subgraph "Frontend - Web App (Next.js 14)"
        LP[Listing Page /listing/[slug]]
        MC[MapView Component]
        RC[ReviewCard Component]
        RS[Reviews Section]
        LP --> MC
        LP --> RS
        RS --> RC
    end

    subgraph "Frontend - Admin App (Next.js 14)"
        ARP[Admin Reviews Page]
        ARF[Review Filters]
        ARA[Review Actions]
        ARP --> ARF
        ARP --> ARA
    end

    subgraph "Backend - Express API"
        BA[GET /businesses/:identifier]
        RA[GET /businesses/:id/reviews]
        ADMIN[Admin Review Routes]
    end

    subgraph "Database - Supabase PostgreSQL"
        BT[(businesses table)]
        RT[(reviews table)]
        AL[(admin_logs table)]
    end

    LP -->|fetch business by slug/uuid| BA
    LP -->|fetch reviews| RA
    ARP -->|list/filter reviews| ADMIN
    ARA -->|approve/edit/delete| ADMIN
    BA --> BT
    RA --> RT
    ADMIN --> RT
    ADMIN --> AL
    ADMIN -->|recalculate rating| BT
```

### Key Architectural Decisions

1. **Slug resolution at API level**: The `GET /businesses/:identifier` endpoint detects whether the path parameter is a UUID v4 or a slug, then queries accordingly. This keeps routing logic centralized.
2. **Client-side redirect for old UUID URLs**: The Next.js page component detects UUID format in the URL param, fetches the business to get its slug, and performs a client-side redirect (with `router.replace`). A Next.js middleware handles the 301 redirect for crawlers/SSR.
3. **Reviews fetched separately**: Reviews are loaded as a secondary request after the main business data loads, keeping the initial page load fast and allowing graceful degradation if the reviews API fails.
4. **Rating recalculation via database function**: A PostgreSQL function `recalculate_business_rating(business_id)` ensures rating_avg and review_count stay consistent after any moderation action.

## Components and Interfaces

### 1. Listing Page Route Change

**Current**: `apps/web/app/(customer)/listing/[id]/page.tsx`
**New**: `apps/web/app/(customer)/listing/[slug]/page.tsx`

The dynamic segment is renamed from `[id]` to `[slug]` to reflect the new URL structure. The page logic:
1. Extracts the `slug` param
2. If the param matches UUID v4 format (`/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`), fetches the business by UUID, then redirects to `/listing/{slug}` with 301
3. Otherwise, fetches the business by slug via `GET /businesses/{slug}`

### 2. Business API - Identifier Resolution

**Endpoint**: `GET /businesses/:identifier`

```typescript
// Identifier detection logic
function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

// In the route handler:
const { id } = req.params
const column = isUUID(id) ? 'id' : 'slug'

const { data: business } = await supabaseAdmin
  .from('businesses')
  .select('*, business_photos(*), ...')
  .eq(column, id)
  .single()
```

### 3. Reviews Section Component

A new `ReviewsSection` component added to the listing page:

```typescript
interface ReviewsSectionProps {
  businessId: string
  reviewCount: number
  slug: string
}
```

- Fetches `GET /businesses/:id/reviews?limit=3` on mount
- Renders `ReviewCard` components for each review
- Shows skeleton loading state during fetch
- Shows placeholder when no reviews exist
- Shows "View all" link when `reviewCount > 3`
- Hides section entirely on API error

### 4. ReviewCard Component

```typescript
interface ReviewCardProps {
  review: {
    id: string
    rating: number
    text: string | null
    created_at: string
    users: {
      id: string
      name: string
      avatar_url: string | null
    }
  }
}
```

Displays:
- Author avatar (or initial fallback from first letter of name)
- Author name
- Star rating (1–5)
- Relative date (e.g., "2 days ago")
- Review text truncated to 150 characters with ellipsis

### 5. Admin Review Management

**New routes in `api/src/routes/admin.ts`:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/reviews` | Paginated list with filters |
| PUT | `/admin/reviews/:id/approve` | Approve a review |
| PUT | `/admin/reviews/:id` | Edit review text |
| DELETE | `/admin/reviews/:id` | Delete a review |

**New admin page**: `apps/admin/app/(admin)/reviews/page.tsx`

### 6. MapView Integration Fix

The existing `LazyMapView` component is already imported and used in the listing page. The current code correctly passes `markers`, `center`, and `zoom` props when coordinates exist. The issue is that the `MapView` component needs the Google Maps API key to be available at runtime.

**Fix**: Verify `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set in the web app's environment. The existing `MapView` component already handles:
- Loading the Google Maps script dynamically
- Calling `onError` when the key is missing or script fails
- Initializing the map with the provided center and zoom

The listing page already renders `LazyMapView` when `business.lat && business.lng` are truthy, and falls back to "Map not available" otherwise. The fix is ensuring the environment variable is properly configured in deployment.

## Data Models

### Existing Tables (Relevant Columns)

**businesses**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Primary key |
| slug | text (unique, nullable) | SEO-friendly URL identifier |
| name | text | Business name |
| lat | numeric | Latitude |
| lng | numeric | Longitude |
| rating_avg | numeric | Average rating (recalculated) |
| review_count | integer | Count of approved reviews |
| status | text | 'active', 'pending', 'suspended' |
| owner_id | uuid (FK) | References users.id |

**reviews**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Primary key |
| business_id | uuid (FK) | References businesses.id |
| user_id | uuid (FK) | References users.id |
| rating | integer | 1–5 |
| text | text (nullable) | Review content |
| photos | jsonb (nullable) | Review photo URLs |
| status | text | 'pending', 'approved', 'rejected' (new) |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

**admin_logs**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Primary key |
| admin_id | uuid (FK) | Who performed the action |
| action | text | 'review_approve', 'review_edit', 'review_delete' |
| target_type | text | 'review' |
| target_id | uuid | Review ID |
| note | text (nullable) | Additional context (e.g., original text on edit) |
| created_at | timestamptz | Timestamp |

### New Database Function

```sql
CREATE OR REPLACE FUNCTION recalculate_business_rating(p_business_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE businesses
  SET
    rating_avg = COALESCE(
      (SELECT AVG(rating)::numeric(3,2) FROM reviews
       WHERE business_id = p_business_id AND status = 'approved'),
      0
    ),
    review_count = (
      SELECT COUNT(*) FROM reviews
      WHERE business_id = p_business_id AND status = 'approved'
    ),
    updated_at = NOW()
  WHERE id = p_business_id;
END;
$$ LANGUAGE plpgsql;
```

### Slug Validation

```typescript
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const MIN_SLUG_LENGTH = 3
const MAX_SLUG_LENGTH = 120

function isValidSlug(slug: string): boolean {
  return (
    slug.length >= MIN_SLUG_LENGTH &&
    slug.length <= MAX_SLUG_LENGTH &&
    SLUG_REGEX.test(slug)
  )
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Slug Format Validation

*For any* string, the slug validation function SHALL accept it if and only if the string is 3–120 characters long and matches the pattern `[a-z0-9]+(?:-[a-z0-9]+)*` (lowercase alphanumeric segments separated by single hyphens, no leading/trailing hyphens, no consecutive hyphens).

**Validates: Requirements 2.1**

### Property 2: UUID vs Slug Identifier Classification

*For any* string input to the business lookup endpoint, the identifier classification function SHALL categorize it as a UUID if and only if it matches the UUID v4 format (`/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`), and as a slug otherwise.

**Validates: Requirements 2.4**

### Property 3: UUID Access Redirects to Slug

*For any* business that has both a UUID and a non-null slug, when the listing page is accessed via `/listing/{uuid}`, the system SHALL respond with a 301 redirect to `/listing/{slug}`.

**Validates: Requirements 2.6**

### Property 4: Review Card Text Truncation

*For any* review with non-null text, the displayed text in a ReviewCard SHALL be at most 150 characters long. If the original text exceeds 150 characters, the displayed text SHALL end with an ellipsis ("…") and contain the first 150 characters of the original text.

**Validates: Requirements 3.2**

### Property 5: Pagination Limit Clamping

*For any* integer value provided as the `limit` query parameter, the effective limit applied to the query SHALL equal `min(max(value, 1), 50)` — clamped to the range [1, 50].

**Validates: Requirements 3.4, 4.1**

### Property 6: Admin Filter Correctness

*For any* set of reviews and any combination of filter criteria (business, rating range, date range, status), every review in the filtered result set SHALL match ALL active filter criteria simultaneously.

**Validates: Requirements 4.2**

### Property 7: Rating Consistency After Moderation

*For any* business and its associated set of approved reviews, the business `rating_avg` SHALL equal the arithmetic mean of all approved review ratings (rounded to 2 decimal places), and `review_count` SHALL equal the count of approved reviews. When no approved reviews exist, `rating_avg` SHALL be 0 and `review_count` SHALL be 0.

**Validates: Requirements 4.3, 4.5**

### Property 8: Review Text Length Validation

*For any* string submitted as review text in an admin edit operation, the system SHALL reject the edit if the string is empty (length 0) or exceeds 1000 characters, and SHALL accept it if the string length is between 1 and 1000 characters inclusive.

**Validates: Requirements 4.8**

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Google Maps API key missing | MapView calls `onError`, listing page shows "Map not available" fallback |
| Google Maps script fails to load | Same as above — `onError` triggered |
| Slug not found in database | API returns 404, page shows "Business not found" with back button |
| UUID in URL but business has no slug | No redirect; serve the page at the UUID URL |
| Reviews API request fails | Reviews section hidden silently (no error shown to user) |
| Reviews API timeout (>10s) | AbortController cancels request; section hidden |
| Admin action on non-existent review | API returns 404 with "Review not found" message |
| Admin edit with invalid text length | API returns 400 with validation error describing constraint |
| Business is not "active" status | Non-owner users get 404; owner sees the page |
| Duplicate review submission | API returns 409 "You have already reviewed this business" |

## Testing Strategy

### Property-Based Tests (fast-check)

The project already uses `fast-check` (v3.23.2) with `vitest` for property-based testing. Each correctness property maps to a single property-based test running a minimum of 100 iterations.

**Library**: fast-check (already in devDependencies)
**Runner**: vitest (already configured)
**Minimum iterations**: 100 per property test
**Tag format**: `Feature: listing-page-enhancements, Property {number}: {property_text}`

Properties to test:
1. Slug format validation — generate random strings, verify acceptance/rejection matches regex
2. UUID vs slug classification — generate UUIDs and non-UUID strings, verify correct classification
3. UUID-to-slug redirect — generate business fixtures with slug, verify redirect behavior
4. Review text truncation — generate strings of varying length, verify truncation logic
5. Pagination limit clamping — generate random integers, verify clamping math
6. Admin filter correctness — generate review sets and filter combos, verify result filtering
7. Rating consistency — generate review sets with ratings, verify mean calculation
8. Review text validation — generate strings of varying lengths, verify accept/reject boundary

### Unit Tests (Example-Based)

- Map renders with valid coordinates (zoom=15, marker present)
- Map fallback renders when coordinates are null
- ReviewCard renders all required fields (name, avatar, rating, date, text)
- "View all" link appears when review_count > 3
- Skeleton placeholders shown during loading
- Reviews section hidden on API error
- Admin reviews table renders correct columns
- Audit log entries created on moderation actions

### Integration Tests

- `GET /businesses/{slug}` returns correct business
- `GET /businesses/{uuid}` returns correct business (backwards compatibility)
- `GET /businesses/:id/reviews` returns paginated reviews with user data
- Admin approve → review status updated + rating recalculated
- Admin delete → review removed + rating recalculated
- Admin edit → text updated + original logged
- 301 redirect from UUID URL to slug URL

### Edge Case Tests

- Slug not found → 404
- UUID for business without slug → no redirect, serve page
- Non-active business accessed by non-owner → 404
- Empty reviews list → placeholder shown
- Review text exactly 150 chars → no truncation
- Review text 151 chars → truncated with ellipsis
- Admin action on deleted review → 404
- Edit with exactly 1000 chars → accepted
- Edit with 1001 chars → rejected
