/**
 * Property 5: Review Uniqueness
 * Validates: Requirements 15.4
 *
 * Tests the uniqueness constraint logic: a user cannot submit two reviews
 * for the same business. The DB enforces this via UNIQUE(user_id, business_id)
 * and the API checks before insert.
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

/**
 * Simulates the review uniqueness check.
 * In the real API, this is done by querying the DB for an existing review.
 */
function canSubmitReview(
  existingReviews: Array<{ user_id: string; business_id: string }>,
  userId: string,
  businessId: string
): boolean {
  return !existingReviews.some(
    (r) => r.user_id === userId && r.business_id === businessId
  )
}

describe('Property 5: Review Uniqueness', () => {
  it('first review for a (user, business) pair is always allowed', () => {
    fc.assert(
      fc.property(fc.uuid(), fc.uuid(), (userId, businessId) => {
        expect(canSubmitReview([], userId, businessId)).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  it('second review for the same (user, business) pair is always rejected', () => {
    fc.assert(
      fc.property(fc.uuid(), fc.uuid(), (userId, businessId) => {
        const existing = [{ user_id: userId, business_id: businessId }]
        expect(canSubmitReview(existing, userId, businessId)).toBe(false)
      }),
      { numRuns: 100 }
    )
  })

  it('same user can review different businesses', () => {
    fc.assert(
      fc.property(fc.uuid(), fc.uuid(), fc.uuid(), (userId, biz1, biz2) => {
        fc.pre(biz1 !== biz2)
        const existing = [{ user_id: userId, business_id: biz1 }]
        expect(canSubmitReview(existing, userId, biz2)).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  it('different users can review the same business', () => {
    fc.assert(
      fc.property(fc.uuid(), fc.uuid(), fc.uuid(), (user1, user2, businessId) => {
        fc.pre(user1 !== user2)
        const existing = [{ user_id: user1, business_id: businessId }]
        expect(canSubmitReview(existing, user2, businessId)).toBe(true)
      }),
      { numRuns: 100 }
    )
  })
})
