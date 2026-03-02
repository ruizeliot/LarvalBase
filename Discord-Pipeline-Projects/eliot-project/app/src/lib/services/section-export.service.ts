/**
 * Section export service.
 *
 * Provides data for section-level CSV exports at Species, Genus, or Family level.
 * When a section has multiple sub-panels (trait types), rows are merged into a single
 * table with a TYPE column, normalized measurement columns (MEAN, MIN, MAX, CONF),
 * and union-filled extra info columns (NA for missing).
 */

import { getOrLoadData } from '@/lib/data/data-repository';
import type { TraitData } from '@/lib/types/species.types';

/** Readable labels for trait types (used as TYPE column values). */
const TRAIT_TYPE_LABELS: Record<string, string> = {
  egg_diameter: 'Egg diameter',
  egg_volume: 'Egg volume',
  yolk_diameter: 'Yolk diameter',
  oil_globule_size: 'Oil globule size',
  incubation_duration: 'Incubation duration',
  hatching_size: 'Hatching size',
  first_feeding_age: 'First feeding age',
  first_feeding_size: 'First feeding size',
  yolk_absorption_age: 'Yolk absorption age',
  yolk_absorbed_size: 'Yolk absorbed size',
  flexion_age: 'Flexion age',
  flexion_size: 'Flexion size',
  metamorphosis_age: 'Metamorphosis age',
  metamorphosis_size: 'Metamorphosis size',
  metamorphosis_duration: 'Metamorphosis duration',
  settlement_age: 'Settlement age',
  settlement_size: 'Settlement size',
  vertical_distribution: 'Vertical distribution',
  critical_swimming_speed: 'Critical swimming speed (abs)',
  critical_swimming_speed_rel: 'Critical swimming speed (rel)',
  in_situ_swimming_speed: 'In situ swimming speed (abs)',
  in_situ_swimming_speed_rel: 'In situ swimming speed (rel)',
  rafting_size: 'Rafting size',
  rafting_behavior: 'Rafting behavior',
  pelagic_juvenile_size: 'Pelagic juvenile size',
  pelagic_juvenile_duration: 'Pelagic juvenile duration',
};

/** RawFields column name for MEAN_TYPE per trait type. */
const MEAN_TYPE_COLUMNS: Record<string, string> = {
  egg_diameter: 'EGG_DIAMETER_MEAN_TYPE',
  hatching_size: 'HATCHING_SIZE_MEAN_TYPE',
  settlement_age: 'SET_AGE_DPH_MEAN_TYPE',
  settlement_size: 'SET_SIZE_MEAN_TYPE',
  metamorphosis_age: 'MET_AGE_DPH_MEAN_TYPE',
  metamorphosis_size: 'MET_SIZE_MEAN_TYPE',
  metamorphosis_duration: 'MET_DURATION_MEAN_TYPE',
  flexion_age: 'FLEXION_AGE_DPH_MEAN_TYPE',
  flexion_size: 'FLEXION_SIZE_MEAN_TYPE',
  critical_swimming_speed: 'UCRIT_ABS_MEAN_TYPE',
  critical_swimming_speed_rel: 'UCRIT_REL_MEAN_TYPE',
  in_situ_swimming_speed: 'ISS_ABS_MEAN_TYPE',
  in_situ_swimming_speed_rel: 'ISS_REL_MEAN_TYPE',
  pelagic_juvenile_size: 'PELAGIC_JUV_SIZE_MEAN_TYPE',
  pelagic_juvenile_duration: 'PELAGIC_JUV_DURATION_MEAN_TYPE',
};

