/**
 * Tier limit enforcement utilities.
 * Requirements: 5.1, 5.9, 16.1
 */
import { PLUS_LIMITS } from '@getnear/config'

/** Returns true if the user can save another place given their current count and tier. */
export function canSaveMore(currentCount: number, isPlus: boolean): boolean {
  if (isPlus) return true
  return currentCount < PLUS_LIMITS.free.savedPlaces
}

/** Returns true if the user can create another collection given their current count and tier. */
export function canCreateCollection(currentCount: number, isPlus: boolean): boolean {
  if (isPlus) return true
  return currentCount < PLUS_LIMITS.free.collections
}
