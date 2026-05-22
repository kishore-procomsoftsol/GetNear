# Design Document — GetNear V1

## 1. Overview

GetNear is a hyperlocal discovery platform that connects users with nearby businesses — restaurants, cafes, hospitals, pharmacies, gyms, and local services — through location-aware search and rich listing pages. The platform serves three distinct roles: **Customers** who discover and save places, **Business Owners** who list and manage their presence, and **Admins** who moderate the platform.

### Goals

- Deliver sub-second search results combining full-text relevance and geospatial proximity
- Provide a mobile-first, PWA-capable experience with offline support
- Give business owners actionable analytics and lead tracking
- Maintain platform quality through an admin moderation layer
- Monetize via GetNear Plus subscriptions for both customers and businesses

### Non-Goals (V1)

- Native iOS/Android apps (PWA covers mobile)
- Payment processing for bookings (bookings are request-only in V1)
- Multi-language i18n beyond English

---

## 2. Architecture

### 2.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Clients                                  │
│  ┌──────────────────────┐    ┌──────────────────────────────┐   │
│  │  apps/web (Vercel)   │    │  apps/admin (Vercel)         │   │
│  │  Next.js 14 App      │    │  Next.js 14 App              │   │
│  │  Router + Tailwind   │    │  Router + Tailwind           │   │
│  └──────────┬───────────┘    └──────────────┬───────────────┘   │
└─────────────┼────────────────────────────────┼───────────────────┘
              │ HTTPS / REST                   │ HTTPS / REST
              ▼                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   API Layer (Railway)                           │
│              Node.js + Express REST API                         │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│   │  Auth    │ │ Business │ │  User    │ │  Admin           │  │
│   │  Router  │ │  Router  │ │  Router  │ │  Router          │  │
│   └────┬─────┘ └────┬─────┘ └────┬─────┘ └────────┬─────────┘  │
└────────┼────────────┼────────────┼─────────────────┼────────────┘
         │            │            │                 │
         ▼            ▼            ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase                                     │
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  PostgreSQL +    │  │  Supabase    │  │  Supabase        │  │
│  │  PostGIS         │  │  Auth (JWT)  │  │  Storage         │  │
│  │  (RLS enabled)   │  │              │  │  (CDN via CF)    │  │
│  └──────────────────┘  └──────────────┘  └──────────────────┘  │
│  ┌──────────────────┐                                           │
│  │  Supabase        │                                           │
│  │  Realtime        │  ◄── WebSocket subscriptions             │
│  └──────────────────┘                                           │
└─────────────────────────────────────────────────────────────────┘
         │                                           │
         ▼                                           ▼
┌─────────────────┐                    ┌─────────────────────────┐
│  Twilio Verify  │                    │  Resend (email)         │
│  (OTP SMS)      │                    │  Posthog (analytics)    │
└─────────────────┘                    │  Sentry (errors)        │
                                       └─────────────────────────┘
```

### 2.2 Monorepo Structure

```
getnear/                          # Turborepo root
├── turbo.json                    # Pipeline definitions
├── package.json                  # Root workspace
├── apps/
│   ├── web/                      # Customer + Business Next.js app
│   │   ├── app/                  # App Router pages
│   │   ├── components/           # App-specific components
│   │   ├── lib/                  # API clients, hooks, stores
│   │   ├── public/               # Static assets, PWA manifest
│   │   └── next.config.ts
│   └── admin/                    # Admin Next.js app
│       ├── app/                  # App Router pages
│       ├── components/           # Admin-specific components
│       └── lib/
├── packages/
│   ├── types/                    # Shared TypeScript interfaces
│   │   └── src/index.ts          # User, Business, Review, etc.
│   ├── validation/               # Shared Zod schemas
│   │   └── src/index.ts          # businessSchema, reviewSchema, etc.
│   └── config/                   # Shared constants
│       └── src/index.ts          # categories, radiusOptions, etc.
└── supabase/
    ├── migrations/               # SQL migration files
    └── functions/                # Supabase Edge Functions
```

### 2.3 Request Flow

```
Browser → Vercel Edge (CDN cache check)
       → Next.js Server Component (SSR / ISR)
       → Express API on Railway (JWT validated)
       → Supabase PostgreSQL (RLS enforced)
       → Response JSON
       → Next.js renders → Browser
```

For real-time features (chat, notifications):
```
Browser → Supabase Realtime WebSocket (direct, JWT authenticated)
       → PostgreSQL NOTIFY on INSERT
       → Broadcast to subscribed clients
```

### 2.4 Auth Flow Summary

```
User enters phone → POST /auth/send-otp → Twilio Verify
User enters code  → POST /auth/verify-otp → Supabase Auth signInWithOtp
                  → Supabase returns access_token + refresh_token
                  → Stored in httpOnly cookie (SSR) + memory (client)
                  → Role read from users.role
                  → Redirect: customer→/ | business→/dashboard | admin→/admin
```

### 2.5 Real-time Flow

```
Client subscribes to Supabase Realtime channel
  → channel: messages:user_id=<uid>
  → channel: notifications:user_id=<uid>

Server inserts row into messages / notifications table
  → PostgreSQL triggers NOTIFY
  → Supabase Realtime broadcasts to subscribed clients
  → Client React state updated via channel.on('INSERT', handler)
```

---

## 3. Data Models

All tables live in the `public` schema with Row Level Security (RLS) enabled. PostGIS extension is enabled for geospatial columns.

### 3.1 users

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT,
  phone         TEXT UNIQUE,
  email         TEXT UNIQUE,
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'customer'
                  CHECK (role IN ('customer', 'business', 'admin')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  plus_expires_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role  ON users(role);
```

**RLS**: Users can read and update their own row (`auth.uid() = id`). Admins can read all rows.

### 3.2 businesses

