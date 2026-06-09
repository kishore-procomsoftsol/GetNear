# Design Document: Smart Search Input

## Overview

The SmartSearchInput feature replaces the existing category filter pill buttons on the GetNear homepage with a single unified search input that provides auto-suggestions. It uses a hybrid approach: local category matching for instant results and debounced API calls for search history and business name suggestions. On selection or Enter, the user navigates to the `/search` results page.

## Architecture

The SmartSearchInput replaces the existing category filter pill buttons on the homepage with a unified search input featuring a hybrid auto-suggestion dropdown. The architecture follows a client-first approach: local category matching happens synchronously on every keystroke, while API-enriched suggestions (search history + business names) are fetched after a 300ms debounce once the user has typed at least 2 characters.

```
┌─────────────────────────────────────────────────────┐
│                    Homepage                          │
│  ┌───────────────────────────────────────────────┐  │
│  │           SmartSearchInput (reusable)         │  │
│  │  ┌─────────────────────────────────────────┐  │  │
│  │  │   [🔍] Search for restaurants, services…│  │  │
│  │  └─────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────┐  │  │
│  │  │       Suggestion_Dropdown (overlay)     │  │  │
│  │  │  ┌── Categories ─────────────────────┐  │  │  │
│  │  │  │  🍛 Restaurants                   │  │  │  │
│  │  │  │  ☕ Cafes                          │  │  │  │
│  │  │  └───────────────────────────────────┘  │  │  │
│  │  │  ┌── Recent searches ────────────────┐  │  │  │
│  │  │  │  🕒 "pizza near me"               │  │  │  │
│  │  │  └───────────────────────────────────┘  │  │  │
│  │  │  ┌── Businesses ─────────────────────┐  │  │  │
│  │  │  │  🏪 Domino's Pizza                │  │  │  │
│  │  │  └───────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────┘  │
│  ┌────────┐ ┌───────────┐ ┌───────────────────┐    │
│  │ Radius │ │   Sort    │ │   Search button   │    │
│  └────────┘ └───────────┘ └───────────────────┘    │
└─────────────────────────────────────────────────────┘
```

## Components and Interfaces

### SmartSearchInput

**File:** `apps/web/components/home/SmartSearchInput.tsx`

A self-contained React component that manages its own internal state for the input value, dropdown visibility, loading state, API suggestions, and keyboard navigation index. It imports the `CATEGORIES` array from `@getnear/config` for local matching and uses Next.js `useRouter` for navigation.

```typescript
'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Search, Clock, Store, Loader2 } from 'lucide-react'
import { CATEGORIES, type CategorySeed } from '@getnear/config'
import { useAuthStore } from '@/lib/stores/authStore'

export interface SmartSearchInputProps {
  className?: string
}

export function SmartSearchInput({ className }: SmartSearchInputProps) {
  // Component implementation
}
```

### Internal State

| State Variable | Type | Purpose |
|---|---|---|
| `query` | `string` | Current input text |
| `isOpen` | `boolean` | Whether the dropdown is visible |
| `isLoading` | `boolean` | Whether an API request is in flight |
| `apiHistory` | `SearchHistoryEntry[]` | Recent search history from API |
| `apiBusinesses` | `BusinessSuggestion[]` | Business name matches from API |
| `highlightIndex` | `number` | Currently highlighted suggestion index (-1 = none) |

## Data Models

### Interfaces

```typescript
interface SearchHistoryEntry {
  id: string
  query: string
  created_at: string
}

interface BusinessSuggestion {
  id: string
  name: string
  slug: string
  category_name?: string
}

interface SuggestionItem {
  type: 'category' | 'history' | 'business'
  label: string
  icon?: string
  slug?: string
  value: string
}
```

## Data Flow

### 1. Local Category Filtering (Synchronous)

```typescript
function filterCategories(query: string): CategorySeed[] {
  if (!query.trim()) return []
  const lower = query.toLowerCase()
  return CATEGORIES
    .filter((cat) => cat.name.toLowerCase().includes(lower))
    .slice(0, 5)
}
```

