# Implementation Plan: Business Location Picker

## Overview

Implement a reusable `LocationPicker` component that integrates with the Add Business form's Step 2 (Contact & Location). The implementation proceeds bottom-up: static data first, then utility functions, then the main component, and finally form integration.

## Tasks

- [x] 1. Create static data and utility modules
  - [x] 1.1 Create Indian states static data file
    - Create `apps/web/components/maps/indianStates.ts`
    - Export `INDIAN_STATES` as a readonly array of `{ code: string; name: string }` objects
    - Include all 28 states and 8 union territories of India
    - _Requirements: 7.1, 7.2_

  - [x] 1.2 Create geocoding utility functions
    - Create `apps/web/components/maps/geocodingUtils.ts`
    - Implement `extractAddressComponents` that parses Google Geocoder address components to extract city (from "locality" or fallback "administrative_area_level_2"), state (from "administrative_area_level_1"), and PIN code (from "postal_code")
    - Implement `matchStateToList` that fuzzy-matches a geocoded state name to the `INDIAN_STATES` list and returns the matching name or null
    - _Requirements: 6.2, 6.3, 6.4, 6.5_

  - [x] 1.3 Write property tests for geocoding utilities
    - **Property 2: Address component extraction correctness**
    - **Property 3: Selective field update preserves unaffected fields**
    - **Validates: Requirements 6.2, 6.3, 6.4, 6.5**
    - Create test file at `apps/web/components/maps/__tests__/geocodingUtils.test.ts`
    - Use vitest + fast-check with minimum 100 iterations

- [x] 2. Implement the LocationPicker component
  - [x] 2.1 Create LocationPicker component with map rendering and pin placement
    - Create `apps/web/components/maps/LocationPicker.tsx`
    - Define and export `LocationData` and `LocationPickerProps` interfaces
    - Load Google Maps script with `marker` and `places` libraries (reuse pattern from `MapView.tsx`)
    - Render map at minimum 250px height, full container width
    - Default center: India (20.5937, 78.9629) at zoom 5 when no initial values
    - Initialize map at provided `initialValues` coordinates when present
    - Implement map click handler to place/move a draggable marker
    - On click/drag-end: call reverse geocoder, extract address components, invoke `onChange` callback
    - Render fallback UI with manual lat/lng inputs when Google Maps API fails to load
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 10.1, 10.2_

  - [x] 2.2 Add GPS current location detection
    - Add "Select current location" button with a location icon
    - On click: request browser Geolocation API position
    - Show loading spinner on button while acquiring GPS
    - On success: move pin to GPS coordinates, center map at zoom 15, reverse geocode and update fields
    - On permission denied: show dismissible error "Location access denied. Please enable location permissions."
    - On timeout/failure: show dismissible error "Could not determine your location. Try again or select manually."
    - Auto-dismiss error after 5 seconds
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [x] 2.3 Add Google Places Autocomplete input
    - Render address text input with Places Autocomplete attached
    - Restrict suggestions to India (componentRestrictions: { country: "in" })
    - On place selection: extract lat/lng from geometry, move pin, center map at zoom 16
    - Extract and populate city, state, PIN code from place's address components
    - Update address field with formatted address string
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 2.4 Add PIN code field with forward geocoding and state dropdown
    - Render PIN code input field (6-digit, numeric)
    - On valid 6-digit input: debounce 500ms, then call forward geocoder with PIN code + country "IN"
    - On geocoder result: auto-populate city, state dropdown, move pin to coordinates, center map
    - On no results: leave city/state unchanged
    - Render state field as a select dropdown populated from `INDIAN_STATES`
    - Match geocoded state to dropdown list via `matchStateToList`
    - Render city as a text input (auto-populated but editable)
    - Display inline validation errors from `errors` prop below respective fields
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 9.5_

  - [x] 2.5 Write property tests for LocationPicker data flow
    - **Property 1: Pin position change updates form state**
    - **Property 5: PIN code forward geocoding populates fields**
    - **Property 7: Component initialization round-trip**
    - **Validates: Requirements 2.1, 2.2, 3.2, 4.4, 6.1, 8.1, 8.2, 8.3, 8.4, 10.1, 10.2, 1.3**
    - Create test file at `apps/web/components/maps/__tests__/LocationPicker.test.ts`
    - Use vitest + fast-check with minimum 100 iterations

- [x] 3. Checkpoint - Ensure component builds correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Integrate LocationPicker into Add Business form
  - [x] 4.1 Add location step schema and wire LocationPicker into Step 2
    - Add `locationStepSchema` using zod: lat (-90 to 90), lng (-180 to 180), address (non-empty), city (non-empty), state (non-empty), pin (6 digits or empty)
    - Extend the Add Business form to support multi-step navigation (Step 1 → Step 2)
    - Import `LocationPicker` into `apps/web/app/(business)/add-business/page.tsx`
    - Render `LocationPicker` in Step 2 with `initialValues` from form state
    - Wire `onChange` callback to set form values (lat, lng, address, city, state, pin)
    - Pass validation errors from form state to `LocationPicker` `errors` prop
    - Ensure form submission is blocked when required location fields are empty
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3_

  - [x] 4.2 Write property test for location validation schema
    - **Property 6: Location validation schema correctness**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4**
    - Create test file at `apps/web/app/(business)/add-business/__tests__/locationSchema.test.ts`
    - Use vitest + fast-check with minimum 100 iterations
    - Test valid/invalid combinations of lat, lng, city, state, pin

- [x] 5. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The component reuses the Google Maps script-loading pattern from the existing `MapView.tsx`
- framer-motion, react-hook-form, and zod are already available in the project

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4"] },
    { "id": 3, "tasks": ["2.5"] },
    { "id": 4, "tasks": ["4.1"] },
    { "id": 5, "tasks": ["4.2"] }
  ]
}
```
