/**
 * Section export service.
 *
 * Provides data for section-level CSV exports at Species, Genus, or Family level.
 * When a section has multiple sub-panels (trait types), rows are merged into a single
 * table with a TYPE column, normalized measurement columns (MEAN, MIN, MAX, CONF),
 * and union-filled extra info columns (NA for missing).
 *
 * The Egg & Incubation section uses a special export format matching the gold standard
 * (example_dascyllus_aruanus.csv): each raw egg database row explodes into multiple
 * TYPE rows (Egg length, Egg width, Yolk diameter, etc.) with a fixed column set.
 */

import { getOrLoadData } from '@/lib/data/data-repository';
import type { TraitData } from '@/lib/types/species.types';

// ==================== EGG EXPORT (GOLD STANDARD FORMAT) ====================

/**
 * Egg export column order — matches example_dascyllus_aruanus.csv exactly.
 */
const EGG_EXPORT_COLUMNS = [
  'ORDER', 'FAMILY', 'GENUS', 'VALID_NAME', 'APHIA_ID', 'AUTHORITY', 'ORIGINAL_NAME',
  'EGG_LOCATION', 'EGG_DETAILS', 'EGG_SHAPE', 'NB_OIL_GLOBULE',
  'TYPE', 'MEAN', 'MIN', 'MAX', 'CONF', 'MEAN_TYPE', 'CONF_TYPE', 'VOLUME_TYPE', 'UNIT',
  'TEMPERATURE_MEAN', 'TEMPERATURE_MIN', 'TEMPERATURE_MAX', 'TEMPERATURE_MEAN_TYPE',
  'EXT_REF', 'REFERENCE', 'LINK',
];

/**
 * Measurement types to extract from each egg database raw row.
 * Each entry: [TYPE label, MEAN field, MIN field, MAX field, CONF field,
 *              MEAN_TYPE field, CONF_TYPE field, VOLUME_TYPE field, UNIT]
 */
const EGG_MEASUREMENT_TYPES: Array<{
  type: string;
  mean: string;
  min: string;
  max: string;
  conf: string;
  meanType: string;
  confType: string;
  volumeType: string;
  unit: string;
}> = [
  {
    type: 'Egg length', mean: 'EGG_L_MEAN', min: 'EGG_L_MIN', max: 'EGG_L_MAX',
    conf: 'EGG_DIAMETER_CONF', meanType: 'EGG_L_MEAN_TYPE', confType: 'EGG_DIAMETER_CONF_TYPE',
    volumeType: 'EGG_VOLUME_TYPE', unit: 'mm',
  },
  {
    type: 'Egg width', mean: 'EGG_W_MEAN', min: 'EGG_W_MIN', max: 'EGG_W_MAX',
    conf: 'EGG_DIAMETER_CONF', meanType: 'EGG_W_MEAN_TYPE', confType: 'EGG_DIAMETER_CONF_TYPE',
    volumeType: 'EGG_VOLUME_TYPE', unit: 'mm',
  },
  {
    type: 'Yolk diameter', mean: 'YOLK_SIZE_MEAN', min: 'YOLK_SIZE_MIN', max: 'YOLK_SIZE_MAX',
    conf: '', meanType: 'YOLK_SIZE_MEAN_TYPE', confType: '',
    volumeType: 'EGG_VOLUME_TYPE', unit: 'mm',
  },
  {
    type: 'Yolk size', mean: 'YOLK_SIZE_MEAN', min: 'YOLK_SIZE_MIN', max: 'YOLK_SIZE_MAX',
    conf: '', meanType: 'YOLK_SIZE_MEAN_TYPE', confType: '',
    volumeType: '', unit: 'mm',
  },
  {
    type: 'Oil globule size', mean: 'OIL_GLOBULE_SIZE_MEAN', min: 'OIL_GLOBULE_SIZE_MIN', max: 'OIL_GLOBULE_SIZE_MAX',
    conf: '', meanType: 'OIL_GLOBULE_SIZE_MEAN_TYPE', confType: '',
    volumeType: '', unit: 'mm',
  },
  {
    type: 'Oil globule volume', mean: 'OIL_GLOBULE_VOLUME_MEAN', min: 'OIL_GLOBULE_VOLUME_MIN', max: 'OIL_GLOBULE_VOLUME_MAX',
    conf: '', meanType: '', confType: '',
    volumeType: 'OIL_GLOBULE_VOLUME_TYPE', unit: 'mm',
  },
  {
    type: 'Yolk volume', mean: 'YOLK_VOLUME_MEAN', min: 'YOLK_VOLUME_MIN', max: 'YOLK_VOLUME_MAX',
    conf: '', meanType: '', confType: '',
    volumeType: 'YOLK_VOLUME_TYPE', unit: 'mm',
  },
  {
    type: 'Egg volume', mean: 'EGG_VOLUME_MEAN', min: 'EGG_VOLUME_MIN', max: 'EGG_VOLUME_MAX',
    conf: '', meanType: '', confType: '',
    volumeType: 'EGG_VOLUME_TYPE', unit: 'mm³',
  },
];

