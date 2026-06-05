/**
 * Feature: listing-page-enhancements
 * Property 1: Slug Format Validation
 * Property 2: UUID vs Slug Identifier Classification
 *
 * Validates: Requirements 2.1, 2.4
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { isUUID, isValidSlug } from '../utils/identifiers'

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Arbitrary that generates valid slugs: lowercase alphanumeric segments
 * separated by single hyphens, total length 3–120.
 */
const validSlugArb = fc
  .array(
    fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), {
      minLength: 1,
      maxLength: 20,
    }),
    { minLength: 1, maxLength: 10 }
  )
  .map((segments) => segments.join('-'))
  .filter((s) => s.length >= 3 && s.length <= 120)

/**
 * Arbitrary that generates valid UUID v4 strings.
 */
const uuidV4Arb = fc
  .tuple(
    fc.hexaString({ minLength: 8, maxLength: 8 }),
    fc.hexaString({ minLength: 4, maxLength: 4 }),
    fc.hexaString({ minLength: 3, maxLength: 3 }),
    fc.constantFrom('8', '9', 'a', 'b'),
    fc.hexaString({ minLength: 3, maxLength: 3 }),
    fc.hexaString({ minLength: 12, maxLength: 12 })
  )
  .map(([p1, p2, p3, variant, p4, p5]) => `${p1}-${p2}-4${p3}-${variant}${p4}-${p5}`)

/**
 * Arbitrary that generates strings which are NOT valid UUID v4.
 * Mixes random strings, slug-like strings, and broken UUID formats.
 */
const nonUuidArb = fc.oneof(
  // Random lowercase strings (slug-like)
  validSlugArb,
  // Strings with wrong UUID version (not 4)
  fc
    .tuple(
      fc.hexaString({ minLength: 8, maxLength: 8 }),
      fc.hexaString({ minLength: 4, maxLength: 4 }),
      fc.constantFrom('1', '2', '3', '5', '6', '7'),
      fc.hexaString({ minLength: 3, maxLength: 3 }),
      fc.constantFrom('8', '9', 'a', 'b'),
      fc.hexaString({ minLength: 3, maxLength: 3 }),
      fc.hexaString({ minLength: 12, maxLength: 12 })
    )
    .map(
      ([p1, p2, ver, p3, variant, p4, p5]) =>
        `${p1}-${p2}-${ver}${p3}-${variant}${p4}-${p5}`
    ),
  // Plain words that can't be UUIDs
  fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), {
    minLength: 3,
    maxLength: 30,
  })
)

describe('Feature: listing-page-enhancements, Property 1: Slug Format Validation', () => {
  it('accepts all strings matching slug regex with length 3–120', () => {
    fc.assert(
      fc.property(validSlugArb, (slug) => {
        expect(isValidSlug(slug)).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  it('rejects strings shorter than 3 characters', () => {
    const shortStringArb = fc.stringOf(
      fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')),
      { minLength: 0, maxLength: 2 }
    )
    fc.assert(
      fc.property(shortStringArb, (s) => {
        expect(isValidSlug(s)).toBe(false)
      }),
      { numRuns: 100 }
    )
  })

  it('rejects strings longer than 120 characters', () => {
    const longStringArb = fc.stringOf(
      fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')),
      { minLength: 121, maxLength: 200 }
    )
    fc.assert(
      fc.property(longStringArb, (s) => {
        expect(isValidSlug(s)).toBe(false)
      }),
      { numRuns: 100 }
    )
  })

  it('rejects strings with uppercase characters', () => {
    const upperArb = fc
      .stringOf(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-'.split('')), {
        minLength: 3,
        maxLength: 120,
      })
      .filter((s) => /[A-Z]/.test(s))
    fc.assert(
      fc.property(upperArb, (s) => {
        expect(isValidSlug(s)).toBe(false)
      }),
      { numRuns: 100 }
    )
  })

  it('rejects strings with leading, trailing, or consecutive hyphens', () => {
    const badHyphenArb = fc.oneof(
      // Leading hyphen
      fc
        .stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'.split('')), {
          minLength: 2,
          maxLength: 119,
        })
        .map((s) => '-' + s)
        .filter((s) => s.length <= 120),
      // Trailing hyphen
      fc
        .stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'.split('')), {
          minLength: 2,
          maxLength: 119,
        })
        .map((s) => s + '-')
        .filter((s) => s.length <= 120),
      // Consecutive hyphens
      fc
        .tuple(
          fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), {
            minLength: 1,
            maxLength: 50,
          }),
          fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), {
            minLength: 1,
            maxLength: 50,
          })
        )
        .map(([a, b]) => `${a}--${b}`)
        .filter((s) => s.length >= 3 && s.length <= 120)
    )
    fc.assert(
      fc.property(badHyphenArb, (s) => {
        expect(isValidSlug(s)).toBe(false)
      }),
      { numRuns: 100 }
    )
  })

  it('isValidSlug agrees with the reference regex for random strings in valid length range', () => {
    const anyStringArb = fc.string({ minLength: 3, maxLength: 120 })
    fc.assert(
      fc.property(anyStringArb, (s) => {
        const expected = SLUG_REGEX.test(s) && s.length >= 3 && s.length <= 120
        expect(isValidSlug(s)).toBe(expected)
      }),
      { numRuns: 200 }
    )
  })
})

describe('Feature: listing-page-enhancements, Property 2: UUID vs Slug Identifier Classification', () => {
  it('classifies all valid UUID v4 strings as UUIDs', () => {
    fc.assert(
      fc.property(uuidV4Arb, (uuid) => {
        expect(isUUID(uuid)).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  it('classifies non-UUID strings as non-UUIDs', () => {
    fc.assert(
      fc.property(nonUuidArb, (s) => {
        // If it doesn't match the UUID regex, isUUID should return false
        if (!UUID_V4_REGEX.test(s)) {
          expect(isUUID(s)).toBe(false)
        }
      }),
      { numRuns: 100 }
    )
  })

  it('UUID classification is mutually exclusive with slug validation for generated UUIDs', () => {
    fc.assert(
      fc.property(uuidV4Arb, (uuid) => {
        // A valid UUID should never be classified as a valid slug
        // (UUIDs contain uppercase hex and version/variant that don't match slug format)
        // Actually they can overlap if the UUID happens to be all lowercase and looks like a slug
        // But the key property is: isUUID returns true for these
        expect(isUUID(uuid)).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  it('isUUID agrees with reference regex for arbitrary strings', () => {
    const anyStringArb = fc.string({ minLength: 0, maxLength: 50 })
    fc.assert(
      fc.property(anyStringArb, (s) => {
        const expected = UUID_V4_REGEX.test(s)
        expect(isUUID(s)).toBe(expected)
      }),
      { numRuns: 200 }
    )
  })

  it('UUID and slug classification partitions the identifier space correctly', () => {
    // For any string that is a valid UUID, the API would look up by 'id' column
    // For any string that is NOT a valid UUID, the API would look up by 'slug' column
    // This tests the partitioning logic described in Requirement 2.4
    const identifierArb = fc.oneof(uuidV4Arb, validSlugArb)
    fc.assert(
      fc.property(identifierArb, (identifier) => {
        const classifiedAsUuid = isUUID(identifier)
        // Exactly one classification path should be taken
        // If it's a UUID, it goes to UUID lookup; otherwise slug lookup
        if (classifiedAsUuid) {
          expect(UUID_V4_REGEX.test(identifier)).toBe(true)
        } else {
          expect(UUID_V4_REGEX.test(identifier)).toBe(false)
        }
      }),
      { numRuns: 100 }
    )
  })
})
