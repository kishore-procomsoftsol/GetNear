/**
 * Feature: listing-page-enhancements, Property 6: Admin Filter Correctness
 * Validates: Requirements 4.2
 *
 * For any set of reviews and any combination of filter criteria (business_id,
 * rating range, date range, status), every review in the filtered result set
 * SHALL match ALL active filter criteria simultaneously.
 *
 * Feature: listing-page-enhancements, Property 8: Review Text Length Validation
 * Validates: Requirements 4.8
 *
 * For any string submitted as review text in an admin edit operation, the system
 * SHALL reject the edit if the string is empty (length 0) or exceeds 1000 characters,
 * and SHALL accept it if the string length is between 1 and 1000 characters inclusive.
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Review {
  id: string
  business_id: string
  rating: number
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

interface FilterCriteria {
  business_id?: string
  rating_min?: number
  rating_max?: number
  start_date?: string
  end_date?: string
  status?: 'pending' | 'approved' | 'rejected'
}

// ─── Pure Functions Under Test ──────────────────────────────────────────────

/**
 * Applies admin filter criteria to a set of reviews.
 * Mirrors the filter logic from GET /admin/reviews in admin.ts.
 */
function filterReviews(reviews: Review[], criteria: FilterCriteria): Review[] {
  return reviews.filter((review) => {
    if (criteria.business_id && review.business_id !== criteria.business_id) return false
    if (criteria.status && review.status !== criteria.status) return false
    if (criteria.rating_min !== undefined && review.rating < criteria.rating_min) return false
    if (criteria.rating_max !== undefined && review.rating > criteria.rating_max) return false
    if (criteria.start_date && review.created_at < criteria.start_date) return false
    if (criteria.end_date && review.created_at > criteria.end_date) return false
    return true
  })
}

/**
 * Validates review text for admin edit operations.
 * Mirrors the validation logic from PUT /admin/reviews/:id in admin.ts:
 *   if (!text || typeof text !== 'string' || text.length < 1 || text.length > 1000)
 */
function validateReviewText(text: unknown): boolean {
  if (!text || typeof text !== 'string' || text.length < 1 || text.length > 1000) {
    return false
  }
  return true
}

// ─── Generators ─────────────────────────────────────────────────────────────

const STATUSES: ('pending' | 'approved' | 'rejected')[] = ['pending', 'approved', 'rejected']
const BUSINESS_IDS = ['biz-001', 'biz-002', 'biz-003', 'biz-004', 'biz-005']

const reviewArb: fc.Arbitrary<Review> = fc.record({
  id: fc.uuid(),
  business_id: fc.constantFrom(...BUSINESS_IDS),
  rating: fc.integer({ min: 1, max: 5 }),
  status: fc.constantFrom(...STATUSES),
  created_at: fc.date({
    min: new Date('2024-01-01T00:00:00Z'),
    max: new Date('2025-12-31T23:59:59Z'),
  }).map((d) => d.toISOString()),
})

const filterCriteriaArb: fc.Arbitrary<FilterCriteria> = fc.record({
  business_id: fc.option(fc.constantFrom(...BUSINESS_IDS), { nil: undefined }),
  rating_min: fc.option(fc.integer({ min: 1, max: 5 }), { nil: undefined }),
  rating_max: fc.option(fc.integer({ min: 1, max: 5 }), { nil: undefined }),
  start_date: fc.option(
    fc.date({
      min: new Date('2024-01-01T00:00:00Z'),
      max: new Date('2025-12-31T23:59:59Z'),
    }).map((d) => d.toISOString()),
    { nil: undefined }
  ),
  end_date: fc.option(
    fc.date({
      min: new Date('2024-01-01T00:00:00Z'),
      max: new Date('2025-12-31T23:59:59Z'),
    }).map((d) => d.toISOString()),
    { nil: undefined }
  ),
  status: fc.option(fc.constantFrom(...STATUSES), { nil: undefined }),
})

// ─── Property 6: Admin Filter Correctness ───────────────────────────────────