/** The trait keys that belong to the egg section. */
const EGG_SECTION_TRAITS = new Set([
  'egg_diameter', 'egg_volume', 'yolk_diameter', 'oil_globule_size', 'incubation_duration',
]);

/**
 * Check if the requested trait keys are the egg section.
 */
function isEggSection(traitKeys: string[]): boolean {
  return traitKeys.some(k => EGG_SECTION_TRAITS.has(k));
}

/**
 * Get raw field value, returning 'NA' for missing/empty/NA values.
 */
function rf(rawFields: Record<string, unknown>, key: string): string {
  if (!key) return 'NA';
  const val = rawFields[key];
  if (val === null || val === undefined || val === '' || val === 'NA') return 'NA';
  return String(val);
}

/**
 * Get raw field value as number if numeric, otherwise string. Returns 'NA' for missing.
 */
function rfNum(rawFields: Record<string, unknown>, key: string): string | number {
  if (!key) return 'NA';
  const val = rawFields[key];
  if (val === null || val === undefined || val === '' || val === 'NA') return 'NA';
  if (typeof val === 'number') return val;
  const num = Number(val);
  return isNaN(num) ? String(val) : num;
}

/**
 * Build egg export rows from egg_diameter traits (one per raw egg database row).
 * Each raw row explodes into multiple TYPE rows based on which measurements have data.
 */
function buildEggRowsFromRaw(
  rawFields: Record<string, unknown>,
): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [];

  // Common taxonomy/qualitative columns
  const base: Record<string, unknown> = {
    ORDER: rf(rawFields, 'ORDER'),
    FAMILY: rf(rawFields, 'FAMILY'),
    GENUS: rf(rawFields, 'GENUS'),
    VALID_NAME: rf(rawFields, 'VALID_NAME'),
    APHIA_ID: rf(rawFields, 'APHIA_ID'),
    AUTHORITY: rf(rawFields, 'AUTHORITY'),
    ORIGINAL_NAME: rf(rawFields, 'ORIGINAL_NAME'),
    EGG_LOCATION: rf(rawFields, 'EGG_LOCATION'),
    EGG_DETAILS: rf(rawFields, 'EGG_DETAILS'),
    EGG_SHAPE: rf(rawFields, 'EGG_SHAPE'),
    NB_OIL_GLOBULE: rf(rawFields, 'NB_OIL_GLOBULE'),
    // Egg database has no temperature columns
    TEMPERATURE_MEAN: 'NA',
    TEMPERATURE_MIN: 'NA',
    TEMPERATURE_MAX: 'NA',
    TEMPERATURE_MEAN_TYPE: 'NA',
    EXT_REF: rf(rawFields, 'EXT_REF'),
    REFERENCE: rf(rawFields, 'REFERENCE'),
    LINK: rf(rawFields, 'LINK'),
  };

  for (const mt of EGG_MEASUREMENT_TYPES) {
    const meanVal = rfNum(rawFields, mt.mean);
    if (meanVal === 'NA') continue; // Skip if no data for this measurement

    rows.push({
      ...base,
      TYPE: mt.type,
      MEAN: meanVal,
      MIN: rfNum(rawFields, mt.min),
      MAX: rfNum(rawFields, mt.max),
      CONF: rfNum(rawFields, mt.conf),
      MEAN_TYPE: rf(rawFields, mt.meanType),
      CONF_TYPE: rf(rawFields, mt.confType),
      VOLUME_TYPE: rf(rawFields, mt.volumeType),
      UNIT: mt.unit,
    });
  }

  return rows;
}

/**
 * Build an incubation duration export row from an incubation_duration trait.
 */