```sql
CREATE TABLE businesses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE,
  category_id   UUID REFERENCES categories(id),
  type          TEXT NOT NULL CHECK (type IN ('physical', 'service', 'online')),
  description   TEXT,
  phone         TEXT,
  email         TEXT,
  website       TEXT,
  whatsapp      TEXT,
  address       TEXT,
  city          TEXT,
  state         TEXT,
  pin           TEXT,
  location      GEOGRAPHY(POINT, 4326),   -- PostGIS point (lng, lat)
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','active','rejected','suspended')),
  verified      BOOLEAN NOT NULL DEFAULT false,
  rating_avg    NUMERIC(3,2) DEFAULT 0,
  review_count  INTEGER DEFAULT 0,
  view_count    INTEGER DEFAULT 0,
  search_vector TSVECTOR,                 -- Full-text search vector
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_businesses_location    ON businesses USING GIST(location);
CREATE INDEX idx_businesses_search      ON businesses USING GIN(search_vector);
CREATE INDEX idx_businesses_status      ON businesses(status);
CREATE INDEX idx_businesses_category    ON businesses(category_id);
CREATE INDEX idx_businesses_owner       ON businesses(owner_id);
CREATE INDEX idx_businesses_city        ON businesses(city);

-- Auto-update search_vector on insert/update
CREATE OR REPLACE FUNCTION update_business_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.city, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.address, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_business_search_vector
  BEFORE INSERT OR UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_business_search_vector();
```

**RLS**: Active businesses are readable by all. Owners can update their own. Admins can update any.

### 3.3 business_photos

```sql
CREATE TABLE business_photos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  url           TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  is_primary    BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_business_photos_business ON business_photos(business_id);
```

**RLS**: Readable by all. Insertable/deletable by business owner only.

### 3.4 business_hours

```sql
CREATE TABLE business_hours (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  day           SMALLINT NOT NULL CHECK (day BETWEEN 0 AND 6), -- 0=Sun
  open_time     TIME,
  close_time    TIME,
  is_closed     BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (business_id, day)
);
```

**RLS**: Readable by all. Writable by business owner only.

### 3.5 business_services

```sql
CREATE TABLE business_services (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  price         NUMERIC(10,2),
  description   TEXT,
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_business_services_business ON business_services(business_id);
```

**RLS**: Readable by all. Writable by business owner only.

### 3.6 categories

```sql
CREATE TABLE categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL UNIQUE,
  slug          TEXT NOT NULL UNIQUE,
  icon          TEXT,
  color         TEXT,
  parent_id     UUID REFERENCES categories(id),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true
);
```

**RLS**: Readable by all. Writable by admins only.

### 3.7 reviews

```sql
CREATE TABLE reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text          TEXT,
  photos        TEXT[],
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, business_id)   -- one review per user per business
);

CREATE INDEX idx_reviews_business ON reviews(business_id);
CREATE INDEX idx_reviews_user     ON reviews(user_id);
```

**RLS**: Readable by all. Users can insert/update/delete their own reviews.

### 3.8 saved_places

```sql
CREATE TABLE saved_places (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  collection_id   UUID REFERENCES collections(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, business_id)
);

CREATE INDEX idx_saved_places_user       ON saved_places(user_id);
CREATE INDEX idx_saved_places_collection ON saved_places(collection_id);
```

**RLS**: Users can only read/write their own saved places.

### 3.9 collections

```sql
CREATE TABLE collections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  icon        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_collections_user ON collections(user_id);
```

**RLS**: Users can only read/write their own collections.

### 3.10 search_history

```sql
CREATE TABLE search_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  query       TEXT NOT NULL,
  lat         DOUBLE PRECISION,
  lng         DOUBLE PRECISION,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_search_history_user ON search_history(user_id, created_at DESC);
```

**RLS**: Users can only read/delete their own history.

### 3.11 leads

```sql
CREATE TABLE leads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  type        TEXT NOT NULL
                CHECK (type IN ('call','direction','whatsapp','save','view','website')),
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_business    ON leads(business_id, created_at DESC);
CREATE INDEX idx_leads_type        ON leads(business_id, type);
```

**RLS**: Business owners can read leads for their own businesses. Leads are inserted by the API (service role).

### 3.12 offers

```sql
CREATE TABLE offers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  valid_until   DATE,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_offers_business ON offers(business_id);
```

**RLS**: Active offers readable by all. Writable by business owner only.

### 3.13 bookings

```sql
CREATE TABLE bookings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  time          TIME NOT NULL,
  party_size    SMALLINT,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','confirmed','cancelled','completed','no_show')),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_user     ON bookings(user_id);
CREATE INDEX idx_bookings_business ON bookings(business_id, date);
```

**RLS**: Users can read their own bookings. Business owners can read bookings for their business.

### 3.14 messages

```sql
CREATE TABLE messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id   UUID REFERENCES businesses(id) ON DELETE SET NULL,
  text          TEXT NOT NULL,
  is_read       BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_sender   ON messages(sender_id, created_at DESC);
CREATE INDEX idx_messages_receiver ON messages(receiver_id, created_at DESC);
CREATE INDEX idx_messages_thread   ON messages(
  LEAST(sender_id, receiver_id),
  GREATEST(sender_id, receiver_id),
  created_at DESC
);
```

**RLS**: Users can only read messages where they are sender or receiver.

### 3.15 notifications

```sql
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT,
  type        TEXT NOT NULL
                CHECK (type IN ('system','lead','review','booking','message','offer','broadcast')),
  data        JSONB,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
```

**RLS**: Users can only read/update their own notifications.

### 3.16 admin_logs

```sql
CREATE TABLE admin_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id      UUID NOT NULL REFERENCES users(id),
  action        TEXT NOT NULL,
  target_type   TEXT NOT NULL,  -- 'business' | 'user' | 'category' | 'report'
  target_id     UUID,
  note          TEXT,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_logs_admin  ON admin_logs(admin_id, created_at DESC);
CREATE INDEX idx_admin_logs_target ON admin_logs(target_type, target_id);
```

**RLS**: Readable and insertable by admins only.

### 3.17 reports

```sql
CREATE TABLE reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  reason        TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','dismissed','actioned')),
  resolved_by   UUID REFERENCES users(id),
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_business ON reports(business_id);
CREATE INDEX idx_reports_status   ON reports(status);
```

**RLS**: Reporters can insert. Admins can read and update all.

---

## 4. Component Architecture

### 4.1 apps/web Route Structure

