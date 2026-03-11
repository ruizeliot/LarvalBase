/**
 * All-traits export service.
 *
 * Compiles ALL trait data for a species (or set of species) into a single
 * long-format CSV with standardized columns. Used by the "Export all traits"
 * button on species pages and the province-based bulk export.
 *
 * Output columns (in order):
 * ORDER, FAMILY, GENUS, VALID_NAME, APHIA_ID, AUTHORITY, ORIGINAL_NAME,
 * EGG_LOCATION, EGG_DETAILS, EGG_SHAPE, NB_OIL_GLOBULE, GROWTH_MODEL,
 * GROWTH_AGE, GROWTH_LENGTH,
 * PELAGIC_JUVENILE, RAFTING_FLOATSAM, RAFTING_STAGE,
 * NAME_QUANTITATIVE, MEAN, MIN, MAX, CONF, MEAN_TYPE, CONF_TYPE,
 * VOLUME_TYPE, UNIT, LENGTH_TYPE,
 * TEMPERATURE_MEAN, TEMPERATURE_MIN, TEMPERATURE_MAX, TEMPERATURE_MEAN_TYPE,
 * EXT_REF, REFERENCE, LINK
 */

import { getOrLoadData, type AllData } from '@/lib/data/data-repository';
import type { TraitData } from '@/lib/types/species.types';
import type { Species } from '@/lib/types/species.types';
import { loadGrowthModels } from '@/lib/services/growth.service';

/** Ordered export columns */
const EXPORT_COLUMNS = [
  'ORDER', 'FAMILY', 'GENUS', 'VALID_NAME', 'APHIA_ID', 'AUTHORITY', 'ORIGINAL_NAME',
  'EGG_LOCATION', 'EGG_DETAILS', 'EGG_SHAPE', 'NB_OIL_GLOBULE',
  'GROWTH_MODEL', 'GROWTH_AGE', 'GROWTH_LENGTH',
  'PELAGIC_JUVENILE', 'RAFTING_FLOATSAM', 'RAFTING_STAGE',
  'NAME_QUANTITATIVE', 'MEAN', 'MIN', 'MAX', 'CONF', 'MEAN_TYPE', 'CONF_TYPE',
  'VOLUME_TYPE', 'UNIT', 'LENGTH_TYPE',
  'TEMPERATURE_MEAN', 'TEMPERATURE_MIN', 'TEMPERATURE_MAX', 'TEMPERATURE_MEAN_TYPE',
  'EXT_REF', 'REFERENCE', 'LINK',
];

/** Map from traitType to display label for NAME_QUANTITATIVE column */
const TRAIT_TYPE_LABELS: Record<string, string> = {
  egg_diameter: 'Egg length',
  egg_width: 'Egg width',
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
  metamorphosis_duration: 'Metamorphosis duration',
  metamorphosis_size: 'Metamorphosis size',
  settlement_age: 'Settlement age',
  settlement_size: 'Settlement size',
  critical_swimming_speed: 'Critical swimming speed (absolute)',
  critical_swimming_speed_rel: 'Critical swimming speed (relative)',
  in_situ_swimming_speed: 'In situ swimming speed (absolute)',
  in_situ_swimming_speed_rel: 'In situ swimming speed (relative)',
  vertical_day_depth: 'Vertical day depth',
  vertical_night_depth: 'Vertical night depth',
  vertical_distribution: 'Vertical distribution',
  pelagic_juvenile_size: 'Pelagic juvenile size',
  pelagic_juvenile_duration: 'Pelagic juvenile duration',
  rafting_size: 'Rafting size',
  rafting_behavior: 'Rafting',
  larval_growth_rate: 'Larval growth rate',
  growth_model: 'Growth model',
};

/** Qualitative trait types — TYPE and MEAN should be blank */
const QUALITATIVE_TRAITS = new Set([
  'egg_position', 'egg_shape', 'egg_oil_globules',
  'pelagic_juvenile_behavior', 'rafting_behavior',
]);

/** Trait types to always exclude from export */
const EXCLUDED_TRAIT_TYPES = new Set([
  'larval_age_at_length',
  'vertical_day',
  'vertical_night',
  'larval_age',
  'larval_length',
]);

