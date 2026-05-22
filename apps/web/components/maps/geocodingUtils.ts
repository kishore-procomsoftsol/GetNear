import { INDIAN_STATES } from './indianStates'

/**
 * Extracted address data from Google Geocoder response.
 */
export interface ExtractedAddress {
  city: string
  state: string
  pinCode: string
  formattedAddress: string
}

/**
 * Parses Google Geocoder address components to extract city, state, and PIN code.
 *
 * - City: extracted from "locality" type, falling back to "administrative_area_level_2"
 * - State: extracted from "administrative_area_level_1" type
 * - PIN code: extracted from "postal_code" type
 * - Returns empty strings for missing components
 *
 * Requirements: 6.2, 6.3, 6.4
 */
export function extractAddressComponents(
  components: Array<{ long_name: string; short_name: string; types: string[] }>,
  formattedAddress?: string
): ExtractedAddress {
  let city = ''
  let state = ''
  let pinCode = ''

  for (const component of components) {
    const types = component.types

    if (types.includes('locality')) {
      city = component.long_name
    } else if (!city && types.includes('administrative_area_level_2')) {
      // Fallback: use administrative_area_level_2 if locality not found yet
      city = component.long_name
    }

    if (types.includes('administrative_area_level_1')) {
      state = component.long_name
    }

    if (types.includes('postal_code')) {
      pinCode = component.long_name
    }
  }

  return {
    city,
    state,
    pinCode,
    formattedAddress: formattedAddress ?? '',
  }
}

/**
 * Fuzzy-matches a geocoded state name to the INDIAN_STATES list.
 *
 * Matching strategy:
 * 1. Exact match (case-insensitive)
 * 2. Geocoded state starts with a state name from the list
 * 3. Geocoded state contains a state name from the list
 *
 * Returns the matching state name from INDIAN_STATES, or null if no match found.
 *
 * Requirements: 6.5
 */
export function matchStateToList(geocodedState: string): string | null {
  if (!geocodedState) return null

  const normalized = geocodedState.trim().toLowerCase()

  // 1. Exact match (case-insensitive)
  for (const state of INDIAN_STATES) {
    if (state.name.toLowerCase() === normalized) {
      return state.name
    }
  }

  // 2. Geocoded state starts with a state name from the list
  for (const state of INDIAN_STATES) {
    if (normalized.startsWith(state.name.toLowerCase())) {
      return state.name
    }
  }

  // 3. Geocoded state contains a state name from the list
  for (const state of INDIAN_STATES) {
    if (normalized.includes(state.name.toLowerCase())) {
      return state.name
    }
  }

  return null
}