```
app/
├── layout.tsx                    # Root layout: fonts, providers, Sentry
├── (auth)/
│   ├── layout.tsx                # Unauthenticated layout (no nav)
│   ├── login/
│   │   └── page.tsx              # OTP + Google OAuth login
│   └── onboarding/
│       └── page.tsx              # 3-slide onboarding (first-time users)
├── (customer)/
│   ├── layout.tsx                # Bottom nav, location context
│   ├── page.tsx                  # Home: greeting, categories, popular, mini-map
│   ├── search/
│   │   └── page.tsx              # Search results: list/map toggle
│   ├── listing/
│   │   └── [id]/
│   │       └── page.tsx          # Single listing detail
│   ├── saved/
│   │   ├── page.tsx              # Saved places + collections grid
│   │   └── [collectionId]/
│   │       └── page.tsx          # Collection detail
│   ├── chats/
│   │   ├── page.tsx              # Conversation list
│   │   └── [threadId]/
│   │       └── page.tsx          # Chat thread
│   ├── notifications/
│   │   └── page.tsx              # Notification feed
│   └── account/
│       ├── page.tsx              # User dashboard
│       ├── edit/
│       │   └── page.tsx          # Edit profile
│       ├── bookings/
│       │   └── page.tsx          # Booking history
│       └── history/
│           └── page.tsx          # Search history
├── (business)/
│   ├── layout.tsx                # Business sidebar layout
│   ├── add-business/
│   │   └── page.tsx              # Multi-step form (client component)
│   └── dashboard/
│       ├── page.tsx              # Business dashboard overview
│       ├── listing/
│       │   └── page.tsx          # Edit listing
│       ├── analytics/
│       │   └── page.tsx          # Analytics detail
│       ├── leads/
│       │   └── page.tsx          # Leads management
│       ├── reviews/
│       │   └── page.tsx          # Reviews management
│       ├── messages/
│       │   └── page.tsx          # Business messages
│       ├── photos/
│       │   └── page.tsx          # Photo management
│       ├── offers/
│       │   └── page.tsx          # Offers management
│       └── bookings/
│           └── page.tsx          # Booking management
└── api/                          # Next.js Route Handlers (thin proxies)
    └── auth/
        └── callback/
            └── route.ts          # Google OAuth callback
```

### 4.2 apps/admin Route Structure

```
app/
├── layout.tsx                    # Admin root layout
├── login/
│   └── page.tsx                  # Admin login (email + password)
└── (admin)/
    ├── layout.tsx                # Sidebar + topbar layout
    ├── dashboard/
    │   └── page.tsx              # KPIs, alerts, recent activity
    ├── approvals/
    │   └── page.tsx              # Pending business queue
    ├── businesses/
    │   ├── page.tsx              # All businesses table
    │   └── [id]/
    │       └── page.tsx          # Business detail (admin view)
    ├── users/
    │   ├── page.tsx              # Users table
    │   └── [id]/
    │       └── page.tsx          # User detail
    ├── reports/
    │   └── page.tsx              # Reports & flags queue
    ├── categories/
    │   └── page.tsx              # Category management
    ├── analytics/
    │   └── page.tsx              # Platform analytics
    ├── notifications/
    │   └── page.tsx              # Broadcast notifications
    ├── logs/
    │   └── page.tsx              # Admin activity log
    └── settings/
        └── page.tsx              # Admin settings
```

### 4.3 Key Shared Components

| Component | Location | Purpose |
|---|---|---|
| `BusinessCard` | `components/listings/` | Listing card for search results and saved places |
| `MapView` | `components/maps/` | Google Maps wrapper with marker clustering |
| `BottomSheet` | `components/shared/` | Mobile-friendly slide-up panel |
| `SearchBar` | `components/search/` | Debounced search input with suggestions |
| `CategoryPill` | `components/search/` | Tappable category filter chip |
| `RatingStars` | `components/shared/` | Star rating display and input |
| `PhotoGallery` | `components/listings/` | Swipeable full-screen image gallery |
| `AddBusinessForm` | `components/business/` | Multi-step form with step state |
| `StatsCard` | `components/dashboard/` | KPI card with trend indicator |
| `AnalyticsChart` | `components/dashboard/` | Recharts wrapper for line/donut charts |
| `NotificationBell` | `components/shared/` | Bell icon with unread badge |
| `PlusGate` | `components/shared/` | Feature gate wrapper for Plus features |

### 4.4 Zustand Store Structure

```typescript
// lib/stores/authStore.ts
interface AuthStore {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  signOut: () => Promise<void>;
}

// lib/stores/locationStore.ts
interface LocationStore {
  lat: number | null;
  lng: number | null;
  city: string | null;
  radius: number;           // km, default 5
  isLocating: boolean;
  setLocation: (lat: number, lng: number, city?: string) => void;
  setRadius: (radius: number) => void;
}

// lib/stores/searchStore.ts
interface SearchStore {
  query: string;
  filters: SearchFilters;
  results: Business[];
  total: number;
  page: number;
  isLoading: boolean;
  viewMode: 'list' | 'map';
  setQuery: (q: string) => void;
  setFilters: (f: Partial<SearchFilters>) => void;
  setViewMode: (mode: 'list' | 'map') => void;
  fetchResults: () => Promise<void>;
}

// lib/stores/notificationStore.ts
interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  addNotification: (n: Notification) => void;
}

// lib/stores/chatStore.ts
interface ChatStore {
  threads: Thread[];
  activeThread: string | null;
  messages: Record<string, Message[]>;
  setActiveThread: (id: string) => void;
  addMessage: (threadId: string, msg: Message) => void;
}
```

---

## 5. API Design

All API endpoints are prefixed with `/api/v1`. Authentication uses Bearer tokens (Supabase JWT) in the `Authorization` header. The API returns a consistent envelope:

```typescript
// Success
{ "data": <payload>, "meta": { "page": 1, "total": 42 } }

// Error
{ "error": { "code": "NOT_FOUND", "message": "Business not found" } }
```

### 5.1 Auth Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/send-otp` | None | Send OTP to phone number |
| POST | `/auth/verify-otp` | None | Verify OTP, return JWT |
| POST | `/auth/google` | None | Exchange Google OAuth code for JWT |
| POST | `/auth/refresh` | Refresh token | Refresh access token |
| POST | `/auth/logout` | Bearer | Invalidate session |

