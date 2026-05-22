# Implementation Plan: GetNear V1

## Overview

This plan converts the GetNear V1 design into incremental coding tasks across six phases: Foundation, Customer Core, Customer Secondary, Business Owner, Admin Panel, and Polish & Launch. Each task is scoped to a single developer session and references specific requirements for traceability. Tasks build on each other so no code is left orphaned.

The implementation language is **TypeScript** throughout (Next.js 14 App Router for frontend apps, Node.js + Express for the API, shared Zod schemas in `packages/validation`).

---

## Tasks

## Phase 1 — Foundation

- [x] 1. Initialize Turborepo monorepo and shared packages
  - [x] 1.1 Scaffold Turborepo workspace with `apps/web`, `apps/admin`, `packages/types`, `packages/validation`, `packages/config`, and `supabase/` directories
    - Create `turbo.json` with `build`, `dev`, `lint`, and `test` pipeline definitions
    - Create root `package.json` with workspaces configuration
    - Add `.gitignore`, `.env.example`, and `README.md`
    - _Requirements: 19.1_
  - [x] 1.2 Create shared TypeScript types in `packages/types/src/index.ts`
    - Define interfaces: `User`, `Business`, `BusinessPhoto`, `BusinessHours`, `BusinessService`, `Category`, `Review`, `SavedPlace`, `Collection`, `Lead`, `Offer`, `Booking`, `Message`, `Notification`, `AdminLog`, `Report`
    - Export `isPlus(user: User): boolean` utility function
    - _Requirements: 19.1, 16.1_
  - [x] 1.3 Create shared Zod validation schemas in `packages/validation/src/index.ts`
    - Define schemas for all API request bodies: `sendOtpSchema`, `verifyOtpSchema`, `createBusinessSchema`, `updateBusinessSchema`, `createReviewSchema`, `createBookingSchema`, `createOfferSchema`, `broadcastNotificationSchema`
    - Define response schemas for `Business`, `User`, `Review`, `Booking` (used for round-trip validation)
    - _Requirements: 19.1, 19.2, 19.3_
  - [x] 1.4 Write property test for round-trip serialization of shared schemas
    - **Property 9: Round-Trip Serialization**
    - **Validates: Requirements 19.4**
    - Use `fast-check` to generate arbitrary `Business`, `User`, `Review`, and `Booking` objects, serialize to JSON, parse with Zod schema, and assert deep equality
  - [x] 1.5 Create shared config in `packages/config/src/index.ts`
    - Export `CATEGORIES` seed array, `RADIUS_OPTIONS` (1, 3, 5, 10, 50 km), `BOOKING_STATUSES`, `LEAD_TYPES`, `PLUS_LIMITS`
    - _Requirements: 2.8, 16.1_

- [x] 2. Supabase project setup — schema, auth, and storage
  - [x] 2.1 Write SQL migration `supabase/migrations/001_initial_schema.sql`
    - Create all 17 tables with correct column types, constraints, and foreign keys as specified in design §3
    - Enable PostGIS extension; add `GEOGRAPHY(POINT, 4326)` column on `businesses`
    - Create all indexes listed in design §3 (GIST, GIN, B-tree)
    - _Requirements: 17.7_
  - [x] 2.2 Write SQL migration `supabase/migrations/002_triggers.sql`
    - Add `trg_business_search_vector` trigger to auto-update `search_vector` on businesses INSERT/UPDATE
    - Add `trg_update_business_rating` trigger to recalculate `rating_avg` and `review_count` on reviews INSERT/UPDATE/DELETE
    - _Requirements: 15.2, 14.11_
  - [x] 2.3 Write SQL migration `supabase/migrations/003_rls_policies.sql`
    - Implement RLS policies for all tables as specified in design §13.1
    - Verify `businesses` readable by all when `status = 'active'`; owner can update own; admin can update any
    - _Requirements: 17.7_
  - [x] 2.4 Write SQL migration `supabase/migrations/004_seed_categories.sql`
    - Seed the `categories` table with initial entries: Food, Services, Healthcare, Shops, ATM, and subcategories
    - _Requirements: 2.5, 10.5_
  - [x] 2.5 Configure Supabase Storage buckets
    - Create `business-photos`, `review-photos`, and `avatars` public buckets
    - Add Storage RLS policies matching database RLS rules
    - _Requirements: 7.7, 15.6_

- [x] 3. Express API scaffold and middleware
  - [x] 3.1 Initialize `api/` Node.js + Express project with TypeScript
    - Set up `tsconfig.json`, `package.json`, `src/index.ts` entry point
    - Install and configure: `express`, `cors`, `helmet`, `express-rate-limit`, `zod`, `@supabase/supabase-js`, `@sentry/node`, `axios`
    - Configure CORS for `getnear.in`, `admin.getnear.in`, and localhost dev origins (design §13.4)
    - _Requirements: 17.5, 17.6_
  - [x] 3.2 Implement core API middleware
    - `src/middleware/validate.ts` — Zod request body validation middleware
    - `src/middleware/auth.ts` — JWT Bearer token extraction and Supabase user lookup
    - `src/middleware/requireRole.ts` — Role-based access guard (`requireRole('admin')`, `requireRole('business')`)
    - `src/middleware/errorHandler.ts` — Centralized error handler with Sentry capture and consistent `{ error }` envelope
    - `src/middleware/rateLimit.ts` — `otpLimiter`, `searchLimiter`, `apiLimiter` as specified in design §13.3
    - _Requirements: 17.5, 17.6, 19.2_
  - [x] 3.3 Implement API response envelope helper
    - `src/utils/response.ts` — `sendSuccess(res, data, meta?)` and `sendError(res, code, message, status)` helpers
    - Ensure all responses conform to `{ data, error, meta }` envelope
    - _Requirements: 19.3, 19.5, 19.6_

