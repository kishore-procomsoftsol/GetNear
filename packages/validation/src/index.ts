/**
 * @getnear/validation
 *
 * Shared Zod schemas for all API request bodies and response shapes.
 * Satisfies Requirements 19.1, 19.2, 19.3.
 *
 * All schemas are exported alongside their inferred TypeScript types so
 * consumers can use them for both runtime validation and static typing.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Primitives / reusable refinements
// ---------------------------------------------------------------------------

/**
 * E.164 phone number format: +[country code][number], 2–15 digits total.
 * Requirement 1.10
 */
const e164PhoneSchema = z
  .string()
  .regex(
    /^\+[1-9]\d{1,14}$/,
    "Phone number must be in E.164 format (e.g. +919876543210)"
  );

/** UUID v4 string */
const uuidSchema = z.string().uuid("Must be a valid UUID");

/** ISO 8601 date string (YYYY-MM-DD) */
const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

/** HH:MM time string */
const timeStringSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format");

/** ISO 8601 datetime string */
const isoDateTimeSchema = z
  .string()
  .datetime({ message: "Must be a valid ISO 8601 datetime" });

// ---------------------------------------------------------------------------
// Auth request schemas
// ---------------------------------------------------------------------------

/**
 * POST /auth/send-otp
 * Requirement 1.1, 1.10
 */
