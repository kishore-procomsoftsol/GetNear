/**
 * Property 4: Lead Recording
 * Validates: Requirements 4.4
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { isValidLeadType, VALID_LEAD_TYPES } from '../utils/leads'

describe('Property 4: Lead Recording — type validation', () => {
  it('all valid lead types are accepted', () => {
    VALID_LEAD_TYPES.forEach((type) => {
      expect(isValidLeadType(type)).toBe(true)
    })
  })

  it('arbitrary strings that are not lead types are rejected', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !(VALID_LEAD_TYPES as readonly string[]).includes(s)),
        (invalidType) => {
          expect(isValidLeadType(invalidType)).toBe(false)
        }
      ),
      { numRuns: 200 }
    )
  })

  it('non-string values are rejected', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer(),
          fc.boolean(),
          fc.constant(null),
          fc.constant(undefined)
        ),
        (nonString) => {
          expect(isValidLeadType(nonString)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('there are exactly 6 valid lead types', () => {
    expect(VALID_LEAD_TYPES).toHaveLength(6)
    expect(VALID_LEAD_TYPES).toContain('call')
    expect(VALID_LEAD_TYPES).toContain('direction')
    expect(VALID_LEAD_TYPES).toContain('whatsapp')
    expect(VALID_LEAD_TYPES).toContain('save')
    expect(VALID_LEAD_TYPES).toContain('view')
    expect(VALID_LEAD_TYPES).toContain('website')
  })
})