/** Trait type sort order — matches species page section order */
const TRAIT_SORT_ORDER: Record<string, number> = {
  // Qualitative egg traits
  egg_position: 1,
  egg_shape: 2,
  egg_oil_globules: 3,
  // Quantitative egg traits
  egg_diameter: 10,
  egg_length: 11,
  egg_width: 12,
  egg_volume: 13,
  yolk_diameter: 14,
  oil_globule_size: 15,
  // Incubation
  incubation_duration: 20,
  // Hatching
  hatching_size: 30,
  // First feeding
  first_feeding_age: 40,
  first_feeding_size: 41,
  yolk_absorption_age: 42,
  yolk_absorbed_size: 43,
  // Flexion
  flexion_age: 50,
  flexion_size: 51,
  // Metamorphosis
  metamorphosis_age: 60,
  metamorphosis_duration: 61,
  metamorphosis_size: 62,
  // Settlement
  settlement_age: 70,
  settlement_size: 71,
  // Pelagic juvenile
  pelagic_juvenile_behavior: 80,
  pelagic_juvenile_size: 81,
  pelagic_juvenile_duration: 82,
  // Rafting
  rafting_behavior: 90,
  rafting_size: 91,
  // Vertical position
  vertical_distribution: 100,
  vertical_day_depth: 101,
  vertical_night_depth: 102,
  // Swimming speed
  critical_swimming_speed: 110,
  critical_swimming_speed_rel: 111,
  in_situ_swimming_speed: 112,
  in_situ_swimming_speed_rel: 113,
  // Growth model
  growth_model: 120,
  // Age-at-length / larval growth
  larval_growth_rate: 130,
  larval_age: 131,
  larval_length: 132,
};

/**
 * Check if a trait type is a redundant _min/_max variant.
 * These are already covered by the MIN/MAX columns on the base trait row.
 */
function isRedundantMinMax(traitType: string): boolean {
  return (traitType.endsWith('_min') || traitType.endsWith('_max')) &&
    !TRAIT_TYPE_LABELS[traitType]; // If it has its own label, it's a real trait, not a _min/_max variant
}

/** Mean type column name per trait (used to extract the correct raw field) */
const MEAN_TYPE_COLUMNS: Record<string, string> = {
  egg_diameter: 'EGG_L_MEAN_TYPE',
  egg_width: 'EGG_W_MEAN_TYPE',
  yolk_diameter: 'YOLK_SIZE_MEAN_TYPE',
  oil_globule_size: 'OIL_GLOBULE_SIZE_MEAN_TYPE',
  incubation_duration: 'INCUBATION_DURATION_MEAN_TYPE',
  hatching_size: 'HATCHING_MEAN_TYPE',
  first_feeding_age: 'FF_AGE_MEAN_TYPE',
  first_feeding_size: 'FF_SIZE_MEAN_TYPE',
  flexion_age: 'FLEXION_AGE_MEAN_TYPE',
  flexion_size: 'FLEXION_SIZE_MEAN_TYPE',
  metamorphosis_age: 'MET_AGE_MEAN_TYPE',
  metamorphosis_size: 'MET_SIZE_MEAN_TYPE',
  settlement_age: 'SETTLEMENT_AGE_MEAN_TYPE',
  settlement_size: 'SETTLEMENT_SIZE_MEAN_TYPE',
  pelagic_juvenile_size: 'PELAGIC_JUV_SIZE_MEAN_TYPE',
  pelagic_juvenile_duration: 'PELAGIC_JUV_DURATION_MEAN_TYPE',
  rafting_size: 'RAFTING_SIZE_MEAN_TYPE',
};

/** Volume trait types — use mm^3 unit */
const VOLUME_TRAITS = new Set(['egg_volume', 'yolk_volume', 'oil_globule_volume']);

/**
 * Build a single export row from a quantitative trait.
 */
