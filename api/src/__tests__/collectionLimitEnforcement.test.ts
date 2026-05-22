/**
 * Property 3: Collection Limit Enforcement
 * Validates: Requirements 5.9, 16.1
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { canCreateCollection } from '../utils/limits'
import { PLUS_LIMITS } from '@getnear/config'

describe('Property 3: Collection Limit Enforcement', () => {
  it('free tier: cannot create collection when at or above the limit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: PLUS_LIMITS.free.collections, max: 1000 }),
        (count) => {
          expect(canCreateCollection(count, false)).toBe(false)
        }
      ),
      { numRuns: 200 }
    )
  })

  it('free tier: can create collection when under the limit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: PLUS_LIMITS.free.collections - 1 }),
        (count) => {
          expect(canCreateCollection(count, false)).toBe(true)
        }
      ),
      { numRuns: 200 }
    )
  })

  it('plus tier: can always create collections regardless of count', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10000 }), (count) => {
        expect(canCreateCollection(count, true)).toBe(true)
      }),
      { numRuns: 200 }
    )
  })

  it('free tier limit is exactly 2', () => {
    expect(PLUS_LIMITS.free.collections).toBe(2)
    expect(canCreateCollection(1, false)).toBe(true)
    expect(canCreateCollection(2, false)).toBe(false)
    expect(canCreateCollection(3, false)).toBe(false)
  })
})