- [x] 4. Next.js web app scaffold and design system
  - [x] 4.1 Initialize `apps/web` Next.js 14 App Router project
    - Configure `next.config.ts` with Supabase Storage remote image patterns
    - Set up `tailwind.config.ts` with GetNear design tokens (colors, typography, spacing)
    - Install shadcn/ui and initialize component library
    - Install `framer-motion`, `zustand`, `axios`, `react-hook-form`, `zod`, `lucide-react`
    - _Requirements: 18.1_
  - [x] 4.2 Build shared UI primitives in `apps/web/components/ui/`
    - Implement or configure shadcn components: `Button`, `Input`, `Card`, `Badge`, `Dialog`, `Sheet`, `Tabs`, `Avatar`, `Skeleton`
    - Create `BottomSheet` component (mobile slide-up panel)
    - Create `RatingStars` component (display and input modes)
    - Ensure all interactive elements are keyboard-navigable with ARIA labels (WCAG 2.1 AA)
    - _Requirements: 18.4_
  - [x] 4.3 Implement Zustand stores in `apps/web/lib/stores/`
    - `authStore.ts` — `user`, `session`, `isLoading`, `setUser`, `setSession`, `signOut`
    - `locationStore.ts` — `lat`, `lng`, `city`, `radius`, `isLocating`, `setLocation`, `setRadius`
    - `searchStore.ts` — `query`, `filters`, `results`, `total`, `page`, `viewMode`, `fetchResults`
    - `notificationStore.ts` — `notifications`, `unreadCount`, `markRead`, `markAllRead`, `addNotification`
    - `chatStore.ts` — `threads`, `activeThread`, `messages`, `setActiveThread`, `addMessage`
    - _Requirements: 2.4, 3.1_
  - [x] 4.4 Implement Axios API client with JWT refresh interceptor
    - `apps/web/lib/api/client.ts` — Axios instance with base URL, Bearer token injection from `authStore`
    - Add 401 response interceptor that calls `POST /auth/refresh`, updates `authStore`, and retries the original request
    - _Requirements: 1.8_
  - [x] 4.5 Implement Next.js middleware for route protection
    - `apps/web/middleware.ts` — Protect `/dashboard/*` routes (require `business` role) and redirect unauthenticated users to `/login`
    - _Requirements: 1.7_

- [x] 5. Authentication flow — OTP, Google OAuth, role routing
  - [x] 5.1 Implement auth API routes
    - `POST /auth/send-otp` — validate phone (E.164), call Twilio Verify, apply `otpLimiter`
    - `POST /auth/verify-otp` — verify with Twilio, call `supabase.auth.signInWithOtp()`, read `users.role`, return `{ access_token, refresh_token, user }`
    - `POST /auth/google` — exchange Google OAuth code via Supabase, upsert user row
    - `POST /auth/refresh` — proxy Supabase token refresh, rotate refresh token in httpOnly cookie
    - `POST /auth/logout` — invalidate Supabase session
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.8, 1.9, 1.10_
  - [x] 5.2 Implement login page UI at `apps/web/app/(auth)/login/page.tsx`
    - Phone number input with E.164 validation and India (+91) default
    - OTP input step with 5-minute countdown and resend option
    - "Continue with Google" button using `supabase.auth.signInWithOAuth`
    - Error states for invalid OTP, expired OTP, and rate limit
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [x] 5.3 Implement Google OAuth callback route handler
    - `apps/web/app/api/auth/callback/route.ts` — exchange code for session, upsert user, redirect to role-appropriate page
    - _Requirements: 1.5, 1.7_
  - [x] 5.4 Implement onboarding screen at `apps/web/app/(auth)/onboarding/page.tsx`
    - 3-slide carousel: Discover, Navigate, Save — with Framer Motion transitions
    - "Get Started" CTA navigates to login; shown only on first visit (persisted in localStorage)
    - _Requirements: 2.1_

- [x] 6. Checkpoint — Phase 1 complete
  - Ensure all Supabase migrations run cleanly against a local Supabase instance
  - Ensure `packages/types`, `packages/validation`, and `packages/config` build without TypeScript errors
  - Ensure API starts and middleware stack responds correctly to test requests
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 2 — Customer Core

- [x] 7. Home page — location, categories, popular listings, mini map
  - [x] 7.1 Implement location detection and picker
    - `apps/web/app/(customer)/layout.tsx` — call `navigator.geolocation.getCurrentPosition` on mount, reverse-geocode via Google Maps Geocoding API, update `locationStore`
    - If permission denied, render `ManualLocationPicker` component (city/address text input with autocomplete)
    - Persist selected location in `locationStore` for the session
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [x] 7.2 Implement home page at `apps/web/app/(customer)/page.tsx`
    - Time-of-day greeting using device local time
    - Location label showing resolved city/neighborhood
    - Category quick-access row (Food, Services, Healthcare, Shops, ATM, More) using `CATEGORIES` from `packages/config`
    - Radius selector (1, 3, 5, 10 km free / 50 km Plus) wired to `locationStore.setRadius`
    - _Requirements: 2.5, 2.6, 2.8, 2.11_
  - [x] 7.3 Implement "Popular near you" section and mini map preview
    - Fetch top 10 listings via `GET /businesses/search` sorted by relevance, limited to current radius
    - Render horizontal scroll `BusinessCard` row
    - Render `MapView` mini preview with pins for the fetched listings
    - _Requirements: 2.7, 2.9_
  - [x] 7.4 Implement bottom navigation bar
    - `apps/web/components/shared/BottomNav.tsx` — five items: Home, Search, Saved, Chats, Account
    - Show unread message badge on Chats item (from `chatStore`)
    - Show unread notification badge on Account item (from `notificationStore`)
    - Visible on all `(customer)` layout screens
    - _Requirements: 2.10, 13.4, 14.4_

