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
  map['Marshall Gilbert and Ellis Islands'] = 'Marshall, Gilbert and Ellis Islands';
  map['St Helena and Ascension Islands'] = 'St. Helena and Ascension Islands';

  // Red Sea & Mediterranean aliases (CSV names with coastal/offshore qualifiers)
  map['Red Sea and Gulf of Aden (coastal)'] = 'Red Sea and Gulf of Aden';
  map['Red Sea (offshore)'] = 'Red Sea';
  map['Mediterranean Sea (offshore)'] = 'Mediterranean';
  map['Mediterranean Sea (coastal)'] = 'Mediterranean Sea';

  // Agulhas, Antarctic, Subantarctic aliases (coastal/offshore qualifiers)
  map['Agulhas (coastal)'] = 'Agulhas';
  map['Agulhas Current (coastal)'] = 'Agulhas Current';
  map['Antarctic (coastal)'] = 'Antarctic';
  map['Subantarctic (offshore)'] = 'Subantarctic';

  // Amsterdam & St. Paul variant
  map['Amsterdam & St. Paul'] = 'Amsterdam-St Paul';

  return map;
}

/**
 * Build a dot-notation CSV column name -> canonical province name mapping.
 * Used by new CSVs (families, genera, all_species) which use dots instead of spaces.
 * Duplicate columns (e.g. "Indonesian.Through.Flow.1") map to same canonical name (OR merge).
 */
