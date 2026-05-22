/**
 * Search utility helpers.
 * Requirements: 3.11, 16.1
 */

/** Clamps the requested radius to the tier maximum. Free: max 10 km. Plus: max 50 km. Min: 1 km. */
export function enforceRadius(requested: number, isPlus: boolean): number {
  const max = isPlus ? 50 : 10
  return Math.min(Math.max(requested, 1), max)
}
