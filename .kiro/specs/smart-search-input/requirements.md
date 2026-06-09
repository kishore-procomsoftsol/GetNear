# Requirements Document

## Introduction

Replace the existing category filter pill buttons on the GetNear homepage with a unified smart search input that provides auto-suggestions through a hybrid approach — matching local categories first, then enriching results with API-fetched search history and business names after a debounce. On selection or Enter, the user navigates to the /search results page with the query pre-filled. The component is reusable and coexists with the existing radius selector, sort options, and quick access section.

## Glossary

- **SmartSearchInput**: A reusable React component located in `components/home/` that renders a text input with an auto-suggestion dropdown
- **Suggestion_Dropdown**: The overlay UI element that displays suggestion items below the SmartSearchInput
- **Local_Category_Match**: A suggestion derived by filtering the CATEGORIES array from `@getnear/config` against the current input text on the client side
- **API_Suggestion**: A suggestion fetched from the backend that includes the user's recent search history entries and business name matches
- **Debounce_Delay**: A 300ms pause in typing before the SmartSearchInput triggers an API request for remote suggestions
- **Search_Results_Page**: The existing `/search` route that displays business results for a given query, category, and location
- **Homepage**: The customer-facing page at `/(customer)/page.tsx` that currently displays category filter pills, radius/sort controls, quick access, and popular businesses

## Requirements

### Requirement 1: Smart Search Input Rendering

**User Story:** As a customer, I want a single search input on the homepage so that I can quickly type what I'm looking for instead of browsing through category buttons.

#### Acceptance Criteria

1. THE SmartSearchInput SHALL render a text input field with placeholder text "Search for restaurants, services..." in the position currently occupied by the category filter pills on the Homepage.
2. THE SmartSearchInput SHALL display a search icon inside the input field to indicate its purpose.
3. THE SmartSearchInput SHALL be a reusable component exported from `components/home/SmartSearchInput`.
4. WHEN the SmartSearchInput is rendered on the Homepage, THE Homepage SHALL continue to display the radius selector and sort options alongside the SmartSearchInput.

### Requirement 2: Local Category Suggestions

**User Story:** As a customer, I want instant category suggestions as I type so that I can find relevant categories without waiting for network requests.

#### Acceptance Criteria

1. WHEN the user types at least 1 character into the SmartSearchInput, THE SmartSearchInput SHALL display Local_Category_Match results by filtering the CATEGORIES array using a case-insensitive substring match on the category name field.
2. THE SmartSearchInput SHALL display Local_Category_Match results with the category icon and category name for each matching item.
3. THE SmartSearchInput SHALL display a maximum of 5 Local_Category_Match results in the Suggestion_Dropdown.
4. WHEN the input value changes, THE SmartSearchInput SHALL update Local_Category_Match results synchronously without network delay.

### Requirement 3: API-Enriched Suggestions

**User Story:** As a customer, I want to see my search history and matching business names in suggestions so that I can quickly re-find places or discover new ones.

#### Acceptance Criteria

1. WHEN the user has typed at least 2 characters and the Debounce_Delay of 300ms has elapsed since the last keystroke, THE SmartSearchInput SHALL request API_Suggestion data from the backend.
2. THE SmartSearchInput SHALL display API_Suggestion results grouped into two labeled sections: "Recent searches" for search history entries and "Businesses" for matching business names.
3. THE SmartSearchInput SHALL display a maximum of 3 search history entries and 5 business name matches in the API_Suggestion section.
4. WHILE an API_Suggestion request is in progress, THE SmartSearchInput SHALL display a loading indicator in the Suggestion_Dropdown below the Local_Category_Match results.
5. IF the API_Suggestion request fails, THEN THE SmartSearchInput SHALL continue displaying Local_Category_Match results and hide the loading indicator without showing an error to the user.

### Requirement 4: Suggestion Selection and Navigation

**User Story:** As a customer, I want selecting a suggestion to take me directly to search results so that I can find businesses with minimal effort.

#### Acceptance Criteria

1. WHEN the user selects a Local_Category_Match suggestion, THE SmartSearchInput SHALL navigate to the Search_Results_Page with the category slug set as the `category` query parameter.
2. WHEN the user selects a search history API_Suggestion, THE SmartSearchInput SHALL navigate to the Search_Results_Page with the history query value set as the `q` query parameter.
3. WHEN the user selects a business name API_Suggestion, THE SmartSearchInput SHALL navigate to the Search_Results_Page with the business name set as the `q` query parameter.
4. WHEN the user presses the Enter key with text in the SmartSearchInput, THE SmartSearchInput SHALL navigate to the Search_Results_Page with the current input value set as the `q` query parameter.
5. WHEN the user presses the Enter key with an empty SmartSearchInput, THE SmartSearchInput SHALL navigate to the Search_Results_Page without a `q` query parameter.

### Requirement 5: Suggestion Dropdown Behavior

**User Story:** As a customer, I want the suggestion dropdown to appear and disappear intuitively so that it does not obstruct other page content unnecessarily.

#### Acceptance Criteria

1. WHEN the SmartSearchInput receives focus and contains at least 1 character, THE Suggestion_Dropdown SHALL become visible.
2. WHEN the user clears the SmartSearchInput or the input loses focus, THE Suggestion_Dropdown SHALL be hidden.
3. THE Suggestion_Dropdown SHALL render as an overlay positioned directly below the SmartSearchInput without shifting other page content.
4. WHEN the user taps outside the Suggestion_Dropdown, THE Suggestion_Dropdown SHALL be hidden.
5. THE Suggestion_Dropdown SHALL support keyboard navigation using the ArrowUp and ArrowDown keys to move between suggestions.

### Requirement 6: Existing UI Preservation

**User Story:** As a customer, I want the radius selector, sort options, and quick access section to remain functional so that my search experience is not degraded.

#### Acceptance Criteria

1. THE Homepage SHALL continue to render the radius selector dropdown with the same options (1 km, 3 km, 5 km, 10 km) after the SmartSearchInput replaces the category filter pills.
2. THE Homepage SHALL continue to render the sort option control alongside the SmartSearchInput and radius selector.
3. THE Homepage SHALL continue to render the quick access section with the same items (Restaurants, Cafes, Grocery, Pharmacy, ATM, More) below the search area.
4. WHEN the user selects a radius value, THE Homepage SHALL persist the selected radius in the location store for use during navigation to the Search_Results_Page.

### Requirement 7: Accessibility

**User Story:** As a customer using assistive technology, I want the smart search input to be accessible so that I can use the feature without barriers.

#### Acceptance Criteria

1. THE SmartSearchInput SHALL include an `aria-label` attribute with the value "Search for businesses and categories".
2. THE Suggestion_Dropdown SHALL use the `role="listbox"` attribute, and each suggestion item SHALL use `role="option"`.
3. THE SmartSearchInput SHALL use `aria-expanded` to indicate whether the Suggestion_Dropdown is visible.
4. THE SmartSearchInput SHALL use `aria-activedescendant` to indicate the currently highlighted suggestion during keyboard navigation.
