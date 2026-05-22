# Requirements Document

## Introduction

GetNear is a hyperlocal discovery platform that connects customers with nearby businesses, restaurants, hospitals, cafes, pharmacies, gyms, and local services through location-based search. The platform serves three distinct user roles: Customer (discovers and saves nearby places), Business Owner (lists and manages their business, tracks leads), and Admin (moderates listings, manages users, oversees platform health).

The system is built on a Next.js 14 frontend with a Node.js/Express REST API backend, Supabase (PostgreSQL + PostGIS) for data and geospatial queries, Supabase Auth for authentication, and Google Maps API for mapping. Monetization is provided through a GetNear Plus freemium subscription tier.

---

## Glossary

- **System**: The GetNear platform as a whole (frontend + backend + database)
- **Auth_Service**: The authentication subsystem handling OTP, Google OAuth, and Apple Sign-In via Supabase Auth
- **Search_Engine**: The backend search subsystem combining PostgreSQL full-text search and PostGIS geospatial queries
- **Listing**: A business entry in the platform database with all associated metadata
- **Business_Owner**: A registered user with the `business` role who manages one or more Listings
- **Customer**: A registered user with the `customer` role who discovers and saves Listings
- **Admin**: A registered user with the `admin` role who moderates the platform
- **Collection**: A named, user-created group of saved Listings belonging to a Customer
- **Lead**: A recorded interaction event (call, direction request, WhatsApp contact, save, or view) attributed to a Listing
- **Offer**: A time-limited promotional deal created by a Business_Owner for a Listing
- **Booking**: A reservation made by a Customer for a service at a Listing
- **OTP**: One-time password delivered via SMS for phone-based authentication
- **PostGIS**: The PostgreSQL geospatial extension used for proximity-based queries
- **ST_DWithin**: The PostGIS function used to find Listings within a specified radius
- **GetNear_Plus**: The paid subscription tier providing expanded limits and premium features
- **Dashboard**: The Business_Owner analytics and management interface
- **Admin_Panel**: The separate administrative application for platform moderation
- **Notification**: An in-app or push message delivered to a user
- **Report**: A user-submitted flag against a Listing for policy violations
- **RLS**: Row-Level Security policies enforced at the Supabase/PostgreSQL layer
- **JWT**: JSON Web Token used for session management via Supabase Auth
- **CDN**: Content Delivery Network (Cloudflare) used for static asset delivery
- **PWA**: Progressive Web App configuration enabling offline support and installability

---

## Requirements

### Requirement 1: User Authentication

**User Story:** As a visitor, I want to sign in using my phone number, Google account, or Apple ID, so that I can access the platform securely without creating a separate password.

#### Acceptance Criteria

1. WHEN a visitor submits a valid phone number, THE Auth_Service SHALL send an OTP SMS to that number via Twilio within 10 seconds.
2. WHEN a visitor submits the correct OTP within 5 minutes of issuance, THE Auth_Service SHALL create or retrieve the user account and issue a JWT session token.
3. IF a visitor submits an incorrect OTP, THEN THE Auth_Service SHALL return an error message indicating the OTP is invalid and allow the visitor to retry.
4. IF a visitor submits an OTP after the 5-minute expiry window, THEN THE Auth_Service SHALL reject the OTP and prompt the visitor to request a new one.
5. WHEN a visitor initiates Google OAuth login, THE Auth_Service SHALL redirect the visitor through the Google OAuth 2.0 consent flow and create or retrieve the user account upon successful authorization.
6. WHEN a visitor initiates Apple Sign-In on an iOS device, THE Auth_Service SHALL redirect the visitor through the Apple Sign-In flow and create or retrieve the user account upon successful authorization.
7. WHEN a user successfully authenticates, THE Auth_Service SHALL detect the user's role (customer, business, admin) and redirect the user to the role-appropriate entry screen.
8. WHEN an authenticated user's JWT expires, THE Auth_Service SHALL automatically refresh the session token without requiring the user to re-authenticate.
9. WHEN a user requests sign-out, THE Auth_Service SHALL invalidate the current JWT session and redirect the user to the login screen.
10. THE Auth_Service SHALL enforce phone number format validation accepting E.164 format with India (+91) as the default country code.

---

### Requirement 2: Home Page and Location Discovery