function buildIncubationRow(
  trait: TraitData,
  sp: { order: string; family: string; genus: string; validName: string } | undefined,
): Record<string, unknown> {
  const rawFields = (trait.metadata?.rawFields || {}) as Record<string, unknown>;

  return {
    ORDER: sp?.order || rf(rawFields, 'ORDER'),
    FAMILY: sp?.family || rf(rawFields, 'FAMILY'),
    GENUS: sp?.genus || rf(rawFields, 'GENUS'),
    VALID_NAME: sp?.validName || rf(rawFields, 'VALID_NAME'),
    APHIA_ID: rf(rawFields, 'APHIA_ID'),
    AUTHORITY: rf(rawFields, 'AUTHORITY'),
    ORIGINAL_NAME: rf(rawFields, 'ORIGINAL_NAME'),
    EGG_LOCATION: 'NA',
    EGG_DETAILS: 'NA',
    EGG_SHAPE: 'NA',
    NB_OIL_GLOBULE: 'NA',
    TYPE: 'Incubation duration',
    MEAN: trait.value ?? 'NA',
    MIN: trait.metadata?.minValue ?? 'NA',
    MAX: trait.metadata?.maxValue ?? 'NA',
    CONF: 'NA',
    MEAN_TYPE: rf(rawFields, 'INCUBATION_GESTATION_HOUR_MEAN_TYPE'),
    CONF_TYPE: 'NA',
    VOLUME_TYPE: 'NA',
    UNIT: trait.unit || 'hours',
    TEMPERATURE_MEAN: rfNum(rawFields, 'INCUBATION_GESTATION_TEMPERATURE_MEAN'),
    TEMPERATURE_MIN: rfNum(rawFields, 'INCUBATION_GESTATION_TEMPERATURE_MIN'),
    TEMPERATURE_MAX: rfNum(rawFields, 'INCUBATION_GESTATION_TEMPERATURE_MAX'),
    TEMPERATURE_MEAN_TYPE: rf(rawFields, 'INCUBATION_GESTATION_TEMPERATURE_MEAN_TYPE'),
    EXT_REF: rf(rawFields, 'EXT_REF'),
    REFERENCE: trait.source || rf(rawFields, 'REFERENCE'),
    LINK: rf(rawFields, 'LINK'),
  };
}

/**
 * Build egg section export in gold standard format.
 * Deduplicates raw egg rows (multiple traits from same CSV row share rawFields).
 */
function buildEggSectionExport(
  speciesIds: string[],
  data: { species: Map<string, any>; traitsBySpecies: Map<string, TraitData[]> },
): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [];

  for (const sid of speciesIds) {
    const sp = data.species.get(sid);
    const traits = data.traitsBySpecies.get(sid) || [];

    // Track already-processed raw rows by reference+validname to deduplicate
    const processedEggRows = new Set<string>();

    // Process egg database rows (via egg_diameter traits — one per raw CSV row)
    const eggTraits = traits.filter(t => t.traitType === 'egg_diameter');
    for (const trait of eggTraits) {
      const rawFields = (trait.metadata?.rawFields || {}) as Record<string, unknown>;
      // Deduplicate: same raw row produces egg_diameter, yolk_diameter, egg_volume etc.
      const rowKey = `${rawFields.VALID_NAME}|${rawFields.REFERENCE}|${rawFields.EGG_L_MEAN}|${rawFields.EXT_REF}`;
      if (processedEggRows.has(rowKey)) continue;
      processedEggRows.add(rowKey);

      rows.push(...buildEggRowsFromRaw(rawFields));
    }

    // Process incubation database rows
    const incubationTraits = traits.filter(t => t.traitType === 'incubation_duration');
    for (const trait of incubationTraits) {
      rows.push(buildIncubationRow(trait, sp));
    }
  }

  // Ensure all rows have the exact column set in the right order
  return rows.map(row => {
    const ordered: Record<string, unknown> = {};
    for (const col of EGG_EXPORT_COLUMNS) {
      ordered[col] = row[col] ?? 'NA';
    }
    return ordered;
  });
}


// ==================== SETTLEMENT EXPORT (DATABASE COLUMN ORDER) ====================

/** Settlement traits. */
const SETTLEMENT_SECTION_TRAITS = new Set([
  'settlement_age', 'settlement_size',
]);

