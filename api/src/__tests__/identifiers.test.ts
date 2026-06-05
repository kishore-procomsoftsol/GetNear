import { describe, it, expect } from 'vitest'
import { isUUID, isValidSlug } from '../utils/identifiers'

describe('isUUID', () => {
  it('returns true for valid UUID v4 strings', () => {
    expect(isUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    expect(isUUID('6ba7b810-9dad-41d0-80b4-00c04fd430c8')).toBe(true)
    expect(isUUID('F47AC10B-58CC-4372-A567-0E02B2C3D479')).toBe(true)
  })

  it('returns false for non-UUID strings', () => {
    expect(isUUID('my-business-slug')).toBe(false)
    expect(isUUID('not-a-uuid-at-all')).toBe(false)
    expect(isUUID('')).toBe(false)
    expect(isUUID('550e8400-e29b-31d4-a716-446655440000')).toBe(false) // version 3
    expect(isUUID('550e8400-e29b-41d4-c716-446655440000')).toBe(false) // invalid variant
  })

  it('rejects UUID-like strings with wrong format', () => {
    expect(isUUID('550e8400e29b41d4a716446655440000')).toBe(false) // no dashes
    expect(isUUID('550e8400-e29b-41d4-a716-44665544000')).toBe(false) // too short
    expect(isUUID('550e8400-e29b-41d4-a716-4466554400000')).toBe(false) // too long
  })
})

describe('isValidSlug', () => {
  it('returns true for valid slugs', () => {
    expect(isValidSlug('abc')).toBe(true)
    expect(isValidSlug('my-business')).toBe(true)
    expect(isValidSlug('joes-pizza-new-york')).toBe(true)
    expect(isValidSlug('a1b2c3')).toBe(true)
    expect(isValidSlug('business123')).toBe(true)
  })

  it('returns false for slugs that are too short', () => {
    expect(isValidSlug('')).toBe(false)
    expect(isValidSlug('ab')).toBe(false)
    expect(isValidSlug('a')).toBe(false)
  })

  it('returns false for slugs that are too long', () => {
    expect(isValidSlug('a'.repeat(121))).toBe(false)
  })

  it('accepts slugs at length boundaries', () => {
    expect(isValidSlug('abc')).toBe(true) // exactly 3
    expect(isValidSlug('a'.repeat(120))).toBe(true) // exactly 120
  })

  it('returns false for invalid slug formats', () => {
    expect(isValidSlug('-leading-hyphen')).toBe(false)
    expect(isValidSlug('trailing-hyphen-')).toBe(false)
    expect(isValidSlug('double--hyphen')).toBe(false)
    expect(isValidSlug('UPPERCASE')).toBe(false)
    expect(isValidSlug('has spaces')).toBe(false)
    expect(isValidSlug('has_underscore')).toBe(false)
    expect(isValidSlug('special!chars')).toBe(false)
  })
})
