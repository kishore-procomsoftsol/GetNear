/**
 * Identifier detection and validation utilities.
 *
 * Used by route handlers to distinguish UUID-based lookups from slug-based
 * lookups when resolving business identifiers from URL parameters.
 *
 * Requirements: 2.1, 2.4
 */

/** Matches UUID v4 format (case-insensitive) */
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Matches valid slug: lowercase alphanumeric segments separated by single hyphens */
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const MIN_SLUG_LENGTH = 3;
const MAX_SLUG_LENGTH = 120;

/**
 * Detects whether a string is a valid UUID v4.
 *
 * The version nibble must be `4` and the variant nibble must be one of
 * `8`, `9`, `a`, or `b`.
 */
export function isUUID(value: string): boolean {
  return UUID_V4_REGEX.test(value);
}

/**
 * Validates whether a string is a well-formed slug.
 *
 * A valid slug is 3–120 characters long, consists of lowercase alphanumeric
 * segments separated by single hyphens, and contains no leading/trailing
 * hyphens or consecutive hyphens.
 */
export function isValidSlug(slug: string): boolean {
  return (
    slug.length >= MIN_SLUG_LENGTH &&
    slug.length <= MAX_SLUG_LENGTH &&
    SLUG_REGEX.test(slug)
  );
}