function buildRow(
  trait: TraitData,
  species: Species | undefined,
  traitType: string,
  growthModelEquation?: string,
  growthModelUnits?: string,
  speciesAphiaId?: string,
  speciesAuthority?: string,
): Record<string, string> {
  const raw = (trait.metadata?.rawFields || {}) as Record<string, unknown>;
  const meanTypeCol = MEAN_TYPE_COLUMNS[traitType];
  const isQualitative = QUALITATIVE_TRAITS.has(traitType);
  const isGrowthModel = traitType === 'growth_model';

  // Fix 9: Use mm^3 for volume measurements
  let unit = String(trait.unit ?? '');
  if (VOLUME_TRAITS.has(traitType) && (unit === 'mm³' || unit === 'mm3' || unit.includes('³'))) {
    unit = 'mm^3';
  }
  // Growth model: combine X_UNIT - Y_UNIT (no special Unicode characters)
  if (isGrowthModel && growthModelUnits) {
    unit = growthModelUnits;
  }
  // Remove "observed" from UNIT — leave blank instead
  if (unit.toLowerCase() === 'observed') {
    unit = '';
  }
  // Qualitative rows should have blank UNIT
  if (isQualitative) {
    unit = '';
  }

  return {
    _sortKey: String(TRAIT_SORT_ORDER[traitType] ?? 999),
    _traitType: traitType,
    ORDER: String(species?.order || raw.ORDER || ''),
    FAMILY: String(species?.family || raw.FAMILY || ''),
    GENUS: String(species?.genus || raw.GENUS || ''),
    VALID_NAME: String(species?.validName || raw.VALID_NAME || ''),
    APHIA_ID: String(raw.APHIA_ID ?? speciesAphiaId ?? ''),
    AUTHORITY: String(raw.AUTHORITY ?? speciesAuthority ?? ''),
    ORIGINAL_NAME: String(raw.ORIGINAL_NAME ?? ''),
    EGG_LOCATION: String(raw.EGG_LOCATION ?? ''),
    EGG_DETAILS: String(raw.EGG_DETAILS ?? ''),
    EGG_SHAPE: String(raw.EGG_SHAPE ?? ''),
    NB_OIL_GLOBULE: String(raw.NB_OIL_GLOBULE ?? ''),
    PELAGIC_JUVENILE: traitType.startsWith('pelagic_juvenile') ? String(raw.KEY_WORD ?? '') : '',
    RAFTING_FLOATSAM: traitType.startsWith('rafting') ? String(raw.FLOATSAM ?? '') : '',
    RAFTING_STAGE: traitType.startsWith('rafting') ? String(raw.STAGE ?? '') : '',
    NAME_QUANTITATIVE: (isQualitative || isGrowthModel) ? '' : (TRAIT_TYPE_LABELS[traitType] || traitType),
    MEAN: (isQualitative || isGrowthModel) ? '' : (trait.value != null ? String(trait.value) : ''),
    MIN: trait.metadata?.minValue != null ? String(trait.metadata.minValue) : '',
    MAX: trait.metadata?.maxValue != null ? String(trait.metadata.maxValue) : '',
    CONF: trait.metadata?.confValue != null ? String(trait.metadata.confValue) : '',
    MEAN_TYPE: meanTypeCol ? String(raw[meanTypeCol] ?? '') : '',
    CONF_TYPE: String(trait.metadata?.confType ?? ''),
    VOLUME_TYPE: String(raw.EGG_VOLUME_TYPE ?? ''),
    UNIT: unit,
    LENGTH_TYPE: String(trait.metadata?.lengthType || raw.LENGTH_TYPE || ''),
    GROWTH_MODEL: isGrowthModel ? (growthModelEquation || '') : '',
    GROWTH_AGE: '',
    GROWTH_LENGTH: '',
    TEMPERATURE_MEAN: String(trait.metadata?.temperatureMean ?? raw.REARING_TEMPERATURE_MEAN ?? raw.TEMPERATURE_MEAN ?? ''),
    TEMPERATURE_MIN: String(trait.metadata?.temperatureMin ?? raw.REARING_TEMPERATURE_MIN ?? raw.TEMPERATURE_MIN ?? ''),
    TEMPERATURE_MAX: String(trait.metadata?.temperatureMax ?? raw.REARING_TEMPERATURE_MAX ?? raw.TEMPERATURE_MAX ?? ''),
    TEMPERATURE_MEAN_TYPE: String(raw.TEMPERATURE_MEAN_TYPE ?? raw.REARING_TEMPERATURE_MEAN_TYPE ?? ''),
    EXT_REF: String(trait.metadata?.externalRef || raw.EXT_REF || ''),
    REFERENCE: String(trait.source || raw.REFERENCE || ''),
    LINK: String(raw.LINK ?? ''),
  };
}

/**
 * Export all traits for a single species.
 */