**POST /auth/send-otp**
```typescript
// Request
{ phone: string }  // e.g. "+919876543210"

// Response
{ data: { message: "OTP sent" } }
```

**POST /auth/verify-otp**
```typescript
// Request
{ phone: string; otp: string }

// Response
{
  data: {
    access_token: string;
    refresh_token: string;
    user: { id: string; role: string; name: string | null }
  }
}
```

### 5.2 Business Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/businesses/search` | Optional | Full-text + geospatial search |
| GET | `/businesses/:id` | Optional | Single business detail |
| POST | `/businesses` | Bearer (business) | Create new listing |
| PUT | `/businesses/:id` | Bearer (owner) | Update listing |
| DELETE | `/businesses/:id` | Bearer (owner/admin) | Delete listing |
| GET | `/businesses/:id/reviews` | Optional | Paginated reviews |
| POST | `/businesses/:id/reviews` | Bearer | Submit review |
| GET | `/businesses/:id/photos` | Optional | Business photos |
| GET | `/businesses/:id/offers` | Optional | Active offers |
| POST | `/businesses/:id/leads` | Optional | Record a lead event |

**GET /businesses/search**
```typescript
// Query params
{
  q?: string;           // search query
  lat: number;
  lng: number;
  radius?: number;      // km, default 5, max 50 (10 for free)
  category_id?: string;
  sort?: 'relevance' | 'distance' | 'rating' | 'newest';
  open_now?: boolean;
  min_rating?: number;
  page?: number;        // default 1
  limit?: number;       // default 20, max 50
}

// Response
{
  data: Business[];
  meta: { page: number; total: number; radius_km: number }
}
```

**POST /businesses/:id/leads**
```typescript
// Request
{ type: 'call' | 'direction' | 'whatsapp' | 'save' | 'view' | 'website' }

// Response
{ data: { recorded: true } }
```

### 5.3 User Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/user/profile` | Bearer | Get own profile |
| PUT | `/user/profile` | Bearer | Update profile |
| GET | `/user/saved` | Bearer | Get saved places |
| POST | `/user/saved` | Bearer | Save a business |
| DELETE | `/user/saved/:id` | Bearer | Unsave a business |
| GET | `/user/collections` | Bearer | Get collections |
| POST | `/user/collections` | Bearer | Create collection |
| PUT | `/user/collections/:id` | Bearer | Rename collection |
| DELETE | `/user/collections/:id` | Bearer | Delete collection |
| GET | `/user/search-history` | Bearer | Get search history |
| DELETE | `/user/search-history` | Bearer | Clear search history |
| GET | `/user/notifications` | Bearer | Get notifications |
| PATCH | `/user/notifications/:id/read` | Bearer | Mark notification read |
| GET | `/user/bookings` | Bearer | Get bookings |
| POST | `/user/bookings` | Bearer | Create booking |
| PATCH | `/user/bookings/:id/cancel` | Bearer | Cancel booking |

**POST /user/saved**
```typescript
// Request
{ business_id: string; collection_id?: string }

// Response (success)
{ data: SavedPlace }

// Response (limit reached — free tier)
{ error: { code: "SAVE_LIMIT_REACHED", message: "Upgrade to Plus to save more places" } }
```

### 5.4 Business Dashboard Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/dashboard/stats` | Bearer (owner) | Overview stats (views, calls, etc.) |
| GET | `/dashboard/analytics` | Bearer (owner) | Time-series analytics |
| GET | `/dashboard/leads` | Bearer (owner) | Lead feed |
| GET | `/dashboard/reviews` | Bearer (owner) | Reviews with reply |
| POST | `/dashboard/reviews/:id/reply` | Bearer (owner) | Reply to review |
| GET | `/dashboard/offers` | Bearer (owner) | Offers list |
| POST | `/dashboard/offers` | Bearer (owner) | Create offer |
| PUT | `/dashboard/offers/:id` | Bearer (owner) | Update offer |
| DELETE | `/dashboard/offers/:id` | Bearer (owner) | Delete offer |
| GET | `/dashboard/bookings` | Bearer (owner) | Bookings list |
| PATCH | `/dashboard/bookings/:id/status` | Bearer (owner) | Update booking status |

**GET /dashboard/analytics**
```typescript
// Query params
{ period: '7d' | '30d' | '90d' }  // 90d requires Plus

// Response
{
  data: {
    views: TimeSeriesPoint[];
    leads_by_type: { type: string; count: number }[];
    top_hours: { hour: number; views: number }[];
  }
}
```

### 5.5 Admin Endpoints

All admin endpoints require Bearer token with `role = 'admin'`.

| Method | Path | Description |
|---|---|---|
| GET | `/admin/dashboard/stats` | Platform KPIs |
| GET | `/admin/businesses` | All businesses (filterable) |
| PUT | `/admin/businesses/:id/approve` | Approve listing |
| PUT | `/admin/businesses/:id/reject` | Reject with reason |
| PUT | `/admin/businesses/:id/suspend` | Suspend listing |
| PUT | `/admin/businesses/:id/verify` | Toggle verified badge |
| GET | `/admin/users` | All users (filterable) |
| PUT | `/admin/users/:id/suspend` | Suspend user |
| PUT | `/admin/users/:id/role` | Change user role |
| GET | `/admin/reports` | Reports queue |
| PUT | `/admin/reports/:id/resolve` | Resolve report |
| GET | `/admin/categories` | All categories |
| POST | `/admin/categories` | Create category |
| PUT | `/admin/categories/:id` | Update category |
| DELETE | `/admin/categories/:id` | Delete category |
| POST | `/admin/notifications/broadcast` | Send broadcast notification |
| GET | `/admin/logs` | Admin activity log |

**PUT /admin/businesses/:id/reject**
```typescript
// Request
{ reason: string }

// Response
{ data: { id: string; status: 'rejected' } }
```

**POST /admin/notifications/broadcast**
```typescript
// Request
{
  title: string;
  body: string;
  target: 'all' | 'customers' | 'businesses' | 'city';
  city?: string;
  schedule_at?: string;  // ISO timestamp, null = send now
}

// Response
{ data: { queued: number } }
```