/** Check if the requested traits are the settlement section. */
function isSettlementSection(traitKeys: string[]): boolean {
  return traitKeys.some(k => SETTLEMENT_SECTION_TRAITS.has(k));
}

/**
 * Settlement export column order — matches database column order.
 * Columns that exist only in one database (OTOLITH=age, MAX_SIZE_PELAGIC_JUV/LENGTH_TYPE=size)
 * are included for the union; missing values get 'NA'.
 */
const SETTLEMENT_EXPORT_COLUMNS = [
  'ORDER', 'FAMILY', 'GENUS', 'VALID_NAME', 'APHIA_ID', 'AUTHORITY', 'ORIGINAL_NAME',
  'SAMPLING_DATES', 'START_DATE', 'END_DATE', 'ORIGIN', 'LATITUDE', 'LONGITUDE',
  'ARTICLE_GPS_COORD', 'APPROX_GPS', 'MARINE_ECOREGION', 'LOCATION', 'COUNTRY',
  'GEAR', 'OTOLITH', 'MAX_SIZE_PELAGIC_JUV', 'N', 'TYPE',
  'MEAN', 'MIN', 'MAX', 'CONF', 'MEAN_TYPE', 'CONF_TYPE', 'UNIT', 'LENGTH_TYPE',
  'TEMPERATURE_MEAN', 'TEMPERATURE_MIN', 'TEMPERATURE_MAX', 'TEMPERATURE_MEAN_TYPE',
  'EXT_REF', 'REFERENCE', 'LINK',
];

/**
 * Reorder settlement rows to match database column order.
 * Uses SETTLEMENT_EXPORT_COLUMNS as the canonical order, then appends any extra columns.
 */
function reorderSettlementColumns(rows: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  if (rows.length === 0) return rows;

  const allCols = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      allCols.add(key);
    }
  }

  // Only include columns from the defined settlement order (drop any extras)
  const orderedCols: string[] = [];
  for (const col of SETTLEMENT_EXPORT_COLUMNS) {
    if (allCols.has(col)) {
      orderedCols.push(col);
    }
  }

  return rows.map(row => {
    const reordered: Record<string, unknown> = {};
    for (const col of orderedCols) {
      reordered[col] = row[col] ?? 'NA';
    }
    return reordered;
  });
}


// ==================== RAFTING EXPORT (DATABASE COLUMN ORDER) ====================

/** Rafting traits. */
const RAFTING_SECTION_TRAITS = new Set(['rafting_behavior', 'rafting_size']);

/** Check if the requested traits are the rafting section. */
function isRaftingSection(traitKeys: string[]): boolean {
  return traitKeys.some(k => RAFTING_SECTION_TRAITS.has(k));
}

/**
 * Rafting export column order — matches rafting_db_01_2026_final exactly.
 */
const RAFTING_EXPORT_COLUMNS = [
  'ORDER', 'FAMILY', 'GENUS', 'VALID_NAME', 'APHIA_ID', 'AUTHORITY',
  'RANK', 'ORIGINAL_NAME', 'FLOATSAM', 'STAGE', 'LENGTH_TYPE',
  'RAFTING_SIZE_MEAN', 'RAFTING_SIZE_MIN', 'RAFTING_SIZE_MAX',
  'RAFTING_SIZE_MEAN_TYPE', 'RAFTING_AGE', 'EXT_REF', 'REFERENCE', 'LINK',
];

/**
 * Build rafting export rows directly from raw CSV rows.
 */
function buildRaftingSectionExport(
  speciesIds: string[],
  data: { species: Map<string, any>; traitsBySpecies: Map<string, TraitData[]> },
): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [];

  for (const sid of speciesIds) {
    const traits = data.traitsBySpecies.get(sid) || [];
    const sectionTraits = traits.filter(t => RAFTING_SECTION_TRAITS.has(t.traitType));

    // Track processed raw rows to deduplicate
    const processedRows = new Set<string>();

    for (const trait of sectionTraits) {
      const rawFields = (trait.metadata?.rawFields || {}) as Record<string, unknown>;
      const rowKey = `${rawFields.VALID_NAME}|${rawFields.REFERENCE}|${rawFields.RAFTING_SIZE_MEAN}|${rawFields.FLOATSAM}`;
      if (processedRows.has(rowKey)) continue;
      processedRows.add(rowKey);

      const row: Record<string, unknown> = {};
      for (const col of RAFTING_EXPORT_COLUMNS) {
        row[col] = rawFields[col] ?? 'NA';
      }
      rows.push(row);
    }
  }

  return rows;
}


