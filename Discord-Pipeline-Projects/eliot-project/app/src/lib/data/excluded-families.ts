/**
 * Families excluded from all data views.
 *
 * These entries were erroneously included in the vertical position database:
 * - Melampidae: gastropod mollusk family (order Ellobiida), not fish
 * - Odontostomidae: gastropod family (order Stylommatophora), not fish
 * - Parapercidae: invalid/deprecated fish family with incomplete data
 */

export const EXCLUDED_FAMILIES: ReadonlySet<string> = new Set([
  'Melampidae',
  'Odontostomidae',
  'Parapercidae',
]);

/**
 * Check if a family should be excluded from data processing.
 */
export function isExcludedFamily(family: string): boolean {
  if (!family) return false;
  return EXCLUDED_FAMILIES.has(family);
}