---

## 6. Search Architecture

### 6.1 Overview

Search combines PostgreSQL full-text search (FTS) with PostGIS geospatial filtering in a single query. This avoids a separate search service while delivering sub-200ms results for typical queries.

### 6.2 Core SQL Query Pattern

```sql
SELECT
  b.*,
  ST_Distance(b.location, ST_MakePoint($lng, $lat)::geography) / 1000 AS distance_km,
  ts_rank(b.search_vector, query) AS text_rank
FROM
  businesses b,
  plainto_tsquery('english', $query) query
WHERE
  b.status = 'active'
  AND ST_DWithin(
    b.location,
    ST_MakePoint($lng, $lat)::geography,
    $radius_meters          -- e.g. 5000 for 5 km
  )
  AND ($query = '' OR b.search_vector @@ query)
  AND ($category_id IS NULL OR b.category_id = $category_id)
  AND ($open_now = false OR is_open_now(b.id))  -- function checks business_hours
ORDER BY
  CASE $sort
    WHEN 'distance'   THEN distance_km
    WHEN 'rating'     THEN -b.rating_avg
    WHEN 'newest'     THEN EXTRACT(EPOCH FROM -b.created_at)
    ELSE -(ts_rank(b.search_vector, query) * 0.6 + (1 / NULLIF(distance_km, 0)) * 0.4)
  END
LIMIT $limit OFFSET $offset;
```

### 6.3 Indexing Strategy

| Index | Type | Purpose |
|---|---|---|
| `businesses.location` | GIST | PostGIS spatial queries (`ST_DWithin`) |
| `businesses.search_vector` | GIN | Full-text search (`@@` operator) |
| `businesses.status` | B-tree | Filter active listings |
| `businesses.category_id` | B-tree | Category filter |
| `businesses.city` | B-tree | City-scoped queries |
| `businesses.rating_avg` | B-tree | Sort by rating |

### 6.4 Radius Enforcement

The API enforces radius limits based on subscription tier before executing the query:

```typescript
function enforceRadius(requestedRadius: number, user: User | null): number {
  const maxRadius = user?.plus_expires_at && new Date(user.plus_expires_at) > new Date()
    ? 50   // Plus tier
    : 10;  // Free tier
  return Math.min(requestedRadius, maxRadius);
}
```

### 6.5 Search Vector Maintenance

The `search_vector` column is updated automatically via a `BEFORE INSERT OR UPDATE` trigger (see §3.2). For bulk re-indexing after schema changes:

```sql
UPDATE businesses
SET search_vector =
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(city, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(address, '')), 'D');
```

### 6.6 Autocomplete / Suggestions

Suggestions are served from a separate lightweight query against `search_history` (user's own past queries) and a `popular_searches` materialized view refreshed hourly:

```sql
-- Materialized view for popular searches
CREATE MATERIALIZED VIEW popular_searches AS
SELECT query, count(*) AS frequency
FROM search_history
WHERE created_at > now() - interval '7 days'
GROUP BY query
ORDER BY frequency DESC
LIMIT 100;
```

---

## 7. Authentication Flow

### 7.1 OTP Flow

```
1. User enters phone number (+91XXXXXXXXXX)
   → Client: POST /auth/send-otp { phone }
   → API: calls Twilio Verify API to send SMS OTP
   → Response: { message: "OTP sent" }

2. User enters 6-digit OTP
   → Client: POST /auth/verify-otp { phone, otp }
   → API: calls Twilio Verify check endpoint
   → If valid: calls supabase.auth.signInWithOtp() or creates user if new
   → Supabase returns { access_token, refresh_token, user }
   → API reads users.role for the Supabase user ID
   → Response: { access_token, refresh_token, user: { id, role, name } }

3. Client stores tokens
   → access_token: in-memory (Zustand authStore)
   → refresh_token: httpOnly cookie (set by API via Set-Cookie header)
   → Role-based redirect:
       customer  → /
       business  → /dashboard
       admin     → /admin/dashboard
```

### 7.2 Google OAuth Flow

```
1. User clicks "Continue with Google"
   → Client: redirects to Supabase OAuth URL
     supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: '/api/auth/callback' })

2. Google authenticates user, redirects to /api/auth/callback?code=...

3. Next.js Route Handler /api/auth/callback
   → Exchanges code for session via supabase.auth.exchangeCodeForSession(code)
   → Reads or creates users row (upsert on email)
   → Redirects to role-appropriate page

4. Client receives session via Supabase client-side listener
   → supabase.auth.onAuthStateChange((event, session) => { ... })
   → Updates Zustand authStore
```

### 7.3 JWT Refresh Strategy

```typescript
// lib/api/client.ts — Axios interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const { data } = await axios.post('/auth/refresh');
      // Update in-memory token
      authStore.getState().setSession(data.session);
      error.config.headers['Authorization'] = `Bearer ${data.access_token}`;
      return axiosInstance(error.config);
    }
    return Promise.reject(error);
  }
);
```

Refresh tokens are rotated on each use. Supabase handles token rotation automatically; the API proxies the refresh endpoint to keep refresh tokens in httpOnly cookies.

### 7.4 Role-Based Route Protection

```typescript
// middleware.ts (Next.js)
export async function middleware(request: NextRequest) {
  const token = request.cookies.get('sb-access-token')?.value;
  const { data: { user } } = await supabase.auth.getUser(token);

  // Protect /dashboard routes — business role required
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!user || user.role !== 'business') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Protect /admin routes — admin role required
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user || user.role !== 'admin') {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }
}
```

### 7.5 RLS Enforcement

Every database operation from the API uses the user's JWT, not the service role key, so Supabase RLS policies are enforced at the database level. The service role key is only used for:
- Admin operations (approve/reject businesses, broadcast notifications)
- Lead recording (anonymous users can trigger lead events)
- Sending notifications (server-side inserts)

---

## 8. Real-time Architecture

### 8.1 Supabase Realtime Channels

GetNear uses Supabase Realtime for two features: messaging and notifications. Both use PostgreSQL change events broadcast over WebSocket.

```typescript
// Messaging subscription (in ChatThread component)
const channel = supabase
  .channel(`messages:thread:${threadId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `receiver_id=eq.${currentUserId}`,
    },
    (payload) => {
      chatStore.getState().addMessage(threadId, payload.new as Message);
    }
  )
  .subscribe();