This function runs on every keystroke. It performs a case-insensitive substring match against the `name` field of each category in the `CATEGORIES` array and returns at most 5 results.

### 2. API-Enriched Suggestions (Debounced)

After 300ms of typing inactivity and when the query has >= 2 characters, two parallel API requests are fired:

```typescript
// Fetch search history (authenticated users only)
GET /user/search-history
// Response: { data: [{ id, query, lat, lng, created_at }] }

// Fetch matching businesses
GET /businesses/search?q={query}&lat={lat}&lng={lng}&limit=5
// Response: { data: [{ id, name, slug, ... }] }
```

The component filters the search history client-side to match entries whose `query` field contains the current input as a substring (case-insensitive), capped at 3 results. Business results come pre-filtered from the API, capped at 5 results.

### 3. Debounce Implementation

```typescript
const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

function handleInputChange(value: string) {
  setQuery(value)
  setHighlightIndex(-1)

  // Show dropdown if there's content
  setIsOpen(value.length >= 1)

  // Clear previous debounce
  if (debounceRef.current) clearTimeout(debounceRef.current)

  // Only fetch API suggestions for >= 2 characters
  if (value.trim().length >= 2) {
    setIsLoading(true)
    debounceRef.current = setTimeout(() => {
      fetchApiSuggestions(value.trim())
    }, 300)
  } else {
    setIsLoading(false)
    setApiHistory([])
    setApiBusinesses([])
  }
}
```

### 4. Navigation Logic

```typescript
function handleSelect(item: SuggestionItem) {
  if (item.type === 'category') {
    router.push(`/search?category=${item.slug}`)
  } else {
    router.push(`/search?q=${encodeURIComponent(item.value)}`)
  }
}

function handleSubmit() {
  if (query.trim()) {
    router.push(`/search?q=${encodeURIComponent(query.trim())}`)
  } else {
    router.push('/search')
  }
}
```

## Keyboard Navigation

The component maintains a flat list of all visible suggestions (categories + history + businesses). The `highlightIndex` tracks the currently focused item:

- **ArrowDown**: Increments `highlightIndex`, wrapping to 0 at the end
- **ArrowUp**: Decrements `highlightIndex`, wrapping to last item at -1
- **Enter**: If `highlightIndex >= 0`, selects the highlighted item; otherwise submits the raw query
- **Escape**: Closes the dropdown

```typescript
function handleKeyDown(e: React.KeyboardEvent) {
  const totalItems = allSuggestions.length
  if (!isOpen || totalItems === 0) {
    if (e.key === 'Enter') { handleSubmit(); return }
    return
  }

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      setHighlightIndex((prev) => (prev + 1) % totalItems)
      break
    case 'ArrowUp':
      e.preventDefault()
      setHighlightIndex((prev) => (prev - 1 + totalItems) % totalItems)
      break
    case 'Enter':
      e.preventDefault()
      if (highlightIndex >= 0) handleSelect(allSuggestions[highlightIndex])
      else handleSubmit()
      break
    case 'Escape':
      setIsOpen(false)
      setHighlightIndex(-1)
      break
  }
}
```

## Click-Outside Handling

A `ref` on the container element combined with a `mousedown` event listener closes the dropdown when the user clicks outside:

```typescript
const containerRef = React.useRef<HTMLDivElement>(null)

React.useEffect(() => {
  function handleClickOutside(e: MouseEvent) {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setIsOpen(false)
      setHighlightIndex(-1)
    }
  }
  document.addEventListener('mousedown', handleClickOutside)
  return () => document.removeEventListener('mousedown', handleClickOutside)
}, [])
```

## Accessibility

The component uses ARIA combobox pattern:

```tsx
<div ref={containerRef} className="relative">
  <input
    role="combobox"
    aria-label="Search for businesses and categories"
    aria-expanded={isOpen}
    aria-controls="smart-search-listbox"
    aria-activedescendant={
      highlightIndex >= 0 ? `suggestion-${highlightIndex}` : undefined
    }
    aria-autocomplete="list"
    // ...
  />
  {isOpen && (
    <ul id="smart-search-listbox" role="listbox">
      {allSuggestions.map((item, index) => (
        <li
          key={`${item.type}-${index}`}
          id={`suggestion-${index}`}
          role="option"
          aria-selected={index === highlightIndex}
          // ...
        >
          {/* suggestion content */}
        </li>
      ))}
    </ul>
  )}
</div>
```

