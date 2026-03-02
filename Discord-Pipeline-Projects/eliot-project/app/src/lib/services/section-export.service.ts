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
 * Standard measurement + metadata columns in preferred order.
 * MEAN/MIN/MAX/CONF first, then TYPE, then MEAN_TYPE/CONF_TYPE/UNIT,
 * then qualitative metadata, then temperature group, then method columns.
 * Extra info columns (qualitative/text from specific databases) go before MEAN.
 * Does NOT include tail columns (REMARKS, EXT_REF, REFERENCE, LINK) — those always come last.
 */
const STANDARD_MEASUREMENT_ORDER = [
  'MEAN', 'MIN', 'MAX', 'CONF', 'TYPE', 'MEAN_TYPE', 'CONF_TYPE', 'UNIT',
  'ORIGIN', 'N', 'LENGTH_TYPE',
  'TEMPERATURE_MEAN', 'TEMPERATURE_MIN', 'TEMPERATURE_MAX', 'TEMPERATURE_CONF',
  'TEMPERATURE_MEAN_TYPE', 'TEMPERATURE_CONF_TYPE',
  'METHOD', 'GEAR', 'LOCATION',
];

/**
 * Columns that ALWAYS come last in the export, in this exact order.
 */
const TAIL_COLUMNS = ['REMARKS', 'EXT_REF', 'REFERENCE', 'LINK'];

/**
 * Check if a rawFields column should be included as an "extra info" column.
 * Returns false only for taxonomy and standard metadata columns.
 * All database-specific columns (including measurement columns like YOLK_SIZE_MEAN,
 * OIL_GLOBULE_SIZE_MEAN) are included to ensure no source data is lost.
 */
function isExtraInfoColumn(col: string): boolean {
  if (STANDARD_COLUMNS.has(col)) return false;
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
 * Orders columns: taxonomy → TYPE → standard measurement → extra info (alphabetical) → tail (REMARKS, EXT_REF, REFERENCE, LINK).
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

  // Set of tail columns for exclusion from standard/extras
  const tailSet = new Set(TAIL_COLUMNS);

  // Build ordered column list:
  // taxonomy → TYPE → extras (qualitative/text, alphabetical) → measurements → tail
  const orderedColumns: string[] = [];
  const added = new Set<string>();

  // 1. Taxonomy columns
  for (const col of TAXONOMY_ORDER) {
    if (allColumns.has(col)) {
      orderedColumns.push(col);
      added.add(col);
    }
  }

  // 2. Extra info columns (qualitative/text from specific databases) — alphabetical
  const measurementSet = new Set(STANDARD_MEASUREMENT_ORDER);
  const extras = [...allColumns].filter(c => !added.has(c) && !tailSet.has(c) && !measurementSet.has(c)).sort();
  orderedColumns.push(...extras);
  for (const col of extras) added.add(col);

  // 3. Standard measurement + metadata columns (includes TYPE after CONF)
  for (const col of STANDARD_MEASUREMENT_ORDER) {
    if (allColumns.has(col) && !added.has(col)) {
      orderedColumns.push(col);
      added.add(col);
    }
  }

  // Tail columns always last, in fixed order
  for (const col of TAIL_COLUMNS) {
    if (allColumns.has(col)) {
      orderedColumns.push(col);
      added.add(col);
    }
  }

  // Normalize each row
  return rows.map(row => {
    const normalized: Record<string, unknown> = {};
    for (const col of orderedColumns) {
      normalized[col] = row[col] ?? 'NA';
    }
    return normalized;
  });
}

/** Trait keys that should use raw database column order instead of normalized format. */
const RAW_COLUMN_ORDER_TRAITS = new Set([
  'pelagic_juvenile_size', 'pelagic_juvenile_duration',
  'rafting_behavior', 'rafting_size',
]);

/**
 * Build a raw export row using original database column order.
 * Strips ROW_INDEX and LINK columns but keeps everything else as-is.
 */
function buildRawRow(
  trait: TraitData,
  sp: { order: string; family: string; genus: string; validName: string } | undefined,
): Record<string, unknown> {
  const rawFields = (trait.metadata?.rawFields || {}) as Record<string, unknown>;
  const row: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(rawFields)) {
    if (key === 'ROW_INDEX') continue;
    row[key] = value ?? 'NA';
  }

  // Ensure taxonomy columns are filled from species data
  if (sp) {
    if (!row.ORDER || row.ORDER === 'NA') row.ORDER = sp.order;
    if (!row.FAMILY || row.FAMILY === 'NA') row.FAMILY = sp.family;
    if (!row.GENUS || row.GENUS === 'NA') row.GENUS = sp.genus;
    if (!row.VALID_NAME || row.VALID_NAME === 'NA') row.VALID_NAME = sp.validName;
  }

  return row;
}

/**
 * Union-fill raw rows: ensure all rows have the same columns in the same order.
 * Uses the column order from the first row (which reflects original database order).
 */
function unionFillRawRows(rows: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  if (rows.length === 0) return [];

  // Collect all column names preserving first-seen order
  const orderedColumns: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        orderedColumns.push(key);
        seen.add(key);
      }
    }
  }

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
 * Pelagic Juvenile and Rafting sections use original database column order.
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

  // Check if this section should use raw database column order
  const useRawOrder = traitKeys.every(k => RAW_COLUMN_ORDER_TRAITS.has(k));

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
      if (useRawOrder) {
        rows.push(buildRawRow(trait, sp));
      } else {
        rows.push(buildMergedRow(trait, sp, trait.traitType));
      }
    }
  }

  // Union-fill to ensure all rows have the same columns
  return useRawOrder ? unionFillRawRows(rows) : unionFillRows(rows);
}
