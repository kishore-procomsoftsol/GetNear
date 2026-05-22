# GetNear V1 — Full Implementation Plan

> Hyperlocal discovery platform · React / Next.js · Tailwind CSS · TypeScript

---

## 1. Project Overview

GetNear connects users with nearby businesses, restaurants, hospitals, cafes, pharmacies, gyms, and local services through location-based search. The platform serves three distinct user roles:

| Role | Primary Goal |
|---|---|
| **Customer** | Discover, save, and navigate to nearby places |
| **Business Owner** | List and manage their business, track leads |
| **Admin** | Moderate listings, manage users, oversee platform health |

---

## 2. Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Animation**: Framer Motion
- **Forms**: react-hook-form + Zod
- **Icons**: lucide-react
- **Maps**: Google Maps API (with Mapbox as fallback)
- **HTTP**: Axios

### Backend
- **Primary**: Node.js + Express (REST API)
- **Database**: Supabase (PostgreSQL + real-time + storage)
- **Auth**: Supabase Auth (OTP + Google OAuth)
- **Search**: Supabase full-text search + PostGIS for geospatial queries
- **File Storage**: Supabase Storage (business photos)
- **Email/SMS**: Twilio (OTP) + Resend (transactional email)

### Infrastructure
- **Hosting**: Vercel (frontend) + Railway or Render (API)
- **CDN**: Cloudflare
- **Analytics**: Posthog (product analytics) + Sentry (error tracking)

---

## 3. Database Schema (Supabase / PostgreSQL)

```
users               → id, name, phone, email, avatar, role (customer|business|admin), created_at
businesses          → id, owner_id, name, category, type, description, phone, email, website, whatsapp,
                      address, city, state, pin, lat, lng, status (pending|active|rejected|suspended),
                      verified, rating_avg, review_count, created_at
business_photos     → id, business_id, url, is_primary, order
business_hours      → id, business_id, day, open_time, close_time, is_closed
business_services   → id, business_id, name, price, description
categories          → id, name, icon, color, parent_id
reviews             → id, user_id, business_id, rating, text, created_at
saved_places        → id, user_id, business_id, collection_id, created_at
collections         → id, user_id, name, icon, created_at
search_history      → id, user_id, query, location, created_at
leads               → id, business_id, user_id, type (call|direction|whatsapp|save|view), created_at
offers              → id, business_id, title, description, valid_until, is_active
bookings            → id, user_id, business_id, date, time, party_size, status, notes
messages            → id, sender_id, receiver_id, business_id, text, read, created_at
notifications       → id, user_id, title, body, type, read, created_at
admin_logs          → id, admin_id, action, target_type, target_id, note, created_at
reports             → id, reporter_id, business_id, reason, status, created_at
```

---

## 4. Screen Inventory

### 4.1 Customer-Facing Screens (from your designs + additions)

| # | Screen | Status in Designs |
|---|---|---|
| 1 | Splash Screen | ❌ Missing — needs creation |
| 2 | Onboarding (3 slides) | ❌ Missing — needs creation |
| 3 | Login / Signup (OTP + Google + Apple) | ✅ Uploaded |
| 4 | Home Page | ✅ Uploaded |
| 5 | Search Results (List View) | ✅ Uploaded |
| 6 | Search Results (Map View) | ✅ Uploaded |
| 7 | Single Listing Detail | ✅ Uploaded |
| 8 | Saved Places | ✅ Uploaded |
| 9 | Collections Detail | ❌ Missing — needs creation |
| 10 | User Dashboard / Account | ✅ Uploaded |
| 11 | Search History | ❌ Missing — needs creation |
| 12 | Bookings | ❌ Missing — needs creation |
| 13 | Messages / Chat | ❌ Missing — needs creation |
| 14 | Notifications | ❌ Missing — needs creation |
| 15 | Edit Profile | ❌ Missing — needs creation |
| 16 | Write a Review | ❌ Missing — needs creation |
| 17 | All Reviews Page | ❌ Missing — needs creation |

### 4.2 Business Owner Screens

| # | Screen | Status in Designs |
|---|---|---|
| 1 | Add Business (Multi-step form) | ✅ Uploaded (Step 1 shown) |
| 2 | Add Business — Step 2: Business Details | ❌ Missing |
| 3 | Add Business — Step 3: Photos & More | ❌ Missing |
| 4 | Add Business — Step 4: Review & Submit | ❌ Missing |
| 5 | Business Dashboard | ✅ Uploaded |
| 6 | Analytics Detail | ❌ Missing |
| 7 | Leads Management | ❌ Missing |
| 8 | Reviews Management | ❌ Missing |
| 9 | Messages (Business side) | ❌ Missing |
| 10 | Offers — List & Create | ❌ Missing |
| 11 | Bookings Management | ❌ Missing |
| 12 | Edit Listing | ❌ Missing |
| 13 | Business Profile Settings | ❌ Missing |