- [x] 8. Search — full-text + geospatial API and results UI
  - [x] 8.1 Implement search API endpoint `GET /businesses/search`
    - Execute combined FTS + PostGIS `ST_DWithin` query as specified in design §6.2
    - Enforce radius cap: 10 km free / 50 km Plus via `enforceRadius()` helper
    - Support query params: `q`, `lat`, `lng`, `radius`, `category_id`, `sort`, `open_now`, `min_rating`, `page`, `limit`
    - Return `{ data: Business[], meta: { page, total, radius_km } }`
    - Record search query in `search_history` table for authenticated users
    - _Requirements: 3.1, 3.2, 3.3, 3.7, 3.8, 3.11_
  - [x] 8.2 Write property test for search radius enforcement
    - **Property 1: Search Radius Enforcement**
    - **Validates: Requirements 3.11, 16.1**
    - Use `fast-check` to generate arbitrary `(lat, lng, radius, userTier)` inputs; assert every result's `distance_km ≤ meta.radius_km` and `meta.radius_km ≤ max_for_tier`
  - [x] 8.3 Implement search results list view at `apps/web/app/(customer)/search/page.tsx`
    - `SearchBar` component with debounced input (300 ms) wired to `searchStore.setQuery`
    - Filter chips: Open Now, Top Rated, Price Range, Distance, Category
    - Sort selector: Relevance, Distance, Rating, Recently Added
    - Infinite scroll using Intersection Observer — load next page on scroll to bottom
    - "No results" empty state with suggestions to broaden radius
    - _Requirements: 3.2, 3.3, 3.4, 3.6, 3.9_
  - [x] 8.4 Implement `BusinessCard` component
    - `apps/web/components/listings/BusinessCard.tsx`
    - Display: primary photo (Next.js `<Image>`), name, category, rating stars, distance, open/closed badge
    - Skeleton loading state
    - _Requirements: 3.4_
  - [x] 8.5 Implement map view toggle with Google Maps
    - `apps/web/components/maps/MapView.tsx` — Google Maps canvas with marker clustering (`@googlemaps/markerclusterer`)
    - Bottom sheet preview card for selected marker showing name, rating, distance, and "View" CTA
    - Inline mini-map above list results showing rating-labeled pins
    - Lazy-load with `next/dynamic` (SSR disabled)
    - _Requirements: 3.5, 3.10_

- [x] 9. Single listing detail page
  - [x] 9.1 Implement listing detail API endpoint `GET /businesses/:id`
    - Return full business record with joined `business_photos`, `business_hours`, `business_services`, `categories`
    - Return HTTP 404 for non-active businesses when requested by non-owner/non-admin
    - _Requirements: 4.1, 4.2, 4.5_
  - [x] 9.2 Implement lead recording API endpoint `POST /businesses/:id/leads`
    - Insert lead row with `business_id`, `type`, `user_id` (nullable for anonymous)
    - Reject with 404 if business is not active
    - _Requirements: 4.4, 14.4_
  - [x] 9.3 Write property test for lead recording
    - **Property 4: Lead Recording**
    - **Validates: Requirements 4.4**
    - For each lead type, assert that a successful POST increases `count(leads)` by exactly 1 with correct `business_id` and `type`
  - [x] 9.4 Implement listing detail page at `apps/web/app/(customer)/listing/[id]/page.tsx`
    - Full-screen swipeable `PhotoGallery` component (lazy-loaded)
    - Name, category, verified badge, rating, review count, open/closed status derived from `business_hours`
    - Action bar: Call (`tel:` link), Directions (Google Maps URL), Save, Website — each fires `POST /businesses/:id/leads`
    - About section with "Show more" expand/collapse
    - Hours of operation for all 7 days
    - Distance, avg cost, amenities chips
    - WhatsApp button (`https://wa.me/{number}`)
    - Share button (Web Share API with clipboard fallback)
    - "Report this listing" option
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.9, 4.11, 4.12_
  - [x] 9.5 Implement Save button with Plus gate
    - Call `POST /user/saved` on tap; on 403 `SAVE_LIMIT_REACHED` show `PlusUpgradeBanner`
    - Update saved state optimistically in UI
    - _Requirements: 4.8, 16.1, 16.4_
  - [x] 9.6 Implement reviews section on listing detail
    - Fetch 5 most recent reviews via `GET /businesses/:id/reviews?limit=5`
    - Display reviewer name, rating, text, date
    - "View all reviews" link to full reviews page
    - _Requirements: 4.7_
  - [x] 9.7 Implement Book Table / Book Appointment CTA
    - Show CTA only when listing has booking capability enabled
    - Navigate to booking flow at `/account/bookings/new?business_id=:id`
    - _Requirements: 4.10_

- [x] 10. Saved places and collections
  - [x] 10.1 Implement saved places and collections API endpoints
    - `GET /user/saved` — return saved places with joined business data, support sort params
    - `POST /user/saved` — insert saved_place; enforce 10-item free-tier limit (return 403 `SAVE_LIMIT_REACHED`)
    - `DELETE /user/saved/:id` — remove saved place
    - `GET /user/collections` — return user's collections with item counts
    - `POST /user/collections` — create collection; enforce 2-collection free-tier limit (return 403 `COLLECTION_LIMIT_REACHED`)
    - `PUT /user/collections/:id` — rename collection
    - `DELETE /user/collections/:id` — delete collection, reassign saved_places to default collection
    - _Requirements: 5.1, 5.5, 5.6, 5.7, 5.8_
  - [x] 10.2 Write property test for save limit enforcement
    - **Property 2: Save Limit Enforcement**
    - **Validates: Requirements 5.1, 16.1**
    - Assert free-tier user never exceeds 10 saved places; 11th POST returns HTTP 403 `SAVE_LIMIT_REACHED`
  - [x] 10.3 Write property test for collection limit enforcement
    - **Property 3: Collection Limit Enforcement**
    - **Validates: Requirements 5.9, 16.1**
    - Assert free-tier user never exceeds 2 collections; 3rd POST returns HTTP 403 `COLLECTION_LIMIT_REACHED`
  - [x] 10.4 Implement saved places page at `apps/web/app/(customer)/saved/page.tsx`
    - Filter tabs: All + each category present in saved set
    - Sort selector: Recently Added, Nearest, Rating
    - Collections grid showing name, icon, item count
    - "Create collection" button with Plus gate for 3rd+ collection
    - _Requirements: 5.2, 5.3, 5.4, 5.9_
  - [x] 10.5 Implement collection detail page at `apps/web/app/(customer)/saved/[collectionId]/page.tsx`
    - List saved places within the collection
    - "Move to collection" action per item (updates `collection_id`)
    - Rename and delete collection actions
    - _Requirements: 5.6, 5.7, 5.8_
  - [x] 10.6 Implement duplicate save detection
    - On `POST /user/saved` when `(user_id, business_id)` already exists, return 409 with prompt to move to different collection
    - _Requirements: 5.10_