// ==================== PELAGIC JUVENILE EXPORT (DATABASE COLUMN ORDER) ====================

/** Pelagic juvenile traits. */
const PELAGIC_JUVENILE_SECTION_TRAITS = new Set(['pelagic_juvenile_size', 'pelagic_juvenile_duration']);

/** Check if the requested traits are the pelagic juvenile section. */
function isPelagicJuvenileSection(traitKeys: string[]): boolean {
  return traitKeys.some(k => PELAGIC_JUVENILE_SECTION_TRAITS.has(k));
}

/**
 * Pelagic juvenile export column order — matches pel_juv_db_01_2026_final exactly.
 */
const PELAGIC_JUVENILE_EXPORT_COLUMNS = [
  'ORDER', 'FAMILY', 'GENUS', 'VALID_NAME', 'APHIA_ID', 'AUTHORITY',
  'ORIGINAL_NAME', 'KEY_WORD', 'N', 'LENGTH_TYPE',
  'PELAGIC_JUV_SIZE_MEAN', 'PELAGIC_JUV_SIZE_MIN', 'PELAGIC_JUV_SIZE_MAX',
  'PELAGIC_JUV_SIZE_CONF', 'PELAGIC_JUV_SIZE_MEAN_TYPE', 'PELAGIC_JUV_SIZE_CONF_TYPE',
  'PELAGIC_JUV_DURATION_MEAN', 'PELAGIC_JUV_DURATION_MIN', 'PELAGIC_JUV_DURATION_MAX',
  'PELAGIC_JUV_DURATION_CONF', 'PELAGIC_JUV_DURATION_MEAN_TYPE', 'PELAGIC_JUV_DURATION_CONF_TYPE',
  'REMARKS', 'EXT_REF', 'REFERENCE', 'LINK',
];

/**
 * Build pelagic juvenile export rows directly from raw CSV rows.
 */
function buildPelagicJuvenileSectionExport(
  speciesIds: string[],
  data: { species: Map<string, any>; traitsBySpecies: Map<string, TraitData[]> },
): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [];

  for (const sid of speciesIds) {
    const traits = data.traitsBySpecies.get(sid) || [];
    const sectionTraits = traits.filter(t => PELAGIC_JUVENILE_SECTION_TRAITS.has(t.traitType));

    // Track processed raw rows to deduplicate
    const processedRows = new Set<string>();

    for (const trait of sectionTraits) {
      const rawFields = (trait.metadata?.rawFields || {}) as Record<string, unknown>;
      const rowKey = `${rawFields.VALID_NAME}|${rawFields.REFERENCE}|${rawFields.PELAGIC_JUV_SIZE_MEAN}|${rawFields.KEY_WORD}`;
      if (processedRows.has(rowKey)) continue;
      processedRows.add(rowKey);

      const row: Record<string, unknown> = {};
      for (const col of PELAGIC_JUVENILE_EXPORT_COLUMNS) {
        row[col] = rawFields[col] ?? 'NA';
      }
      rows.push(row);
    }
  }

  return rows;
}


// ==================== VERTICAL POSITION EXPORT (DATABASE COLUMN ORDER) ====================

/** Vertical position traits. */
const VERTICAL_POSITION_SECTION_TRAITS = new Set([
  'vertical_distribution', 'vertical_day_depth', 'vertical_night_depth',
  'vertical_day', 'vertical_night',
]);

/** Check if the requested traits are the vertical position section. */
export function isVerticalPositionSection(traitKeys: string[]): boolean {
  return traitKeys.some(k => VERTICAL_POSITION_SECTION_TRAITS.has(k));
}

/**
 * Vertical position export column order — matches original database exactly.
 * Columns from Vertical_position_database_final_01.2026.txt header.
 */
export const VERTICAL_POSITION_EXPORT_COLUMNS = [
  'ORDER', 'FAMILY', 'GENUS', 'VALID_NAME', 'RANK', 'APHIA_ID', 'AUTHORITY',
  'ORIGINAL_NAME', 'LOCATION', 'LATITUDE', 'LONGITUDE', 'GEAR', 'PERIOD',
  'ZONE', 'STAGE', 'POSITION_ISLAND', 'FILTERED_VOLUME', 'BOTTOM_DEPTH',
  'DEPTH_INTERVAL_CONSIDERED', 'N_CAPTURE', 'MIN_DEPTH_CAPTURE',
  'MAX_DEPTH_CAPTURE', 'WEIGHTED_MEAN_DEPTH_CAPTURE',
  'WEIGHTED_SD_DEPTH_CAPTURE', 'WEIGHTING_DETAILS', 'EXT_REF',
  'REFERENCE', 'LINK',
];

