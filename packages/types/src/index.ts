/**
 * Shared TypeScript interfaces for the GetNear platform.
 * These types mirror the Supabase/PostgreSQL schema defined in design §3.
 */

// ---------------------------------------------------------------------------
// User (§3.1)
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  role: "customer" | "business" | "admin";
  is_active: boolean;
  /** ISO 8601 timestamp. Null means the user is not a Plus subscriber. */
  plus_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Category (§3.6) — referenced by Business, so defined first
// ---------------------------------------------------------------------------

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  /** Self-referential parent for sub-categories. */
  parent_id: string | null;
  display_order: number;
  is_active: boolean;
}

// ---------------------------------------------------------------------------
// Business (§3.2)
// ---------------------------------------------------------------------------

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Business {
  id: string;
  owner_id: string;
  name: string;
  slug: string | null;
  category_id: string | null;
  type: "physical" | "service" | "online";
  description: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pin: string | null;
  /** Latitude/longitude coordinates derived from the PostGIS GEOGRAPHY column. */
  location: GeoPoint | null;
  status: "pending" | "active" | "rejected" | "suspended";
  verified: boolean;
  rating_avg: number;
  review_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// BusinessPhoto (§3.3)
// ---------------------------------------------------------------------------

export interface BusinessPhoto {
  id: string;
  business_id: string;
  url: string;
  storage_path: string;
  is_primary: boolean;
  display_order: number;
  created_at: string;
}

// ---------------------------------------------------------------------------
// BusinessHours (§3.4)
// ---------------------------------------------------------------------------

export interface BusinessHours {
  id: string;
  business_id: string;
  /** Day of week: 0 = Sunday … 6 = Saturday */
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** HH:MM time string, e.g. "09:00". Null when is_closed is true. */
  open_time: string | null;
  /** HH:MM time string, e.g. "21:00". Null when is_closed is true. */
  close_time: string | null;
  is_closed: boolean;
}

// ---------------------------------------------------------------------------
// BusinessService (§3.5)
// ---------------------------------------------------------------------------

export interface BusinessService {
  id: string;
  business_id: string;
  name: string;
  /** Decimal price, e.g. 299.99. Null if not applicable. */
  price: number | null;
  description: string | null;
  display_order: number;
}

// ---------------------------------------------------------------------------
// Review (§3.7)
// ---------------------------------------------------------------------------

export interface Review {
  id: string;
  user_id: string;
  business_id: string;
  /** Integer star rating between 1 and 5 inclusive. */
  rating: 1 | 2 | 3 | 4 | 5;
  text: string | null;
  /** Array of Supabase Storage URLs for attached photos (max 3). */
  photos: string[];
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// SavedPlace (§3.8)
// ---------------------------------------------------------------------------

export interface SavedPlace {
  id: string;
  user_id: string;
  business_id: string;
  collection_id: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Collection (§3.9)
// ---------------------------------------------------------------------------

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Lead (§3.11)
// ---------------------------------------------------------------------------

export interface Lead {
  id: string;
  business_id: string;
  /** Null for anonymous (unauthenticated) interactions. */
  user_id: string | null;
  type: "call" | "direction" | "whatsapp" | "save" | "view" | "website";
  /** Arbitrary JSON metadata (e.g. device info, referrer). */
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Offer (§3.12)
// ---------------------------------------------------------------------------

export interface Offer {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  /** ISO 8601 date string, e.g. "2025-12-31". */
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Booking (§3.13)
// ---------------------------------------------------------------------------

export interface Booking {
  id: string;
  user_id: string;
  business_id: string;
  /** ISO 8601 date string, e.g. "2025-08-15". */
  date: string;
  /** HH:MM time string, e.g. "19:30". */
  time: string;
  party_size: number | null;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Message (§3.14)
// ---------------------------------------------------------------------------

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  /** The business context for the conversation thread. */
  business_id: string | null;
  text: string;
  is_read: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Notification (§3.15)
// ---------------------------------------------------------------------------

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type:
    | "system"
    | "lead"
    | "review"
    | "booking"
    | "message"
    | "offer"
    | "broadcast";
  /** Arbitrary JSON payload for deep-linking or extra context. */
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// AdminLog (§3.16)
// ---------------------------------------------------------------------------

export interface AdminLog {
  id: string;
  admin_id: string;
  action: string;
  /** Discriminator for the target entity: 'business' | 'user' | 'category' | 'report' */
  target_type: string;
  target_id: string | null;
  note: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Report (§3.17)
// ---------------------------------------------------------------------------

export interface Report {
  id: string;
  reporter_id: string;
  business_id: string;
  reason: string;
  status: "open" | "dismissed" | "actioned";
  /** Admin user id who resolved the report. Null while still open. */
  resolved_by: string | null;
  /** ISO 8601 timestamp. Null while still open. */
  resolved_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/**
 * Returns true when the user has an active GetNear Plus subscription.
 *
 * A user is considered Plus if `plus_expires_at` is set to a future timestamp.
 * This mirrors the free-tier enforcement described in Requirements 16.1 and 19.1.
 *
 * @example
 * if (isPlus(user)) {
 *   // allow 50 km search radius
 * }
 */
export function isPlus(user: User): boolean {
  if (user.plus_expires_at === null) {
    return false;
  }
  return new Date(user.plus_expires_at) > new Date();
}
