/**
 * Booking status transition utilities.
 * Requirements: 12.4, 12.5, 12.7
 */

export const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'] as const
export type BookingStatus = (typeof BOOKING_STATUSES)[number]

/**
 * Allowed status transitions:
 * - pending → confirmed, cancelled, declined
 * - confirmed → completed, cancelled, no_show
 * - cancelled → (terminal)
 * - completed → (terminal)
 * - no_show → (terminal)
 */
const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled', 'no_show'],
  cancelled: [],
  completed: [],
  no_show: [],
}

/** Returns true if transitioning from currentStatus to targetStatus is allowed. */
export function isValidTransition(currentStatus: string, targetStatus: string): boolean {
  if (!Object.hasOwn(ALLOWED_TRANSITIONS, currentStatus)) return false
  const allowed = ALLOWED_TRANSITIONS[currentStatus as BookingStatus]
  return allowed.includes(targetStatus as BookingStatus)
}

/** Returns the list of valid next statuses from the given current status. */
export function getValidNextStatuses(currentStatus: string): BookingStatus[] {
  if (!Object.hasOwn(ALLOWED_TRANSITIONS, currentStatus)) return []
  return ALLOWED_TRANSITIONS[currentStatus as BookingStatus]
}
