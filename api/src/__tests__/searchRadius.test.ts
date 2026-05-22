/**
 * Property 1: Search Radius Enforcement
 * Validates: Requirements 3.11, 16.1
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { enforceRadius } from '../utils/search'

describe('Property 1: Search Radius Enforcement', () => {
  it('free tier: result is always between 1 and 10 km', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 200, noNaN: true, noDefaultInfinity: true }), (radius) => {
        const result = enforceRadius(radius, false)
        expect(result).toBeGreaterThanOrEqual(1)
        expect(result).toBeLessThanOrEqual(10)
      }),
      { numRuns: 200 }
    )
  })

  it('plus tier: result is always between 1 and 50 km', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 200, noNaN: true, noDefaultInfinity: true }), (radius) => {
        const result = enforceRadius(radius, true)
        expect(result).toBeGreaterThanOrEqual(1)
        expect(result).toBeLessThanOrEqual(50)
      }),
      { numRuns: 200 }
    )
  })

  it('plus tier always allows larger radius than free tier for same input', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 200, noNaN: true, noDefaultInfinity: true }), (radius) => {
        const free = enforceRadius(radius, false)
        const plus = enforceRadius(radius, true)
        expect(plus).toBeGreaterThanOrEqual(free)
      }),
      { numRuns: 200 }
    )
  })

  it('result is always the requested radius when within tier limits', () => {
    fc.assert(
      fc.property(fc.double({ min: 1, max: 10, noNaN: true, noDefaultInfinity: true }), (radius) => {
        expect(enforceRadius(radius, false)).toBeCloseTo(radius, 10)
        expect(enforceRadius(radius, true)).toBeCloseTo(radius, 10)
      }),
      { numRuns: 200 }
    )
  })
})
