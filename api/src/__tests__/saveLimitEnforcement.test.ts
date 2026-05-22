/**
 * Property 2: Save Limit Enforcement
 * Validates: Requirements 5.1, 16.1
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { canSaveMore } from '../utils/limits'
import { PLUS_LIMITS } from '@getnear/config'

describe('Property 2: Save Limit Enforcement', () => {
  it('free tier: cannot save more when at or above the limit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: PLUS_LIMITS.free.savedPlaces, max: 1000 }),
        (count) => {
          expect(canSaveMore(count, false)).toBe(false)
        }
      ),
      { numRuns: 200 }
    )
  })

  it('free tier: can save when under the limit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: PLUS_LIMITS.free.savedPlaces - 1 }),
        (count) => {
          expect(canSaveMore(count, false)).toBe(true)
        }
      ),
      { numRuns: 200 }
    )
  })

  it('plus tier: can always save regardless of count', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10000 }), (count) => {
        expect(canSaveMore(count, true)).toBe(true)
      }),
      { numRuns: 200 }
    )
  })

  it('free tier limit is exactly 10', () => {
    expect(PLUS_LIMITS.free.savedPlaces).toBe(10)
    expect(canSaveMore(9, false)).toBe(true)
    expect(canSaveMore(10, false)).toBe(false)
    expect(canSaveMore(11, false)).toBe(false)
  })
})
