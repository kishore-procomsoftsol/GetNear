# Implementation Plan: Smart Search Input

## Overview

Replace the category filter pill buttons on the GetNear homepage with a unified SmartSearchInput component that provides hybrid auto-suggestions (local category matching + debounced API results for search history and businesses). The component uses ARIA combobox pattern for accessibility and navigates to the `/search` page on selection.

## Tasks

- [x] 1. Create SmartSearchInput component with core structure and local category filtering
  - [x] 1.1 Create `apps/web/components/home/SmartSearchInput.tsx` with input field, search icon, container ref, and internal state management
    - Implement the component shell with `'use client'` directive
    - Add state variables: `query`, `isOpen`, `isLoading`, `apiHistory`, `apiBusinesses`, `highlightIndex`
    - Render the text input with placeholder "Search for restaurants, services..."
    - Add the Search icon from lucide-react inside the input
    - Include ARIA attributes: `role="combobox"`, `aria-label`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, `aria-autocomplete="list"`
    - Accept `className` prop for external styling
    - _Requirements: 1.1, 1.2, 1.3, 7.1, 7.3_

  - [x] 1.2 Implement `filterCategories` utility function and local category suggestion rendering
    - Export a `filterCategories(query: string): CategorySeed[]` function that performs case-insensitive substring match on category `name` field
    - Cap results at 5 items
    - Render matching categories in a "Categories" section with icon and name
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 1.3 Write property test for category filter (Property 1)
    - **Property 1: Category filter returns only matching results and respects the cap**
    - **Validates: Requirements 2.1, 2.3**

- [x] 2. Implement suggestion dropdown and click-outside behavior
  - [x] 2.1 Implement the Suggestion_Dropdown overlay with listbox role and grouped sections
    - Render dropdown as an absolute-positioned `ul` with `role="listbox"` and `id="smart-search-listbox"`
    - Each suggestion item uses `role="option"` and `aria-selected` for the highlighted item
    - Group suggestions into sections: Categories, Recent searches, Businesses with section labels
    - Show dropdown when `isOpen` is true and there are suggestions or loading state
    - Style with Tailwind: rounded-xl, shadow-lg, border, bg-white, z-50
    - _Requirements: 5.1, 5.3, 7.2, 7.4_

  - [x] 2.2 Implement click-outside handler to close dropdown
    - Add mousedown event listener on document using `useEffect`
    - Check if click target is outside `containerRef.current`
    - Close dropdown and reset `highlightIndex` on outside click
    - Clean up listener on unmount
    - _Requirements: 5.2, 5.4_

- [x] 3. Implement debounced API suggestions
  - [x] 3.1 Implement debounce logic and API fetching for search history and business suggestions
    - Use a `useRef` for the debounce timeout
    - On input change: set query, show dropdown if length >= 1, clear previous timeout
    - If query length >= 2: set loading true, schedule API fetch after 300ms
    - If query length < 2: clear API results and loading state
    - Fetch search history from `GET /user/search-history` (authenticated users only, filter client-side, cap at 3)
    - Fetch businesses from `GET /businesses/search?q={query}&lat={lat}&lng={lng}&limit=5`
    - Skip API calls if user is not authenticated (for history) or no location available
    - Show Loader2 spinner while loading
    - On API error: silently hide loading, continue showing local results
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 3.2 Write property test for debounce gating (Property 2)
    - **Property 2: Debounce gates API requests**
    - **Validates: Requirements 3.1**

  - [ ]* 3.3 Write property test for API suggestion caps (Property 3)
    - **Property 3: API suggestion counts respect caps**
    - **Validates: Requirements 3.3**

- [x] 4. Implement keyboard navigation and selection/navigation logic
  - [x] 4.1 Implement keyboard navigation (ArrowDown, ArrowUp, Enter, Escape)
    - Build flat `allSuggestions` array from categories + history + businesses
    - ArrowDown: increment highlightIndex with wrap-around
    - ArrowUp: decrement highlightIndex with wrap-around
    - Enter with highlight: select highlighted item; Enter without highlight: submit raw query
    - Escape: close dropdown and reset highlightIndex
    - Prevent default on arrow keys and Enter when dropdown is open
    - _Requirements: 5.5_

  - [x] 4.2 Implement `handleSelect` and `handleSubmit` navigation functions
    - Category selection: navigate to `/search?category={slug}`
    - History/business selection: navigate to `/search?q={encodeURIComponent(value)}`
    - Enter with text: navigate to `/search?q={encodeURIComponent(query.trim())}`
    - Enter with empty input: navigate to `/search`
    - Use Next.js `useRouter().push()` for navigation
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 4.3 Write property test for category navigation (Property 4)
    - **Property 4: Category selection navigates with slug**
    - **Validates: Requirements 4.1**

  - [ ]* 4.4 Write property test for text-based navigation (Property 5)
    - **Property 5: Text-based suggestion selection navigates with query parameter**
    - **Validates: Requirements 4.2, 4.3, 4.4**

  - [ ]* 4.5 Write property test for keyboard index cycling (Property 6)
    - **Property 6: Keyboard navigation cycles through suggestions**
    - **Validates: Requirements 5.5**

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Integrate SmartSearchInput into homepage
  - [x] 6.1 Replace category filter pills with SmartSearchInput in `apps/web/app/(customer)/page.tsx`
    - Import `SmartSearchInput` from `@/components/home/SmartSearchInput`
    - Remove the `topCategories` filter pill loop and `FilterPill` usage in the "Search for" section
    - Remove the `selectedCategory` state and its usage in the search button
    - Render `<SmartSearchInput />` in place of the pill buttons
    - Keep the radius selector, sort control, and search button row unchanged below the input
    - Keep quick access section, PopularNearYou, and map section intact
    - _Requirements: 1.4, 6.1, 6.2, 6.3, 6.4_

  - [ ]* 6.2 Write property test for aria-expanded reflecting dropdown state (Property 7)
    - **Property 7: aria-expanded reflects dropdown visibility**
    - **Validates: Requirements 7.3**

- [x] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses `vitest` with `fast-check` for property-based testing (already in devDependencies)
- TypeScript is used throughout — the design uses specific TypeScript code

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["1.3", "2.2", "3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "4.1"] },
    { "id": 4, "tasks": ["4.2"] },
    { "id": 5, "tasks": ["4.3", "4.4", "4.5"] },
    { "id": 6, "tasks": ["6.1"] },
    { "id": 7, "tasks": ["6.2"] }
  ]
}
```