- [x] 11. User account dashboard
  - [x] 11.1 Implement user profile API endpoints
    - `GET /user/profile` — return user row
    - `PUT /user/profile` — validate with Zod, update `users` table (name, avatar_url, email)
    - _Requirements: 6.9_
  - [x] 11.2 Implement account dashboard page at `apps/web/app/(customer)/account/page.tsx`
    - Profile header: avatar, name, phone, email, verified badge
    - Four stat counters: Saved Places, Recent Searches (last 30 days), Reviews Written, Active Offers
    - "My Activity" links: Search History, Recently Viewed, Bookings, Messages
    - Collections grid (max 4 visible, "View all" link)
    - Account & Support links: Edit Profile, Notifications Settings, Help & Support, Invite Friends
    - GetNear Plus upsell banner for free-tier users
    - Sign Out button
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.7_
  - [x] 11.3 Implement sign out and invite friends actions
    - Sign Out: call `POST /auth/logout`, clear `authStore`, redirect to `/login`
    - Invite Friends: generate referral link, invoke Web Share API
    - _Requirements: 6.6, 6.8_
  - [x] 11.4 Implement edit profile page at `apps/web/app/(customer)/account/edit/page.tsx`
    - Form with name, email, avatar upload (to `avatars/` Supabase Storage bucket)
    - Validate with Zod, call `PUT /user/profile`, show success toast
    - _Requirements: 6.9_

- [x] 12. Checkpoint — Phase 2 complete
  - Ensure search returns results within 2 seconds for local Supabase queries
  - Ensure listing detail page renders correctly with all sections
  - Ensure save/collection limits are enforced correctly
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 3 — Customer Secondary

- [x] 13. Bookings flow — customer side
  - [x] 13.1 Implement bookings API endpoints (customer)
    - `GET /user/bookings` — return bookings split into Upcoming and Past sections
    - `POST /user/bookings` — validate with Zod (date, time, party_size, notes), insert with `status = pending`, send notification to customer and business owner
    - `PATCH /user/bookings/:id/cancel` — enforce 2-hour cancellation window, update status to `cancelled`, notify business owner
    - _Requirements: 12.1, 12.2, 12.3, 12.6, 12.7_
  - [x] 13.2 Write property test for booking status transitions
    - **Property 6: Booking Status Transitions**
    - **Validates: Requirements 12.4, 12.5, 12.7**
    - Use `fast-check` to generate arbitrary `(currentStatus, targetStatus)` pairs; assert allowed transitions succeed and forbidden transitions return HTTP 400
  - [x] 13.3 Implement booking form and list UI
    - `apps/web/app/(customer)/account/bookings/page.tsx` — Upcoming / Past tabs with booking cards showing status badge
    - Booking form modal: date calendar picker, time slot selector, party size input, notes textarea
    - Cancel button with confirmation dialog (disabled if < 2 hours before booking time)
    - _Requirements: 12.1, 12.6, 12.7_

- [x] 14. Messaging — real-time chat
  - [x] 14.1 Implement messaging API endpoints
    - `GET /user/messages` — return thread list using canonical pair query (design §8.2)
    - `POST /user/messages` — insert message row, deliver via Supabase Realtime
    - `PATCH /user/messages/thread/:threadId/read` — mark all unread messages in thread as `is_read = true`
    - _Requirements: 13.1, 13.2, 13.3_
  - [x] 14.2 Implement Supabase Realtime subscription for messages
    - `apps/web/components/chat/ChatThread.tsx` — subscribe to `messages:thread:{threadId}` channel on mount, unsubscribe on unmount
    - On INSERT event, call `chatStore.addMessage()`
    - Show delivery failure indicator on network error with retry button
    - _Requirements: 13.2, 13.5_
  - [x] 14.3 Implement chat UI
    - `apps/web/app/(customer)/chats/page.tsx` — conversation list ordered by most recent message
    - `apps/web/app/(customer)/chats/[threadId]/page.tsx` — chat thread with chronological messages, sender name, text, timestamp
    - Unread count badge on BottomNav Chats item
    - Typing indicator using Supabase Realtime Presence
    - _Requirements: 13.1, 13.4, 13.6_

- [x] 15. Notifications center
  - [x] 15.1 Implement notifications API endpoints
    - `GET /user/notifications` — return notifications ordered by `created_at DESC`
    - `PATCH /user/notifications/:id/read` — set `is_read = true`
    - `PATCH /user/notifications/read-all` — set all user's notifications to `is_read = true`
    - _Requirements: 14.2, 14.3, 14.5_
  - [x] 15.2 Implement Supabase Realtime subscription for notifications
    - Subscribe to `notifications:{userId}` channel in root layout
    - On INSERT event, call `notificationStore.addNotification()` and increment `unreadCount`
    - _Requirements: 14.1_
  - [x] 15.3 Implement notifications page at `apps/web/app/(customer)/notifications/page.tsx`
    - Notification feed with title, body, type icon, read/unread state
    - "Mark all as read" button
    - Unread count badge on Account BottomNav item
    - _Requirements: 14.2, 14.4, 14.5_
  - [x] 15.4 Implement Web Push notification registration
    - Register service worker and request push notification permission
    - Subscribe to Web Push API and store subscription endpoint on server
    - Deliver push notifications for new messages and booking status changes
    - _Requirements: 14.6_

- [x] 16. Reviews — write and view
  - [x] 16.1 Implement reviews API endpoints
    - `POST /businesses/:id/reviews` — validate rating (1–5) and text (≤ 1000 chars), insert review, trigger `trg_update_business_rating`, return 409 `REVIEW_EXISTS` on duplicate
    - `GET /businesses/:id/reviews` — paginated list (20 per page), ordered by `created_at DESC`
    - _Requirements: 15.1, 15.2, 15.3, 15.4_
  - [x] 16.2 Write property test for review uniqueness
    - **Property 5: Review Uniqueness**
    - **Validates: Requirements 15.4**
    - Assert that submitting a second review for the same `(user_id, business_id)` returns HTTP 409 `REVIEW_EXISTS`
  - [x] 16.3 Write property test for rating average consistency
    - **Property 11: Rating Average Consistency**
    - **Validates: Requirements 15.2**
    - After inserting/deleting reviews, assert `businesses.rating_avg = ROUND(AVG(reviews.rating), 2)` and `review_count = COUNT(reviews)` for the business
  - [x] 16.4 Implement write review page at `apps/web/app/(customer)/listing/[id]/review/page.tsx`
    - Star rating input (1–5), text area (max 1000 chars), optional photo upload (up to 3, to `review-photos/` bucket)
    - Submit calls `POST /businesses/:id/reviews`; show error if already reviewed
    - _Requirements: 15.1, 15.6_
  - [x] 16.5 Implement all reviews page at `apps/web/app/(customer)/listing/[id]/reviews/page.tsx`
    - Full paginated review list (20 per page) with reviewer name, rating, text, date, and optional photos
    - _Requirements: 15.3_