### 4.3 Admin Panel Screens (all new)

| # | Screen |
|---|---|
| 1 | Admin Login |
| 2 | Admin Dashboard (overview stats) |
| 3 | Business Approvals (pending listings) |
| 4 | All Businesses (search, filter, actions) |
| 5 | Business Detail View (admin view) |
| 6 | Users Management |
| 7 | User Detail View |
| 8 | Reports & Flags |
| 9 | Categories Management |
| 10 | Analytics Overview (platform-wide) |
| 11 | Notifications Broadcast |
| 12 | Admin Settings |
| 13 | Admin Activity Log |

---

## 5. Feature Specifications

### 5.1 Authentication
- Mobile OTP login via Twilio (India +91 default, international support)
- Google OAuth login
- Apple Sign-In (iOS)
- Role detection on login → route to customer / business / admin view
- Session management via Supabase Auth (JWT)
- "Save Draft" before login for Add Business flow

### 5.2 Home Page
- Greeting with time of day
- Location picker (GPS or manual)
- Category quick-access row (Food, Services, Healthcare, Shops, ATM, More)
- Radius + Sort selector
- "Popular near you" horizontal scroll cards
- Mini map preview with pins
- Bottom navigation: Home, Search, Saved, Chats, Account

### 5.3 Search
- Full-text + category + proximity search (PostGIS `ST_DWithin`)
- Filters: Open Now, Top Rated, Price Range, Distance, Category
- Sorting: Relevance, Distance, Rating, Recently Added
- List ↔ Map toggle
- Inline mini-map on search results with rating pins
- Infinite scroll / pagination on list view
- Map view with clustered markers + bottom sheet preview card

### 5.4 Single Listing
- Full-screen image gallery (swipeable)
- Verified badge, rating, review count, open/closed status
- Action bar: Call, Directions, Save, Website
- About section with "Show more"
- Hours of operation
- Distance, delivery time, avg cost, amenities chips
- Popular items / menu preview
- Reviews section with pagination
- Report listing option
- Share listing (native share or link copy)
- WhatsApp direct chat button
- Order Online / Book Table CTAs

### 5.5 Saved Places
- Filter tabs: All, Cafes, Restaurants, Hotels, More
- Sort: Recently Added, Nearest, Rating
- Collections grid (user-created)
- Create / rename / delete collections
- Move saved place between collections

### 5.6 User Account Dashboard
- Profile header (photo, name, phone, email, verified badge)
- GetNear Plus upsell banner
- Stats: Saved Places, Recent Searches, Reviews, Offers
- My Activity: Search History, Recently Viewed, Bookings, Messages
- My Collections grid
- Account & Support: Edit Profile, Payment Methods, Notifications, Help, Invite Friends (with rewards)
- Sign out

### 5.7 Add Business (Multi-step)
- **Step 1 — Business Info**: Name, Category, Type (Physical / Service / Online), Description
- **Step 2 — Contact & Location**: Phone, Email, Website, WhatsApp, Address (manual or GPS), Map pin drag
- **Step 3 — Business Details**: Hours of operation, Amenities, Price range, Services list
- **Step 4 — Photos & More**: Upload up to 10 photos, primary photo selection, menu items (optional)
- **Step 5 — Review & Submit**: Summary view, T&C agreement, submit
- Save Draft at any step
- Validation via Zod schemas per step

### 5.8 Business Dashboard
- Stats cards: Views, Calls, Direction Requests, Saves (with % change vs last 7 days)
- Views overview line chart (time selector: 7d / 30d / 90d)
- Top Actions donut chart (Views, Calls, Directions, Website Clicks)
- Recent Leads feed with lead type tags
- Recent Reviews with reply action
- Active Offers management
- Sidebar navigation: Dashboard, My Listing, Analytics, Leads, Reviews, Messages, Photos, Offers, Bookings, Q&A, Profile, Settings, Help & Support
- GetNear Plus upgrade prompt

### 5.9 Admin Panel