// Cleanup on unmount
return () => { supabase.removeChannel(channel); };
```

```typescript
// Notification subscription (in root layout)
const channel = supabase
  .channel(`notifications:${currentUserId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${currentUserId}`,
    },
    (payload) => {
      notificationStore.getState().addNotification(payload.new as Notification);
    }
  )
  .subscribe();
```

### 8.2 Message Thread Model

Threads are derived — there is no separate `threads` table. A thread is identified by the canonical pair `(LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id))`. The thread list query:

```sql
SELECT DISTINCT ON (
  LEAST(sender_id, receiver_id),
  GREATEST(sender_id, receiver_id)
)
  *,
  LEAST(sender_id, receiver_id) AS participant_a,
  GREATEST(sender_id, receiver_id) AS participant_b
FROM messages
WHERE sender_id = $uid OR receiver_id = $uid
ORDER BY
  LEAST(sender_id, receiver_id),
  GREATEST(sender_id, receiver_id),
  created_at DESC;
```

### 8.3 Presence (Typing Indicators)

Typing indicators use Supabase Realtime Presence (ephemeral, not persisted):

```typescript
channel.track({ typing: true, user_id: currentUserId });
channel.on('presence', { event: 'sync' }, () => {
  const state = channel.presenceState();
  // Show "typing..." if other participant is present with typing: true
});
```

---

## 9. File Storage

### 9.1 Supabase Storage Bucket Structure

```
supabase-storage/
├── business-photos/          # Public bucket
│   └── {business_id}/
│       ├── primary.webp
│       └── {photo_id}.webp
├── review-photos/            # Public bucket
│   └── {review_id}/
│       └── {photo_id}.webp
└── avatars/                  # Public bucket
    └── {user_id}/
        └── avatar.webp
```

All buckets are public (read). Write access is controlled by Storage RLS policies matching the database RLS rules.

### 9.2 Upload Flow (Business Photos)

```typescript
// 1. Client selects file(s)
// 2. Client-side resize + convert to WebP (using browser-image-compression)
const compressed = await imageCompression(file, {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  fileType: 'image/webp',
});

// 3. Upload to Supabase Storage
const path = `${businessId}/${crypto.randomUUID()}.webp`;
const { data, error } = await supabase.storage
  .from('business-photos')
  .upload(path, compressed, { contentType: 'image/webp' });

// 4. Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('business-photos')
  .getPublicUrl(path);

// 5. Insert record into business_photos table
await api.post(`/businesses/${businessId}/photos`, {
  url: publicUrl,
  storage_path: path,
  is_primary: isFirst,
});
```

### 9.3 CDN Delivery

Supabase Storage URLs are served through Cloudflare CDN. Cache-Control headers are set to `public, max-age=31536000, immutable` for uploaded photos (content-addressed by UUID). The Next.js `<Image>` component handles:
- Automatic WebP conversion for browsers that don't receive WebP
- Responsive `srcset` generation
- Lazy loading with blur placeholder

```typescript
// next.config.ts
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};
```

---

## 10. GetNear Plus

### 10.1 Subscription State

The `users.plus_expires_at` column stores the subscription expiry timestamp. A user is considered Plus if `plus_expires_at IS NOT NULL AND plus_expires_at > now()`.

```typescript
// packages/types/src/index.ts
export function isPlus(user: User): boolean {
  return !!user.plus_expires_at && new Date(user.plus_expires_at) > new Date();
}
```

### 10.2 Feature Limits

| Feature | Free Limit | Plus Limit | Enforcement Layer |
|---|---|---|---|
| Saved places | 10 | Unlimited | API: `POST /user/saved` |
| Collections | 2 | Unlimited | API: `POST /user/collections` |
| Search radius | 10 km | 50 km | API: `GET /businesses/search` |
| Analytics period | 7 days | 90 days | API: `GET /dashboard/analytics` |
| Exclusive offers | Hidden | Visible | DB: `offers.plus_only` filter |

### 10.3 API Enforcement Pattern

```typescript
// Middleware applied to limit-enforced routes
async function enforcePlusLimit(
  req: Request,
  res: Response,
  next: NextFunction,
  limitCheck: (userId: string) => Promise<{ allowed: boolean; upgradeCode?: string }>
) {
  const { allowed, upgradeCode } = await limitCheck(req.user.id);
  if (!allowed) {
    return res.status(403).json({
      error: {
        code: upgradeCode ?? 'PLUS_REQUIRED',
        message: 'Upgrade to GetNear Plus to unlock this feature',
      },
    });
  }
  next();
}

// Example: save limit check
async function checkSaveLimit(userId: string) {
  const user = await db.users.findById(userId);
  if (isPlus(user)) return { allowed: true };
  const count = await db.saved_places.countByUser(userId);
  return count < 10 ? { allowed: true } : { allowed: false, upgradeCode: 'SAVE_LIMIT_REACHED' };
}
```

### 10.4 Frontend Feature Gate

```typescript
// components/shared/PlusGate.tsx
interface PlusGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PlusGate({ children, fallback }: PlusGateProps) {
  const user = useAuthStore((s) => s.user);
  if (isPlus(user)) return <>{children}</>;
  return fallback ? <>{fallback}</> : <PlusUpgradeBanner />;
}
```

---

## 11. Error Handling

### 11.1 API Error Envelope

All API errors follow a consistent shape:

```typescript
interface ApiError {
  error: {
    code: string;       // Machine-readable: 'NOT_FOUND', 'UNAUTHORIZED', etc.
    message: string;    // Human-readable description
    details?: unknown;  // Validation errors, field-level issues
  };
}
```

Standard HTTP status codes:
- `400` — Validation error (Zod parse failure)
- `401` — Missing or invalid JWT
- `403` — Insufficient permissions or Plus limit
- `404` — Resource not found
- `409` — Conflict (duplicate review, duplicate save)
- `429` — Rate limit exceeded
- `500` — Internal server error

### 11.2 Express Error Middleware

```typescript
// api/src/middleware/errorHandler.ts
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log to Sentry
  Sentry.captureException(err, { extra: { path: req.path, userId: req.user?.id } });

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: err.flatten() },
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
  }

  // Generic fallback
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
  });
}
```

### 11.3 Frontend Error Boundaries

```typescript
// components/shared/ErrorBoundary.tsx
export class ErrorBoundary extends React.Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <GenericErrorScreen />;
    }
    return this.props.children;
  }
}
```

Page-level error boundaries are placed in each route segment's `error.tsx` file (Next.js App Router convention).

### 11.4 Sentry Integration

```typescript
// Sentry is initialized in:
// apps/web/instrumentation.ts  (Next.js instrumentation hook)
// apps/admin/instrumentation.ts
// api/src/index.ts (Express)