export const sendOtpSchema = z.object({
  phone: e164PhoneSchema,
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;

/**
 * POST /auth/verify-otp
 * Requirement 1.2, 1.3
 */
export const verifyOtpSchema = z.object({
  phone: e164PhoneSchema,
  otp: z
    .string()
    .regex(/^\d{6}$/, "OTP must be exactly 6 digits"),
});

export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

// ---------------------------------------------------------------------------
// Business request schemas
// ---------------------------------------------------------------------------

/**
 * A single day's business hours entry.
 * day: 0 = Sunday … 6 = Saturday
 */
const businessHoursEntrySchema = z.object({
  day: z
    .number()
    .int()
    .min(0, "Day must be between 0 (Sunday) and 6 (Saturday)")
    .max(6, "Day must be between 0 (Sunday) and 6 (Saturday)"),
  open_time: timeStringSchema.nullable().optional(),
  close_time: timeStringSchema.nullable().optional(),
  is_closed: z.boolean().default(false),
});

/**
 * A single service/menu item offered by the business.
 */
const businessServiceEntrySchema = z.object({
  name: z.string().min(1, "Service name is required"),
  price: z.number().nonnegative("Price must be a non-negative number").nullable().optional(),
  description: z.string().optional(),
  display_order: z.number().int().nonnegative().default(0),
});

/**
 * POST /businesses — Create a new business listing.
 * Field names use snake_case to match the API request body and database columns.
 * Requirement 7.3, 7.4, 7.6, 7.12, 19.1
 */
export const createBusinessSchema = z.object({
  name: z
    .string()
    .min(1, "Business name is required")
    .max(100, "Business name must not exceed 100 characters"),
  category_id: uuidSchema,
  type: z.enum(["physical", "service", "online"], {
    errorMap: () => ({ message: "Type must be one of: physical, service, online" }),
  }),
  description: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Must be a valid email address").optional(),
  website: z.string().url("Must be a valid URL").optional(),
  whatsapp: z.string().optional(),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().optional(),
  pin: z.string().optional(),
  lat: z
    .number()
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90"),
  lng: z
    .number()
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),
  /** Business hours for each day of the week (0–6). */
  hours: z.array(businessHoursEntrySchema).optional(),
  /** Services or menu items offered by the business. */
  services: z.array(businessServiceEntrySchema).optional(),
});

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;
export type BusinessHoursEntry = z.infer<typeof businessHoursEntrySchema>;
export type BusinessServiceEntry = z.infer<typeof businessServiceEntrySchema>;

/**
 * PUT /businesses/:id — Update an existing business listing.
 * All fields are optional (partial update).
 * Requirement 19.1
 */
export const updateBusinessSchema = createBusinessSchema.partial();

export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;

// ---------------------------------------------------------------------------
// Review request schema
// ---------------------------------------------------------------------------

/**
 * POST /businesses/:id/reviews
 * Requirement 15.1, 15.6, 19.1
 */
export const createReviewSchema = z.object({
  rating: z
    .number()
    .int("Rating must be an integer")
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must not exceed 5"),
  text: z
    .string()
    .max(1000, "Review text must not exceed 1000 characters")
    .optional(),
  photos: z
    .array(z.string().url("Each photo must be a valid URL"))
    .max(3, "A maximum of 3 photos are allowed per review")
    .optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

// ---------------------------------------------------------------------------
// Booking request schema
// ---------------------------------------------------------------------------

/**
 * POST /user/bookings
 * Field names use snake_case to match the API request body and database columns.
 * Requirement 12.1, 12.2, 19.1
 */
export const createBookingSchema = z.object({
  business_id: uuidSchema,
  date: dateStringSchema,
  time: timeStringSchema,
  party_size: z
    .number()
    .int("Party size must be an integer")
    .positive("Party size must be a positive number")
    .optional(),
  notes: z.string().optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

// ---------------------------------------------------------------------------
// Offer request schema
// ---------------------------------------------------------------------------

/**
 * POST /dashboard/offers
 * Field names use snake_case to match the API request body and database columns.
 * Requirement 8.7, 19.1
 */
export const createOfferSchema = z.object({
  title: z
    .string()
    .min(1, "Offer title is required")
    .max(100, "Offer title must not exceed 100 characters"),
  description: z.string().optional(),
  valid_until: dateStringSchema.optional(),
  is_active: z.boolean().default(true),
});

export type CreateOfferInput = z.infer<typeof createOfferSchema>;

// ---------------------------------------------------------------------------
// Broadcast notification request schema
// ---------------------------------------------------------------------------

/**
 * POST /admin/notifications/broadcast
 * Requirement 11.5, 11.6, 19.1
 */
export const broadcastNotificationSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(100, "Title must not exceed 100 characters"),
  body: z
    .string()
    .min(1, "Body is required")
    .max(500, "Body must not exceed 500 characters"),
  target: z.enum(["all", "by_city", "by_role", "individual"], {
    errorMap: () => ({
      message: "target must be one of: all, by_city, by_role, individual",
    }),
  }),
  city: z.string().optional(),
  role: z.enum(["customer", "business", "admin"]).optional(),
  user_id: uuidSchema.optional(),
  scheduled_at: isoDateTimeSchema.optional(),
});

export type BroadcastNotificationInput = z.infer<typeof broadcastNotificationSchema>;

// ---------------------------------------------------------------------------
// Response schemas (used for round-trip validation — Requirement 19.4)
// ---------------------------------------------------------------------------

/**
 * User response shape.
 * Matches the users table columns returned by the API.
 */
export const userResponseSchema = z.object({
  id: uuidSchema,
  name: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().email().nullable(),
  avatar_url: z.string().url().nullable(),
  role: z.enum(["customer", "business", "admin"]),
  is_active: z.boolean(),
  plus_expires_at: isoDateTimeSchema.nullable(),
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
});

export type UserResponse = z.infer<typeof userResponseSchema>;

/**
 * Business response shape.
 * Matches the businesses table columns returned by the API.
 */
export const businessResponseSchema = z.object({
  id: uuidSchema,
  owner_id: uuidSchema,
  name: z.string(),
  slug: z.string().nullable(),
  category_id: uuidSchema.nullable(),
  type: z.enum(["physical", "service", "online"]),
  description: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().email().nullable(),
  website: z.string().url().nullable(),
  whatsapp: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  pin: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  status: z.enum(["pending", "active", "rejected", "suspended"]),
  verified: z.boolean(),
  rating_avg: z.number().nullable(),
  review_count: z.number().int().nullable(),
  view_count: z.number().int().nullable(),
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
});

export type BusinessResponse = z.infer<typeof businessResponseSchema>;

/**
 * Review response shape.
 * Matches the reviews table columns returned by the API.
 */
export const reviewResponseSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  business_id: uuidSchema,
  rating: z.number().int().min(1).max(5),
  text: z.string().nullable(),
  photos: z.array(z.string()).nullable(),
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
});

export type ReviewResponse = z.infer<typeof reviewResponseSchema>;

/**
 * Booking response shape.
 * Matches the bookings table columns returned by the API.
 */
export const bookingResponseSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  business_id: uuidSchema,
  date: dateStringSchema,
  time: timeStringSchema,
  party_size: z.number().int().nullable(),
  status: z.enum(["pending", "confirmed", "cancelled", "completed", "no_show"]),
  notes: z.string().nullable(),
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
});

export type BookingResponse = z.infer<typeof bookingResponseSchema>;

// ---------------------------------------------------------------------------
// API envelope schemas (Requirement 19.3, 19.5)
// ---------------------------------------------------------------------------

/**
 * Pagination metadata included in list responses.
 * Requirement 19.5
 */
export const paginationMetaSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
  hasNextPage: z.boolean(),
});

export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

/**
 * Generic success envelope factory.
 * { data: T, error: null, meta?: PaginationMeta }
 * Requirement 19.3
 */
export function successEnvelopeSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema,
    error: z.null(),
    meta: paginationMetaSchema.optional(),
  });
}

/**
 * Generic error envelope.
 * { data: null, error: { code, message, fields? } }
 * Requirement 19.3
 */
export const errorEnvelopeSchema = z.object({
  data: z.null(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    fields: z.record(z.string(), z.array(z.string())).optional(),
  }),
  meta: z.undefined().optional(),
});

export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;
