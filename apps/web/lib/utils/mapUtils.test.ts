import { describe, it, expect } from 'vitest'
import { deriveMapPins, calculateWalkingTime, MapBusiness } from './mapUtils'

describe('deriveMapPins', () => {
  it('returns pins for businesses with valid coordinates', () => {
    const businesses: MapBusiness[] = [
      { id: '1', name: 'Cafe A', lat: 17.385, lng: 78.4867, rating_avg: 4.5, distance_m: 400 },
      { id: '2', name: 'Cafe B', lat: 12.9716, lng: 77.5946, rating_avg: 3.8, distance_m: 800 },
    ]

    const pins = deriveMapPins(businesses)

    expect(pins).toHaveLength(2)
    expect(pins[0]).toEqual({
      id: '1',
      lat: 17.385,
      lng: 78.4867,
      name: 'Cafe A',
      rating: 4.5,
      walkingTime: '5 min',
    })
    expect(pins[1]).toEqual({
      id: '2',
      lat: 12.9716,
      lng: 77.5946,
      name: 'Cafe B',
      rating: 3.8,
      walkingTime: '10 min',
    })
  })

  it('excludes businesses with null lat or lng', () => {
    const businesses: MapBusiness[] = [
      { id: '1', name: 'Valid', lat: 10, lng: 20, distance_m: 160 },
      { id: '2', name: 'No lat', lat: null, lng: 20, distance_m: 160 },
      { id: '3', name: 'No lng', lat: 10, lng: null, distance_m: 160 },
      { id: '4', name: 'Both null', lat: null, lng: null, distance_m: 160 },
    ]

    const pins = deriveMapPins(businesses)

    expect(pins).toHaveLength(1)
    expect(pins[0].id).toBe('1')
  })

  it('excludes businesses with undefined lat or lng', () => {
    const businesses: MapBusiness[] = [
      { id: '1', name: 'No coords' },
      { id: '2', name: 'Has coords', lat: 0, lng: 0, distance_m: 80 },
    ]

    const pins = deriveMapPins(businesses)

    expect(pins).toHaveLength(1)
    expect(pins[0].id).toBe('2')
  })

  it('excludes businesses with out-of-range latitude', () => {
    const businesses: MapBusiness[] = [
      { id: '1', name: 'Too high lat', lat: 91, lng: 50 },
      { id: '2', name: 'Too low lat', lat: -91, lng: 50 },
      { id: '3', name: 'Edge valid', lat: 90, lng: 180 },
    ]

    const pins = deriveMapPins(businesses)

    expect(pins).toHaveLength(1)
    expect(pins[0].id).toBe('3')
  })

  it('excludes businesses with out-of-range longitude', () => {
    const businesses: MapBusiness[] = [
      { id: '1', name: 'Too high lng', lat: 50, lng: 181 },
      { id: '2', name: 'Too low lng', lat: 50, lng: -181 },
      { id: '3', name: 'Edge valid', lat: -90, lng: -180 },
    ]

    const pins = deriveMapPins(businesses)

    expect(pins).toHaveLength(1)
    expect(pins[0].id).toBe('3')
  })

  it('excludes businesses with non-finite coordinates', () => {
    const businesses: MapBusiness[] = [
      { id: '1', name: 'Infinity lat', lat: Infinity, lng: 50 },
      { id: '2', name: 'NaN lng', lat: 50, lng: NaN },
      { id: '3', name: 'Valid', lat: 50, lng: 50 },
    ]

    const pins = deriveMapPins(businesses)

    expect(pins).toHaveLength(1)
    expect(pins[0].id).toBe('3')
  })

  it('returns empty array for empty input', () => {
    expect(deriveMapPins([])).toEqual([])
  })

  it('uses "— min" for businesses without distance_m', () => {
    const businesses: MapBusiness[] = [
      { id: '1', name: 'No distance', lat: 10, lng: 20 },
      { id: '2', name: 'Null distance', lat: 10, lng: 20, distance_m: null },
    ]

    const pins = deriveMapPins(businesses)

    expect(pins[0].walkingTime).toBe('— min')
    expect(pins[1].walkingTime).toBe('— min')
  })

  it('maps rating_avg to rating, defaulting to null', () => {
    const businesses: MapBusiness[] = [
      { id: '1', name: 'Has rating', lat: 10, lng: 20, rating_avg: 4.2 },
      { id: '2', name: 'No rating', lat: 10, lng: 20, rating_avg: null },
      { id: '3', name: 'Undefined rating', lat: 10, lng: 20 },
    ]

    const pins = deriveMapPins(businesses)

    expect(pins[0].rating).toBe(4.2)
    expect(pins[1].rating).toBeNull()
    expect(pins[2].rating).toBeNull()
  })
})

describe('calculateWalkingTime', () => {
  it('calculates walking time at 80m/min', () => {
    expect(calculateWalkingTime(80)).toBe('1 min')
    expect(calculateWalkingTime(400)).toBe('5 min')
    expect(calculateWalkingTime(1600)).toBe('20 min')
  })

  it('rounds to nearest minute', () => {
    expect(calculateWalkingTime(100)).toBe('1 min')
    expect(calculateWalkingTime(120)).toBe('2 min')
    expect(calculateWalkingTime(39)).toBe('0 min')
  })

  it('returns "— min" for null or undefined', () => {
    expect(calculateWalkingTime(null)).toBe('— min')
    expect(calculateWalkingTime(undefined)).toBe('— min')
  })

  it('returns "— min" for negative distance', () => {
    expect(calculateWalkingTime(-100)).toBe('— min')
  })

  it('returns "— min" for non-finite values', () => {
    expect(calculateWalkingTime(Infinity)).toBe('— min')
    expect(calculateWalkingTime(NaN)).toBe('— min')
  })

  it('returns "0 min" for zero distance', () => {
    expect(calculateWalkingTime(0)).toBe('0 min')
  })
})
