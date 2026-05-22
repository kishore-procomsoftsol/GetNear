import { create } from 'zustand'
import type { User } from '@getnear/types'
import type { Session } from '@supabase/supabase-js'

const AUTH_STORAGE_KEY = 'getnear-auth'

interface AuthStore {
  user: User | null
  session: Session | null
  isLoading: boolean
  _hydrated: boolean
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setLoading: (loading: boolean) => void
  /** Clears user and session from the store and localStorage. */
  signOut: () => void
  /** Hydrate from localStorage (call once on client mount) */
  _hydrate: () => void
}

function persistAuth(user: User | null, session: Session | null) {
  if (typeof window === 'undefined') return
  try {
    if (user && session) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, session }))
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    }
  } catch {}
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  _hydrated: false,

  setUser: (user) => {
    set({ user })
    persistAuth(user, get().session)
  },
  setSession: (session) => {
    set({ session, isLoading: false })
    persistAuth(get().user, session)
  },
  setLoading: (loading) => set({ isLoading: loading }),
  signOut: () => {
    set({ user: null, session: null })
    persistAuth(null, null)
  },
  _hydrate: () => {
    if (get()._hydrated) return
    if (typeof window === 'undefined') {
      set({ _hydrated: true, isLoading: false })
      return
    }
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY)
      if (stored) {
        const { user, session } = JSON.parse(stored)
        set({ user, session, isLoading: false, _hydrated: true })
        return
      }
    } catch {}
    set({ _hydrated: true, isLoading: false })
  },
}))
