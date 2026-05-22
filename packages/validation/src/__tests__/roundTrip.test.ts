/**
 * Property 9: Round-Trip Serialization
 *
 * Validates: Requirements 19.4
 *
 * For each of the four core response schemas (User, Business, Review, Booking),
 * generate arbitrary valid objects, serialize to JSON, parse back with the Zod
 * schema, and assert deep equality with the original.
 *
 * **Validates: Requirements 19.4**
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  userResponseSchema,
  businessResponseSchema,
  reviewResponseSchema,
  bookingResponseSchema,
} from "../index";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Serialize to JSON and parse back with the given Zod schema. */
function roundTrip<T>(schema: { parse: (v: unknown) => T }, value: T): T {
  return schema.parse(JSON.parse(JSON.stringify(value)));
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** ISO 8601 datetime string arbitrary (Zod's isoDateTimeSchema requires offset). */
const isoDateTime = fc
  .date({ min: new Date("2000-01-01"), max: new Date("2099-12-31") })
  .map((d) => d.toISOString());

/** UUID v4 arbitrary. */
const uuid = fc.uuid();

/**
 * Email arbitrary that satisfies Zod's email validator.
 * Uses alphanumeric local parts and simple TLDs to avoid RFC-valid-but-Zod-invalid
 * addresses like `!@a.aa`.
 */
const zodEmail = fc
  .record({
    local: fc.stringMatching(/^[a-z][a-z0-9]{0,15}$/),
    domain: fc.stringMatching(/^[a-z][a-z0-9]{0,10}$/),
    tld: fc.constantFrom("com", "net", "org", "io", "dev"),
  })
  .map(({ local, domain, tld }) => `${local}@${domain}.${tld}`);

// User arbitrary — matches userResponseSchema
const userArb = fc.record({
  id: uuid,
  name: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
  phone: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
  email: fc.option(zodEmail, { nil: null }),
  avatar_url: fc.option(fc.webUrl(), { nil: null }),
  role: fc.constantFrom("customer" as const, "business" as const, "admin" as const),
  is_active: fc.boolean(),
  plus_expires_at: fc.option(isoDateTime, { nil: null }),
  created_at: isoDateTime,
  updated_at: isoDateTime,
});

// Business arbitrary — matches businessResponseSchema
const businessArb = fc.record({
  id: uuid,
  owner_id: uuid,
  name: fc.string({ minLength: 1, maxLength: 100 }),
  slug: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
  category_id: fc.option(uuid, { nil: null }),
  type: fc.constantFrom("physical" as const, "service" as const, "online" as const),
  description: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
  phone: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
  email: fc.option(zodEmail, { nil: null }),
  website: fc.option(fc.webUrl(), { nil: null }),
  whatsapp: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
  address: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: null }),
  city: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
  state: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
  pin: fc.option(fc.string({ minLength: 1, maxLength: 10 }), { nil: null }),
  lat: fc.option(fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }), { nil: null }),
  lng: fc.option(fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }), { nil: null }),
  status: fc.constantFrom(
    "pending" as const,
    "active" as const,
    "rejected" as const,
    "suspended" as const
  ),
  verified: fc.boolean(),
  rating_avg: fc.option(
    fc.double({ min: 0, max: 5, noNaN: true, noDefaultInfinity: true }),
    { nil: null }
  ),
  review_count: fc.option(fc.integer({ min: 0, max: 100000 }), { nil: null }),
  view_count: fc.option(fc.integer({ min: 0, max: 1000000 }), { nil: null }),
  created_at: isoDateTime,
  updated_at: isoDateTime,
});

// Review arbitrary — matches reviewResponseSchema
const reviewArb = fc.record({
  id: uuid,
  user_id: uuid,
  business_id: uuid,
  rating: fc.integer({ min: 1, max: 5 }),
  text: fc.option(fc.string({ maxLength: 1000 }), { nil: null }),
  photos: fc.option(fc.array(fc.webUrl(), { maxLength: 3 }), { nil: null }),
  created_at: isoDateTime,
  updated_at: isoDateTime,
});

/** YYYY-MM-DD date string arbitrary. */
const dateString = fc
  .date({ min: new Date("2000-01-01"), max: new Date("2099-12-31") })
  .map((d) => d.toISOString().slice(0, 10));

/** HH:MM time string arbitrary. */
const timeString = fc
  .record({
    h: fc.integer({ min: 0, max: 23 }),
    m: fc.integer({ min: 0, max: 59 }),
  })
  .map(({ h, m }) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);

// Booking arbitrary — matches bookingResponseSchema
const bookingArb = fc.record({
  id: uuid,
  user_id: uuid,
  business_id: uuid,
  date: dateString,
  time: timeString,
  party_size: fc.option(fc.integer({ min: 1, max: 100 }), { nil: null }),
  status: fc.constantFrom(
    "pending" as const,
    "confirmed" as const,
    "cancelled" as const,
    "completed" as const,
    "no_show" as const
  ),
  notes: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
  created_at: isoDateTime,
  updated_at: isoDateTime,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Property 9: Round-Trip Serialization", () => {
  it("userResponseSchema: JSON round-trip preserves all fields", () => {
    fc.assert(
      fc.property(userArb, (user) => {
        const result = roundTrip(userResponseSchema, user);
        expect(result).toEqual(user);
      }),
      { numRuns: 100 }
    );
  });

  it("businessResponseSchema: JSON round-trip preserves all fields", () => {
    fc.assert(
      fc.property(businessArb, (business) => {
        const result = roundTrip(businessResponseSchema, business);
        expect(result).toEqual(business);
      }),
      { numRuns: 100 }
    );
  });

  it("reviewResponseSchema: JSON round-trip preserves all fields", () => {
    fc.assert(
      fc.property(reviewArb, (review) => {
        const result = roundTrip(reviewResponseSchema, review);
        expect(result).toEqual(review);
      }),
      { numRuns: 100 }
    );
  });

  it("bookingResponseSchema: JSON round-trip preserves all fields", () => {
    fc.assert(
      fc.property(bookingArb, (booking) => {
        const result = roundTrip(bookingResponseSchema, booking);
        expect(result).toEqual(booking);
      }),
      { numRuns: 100 }
    );
  });
});
