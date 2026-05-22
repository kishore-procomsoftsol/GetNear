/**
 * Property 6: Booking Status Transitions
 * Validates: Requirements 12.4, 12.5, 12.7
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { isValidTransition, BOOKING_STATUSES, getValidNextStatuses } from '../utils/bookings'

describe('Property 6: Booking Status Transitions', () => {
  it('terminal statuses (cancelled, completed, no_show) have no valid transitions', () => {
    const terminalStatuses = ['cancelled', 'completed', 'no_show']
    terminalStatuses.forEach((status) => {
      BOOKING_STATUSES.forEach((target) => {
        expect(isValidTransition(status, target)).toBe(false)
      })
    })
  })

  it('pending can only transition to confirmed or cancelled', () => {
    expect(isValidTransition('pending', 'confirmed')).toBe(true)
    expect(isValidTransition('pending', 'cancelled')).toBe(true)
    expect(isValidTransition('pending', 'completed')).toBe(false)
    expect(isValidTransition('pending', 'no_show')).toBe(false)
    expect(isValidTransition('pending', 'pending')).toBe(false)
  })

  it('confirmed can transition to completed, cancelled, or no_show', () => {
    expect(isValidTransition('confirmed', 'completed')).toBe(true)
    expect(isValidTransition('confirmed', 'cancelled')).toBe(true)
    expect(isValidTransition('confirmed', 'no_show')).toBe(true)
    expect(isValidTransition('confirmed', 'pending')).toBe(false)
    expect(isValidTransition('confirmed', 'confirmed')).toBe(false)
  })

  it('arbitrary invalid status strings are rejected', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !(BOOKING_STATUSES as readonly string[]).includes(s)),
        fc.constantFrom(...BOOKING_STATUSES),
        (invalidCurrent, target) => {
          expect(isValidTransition(invalidCurrent, target)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('no status can transition to itself', () => {
    BOOKING_STATUSES.forEach((status) => {
      expect(isValidTransition(status, status)).toBe(false)
    })
  })

  it('getValidNextStatuses returns empty array for terminal statuses', () => {
    expect(getValidNextStatuses('cancelled')).toEqual([])
    expect(getValidNextStatuses('completed')).toEqual([])
    expect(getValidNextStatuses('no_show')).toEqual([])
  })
})
