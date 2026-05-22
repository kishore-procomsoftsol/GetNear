import { create } from 'zustand'

interface LocationStore {
  lat: number | null
  lng: number | null
  city: string | null
  /** Search radius in kilometres. Defaults to 5 km. */
  radius: number
  isLocating: boolean
  _hydrated: boolean
  setLocation: (lat: number, lng: number, city?: string) => void
  setRadius: (radius: number) => void
  setLocating: (locating: boolean) => void
  _hydrate: () => void
}

// Persist location to sessionStorage so it survives page navigations
const STORAGE_KEY = 'getnear-location'

function persistLocation(state: { lat: number | null; lng: number | null; city: string | null; radius: number }) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      lat: state.lat,
      lng: state.lng,
      city: state.city,
      radius: state.radius,
    }))
  } catch {}
}

export const useLocationStore = create<LocationStore>((set, get) => ({
  lat: null,
  lng: null,
  city: null,
  radius: 5,
  isLocating: false,
  _hydrated: false,

  setLocation: (lat, lng, city) => {
    const state = { lat, lng, city: city ?? null, isLocating: false }
    persistLocation({ ...state, radius: get().radius })
    set(state)
  },
  setRadius: (radius) => {
    const { lat, lng, city } = get()
    persistLocation({ lat, lng, city, radius })
    set({ radius })
  },
  setLocating: (locating) => set({ isLocating: locating }),
  _hydrate: () => {
    if (get()._hydrated) return
    if (typeof window === 'undefined') return
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        set({
          lat: parsed.lat ?? null,
          lng: parsed.lng ?? null,
          city: parsed.city ?? null,
          radius: parsed.radius ?? 5,
          _hydrated: true,
        })
        return
      }
    } catch {}
    set({ _hydrated: true })
  },
}))