/** Columns already represented in the standardized output (excluded from extras). */
const STANDARD_COLUMNS = new Set([
  'ORDER', 'FAMILY', 'GENUS', 'VALID_NAME', 'APHIA_ID', 'AUTHORITY', 'ORIGINAL_NAME',
  'ORIGIN', 'N', 'REFERENCE', 'EXT_REF', 'LINK', 'ROW_INDEX', 'REMARKS',
  'METHOD', 'GEAR', 'LOCATION', 'COUNTRY', 'LENGTH_TYPE',
  'TEMPERATURE_MEAN', 'TEMPERATURE_MIN', 'TEMPERATURE_MAX',
  'TEMPERATURE_MEAN_TYPE', 'TEMPERATURE_CONF', 'TEMPERATURE_CONF_TYPE',
  'REARING_TEMPERATURE_MEAN', 'REARING_TEMPERATURE_MIN',
  'REARING_TEMPERATURE_MAX', 'REARING_TEMPERATURE_MEAN_TYPE',
]);

/**
 * Regex matching measurement columns (e.g. MET_AGE_DPH_MEAN, UCRIT_ABS_CONF_TYPE).
 * Used for column ordering: measurement-pattern columns sort into a separate group
 * after qualitative columns. NOT used for exclusion — all source columns are included.
 */
const MEASUREMENT_COL_REGEX = /^[A-Z][A-Z0-9_]*_(MEAN|MIN|MAX|CONF|MEAN_TYPE|CONF_TYPE|RANGE_TYPE)$/;

/**
 * Taxonomy columns in preferred order for output.
 */
const TAXONOMY_ORDER = ['ORDER', 'FAMILY', 'GENUS', 'VALID_NAME', 'APHIA_ID', 'AUTHORITY'];

/**
 * Column groups in fixed order for the merged export format.
 * TYPE and qualitative columns come first after taxonomy, then measurements.
 */
const NORMALIZED_MEASUREMENT_COLS = ['MEAN', 'MIN', 'MAX', 'CONF'];
const META_TYPE_COLS = ['MEAN_TYPE', 'CONF_TYPE', 'UNIT'];
const TEMPERATURE_COLS = [
  'TEMPERATURE_MEAN', 'TEMPERATURE_MIN', 'TEMPERATURE_MAX', 'TEMPERATURE_CONF',
  'TEMPERATURE_MEAN_TYPE', 'TEMPERATURE_CONF_TYPE',
];
const METHOD_COLS = ['ORIGIN', 'N', 'LENGTH_TYPE', 'METHOD', 'GEAR', 'LOCATION'];

/** All known fixed-order columns (used to classify "other" extras). */
const ALL_FIXED_COLS = new Set([
  'TYPE',
  ...NORMALIZED_MEASUREMENT_COLS,
  ...META_TYPE_COLS,
  ...TEMPERATURE_COLS,
  ...METHOD_COLS,
]);

/**
 * Columns that ALWAYS come last in the export, in this exact order.
 */
const TAIL_COLUMNS = ['REMARKS', 'EXT_REF', 'REFERENCE', 'LINK'];

/**
 * Check if a rawFields column should be included as a qualitative "extra info" column.
 * Returns false for taxonomy columns, standard metadata columns, and measurement columns.
 * Only qualitative columns (EGG_DETAILS, EGG_SHAPE, NB_OIL_GLOBULE, etc.) are included.
 */
function isExtraInfoColumn(col: string): boolean {
  if (STANDARD_COLUMNS.has(col)) return false;
  // Exclude raw measurement columns — their values are in MEAN/MIN/MAX/CONF
  if (MEASUREMENT_COL_REGEX.test(col)) return false;
  return true;
}

/**
 * Build a standardized merged export row from a trait.
 */