/**
 * Build vertical position export rows directly from raw CSV rows.
 */
function buildVerticalPositionSectionExport(
  speciesIds: string[],
  data: { species: Map<string, any>; traitsBySpecies: Map<string, TraitData[]> },
): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [];

  for (const sid of speciesIds) {
    const traits = data.traitsBySpecies.get(sid) || [];
    const sectionTraits = traits.filter(t => VERTICAL_POSITION_SECTION_TRAITS.has(t.traitType));

    // Track processed raw rows to deduplicate
    const processedRows = new Set<string>();

    for (const trait of sectionTraits) {
      const rawFields = (trait.metadata?.rawFields || {}) as Record<string, unknown>;
      const rowKey = `${rawFields.VALID_NAME}|${rawFields.REFERENCE}|${rawFields.WEIGHTED_MEAN_DEPTH_CAPTURE}|${rawFields.PERIOD}|${rawFields.LOCATION}`;
      if (processedRows.has(rowKey)) continue;
      processedRows.add(rowKey);

      const row: Record<string, unknown> = {};
      for (const col of VERTICAL_POSITION_EXPORT_COLUMNS) {
        row[col] = rawFields[col] ?? 'NA';
      }
      rows.push(row);
    }
  }

  return rows;
}


// ==================== GENERIC SECTION EXPORT ====================

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
  first_feeding_age: 'FIRST_FEEDING_DPH_MEAN_TYPE',
  yolk_absorption_age: 'YOLK_ABSORPTION_MEAN_TYPE',
  first_feeding_size: 'FIRST_FEEDING_SIZE_MEAN_TYPE',
  yolk_absorbed_size: 'YOLK_SAC_ABSORBED_SIZE_MEAN_TYPE',
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
 */
const MEASUREMENT_COL_REGEX = /^[A-Z][A-Z0-9_]*_(MEAN|MIN|MAX|CONF|MEAN_TYPE|CONF_TYPE|RANGE_TYPE)$/;

/**
 * Taxonomy columns in preferred order for output.
 */
const TAXONOMY_ORDER = ['ORDER', 'FAMILY', 'GENUS', 'VALID_NAME', 'APHIA_ID', 'AUTHORITY', 'ORIGINAL_NAME'];

/**
 * Column groups in fixed order for the merged export format.
 */
const NORMALIZED_MEASUREMENT_COLS = ['MEAN', 'MIN', 'MAX', 'CONF'];
const META_TYPE_COLS = ['MEAN_TYPE', 'CONF_TYPE', 'UNIT'];
const TEMPERATURE_COLS = [
  'TEMPERATURE_MEAN', 'TEMPERATURE_MIN', 'TEMPERATURE_MAX', 'TEMPERATURE_CONF',
  'TEMPERATURE_MEAN_TYPE', 'TEMPERATURE_CONF_TYPE',
];
const METHOD_COLS = ['ORIGIN', 'N', 'LENGTH_TYPE', 'METHOD', 'GEAR', 'LOCATION'];

/**
 * Per-trait-type allowed optional columns based on columns_per_type.txt.
 * Only columns listed here (from METHOD_COLS + REMARKS) will appear in the export.
 * Columns not in this map default to allowing all METHOD_COLS + REMARKS.
 */
