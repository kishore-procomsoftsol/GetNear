# Requirements Document

## Introduction

Enhance the business Add/Edit form's location step (Step 2 — Contact & Location) with an interactive Google Maps-based location picker. The feature provides multiple ways to select a business location: tapping/clicking on the map, dragging a pin, using GPS auto-detection, typing an address with Google Places Autocomplete, or entering a PIN code. The location picker auto-populates city and state fields from geocoding responses. This applies to both the business owner's Add Business form (`apps/web`) and the admin's business management screens (`apps/admin`).

## Glossary

- **Location_Picker**: A reusable UI component combining an interactive Google Map, address autocomplete input, and location fields (city, state, PIN code) that work together to capture a business's geographic position
- **Map_Pin**: A draggable marker on the Google Map representing the selected business location coordinates (latitude and longitude)
- **Places_Autocomplete**: The Google Places Autocomplete text input that suggests addresses as the user types and returns structured address data
- **Reverse_Geocoder**: A service that converts geographic coordinates (latitude, longitude) into a human-readable address using the Google Geocoding API
- **Forward_Geocoder**: A service that converts a text address or PIN code into geographic coordinates and structured address components using the Google Geocoding API
- **PIN_Code**: A 6-digit Indian postal code used to identify a geographic delivery area
- **Indian_States_List**: A static list of all 28 Indian states and 8 union territories used to populate the state dropdown
- **GPS_Position**: The device's current geographic coordinates obtained via the browser Geolocation API
- **Form_Controller**: The react-hook-form instance managing the Add/Edit Business form state and validation

## Requirements

### Requirement 1: Interactive Map Display

**User Story:** As a business owner, I want to see an interactive Google Map in the location step, so that I can visually select my business location.

#### Acceptance Criteria

