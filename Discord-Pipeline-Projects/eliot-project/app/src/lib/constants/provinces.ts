/**
 * Spalding province constants and CSV-to-shapefile name mapping.
 *
 * The shapefile uses canonical province names. The CSV has variant spellings
 * (no hyphens, no slashes, etc.) that must be mapped to canonical names.
 */

/** All 96 Spalding province names as they appear in the shapefile */
export const ALL_PROVINCES = [
  'Agulhas',
  'Agulhas Current',
  'Amsterdam-St Paul',
  'Andaman',
  'Antarctic',
  'Antarctic Polar Front',
  'Arctic',
  'Bay of Bengal',
  'Benguela',
  'Benguela Current',
  'Black Sea',
  'California Current',
  'Canary Current',
  'Central Indian Ocean Islands',
  'Central Polynesia',
  'Cold Temperate Northeast Pacific',
  'Cold Temperate Northwest Atlantic',
  'Cold Temperate Northwest Pacific',
  'Continental High Antarctic',
  'East Central Australian Shelf',
  'Easter Island',
  'Eastern Coral Triangle',
  'Eastern Tropical Pacific',
  'Equatorial Atlantic',
  'Equatorial Pacific',
  'Galapagos',
  'Guinea Current',
  'Gulf Stream',
  'Gulf of Guinea',
  'Hawaii',
  'Humboldt Current',
  'Indian Ocean Gyre',
  'Indian Ocean Monsoon Gyre',
  'Indonesian Through-Flow',
  'Inter American Seas',
  'Java Transitional',
  'Juan Fernández and Desventuradas',
  'Kuroshio',
  'Leeuwin Current',
  'Lord Howe and Norfolk Islands',
  'Lusitanian',
  'Magellanic',
  'Malvinas Current',
  'Marquesas',
  'Marshall, Gilbert and Ellis Islands',
  'Mediterranean',
  'Mediterranean Sea',
  'Non-gyral Southwest Pacific',
  'North Atlantic Transitional',
  'North Brazil Shelf',
  'North Central Atlantic Gyre',
  'North Central Pacific Gyre',
  'North Pacific Transitional',
  'Northeast Australian Shelf',
  'Northern European Seas',
  'Northern New Zealand',
  'Northwest Australian Shelf',
  'Red Sea',
  'Red Sea and Gulf of Aden',
  'Sahul Shelf',
  'Scotia Sea',
  'Sea of Japan/East Sea',
  'Somali Current',
  'Somali/Arabian',
  'South Central Atlantic Gyre',
  'South Central Pacific Gyre',
  'South China Sea',
  'South Kuroshio',
  'Southeast Australian Shelf',
  'Southeast Polynesia',
  'Southern New Zealand',
  'Southwest Australian Shelf',
  'St. Helena and Ascension Islands',
  'Subantarctic',
  'Subantarctic Islands',
  'Subantarctic New Zealand',
  'Subarctic Atlantic',
  'Subarctic Pacific',
  'Subtropical Convergence',
  'Sunda Shelf',
  'Tristan Gough',
  'Tropical East Pacific',
  'Tropical Northwestern Atlantic',
  'Tropical Northwestern Pacific',
  'Tropical Southwestern Atlantic',
  'Tropical Southwestern Pacific',
  'Warm Temperate Northeast Pacific',
  'Warm Temperate Northwest Atlantic',
  'Warm Temperate Northwest Pacific',
  'Warm Temperate Southeastern Pacific',
  'Warm Temperate Southwestern Atlantic',
  'West African Transition',
  'West Central Australian Shelf',
  'West and South Indian Shelf',
  'Western Coral Triangle',
  'Western Indian Ocean',
] as const;

/**
 * Build a CSV column name -> canonical province name mapping.
 * Direct matches (province name = CSV column) + aliases for variant spellings.
 */
export function buildCsvToProvinceMap(): Record<string, string> {
  const map: Record<string, string> = {};

  // Direct matches
  for (const p of ALL_PROVINCES) {
    map[p] = p;
  }

  // Aliases: CSV variant spellings -> canonical names
  map['Amsterdam St Paul'] = 'Amsterdam-St Paul';
  map['Indonesian Through Flow'] = 'Indonesian Through-Flow';
  map['Indonesian Through-Flow'] = 'Indonesian Through-Flow';
  map['Marshall  Gilbert and Ellis Islands'] = 'Marshall, Gilbert and Ellis Islands';
  map['Marshall, Gilbert and Ellis Islands'] = 'Marshall, Gilbert and Ellis Islands';
  map['Non gyral Southwest Pacific'] = 'Non-gyral Southwest Pacific';
  map['Non-gyral Southwest Pacific'] = 'Non-gyral Southwest Pacific';
  map['Sea of Japan East Sea'] = 'Sea of Japan/East Sea';
  map['Sea of Japan/East Sea'] = 'Sea of Japan/East Sea';
  map['Somali Arabian'] = 'Somali/Arabian';
  map['Somali/Arabian'] = 'Somali/Arabian';
  map['St  Helena and Ascension Islands'] = 'St. Helena and Ascension Islands';
  map['Juan Fernandez and Desventuradas'] = 'Juan Fernández and Desventuradas';

  return map;
}
