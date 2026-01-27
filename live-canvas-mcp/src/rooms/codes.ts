/**
 * Session code generation using nanoid
 *
 * Generates 6-character uppercase alphanumeric codes that are:
 * - URL-safe
 * - Easy to read aloud (no confusing chars: 0/O, 1/l, I)
 * - Memorable for short-term sharing
 */

import { customAlphabet } from "nanoid";

/**
 * Custom alphabet excluding confusing characters:
 * - No 0 (looks like O)
 * - No O (looks like 0)
 * - No 1 (looks like l or I)
 * - No l (looks like 1 or I)
 * - No I (looks like 1 or l)
 */
const SAFE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/**
 * Session code length - 6 characters provides:
 * - ~1 billion combinations (32^6)
 * - Easy to type and share verbally
 * - Fits well in URLs
 */
const CODE_LENGTH = 6;

/**
 * Generate a nanoid instance with our custom alphabet
 */
const generateCode = customAlphabet(SAFE_ALPHABET, CODE_LENGTH);

/**
 * Generate a unique 6-character session code
 *
 * @returns Uppercase alphanumeric code (e.g., "ABC234")
 *
 * @example
 * const code = generateSessionCode();
 * // code: "X7KM9P"
 */
export function generateSessionCode(): string {
  return generateCode();
}

/**
 * Normalize a session code for comparison
 * - Converts to uppercase
 * - Trims whitespace
 *
 * @param code - Raw code input from user
 * @returns Normalized uppercase code
 */
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Validate that a code matches expected format
 *
 * @param code - Code to validate
 * @returns true if code is valid format
 */
export function isValidCodeFormat(code: string): boolean {
  const normalized = normalizeCode(code);
  if (normalized.length !== CODE_LENGTH) {
    return false;
  }
  // Check all characters are in our alphabet
  for (const char of normalized) {
    if (!SAFE_ALPHABET.includes(char)) {
      return false;
    }
  }
  return true;
}
