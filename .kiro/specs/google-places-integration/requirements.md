# Requirements Document

## Introduction

This feature replaces the GetNear app's current Supabase-based business listings with Google Places API as the primary data source. The app will proxy all place discovery, search, and detail requests through the Express API backend to Google Places API, caching results in Supabase for performance. The business dashboard and add-business flows will be removed. Saved places, search history, and user accounts will be retained, referencing Google Place IDs instead of internal business IDs.

## Glossary

- **Places_API_Proxy**: The Express API backend routes that forward requests to Google Places API and return results to the client
- **Places_Cache**: A Supabase table (`places_cache`) that stores previously fetched Google Places results with a time-to-live expiry
- **Nearby_Search**: The Google Places Nearby Search endpoint that returns places within a radius of a given location
- **Text_Search**: The Google Places Text Search endpoint that returns places matching a free-text query and optional location bias
- **Place_Details**: The Google Places Place Details endpoint that returns full information for a single place by its Place ID
- **Place_ID**: A unique string identifier assigned by Google to each place (e.g., `ChIJN1t_tDeuEmsRUsoyG83frY4`)
- **Cache_TTL**: The duration a cached place record remains valid before re-fetching from Google (default: 24 hours)
- **Saved_Places_Store**: The Supabase `saved_places` table, updated to reference Google Place IDs instead of internal business UUIDs
- **Search_History_Store**: The Supabase `search_history` table that records user search queries
- **Client_App**: The Next.js frontend application in `apps/web/`

## Requirements

### Requirement 1: Nearby Places Discovery

**User Story:** As a user, I want to see popular places near my current location on the homepage, so that I can discover businesses without searching.

#### Acceptance Criteria

1. WHEN the Client_App loads the homepage with a valid user location, THE Places_API_Proxy SHALL return up to 10 places from the Nearby_Search endpoint sorted by prominence within the user's radius
2. WHEN the Nearby_Search request includes a location, THE Places_API_Proxy SHALL forward latitude, longitude, and radius parameters to the Google Nearby Search endpoint
3. WHEN a Nearby_Search response is received from Google, THE Places_API_Proxy SHALL return each place with its name, Place_ID, address, rating, total ratings count, photo reference, and business status
4. IF the Google Nearby_Search endpoint returns an error or times out, THEN THE Places_API_Proxy SHALL return an appropriate error response with status code 502 and a descriptive message

### Requirement 2: Text-Based Place Search

**User Story:** As a user, I want to search for places by name or keyword, so that I can find specific businesses or services.

#### Acceptance Criteria

1. WHEN the user submits a search query, THE Places_API_Proxy SHALL forward the query to the Google Text_Search endpoint with the user's location as a bias
2. WHEN a Text_Search response is received from Google, THE Places_API_Proxy SHALL return each place with its name, Place_ID, address, rating, total ratings count, photo reference, business status, and opening hours summary
3. WHEN the user provides optional filters (type, open now), THE Places_API_Proxy SHALL include those parameters in the Text_Search request to Google
4. THE Places_API_Proxy SHALL support pagination by accepting and forwarding a page token parameter for Text_Search results
5. IF the Google Text_Search endpoint returns an error or times out, THEN THE Places_API_Proxy SHALL return an appropriate error response with status code 502 and a descriptive message

### Requirement 3: Place Details Retrieval

**User Story:** As a user, I want to view full details of a place, so that I can see reviews, photos, hours, and contact info before visiting.

#### Acceptance Criteria

1. WHEN a valid Place_ID is provided, THE Places_API_Proxy SHALL return full place details from the Google Place_Details endpoint including name, address, phone number, website, opening hours, rating, total ratings, reviews, and photo references
2. WHEN the Place_Details response includes reviews, THE Places_API_Proxy SHALL return up to 5 reviews with author name, rating, text, and relative time description
3. WHEN the Place_Details response includes photos, THE Places_API_Proxy SHALL return photo references that the Client_App can resolve to image URLs via the Google Places Photo endpoint
4. IF an invalid or non-existent Place_ID is provided, THEN THE Places_API_Proxy SHALL return a 404 error with the message "Place not found"
5. IF the Google Place_Details endpoint returns an error or times out, THEN THE Places_API_Proxy SHALL return an appropriate error response with status code 502 and a descriptive message

### Requirement 4: Places Caching

**User Story:** As a developer, I want to cache Google Places results, so that the app minimizes redundant API calls and reduces costs.

#### Acceptance Criteria

