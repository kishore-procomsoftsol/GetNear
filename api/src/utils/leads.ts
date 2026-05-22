/**
 * Lead type validation utilities.
 * Requirements: 4.4
 */

export const VALID_LEAD_TYPES = [
  'call',
  'direction',
  'whatsapp',
  'save',
  'view',
  'website',
] as const

export type LeadType = (typeof VALID_LEAD_TYPES)[number]

/** Returns true if the given value is a valid lead type string. */
export function isValidLeadType(type: unknown): type is LeadType {
  return (
    typeof type === 'string' &&
    (VALID_LEAD_TYPES as readonly string[]).includes(type)
  )
}