- [x] 17. Search history and recently viewed
  - [x] 17.1 Implement search history API endpoints
    - `GET /user/search-history` — return user's search history ordered by `created_at DESC`
    - `DELETE /user/search-history` — clear all search history for the user
    - _Requirements: 3.8_
  - [x] 17.2 Implement search history page at `apps/web/app/(customer)/account/history/page.tsx`
    - List of past searches with query text, location, and timestamp
    - Tap to re-execute search (navigate to `/search?q=...`)
    - "Clear history" button
    - _Requirements: 3.8_

- [x] 18. Checkpoint — Phase 3 complete
  - Ensure real-time messaging delivers messages within 2 seconds in local testing
  - Ensure booking status transitions are correctly enforced
  - Ensure review uniqueness constraint is enforced at both DB and API layers
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 4 — Business Owner

- [x] 19. Add Business multi-step form
  - [x] 19.1 Implement create business API endpoint `POST /businesses`
    - Validate full business payload with Zod schema from `packages/validation`
    - Insert `businesses` record with `status = pending`
    - Insert related `business_hours`, `business_services`, `business_photos` records
    - Send confirmation notification to business owner
    - _Requirements: 7.3, 7.4, 7.6, 7.7, 7.8, 7.9, 7.12_
  - [x] 19.2 Implement Step 1 — Business Info
    - `apps/web/app/(business)/add-business/page.tsx` — multi-step form shell with step progress indicator
    - Step 1 fields: Name (max 100 chars), Category (dropdown from `categories` table), Business Type (Physical / Service / Online), Description
    - Zod validation before advancing to Step 2
    - _Requirements: 7.1, 7.2, 7.3_
  - [x] 19.3 Implement Step 2 — Contact & Location
    - Fields: Phone, Email, Website, WhatsApp, Address (text + Google Maps Autocomplete), Map pin drag to adjust coordinates
    - Validate at least one contact method and resolvable coordinates before advancing
    - _Requirements: 7.4, 7.5_
  - [x] 19.4 Implement Step 3 — Business Details
    - Fields: Hours of operation (7-day grid with open/close time pickers and "Closed" toggle), Amenities checkboxes, Price range selector, Services list (add/remove rows)
    - Validate at least one day of hours configured before advancing
    - _Requirements: 7.6_
  - [x] 19.5 Implement Step 4 — Photos & More
    - Multi-file upload with client-side WebP compression (`browser-image-compression`)
    - Upload to `business-photos/` Supabase Storage bucket, store URLs in form state
    - Primary photo selection (radio button per photo)
    - Enforce max 10 photos
    - Optional menu items input
    - _Requirements: 7.7, 7.8_
  - [x] 19.6 Implement Step 5 — Review & Submit
    - Summary view of all entered data
    - T&C agreement checkbox
    - Submit calls `POST /businesses`, shows success screen with "pending review" message
    - _Requirements: 7.9_
  - [x] 19.7 Implement Save Draft and resume functionality
    - "Save Draft" button at each step persists form state to `localStorage`
    - On return to `/add-business`, detect draft and offer to resume from saved step
    - If unauthenticated, prompt login and restore draft after auth
    - _Requirements: 7.10, 7.11_

- [x] 20. Business dashboard — stats, analytics, leads, reviews
  - [x] 20.1 Implement business dashboard API endpoints
    - `GET /dashboard/stats` — return Views, Calls, Direction Requests, Saves for last 7 days with % change vs prior 7 days
    - `GET /dashboard/analytics?period=7d|30d|90d` — return time-series views data and lead type distribution; enforce 7-day limit for free tier
    - `GET /dashboard/leads` — return 10 most recent leads with type, timestamp, anonymized customer ID
    - `GET /dashboard/reviews` — return 5 most recent reviews with reply action
    - `POST /dashboard/reviews/:id/reply` — store reply text and timestamp, send notification to reviewer
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.9_
  - [x] 20.2 Implement business dashboard overview page at `apps/web/app/(business)/dashboard/page.tsx`
    - Four KPI `StatsCard` components with trend indicators
    - Line chart of daily views (`AnalyticsChart` using Recharts, lazy-loaded)
    - Donut chart of lead type distribution
    - Recent Leads feed with lead type tags
    - Recent Reviews with inline reply form
    - Sidebar navigation with all links from design §5.8
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.10_
  - [x] 20.3 Implement analytics detail page at `apps/web/app/(business)/dashboard/analytics/page.tsx`
    - Time period selector (7d / 30d / 90d) — 90d gated behind Plus
    - Expanded line chart and lead breakdown table
    - _Requirements: 8.2, 8.3, 8.9_
  - [x] 20.4 Implement leads management page at `apps/web/app/(business)/dashboard/leads/page.tsx`
    - Full leads feed with type filter, date range filter
    - Lead cards showing type icon, timestamp, anonymized customer
    - _Requirements: 8.4_

- [x] 21. Offers management
  - [x] 21.1 Implement offers API endpoints
    - `GET /dashboard/offers` — return all offers for the business owner's listing
    - `POST /dashboard/offers` — create offer (title, description, valid_until, is_active)
    - `PUT /dashboard/offers/:id` — update offer; toggle `is_active` within 1 second
    - `DELETE /dashboard/offers/:id` — delete offer
    - _Requirements: 8.7, 8.8_
  - [x] 21.2 Implement offers management page at `apps/web/app/(business)/dashboard/offers/page.tsx`
    - Active / expired offers list with title, validity date, active toggle
    - "Create offer" form (title, description, valid_until date picker)
    - _Requirements: 8.7, 8.8_

- [x] 22. Business reviews management and messaging
  - [x] 22.1 Implement reviews management page at `apps/web/app/(business)/dashboard/reviews/page.tsx`
    - Full reviews list with reply form per review
    - Submit reply calls `POST /dashboard/reviews/:id/reply`
    - _Requirements: 8.5, 8.6_
  - [x] 22.2 Implement business messages page at `apps/web/app/(business)/dashboard/messages/page.tsx`
    - Reuse `ChatThread` component with business-side Supabase Realtime subscription
    - Thread list showing customer conversations
    - _Requirements: 13.1, 13.2_