1. WHEN the Places_API_Proxy receives a successful response from any Google Places endpoint, THE Places_Cache SHALL store the response keyed by request type and parameters with a timestamp
2. WHEN a request matches a cached entry where the timestamp is within Cache_TTL (24 hours), THE Places_API_Proxy SHALL return the cached response without calling Google
3. WHEN a cached entry has exceeded Cache_TTL, THE Places_API_Proxy SHALL fetch fresh data from Google and update the cache entry
4. THE Places_Cache SHALL store entries in a `places_cache` table with columns: id, cache_key, place_id, response_data (JSONB), endpoint_type, created_at, and expires_at
5. WHEN the Places_Cache table exceeds 10,000 rows, THE Places_API_Proxy SHALL delete entries that have exceeded their expires_at value during the next cache write operation

### Requirement 5: API Key Security

**User Story:** As a developer, I want to keep the Google Places API key server-side only, so that it cannot be exposed or abused from the client.

#### Acceptance Criteria

1. THE Places_API_Proxy SHALL make all Google Places API calls from the Express backend using a server-side environment variable (GOOGLE_PLACES_API_KEY)
2. THE Client_App SHALL send all place requests to the Express API proxy routes and SHALL NOT call Google Places API directly
3. THE Places_API_Proxy SHALL apply rate limiting to all place-related endpoints to prevent abuse
4. IF a request exceeds the rate limit, THEN THE Places_API_Proxy SHALL return a 429 status code with a "Too Many Requests" message

### Requirement 6: Saved Places Migration

**User Story:** As a user, I want to save Google Places to my account, so that I can quickly access them later.

#### Acceptance Criteria

1. WHEN a user saves a place, THE Saved_Places_Store SHALL store the Place_ID, user ID, optional collection ID, and timestamp
2. WHEN a user views their saved places, THE Places_API_Proxy SHALL resolve each saved Place_ID to current place data via the cache or Google Place_Details endpoint
3. WHEN a user removes a saved place, THE Saved_Places_Store SHALL delete the corresponding record
4. THE Saved_Places_Store SHALL enforce a unique constraint on (user_id, place_id) to prevent duplicate saves
5. IF a user attempts to save a place that already exists in their saves, THEN THE Places_API_Proxy SHALL return a 409 status with "ALREADY_SAVED" error code

### Requirement 7: Search History Retention

**User Story:** As a user, I want my search history preserved, so that I can quickly re-run previous searches.

#### Acceptance Criteria

1. WHEN a user performs a text search while authenticated, THE Search_History_Store SHALL record the query text, latitude, longitude, and timestamp
2. WHEN a user requests their search history, THE Search_History_Store SHALL return entries ordered by timestamp descending, limited to 50 entries
3. WHEN a user clears their search history, THE Search_History_Store SHALL delete all entries for that user
4. THE Search_History_Store SHALL NOT record duplicate consecutive queries (same query text within 60 seconds)

### Requirement 8: Business Dashboard Removal

**User Story:** As a developer, I want to remove the business dashboard and add-business features, so that the app relies solely on Google Places data.

#### Acceptance Criteria

1. THE Client_App SHALL remove the `/add-business` route and associated components
2. THE Client_App SHALL remove the `/dashboard` route and associated components
3. THE Places_API_Proxy SHALL remove the business CRUD API routes (`POST /businesses`, `PUT /businesses/:id`, `DELETE /businesses/:id`)
4. THE Client_App SHALL redirect any navigation to removed routes to the homepage

### Requirement 9: Place Photos

**User Story:** As a user, I want to see photos of places, so that I can visually evaluate a business before visiting.

#### Acceptance Criteria

1. WHEN the Client_App needs to display a place photo, THE Places_API_Proxy SHALL provide a photo endpoint that accepts a photo reference and max width, and returns the image proxied from Google Places Photo API
2. THE Places_API_Proxy SHALL set appropriate cache-control headers (max-age 86400) on photo responses to enable browser and CDN caching
3. IF an invalid photo reference is provided, THEN THE Places_API_Proxy SHALL return a 404 status with "Photo not found" message

### Requirement 10: Listing Detail Page URL Migration

**User Story:** As a user, I want to access place detail pages by Place ID, so that URLs are stable and shareable.

#### Acceptance Criteria

1. THE Client_App SHALL use `/listing/[placeId]` as the route pattern for place detail pages, where placeId is a Google Place_ID
2. WHEN a user navigates to a listing detail page, THE Client_App SHALL request place details from the Places_API_Proxy using the Place_ID from the URL
3. IF the Place_ID in the URL does not resolve to a valid place, THEN THE Client_App SHALL display a "Place not found" message with a link to the homepage

### Requirement 11: Location-Agnostic Operation

**User Story:** As a user, I want the app to work from any location globally, so that I can discover places wherever I am.

#### Acceptance Criteria

1. THE Places_API_Proxy SHALL accept any valid latitude and longitude coordinates without restricting to a specific geographic area
2. WHEN the Client_App cannot determine user location, THE Client_App SHALL prompt the user to enable location services or enter a location manually
3. THE Client_App SHALL NOT hardcode any default location or city name in discovery or search flows