**User Story:** As a Customer, I want to see nearby businesses based on my current location as soon as I open the app, so that I can quickly discover relevant places around me.

#### Acceptance Criteria

1. WHEN a Customer opens the home page, THE System SHALL request the device's GPS coordinates via the browser Geolocation API.
2. WHEN GPS coordinates are obtained, THE System SHALL display a location label showing the resolved city and neighborhood name within 3 seconds.
3. IF the Customer denies location permission, THEN THE System SHALL display a manual location picker allowing the Customer to enter a city or address.
4. WHEN a Customer selects a location, THE System SHALL persist that location for the current session and use it as the origin for all proximity queries.
5. THE System SHALL display a category quick-access row containing at minimum: Food, Services, Healthcare, Shops, ATM, and a "More" overflow option.
6. WHEN a Customer selects a category from the quick-access row, THE System SHALL navigate to the search results page pre-filtered by that category.
7. THE System SHALL display a "Popular near you" horizontal scroll section showing up to 10 Listings ranked by rating and proximity within the selected radius.
8. THE System SHALL display a radius selector allowing the Customer to choose a search radius of 1 km, 3 km, 5 km, or 10 km (free tier) or up to 50 km (GetNear_Plus tier).
9. THE System SHALL display a mini map preview showing pins for the top Listings in the current view.
10. THE System SHALL display a bottom navigation bar with five items: Home, Search, Saved, Chats, and Account, visible on all Customer-facing screens.
11. WHEN a Customer opens the home page, THE System SHALL display a time-of-day greeting (Good Morning / Good Afternoon / Good Evening) using the device's local time.

---

### Requirement 3: Search and Discovery

**User Story:** As a Customer, I want to search for businesses by name, category, or keyword and filter results by distance, rating, and availability, so that I can find exactly what I need near me.

#### Acceptance Criteria

1. WHEN a Customer submits a search query, THE Search_Engine SHALL execute a combined full-text search and PostGIS ST_DWithin proximity query against the businesses table and return results within 2 seconds.
2. THE Search_Engine SHALL support filtering results by: Open Now (based on current day and time vs. business_hours), Top Rated (rating_avg ≥ 4.0), Price Range, Distance (ascending), and Category.
3. THE Search_Engine SHALL support sorting results by: Relevance (full-text rank), Distance (nearest first), Rating (highest first), and Recently Added (created_at descending).
4. THE System SHALL display search results in a list view showing each Listing's primary photo, name, category, rating, distance, and open/closed status.
5. WHEN a Customer toggles to map view, THE System SHALL display a Google Maps canvas with clustered markers representing Listing locations and a bottom sheet preview card for the selected marker.
6. WHEN a Customer scrolls to the bottom of the list view, THE System SHALL load the next page of results using cursor-based pagination without a full page reload.
7. WHEN a Customer applies a filter, THE Search_Engine SHALL re-execute the query with the updated filter parameters and refresh the results list within 2 seconds.
8. WHEN a Customer submits a search query, THE System SHALL record the query, location, and timestamp in the search_history table for the authenticated Customer.
9. IF a search query returns zero results, THEN THE System SHALL display a "No results found" message and suggest broadening the search radius or changing the query.
10. THE System SHALL display an inline mini-map above the list results showing rating-labeled pins for the current result set.
11. WHERE a Customer has GetNear_Plus, THE Search_Engine SHALL allow a maximum search radius of 50 km; otherwise THE Search_Engine SHALL cap the search radius at 10 km.

---

### Requirement 4: Single Listing Detail

**User Story:** As a Customer, I want to view comprehensive details about a business including photos, hours, reviews, and contact options, so that I can make an informed decision before visiting or contacting them.

#### Acceptance Criteria

