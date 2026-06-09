'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Search, Clock, Store, Loader2 } from 'lucide-react'
import { CATEGORIES, type CategorySeed } from '@getnear/config'
import { useAuthStore } from '@/lib/stores/authStore'
import { useLocationStore } from '@/lib/stores/locationStore'
import apiClient from '@/lib/api'
import { cn } from '@/lib/utils'

export interface SmartSearchInputProps {
  className?: string
}

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

export interface SuggestionItem {
  type: 'category' | 'history' | 'business'
  label: string
  icon?: string
  slug?: string
  value: string
}

/**
 * Filters the CATEGORIES array by performing a case-insensitive substring
 * match on the category `name` field. Returns at most 5 results.
 */
export function filterCategories(query: string): CategorySeed[] {
  if (!query.trim()) return []
  const lower = query.toLowerCase()
  return CATEGORIES
    .filter((cat) => cat.name.toLowerCase().includes(lower))
    .slice(0, 5)
}

export function SmartSearchInput({ className }: SmartSearchInputProps) {
  const [query, setQuery] = React.useState('')
  const [isOpen, setIsOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [apiHistory, setApiHistory] = React.useState<SearchHistoryEntry[]>([])
  const [apiBusinesses, setApiBusinesses] = React.useState<BusinessSuggestion[]>([])
  const [highlightIndex, setHighlightIndex] = React.useState(-1)

  const containerRef = React.useRef<HTMLDivElement>(null)
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const router = useRouter()
  const { session } = useAuthStore()
  const { lat, lng } = useLocationStore()

  // Build filtered categories from current query
  const filteredCategories = React.useMemo(() => filterCategories(query), [query])

  // Build flat suggestion list from categories, history, and businesses
  const allSuggestions: SuggestionItem[] = React.useMemo(() => {
    const items: SuggestionItem[] = []

    // Categories section
    filteredCategories.forEach((cat) => {
      items.push({
        type: 'category',
        label: cat.name,
        icon: cat.icon,
        slug: cat.slug,
        value: cat.name,
      })
    })

    // Recent searches section
    apiHistory.forEach((entry) => {
      items.push({
        type: 'history',
        label: entry.query,
        value: entry.query,
      })
    })

    // Businesses section
    apiBusinesses.forEach((biz) => {
      items.push({
        type: 'business',
        label: biz.name,
        slug: biz.slug,
        value: biz.name,
      })
    })

    return items
  }, [filteredCategories, apiHistory, apiBusinesses])

  // Determine whether to show dropdown
  const showDropdown = isOpen && (allSuggestions.length > 0 || isLoading)

  // Compute section items for rendering grouped sections
  const categorySuggestions = allSuggestions.filter((s) => s.type === 'category')
  const historySuggestions = allSuggestions.filter((s) => s.type === 'history')
  const businessSuggestions = allSuggestions.filter((s) => s.type === 'business')

  // Get the global index for a suggestion given its section and local index
  function getGlobalIndex(type: 'category' | 'history' | 'business', localIndex: number): number {
    if (type === 'category') return localIndex
    if (type === 'history') return categorySuggestions.length + localIndex
    return categorySuggestions.length + historySuggestions.length + localIndex
  }

  // Close dropdown when user clicks outside the container
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

  // Clean up debounce timeout on unmount
  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  /**
   * Fetches search history (authenticated users only) and business suggestions
   * from the API. Filters history client-side and caps results.
   */
  async function fetchApiSuggestions(searchQuery: string) {
    try {
      const promises: [Promise<SearchHistoryEntry[]>, Promise<BusinessSuggestion[]>] = [
        // Fetch search history only if the user is authenticated
        session?.access_token
          ? apiClient
              .get<{ data: SearchHistoryEntry[] }>('/user/search-history')
              .then((res) => {
                const entries = res.data.data ?? []
                // Filter client-side: case-insensitive substring match, cap at 3
                const lower = searchQuery.toLowerCase()
                return entries
                  .filter((entry) => entry.query.toLowerCase().includes(lower))
                  .slice(0, 3)
              })
              .catch(() => [] as SearchHistoryEntry[])
          : Promise.resolve([] as SearchHistoryEntry[]),

        // Fetch businesses only if location is available
        lat != null && lng != null
          ? apiClient
              .get<{ data: BusinessSuggestion[] }>('/businesses/search', {
                params: { q: searchQuery, lat, lng, limit: 5 },
              })
              .then((res) => (res.data.data ?? []).slice(0, 5))
              .catch(() => [] as BusinessSuggestion[])
          : Promise.resolve([] as BusinessSuggestion[]),
      ]

      const [historyResults, businessResults] = await Promise.all(promises)
      setApiHistory(historyResults)
      setApiBusinesses(businessResults)
    } catch {
      // Silently fail — continue showing local results
    } finally {
      setIsLoading(false)
    }
  }

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

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setQuery(value)
    setHighlightIndex(-1)
    setIsOpen(value.length >= 1)

    // Clear previous debounce timeout
    if (debounceRef.current) clearTimeout(debounceRef.current)

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

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          role="combobox"
          aria-label="Search for businesses and categories"
          aria-expanded={isOpen}
          aria-controls="smart-search-listbox"
          aria-activedescendant={
            highlightIndex >= 0 ? `suggestion-${highlightIndex}` : undefined
          }
          aria-autocomplete="list"
          placeholder="Search for restaurants, services..."
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
        />
      </div>

      {showDropdown && (
        <ul
          id="smart-search-listbox"
          role="listbox"
          className="absolute left-0 right-0 mt-1 max-h-80 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg z-50"
        >
          {/* Categories section */}
          {categorySuggestions.length > 0 && (
            <li className="px-3 pt-3 pb-1" role="presentation">
              <span className="text-xs font-semibold text-gray-500 uppercase">
                Categories
              </span>
            </li>
          )}
          {categorySuggestions.map((item, localIndex) => {
            const globalIndex = getGlobalIndex('category', localIndex)
            return (
              <li
                key={`category-${localIndex}`}
                id={`suggestion-${globalIndex}`}
                role="option"
                aria-selected={globalIndex === highlightIndex}
                onClick={() => handleSelect(item)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 cursor-pointer text-sm',
                  globalIndex === highlightIndex
                    ? 'bg-primary/5'
                    : 'hover:bg-gray-50'
                )}
              >
                <span className="text-base flex-shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </li>
            )
          })}

          {/* Recent searches section */}
          {historySuggestions.length > 0 && (
            <li className="px-3 pt-3 pb-1" role="presentation">
              <span className="text-xs font-semibold text-gray-500 uppercase">
                Recent searches
              </span>
            </li>
          )}
          {historySuggestions.map((item, localIndex) => {
            const globalIndex = getGlobalIndex('history', localIndex)
            return (
              <li
                key={`history-${localIndex}`}
                id={`suggestion-${globalIndex}`}
                role="option"
                aria-selected={globalIndex === highlightIndex}
                onClick={() => handleSelect(item)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 cursor-pointer text-sm',
                  globalIndex === highlightIndex
                    ? 'bg-primary/5'
                    : 'hover:bg-gray-50'
                )}
              >
                <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </li>
            )
          })}

          {/* Businesses section */}
          {businessSuggestions.length > 0 && (
            <li className="px-3 pt-3 pb-1" role="presentation">
              <span className="text-xs font-semibold text-gray-500 uppercase">
                Businesses
              </span>
            </li>
          )}
          {businessSuggestions.map((item, localIndex) => {
            const globalIndex = getGlobalIndex('business', localIndex)
            return (
              <li
                key={`business-${localIndex}`}
                id={`suggestion-${globalIndex}`}
                role="option"
                aria-selected={globalIndex === highlightIndex}
                onClick={() => handleSelect(item)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 cursor-pointer text-sm',
                  globalIndex === highlightIndex
                    ? 'bg-primary/5'
                    : 'hover:bg-gray-50'
                )}
              >
                <Store className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </li>
            )
          })}

          {/* Loading indicator */}
          {isLoading && (
            <li className="flex items-center justify-center gap-2 px-3 py-3 text-sm text-gray-400" role="presentation">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading suggestions...</span>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
