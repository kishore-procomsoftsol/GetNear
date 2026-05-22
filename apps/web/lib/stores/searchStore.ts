import { create } from 'zustand'
import type { Business } from '@getnear/types'

export interface SearchFilters {
  category_id?: string
  open_now?: boolean
  min_rating?: number
  sort?: 'relevance' | 'distance' | 'rating' | 'newest'
}

interface SearchStore {
  query: string
  filters: SearchFilters
  results: Business[]
  total: number
  page: number
  isLoading: boolean
  viewMode: 'list' | 'map'
  setQuery: (q: string) => void
  setFilters: (f: Partial<SearchFilters>) => void
  setViewMode: (mode: 'list' | 'map') => void
  setResults: (results: Business[], total: number) => void
  setPage: (page: number) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

const initialState = {
  query: '',
  filters: {} as SearchFilters,
  results: [] as Business[],
  total: 0,
  page: 1,
  isLoading: false,
  viewMode: 'list' as const,
}

export const useSearchStore = create<SearchStore>((set) => ({
  ...initialState,

  setQuery: (query) => set({ query }),
  setFilters: (f) =>
    set((state) => ({ filters: { ...state.filters, ...f } })),
  setViewMode: (viewMode) => set({ viewMode }),
  setResults: (results, total) => set({ results, total }),
  setPage: (page) => set({ page }),
  setLoading: (loading) => set({ isLoading: loading }),
  reset: () => set(initialState),
}))
