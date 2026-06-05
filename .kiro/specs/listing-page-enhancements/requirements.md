# Requirements Document

## Introduction

This document defines requirements for fixing and enhancing the business listing detail page and review system in GetNear. The scope covers four areas: rendering the Google Map on the listing page, converting URLs from UUID-based to SEO-friendly slugs, displaying user reviews on the listing page, and adding admin review management capabilities.

## Glossary

- **Listing_Page**: The customer-facing business detail page that displays business information, photos, map, services, hours, and reviews.
- **Map_Component**: The Google Maps JavaScript API wrapper component (MapView) that renders an interactive map with business location markers.
- **Slug**: A URL-friendly, human-readable string derived from the business name and location, stored in the `slug` column of the businesses table.
- **Reviews_API**: The backend endpoint (`GET /businesses/:id/reviews`) that returns paginated reviews for a business.
- **Review_Card**: A UI component displaying an individual review with author name, avatar, rating, date, and text content.
- **Admin_Panel**: The administrative interface used by platform administrators to manage content including businesses, users, and reviews.
- **Review_Moderation**: The process by which administrators view, approve, edit, or delete user-submitted reviews.

## Requirements

### Requirement 1: Google Map Rendering on Listing Page

**User Story:** As a customer viewing a business listing, I want to see an interactive map showing the business location pin, so that I can visually understand where the business is located.

#### Acceptance Criteria

1. WHEN a business has valid lat (between -90 and 90) and lng (between -180 and 180) coordinates, THE Map_Component SHALL render a Google Map centered on the business coordinates with a location marker displaying the business name as the marker title.
2. IF the Google Maps API key environment variable (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) is configured, THEN THE Map_Component SHALL load the Google Maps JavaScript API asynchronously and initialize the map within the listing page.
3. IF the Google Maps API key is missing or the map script fails to load, THEN THE Listing_Page SHALL display a static fallback container with the text "Map not available" in place of the map.
4. WHEN the map is rendered on the Listing_Page, THE Map_Component SHALL display at zoom level 15 with default UI disabled and zoom control enabled.
5. WHEN a business has no lat or lng coordinates (null values), THE Listing_Page SHALL display the static "Map not available" fallback instead of the map.
6. WHEN the Map_Component is rendered on the Listing_Page, THE Map_Component SHALL be lazy-loaded with server-side rendering disabled and display within a container of fixed height (minimum 96px).

### Requirement 2: SEO-Friendly URLs for Business Listings

**User Story:** As a customer, I want business listing URLs to be human-readable and descriptive, so that I can understand the page content from the URL and share meaningful links.

#### Acceptance Criteria

1. THE Listing_Page SHALL use the slug-based URL format `/listing/{slug}` instead of the UUID-based format `/listing/{uuid}`, where a slug is a lowercase string of 3 to 120 characters consisting of alphanumeric characters and hyphens (matching the pattern `[a-z0-9]+(?:-[a-z0-9]+)*`).
2. WHEN a request is made to `/listing/{slug}`, THE Listing_Page SHALL resolve the slug to the corresponding business record and display the listing.
3. IF a slug value does not match any business record, THEN THE Listing_Page SHALL display the "Business not found" error state with a back-navigation option.
4. THE Businesses_API SHALL support looking up a business by slug in addition to UUID on the `GET /businesses/:id` endpoint by treating values matching UUID v4 format as UUIDs and all other values as slugs.
5. WHEN internal links reference a business listing (search results, saved items, review links, category pages), THE system SHALL use the slug-based URL format `/listing/{slug}`.
6. WHEN a request is made to `/listing/{uuid}` (old format matching UUID v4 pattern), THE system SHALL redirect to the corresponding slug-based URL with an HTTP 301 permanent redirect to preserve SEO equity.
7. IF a business record does not have a slug value assigned, THEN THE system SHALL fall back to using the UUID-based URL format `/listing/{uuid}` for that business until a slug is generated.
8. IF a request is made to `/listing/{slug}` and the slug belongs to a business that is not in "active" status, THEN THE Listing_Page SHALL display the "Business not found" error state to non-owner users.

### Requirement 3: Display Reviews on Listing Page

**User Story:** As a customer viewing a business listing, I want to see reviews posted by other customers, so that I can make informed decisions about the business.

#### Acceptance Criteria

1. WHEN the Listing_Page loads, THE Listing_Page SHALL fetch the 3 most recent reviews from the Reviews_API endpoint (`GET /businesses/:id/reviews?limit=3`) sorted by creation date descending.
2. WHEN reviews are returned by the API, THE Listing_Page SHALL display each review as a Review_Card showing the reviewer name, avatar (or a fallback initial if avatar is unavailable), star rating (1–5), relative date (e.g., "2 days ago"), and review text truncated to 150 characters with an ellipsis if longer.
3. WHEN no reviews exist for the business, THE Listing_Page SHALL display a placeholder message indicating that no reviews have been posted yet and inviting users to be the first to leave a review.
4. THE Reviews_API SHALL return reviews with associated user data (name, avatar_url) for display in Review_Cards, paginated with `page` and `limit` query parameters (maximum limit of 50 per request).
5. IF the total review count for the business exceeds 3, THEN THE Listing_Page SHALL show a "View all" link navigating to the full reviews page at `/listing/{id}/reviews`.
6. IF the Reviews_API request fails or times out after 10 seconds, THEN THE Listing_Page SHALL hide the reviews section and not display an error to the user.
7. WHILE the Listing_Page is fetching reviews from the API, THE Listing_Page SHALL display skeleton placeholders in the reviews section matching the dimensions of Review_Cards.

### Requirement 4: Admin Review Management

**User Story:** As an administrator, I want to view, approve, edit, and delete user reviews from the admin panel, so that I can moderate content and maintain platform quality.

#### Acceptance Criteria

1. THE Admin_Panel SHALL provide a paginated list of all reviews with columns for business name, reviewer name, rating, review text, date, and status, displaying 20 reviews per page with a maximum of 50 per page.
2. WHEN an administrator applies filters, THE Admin_Panel SHALL filter the reviews list by business, rating range (1–5), date range, and status (pending, approved, rejected).
3. WHEN an administrator approves a review, THE Admin_Panel SHALL update the review status to "approved", recalculate the associated business rating_avg and review_count to include the newly approved review, and make the review visible on the Listing_Page.
4. WHEN an administrator edits a review, THE Admin_Panel SHALL allow modification of the review text content with a maximum length of 1000 characters, persist the changes, and record the original text in the audit log entry.
5. WHEN an administrator deletes a review, THE Admin_Panel SHALL remove the review from public display, recalculate the associated business rating_avg and review_count to reflect the remaining approved reviews, and record the deletion in the audit log.
6. THE Admin_Panel SHALL log all review moderation actions (approve, edit, delete) in the admin audit log with the administrator ID, action type, target review ID, and timestamp.
7. IF an administrator attempts to approve, edit, or delete a review that does not exist, THEN THE Admin_Panel SHALL display an error message indicating the review was not found and take no moderation action.
8. IF an administrator submits an edit with empty review text or text exceeding 1000 characters, THEN THE Admin_Panel SHALL reject the edit and display a validation error message indicating the text length constraint.
