/**
 * Database version tracking.
 *
 * Maps each database CSV filename to its source version (date stamp).
 * Used to verify that the latest databases are in use and
 * to display version info in the UI.
 */

/**
 * Version registry: filename → version string (MM.YYYY format).
 * Updated when new database files are provided by researchers.
 */
export const DATABASE_VERSIONS: Record<string, string> = {
  // Settlement databases — updated 01.2026
  'settlement_age_database.csv': '01.2026',
  'settlement_size_database.csv': '01.2026',

  // Egg — updated 01.2026
  'egg_database.csv': '01.2026',

  // Developmental stages — 06.2025
  'larval_growth_database.csv': '06.2025',
  'hatching_size_database.csv': '06.2025',
  'incubation_database.csv': '06.2025',
  'first_feeding_age_database.csv': '06.2025',
  'first_feeding_size_database.csv': '06.2025',
  'flexion_age_database.csv': '06.2025',
  'flexion_size_database.csv': '06.2025',
  'metamorphosis_age_database.csv': '01.2026',
  'metamorphosis_size_database.csv': '06.2025',

  // Pelagic juvenile — 06.2025
  'pelagic_juvenile_database.csv': '06.2025',

  // Swimming — mixed
  'critical_swimming_speed_database.csv': '06.2025',
  'in_situ_swimming_speed_database.csv': '01.2026',

  // Behavior — vertical position updated 01.2026
  'vertical_position_database.csv': '01.2026',
  'rafting_database.csv': '06.2025',
};

/**
 * Get the version of a database file.
 *
 * @param filename - Database CSV filename
 * @returns Version string (e.g., '01.2026') or 'unknown'
 */
export function getDatabaseVersion(filename: string): string {
  return DATABASE_VERSIONS[filename] ?? 'unknown';
}

/**
 * Get all databases and their versions.
 */
export function getAllDatabaseVersions(): Array<{ filename: string; version: string }> {
  return Object.entries(DATABASE_VERSIONS).map(([filename, version]) => ({
    filename,
    version,
  }));
}
