/**
 * All-traits export service.
 *
 * Compiles ALL trait data for a species (or set of species) into a single
 * long-format CSV with standardized columns. Used by the "Export all traits"
 * button on species pages and the province-based bulk export.
 *
 * Output columns (in order):
 * ORDER, FAMILY, GENUS, VALID_NAME, APHIA_ID, AUTHORITY, ORIGINAL_NAME,
 * EGG_LOCATION, EGG_DETAILS, EGG_SHAPE, NB_OIL_GLOBULE,
 * PELAGIC_JUVENILE, RAFTING_FLOATSAM, RAFTING_STAGE,
 * QUANTITATIVE_TYPE, MEAN, MIN, MAX, CONF, MEAN_TYPE, CONF_TYPE,
 * VOLUME_TYPE, UNIT, LENGTH_TYPE,
 * TEMPERATURE_MEAN, TEMPERATURE_MIN, TEMPERATURE_MAX, TEMPERATURE_MEAN_TYPE,
 * EXT_REF, REFERENCE, LINK
 */

import { getOrLoadData, type AllData } from '@/lib/data/data-repository';
import type { TraitData } from '@/lib/types/species.types';
import type { Species } from '@/lib/types/species.types';

/** Ordered export columns */
const EXPORT_COLUMNS = [
  'ORDER', 'FAMILY', 'GENUS', 'VALID_NAME', 'APHIA_ID', 'AUTHORITY', 'ORIGINAL_NAME',
  'EGG_LOCATION', 'EGG_DETAILS', 'EGG_SHAPE', 'NB_OIL_GLOBULE',
  'PELAGIC_JUVENILE', 'RAFTING_FLOATSAM', 'RAFTING_STAGE',
  'QUANTITATIVE_TYPE', 'MEAN', 'MIN', 'MAX', 'CONF', 'MEAN_TYPE', 'CONF_TYPE',
  'VOLUME_TYPE', 'UNIT', 'LENGTH_TYPE',
  'TEMPERATURE_MEAN', 'TEMPERATURE_MIN', 'TEMPERATURE_MAX', 'TEMPERATURE_MEAN_TYPE',
  'EXT_REF', 'REFERENCE', 'LINK',
];

/** Map from traitType to display label for QUANTITATIVE_TYPE column */
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
  critical_swimming_speed: 'Critical swimming speed',
  critical_swimming_speed_rel: 'Critical swimming speed (relative)',
  in_situ_swimming_speed: 'In situ swimming speed',
  in_situ_swimming_speed_rel: 'In situ swimming speed (relative)',
  vertical_day_depth: 'Vertical day depth',
  vertical_night_depth: 'Vertical night depth',
  vertical_distribution: 'Vertical distribution',
  pelagic_juvenile_size: 'Pelagic juvenile size',
  pelagic_juvenile_duration: 'Pelagic juvenile duration',
  rafting_size: 'Rafting size',
  rafting_behavior: 'Rafting',
  larval_growth_rate: 'Larval growth rate',
};

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

/**
 * Build a single export row from a quantitative trait.
 */
function buildRow(
  trait: TraitData,
  species: Species | undefined,
  traitType: string,
): Record<string, string> {
  const raw = (trait.metadata?.rawFields || {}) as Record<string, unknown>;
  const meanTypeCol = MEAN_TYPE_COLUMNS[traitType];

  return {
    ORDER: String(species?.order || raw.ORDER || ''),
    FAMILY: String(species?.family || raw.FAMILY || ''),
    GENUS: String(species?.genus || raw.GENUS || ''),
    VALID_NAME: String(species?.validName || raw.VALID_NAME || ''),
    APHIA_ID: String(raw.APHIA_ID ?? ''),
    AUTHORITY: String(raw.AUTHORITY ?? ''),
    ORIGINAL_NAME: String(raw.ORIGINAL_NAME ?? ''),
    EGG_LOCATION: String(raw.EGG_LOCATION ?? ''),
    EGG_DETAILS: String(raw.EGG_DETAILS ?? ''),
    EGG_SHAPE: String(raw.EGG_SHAPE ?? ''),
    NB_OIL_GLOBULE: String(raw.NB_OIL_GLOBULE ?? ''),
    PELAGIC_JUVENILE: traitType.startsWith('pelagic_juvenile') ? String(raw.KEY_WORD ?? '') : '',
    RAFTING_FLOATSAM: traitType.startsWith('rafting') ? String(raw.FLOATSAM ?? '') : '',
    RAFTING_STAGE: traitType.startsWith('rafting') ? String(raw.STAGE ?? '') : '',
    QUANTITATIVE_TYPE: TRAIT_TYPE_LABELS[traitType] || traitType,
    MEAN: trait.value != null ? String(trait.value) : '',
    MIN: trait.metadata?.minValue != null ? String(trait.metadata.minValue) : '',
    MAX: trait.metadata?.maxValue != null ? String(trait.metadata.maxValue) : '',
    CONF: trait.metadata?.confValue != null ? String(trait.metadata.confValue) : '',
    MEAN_TYPE: meanTypeCol ? String(raw[meanTypeCol] ?? '') : '',
    CONF_TYPE: String(trait.metadata?.confType ?? ''),
    VOLUME_TYPE: String(raw.EGG_VOLUME_TYPE ?? ''),
    UNIT: String(trait.unit ?? ''),
    LENGTH_TYPE: String(trait.metadata?.lengthType || raw.LENGTH_TYPE || ''),
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
): Record<string, string>[] {
  const species = data.species.get(speciesId);
  const traits = data.traitsBySpecies.get(speciesId) || [];

  // Deduplicate rows using a composite key
  const seen = new Set<string>();
  const rows: Record<string, string>[] = [];

  for (const trait of traits) {
    const raw = (trait.metadata?.rawFields || {}) as Record<string, unknown>;
    const rowKey = `${trait.traitType}|${trait.value}|${raw.REFERENCE}|${raw.ORIGINAL_NAME}`;
    if (seen.has(rowKey)) continue;
    seen.add(rowKey);
    rows.push(buildRow(trait, species, trait.traitType));
  }

  return rows;
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

  const rows = exportSpeciesTraits(speciesId, data);
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

  const allRows: Record<string, string>[] = [];
  for (const sid of targetIds) {
    const speciesRows = exportSpeciesTraits(sid, data);
    allRows.push(...speciesRows);
  }

  return { columns: EXPORT_COLUMNS, rows: allRows };
}

/**
 * Convert rows to CSV string.
 */
export function rowsToCsv(columns: string[], rows: Record<string, string>[]): string {
  const header = columns.join(',');
  const lines = rows.map(row => {
    return columns.map(col => {
      const val = row[col] ?? '';
      // Escape values containing commas, quotes, or newlines
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(',');
  });
  return [header, ...lines].join('\n');
}