#### Dashboard
- Platform KPIs: Total Businesses, Active Users, Searches Today, New Listings (pending)
- Alerts: Pending Approvals, Flagged Reports, Support Tickets
- Recent signups + recent listings table
- Revenue / subscription metrics (if Plus is monetized)

#### Business Approvals
- Queue of pending submissions
- Preview card with all submitted details
- Actions: Approve, Reject (with reason), Request More Info
- Bulk approve / reject
- Filter by category, city, submission date

#### All Businesses
- Full searchable, filterable table
- Columns: Name, Category, City, Status, Rating, Verified, Owner, Created
- Actions: View, Edit, Suspend, Delete, Verify badge toggle
- Export CSV

#### Users Management
- Table: Name, Phone, Email, Role, Joined, Status
- Actions: View profile, Suspend, Delete, Change role
- Filter by role (customer / business / admin)

#### Reports & Flags
- Reported listings queue
- Reporter info, reason, timestamp
- Actions: Dismiss, Warn business, Suspend listing, Remove listing

#### Categories Management
- Add / edit / delete categories and subcategories
- Set icon, color, display order
- Enable / disable categories

#### Analytics Overview
- Platform-wide charts: Daily Active Users, Searches, New Businesses, Reviews
- Top searched categories
- Top cities by activity
- User retention metrics

#### Broadcast Notifications
- Compose push notification / in-app notification
- Target: All users, By city, By role, Individual user
- Schedule send

---

## 6. Project Structure

```
getnear/
├── apps/
│   ├── web/                          # Next.js customer + business app
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   └── onboarding/
│   │   │   ├── (customer)/
│   │   │   │   ├── page.tsx          # Home
│   │   │   │   ├── search/
│   │   │   │   ├── listing/[id]/
│   │   │   │   ├── saved/
│   │   │   │   ├── chats/
│   │   │   │   └── account/
│   │   │   ├── (business)/
│   │   │   │   ├── add-business/
│   │   │   │   └── dashboard/
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn components
│   │   │   ├── maps/
│   │   │   ├── listings/
│   │   │   ├── search/
│   │   │   └── shared/
│   │   └── lib/
│   │       ├── api/
│   │       ├── hooks/
│   │       ├── stores/               # Zustand stores
│   │       └── utils/
│   └── admin/                        # Separate Next.js admin app
│       ├── app/
│       │   ├── login/
│       │   ├── dashboard/
│       │   ├── businesses/
│       │   ├── users/
│       │   ├── approvals/
│       │   ├── reports/
│       │   ├── categories/
│       │   ├── analytics/
│       │   └── settings/
│       └── components/
├── packages/
│   ├── types/                        # Shared TypeScript types
│   ├── validation/                   # Shared Zod schemas
│   └── config/                       # Shared config (categories, etc.)
└── supabase/
    ├── migrations/
    └── functions/                    # Edge functions
```

---

## 7. API Endpoints

### Auth
```
POST /auth/send-otp
POST /auth/verify-otp
POST /auth/google
POST /auth/refresh
POST /auth/logout
```

### Businesses
```
GET    /businesses/search?q=&lat=&lng=&radius=&category=&sort=
GET    /businesses/:id
POST   /businesses                    # Create (business owner)
PUT    /businesses/:id
DELETE /businesses/:id
GET    /businesses/:id/reviews
GET    /businesses/:id/photos
GET    /businesses/:id/offers
```

### User
```
GET    /user/profile
PUT    /user/profile
GET    /user/saved
POST   /user/saved
DELETE /user/saved/:id
GET    /user/collections
POST   /user/collections
GET    /user/search-history
GET    /user/notifications
GET    /user/bookings
GET    /user/messages
```

### Business Dashboard
```
GET    /dashboard/stats
GET    /dashboard/analytics?period=7d
GET    /dashboard/leads
GET    /dashboard/reviews
GET    /dashboard/offers
POST   /dashboard/offers
PUT    /dashboard/offers/:id
```

### Admin
```
GET    /admin/dashboard/stats
GET    /admin/businesses?status=pending&page=
PUT    /admin/businesses/:id/approve
PUT    /admin/businesses/:id/reject
PUT    /admin/businesses/:id/suspend
GET    /admin/users
PUT    /admin/users/:id/suspend
GET    /admin/reports
PUT    /admin/reports/:id/resolve
GET    /admin/categories
POST   /admin/categories
PUT    /admin/categories/:id
POST   /admin/notifications/broadcast
GET    /admin/logs
```

---

## 8. Development Phases

