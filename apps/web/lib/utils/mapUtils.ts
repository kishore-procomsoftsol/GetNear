/**
 * Map utility functions for deriving pin data from business search results.
 *
 * Requirements: 3.9, 3.10, 4.2, 4.4
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal business input shape needed for map pin derivation. */
export interface MapBusiness {
  id: string
  name: string
  rating_avg?: number | null
  distance_m?: number | null
  lat?: number | null
  lng?: number | null
}

/** A validated map pin ready for rendering on the map. */
export interface MapPin {
  id: string
  lat: number
  lng: number
  name: string
  rating: number | null
  walkingTime: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Average walking speed in meters per minute. */
const WALKING_SPEED_M_PER_MIN = 80

/**
 * Calculates walking time string from distance in meters.
 * Uses 80m/min walking speed.
 *
 * @returns Formatted string like "5 min" or "— min" if distance is unavailable.
 */
export function calculateWalkingTime(distance_m: number | null | undefined): string {
  if (distance_m == null || !isFinite(distance_m) || distance_m < 0) {
    return '— min'
  }
  return `${Math.round(distance_m / WALKING_SPEED_M_PER_MIN)} min`
}

/**
 * Checks whether a latitude value is valid (finite and within [-90, 90]).
 */
function isValidLat(lat: number | null | undefined): lat is number {
  return lat != null && isFinite(lat) && lat >= -90 && lat <= 90
}

/**
 * Checks whether a longitude value is valid (finite and within [-180, 180]).
 */
function isValidLng(lng: number | null | undefined): lng is number {
  return lng != null && isFinite(lng) && lng >= -180 && lng <= 180
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

/**
 * Derives map pins from an array of businesses.
 *
 * Filters out businesses without valid coordinates and calculates walking time
 * for each remaining business.
 *
 * Postconditions:
 * - Returns only businesses with valid lat ([-90, 90]) and lng ([-180, 180])
 * - Output length ≤ input length
 * - Every output id exists in the input array (no fabricated data)
 * - Walking time is calculated at 80m/min; defaults to "— min" if no distance
 *
 * Requirements: 3.9, 3.10, 4.2, 4.4
 */
export function deriveMapPins(businesses: MapBusiness[]): MapPin[] {
  return businesses
    .filter((b) => isValidLat(b.lat) && isValidLng(b.lng))
    .map((b) => ({
      id: b.id,
      lat: b.lat as number,
      lng: b.lng as number,
      name: b.name,
      rating: b.rating_avg ?? null,
      walkingTime: calculateWalkingTime(b.distance_m),
    }))
}