export function buildDotCsvToProvinceMap(): Record<string, string> {
  const map: Record<string, string> = {};

  // Dot-notation mappings for provinces in new CSV files
  // These map from "Dot.Column.Name" to canonical province name
  const dotMappings: Record<string, string> = {
    'Agulhas': 'Agulhas',
    'Agulhas.Current': 'Agulhas Current',
    'Amsterdam.St.Paul': 'Amsterdam-St Paul',
    'Andaman': 'Andaman',
    'Antarctic': 'Antarctic',
    'Antarctic.Polar.Front': 'Antarctic Polar Front',
    'Arctic': 'Arctic',
    'Bay.of.Bengal': 'Bay of Bengal',
    'Benguela': 'Benguela',
    'Benguela.Current': 'Benguela Current',
    'Black.Sea': 'Black Sea',
    'California.Current': 'California Current',
    'Canary.Current': 'Canary Current',
    'Central.Indian.Ocean.Islands': 'Central Indian Ocean Islands',
    'Central.Polynesia': 'Central Polynesia',
    'Cold.Temperate.Northeast.Pacific': 'Cold Temperate Northeast Pacific',
    'Cold.Temperate.Northwest.Atlantic': 'Cold Temperate Northwest Atlantic',
    'Cold.Temperate.Northwest.Pacific': 'Cold Temperate Northwest Pacific',
    'Continental.High.Antarctic': 'Continental High Antarctic',
    'East.Central.Australian.Shelf': 'East Central Australian Shelf',
    'Easter.Island': 'Easter Island',
    'Eastern.Coral.Triangle': 'Eastern Coral Triangle',
    'Eastern.Tropical.Pacific': 'Eastern Tropical Pacific',
    'Equatorial.Atlantic': 'Equatorial Atlantic',
    'Equatorial.Pacific': 'Equatorial Pacific',
    'Galapagos': 'Galapagos',
    'Guinea.Current': 'Guinea Current',
    'Gulf.of.Guinea': 'Gulf of Guinea',
    'Gulf.Stream': 'Gulf Stream',
    'Hawaii': 'Hawaii',
    'Humboldt.Current': 'Humboldt Current',
    'Indian.Ocean.Gyre': 'Indian Ocean Gyre',
    'Indian.Ocean.Monsoon.Gyre': 'Indian Ocean Monsoon Gyre',
    'Indonesian.Through.Flow': 'Indonesian Through-Flow',
    'Indonesian.Through.Flow.1': 'Indonesian Through-Flow',
    'Inter.American.Seas': 'Inter American Seas',
    'Java.Transitional': 'Java Transitional',
    'Juan.Fernandez.and.Desventuradas': 'Juan Fernández and Desventuradas',
    'Kuroshio': 'Kuroshio',
    'Leeuwin.Current': 'Leeuwin Current',
    'Lord.Howe.and.Norfolk.Islands': 'Lord Howe and Norfolk Islands',
    'Lusitanian': 'Lusitanian',
    'Magellanic': 'Magellanic',
    'Malvinas.Current': 'Malvinas Current',
    'Marquesas': 'Marquesas',
    'Marshall.Gilbert.and.Ellis.Islands': 'Marshall, Gilbert and Ellis Islands',
    'Marshall..Gilbert.and.Ellis.Islands': 'Marshall, Gilbert and Ellis Islands',
    'Mediterranean.Sea..offshore.': 'Mediterranean',
    'Mediterranean.Sea..coastal.': 'Mediterranean Sea',
    'NA.': 'NA',
    'Non.gyral.Southwest.Pacific': 'Non-gyral Southwest Pacific',
    'Non.gyral.Southwest.Pacific.1': 'Non-gyral Southwest Pacific',
    'North.Atlantic.Transitional': 'North Atlantic Transitional',
    'North.Brazil.Shelf': 'North Brazil Shelf',
    'North.Central.Atlantic.Gyre': 'North Central Atlantic Gyre',
    'North.Central.Pacific.Gyre': 'North Central Pacific Gyre',
    'North.Pacific.Transitional': 'North Pacific Transitional',
    'Northeast.Australian.Shelf': 'Northeast Australian Shelf',
    'Northern.European.Seas': 'Northern European Seas',
    'Northern.New.Zealand': 'Northern New Zealand',
    'Northwest.Australian.Shelf': 'Northwest Australian Shelf',
    'Red.Sea..offshore.': 'Red Sea',
    'Red.Sea.and.Gulf.of.Aden..coastal.': 'Red Sea and Gulf of Aden',
    'Sahul.Shelf': 'Sahul Shelf',
    'Scotia.Sea': 'Scotia Sea',
    'Sea.of.Japan.East.Sea': 'Sea of Japan/East Sea',
    'Sea.of.Japan.East.Sea.1': 'Sea of Japan/East Sea',
    'Somali.Arabian': 'Somali/Arabian',
    'Somali.Current': 'Somali Current',
    'Somali.Arabian.1': 'Somali/Arabian',
    'South.Central.Atlantic.Gyre': 'South Central Atlantic Gyre',
    'South.Central.Pacific.Gyre': 'South Central Pacific Gyre',
    'South.China.Sea': 'South China Sea',
    'South.Kuroshio': 'South Kuroshio',
    'Southeast.Australian.Shelf': 'Southeast Australian Shelf',
    'Southeast.Polynesia': 'Southeast Polynesia',
    'Southern.New.Zealand': 'Southern New Zealand',
    'Southwest.Australian.Shelf': 'Southwest Australian Shelf',
    'St.Helena.and.Ascension.Islands': 'St. Helena and Ascension Islands',
    'Subantarctic': 'Subantarctic',
    'Subantarctic.Islands': 'Subantarctic Islands',
    'Subantarctic.New.Zealand': 'Subantarctic New Zealand',
    'Subarctic.Atlantic': 'Subarctic Atlantic',
    'Subarctic.Pacific': 'Subarctic Pacific',
    'Subtropical.Convergence': 'Subtropical Convergence',
    'Sunda.Shelf': 'Sunda Shelf',
    'Tristan.Gough': 'Tristan Gough',
    'Tropical.East.Pacific': 'Tropical East Pacific',
    'Tropical.Northwestern.Atlantic': 'Tropical Northwestern Atlantic',
    'Tropical.Northwestern.Pacific': 'Tropical Northwestern Pacific',
    'Tropical.Southwestern.Atlantic': 'Tropical Southwestern Atlantic',
    'Tropical.Southwestern.Pacific': 'Tropical Southwestern Pacific',
    'Warm.Temperate.Northeast.Pacific': 'Warm Temperate Northeast Pacific',
    'Warm.Temperate.Northwest.Atlantic': 'Warm Temperate Northwest Atlantic',
    'Warm.Temperate.Northwest.Pacific': 'Warm Temperate Northwest Pacific',
    'Warm.Temperate.Southeastern.Pacific': 'Warm Temperate Southeastern Pacific',
  };

  for (const [dotCol, canonical] of Object.entries(dotMappings)) {
    map[dotCol] = canonical;
  }

  return map;
}

/**
 * Parse a row from dot-notation CSV, returning set of canonical province names where TRUE.
 * Handles duplicate columns by OR-merging them.
 */
export function getProvincesFromDotRow(
  row: Record<string, string>,
  dotMap: Record<string, string>
): Set<string> {
  const provinces = new Set<string>();
  for (const [csvCol, provinceName] of Object.entries(dotMap)) {
    if (provinceName === 'NA') continue;
    const val = (row[csvCol] || '').replace(/^"|"$/g, '').toUpperCase();
    if (val === 'TRUE') {
      provinces.add(provinceName);
    }
  }
  return provinces;
}