### Phase 1 — Foundation (Weeks 1–2)
- [ ] Supabase project setup: schema, auth, storage buckets, RLS policies
- [ ] Next.js monorepo scaffold (Turborepo)
- [ ] Design system: colors, typography, spacing tokens in Tailwind config
- [ ] Shared component library: Button, Input, Card, Badge, BottomSheet, Modal
- [ ] Auth flow: OTP login, Google OAuth, session handling, role routing

### Phase 2 — Customer Core (Weeks 3–5)
- [ ] Splash + Onboarding screens
- [ ] Home page with location, categories, popular listings, mini map
- [ ] Search results: list view + map view toggle
- [ ] Single listing detail page (full feature set)
- [ ] Saved Places + Collections
- [ ] User Account dashboard

### Phase 3 — Customer Secondary (Week 6)
- [ ] Search history, recently viewed
- [ ] Notifications center
- [ ] Bookings flow
- [ ] Messaging / chat
- [ ] Write & view reviews
- [ ] Edit profile
- [ ] Missing screens (see §4.1 table)

### Phase 4 — Business Owner (Weeks 7–8)
- [ ] Add Business multi-step form (all 5 steps)
- [ ] Business Dashboard (stats, analytics, leads, reviews)
- [ ] Offers creation and management
- [ ] Booking management
- [ ] Edit listing
- [ ] Business messaging

### Phase 5 — Admin Panel (Week 9)
- [ ] Admin app scaffold with sidebar layout
- [ ] Dashboard overview
- [ ] Business approvals queue
- [ ] All businesses CRUD
- [ ] Users management
- [ ] Reports & flags
- [ ] Categories management
- [ ] Broadcast notifications

### Phase 6 — Polish & Launch (Week 10)
- [ ] Framer Motion page transitions and micro-interactions
- [ ] PWA manifest + service worker (offline support)
- [ ] SEO: Open Graph, sitemap, robots.txt
- [ ] Performance: image optimization, lazy loading, bundle splitting
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Error boundaries + Sentry integration
- [ ] E2E tests (Playwright) for critical paths
- [ ] Production deployment (Vercel + Railway)

---

## 9. Missing Screens to Design

Based on the uploaded designs, these screens are needed but not yet designed:

| Screen | Notes |
|---|---|
| Splash Screen | "GetNear" logo animation, 2–3 sec |
| Onboarding (3 slides) | Feature highlights: Discover, Navigate, Save |
| Collections Detail | Listings within a single collection |
| Search History | List of past searches with quick-relaunch |
| Bookings (Customer) | Upcoming + past bookings with status |
| Messages / Chat | Conversation list + chat thread |
| Notifications | Notification feed with read/unread states |
| Edit Profile | Name, photo, phone, email, preferences |
| Write a Review | Star rating + text + photo upload |
| All Reviews | Full review list for a business |
| Add Business — Steps 2–5 | Business details, photos, review & submit |
| Business — Leads Page | Lead cards with type, contact, timestamp |
| Business — Offers Page | Active / expired offers, create new |
| Business — Analytics Detail | Expanded charts and breakdown tables |
| Business — Edit Listing | Pre-filled form matching add business flow |
| All 13 Admin screens | See §4.3 |

---

## 10. Key Technical Decisions

| Decision | Choice | Reason |
|---|---|---|
| Geospatial search | PostGIS on Supabase | Native PostgreSQL extension, no extra service |
| Map library | Google Maps JS API | Best geocoding accuracy for India |
| State management | Zustand | Lightweight, works well with Next.js App Router |
| Image optimization | Next.js `<Image>` + Supabase Storage CDN | Automatic WebP, lazy loading |
| OTP delivery | Twilio Verify | Reliable, India-ready, supports +91 |
| Admin isolation | Separate Next.js app on `/admin` subdomain | Security isolation, separate deploy |
| Real-time | Supabase Realtime (chat, notifications) | Built into stack, no extra infra |
| Search | Supabase FTS + PostGIS `ST_DWithin` | Covers full-text + radius in one query |

---

## 11. GetNear Plus (Monetization)

| Feature | Free | Plus |
|---|---|---|
| Save places | 10 | Unlimited |
| Collections | 2 | Unlimited |
| Search radius | 10 km | 50 km |
| Exclusive offers | ❌ | ✅ |
| Priority results | ❌ | ✅ |
| Business — featured listing | ❌ | ✅ |
| Business — lead notifications | Basic | Instant + advanced |
| Business — analytics | 7 days | 90 days |

---

*GetNear V1 Implementation Plan — generated May 2026*