1. WHEN the location step is rendered, THE Location_Picker SHALL display a Google Map using the API key from `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
2. THE Location_Picker SHALL initialize the map centered on India (latitude 20.5937, longitude 78.9629) at zoom level 5 when no prior location is set
3. WHEN a prior location exists in the form state, THE Location_Picker SHALL center the map on that location and place the Map_Pin at those coordinates
4. THE Location_Picker SHALL render the map at a minimum height of 250 pixels and occupy the full width of its container
5. IF the Google Maps API fails to load, THEN THE Location_Picker SHALL display a fallback message indicating the map is unavailable and allow manual coordinate entry

### Requirement 2: Map Pin Placement via Click

**User Story:** As a business owner, I want to tap or click on the map to place a pin, so that I can select my business location precisely.

#### Acceptance Criteria

1. WHEN the user clicks or taps on the map, THE Location_Picker SHALL place the Map_Pin at the clicked coordinates
2. WHEN the Map_Pin is placed via click, THE Location_Picker SHALL update the latitude and longitude values in the Form_Controller
3. WHEN the Map_Pin is placed via click, THE Location_Picker SHALL invoke the Reverse_Geocoder to obtain the address for those coordinates
4. WHEN the Reverse_Geocoder returns a result, THE Location_Picker SHALL update the address field in the Form_Controller with the formatted address
5. IF the Reverse_Geocoder fails or returns no results, THEN THE Location_Picker SHALL retain the coordinates without updating the address field

### Requirement 3: Map Pin Drag

**User Story:** As a business owner, I want to drag the map pin to adjust the exact location, so that I can fine-tune my business position.

#### Acceptance Criteria

1. THE Map_Pin SHALL be draggable after placement on the map
2. WHEN the user finishes dragging the Map_Pin, THE Location_Picker SHALL update the latitude and longitude values in the Form_Controller with the new position
3. WHEN the user finishes dragging the Map_Pin, THE Location_Picker SHALL invoke the Reverse_Geocoder to obtain the address for the new coordinates
4. WHEN the Reverse_Geocoder returns a result after drag, THE Location_Picker SHALL update the address, city, and state fields in the Form_Controller

### Requirement 4: GPS Current Location

**User Story:** As a business owner, I want to use a "Select current location" button to auto-detect my GPS position, so that I can quickly set my location without manual input.

#### Acceptance Criteria

1. THE Location_Picker SHALL display a "Select current location" button below or overlaid on the map
2. WHEN the user activates the "Select current location" button, THE Location_Picker SHALL request the GPS_Position from the browser Geolocation API
3. WHILE the GPS_Position is being acquired, THE Location_Picker SHALL display a loading indicator on the button
4. WHEN the GPS_Position is successfully obtained, THE Location_Picker SHALL move the Map_Pin to those coordinates and center the map at zoom level 15
5. WHEN the GPS_Position is successfully obtained, THE Location_Picker SHALL invoke the Reverse_Geocoder and update address, city, and state fields in the Form_Controller
6. IF the browser denies geolocation permission, THEN THE Location_Picker SHALL display an error message indicating location access was denied
7. IF the geolocation request times out or fails, THEN THE Location_Picker SHALL display an error message indicating the location could not be determined

### Requirement 5: Address Autocomplete

**User Story:** As a business owner, I want to type an address and select from suggestions, so that I can find my business location by address name.

#### Acceptance Criteria

1. THE Location_Picker SHALL display an address text input with Google Places_Autocomplete enabled
2. THE Places_Autocomplete SHALL restrict suggestions to addresses within India (component restriction: country = "in")
3. WHEN the user selects a suggestion from Places_Autocomplete, THE Location_Picker SHALL extract the latitude and longitude from the selected place
4. WHEN the user selects a suggestion from Places_Autocomplete, THE Location_Picker SHALL move the Map_Pin to the selected coordinates and center the map at zoom level 16
5. WHEN the user selects a suggestion from Places_Autocomplete, THE Location_Picker SHALL extract and populate the city, state, and PIN code fields from the place's address components
6. WHEN the user selects a suggestion from Places_Autocomplete, THE Location_Picker SHALL update the address field with the formatted address string

### Requirement 6: Reverse Geocoding on Pin Move

**User Story:** As a business owner, I want the address fields to update automatically when I move the pin, so that I do not have to manually type the address after placing the pin.

#### Acceptance Criteria

1. WHEN the Map_Pin position changes (via click, drag, or GPS), THE Reverse_Geocoder SHALL be called with the new coordinates
2. WHEN the Reverse_Geocoder returns address components, THE Location_Picker SHALL extract the city from the "locality" or "administrative_area_level_2" component
3. WHEN the Reverse_Geocoder returns address components, THE Location_Picker SHALL extract the state from the "administrative_area_level_1" component and match it to the Indian_States_List
4. WHEN the Reverse_Geocoder returns address components, THE Location_Picker SHALL extract the PIN code from the "postal_code" component
5. THE Location_Picker SHALL update the Form_Controller with extracted city, state, and PIN code values without clearing user-edited fields that the geocoder did not return data for

### Requirement 7: State Dropdown

**User Story:** As a business owner, I want the state field to be a dropdown of Indian states, so that I can select a valid state without typing errors.

#### Acceptance Criteria

1. THE Location_Picker SHALL render the state field as a select dropdown populated with all entries from the Indian_States_List
2. THE Indian_States_List SHALL contain all 28 states and 8 union territories of India
3. WHEN a state is auto-populated from geocoding, THE Location_Picker SHALL set the dropdown value to the matching entry from the Indian_States_List
4. IF the geocoded state name does not match any entry in the Indian_States_List, THEN THE Location_Picker SHALL leave the state dropdown unchanged and allow manual selection

### Requirement 8: PIN Code Auto-Population

**User Story:** As a business owner, I want the city and state to auto-fill when I enter my PIN code, so that I can quickly complete the location fields.

#### Acceptance Criteria

1. WHEN the user enters a 6-digit PIN_Code in the PIN code field, THE Forward_Geocoder SHALL be called with the PIN code and country restriction "IN"
2. WHEN the Forward_Geocoder returns results for the PIN code, THE Location_Picker SHALL auto-populate the city field from the response
3. WHEN the Forward_Geocoder returns results for the PIN code, THE Location_Picker SHALL auto-populate the state dropdown from the response
4. WHEN the Forward_Geocoder returns results for the PIN code, THE Location_Picker SHALL move the Map_Pin to the returned coordinates and center the map
5. IF the Forward_Geocoder returns no results for the PIN code, THEN THE Location_Picker SHALL not modify the city or state fields
6. THE Location_Picker SHALL debounce the PIN code geocoding request by 500 milliseconds to avoid excessive API calls

### Requirement 9: Form Integration and Validation

**User Story:** As a business owner, I want the location picker to integrate with the existing form validation, so that I cannot submit without a valid location.

#### Acceptance Criteria

1. THE Form_Controller SHALL validate that latitude and longitude are present and within valid ranges (latitude: -90 to 90, longitude: -180 to 180) before form submission
2. THE Form_Controller SHALL validate that the city field is not empty before form submission
3. THE Form_Controller SHALL validate that the state field is not empty before form submission
4. THE Form_Controller SHALL validate that the PIN code, when provided, is exactly 6 digits
5. WHEN validation fails on the location step, THE Location_Picker SHALL display inline error messages below the respective fields

### Requirement 10: Reusable Component Design

**User Story:** As a developer, I want the location picker to be a reusable component, so that it can be used in both the business owner's Add form and the admin's business management screens.

#### Acceptance Criteria

1. THE Location_Picker SHALL accept initial values for latitude, longitude, address, city, state, and PIN code as props
2. THE Location_Picker SHALL emit location changes via a callback prop containing latitude, longitude, address, city, state, and PIN code
3. THE Location_Picker SHALL be usable in both the `apps/web` Add Business form and the `apps/admin` Add/Edit Business form without modification
4. THE Location_Picker SHALL be placed in a shared location accessible to both apps (e.g., `apps/web/components/maps/LocationPicker.tsx` with re-export or a shared package)
