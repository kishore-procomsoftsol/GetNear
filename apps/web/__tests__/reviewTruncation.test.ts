/**
 * Feature: listing-page-enhancements
 * Property 4: Review Card Text Truncation
 *
 * Validates: Requirements 3.2
 *
 * For any review with non-null text, the displayed text in a ReviewCard SHALL be
 * at most 150 characters long. If the original text exceeds 150 characters, the
 * displayed text SHALL end with an ellipsis ("…") and contain the first 150
 * characters of the original text.
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { truncateText } from '@/components/listings/ReviewCard'

const MAX_LENGTH = 150

describe('Feature: listing-page-enhancements, Property 4: Review Card Text Truncation', () => {
  it('output is always at most 151 characters (150 chars + ellipsis)', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 500 }), (text) => {
        const result = truncateText(text)
        // When input > 150, output = first 150 + '…' (1 char) = 151 chars
        // When input <= 150, output = input (at most 150 chars)
        expect(result.length).toBeLessThanOrEqual(MAX_LENGTH + 1)
      }),
      { numRuns: 100 }
    )
  })

  it('when input length is at most 150 characters, output equals input exactly', () => {
    const shortTextArb = fc.string({ minLength: 0, maxLength: MAX_LENGTH })
    fc.assert(
      fc.property(shortTextArb, (text) => {
        const result = truncateText(text)
        expect(result).toBe(text)
      }),
      { numRuns: 100 }
    )
  })

  it('when input exceeds 150 characters, output ends with "…"', () => {
    const longTextArb = fc.string({ minLength: MAX_LENGTH + 1, maxLength: 1000 })
    fc.assert(
      fc.property(longTextArb, (text) => {
        const result = truncateText(text)
        expect(result.endsWith('…')).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  it('when input exceeds 150 characters, output starts with the first 150 characters of input', () => {
    const longTextArb = fc.string({ minLength: MAX_LENGTH + 1, maxLength: 1000 })
    fc.assert(
      fc.property(longTextArb, (text) => {
        const result = truncateText(text)
        const prefix = result.slice(0, -1) // Remove the trailing '…'
        expect(prefix).toBe(text.slice(0, MAX_LENGTH))
      }),
      { numRuns: 100 }
    )
  })
})