1. WHEN a Customer opens a Listing detail page, THE System SHALL display a full-screen swipeable image gallery using the business_photos records ordered by the `order` field.
2. THE System SHALL display the Listing's name, category, verified badge (if `verified = true`), average rating, review count, and current open/closed status derived from business_hours and the current day and time.
3. THE System SHALL display an action bar containing four actions: Call (initiates a tel: link), Directions (opens Google Maps with the Listing's coordinates), Save (adds to saved_places), and Website (opens the business website URL in a new tab).
4. WHEN a Customer taps Call, Directions, or Website, THE System SHALL record a Lead event of the corresponding type (call, direction, website) in the leads table.
5. THE System SHALL display the Listing's hours of operation for all seven days of the week from the business_hours table.
6. THE System SHALL display the Listing's distance from the Customer's current location, average cost indicator, and available amenities as chips.
7. THE System SHALL display a reviews section showing the most recent 5 reviews with reviewer name, rating, text, and date, with a "View all reviews" link to the full reviews page.
8. WHEN a Customer taps the Save button, THE System SHALL add the Listing to the Customer's default Collection and update the saved_places table; IF the Customer has reached the free-tier save limit of 10, THEN THE System SHALL display a GetNear_Plus upsell prompt.
9. THE System SHALL display a WhatsApp direct chat button that opens a pre-filled WhatsApp message to the Listing's whatsapp number.
10. WHERE a Listing has booking capability enabled, THE System SHALL display a "Book Table" or "Book Appointment" CTA that navigates to the booking flow.
11. THE System SHALL display a share button that invokes the native Web Share API or copies the Listing URL to the clipboard if the Web Share API is unavailable.
12. THE System SHALL display a "Report this listing" option that opens a report submission form.

---

### Requirement 5: Saved Places and Collections

**User Story:** As a Customer, I want to save businesses to named collections, so that I can organize and quickly revisit my favourite places.

#### Acceptance Criteria

1. WHEN a Customer saves a Listing, THE System SHALL add a record to the saved_places table linking the Customer's user_id, the business_id, and the target collection_id.
2. THE System SHALL display the Customer's saved Listings with filter tabs for All and each Category present in the saved set.
3. THE System SHALL support sorting saved Listings by: Recently Added (created_at descending), Nearest (distance from current location ascending), and Rating (rating_avg descending).
4. THE System SHALL display the Customer's Collections as a grid showing the collection name, icon, and count of saved Listings within each Collection.
5. WHEN a Customer creates a new Collection, THE System SHALL insert a record into the collections table with the provided name and icon and return the new collection_id.
6. WHEN a Customer renames a Collection, THE System SHALL update the name field in the collections table for that collection_id.
7. WHEN a Customer deletes a Collection, THE System SHALL delete the collections record and update all saved_places records in that Collection to set collection_id to the default Collection.
8. WHEN a Customer moves a saved Listing to a different Collection, THE System SHALL update the collection_id field in the saved_places record.
9. WHERE a Customer has reached the free-tier Collection limit of 2, THE System SHALL display a GetNear_Plus upsell prompt when the Customer attempts to create a third Collection.
10. IF a Customer attempts to save a Listing that is already saved, THEN THE System SHALL display a prompt allowing the Customer to move the Listing to a different Collection rather than creating a duplicate entry.

---

### Requirement 6: User Account Dashboard

**User Story:** As a Customer, I want a central account page showing my profile, activity stats, and quick access to my settings, so that I can manage my GetNear experience in one place.

#### Acceptance Criteria

1. THE System SHALL display the Customer's profile header showing avatar, name, phone number, email address, and a verified badge if the account is phone-verified.
2. THE System SHALL display four stat counters: Saved Places (count from saved_places), Recent Searches (count from search_history for the last 30 days), Reviews Written (count from reviews), and Active Offers (count of offers the Customer has viewed).
3. THE System SHALL display a "My Activity" section with links to: Search History, Recently Viewed, Bookings, and Messages.
4. THE System SHALL display the Customer's Collections grid with a maximum of 4 Collections visible and a "View all" link.
5. THE System SHALL display an Account & Support section with links to: Edit Profile, Notifications Settings, Help & Support, and Invite Friends.
6. WHEN a Customer taps "Invite Friends", THE System SHALL generate a unique referral link for the Customer and invoke the native Web Share API.
7. THE System SHALL display a GetNear_Plus upsell banner for Customers on the free tier.
8. WHEN a Customer taps "Sign Out", THE System SHALL call the Auth_Service sign-out endpoint, clear the local session, and redirect to the login screen.
9. WHEN a Customer updates their profile (name, avatar, email), THE System SHALL validate the inputs, update the users table, and display a success confirmation.

---

### Requirement 7: Add Business (Multi-Step Form)

**User Story:** As a Business_Owner, I want to submit my business listing through a guided multi-step form, so that my business appears on the platform for customers to discover.

#### Acceptance Criteria

1. THE System SHALL present the Add Business flow as a 5-step form: (1) Business Info, (2) Contact & Location, (3) Business Details, (4) Photos & More, (5) Review & Submit.
2. THE System SHALL display a step progress indicator showing the current step number and total steps at the top of the form.
3. WHEN a Business_Owner completes Step 1, THE System SHALL validate that business name (non-empty, max 100 characters), category (selected from categories table), and business type (Physical / Service / Online) are provided before allowing progression to Step 2.
4. WHEN a Business_Owner completes Step 2, THE System SHALL validate that at least one contact method (phone or email) and a complete address with resolvable coordinates (lat/lng) are provided before allowing progression to Step 3.
5. THE System SHALL provide a map pin drag interface on Step 2 allowing the Business_Owner to adjust the precise GPS coordinates of the Listing.
6. WHEN a Business_Owner completes Step 3, THE System SHALL validate that at least one day of business_hours is configured before allowing progression to Step 4.
7. WHEN a Business_Owner uploads photos in Step 4, THE System SHALL accept JPEG and PNG files up to 5 MB each, upload them to Supabase Storage, and store the resulting URLs in the business_photos table; THE System SHALL enforce a maximum of 10 photos per Listing.
8. THE System SHALL allow the Business_Owner to designate one photo as the primary photo by setting `is_primary = true` in the business_photos table.
9. WHEN a Business_Owner submits the form in Step 5, THE System SHALL create a businesses record with `status = pending` and send a confirmation notification to the Business_Owner.
10. WHEN a Business_Owner taps "Save Draft" at any step, THE System SHALL persist the current form state to local storage and allow the Business_Owner to resume from the same step on return.
11. IF a Business_Owner is not authenticated when accessing the Add Business flow, THEN THE System SHALL prompt the Business_Owner to log in and preserve the draft form state after authentication.
12. THE System SHALL validate all form fields using Zod schemas and display inline field-level error messages for each validation failure.

---

### Requirement 8: Business Dashboard and Analytics

**User Story:** As a Business_Owner, I want a dashboard showing my listing's performance metrics, leads, and reviews, so that I can understand how customers are engaging with my business.

#### Acceptance Criteria

1. THE System SHALL display four KPI stat cards on the Dashboard: Views, Calls, Direction Requests, and Saves, each showing the count for the last 7 days and the percentage change versus the prior 7-day period.
2. THE System SHALL display a line chart of daily views over a selectable time period of 7 days, 30 days, or 90 days, sourced from the leads table filtered by `type = view`.
3. THE System SHALL display a donut chart showing the distribution of lead types (Views, Calls, Directions, Website Clicks) for the selected time period.
4. THE System SHALL display a Recent Leads feed showing the 10 most recent Lead records with lead type tag, timestamp, and anonymized customer identifier.
5. THE System SHALL display a Recent Reviews section showing the 5 most recent reviews with reviewer name, rating, text, and a "Reply" action.
6. WHEN a Business_Owner submits a reply to a review, THE System SHALL store the reply text and timestamp associated with the review record and display it beneath the review.
7. THE System SHALL display an Active Offers section listing current Offers with title, validity date, and active status toggle.
8. WHEN a Business_Owner toggles an Offer's active status, THE System SHALL update the `is_active` field in the offers table within 1 second.
9. WHERE a Business_Owner is on the free tier, THE System SHALL limit analytics history to 7 days; WHERE a Business_Owner has GetNear_Plus, THE System SHALL provide analytics history up to 90 days.
10. THE System SHALL display a sidebar navigation with links to: Dashboard, My Listing, Analytics, Leads, Reviews, Messages, Photos, Offers, Bookings, Profile, Settings, and Help & Support.

---

### Requirement 9: Admin Panel — Business Approvals and Moderation

**User Story:** As an Admin, I want to review, approve, or reject pending business submissions and manage reported listings, so that the platform maintains high-quality, trustworthy content.

#### Acceptance Criteria

1. THE System SHALL display a business approvals queue listing all businesses with `status = pending`, ordered by created_at ascending (oldest first).
2. THE System SHALL display each pending Listing's submitted details including name, category, address, contact information, photos, and submitting Business_Owner's profile.
3. WHEN an Admin approves a Listing, THE System SHALL update the businesses record to `status = active` and send an approval notification to the Business_Owner.
4. WHEN an Admin rejects a Listing, THE System SHALL require the Admin to provide a rejection reason, update the businesses record to `status = rejected`, and send a rejection notification to the Business_Owner including the reason.
5. WHEN an Admin selects "Request More Info", THE System SHALL send a notification to the Business_Owner with the Admin's message and set the Listing status to `pending` with a flag indicating info is requested.
6. THE System SHALL support bulk approval and bulk rejection of multiple pending Listings in a single action.
7. THE System SHALL allow filtering the approvals queue by category, city, and submission date range.
8. THE System SHALL display a reports queue listing all Reports with `status = open`, showing reporter information, reported Listing, reason, and submission timestamp.
9. WHEN an Admin resolves a Report, THE System SHALL require the Admin to select an action (Dismiss, Warn Business, Suspend Listing, Remove Listing) and record the action in the admin_logs table.
10. WHEN an Admin suspends a Listing, THE System SHALL update the businesses record to `status = suspended` and send a suspension notification to the Business_Owner.
11. THE System SHALL record every Admin action (approve, reject, suspend, delete, warn) in the admin_logs table with admin_id, action type, target_type, target_id, note, and timestamp.

---

### Requirement 10: Admin Panel — User and Category Management

**User Story:** As an Admin, I want to manage user accounts and platform categories, so that I can maintain platform integrity and keep the category taxonomy up to date.

#### Acceptance Criteria

1. THE System SHALL display a users management table with columns: Name, Phone, Email, Role, Joined date, and Status (active/suspended).
2. THE System SHALL support filtering the users table by role (customer, business, admin) and searching by name, phone, or email.
3. WHEN an Admin suspends a user account, THE System SHALL update the user's status to suspended, invalidate all active JWT sessions for that user, and record the action in admin_logs.
4. WHEN an Admin changes a user's role, THE System SHALL update the role field in the users table and record the action in admin_logs.
5. THE System SHALL display a categories management interface listing all categories with their name, icon, color, display order, parent category, and enabled/disabled status.
6. WHEN an Admin creates a category, THE System SHALL insert a record into the categories table with the provided name, icon, color, display order, and optional parent_id.
7. WHEN an Admin updates a category, THE System SHALL update the corresponding fields in the categories table.
8. WHEN an Admin disables a category, THE System SHALL set the category's enabled flag to false and hide it from the Customer-facing category quick-access row and search filters.
9. WHEN an Admin deletes a category that has associated Listings, THE System SHALL prevent deletion and display an error message indicating the number of Listings using that category.

---

### Requirement 11: Admin Panel — Analytics and Broadcast Notifications

**User Story:** As an Admin, I want to view platform-wide analytics and send targeted notifications to users, so that I can monitor platform health and communicate with the user base.

#### Acceptance Criteria

1. THE System SHALL display platform-wide KPI metrics on the Admin Dashboard: Total Active Businesses, Total Registered Users, Searches Today, and New Listings Pending Approval.
2. THE System SHALL display platform-wide charts for: Daily Active Users (last 30 days), Daily Searches (last 30 days), New Business Registrations (last 30 days), and Reviews Written (last 30 days).
3. THE System SHALL display a "Top Searched Categories" ranking showing the 10 most searched categories by query volume in the last 30 days.
4. THE System SHALL display a "Top Cities by Activity" ranking showing the 10 cities with the highest combined search and lead event counts in the last 30 days.
5. WHEN an Admin composes a broadcast notification, THE System SHALL allow the Admin to specify: title (max 100 characters), body (max 500 characters), target audience (All Users, By City, By Role, or Individual User), and an optional scheduled send time.
6. WHEN an Admin sends a broadcast notification, THE System SHALL insert Notification records for all users matching the target audience criteria and deliver them via the in-app notification system.
7. WHERE a scheduled send time is specified, THE System SHALL queue the broadcast and deliver it at the scheduled time within a 1-minute tolerance.
8. THE System SHALL display an Admin Activity Log listing all admin_logs records with admin name, action, target, note, and timestamp, with support for filtering by admin, action type, and date range.

---

### Requirement 12: Bookings

**User Story:** As a Customer, I want to book a table or appointment at a business directly through the platform, so that I can reserve my spot without calling.

#### Acceptance Criteria

1. WHEN a Customer initiates a booking, THE System SHALL display a booking form with fields: date (calendar picker), time (time slot selector), party size (numeric input), and optional notes.
2. WHEN a Customer submits a booking, THE System SHALL insert a record into the bookings table with `status = pending` and send a booking confirmation notification to the Customer.
3. WHEN a booking is submitted, THE System SHALL send a notification to the Business_Owner with the booking details.
4. WHEN a Business_Owner confirms a booking, THE System SHALL update the booking status to `confirmed` and send a confirmation notification to the Customer.
5. WHEN a Business_Owner declines a booking, THE System SHALL update the booking status to `declined` and send a notification to the Customer with the reason.
6. THE System SHALL display the Customer's bookings list separated into Upcoming (status = pending or confirmed, date ≥ today) and Past (date < today or status = declined/cancelled) sections.
7. WHEN a Customer cancels a booking with more than 2 hours before the booking time, THE System SHALL update the booking status to `cancelled` and notify the Business_Owner.

---

### Requirement 13: Messaging

**User Story:** As a Customer, I want to send messages to a business directly through the platform, so that I can ask questions or get information without leaving the app.

#### Acceptance Criteria

1. THE System SHALL display a conversation list for the Customer showing all message threads ordered by most recent message timestamp descending.
2. WHEN a Customer sends a message, THE System SHALL insert a record into the messages table with sender_id, receiver_id, business_id, text, and `read = false`, and deliver it to the recipient via Supabase Realtime within 2 seconds.
3. WHEN a recipient opens a conversation thread, THE System SHALL update all unread messages in that thread to `read = true`.
4. THE System SHALL display an unread message count badge on the Chats bottom navigation item reflecting the total count of messages where `read = false` and `receiver_id = current_user_id`.
5. IF a message delivery fails due to a network error, THEN THE System SHALL display a delivery failure indicator on the message and allow the Customer to retry sending.
6. THE System SHALL display messages in chronological order within a conversation thread with sender name, message text, and timestamp.

---

### Requirement 14: Notifications

**User Story:** As a Customer or Business_Owner, I want to receive in-app notifications for relevant events, so that I stay informed about bookings, messages, and platform activity.

#### Acceptance Criteria

1. THE System SHALL deliver in-app Notifications for the following events: new message received, booking status change, review reply received, offer expiry reminder (24 hours before), and Admin broadcast.
2. THE System SHALL display a notification feed listing all Notifications for the authenticated user ordered by created_at descending, showing title, body, type, and read/unread state.
3. WHEN a user opens a Notification, THE System SHALL update the `read` field to true for that notification record.
4. THE System SHALL display an unread notification count badge on the Account bottom navigation item.
5. WHEN a user taps "Mark all as read", THE System SHALL update all Notification records for that user to `read = true`.
6. WHERE a user has enabled push notifications in their browser, THE System SHALL deliver push notifications for new messages and booking status changes using the Web Push API.

---

### Requirement 15: Reviews

**User Story:** As a Customer, I want to write reviews for businesses I have visited, so that I can share my experience and help other customers make informed decisions.

#### Acceptance Criteria

1. WHEN a Customer submits a review, THE System SHALL validate that a star rating (integer 1–5) is provided and that the review text does not exceed 1000 characters, then insert a record into the reviews table.
2. WHEN a review is submitted, THE System SHALL recalculate the `rating_avg` and `review_count` fields on the businesses record for the reviewed Listing.
3. THE System SHALL display the full reviews list for a Listing ordered by created_at descending with pagination of 20 reviews per page.
4. IF a Customer attempts to submit a second review for the same Listing, THEN THE System SHALL prevent the submission and display a message indicating the Customer has already reviewed this Listing.
5. WHEN a Business_Owner replies to a review, THE System SHALL store the reply and send a Notification to the reviewing Customer.
6. THE System SHALL allow a Customer to optionally attach up to 3 photos to a review, uploading them to Supabase Storage and storing the URLs with the review record.

---

### Requirement 16: GetNear Plus Subscription

**User Story:** As a Customer or Business_Owner, I want to upgrade to GetNear Plus, so that I can access expanded limits and premium features.

#### Acceptance Criteria

1. THE System SHALL enforce the following free-tier limits: maximum 10 saved places, maximum 2 Collections, maximum 10 km search radius.
2. WHERE a Customer has an active GetNear_Plus subscription, THE System SHALL remove the saved places limit, remove the Collections limit, and extend the maximum search radius to 50 km.
3. WHERE a Business_Owner has an active GetNear_Plus subscription, THE System SHALL provide analytics history up to 90 days, enable instant lead notifications, and mark the Listing as featured in search results.
4. WHEN a free-tier user reaches a plan limit, THE System SHALL display a GetNear_Plus upsell prompt describing the benefit of upgrading.
5. THE System SHALL display the GetNear_Plus pricing and feature comparison on the upsell screen.
6. WHEN a user's GetNear_Plus subscription expires, THE System SHALL downgrade the user to the free tier and send a subscription expiry notification 7 days before expiry and again on the expiry date.

---

### Requirement 17: Performance and Reliability

**User Story:** As any user, I want the platform to load quickly and remain available, so that I can discover nearby places without frustrating delays.

#### Acceptance Criteria

1. THE System SHALL serve the initial home page with a Largest Contentful Paint (LCP) of under 2.5 seconds on a 4G mobile connection.
2. THE Search_Engine SHALL return search results within 2 seconds for queries with up to 1000 concurrent users.
3. THE System SHALL optimize all Listing images using Next.js Image component with automatic WebP conversion and lazy loading.
4. THE System SHALL serve static assets via Cloudflare CDN with cache-control headers set to a minimum of 1 year for versioned assets.
5. WHEN an unhandled error occurs in the frontend, THE System SHALL capture the error in Sentry with full stack trace and user context without exposing error details to the user.
6. WHEN an unhandled error occurs in the API, THE System SHALL return a structured JSON error response with an error code and message, log the error to Sentry, and continue serving other requests.
7. THE System SHALL implement RLS policies on all Supabase tables ensuring users can only read and write records they are authorized to access based on their role and user_id.

---

### Requirement 18: Progressive Web App and Accessibility

**User Story:** As a Customer, I want to install GetNear on my home screen and use it offline for basic functions, so that I have a native app-like experience without downloading from an app store.

#### Acceptance Criteria

1. THE System SHALL include a valid Web App Manifest with name, short_name, icons (192×192 and 512×512 px), theme_color, background_color, and `display: standalone`.
2. THE System SHALL register a Service Worker that caches the application shell, static assets, and the most recently viewed 20 Listings for offline access.
3. WHEN a Customer accesses a cached Listing while offline, THE System SHALL display the cached Listing data with an "Offline — data may be outdated" indicator.
4. THE System SHALL comply with WCAG 2.1 Level AA accessibility standards including: minimum 4.5:1 color contrast ratio for normal text, keyboard navigability for all interactive elements, and ARIA labels on all icon-only buttons.
5. THE System SHALL include Open Graph meta tags (og:title, og:description, og:image, og:url) on all Listing detail pages to enable rich link previews when shared on social platforms.
6. THE System SHALL generate a sitemap.xml listing all active Listing URLs and submit it to search engines to support SEO indexing.

---

### Requirement 19: Data Serialization and API Contracts

**User Story:** As a developer integrating the frontend with the backend API, I want consistent, validated data contracts, so that data is reliably exchanged without runtime type errors.

#### Acceptance Criteria

1. THE System SHALL define all API request and response shapes as Zod schemas in the shared `packages/validation` package.
2. WHEN the API receives a request, THE System SHALL validate the request body against the corresponding Zod schema and return a 400 error with field-level validation messages if validation fails.
3. THE System SHALL serialize all API responses as JSON with consistent envelope structure: `{ data, error, meta }` where `data` contains the payload, `error` contains error details (null on success), and `meta` contains pagination information where applicable.
4. FOR ALL Zod schemas used for serialization, parsing a serialized value and then re-serializing it SHALL produce an output equal to the original serialized value (round-trip property).
5. WHEN the API returns a list resource, THE System SHALL include pagination metadata in the `meta` field: `{ page, pageSize, total, hasNextPage }`.
6. THE System SHALL use ISO 8601 format for all date and timestamp fields in API responses.

