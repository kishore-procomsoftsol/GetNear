# Implementation Plan: Map, Gallery & Badges UI Enhancements

## Overview

This plan implements three independent UI features in order of complexity: (1) the "Closes Soon" badge on BusinessCard, (2) the swipeable photo gallery on the listing detail page, and (3) the full-screen map view page. Each task builds incrementally and integrates with existing components and stores.

## Tasks

- [x] 1. Implement "Closes Soon" badge on BusinessCard
  - [x] 1.1 Create `getClosesSoonStatus` utility function
    - Add a `getClosesSoonStatus` function in `apps/web/components/listings/BusinessCard.tsx` (alongside existing `getOpenStatus` helper)
    - Function accepts `business_hours` array (same type as existing `getOpenStatus`)
    - Returns `true` when business is currently open AND closes within 60 minutes
    - Returns `false` for null/undefined/empty hours, closed businesses, or closing time > 60 min away
    - Use the same time comparison pattern as the existing `getOpenStatus` helper
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x]* 1.2 Write property test for `getClosesSoonStatus`
    - **Property 1: Closes Soon threshold correctness**
    - Generate random business_hours arrays with mocked current time
    - Verify returns true iff open AND closes within 60 minutes
    - Test with fast-check in `apps/web/__tests__/closesSoon.property.test.ts`
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

  - [x] 1.3 Integrate badge into BusinessCard component
    - Call `getClosesSoonStatus(business.business_hours)` in the `BusinessCard` component
    - Render an orange badge (`bg-orange-500 text-white`) with text "Closes soon" in the photo overlay area
    - Position it at `absolute bottom-1.5 right-1.5` (opposite side from the existing open/closed badge)
    - Only show when `openStatus === 'open'` AND `closesSoon === true`
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Implement swipeable Photo Gallery component
  - [x] 2.1 Create `PhotoGallery` component
    - Create `apps/web/components/listings/PhotoGallery.tsx`
    - Accept props: `photos` array (id, url, is_primary, display_order), `businessName` string, optional `className`
    - Use framer-motion `motion.div` with `drag="x"` for horizontal swipe
    - Track `photoIndex` state, constrain drag with `dragConstraints`
    - On `onDragEnd`: if offset.x < -50 or velocity.x < -500, go next; if offset.x > 50 or velocity.x > 500, go prev
    - Clamp index to [0, photos.length - 1]
    - Render dot indicators below the image (small circles, active dot is `bg-white`, inactive is `bg-white/50`)
    - If photos array is empty, render gradient placeholder
    - If photos array has exactly 1 photo, render without dots or swipe
    - Use `next/image` with `fill` and `object-cover` for each photo
    - Add ARIA labels: `role="region"`, `aria-label="Photo gallery for {businessName}"`, `aria-roledescription="carousel"`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [x]* 2.2 Write property test for photo gallery index bounds
    - **Property 2: Photo gallery index always stays within bounds**
    - Generate random photoCount, currentIndex, offset.x, velocity.x values
    - Verify handleDragEnd always returns index in [0, photoCount - 1]
    - Test in `apps/web/__tests__/photoGallery.property.test.ts`
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5**

  - [x] 2.3 Integrate PhotoGallery into listing detail page
    - In `apps/web/app/(customer)/listing/[id]/page.tsx`, replace the static `Image` block in the photo section with `<PhotoGallery>`
    - Pass sorted photos array and `business.name`
    - Remove the existing `photoIndex` state and photo counter overlay (gallery handles this internally)
    - Keep the top overlay buttons (back, save, share) positioned above the gallery
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement full-screen Map View page
  - [x] 4.1 Create `deriveMapPins` utility function
    - Create `apps/web/lib/utils/mapUtils.ts`
    - Export `deriveMapPins(businesses: Business[]): MapPin[]`
    - Filter businesses to only those with valid `lat` and `lng` (non-null, finite, in valid ranges)
    - Calculate `walkingTime` as `Math.round(distance_m / 80) + " min"` (default "— min" if no distance)
    - Export `MapPin` interface: `{ id, lat, lng, name, rating, walkingTime }`
    - _Requirements: 3.9, 3.10, 4.2, 4.4_

  - [x]* 4.2 Write property tests for `deriveMapPins`
    - **Property 4: deriveMapPins excludes businesses without valid coordinates**
    - **Property 5: deriveMapPins output is a subset of input**
    - **Property 6: Walking time is monotonically increasing with distance**
    - Generate random business arrays with varying coordinate validity
    - Test in `apps/web/__tests__/mapUtils.property.test.ts`
    - **Validates: Requirements 3.2, 3.9, 3.10, 4.2, 4.4**

  - [x] 4.3 Create `MapPreviewCard` component
    - Create `apps/web/components/maps/MapPreviewCard.tsx`
    - Accept props matching the `MapPreviewCardProps` interface from the design
    - Use framer-motion `AnimatePresence` + `motion.div` for slide-up/slide-down animation
    - Display: primary photo thumbnail, business name, rating stars, category, distance, open/closed status
    - On card tap → call `onTap()` prop
    - On close button or swipe down → call `onClose()` prop
    - Style as a fixed-bottom card with rounded top corners, shadow, white background
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 4.4 Create the Map Page at `/search/map`
    - Create `apps/web/app/(customer)/search/map/page.tsx`
    - Mark as `'use client'`
    - Read `results` from `useSearchStore()` and `lat, lng` from `useLocationStore()`
    - Call `deriveMapPins(results)` to get pin data
    - Render the existing `MapView` component full-screen (`h-dvh w-full`)
    - Pass pins as markers, user location as center, and handle `onMarkerClick`
    - Track `selectedBusinessId` state; when set, find the business and show `MapPreviewCard`
    - On preview card tap → `router.push(/listing/{id})`
    - Add a back button (fixed top-left, white circle with ArrowLeft icon) → `router.back()`
    - If `lat` or `lng` is null, show a centered prompt to enable location
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.3_

  - [x] 4.5 Handle Google Maps load failure
    - In the map page, add error state handling for when the Google Maps script fails to load
    - Show a fallback div with a map icon, error message, and "Retry" button
    - On retry, re-attempt loading the Google Maps script
    - _Requirements: 3.8_

  - [x] 4.6 Update search page navigation to point to `/search/map`
    - In `apps/web/app/(customer)/search/page.tsx`, update the "Map view" button `onClick` to navigate to `/search/map` instead of `/search?view=map`
    - Update both the top-bar Map button and the floating "Map view" button at the bottom
    - Ensure the search store `setViewMode('map')` is called before navigation so results persist
    - _Requirements: 3.1_

- [x] 5. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The project uses TypeScript, Next.js 14 App Router, framer-motion, zustand, and vitest + fast-check for testing