function exportSpeciesTraits(
  speciesId: string,
  data: AllData,
  growthModels?: Map<string, { equation: string; xUnit: string; yUnit: string }[]>,
): Record<string, string>[] {
  const species = data.species.get(speciesId);
  const traits = data.traitsBySpecies.get(speciesId) || [];

  // Look up APHIA_ID and AUTHORITY from any trait record for this species
  // (growth model records may not have these fields)
  let speciesAphiaId = '';
  let speciesAuthority = '';
  for (const t of traits) {
    const rf = (t.metadata?.rawFields || {}) as Record<string, unknown>;
    if (!speciesAphiaId && rf.APHIA_ID) speciesAphiaId = String(rf.APHIA_ID);
    if (!speciesAuthority && rf.AUTHORITY) speciesAuthority = String(rf.AUTHORITY);
    if (speciesAphiaId && speciesAuthority) break;
  }

  // Deduplicate rows using a composite key
  const seen = new Set<string>();
  const rows: Record<string, string>[] = [];

  for (const trait of traits) {
    // Skip excluded trait types and redundant _min/_max variants
    if (EXCLUDED_TRAIT_TYPES.has(trait.traitType)) continue;
    if (isRedundantMinMax(trait.traitType)) continue;

    const raw = (trait.metadata?.rawFields || {}) as Record<string, unknown>;

    // For growth_model traits, expand into one row per model
    if (trait.traitType === 'growth_model' && growthModels) {
      const models = growthModels.get(speciesId) || [];
      for (const model of models) {
        const gmKey = `growth_model|${model.equation}|${model.xUnit}|${model.yUnit}`;
        if (seen.has(gmKey)) continue;
        seen.add(gmKey);
        const units = `${model.xUnit} - ${model.yUnit}`;
        rows.push(buildRow(trait, species, trait.traitType, model.equation, units, speciesAphiaId, speciesAuthority));
      }
      if (models.length === 0) {
        // Fallback: add a single empty growth model row
        const gmKey = `growth_model|empty`;
        if (!seen.has(gmKey)) {
          seen.add(gmKey);
          rows.push(buildRow(trait, species, trait.traitType, '', '', speciesAphiaId, speciesAuthority));
        }
      }
      continue;
    }

    // Fix 6: Qualitative deduplication — if a trait has qualitative data
    // (PJ keyword or rafting floatsam/stage) but no actual numeric MEAN,
    // only create one qualitative row, not both qualitative + quantitative
    const isPJQuant = trait.traitType === 'pelagic_juvenile_size' || trait.traitType === 'pelagic_juvenile_duration';
    const isRaftingQuant = trait.traitType === 'rafting_size';
    if ((isPJQuant || isRaftingQuant) && trait.value == null) {
      // No actual quantitative value — skip this row.
      // The qualitative row (pelagic_juvenile_behavior / rafting_behavior) will cover it.
      continue;
    }

    const rowKey = `${trait.traitType}|${trait.value}|${raw.REFERENCE}|${raw.ORIGINAL_NAME}`;
    if (seen.has(rowKey)) continue;
    seen.add(rowKey);
    rows.push(buildRow(trait, species, trait.traitType, undefined, undefined, speciesAphiaId, speciesAuthority));
  }

  // Build GROWTH_AGE/GROWTH_LENGTH rows from larval age-at-length data
  // These are individual data points (age + length pairs) placed at the bottom
  const growthAgeRows: Record<string, string>[] = [];
  for (const trait of traits) {
    if (trait.traitType !== 'larval_age_at_length') continue;
    const raw = (trait.metadata?.rawFields || {}) as Record<string, unknown>;
    const age = String(raw.AGE ?? '').trim();
    const length = String(raw.LENGTH ?? '').trim();
    if (!age && !length) continue;
    // Deduplicate by age+length+reference
    const dedupKey = `growth_al|${age}|${length}|${raw.REFERENCE}|${raw.ORIGINAL_NAME}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    // Determine units from raw fields
    const xUnit = String(raw.X_UNIT ?? raw.AGE_UNIT ?? 'dph').trim();
    const yUnit = String(raw.Y_UNIT ?? raw.LENGTH_UNIT ?? 'mm').trim();

    growthAgeRows.push({
      _sortKey: '999',
      _traitType: 'growth_age_length',
      ORDER: String(species?.order || raw.ORDER || ''),
      FAMILY: String(species?.family || raw.FAMILY || ''),
      GENUS: String(species?.genus || raw.GENUS || ''),
      VALID_NAME: String(species?.validName || raw.VALID_NAME || ''),
      APHIA_ID: String(raw.APHIA_ID ?? speciesAphiaId ?? ''),
      AUTHORITY: String(raw.AUTHORITY ?? speciesAuthority ?? ''),
      ORIGINAL_NAME: String(raw.ORIGINAL_NAME ?? ''),
      EGG_LOCATION: '',
      EGG_DETAILS: '',
      EGG_SHAPE: '',
      NB_OIL_GLOBULE: '',
      PELAGIC_JUVENILE: '',
      RAFTING_FLOATSAM: '',
      RAFTING_STAGE: '',
      NAME_QUANTITATIVE: '',
      MEAN: '',
      MIN: '',
      MAX: '',
      CONF: '',
      MEAN_TYPE: '',
      CONF_TYPE: '',
      VOLUME_TYPE: '',
      UNIT: `${xUnit} - ${yUnit}`,
      LENGTH_TYPE: String(raw.LENGTH_TYPE ?? ''),
      GROWTH_MODEL: '',
      GROWTH_AGE: age,
      GROWTH_LENGTH: length,
      TEMPERATURE_MEAN: String(raw.REARING_TEMPERATURE_MEAN ?? raw.TEMPERATURE_MEAN ?? ''),
      TEMPERATURE_MIN: String(raw.REARING_TEMPERATURE_MIN ?? raw.TEMPERATURE_MIN ?? ''),
      TEMPERATURE_MAX: String(raw.REARING_TEMPERATURE_MAX ?? raw.TEMPERATURE_MAX ?? ''),
      TEMPERATURE_MEAN_TYPE: String(raw.TEMPERATURE_MEAN_TYPE ?? raw.REARING_TEMPERATURE_MEAN_TYPE ?? ''),
      EXT_REF: String(raw.EXT_REF ?? ''),
      REFERENCE: String(trait.source || raw.REFERENCE || ''),
      LINK: String(raw.LINK ?? ''),
    });
  }

  // Fix 4: Sort rows by trait type order (matching species page section order)
  rows.sort((a, b) => {
    const aKey = parseInt(a._sortKey || '999');
    const bKey = parseInt(b._sortKey || '999');
    return aKey - bKey;
  });

  // Append growth age-length rows at the bottom
  rows.push(...growthAgeRows);

  // Strip internal sort keys before returning
  for (const row of rows) {
    delete row._sortKey;
    delete row._traitType;
  }

  return rows;
}

/**
 * Load growth models indexed by species ID.
 */
async function loadGrowthModelMap(): Promise<Map<string, { equation: string; xUnit: string; yUnit: string }[]>> {
  const models = await loadGrowthModels();
  const map = new Map<string, { equation: string; xUnit: string; yUnit: string }[]>();
  for (const m of models) {
    const list = map.get(m.speciesId) || [];
    list.push({ equation: m.equation || '', xUnit: m.xUnit || '', yUnit: m.yUnit || '' });
    map.set(m.speciesId, list);
  }
  return map;
}

/**
 * Get all-traits export data for a single species.
 * Returns array of row objects with standardized columns, or null if species not found.
 */
export async function getAllTraitsExport(speciesId: string): Promise<{
  columns: string[];
  rows: Record<string, string>[];
} | null> {
  const data = await getOrLoadData();
  const species = data.species.get(speciesId);
  if (!species) return null;

  const growthModels = await loadGrowthModelMap();
  const rows = exportSpeciesTraits(speciesId, data, growthModels);
  return { columns: EXPORT_COLUMNS, rows };
}

/**
 * Get all-traits export data for all species in given province(s).
 * Returns array of row objects with standardized columns.
 */
export async function getProvinceTraitsExport(
  provinceNames: string[],
  speciesInProvince: string[],
): Promise<{
  columns: string[];
  rows: Record<string, string>[];
}> {
  const data = await getOrLoadData();

  // Build a set of species IDs from valid names
  const targetIds: string[] = [];
  for (const validName of speciesInProvince) {
    // Convert valid name to species ID (lowercase hyphenated)
    const id = validName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (data.species.has(id)) {
      targetIds.push(id);
    }
  }

  const growthModels = await loadGrowthModelMap();
  const allRows: Record<string, string>[] = [];
  for (const sid of targetIds) {
    const speciesRows = exportSpeciesTraits(sid, data, growthModels);
    allRows.push(...speciesRows);
  }

  return { columns: EXPORT_COLUMNS, rows: allRows };
}

/**
 * Sanitize a cell value: replace semicolons and commas with dashes
 * to prevent Excel "This cell already contains data" issues.
 */
function sanitizeValue(val: string): string {
  return val.replace(/[;,]/g, ' -');
}

/**
 * Convert rows to CSV string.
 */
export function rowsToCsv(columns: string[], rows: Record<string, string>[]): string {
  const header = columns.join(',');
  const lines = rows.map(row => {
    return columns.map(col => {
      const raw = row[col] ?? '';
      const val = sanitizeValue(raw);
      // Escape values containing commas, quotes, or newlines
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(',');
  });
  return [header, ...lines].join('\n');
}