function buildMergedRow(
  trait: TraitData,
  sp: { order: string; family: string; genus: string; validName: string } | undefined,
  traitType: string,
): Record<string, unknown> {
  const rawFields = (trait.metadata?.rawFields || {}) as Record<string, unknown>;
  const meanTypeCol = MEAN_TYPE_COLUMNS[traitType];

  const row: Record<string, unknown> = {
    ORDER: sp?.order || rawFields.ORDER || '',
    FAMILY: sp?.family || rawFields.FAMILY || '',
    GENUS: sp?.genus || rawFields.GENUS || '',
    VALID_NAME: sp?.validName || rawFields.VALID_NAME || '',
    APHIA_ID: rawFields.APHIA_ID || '',
    AUTHORITY: rawFields.AUTHORITY || '',
    TYPE: TRAIT_TYPE_LABELS[traitType] || traitType,
    MEAN: trait.value ?? 'NA',
    MIN: trait.metadata?.minValue ?? 'NA',
    MAX: trait.metadata?.maxValue ?? 'NA',
    CONF: trait.metadata?.confValue ?? 'NA',
    MEAN_TYPE: meanTypeCol ? (rawFields[meanTypeCol] || 'NA') : 'NA',
    CONF_TYPE: trait.metadata?.confType || 'NA',
    UNIT: trait.unit || '',
    ORIGIN: trait.metadata?.origin || rawFields.ORIGIN || 'NA',
    N: trait.metadata?.sampleSize ?? rawFields.N ?? 'NA',
    LENGTH_TYPE: trait.metadata?.lengthType || rawFields.LENGTH_TYPE || 'NA',
    TEMPERATURE_MEAN: trait.metadata?.temperatureMean
      ?? rawFields.REARING_TEMPERATURE_MEAN
      ?? rawFields.TEMPERATURE_MEAN
      ?? 'NA',
    TEMPERATURE_MIN: trait.metadata?.temperatureMin
      ?? rawFields.REARING_TEMPERATURE_MIN
      ?? rawFields.TEMPERATURE_MIN
      ?? 'NA',
    TEMPERATURE_MAX: trait.metadata?.temperatureMax
      ?? rawFields.REARING_TEMPERATURE_MAX
      ?? rawFields.TEMPERATURE_MAX
      ?? 'NA',
    TEMPERATURE_CONF: rawFields.TEMPERATURE_CONF
      ?? rawFields.REARING_TEMPERATURE_CONF
      ?? 'NA',
    TEMPERATURE_MEAN_TYPE: rawFields.TEMPERATURE_MEAN_TYPE
      ?? rawFields.REARING_TEMPERATURE_MEAN_TYPE
      ?? 'NA',
    TEMPERATURE_CONF_TYPE: rawFields.TEMPERATURE_CONF_TYPE
      ?? rawFields.REARING_TEMPERATURE_CONF_TYPE
      ?? 'NA',
    METHOD: trait.metadata?.method || rawFields.METHOD || 'NA',
    GEAR: trait.metadata?.gear || rawFields.GEAR || 'NA',
    LOCATION: trait.metadata?.location || rawFields.LOCATION || 'NA',
    REMARKS: trait.metadata?.remarks || rawFields.REMARKS || 'NA',
    EXT_REF: trait.metadata?.externalRef || rawFields.EXT_REF || 'NA',
    REFERENCE: trait.source || rawFields.REFERENCE || 'NA',
    LINK: rawFields.LINK || 'NA',
  };

  // Add extra info columns from rawFields (trait-specific columns like MET_DEFINITION, STAGE, etc.)
  for (const [key, value] of Object.entries(rawFields)) {
    if (isExtraInfoColumn(key)) {
      row[key] = value ?? 'NA';
    }
  }

  return row;
}

/**
 * Normalize rows: ensure all rows have the same columns, filling 'NA' for missing ones.
 *
 * Column order:
 * 1. Taxonomy: ORDER/FAMILY/GENUS/VALID_NAME/APHIA_ID/AUTHORITY
 * 2. TYPE + qualitative extras (non-measurement columns, alphabetical)
 * 3. MEAN/MIN/MAX/CONF
 * 4. MEAN_TYPE/CONF_TYPE/UNIT
 * 5. TEMPERATURE group
 * 6. Other columns (ORIGIN, N, LENGTH_TYPE, METHOD, GEAR, LOCATION)
 * 7. REMARKS/EXT_REF/REFERENCE/LINK (always last)
 */