describe('Feature: listing-page-enhancements, Property 6: Admin Filter Correctness', () => {
  it('all filtered results match ALL active filter criteria simultaneously', () => {
    fc.assert(
      fc.property(
        fc.array(reviewArb, { minLength: 0, maxLength: 50 }),
        filterCriteriaArb,
        (reviews, criteria) => {
          const results = filterReviews(reviews, criteria)

          for (const review of results) {
            if (criteria.business_id) {
              expect(review.business_id).toBe(criteria.business_id)
            }
            if (criteria.status) {
              expect(review.status).toBe(criteria.status)
            }
            if (criteria.rating_min !== undefined) {
              expect(review.rating).toBeGreaterThanOrEqual(criteria.rating_min)
            }
            if (criteria.rating_max !== undefined) {
              expect(review.rating).toBeLessThanOrEqual(criteria.rating_max)
            }
            if (criteria.start_date) {
              expect(review.created_at >= criteria.start_date).toBe(true)
            }
            if (criteria.end_date) {
              expect(review.created_at <= criteria.end_date).toBe(true)
            }
          }
        }
      ),
      { numRuns: 200 }
    )
  })

  it('no review matching all criteria is excluded from results', () => {
    fc.assert(
      fc.property(
        fc.array(reviewArb, { minLength: 1, maxLength: 50 }),
        filterCriteriaArb,
        (reviews, criteria) => {
          const results = filterReviews(reviews, criteria)
          const resultIds = new Set(results.map((r) => r.id))

          // For every review NOT in results, at least one criterion must be violated
          for (const review of reviews) {
            if (!resultIds.has(review.id)) {
              const violations: boolean[] = []
              if (criteria.business_id) violations.push(review.business_id !== criteria.business_id)
              if (criteria.status) violations.push(review.status !== criteria.status)
              if (criteria.rating_min !== undefined) violations.push(review.rating < criteria.rating_min)
              if (criteria.rating_max !== undefined) violations.push(review.rating > criteria.rating_max)
              if (criteria.start_date) violations.push(review.created_at < criteria.start_date)
              if (criteria.end_date) violations.push(review.created_at > criteria.end_date)

              // At least one filter criterion must be violated
              expect(violations.some((v) => v)).toBe(true)
            }
          }
        }
      ),
      { numRuns: 200 }
    )
  })

  it('empty filter criteria returns all reviews', () => {
    fc.assert(
      fc.property(
        fc.array(reviewArb, { minLength: 0, maxLength: 30 }),
        (reviews) => {
          const results = filterReviews(reviews, {})
          expect(results.length).toBe(reviews.length)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('filtered results are always a subset of the input', () => {
    fc.assert(
      fc.property(
        fc.array(reviewArb, { minLength: 0, maxLength: 50 }),
        filterCriteriaArb,
        (reviews, criteria) => {
          const results = filterReviews(reviews, criteria)
          expect(results.length).toBeLessThanOrEqual(reviews.length)
          const inputIds = new Set(reviews.map((r) => r.id))
          for (const result of results) {
            expect(inputIds.has(result.id)).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ─── Property 8: Review Text Length Validation ──────────────────────────────

describe('Feature: listing-page-enhancements, Property 8: Review Text Length Validation', () => {
  it('accepts strings with length 1 to 1000 inclusive', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 1000 }),
        (text) => {
          expect(validateReviewText(text)).toBe(true)
        }
      ),
      { numRuns: 200 }
    )
  })

  it('rejects empty string (length 0)', () => {
    expect(validateReviewText('')).toBe(false)
  })

  it('rejects strings exceeding 1000 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1001, maxLength: 2000 }),
        (text) => {
          expect(validateReviewText(text)).toBe(false)
        }
      ),
      { numRuns: 200 }
    )
  })

  it('boundary: length 1 is accepted', () => {
    fc.assert(
      fc.property(
        fc.char(),
        (ch) => {
          expect(validateReviewText(ch)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('boundary: length 1000 is accepted', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1000, maxLength: 1000 }),
        (text) => {
          expect(validateReviewText(text)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('boundary: length 1001 is rejected', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1001, maxLength: 1001 }),
        (text) => {
          expect(validateReviewText(text)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('rejects non-string values (null, undefined, numbers)', () => {
    expect(validateReviewText(null)).toBe(false)
    expect(validateReviewText(undefined)).toBe(false)
    expect(validateReviewText(0)).toBe(false)
    expect(validateReviewText(123)).toBe(false)
    expect(validateReviewText([])).toBe(false)
    expect(validateReviewText({})).toBe(false)
  })
})
