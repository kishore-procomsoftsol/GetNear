# Requirements Document

## Introduction

This document defines the requirements for three UI enhancement features in the GetNear mobile-first web app: (1) a full-screen map view page with interactive business pins and a bottom preview card, (2) a "Closes Soon" orange badge on the BusinessCard component, and (3) a swipeable photo gallery on the listing detail page. These features improve spatial discovery, time-sensitive awareness, and visual browsing of business listings.

## Glossary

- **Map_Page**: The full-screen map view page at `/search/map` that displays businesses as interactive pins on a Google Map
- **BusinessCard**: The existing horizontal card component used to display business summaries in search results
- **Photo_Gallery**: The swipeable photo gallery component on the listing detail page
- **Preview_Card**: The bottom-sheet-style card that appears on the Map_Page when a pin is selected
- **Search_Store**: The zustand store holding search query, filters, and results
- **Location_Store**: The zustand store holding the user's current latitude, longitude, and radius
- **Pin**: A map marker displaying a business's rating and walking time
- **Walking_Time**: Estimated walking duration calculated from distance at 80m/min

## Requirements

### Requirement 1: Closes Soon Badge

**User Story:** As a customer browsing search results, I want to see which businesses are closing soon, so that I can prioritize visiting them before they close.

#### Acceptance Criteria

1. WHEN a business is currently open AND its closing time is within 60 minutes, THE BusinessCard SHALL display an orange "Closes soon" badge on the photo overlay
2. WHEN a business is currently open AND its closing time is more than 60 minutes away, THE BusinessCard SHALL NOT display the "Closes soon" badge
3. WHEN a business is currently closed, THE BusinessCard SHALL NOT display the "Closes soon" badge
4. IF business_hours data is null, undefined, or empty, THEN THE BusinessCard SHALL NOT display the "Closes soon" badge
5. THE getClosesSoonStatus function SHALL return a boolean value without side effects for any valid hours input

### Requirement 2: Swipeable Photo Gallery

**User Story:** As a customer viewing a business listing, I want to swipe through all business photos, so that I can visually evaluate the business before visiting.

#### Acceptance Criteria

1. WHEN the listing detail page loads with multiple photos, THE Photo_Gallery SHALL display photos in a horizontally swipeable container with dot indicators
2. WHEN a user swipes left with sufficient velocity or offset, THE Photo_Gallery SHALL animate to the next photo and update the dot indicator
3. WHEN a user swipes right with sufficient velocity or offset, THE Photo_Gallery SHALL animate to the previous photo and update the dot indicator
4. WHEN the user is viewing the first photo and swipes right, THE Photo_Gallery SHALL remain on the first photo
5. WHEN the user is viewing the last photo and swipes left, THE Photo_Gallery SHALL remain on the last photo
6. WHEN a business has zero photos, THE Photo_Gallery SHALL display a gradient placeholder
7. WHEN a business has exactly one photo, THE Photo_Gallery SHALL display the photo without dot indicators and without swipe behavior
8. THE Photo_Gallery SHALL provide accessible navigation with ARIA labels for screen readers

### Requirement 3: Full-Screen Map View Page

**User Story:** As a customer searching for nearby businesses, I want to view search results on a full-screen map, so that I can spatially understand which businesses are near me and navigate to them.

#### Acceptance Criteria

1. WHEN a user navigates to `/search/map`, THE Map_Page SHALL render a full-screen Google Map centered on the user's location from the Location_Store
2. WHEN search results are available in the Search_Store, THE Map_Page SHALL display a Pin for each business that has valid latitude and longitude coordinates
3. WHEN a user taps a Pin, THE Map_Page SHALL display a Preview_Card at the bottom of the screen with the business photo, name, rating, distance, and open status
4. WHEN a user taps the Preview_Card, THE Map_Page SHALL navigate to the listing detail page for that business
5. WHEN a user taps the back button, THE Map_Page SHALL navigate back to the search results list
6. WHEN a user swipes down on the Preview_Card or taps its close button, THE Map_Page SHALL dismiss the Preview_Card
7. IF the Location_Store has null latitude or longitude, THEN THE Map_Page SHALL display a message prompting the user to enable location access
8. IF the Google Maps API fails to load, THEN THE Map_Page SHALL display a fallback placeholder with a retry button
9. THE deriveMapPins function SHALL exclude businesses without valid latitude and longitude coordinates
10. THE deriveMapPins function SHALL calculate Walking_Time from distance_m using 80m/min walking speed

### Requirement 4: Map Pin Display

**User Story:** As a customer viewing the map, I want to see ratings and walking times on each pin, so that I can quickly compare businesses without tapping each one.

#### Acceptance Criteria

1. THE Pin SHALL display the business rating (formatted to one decimal place) as a label
2. WHEN a business has a distance_m value, THE Pin SHALL include the calculated Walking_Time
3. WHEN a business has no rating, THE Pin SHALL display without a rating label
4. THE deriveMapPins output SHALL always be a subset of the input businesses array (no fabricated data)

### Requirement 5: Preview Card Interaction

**User Story:** As a customer who tapped a map pin, I want to see a quick summary of the business, so that I can decide whether to view the full listing.

#### Acceptance Criteria

1. WHEN a Pin is selected, THE Preview_Card SHALL animate in from the bottom of the screen using framer-motion
2. THE Preview_Card SHALL display the business primary photo, name, rating, category, distance, and open/closed status
3. WHEN the Preview_Card is dismissed, THE Preview_Card SHALL animate out toward the bottom of the screen