## Homepage Integration

The SmartSearchInput replaces the existing `topCategories` filter pill loop in `apps/web/app/(customer)/page.tsx`. The radius selector, sort control, and search button remain in the same row below the search input:

```tsx
{/* Search Area — replaces category filter pills */}
<div className="px-4 pt-5">
  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Search for</p>
  <SmartSearchInput />

  {/* Radius + Sort + Search Button (unchanged) */}
  <div className="flex items-center gap-3 mt-4">
    {/* radius selector */}
    {/* sort control */}
    {/* search button */}
  </div>
</div>
```

## Error Handling

| Scenario | Behavior |
|---|---|
| API request fails (network error, 5xx) | Silently hide loading indicator, continue showing local category results |
| User not authenticated | Skip search history fetch, only fetch business suggestions |
| No location available | Skip API suggestions entirely (lat/lng required for business search) |
| Empty API response | Show only local category matches |

## Styling

The component uses Tailwind CSS classes consistent with the existing codebase:
- Input: rounded-xl border with focus ring, padding for icon
- Dropdown: absolute positioned, rounded-xl, shadow-lg, border, bg-white, z-50
- Suggestion items: hover:bg-gray-50, active highlight with bg-primary/5
- Section labels: text-xs font-semibold text-gray-500 uppercase

## Testing Strategy

- **Property-based tests**: Validate the core logic functions (`filterCategories`, debounce behavior, navigation URL construction, keyboard index cycling) using generated inputs with at minimum 100 iterations per property.
- **Unit tests (example-based)**: Verify specific rendering details (placeholder text, icon presence, ARIA attributes, section labels), click-outside behavior, and error handling paths.
- **Integration tests**: Verify homepage-level coexistence of SmartSearchInput with radius/sort controls and quick access section.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Category filter returns only matching results and respects the cap

*For any* query string of at least 1 character, the `filterCategories` function SHALL return only categories whose `name` contains the query as a case-insensitive substring, AND the result count SHALL be at most 5.

**Validates: Requirements 2.1, 2.3**

### Property 2: Debounce gates API requests

*For any* sequence of input changes, the component SHALL NOT issue an API request until 300ms have elapsed since the last change AND the current input length is at least 2 characters. If a new keystroke occurs before 300ms, the previous pending request SHALL be cancelled.

**Validates: Requirements 3.1**

### Property 3: API suggestion counts respect caps

*For any* API response containing N history entries and M business matches, the displayed suggestions SHALL contain at most min(N, 3) history entries and at most min(M, 5) business entries.

**Validates: Requirements 3.3**

### Property 4: Category selection navigates with slug

*For any* category from the CATEGORIES array that appears in the suggestion list, selecting it SHALL trigger navigation to `/search?category={slug}` where `{slug}` matches the category's `slug` field exactly.

**Validates: Requirements 4.1**

### Property 5: Text-based suggestion selection navigates with query parameter

*For any* suggestion of type "history" or "business" that the user selects, OR any non-empty text submitted via Enter, navigation SHALL go to `/search?q={value}` where `{value}` is the URL-encoded suggestion value or current input text.

**Validates: Requirements 4.2, 4.3, 4.4**

### Property 6: Keyboard navigation cycles through suggestions

*For any* visible suggestion list of length N (where N > 0), pressing ArrowDown K times from the initial state (highlightIndex = -1) SHALL result in highlightIndex equal to `(K - 1) % N` for K >= 1. Pressing ArrowUp from index 0 SHALL wrap to index N - 1.

**Validates: Requirements 5.5**

### Property 7: aria-expanded reflects dropdown visibility

*For any* state of the SmartSearchInput component, the `aria-expanded` attribute on the input element SHALL equal `true` when the Suggestion_Dropdown is visible and `false` when it is hidden.

**Validates: Requirements 7.3**