const TRAIT_ALLOWED_OPTIONAL_COLS: Record<string, Set<string>> = {
  hatching_size: new Set([]),
  first_feeding_age: new Set([]),
  first_feeding_size: new Set([]),
  yolk_absorption_age: new Set([]),
  yolk_absorbed_size: new Set([]),
  flexion_age: new Set(['N']),
  flexion_size: new Set(['N', 'LENGTH_TYPE']),
  metamorphosis_age: new Set(['N']),
  metamorphosis_duration: new Set(['N']),
  metamorphosis_size: new Set(['N', 'LENGTH_TYPE']),
  settlement_age: new Set(['ORIGIN', 'N', 'LOCATION', 'GEAR', 'COUNTRY']),
  settlement_size: new Set(['ORIGIN', 'N', 'LENGTH_TYPE', 'LOCATION', 'GEAR', 'COUNTRY']),
  vertical_distribution: new Set(['LOCATION']),
  critical_swimming_speed: new Set(['ORIGIN', 'N', 'LOCATION', 'LENGTH_TYPE', 'REMARKS']),
  critical_swimming_speed_rel: new Set(['ORIGIN', 'N', 'LOCATION', 'LENGTH_TYPE', 'REMARKS']),
  in_situ_swimming_speed: new Set(['ORIGIN', 'N', 'LOCATION', 'REMARKS']),
  in_situ_swimming_speed_rel: new Set(['ORIGIN', 'N', 'LOCATION', 'LENGTH_TYPE', 'REMARKS']),
  pelagic_juvenile_size: new Set(['N', 'LENGTH_TYPE', 'REMARKS']),
  pelagic_juvenile_duration: new Set(['N', 'REMARKS']),
  rafting_size: new Set(['LENGTH_TYPE']),
  rafting_behavior: new Set([]),
};

/** All known fixed-order columns (used to classify "other" extras). */
const ALL_FIXED_COLS = new Set([
  'TYPE',
  ...NORMALIZED_MEASUREMENT_COLS,
  ...META_TYPE_COLS,
  ...TEMPERATURE_COLS,
  ...METHOD_COLS,
  'REMARKS', 'COUNTRY',
]);

/**
 * Columns that ALWAYS come last in the export, in this exact order.
 */
const TAIL_COLUMNS = ['REMARKS', 'EXT_REF', 'REFERENCE', 'LINK'];

/**
 * Check if a rawFields column should be included as a qualitative "extra info" column.
 */
function isExtraInfoColumn(col: string): boolean {
  if (STANDARD_COLUMNS.has(col)) return false;
  if (MEASUREMENT_COL_REGEX.test(col)) return false;
  return true;
}

/**
 * Build a standardized merged export row from a trait.
 * Only includes optional columns (ORIGIN, N, LENGTH_TYPE, METHOD, GEAR, LOCATION, REMARKS, COUNTRY)
 * when allowed by TRAIT_ALLOWED_OPTIONAL_COLS for the trait type.
 */
