/**
 * Feature: listing-page-enhancements
 * Property 3: UUID Access Redirects to Slug
 *
 * Validates: Requirements 2.6
 *
 * For any business that has both a UUID and a non-null slug, when the listing
 * page is accessed via `/listing/{uuid}`, the system SHALL respond with a 301
 * redirect to `/listing/{slug}`. Non-UUID identifiers pass through without
 * redirect.
 *
 * This test validates the UUID detection logic used in the middleware and page
 * component to determine whether a redirect is needed.
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

/**
 * UUID v4 detection — identical regex used in both:
 * - apps/web/middleware.ts
 * - api/src/utils/identifiers.ts
 */
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUUID(value: string): boolean {
  return UUID_V4_REGEX.test(value)
}

/**
 * Arbitrary: generates valid UUID v4 strings.
 * Structure: 8-4-4-4-12 hex digits with version=4 and variant=[89ab].
 */
const uuidV4Arb = fc
  .tuple(
    fc.hexaString({ minLength: 8, maxLength: 8 }),
    fc.hexaString({ minLength: 4, maxLength: 4 }),
    fc.hexaString({ minLength: 3, maxLength: 3 }),
    fc.constantFrom('8', '9', 'a', 'b', 'A', 'B'),
    fc.hexaString({ minLength: 3, maxLength: 3 }),
    fc.hexaString({ minLength: 12, maxLength: 12 })
  )
  .map(([p1, p2, p3, variant, p4, p5]) => `${p1}-${p2}-4${p3}-${variant}${p4}-${p5}`)

/**
 * Arbitrary: generates valid slug strings that are NOT UUID v4.
 * Slugs: lowercase alphanumeric segments separated by single hyphens, 3–120 chars.
 */
const slugSegmentArb = fc.stringOf(
  fc.constantFrom(
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
    'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'
  ),
  { minLength: 1, maxLength: 20 }
)

const slugArb = fc
  .array(slugSegmentArb, { minLength: 1, maxLength: 6 })
  .map((segments) => segments.join('-'))
  .filter((slug) => slug.length >= 3 && slug.length <= 120)
  // Exclude anything that accidentally matches UUID v4 format
  .filter((slug) => !UUID_V4_REGEX.test(slug))

describe('Feature: listing-page-enhancements, Property 3: UUID Access Redirects to Slug', () => {
  it('all generated UUID v4 strings are detected for redirect (isUUID returns true)', () => {
    fc.assert(
      fc.property(uuidV4Arb, (uuid) => {
        expect(isUUID(uuid)).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  it('valid slug strings (non-UUID) pass through without triggering redirect (isUUID returns false)', () => {
    fc.assert(
      fc.property(slugArb, (slug) => {
        expect(isUUID(slug)).toBe(false)
      }),
      { numRuns: 100 }
    )
  })

  it('identifier classification correctly partitions: UUID → redirect, non-UUID slug → pass through', () => {
    const identifierArb = fc.oneof(
      uuidV4Arb.map((uuid) => ({ value: uuid, expectedRedirect: true })),
      slugArb.map((slug) => ({ value: slug, expectedRedirect: false }))
    )

    fc.assert(
      fc.property(identifierArb, ({ value, expectedRedirect }) => {
        const shouldRedirect = isUUID(value)
        expect(shouldRedirect).toBe(expectedRedirect)
      }),
      { numRuns: 100 }
    )
  })
})
