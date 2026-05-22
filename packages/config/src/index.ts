/**
 * @getnear/config
 * Shared constants for the GetNear platform.
 * Requirements: 2.8, 16.1
 */

// ---------------------------------------------------------------------------
// Radius options (Req 2.8, 3.11, 16.1)
// ---------------------------------------------------------------------------

/** Available search radius values in kilometres */
export const RADIUS_OPTIONS = [1, 3, 5, 10, 50] as const;

export type RadiusOption = (typeof RADIUS_OPTIONS)[number];

/** Maximum search radius (km) for free-tier users */
export const FREE_RADIUS_MAX = 10;

/** Maximum search radius (km) for GetNear Plus users */
export const PLUS_RADIUS_MAX = 50;

// ---------------------------------------------------------------------------
// Booking statuses (Req 12)
// ---------------------------------------------------------------------------

export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

// ---------------------------------------------------------------------------
// Lead types (Req 4.4)
// ---------------------------------------------------------------------------

export const LEAD_TYPES = [
  "call",
  "direction",
  "whatsapp",
  "save",
  "view",
  "website",
] as const;

export type LeadType = (typeof LEAD_TYPES)[number];

// ---------------------------------------------------------------------------
// Notification types (Req 14)
// ---------------------------------------------------------------------------

export const NOTIFICATION_TYPES = [
  "system",
  "lead",
  "review",
  "booking",
  "message",
  "offer",
  "broadcast",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// ---------------------------------------------------------------------------
// GetNear Plus limits (Req 16.1, 8.9)
// ---------------------------------------------------------------------------

export const PLUS_LIMITS = {
  free: {
    savedPlaces: 10,
    collections: 2,
    radiusKm: 10,
    analyticsHistoryDays: 7,
  },
  plus: {
    savedPlaces: null,
    collections: null,
    radiusKm: 50,
    analyticsHistoryDays: 90,
  },
} as const;

// ---------------------------------------------------------------------------
// Categories seed data (Req 2.5, 10.5)
// ---------------------------------------------------------------------------

export interface CategorySeed {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  parent_id: string | null;
  display_order: number;
  is_active: true;
}

export const CATEGORIES: CategorySeed[] = [
  // ── Top-level ────────────────────────────────────────────────────────────
  {
    id: "a1b2c3d4-0001-0000-0000-000000000001",
    name: "Food",
    slug: "food",
    icon: "🍽️",
    color: "#FF6B35",
    parent_id: null,
    display_order: 1,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0001-0000-0000-000000000002",
    name: "Services",
    slug: "services",
    icon: "🔧",
    color: "#4ECDC4",
    parent_id: null,
    display_order: 2,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0001-0000-0000-000000000003",
    name: "Healthcare",
    slug: "healthcare",
    icon: "🏥",
    color: "#FF4757",
    parent_id: null,
    display_order: 3,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0001-0000-0000-000000000004",
    name: "Shops",
    slug: "shops",
    icon: "🛍️",
    color: "#A29BFE",
    parent_id: null,
    display_order: 4,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0001-0000-0000-000000000005",
    name: "ATM",
    slug: "atm",
    icon: "🏧",
    color: "#00B894",
    parent_id: null,
    display_order: 5,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0001-0000-0000-000000000006",
    name: "Entertainment",
    slug: "entertainment",
    icon: "🎭",
    color: "#FDCB6E",
    parent_id: null,
    display_order: 6,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0001-0000-0000-000000000007",
    name: "Education",
    slug: "education",
    icon: "📚",
    color: "#6C5CE7",
    parent_id: null,
    display_order: 7,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0001-0000-0000-000000000008",
    name: "Travel",
    slug: "travel",
    icon: "✈️",
    color: "#0984E3",
    parent_id: null,
    display_order: 8,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0001-0000-0000-000000000009",
    name: "Beauty",
    slug: "beauty",
    icon: "💄",
    color: "#FD79A8",
    parent_id: null,
    display_order: 9,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0001-0000-0000-000000000010",
    name: "Sports",
    slug: "sports",
    icon: "⚽",
    color: "#55EFC4",
    parent_id: null,
    display_order: 10,
    is_active: true,
  },

  // ── Food sub-categories ──────────────────────────────────────────────────
  {
    id: "a1b2c3d4-0002-0000-0000-000000000001",
    name: "Restaurants",
    slug: "restaurants",
    icon: "🍛",
    color: "#FF6B35",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000001",
    display_order: 1,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0002-0000-0000-000000000002",
    name: "Cafes",
    slug: "cafes",
    icon: "☕",
    color: "#FF6B35",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000001",
    display_order: 2,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0002-0000-0000-000000000003",
    name: "Bakeries",
    slug: "bakeries",
    icon: "🥐",
    color: "#FF6B35",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000001",
    display_order: 3,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0002-0000-0000-000000000004",
    name: "Fast Food",
    slug: "fast-food",
    icon: "🍔",
    color: "#FF6B35",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000001",
    display_order: 4,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0002-0000-0000-000000000005",
    name: "Juice Bars",
    slug: "juice-bars",
    icon: "🥤",
    color: "#FF6B35",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000001",
    display_order: 5,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0002-0000-0000-000000000006",
    name: "Sweet Shops",
    slug: "sweet-shops",
    icon: "🍬",
    color: "#FF6B35",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000001",
    display_order: 6,
    is_active: true,
  },

  // ── Services sub-categories ──────────────────────────────────────────────
  {
    id: "a1b2c3d4-0003-0000-0000-000000000001",
    name: "Salons",
    slug: "salons",
    icon: "💇",
    color: "#4ECDC4",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000002",
    display_order: 1,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0003-0000-0000-000000000002",
    name: "Laundry",
    slug: "laundry",
    icon: "👕",
    color: "#4ECDC4",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000002",
    display_order: 2,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0003-0000-0000-000000000003",
    name: "Repair",
    slug: "repair",
    icon: "🔨",
    color: "#4ECDC4",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000002",
    display_order: 3,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0003-0000-0000-000000000004",
    name: "Cleaning",
    slug: "cleaning",
    icon: "🧹",
    color: "#4ECDC4",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000002",
    display_order: 4,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0003-0000-0000-000000000005",
    name: "Tutoring",
    slug: "tutoring",
    icon: "📚",
    color: "#4ECDC4",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000002",
    display_order: 5,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0003-0000-0000-000000000006",
    name: "Photography",
    slug: "photography",
    icon: "📷",
    color: "#4ECDC4",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000002",
    display_order: 6,
    is_active: true,
  },

  // ── Healthcare sub-categories ────────────────────────────────────────────
  {
    id: "a1b2c3d4-0004-0000-0000-000000000001",
    name: "Hospitals",
    slug: "hospitals",
    icon: "🏥",
    color: "#FF4757",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000003",
    display_order: 1,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0004-0000-0000-000000000002",
    name: "Pharmacies",
    slug: "pharmacies",
    icon: "💊",
    color: "#FF4757",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000003",
    display_order: 2,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0004-0000-0000-000000000003",
    name: "Gyms",
    slug: "gyms",
    icon: "🏋️",
    color: "#FF4757",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000003",
    display_order: 3,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0004-0000-0000-000000000004",
    name: "Clinics",
    slug: "clinics",
    icon: "🩺",
    color: "#FF4757",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000003",
    display_order: 4,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0004-0000-0000-000000000005",
    name: "Dental",
    slug: "dental",
    icon: "🦷",
    color: "#FF4757",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000003",
    display_order: 5,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0004-0000-0000-000000000006",
    name: "Optical",
    slug: "optical",
    icon: "👓",
    color: "#FF4757",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000003",
    display_order: 6,
    is_active: true,
  },

  // ── Shops sub-categories ─────────────────────────────────────────────────
  {
    id: "a1b2c3d4-0005-0000-0000-000000000001",
    name: "Grocery",
    slug: "grocery",
    icon: "🛒",
    color: "#A29BFE",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000004",
    display_order: 1,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0005-0000-0000-000000000002",
    name: "Electronics",
    slug: "electronics",
    icon: "📱",
    color: "#A29BFE",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000004",
    display_order: 2,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0005-0000-0000-000000000003",
    name: "Clothing",
    slug: "clothing",
    icon: "👗",
    color: "#A29BFE",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000004",
    display_order: 3,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0005-0000-0000-000000000004",
    name: "Books",
    slug: "books",
    icon: "📖",
    color: "#A29BFE",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000004",
    display_order: 4,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0005-0000-0000-000000000005",
    name: "Hardware",
    slug: "hardware",
    icon: "🔩",
    color: "#A29BFE",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000004",
    display_order: 5,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0005-0000-0000-000000000006",
    name: "Stationery",
    slug: "stationery",
    icon: "✏️",
    color: "#A29BFE",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000004",
    display_order: 6,
    is_active: true,
  },

  // ── Entertainment sub-categories ─────────────────────────────────────────
  {
    id: "a1b2c3d4-0006-0000-0000-000000000001",
    name: "Cinemas",
    slug: "cinemas",
    icon: "🎬",
    color: "#FDCB6E",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000006",
    display_order: 1,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0006-0000-0000-000000000002",
    name: "Gaming",
    slug: "gaming",
    icon: "🎮",
    color: "#FDCB6E",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000006",
    display_order: 2,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0006-0000-0000-000000000003",
    name: "Parks",
    slug: "parks",
    icon: "🌳",
    color: "#FDCB6E",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000006",
    display_order: 3,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0006-0000-0000-000000000004",
    name: "Events",
    slug: "events",
    icon: "🎪",
    color: "#FDCB6E",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000006",
    display_order: 4,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0006-0000-0000-000000000005",
    name: "Nightlife",
    slug: "nightlife",
    icon: "🍻",
    color: "#FDCB6E",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000006",
    display_order: 5,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0006-0000-0000-000000000006",
    name: "Museums",
    slug: "museums",
    icon: "🏛️",
    color: "#FDCB6E",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000006",
    display_order: 6,
    is_active: true,
  },

  // ── Education sub-categories ──────────────────────────────────────────────
  {
    id: "a1b2c3d4-0007-0000-0000-000000000001",
    name: "Schools",
    slug: "schools",
    icon: "🏫",
    color: "#6C5CE7",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000007",
    display_order: 1,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0007-0000-0000-000000000002",
    name: "Colleges",
    slug: "colleges",
    icon: "🎓",
    color: "#6C5CE7",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000007",
    display_order: 2,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0007-0000-0000-000000000003",
    name: "Coaching",
    slug: "coaching",
    icon: "📝",
    color: "#6C5CE7",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000007",
    display_order: 3,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0007-0000-0000-000000000004",
    name: "Libraries",
    slug: "libraries",
    icon: "📚",
    color: "#6C5CE7",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000007",
    display_order: 4,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0007-0000-0000-000000000005",
    name: "Skill Dev",
    slug: "skill-dev",
    icon: "💡",
    color: "#6C5CE7",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000007",
    display_order: 5,
    is_active: true,
  },

  // ── Travel sub-categories ─────────────────────────────────────────────────
  {
    id: "a1b2c3d4-0008-0000-0000-000000000001",
    name: "Hotels",
    slug: "hotels",
    icon: "🏨",
    color: "#0984E3",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000008",
    display_order: 1,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0008-0000-0000-000000000002",
    name: "Hostels",
    slug: "hostels",
    icon: "🛏️",
    color: "#0984E3",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000008",
    display_order: 2,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0008-0000-0000-000000000003",
    name: "Transport",
    slug: "transport",
    icon: "🚌",
    color: "#0984E3",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000008",
    display_order: 3,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0008-0000-0000-000000000004",
    name: "Car Rental",
    slug: "car-rental",
    icon: "🚗",
    color: "#0984E3",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000008",
    display_order: 4,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0008-0000-0000-000000000005",
    name: "Travel Agents",
    slug: "travel-agents",
    icon: "🗺️",
    color: "#0984E3",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000008",
    display_order: 5,
    is_active: true,
  },

  // ── Beauty sub-categories ─────────────────────────────────────────────────
  {
    id: "a1b2c3d4-0009-0000-0000-000000000001",
    name: "Parlours",
    slug: "parlours",
    icon: "💅",
    color: "#FD79A8",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000009",
    display_order: 1,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0009-0000-0000-000000000002",
    name: "Spas",
    slug: "spas",
    icon: "🧖",
    color: "#FD79A8",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000009",
    display_order: 2,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0009-0000-0000-000000000003",
    name: "Tattoo",
    slug: "tattoo",
    icon: "🎨",
    color: "#FD79A8",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000009",
    display_order: 3,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0009-0000-0000-000000000004",
    name: "Makeup",
    slug: "makeup",
    icon: "💄",
    color: "#FD79A8",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000009",
    display_order: 4,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0009-0000-0000-000000000005",
    name: "Nail Art",
    slug: "nail-art",
    icon: "💅",
    color: "#FD79A8",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000009",
    display_order: 5,
    is_active: true,
  },

  // ── Sports sub-categories ─────────────────────────────────────────────────
  {
    id: "a1b2c3d4-0010-0000-0000-000000000001",
    name: "Cricket",
    slug: "cricket",
    icon: "🏏",
    color: "#55EFC4",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000010",
    display_order: 1,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0010-0000-0000-000000000002",
    name: "Football",
    slug: "football",
    icon: "⚽",
    color: "#55EFC4",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000010",
    display_order: 2,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0010-0000-0000-000000000003",
    name: "Badminton",
    slug: "badminton",
    icon: "🏸",
    color: "#55EFC4",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000010",
    display_order: 3,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0010-0000-0000-000000000004",
    name: "Swimming",
    slug: "swimming",
    icon: "🏊",
    color: "#55EFC4",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000010",
    display_order: 4,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0010-0000-0000-000000000005",
    name: "Yoga",
    slug: "yoga",
    icon: "🧘",
    color: "#55EFC4",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000010",
    display_order: 5,
    is_active: true,
  },
  {
    id: "a1b2c3d4-0010-0000-0000-000000000006",
    name: "Fitness",
    slug: "fitness",
    icon: "🏋️",
    color: "#55EFC4",
    parent_id: "a1b2c3d4-0001-0000-0000-000000000010",
    display_order: 6,
    is_active: true,
  },
];

// ---------------------------------------------------------------------------
// Additional shared constants
// ---------------------------------------------------------------------------

export const USER_ROLES = ["customer", "business", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const BUSINESS_STATUSES = [
  "pending",
  "active",
  "rejected",
  "suspended",
] as const;
export type BusinessStatus = (typeof BUSINESS_STATUSES)[number];

export const BUSINESS_TYPES = ["physical", "service", "online"] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];