function buildMergedRow(
  trait: TraitData,
  sp: { order: string; family: string; genus: string; validName: string } | undefined,
  traitType: string,
): Record<string, unknown> {
  const rawFields = (trait.metadata?.rawFields || {}) as Record<string, unknown>;
  const meanTypeCol = MEAN_TYPE_COLUMNS[traitType];
  const allowed = TRAIT_ALLOWED_OPTIONAL_COLS[traitType];

  const row: Record<string, unknown> = {
    ORDER: sp?.order || rawFields.ORDER || '',
    FAMILY: sp?.family || rawFields.FAMILY || '',
    GENUS: sp?.genus || rawFields.GENUS || '',
    VALID_NAME: sp?.validName || rawFields.VALID_NAME || '',
    APHIA_ID: rawFields.APHIA_ID || '',
    AUTHORITY: rawFields.AUTHORITY || '',
    ORIGINAL_NAME: rawFields.ORIGINAL_NAME || 'NA',
    TYPE: TRAIT_TYPE_LABELS[traitType] || traitType,
    MEAN: trait.value ?? 'NA',
    MIN: trait.metadata?.minValue ?? 'NA',
    MAX: trait.metadata?.maxValue ?? 'NA',
    CONF: trait.metadata?.confValue ?? 'NA',
    MEAN_TYPE: meanTypeCol ? (rawFields[meanTypeCol] || 'NA') : 'NA',
    CONF_TYPE: trait.metadata?.confType || 'NA',
    UNIT: trait.unit || '',
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
    EXT_REF: trait.metadata?.externalRef || rawFields.EXT_REF || 'NA',
    REFERENCE: trait.source || rawFields.REFERENCE || 'NA',
    LINK: rawFields.LINK || 'NA',
  };

  // Conditionally add optional columns based on trait type allowlist
  if (!allowed || allowed.has('ORIGIN')) {
    row.ORIGIN = trait.metadata?.origin || rawFields.ORIGIN || 'NA';
  }
  if (!allowed || allowed.has('N')) {
    row.N = trait.metadata?.sampleSize ?? rawFields.N ?? 'NA';
  }
  if (!allowed || allowed.has('LENGTH_TYPE')) {
    row.LENGTH_TYPE = trait.metadata?.lengthType || rawFields.LENGTH_TYPE || 'NA';
  }
  if (!allowed || allowed.has('METHOD')) {
    row.METHOD = trait.metadata?.method || rawFields.METHOD || 'NA';
  }
  if (!allowed || allowed.has('GEAR')) {
    row.GEAR = trait.metadata?.gear || rawFields.GEAR || 'NA';
  }
  if (!allowed || allowed.has('LOCATION')) {
    row.LOCATION = trait.metadata?.location || rawFields.LOCATION || 'NA';
  }
  if (!allowed || allowed.has('COUNTRY')) {
    row.COUNTRY = rawFields.COUNTRY || 'NA';
  }
  if (!allowed || allowed.has('REMARKS')) {
    row.REMARKS = trait.metadata?.remarks || rawFields.REMARKS || 'NA';
  }

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
 */
function unionFillRows(rows: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  if (rows.length === 0) return [];

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

  // 1b. ORIGIN and LOCATION right after taxonomy (before qualitative extras)
  addCol('ORIGIN');
  addCol('LOCATION');

  // 2. Qualitative extras (trait-specific columns like MET_DEFINITION, STAGE, etc.)
  const qualitativeExtras: string[] = [];
  for (const col of [...allColumns].sort()) {
    if (added.has(col) || tailSet.has(col) || taxonomySet.has(col) || ALL_FIXED_COLS.has(col)) continue;
    if (MEASUREMENT_COL_REGEX.test(col)) continue;
    qualitativeExtras.push(col);
  }
  for (const col of qualitativeExtras) addCol(col);

  // 3. N before TYPE (when N is listed for that TYPE)
  addCol('N');

  // 4. TYPE
  addCol('TYPE');

  // 5. MEAN/MIN/MAX/CONF
  addCols(NORMALIZED_MEASUREMENT_COLS);

  // 6. MEAN_TYPE/CONF_TYPE/UNIT
  addCols(META_TYPE_COLS);

  // 7. LENGTH_TYPE after UNIT (when listed)
  addCol('LENGTH_TYPE');

  // 8. Temperature group
  addCols(TEMPERATURE_COLS);

  // 9. Remaining optional columns (METHOD, GEAR, COUNTRY)
  // Note: ORIGIN and LOCATION already added in step 1b
  addCol('METHOD');
  addCol('GEAR');
  addCol('COUNTRY');

  // 10. Tail columns always last
  addCols(TAIL_COLUMNS);

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
 * For the Egg & Incubation section, produces gold-standard format matching
 * example_dascyllus_aruanus.csv. For other sections, produces the generic
 * long-format merged export.
 */
export async function getSectionExportData(
  speciesId: string,
  traitKeys: string[],
  level: 'species' | 'genus' | 'family'
): Promise<Array<Record<string, unknown>> | null> {
  const data = await getOrLoadData();

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

  // Egg section: use gold-standard format
  if (isEggSection(traitKeys)) {
    return buildEggSectionExport(targetSpeciesIds, data);
  }

  // Rafting section: use database column order
  if (isRaftingSection(traitKeys)) {
    return buildRaftingSectionExport(targetSpeciesIds, data);
  }

  // Pelagic juvenile section: use database column order
  if (isPelagicJuvenileSection(traitKeys)) {
    return buildPelagicJuvenileSectionExport(targetSpeciesIds, data);
  }

  // Vertical position section: use original database column order
  if (isVerticalPositionSection(traitKeys)) {
    return buildVerticalPositionSectionExport(targetSpeciesIds, data);
  }

  // Generic section: merged long format
  const rows: Array<Record<string, unknown>> = [];
  for (const sid of targetSpeciesIds) {
    const sp = data.species.get(sid);
    const traits = data.traitsBySpecies.get(sid) || [];
    const sectionTraits = traits.filter((t) => traitKeys.includes(t.traitType));

    for (const trait of sectionTraits) {
      rows.push(buildMergedRow(trait, sp, trait.traitType));
    }
  }

  const result = unionFillRows(rows);

  // Settlement section: reorder columns to match database layout
  if (isSettlementSection(traitKeys)) {
    return reorderSettlementColumns(result);
  }

  return result;
}