// User context is set after login:
Sentry.setUser({ id: user.id, email: user.email ?? undefined });

// Breadcrumbs for API calls:
Sentry.addBreadcrumb({ category: 'api', message: `${method} ${path}`, level: 'info' });
```

---

## 12. Performance Strategy

### 12.1 Next.js Rendering Strategy

| Route | Strategy | Reason |
|---|---|---|
| Home page | ISR (60s revalidate) | Popular listings change slowly |
| Search results | SSR | Location-dependent, cannot cache |
| Listing detail | ISR (300s) + on-demand revalidation | Content changes on approval/edit |
| User dashboard | CSR | Fully personalized |
| Business dashboard | CSR | Real-time data |
| Admin pages | SSR | Always fresh, low traffic |

### 12.2 Image Optimization

- All uploaded photos are compressed to WebP before upload (client-side, max 1 MB)
- Next.js `<Image>` generates responsive `srcset` at 640, 1080, 1920px breakpoints
- Blur placeholder (`placeholder="blur"`) using a 10px base64 thumbnail stored alongside the full image
- Cloudflare CDN caches images at edge with 1-year TTL

### 12.3 Bundle Splitting

```typescript
// Heavy components are lazy-loaded
const MapView = dynamic(() => import('@/components/maps/MapView'), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

const PhotoGallery = dynamic(() => import('@/components/listings/PhotoGallery'), {
  loading: () => <GallerySkeleton />,
});

const AnalyticsChart = dynamic(() => import('@/components/dashboard/AnalyticsChart'), {
  loading: () => <ChartSkeleton />,
});
```

Google Maps JS API is loaded with `@next/third-parties/google` to defer loading until needed.

### 12.4 API Response Caching

```typescript
// Express route-level caching headers
router.get('/businesses/:id', (req, res, next) => {
  res.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
  next();
}, getBusinessHandler);

// Search results — no cache (location-dependent)
router.get('/businesses/search', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
}, searchHandler);
```

### 12.5 PWA Service Worker Caching Strategy

```javascript
// public/sw.js (Workbox-based)
// Strategy: Cache First for static assets, Network First for API
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({ cacheName: 'images', plugins: [new ExpirationPlugin({ maxEntries: 200 })] })
);

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({ cacheName: 'api-cache', networkTimeoutSeconds: 3 })
);

// Offline fallback for navigation
setCatchHandler(async ({ event }) => {
  if (event.request.destination === 'document') {
    return matchPrecache('/offline.html');
  }
});
```

---

## 13. Security

### 13.1 RLS Policy Summary

| Table | Read | Insert | Update | Delete |
|---|---|---|---|---|
| users | Own row; admin: all | Auth (signup) | Own row; admin: any | Admin only |
| businesses | All (status=active); owner: own | Authenticated | Owner: own; admin: any | Owner/admin |
| business_photos | All | Owner of business | Owner of business | Owner of business |
| reviews | All | Authenticated (1 per business) | Own review | Own review |
| saved_places | Own rows | Authenticated | Own rows | Own rows |
| collections | Own rows | Authenticated | Own rows | Own rows |
| leads | Owner of business | Service role | — | — |
| messages | Sender or receiver | Authenticated | Own messages | Own messages |
| notifications | Own rows | Service role | Own rows (is_read) | — |
| admin_logs | Admin only | Admin only | — | — |
| reports | Own + admin | Authenticated | Admin only | — |

### 13.2 Input Validation

All API inputs are validated with Zod schemas from `packages/validation`. Validation runs in Express middleware before the route handler:

```typescript
// api/src/middleware/validate.ts
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', details: result.error.flatten() },
      });
    }
    req.body = result.data;  // Replace with parsed (sanitized) data
    next();
  };
}
```

### 13.3 Rate Limiting

```typescript
// api/src/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,  // 10 minutes
  max: 3,                      // 3 OTP requests per 10 min per IP
  message: { error: { code: 'RATE_LIMITED', message: 'Too many OTP requests' } },
});