function unionFillRows(rows: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  if (rows.length === 0) return [];

  // Collect all column names
  const allColumns = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      allColumns.add(key);
    }
  }

  const tailSet = new Set(TAIL_COLUMNS);
  const taxonomySet = new Set(TAXONOMY_ORDER);
  const orderedColumns: string[] = [];
  const added = new Set<string>();

  function addCol(col: string) {
    if (allColumns.has(col) && !added.has(col)) {
      orderedColumns.push(col);
      added.add(col);
    }
  }

  function addCols(cols: string[]) {
    for (const col of cols) addCol(col);
  }

  // 1. Taxonomy columns
  addCols(TAXONOMY_ORDER);

  // 2. TYPE + qualitative extras (non-measurement columns, alphabetical)
  addCol('TYPE');

  // Collect qualitative extras (non-measurement, non-fixed columns)
  const qualitativeExtras: string[] = [];

  for (const col of [...allColumns].sort()) {
    if (added.has(col) || tailSet.has(col) || taxonomySet.has(col) || ALL_FIXED_COLS.has(col)) continue;
    // Skip raw measurement columns — their values are in MEAN/MIN/MAX/CONF
    if (MEASUREMENT_COL_REGEX.test(col)) continue;
    qualitativeExtras.push(col);
  }

  // Qualitative extras before measurements
  for (const col of qualitativeExtras) addCol(col);

  // 3. MEAN/MIN/MAX/CONF
  addCols(NORMALIZED_MEASUREMENT_COLS);

  // 4. MEAN_TYPE/CONF_TYPE/UNIT
  addCols(META_TYPE_COLS);

  // 6. Temperature group
  addCols(TEMPERATURE_COLS);

  // 7. Other columns (METHOD, GEAR, etc.)
  addCols(METHOD_COLS);

  // 8. Tail columns always last
  addCols(TAIL_COLUMNS);

  // Normalize each row
  return rows.map(row => {
    const normalized: Record<string, unknown> = {};
    for (const col of orderedColumns) {
      normalized[col] = row[col] ?? 'NA';
    }
    return normalized;
  });
}


/**
 * Get export data for a section at a given taxonomy level.
 *
 * Produces a long-format table with:
 * - TYPE column indicating the measurement type for each row
 * - Normalized measurement columns (MEAN, MIN, MAX, CONF, etc.)
 * - Qualitative extra columns from specific databases (NA-filled for other types)
 *
 * @param speciesId - The current species ID (used to determine genus/family)
 * @param traitKeys - Trait types belonging to this section
 * @param level - Taxonomy level: species (just this species), genus, or family
 * @returns Array of row objects, or null if species not found
 */
export async function getSectionExportData(
  speciesId: string,
  traitKeys: string[],
  level: 'species' | 'genus' | 'family'
): Promise<Array<Record<string, unknown>> | null> {
  const data = await getOrLoadData();

  // Find the current species
  const species = data.species.get(speciesId);
  if (!species) {
    return null;
  }

  // Determine which species IDs to include based on taxonomy level
  const targetSpeciesIds: string[] = [];

  if (level === 'species') {
    targetSpeciesIds.push(speciesId);
  } else {
    for (const [id, sp] of data.species) {
      if (level === 'genus' && sp.genus === species.genus) {
        targetSpeciesIds.push(id);
      } else if (level === 'family' && sp.family === species.family) {
        targetSpeciesIds.push(id);
      }
    }
  }

  // Collect rows
  const rows: Array<Record<string, unknown>> = [];

  for (const sid of targetSpeciesIds) {
    const sp = data.species.get(sid);
    const traits = data.traitsBySpecies.get(sid) || [];

    // Filter to only the section's main traits (exclude _min/_max sub-traits)
    const sectionTraits = traits.filter((t) => traitKeys.includes(t.traitType));

    for (const trait of sectionTraits) {
      rows.push(buildMergedRow(trait, sp, trait.traitType));
    }
  }

  // Union-fill to ensure all rows have the same columns
  return unionFillRows(rows);
}
