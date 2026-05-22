/**
 * Property 11: Rating Average Consistency
 * Validates: Requirements 15.2
 *
 * After inserting/deleting reviews, the business rating_avg should equal
 * ROUND(AVG(reviews.rating), 2) and review_count should equal COUNT(reviews).
 * This tests the calculation logic (the DB trigger handles it in production).
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

/**
 * Simulates the rating recalculation that the DB trigger performs.
 */
function calculateRating(ratings: number[]): { rating_avg: number; review_count: number } {
  if (ratings.length === 0) {
    return { rating_avg: 0, review_count: 0 }
  }
  const sum = ratings.reduce((acc, r) => acc + r, 0)
  const avg = Math.round((sum / ratings.length) * 100) / 100
  return { rating_avg: avg, review_count: ratings.length }
}

describe('Property 11: Rating Average Consistency', () => {
  it('empty reviews produce rating_avg=0 and review_count=0', () => {
    const result = calculateRating([])
    expect(result.rating_avg).toBe(0)
    expect(result.review_count).toBe(0)
  })

  it('single review: rating_avg equals the rating, review_count=1', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 5 }), (rating) => {
        const result = calculateRating([rating])
        expect(result.rating_avg).toBe(rating)
        expect(result.review_count).toBe(1)
      }),
      { numRuns: 100 }
    )
  })

  it('rating_avg is always between 1 and 5 when reviews exist', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 100 }),
        (ratings) => {
          const result = calculateRating(ratings)
          expect(result.rating_avg).toBeGreaterThanOrEqual(1)
          expect(result.rating_avg).toBeLessThanOrEqual(5)
        }
      ),
      { numRuns: 200 }
    )
  })

  it('review_count always equals the number of ratings', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 0, maxLength: 100 }),
        (ratings) => {
          const result = calculateRating(ratings)
          expect(result.review_count).toBe(ratings.length)
        }
      ),
      { numRuns: 200 }
    )
  })

  it('rating_avg is rounded to 2 decimal places', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 50 }),
        (ratings) => {
          const result = calculateRating(ratings)
          const decimalStr = result.rating_avg.toString()
          const parts = decimalStr.split('.')
          if (parts.length > 1) {
            expect(parts[1].length).toBeLessThanOrEqual(2)
          }
        }
      ),
      { numRuns: 200 }
    )
  })

  it('adding a 5-star review never decreases the average', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 50 }),
        (ratings) => {
          const before = calculateRating(ratings)
          const after = calculateRating([...ratings, 5])
          expect(after.rating_avg).toBeGreaterThanOrEqual(before.rating_avg)
        }
      ),
      { numRuns: 200 }
    )
  })
})