- [x] 23. Business bookings management and edit listing
  - [x] 23.1 Implement business bookings API endpoints
    - `GET /dashboard/bookings` — return bookings for the business owner's listing
    - `PATCH /dashboard/bookings/:id/status` — update booking status; enforce allowed transitions from design §14.6
    - Send notification to customer on status change
    - _Requirements: 12.3, 12.4, 12.5_
  - [x] 23.2 Implement business bookings management page at `apps/web/app/(business)/dashboard/bookings/page.tsx`
    - Bookings list with status filter (pending, confirmed, completed, cancelled)
    - Confirm / Decline / Complete / No-show action buttons per booking
    - _Requirements: 12.3, 12.4, 12.5_
  - [x] 23.3 Implement edit listing page at `apps/web/app/(business)/dashboard/listing/page.tsx`
    - Pre-fill multi-step form with existing business data from `GET /businesses/:id`
    - Submit calls `PUT /businesses/:id`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

- [x] 24. Checkpoint — Phase 4 complete
  - Ensure Add Business form saves draft correctly and resumes after login
  - Ensure dashboard stats and analytics render with correct data
  - Ensure booking status transitions are enforced on the business side
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 5 — Admin Panel

- [x] 25. Admin app scaffold and authentication
  - [x] 25.1 Initialize `apps/admin` Next.js 14 App Router project
    - Configure Tailwind, shadcn/ui, Axios client, Zustand auth store
    - Admin login page at `apps/admin/app/login/page.tsx` — email + password via Supabase Auth
    - Next.js middleware protecting all `/(admin)/*` routes — redirect to `/login` if not `role = 'admin'`
    - _Requirements: 9.1, 10.1_
  - [x] 25.2 Implement admin sidebar layout at `apps/admin/app/(admin)/layout.tsx`
    - Sidebar with links: Dashboard, Approvals, Businesses, Users, Reports, Categories, Analytics, Notifications, Logs, Settings
    - Topbar with admin user name and sign-out button
    - _Requirements: 11.1_

- [x] 26. Admin dashboard and business approvals
  - [x] 26.1 Implement admin dashboard stats API endpoint `GET /admin/dashboard/stats`
    - Return: Total Active Businesses, Total Registered Users, Searches Today, New Listings Pending Approval
    - _Requirements: 11.1_
  - [x] 26.2 Implement admin dashboard page at `apps/admin/app/(admin)/dashboard/page.tsx`
    - KPI cards: Total Active Businesses, Total Users, Searches Today, Pending Approvals
    - Alerts section: Pending Approvals count, Open Reports count
    - Recent signups and recent listings tables
    - _Requirements: 11.1_
  - [x] 26.3 Implement business approvals API endpoints
    - `GET /admin/businesses?status=pending` — return pending queue ordered by `created_at ASC`
    - `PUT /admin/businesses/:id/approve` — set `status = active`, send approval notification, log to `admin_logs`
    - `PUT /admin/businesses/:id/reject` — require reason, set `status = rejected`, send rejection notification with reason, log to `admin_logs`
    - Support bulk approve/reject via array of IDs in request body
    - Filter by category, city, date range
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.6, 9.7, 9.11_
  - [x] 26.4 Write property test for admin log completeness
    - **Property 7: Admin Log Completeness**
    - **Validates: Requirements 9.11**
    - Assert that every approve/reject/suspend/delete action produces exactly one `admin_logs` row with correct fields, and that the mutation and log insert are atomic (both succeed or both fail)
  - [x] 26.5 Implement business approvals page at `apps/admin/app/(admin)/approvals/page.tsx`
    - Queue of pending submissions with preview card (name, category, address, photos, owner info)
    - Approve, Reject (with reason modal), Request More Info actions
    - Bulk select and bulk approve/reject
    - Filter controls: category, city, date range
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

- [x] 27. Admin businesses and users management
  - [x] 27.1 Implement admin businesses API endpoints
    - `GET /admin/businesses` — filterable, searchable table of all businesses
    - `PUT /admin/businesses/:id/suspend` — set `status = suspended`, send notification, log action
    - `PUT /admin/businesses/:id/verify` — toggle `verified` badge, log action
    - `DELETE /admin/businesses/:id` — delete business, log action
    - _Requirements: 9.10, 9.11_
  - [x] 27.2 Implement all businesses page at `apps/admin/app/(admin)/businesses/page.tsx`
    - Searchable, filterable table: Name, Category, City, Status, Rating, Verified, Owner, Created
    - Row actions: View, Edit, Suspend, Delete, Verify badge toggle
    - CSV export button
    - Business detail page at `apps/admin/app/(admin)/businesses/[id]/page.tsx`
    - _Requirements: 9.10_
  - [x] 27.3 Implement admin users API endpoints
    - `GET /admin/users` — filterable by role, searchable by name/phone/email
    - `PUT /admin/users/:id/suspend` — update `is_active = false`, invalidate JWT sessions, log action
    - `PUT /admin/users/:id/role` — update `role` field, log action
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  - [x] 27.4 Implement users management page at `apps/admin/app/(admin)/users/page.tsx`
    - Table: Name, Phone, Email, Role, Joined, Status
    - Filter by role, search by name/phone/email
    - Row actions: View profile, Suspend, Change role
    - User detail page at `apps/admin/app/(admin)/users/[id]/page.tsx`
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 28. Admin reports, categories, and notifications
  - [x] 28.1 Implement reports API endpoints
    - `GET /admin/reports` — return open reports queue with reporter info, business, reason, timestamp
    - `PUT /admin/reports/:id/resolve` — require action selection (Dismiss, Warn, Suspend, Remove), record in `admin_logs`, update report status
    - _Requirements: 9.8, 9.9_
  - [x] 28.2 Implement reports page at `apps/admin/app/(admin)/reports/page.tsx`
    - Reports queue with reporter info, reported listing, reason, timestamp
    - Action buttons: Dismiss, Warn Business, Suspend Listing, Remove Listing
    - _Requirements: 9.8, 9.9_
  - [x] 28.3 Implement categories API endpoints
    - `GET /admin/categories` — return all categories with hierarchy
    - `POST /admin/categories` — create category with name, icon, color, display_order, parent_id
    - `PUT /admin/categories/:id` — update category fields
    - `DELETE /admin/categories/:id` — prevent deletion if associated listings exist (return error with count)
    - _Requirements: 10.5, 10.6, 10.7, 10.8, 10.9_
  - [x] 28.4 Implement categories management page at `apps/admin/app/(admin)/categories/page.tsx`
    - List of categories with name, icon, color, display order, parent, enabled status
    - Add / edit / delete actions with inline forms
    - Enable/disable toggle (hides from customer-facing UI)
    - _Requirements: 10.5, 10.6, 10.7, 10.8, 10.9_
  - [x] 28.5 Implement broadcast notifications API endpoint `POST /admin/notifications/broadcast`
    - Accept title, body, target (all/customers/businesses/city/individual), optional `schedule_at`
    - Insert Notification records for all matching users
    - Queue scheduled broadcasts and deliver within 1-minute tolerance
    - _Requirements: 11.5, 11.6, 11.7_
  - [x] 28.6 Implement broadcast notifications page at `apps/admin/app/(admin)/notifications/page.tsx`
    - Compose form: title (max 100 chars), body (max 500 chars), target audience selector, optional schedule time
    - Send / Schedule button
    - _Requirements: 11.5, 11.6, 11.7_

