import { describe, it, expect } from 'vitest'
import { filterCategories } from './SmartSearchInput'
import { CATEGORIES } from '@getnear/config'

describe('filterCategories', () => {
  it('returns empty array for empty query', () => {
    expect(filterCategories('')).toEqual([])
  })

  it('returns empty array for whitespace-only query', () => {
    expect(filterCategories('   ')).toEqual([])
  })

  it('performs case-insensitive substring matching on name', () => {
    const results = filterCategories('food')
    expect(results.length).toBeGreaterThan(0)
    results.forEach((cat) => {
      expect(cat.name.toLowerCase()).toContain('food')
    })
  })

  it('matches partial substrings', () => {
    const results = filterCategories('rest')
    expect(results.length).toBeGreaterThan(0)
    results.forEach((cat) => {
      expect(cat.name.toLowerCase()).toContain('rest')
    })
  })

  it('caps results at 5 items', () => {
    // Use a very common letter to potentially match many categories
    const results = filterCategories('a')
    expect(results.length).toBeLessThanOrEqual(5)
  })

  it('returns correct category objects with all fields', () => {
    const results = filterCategories('food')
    results.forEach((cat) => {
      expect(cat).toHaveProperty('id')
      expect(cat).toHaveProperty('name')
      expect(cat).toHaveProperty('slug')
      expect(cat).toHaveProperty('icon')
      expect(cat).toHaveProperty('color')
    })
  })

  it('returns no results for a query that matches nothing', () => {
    const results = filterCategories('zzzzzzzzz')
    expect(results).toEqual([])
  })

  it('is case-insensitive - uppercase query matches lowercase names', () => {
    const lower = filterCategories('food')
    const upper = filterCategories('FOOD')
    expect(lower).toEqual(upper)
  })
})