export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,         // 1 minute
  max: 60,                     // 60 searches per minute per IP
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,                    // General API limit
});
```

### 13.4 CORS Configuration

```typescript
// api/src/index.ts
app.use(cors({
  origin: [
    'https://getnear.in',
    'https://admin.getnear.in',
    process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '',
    process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : '',
  ].filter(Boolean),
  credentials: true,           // Allow cookies (refresh token)
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

### 13.5 Additional Security Measures

- **Helmet.js**: Sets security headers (CSP, HSTS, X-Frame-Options) on all API responses
- **SQL injection**: Prevented by parameterized queries (Supabase client uses prepared statements)
- **XSS**: Next.js escapes JSX by default; user-generated content is never rendered as `dangerouslySetInnerHTML`
- **CSRF**: Not applicable — API is stateless JWT; cookies are `SameSite=Strict`
- **Secrets**: All secrets in environment variables, never committed; Vercel/Railway secret management used

---

## 14. Correctness Properties

The following properties must hold true at all times in the system. They serve as the basis for property-based tests, integration tests, and invariant checks.

### 14.1 Search Radius Enforcement

**Property**: A search response must never contain a business whose distance from the requested coordinates exceeds the enforced radius for the user's tier.

- Free tier: `distance_km ≤ 10` for all results
- Plus tier: `distance_km ≤ 50` for all results
- If the client requests `radius > max_allowed`, the API silently clamps to `max_allowed` and returns the clamped value in `meta.radius_km`

```
∀ result ∈ search_response.data:
  result.distance_km ≤ meta.radius_km
  AND meta.radius_km ≤ max_radius_for_tier(user)
```

### 14.2 Save Limit Enforcement

**Property**: A free-tier user must never have more than 10 saved places. The 11th save attempt must return HTTP 403 with code `SAVE_LIMIT_REACHED`.

```
∀ user where NOT isPlus(user):
  count(saved_places where user_id = user.id) ≤ 10

  POST /user/saved when count = 10
    → HTTP 403, error.code = 'SAVE_LIMIT_REACHED'
```

### 14.3 Collection Limit Enforcement

**Property**: A free-tier user must never have more than 2 collections. The 3rd creation attempt must return HTTP 403 with code `COLLECTION_LIMIT_REACHED`.

```
∀ user where NOT isPlus(user):
  count(collections where user_id = user.id) ≤ 2

  POST /user/collections when count = 2
    → HTTP 403, error.code = 'COLLECTION_LIMIT_REACHED'
```

### 14.4 Lead Recording

**Property**: Every customer-initiated action of type `call`, `direction`, `whatsapp`, `save`, `view`, or `website` on a business listing must produce exactly one corresponding row in the `leads` table with the correct `business_id` and `type`.

```
∀ action ∈ {call, direction, whatsapp, save, view, website}:
  POST /businesses/:id/leads { type: action }
    → INSERT INTO leads (business_id = :id, type = action, ...)
    → count(leads where business_id = :id AND type = action) increases by 1
```

No lead is recorded for rejected, suspended, or pending businesses (API returns 404 for non-active businesses).

### 14.5 Review Uniqueness

**Property**: A user can have at most one review per business. A second review submission for the same `(user_id, business_id)` pair must return HTTP 409 with code `REVIEW_EXISTS`.

```
∀ (user_id, business_id):
  count(reviews where user_id = u AND business_id = b) ≤ 1

  POST /businesses/:id/reviews when review exists
    → HTTP 409, error.code = 'REVIEW_EXISTS'
```

This is enforced by the `UNIQUE (user_id, business_id)` constraint on the `reviews` table and caught at the API layer.

### 14.6 Booking Status Transitions

**Property**: Booking status transitions must follow the allowed state machine. Invalid transitions must be rejected with HTTP 400.

```
Allowed transitions:
  pending     → confirmed   (by business owner)
  pending     → cancelled   (by customer or business owner)
  confirmed   → completed   (by business owner)
  confirmed   → cancelled   (by customer or business owner)
  confirmed   → no_show     (by business owner)

Forbidden transitions (must return HTTP 400):
  completed   → any
  cancelled   → any
  no_show     → any
  pending     → completed
  pending     → no_show
```

```typescript
const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: [],
  no_show:   [],
};
```

### 14.7 Admin Log Completeness

**Property**: Every admin action that mutates a business or user record must produce exactly one corresponding row in `admin_logs` with the correct `admin_id`, `action`, `target_type`, and `target_id`.

```
∀ admin action ∈ {approve, reject, suspend, verify, delete, role_change}:
  mutation succeeds
    → INSERT INTO admin_logs (admin_id, action, target_type, target_id, ...)
    → Both the mutation and the log insert are in the same database transaction
```

If the log insert fails, the mutation must also be rolled back (atomic pair).

### 14.8 OTP Expiry

**Property**: An OTP must be rejected if it is submitted more than 10 minutes after it was issued. The response must be HTTP 400 with code `OTP_EXPIRED`.

```
∀ otp_verification:
  submitted_at - issued_at > 10 minutes
    → HTTP 400, error.code = 'OTP_EXPIRED'

  submitted_at - issued_at ≤ 10 minutes AND code is correct
    → HTTP 200, valid session returned
```

OTP expiry is enforced by Twilio Verify (configured TTL = 600 seconds). The API does not need to track expiry independently.

### 14.9 Round-Trip Serialization

**Property**: Any `Business`, `User`, `Review`, or `Booking` object serialized to JSON and deserialized back must be equal to the original object. No data loss or type coercion must occur.

```
∀ entity ∈ {Business, User, Review, Booking}:
  deserialize(serialize(entity)) deepEquals entity

Specific invariants:
  - Timestamps are ISO 8601 strings (not Unix integers)
  - UUIDs are lowercase hyphenated strings
  - Numeric fields (rating_avg, price) are numbers, not strings
  - Nullable fields are null, not undefined or omitted
  - Boolean fields are booleans, not 0/1
```

This is enforced by the Zod response schemas in `packages/validation` which parse all API responses on the client side. A parse failure is treated as an API error and reported to Sentry.

### 14.10 Business Visibility Invariant

**Property**: A business with `status != 'active'` must never appear in public search results or be accessible via `GET /businesses/:id` by non-owner, non-admin users.

```
∀ business where status ∈ {'pending', 'rejected', 'suspended'}:
  GET /businesses/search → business not in results
  GET /businesses/:id    → HTTP 404 (for unauthenticated or customer users)
  GET /businesses/:id    → HTTP 200 (for owner or admin)
```

### 14.11 Rating Average Consistency

**Property**: `businesses.rating_avg` must always equal the arithmetic mean of all `reviews.rating` values for that business, rounded to 2 decimal places. `businesses.review_count` must equal the count of reviews.

```
∀ business:
  rating_avg = ROUND(AVG(reviews.rating WHERE business_id = business.id), 2)
  review_count = COUNT(reviews WHERE business_id = business.id)
```

This is maintained by a PostgreSQL trigger on the `reviews` table that updates `businesses.rating_avg` and `businesses.review_count` on every INSERT, UPDATE, and DELETE.

```sql
CREATE OR REPLACE FUNCTION update_business_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE businesses
  SET
    rating_avg   = (SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE business_id = COALESCE(NEW.business_id, OLD.business_id)),
    review_count = (SELECT COUNT(*) FROM reviews WHERE business_id = COALESCE(NEW.business_id, OLD.business_id))
  WHERE id = COALESCE(NEW.business_id, OLD.business_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_business_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_business_rating();
```

---

*GetNear V1 Design Document — last updated May 2026*