- [x] 29. Admin analytics and activity log
  - [x] 29.1 Implement admin analytics API endpoints
    - `GET /admin/analytics` — return platform-wide charts data: DAU (30d), Daily Searches (30d), New Businesses (30d), Reviews (30d), Top Searched Categories (10), Top Cities (10)
    - _Requirements: 11.2, 11.3, 11.4_
  - [x] 29.2 Implement admin analytics page at `apps/admin/app/(admin)/analytics/page.tsx`
    - Platform-wide charts using Recharts (lazy-loaded)
    - Top Searched Categories ranking table
    - Top Cities by Activity ranking table
    - _Requirements: 11.2, 11.3, 11.4_
  - [x] 29.3 Implement admin activity log page at `apps/admin/app/(admin)/logs/page.tsx`
    - Table of `admin_logs` records: admin name, action, target, note, timestamp
    - Filter by admin, action type, date range
    - _Requirements: 11.8_

- [x] 30. Checkpoint — Phase 5 complete
  - Ensure admin approval/rejection flow sends correct notifications to business owners
  - Ensure admin_logs records are created atomically with every mutation
  - Ensure category deletion is blocked when listings exist
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 6 — Polish & Launch

- [x] 31. PWA configuration and service worker
  - [x] 31.1 Implement Web App Manifest and PWA metadata
    - `apps/web/public/manifest.json` — name, short_name, icons (192×192 and 512×512 px), theme_color, background_color, `display: standalone`
    - Add `<link rel="manifest">` and theme-color meta tag in root layout
    - _Requirements: 18.1_
  - [x] 31.2 Implement service worker with Workbox caching strategies
    - `apps/web/public/sw.js` — Cache First for images (max 200 entries), Network First for API calls (3s timeout), offline fallback to `/offline.html`
    - Cache application shell and most recently viewed 20 listings
    - Show "Offline — data may be outdated" indicator when serving cached listing data
    - _Requirements: 18.2, 18.3_

- [x] 32. SEO and Open Graph
  - [x] 32.1 Implement Open Graph meta tags on listing detail pages
    - Add `og:title`, `og:description`, `og:image`, `og:url` to `apps/web/app/(customer)/listing/[id]/page.tsx` using Next.js `generateMetadata`
    - _Requirements: 18.5_
  - [x] 32.2 Generate sitemap.xml for all active listings
    - `apps/web/app/sitemap.ts` — query all active businesses and generate sitemap entries
    - Add `robots.txt` allowing search engine indexing
    - _Requirements: 18.6_

- [x] 33. Performance optimization
  - [x] 33.1 Implement ISR and rendering strategy per route
    - Home page: ISR with 60s revalidation
    - Listing detail: ISR with 300s revalidation + on-demand revalidation on business update/approval
    - Search results: SSR (no cache)
    - User/Business dashboards: CSR
    - Admin pages: SSR
    - _Requirements: 17.1_
  - [x] 33.2 Implement image optimization and lazy loading
    - Ensure all `<img>` tags use Next.js `<Image>` component with `placeholder="blur"` and responsive `srcset`
    - Configure `next.config.ts` with Supabase Storage remote patterns
    - Verify WebP conversion and lazy loading are active
    - _Requirements: 17.3_
  - [x] 33.3 Implement bundle splitting for heavy components
    - Wrap `MapView`, `PhotoGallery`, and `AnalyticsChart` with `next/dynamic` (SSR disabled where applicable)
    - Add skeleton loading states for each lazy-loaded component
    - _Requirements: 17.1_
  - [x] 33.4 Configure Cloudflare CDN cache headers
    - Set `Cache-Control: public, max-age=31536000, immutable` for versioned static assets
    - Set `Cache-Control: public, s-maxage=300, stale-while-revalidate=60` for business detail API responses
    - _Requirements: 17.4_

- [x] 34. Accessibility audit and fixes
  - [x] 34.1 Audit and fix WCAG 2.1 AA compliance
    - Verify minimum 4.5:1 color contrast ratio for all normal text using automated tooling (axe-core)
    - Ensure all interactive elements are keyboard-navigable (Tab, Enter, Space, Escape)
    - Add ARIA labels to all icon-only buttons (BottomNav items, action bar buttons, close buttons)
    - Add `role` and `aria-*` attributes to custom components (BottomSheet, PhotoGallery, RatingStars)
    - _Requirements: 18.4_

- [x] 35. Error handling, Sentry integration, and rate limiting
  - [x] 35.1 Implement Sentry in all three apps
    - `apps/web/instrumentation.ts`, `apps/admin/instrumentation.ts`, `api/src/index.ts` — initialize Sentry with DSN from environment
    - Set user context after login: `Sentry.setUser({ id, email })`
    - Add API breadcrumbs for all outbound requests
    - _Requirements: 17.5, 17.6_
  - [x] 35.2 Implement frontend error boundaries
    - Add `error.tsx` files in each route segment for Next.js App Router error boundaries
    - `apps/web/components/shared/ErrorBoundary.tsx` — class component with `componentDidCatch` → Sentry capture
    - Show `GenericErrorScreen` fallback without exposing error details
    - _Requirements: 17.5_
  - [x] 35.3 Verify rate limiting is active on all sensitive endpoints
    - Confirm `otpLimiter` (3 per 10 min per IP) on `POST /auth/send-otp`
    - Confirm `searchLimiter` (60 per min per IP) on `GET /businesses/search`
    - Confirm `apiLimiter` (200 per min per IP) on all other routes
    - _Requirements: 17.6_

