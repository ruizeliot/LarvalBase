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
 * These are already represented by the normalized MEAN/MIN/MAX/CONF columns.
 */
const MEASUREMENT_COL_REGEX = /^[A-Z][A-Z0-9_]*_(MEAN|MIN|MAX|CONF|MEAN_TYPE|CONF_TYPE|RANGE_TYPE)$/;

/**
 * Taxonomy columns in preferred order for output.
 */
const TAXONOMY_ORDER = ['ORDER', 'FAMILY', 'GENUS', 'VALID_NAME', 'APHIA_ID', 'AUTHORITY'];

/**
 * Standard measurement + metadata columns in preferred order.
 */
const STANDARD_ORDER = [
  'TYPE', 'MEAN', 'MIN', 'MAX', 'CONF', 'MEAN_TYPE', 'CONF_TYPE', 'UNIT',
  'ORIGIN', 'N', 'LENGTH_TYPE',
  'TEMPERATURE_MEAN', 'TEMPERATURE_MIN', 'TEMPERATURE_MAX',
  'METHOD', 'GEAR', 'LOCATION',
  'REFERENCE', 'EXT_REF', 'REMARKS',
];

/**
 * Check if a rawFields column should be included as an "extra info" column.
 * Returns false for taxonomy, standard metadata, and measurement columns.
 */
function isExtraInfoColumn(col: string): boolean {
  if (STANDARD_COLUMNS.has(col)) return false;
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
    METHOD: trait.metadata?.method || rawFields.METHOD || 'NA',
    GEAR: trait.metadata?.gear || rawFields.GEAR || 'NA',
    LOCATION: trait.metadata?.location || rawFields.LOCATION || 'NA',
    REFERENCE: trait.source || rawFields.REFERENCE || 'NA',
    EXT_REF: trait.metadata?.externalRef || rawFields.EXT_REF || 'NA',
    REMARKS: trait.metadata?.remarks || rawFields.REMARKS || 'NA',
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
 * Orders columns: taxonomy → standard → extra info (alphabetical).
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

  // Build ordered column list: taxonomy → standard → extras (alphabetical)
  const orderedColumns: string[] = [];
  const added = new Set<string>();

  for (const col of TAXONOMY_ORDER) {
    if (allColumns.has(col)) {
      orderedColumns.push(col);
      added.add(col);
    }
  }
  for (const col of STANDARD_ORDER) {
    if (allColumns.has(col) && !added.has(col)) {
      orderedColumns.push(col);
      added.add(col);
    }
  }
  // Extra columns sorted alphabetically
  const extras = [...allColumns].filter(c => !added.has(c)).sort();
  orderedColumns.push(...extras);

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
 * When a section has multiple trait types, produces a merged table with:
 * - TYPE column indicating which sub-panel each row belongs to
 * - Normalized measurement columns (MEAN, MIN, MAX, CONF, etc.)
 * - Extra info columns from specific databases (NA-filled for other sub-panels)
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

  // Collect merged rows
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