- [x] 36. GetNear Plus subscription enforcement and upsell UI
  - [x] 36.1 Implement `PlusGate` component and upsell screens
    - `apps/web/components/shared/PlusGate.tsx` — wraps Plus-only features, shows `PlusUpgradeBanner` for free-tier users
    - Upsell screen with pricing and feature comparison table
    - _Requirements: 16.4, 16.5_
  - [x] 36.2 Implement subscription expiry notifications
    - Scheduled job (Supabase Edge Function or cron) to send expiry reminder 7 days before and on expiry date
    - Downgrade user to free tier on expiry (clear `plus_expires_at` or leave expired)
    - _Requirements: 16.6_

- [x] 37. End-to-end tests with Playwright
  - [x] 37.1 Write E2E test: Customer authentication flow
    - Test OTP login flow: enter phone → receive OTP → verify → land on home page
    - Test Google OAuth flow (mocked)
    - _Requirements: 1.1, 1.2, 1.7_
  - [x] 37.2 Write E2E test: Search and listing detail flow
    - Test: search for a business → view results → open listing detail → tap Call/Directions/Save
    - Verify lead records are created
    - _Requirements: 3.1, 4.3, 4.4_
  - [x] 37.3 Write E2E test: Add Business submission flow
    - Test: complete all 5 steps → submit → verify business appears in admin approvals queue
    - _Requirements: 7.1, 7.9_
  - [x] 37.4 Write E2E test: Admin approval flow
    - Test: admin approves pending business → business becomes active → appears in search results
    - _Requirements: 9.3_
  - [x] 37.5 Write E2E test: Booking flow
    - Test: customer creates booking → business owner confirms → customer sees confirmed status
    - _Requirements: 12.2, 12.4_

- [x] 38. Production deployment
  - [x] 38.1 Configure Vercel deployments for `apps/web` and `apps/admin`
    - Set environment variables: Supabase URL/keys, Google Maps API key, Sentry DSN, Twilio credentials, Resend API key
    - Configure custom domains: `getnear.in` and `admin.getnear.in`
    - _Requirements: 17.4_
  - [x] 38.2 Configure Railway deployment for Express API
    - Set environment variables, configure health check endpoint `GET /health`
    - Set up Supabase connection pooling (PgBouncer)
    - _Requirements: 17.2_

- [x] 39. Final checkpoint — Launch ready
  - Ensure LCP < 2.5s on simulated 4G (Lighthouse audit)
  - Ensure all Playwright E2E tests pass
  - Ensure Sentry is receiving events from all three apps
  - Ensure PWA installs correctly on Android Chrome and iOS Safari
  - Ensure all tests pass, ask the user if questions arise.


---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP delivery
- Each task references specific requirements from `requirements.md` for full traceability
- Property-based tests use `fast-check` and validate the correctness properties defined in `design.md §14`
- Checkpoints at the end of each phase ensure incremental validation before proceeding
- All code is TypeScript; shared types and Zod schemas live in `packages/` to avoid duplication
- The monorepo uses Turborepo — run `turbo run build` to build all apps and packages in dependency order
- Supabase migrations must be applied in numeric order; run `supabase db push` against the local instance during development

---

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1.1", "2.1"]
    },
    {
      "id": 1,
      "tasks": ["1.2", "1.3", "1.5", "2.2", "2.3", "2.4"]
    },
    {
      "id": 2,
      "tasks": ["1.4", "2.5", "3.1", "4.1"]
    },
    {
      "id": 3,
      "tasks": ["3.2", "3.3", "4.2", "4.3"]
    },
    {
      "id": 4,
      "tasks": ["4.4", "4.5", "5.1"]
    },
    {
      "id": 5,
      "tasks": ["5.2", "5.3", "5.4"]
    },
    {
      "id": 6,
      "tasks": ["7.1", "8.1", "9.1", "9.2", "10.1", "11.1"]
    },
    {
      "id": 7,
      "tasks": ["7.2", "7.3", "8.2", "8.3", "8.4", "9.3", "10.2", "10.3", "11.2"]
    },
    {
      "id": 8,
      "tasks": ["7.4", "8.5", "9.4", "9.5", "9.6", "9.7", "10.4", "10.5", "10.6", "11.3", "11.4"]
    },
    {
      "id": 9,
      "tasks": ["13.1", "14.1", "15.1", "16.1", "17.1"]
    },
    {
      "id": 10,
      "tasks": ["13.2", "13.3", "14.2", "14.3", "15.2", "15.3", "15.4", "16.2", "16.3", "16.4", "16.5", "17.2"]
    },
    {
      "id": 11,
      "tasks": ["19.1", "20.1", "21.1", "22.1", "23.1"]
    },
    {
      "id": 12,
      "tasks": ["19.2", "20.2", "21.2", "22.2", "23.2"]
    },
    {
      "id": 13,
      "tasks": ["19.3", "19.4", "19.5", "19.6", "19.7", "20.3", "20.4", "23.3"]
    },
    {
      "id": 14,
      "tasks": ["25.1", "26.1", "27.1", "27.3", "28.1", "28.3", "28.5", "29.1"]
    },
    {
      "id": 15,
      "tasks": ["25.2", "26.2", "26.3", "27.2", "27.4", "28.2", "28.4", "28.6", "29.2", "29.3"]
    },
    {
      "id": 16,
      "tasks": ["26.4"]
    },
    {
      "id": 17,
      "tasks": ["31.1", "32.1", "32.2", "33.1", "33.2", "33.3", "33.4", "34.1", "35.1", "35.2", "35.3", "36.1"]
    },
    {
      "id": 18,
      "tasks": ["31.2", "36.2", "37.1", "37.2", "37.3", "37.4", "37.5"]
    },
    {
      "id": 19,
      "tasks": ["38.1", "38.2"]
    }
  ]
}
```
