/**
 * Data repository implementing cache-aside pattern.
 *
 * Single point of data access for the entire app:
 * 1. Check cache first (cache HIT returns immediately)
 * 2. On cache MISS: fetch from GitHub, parse, aggregate, store in cache
 * 3. Return data
 *
 * This ensures GitHub is only hit when cache is empty or expired.
 */

import { getCache, CACHE_KEY } from './cache';
import { getDataCache } from './csv-cache';
import { fetchAllCSVs, getFileType } from './github-client';
import { loadAllLocalCSVs, getLocalFileType } from './local-data';
import { parseTraitCSV } from './csv-parser';
import { validateParsedCSV, type SchemaValidationResult } from './schema-validator';
import { buildDatabaseTraitRegistry, type DatabaseTraitRegistry } from './database-registry';
import { loadImageRegistry } from './image-registry';
import { getSpeciesWithGrowthModels } from '@/lib/services/growth.service';
import { isExcludedFamily } from './excluded-families';
import { buildTaxonomyTree } from '@/lib/services/taxonomy.service';
import type { Species, TraitData } from '@/lib/types/species.types';
import type { TaxonomyNode } from '@/lib/types/taxonomy.types';

/**
 * Data source mode.
 * - 'local': Load from data/ directory (pre-publication data files)
 * - 'github': Load from GitHub repository (when data is published)
 * - 'hybrid': Load from both sources, local takes priority
 */
export const DATA_SOURCE: 'local' | 'github' | 'hybrid' = 'local';

/**
 * Location data for GPS map display.
 * Extended with year and metadata for Phase 11 requirements.
 */
export interface LocationData {
  latitude: number;
  longitude: number;
  location: string | null;
  country: string | null;
  /** Sampling year extracted from date columns (for marker coloring) */
  year: number | null;
  /** Unit of measurement for the trait value */
  unit: string | null;
  /** External reference identifier */
  externalRef: string | null;
  /** Reference citation */
  reference: string | null;
  /** DOI or URL link */
  link: string | null;
  /** Trait type (e.g., "settlement_age") */
  traitType: string | null;
  /** Measured value */
  value: number | null;
}

/**
 * Complete aggregated data structure.
 * This is what gets cached and returned to consumers.
 */
export interface AllData {
  /** Map of species ID to species data */
  species: Map<string, Species>;

  /** Taxonomy tree root node */
  taxonomy: TaxonomyNode;

  /** Map of species ID to array of trait data */
  traitsBySpecies: Map<string, TraitData[]>;

  /** Map of species ID to array of location data for GPS map */
  locationsBySpecies: Map<string, LocationData[]>;

  /** Database registry tracking which databases have data for each species */
  databaseRegistry: DatabaseTraitRegistry;

  /** Timestamp when data was fetched from GitHub */
  fetchedAt: Date;
}

/**
 * Raw row structure from settlement/species CSV.
 * Used to extract unique species from the database.
 * Supports multiple column name formats (uppercase, mixed case).
 */
interface SpeciesRow {
  // Species name (various formats)
  Valid_name?: string;
  validname?: string;
  VALID_NAME?: string;
  // Common name
  Common_name?: string;
  COMMON_NAME?: string;
  // Taxonomy (various formats)
  Order?: string;
  ORDER?: string;
  Family?: string;
  FAMILY?: string;
  Genus?: string;
  GENUS?: string;
  // WoRMS ID
  APHIA_ID?: number;
  Aphia_id?: number;
  [key: string]: unknown;
}

/**
 * Raw row structure from trait data CSVs.
 * Settlement age database columns:
 * - SET_AGE_DPH_MEAN: Mean settlement age in days post-hatch
 * - SET_AGE_DPH_MIN/MAX: Range
 * - SET_AGE_DPH_CONF: Confidence interval
 * - N: Sample size
 */
interface TraitRow {
  // Species identifier
  Valid_name?: string;
  validname?: string;
  VALID_NAME?: string;
  // Settlement age data
  SET_AGE_DPH_MEAN?: number;
  SET_AGE_DPH_MIN?: number;
  SET_AGE_DPH_MAX?: number;
  SET_AGE_DPH_CONF?: number;
  SET_AGE_DPH_CONF_TYPE?: string;
  N?: number;
  // Location data
  LATITUDE?: number;
  LONGITUDE?: number;
  LOCATION?: string;
  COUNTRY?: string;
  // Reference
  REFERENCE?: string;
  LINK?: string;
  [key: string]: unknown;
}

/**
 * Generate a URL-safe ID from a species name.
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Extract species from parsed rows.
 * Handles various column name formats found in the CSV files (uppercase, mixed case).
 */
function extractSpeciesFromRows(rows: SpeciesRow[]): Map<string, Species> {
  const species = new Map<string, Species>();

  for (const row of rows) {
    // Handle different column name formats (uppercase takes priority for settlement data)
    let validName = row.VALID_NAME ?? row.Valid_name ?? row.validname ?? '';

    // Skip excluded families (non-fish taxonomy errors)
    const family = row.FAMILY ?? row.Family ?? '';
    if (isExcludedFamily(family)) continue;

    // Handle genus/family level rows (RANK != Species, VALID_NAME is NA)
    const rank = String((row as Record<string, unknown>).RANK ?? '').trim();
    if (!validName || validName === 'NA') {
      const genus = row.GENUS ?? row.Genus ?? '';
      if (rank === 'Genus' && genus && genus !== 'NA') {
        validName = `${genus} sp.`;
      } else if ((rank === 'Family' || rank === 'Subfamily') && family && family !== 'NA') {
        validName = `${family} und.`;
      }
    }

    if (!validName || validName === 'NA') continue;

    const id = slugify(validName);
    if (species.has(id)) continue; // Skip duplicates

    // Extract genus from species name if not provided
    const nameParts = validName.split(' ');
    const genus = row.GENUS ?? row.Genus ?? nameParts[0] ?? 'Unknown';

    species.set(id, {
      id,
      validName,
      commonName: row.COMMON_NAME ?? row.Common_name ?? null,
      order: row.ORDER ?? row.Order ?? 'Unknown',
      family: row.FAMILY ?? row.Family ?? 'Unknown',
      genus,
    });
  }

  return species;
}

/**
 * Extract trait type from filename.
 */
function getTraitTypeFromFilename(filename: string): string {
  const fileType = getFileType(filename);
  if (fileType !== 'other' && fileType !== 'column_descriptions') {
    return fileType;
  }

  // Extract meaningful name from filename
  const name = filename
    .replace('.csv', '')
    .replace(/_/g, ' ')
    .replace(/database?s?/gi, '')
    .trim();

  return name || 'unknown';
}

/**
 * Helper to extract a numeric value from a row field.
 */
function extractNumeric(value: unknown): number | null {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) return parsed;
  }
  return null;
}

/**
 * Extract common metadata from a row.
 */
function extractMetadata(row: Record<string, unknown>): TraitData['metadata'] {
  return {
    method: row.METHOD as string | null ?? null,
    origin: row.ORIGIN as string | null ?? null,
    temperatureMean: extractNumeric(row.TEMPERATURE_MEAN),
    temperatureMin: extractNumeric(row.TEMPERATURE_MIN),
    temperatureMax: extractNumeric(row.TEMPERATURE_MAX),
    gear: row.GEAR as string | null ?? null,
    location: row.LOCATION as string | null ?? row.LOCALITY as string | null ?? null,
    country: row.COUNTRY as string | null ?? null,
    remarks: row.REMARKS as string | null ?? null,
    externalRef: row.EXT_REF as string | null ?? null,
    lengthType: row.LENGTH_TYPE as string | null ?? row.SIZE_TYPE as string | null ?? null,
    sampleSize: extractNumeric(row.N) ?? extractNumeric(row.SAMPLE_SIZE),
    // US-3.3: Min/Max/Conf values (populated per-database in extractTraitsFromRows)
    minValue: null,
    maxValue: null,
    confValue: null,
    confType: null,
    // Store all original CSV fields for database-specific raw data display
    rawFields: { ...row },
  };
}

/**
 * Create metadata with min/max/conf values attached.
 */
function metadataWithMinMaxConf(
  base: TraitData['metadata'],
  row: Record<string, unknown>,
  minCol: string,
  maxCol: string,
  confCol?: string,
  confTypeCol?: string,
): TraitData['metadata'] {
  return {
    ...base,
    minValue: extractNumeric(row[minCol]),
    maxValue: extractNumeric(row[maxCol]),
    confValue: confCol ? extractNumeric(row[confCol]) : null,
    confType: confTypeCol ? (row[confTypeCol] as string | null ?? null) : null,
  };
}

/**
 * Helper to add a trait if value exists.
 */
function addTrait(
  traits: TraitData[],
  traitType: string,
  value: unknown,
  unit: string,
  source: string | null,
  doi: string | null,
  metadata?: TraitData['metadata']
): void {
  const numValue = extractNumeric(value);
  if (numValue !== null) {
    traits.push({ traitType, value: numValue, unit, source, doi, metadata });
  }
}

/**
 * Extract trait data from parsed rows.
 * Maps each database type's columns to standardized trait types.
 */
function extractTraitsFromRows(
  rows: TraitRow[],
  filename: string,
  speciesMap: Map<string, Species>
): Map<string, TraitData[]> {
  const traitsBySpecies = new Map<string, TraitData[]>();
  const r = (row: TraitRow) => row as Record<string, unknown>;

  for (const row of rows) {
    let validName = row.VALID_NAME ?? row.Valid_name ?? row.validname ?? '';
    const rank = String((row as Record<string, unknown>).RANK ?? '').trim();

    // For genus/family level rows (VALID_NAME is NA), use "GENUS sp." / "FAMILY und." labels
    if (!validName || validName === 'NA') {
      const genus = String((row as Record<string, unknown>).GENUS ?? '').trim();
      const family = (row as Record<string, unknown>).FAMILY as string ?? '';
      if (rank === 'Genus' && genus && genus !== 'NA') {
        validName = `${genus} sp.`;
      } else if ((rank === 'Family' || rank === 'Subfamily') && family && family !== 'NA') {
        validName = `${family} und.`;
      }
    }

    if (!validName || validName === 'NA') continue;

    // Skip excluded families (non-fish taxonomy errors)
    const rowFamily = (row as Record<string, unknown>).FAMILY as string ?? (row as Record<string, unknown>).Family as string ?? '';
    if (isExcludedFamily(rowFamily)) continue;

    const speciesId = slugify(validName);
    const traits: TraitData[] = [];
    const source = (row.REFERENCE as string) ?? null;
    const doi = (row.LINK as string) ?? null;
    const metadata = extractMetadata(r(row));

    // Settlement Age Database
    if (filename.includes('settlement_age')) {
      const setAgeMeta = metadataWithMinMaxConf(metadata, r(row), 'SET_AGE_DPH_MIN', 'SET_AGE_DPH_MAX', 'SET_AGE_DPH_CONF', 'SET_AGE_DPH_CONF_TYPE');
      addTrait(traits, 'settlement_age', r(row).SET_AGE_DPH_MEAN, 'days', source, doi, setAgeMeta);
      addTrait(traits, 'settlement_age_min', r(row).SET_AGE_DPH_MIN, 'days', source, doi, metadata);
      addTrait(traits, 'settlement_age_max', r(row).SET_AGE_DPH_MAX, 'days', source, doi, metadata);
    }
    // Settlement Size Database
    else if (filename.includes('settlement_size')) {
      const setSizeMeta = metadataWithMinMaxConf(metadata, r(row), 'SET_SIZE_MIN', 'SET_SIZE_MAX', 'SET_SIZE_CONF', 'SET_SIZE_CONF_TYPE');
      addTrait(traits, 'settlement_size', r(row).SET_SIZE_MEAN, 'mm', source, doi, setSizeMeta);
      addTrait(traits, 'settlement_size_min', r(row).SET_SIZE_MIN, 'mm', source, doi, metadata);
      addTrait(traits, 'settlement_size_max', r(row).SET_SIZE_MAX, 'mm', source, doi, metadata);
    }
    // Egg Database
    else if (filename.includes('egg_database')) {
      const eggMeta = metadataWithMinMaxConf(metadata, r(row), 'EGG_L_MIN', 'EGG_L_MAX', 'EGG_DIAMETER_CONF', 'EGG_DIAMETER_CONF_TYPE');
      addTrait(traits, 'egg_diameter', r(row).EGG_L_MEAN, 'mm', source, doi, eggMeta);
      addTrait(traits, 'egg_diameter_min', r(row).EGG_L_MIN, 'mm', source, doi, metadata);
      addTrait(traits, 'egg_diameter_max', r(row).EGG_L_MAX, 'mm', source, doi, metadata);
      const yolkMeta = metadataWithMinMaxConf(metadata, r(row), 'YOLK_SIZE_MIN', 'YOLK_SIZE_MAX');
      addTrait(traits, 'yolk_diameter', r(row).YOLK_SIZE_MEAN, 'mm', source, doi, yolkMeta);
      const ogMeta = metadataWithMinMaxConf(metadata, r(row), 'OIL_GLOBULE_SIZE_MIN', 'OIL_GLOBULE_SIZE_MAX');
      addTrait(traits, 'oil_globule_size', r(row).OIL_GLOBULE_SIZE_MEAN, 'mm', source, doi, ogMeta);
      const eggVolMeta = metadataWithMinMaxConf(metadata, r(row), 'EGG_VOLUME_MIN', 'EGG_VOLUME_MAX');
      addTrait(traits, 'egg_volume', r(row).EGG_VOLUME_MEAN, 'mm³', source, doi, eggVolMeta);
      // Egg width — only if EGG_W_MEAN exists and differs from EGG_L_MEAN
      const eggWMean = r(row).EGG_W_MEAN;
      const eggLMean = r(row).EGG_L_MEAN;
      if (eggWMean !== null && eggWMean !== undefined && String(eggWMean).trim() !== '' && String(eggWMean).trim() !== 'NA') {
        const wVal = parseFloat(String(eggWMean));
        const lVal = eggLMean ? parseFloat(String(eggLMean)) : NaN;
        if (!isNaN(wVal) && (isNaN(lVal) || Math.abs(wVal - lVal) > 0.001)) {
          const eggWMeta = metadataWithMinMaxConf(metadata, r(row), 'EGG_W_MIN', 'EGG_W_MAX');
          addTrait(traits, 'egg_width', eggWMean, 'mm', source, doi, eggWMeta);
        }
      }
      // Egg qualitative filter flags
      const eggLoc = String(r(row).EGG_LOCATION ?? '').trim();
      if (eggLoc && eggLoc !== 'NA') {
        traits.push({ traitType: 'egg_position', value: 1, unit: '', source, doi, metadata });
      }
      const eggShape = String(r(row).EGG_SHAPE ?? '').trim();
      if (eggShape && eggShape !== 'NA') {
        traits.push({ traitType: 'egg_shape', value: 1, unit: '', source, doi, metadata });
      }
      const nbOil = String(r(row).NB_OIL_GLOBULE ?? '').trim();
      if (nbOil && nbOil !== 'NA') {
        traits.push({ traitType: 'egg_oil_globules', value: 1, unit: '', source, doi, metadata });
      }
    }
    // Hatching Size Database
    else if (filename.includes('hatching_size')) {
      const hatchMeta = metadataWithMinMaxConf(metadata, r(row), 'HATCHING_SIZE_MIN', 'HATCHING_SIZE_MAX', 'HATCHING_SIZE_CONF', 'HATCHING_SIZE_CONF_TYPE');
      addTrait(traits, 'hatching_size', r(row).HATCHING_SIZE_MEAN, 'mm', source, doi, hatchMeta);
      addTrait(traits, 'hatching_size_min', r(row).HATCHING_SIZE_MIN, 'mm', source, doi, metadata);
      addTrait(traits, 'hatching_size_max', r(row).HATCHING_SIZE_MAX, 'mm', source, doi, metadata);
    }
    // Incubation Database
    else if (filename.includes('incubation')) {
      const incMeta = metadataWithMinMaxConf(metadata, r(row), 'INCUBATION_GESTATION_HOUR_MIN', 'INCUBATION_GESTATION_HOUR_MAX');
      addTrait(traits, 'incubation_duration', r(row).INCUBATION_GESTATION_HOUR_MEAN, 'hours', source, doi, incMeta);
      addTrait(traits, 'incubation_duration_min', r(row).INCUBATION_GESTATION_HOUR_MIN, 'hours', source, doi, metadata);
      addTrait(traits, 'incubation_duration_max', r(row).INCUBATION_GESTATION_HOUR_MAX, 'hours', source, doi, metadata);
    }
    // First Feeding Age Database
    else if (filename.includes('first_feeding_age')) {
      const ffaMeta = metadataWithMinMaxConf(metadata, r(row), 'FIRST_FEEDING_DPH_MIN', 'FIRST_FEEDING_DPH_MAX');
      addTrait(traits, 'first_feeding_age', r(row).FIRST_FEEDING_DPH_MEAN, 'days', source, doi, ffaMeta);
      addTrait(traits, 'first_feeding_age_min', r(row).FIRST_FEEDING_DPH_MIN, 'days', source, doi, metadata);
      addTrait(traits, 'first_feeding_age_max', r(row).FIRST_FEEDING_DPH_MAX, 'days', source, doi, metadata);
      addTrait(traits, 'yolk_absorption_age', r(row).YOLK_ABSORPTION_DPH_MEAN, 'days', source, doi, metadata);
    }
    // First Feeding Size Database
    else if (filename.includes('first_feeding_size')) {
      addTrait(traits, 'first_feeding_size', r(row).FIRST_FEEDING_SIZE_MEAN, 'mm', source, doi, metadata);
      addTrait(traits, 'yolk_absorbed_size', r(row).YOLK_SAC_ABSORBED_SIZE_MEAN, 'mm', source, doi, metadata);
    }
    // Flexion Age Database
    else if (filename.includes('flexion_age')) {
      const flexAgeMeta = metadataWithMinMaxConf(metadata, r(row), 'FLEXION_AGE_DPH_MIN', 'FLEXION_AGE_DPH_MAX');
      addTrait(traits, 'flexion_age', r(row).FLEXION_AGE_DPH_MEAN, 'days', source, doi, flexAgeMeta);
      addTrait(traits, 'flexion_age_min', r(row).FLEXION_AGE_DPH_MIN, 'days', source, doi, metadata);
      addTrait(traits, 'flexion_age_max', r(row).FLEXION_AGE_DPH_MAX, 'days', source, doi, metadata);
    }
    // Flexion Size Database
    else if (filename.includes('flexion_size')) {
      const flexSizeMeta = metadataWithMinMaxConf(metadata, r(row), 'FLEXION_SIZE_MIN', 'FLEXION_SIZE_MAX');
      addTrait(traits, 'flexion_size', r(row).FLEXION_SIZE_MEAN, 'mm', source, doi, flexSizeMeta);
      addTrait(traits, 'flexion_size_min', r(row).FLEXION_SIZE_MIN, 'mm', source, doi, metadata);
      addTrait(traits, 'flexion_size_max', r(row).FLEXION_SIZE_MAX, 'mm', source, doi, metadata);
    }
    // Metamorphosis Age Database
    else if (filename.includes('metamorphosis_age')) {
      const metAgeMeta = metadataWithMinMaxConf(metadata, r(row), 'MET_AGE_DPH_MIN', 'MET_AGE_DPH_MAX');
      addTrait(traits, 'metamorphosis_age', r(row).MET_AGE_DPH_MEAN, 'days', source, doi, metAgeMeta);
      addTrait(traits, 'metamorphosis_age_min', r(row).MET_AGE_DPH_MIN, 'days', source, doi, metadata);
      addTrait(traits, 'metamorphosis_age_max', r(row).MET_AGE_DPH_MAX, 'days', source, doi, metadata);
      // Metamorphosis Duration (from same database)
      const metDurMeta = metadataWithMinMaxConf(metadata, r(row), 'MET_DURATION_MIN', 'MET_DURATION_MAX');
      addTrait(traits, 'metamorphosis_duration', r(row).MET_DURATION_MEAN, 'days', source, doi, metDurMeta);
    }
    // Metamorphosis Size Database
    else if (filename.includes('metamorphosis_size')) {
      const metSizeMeta = metadataWithMinMaxConf(metadata, r(row), 'MET_SIZE_MIN', 'MET_SIZE_MAX');
      addTrait(traits, 'metamorphosis_size', r(row).MET_SIZE_MEAN, 'mm', source, doi, metSizeMeta);
      addTrait(traits, 'metamorphosis_size_min', r(row).MET_SIZE_MIN, 'mm', source, doi, metadata);
      addTrait(traits, 'metamorphosis_size_max', r(row).MET_SIZE_MAX, 'mm', source, doi, metadata);
    }
    // Critical Swimming Speed Database
    else if (filename.includes('critical_swimming')) {
      const ucritMeta = metadataWithMinMaxConf(metadata, r(row), 'UCRIT_ABS_MIN', 'UCRIT_ABS_MAX');
      addTrait(traits, 'critical_swimming_speed', r(row).UCRIT_ABS_MEAN, 'cm/s', source, doi, ucritMeta);
      addTrait(traits, 'critical_swimming_speed_min', r(row).UCRIT_ABS_MIN, 'cm/s', source, doi, metadata);
      addTrait(traits, 'critical_swimming_speed_max', r(row).UCRIT_ABS_MAX, 'cm/s', source, doi, metadata);
      addTrait(traits, 'critical_swimming_speed_rel', r(row).UCRIT_REL_MEAN, 'BL/s', source, doi, metadata);
    }
    // In Situ Swimming Speed Database
    else if (filename.includes('in_situ_swimming')) {
      const issMeta = metadataWithMinMaxConf(metadata, r(row), 'ISS_ABS_MIN', 'ISS_ABS_MAX');
      addTrait(traits, 'in_situ_swimming_speed', r(row).ISS_ABS_MEAN, 'cm/s', source, doi, issMeta);
      addTrait(traits, 'in_situ_swimming_speed_min', r(row).ISS_ABS_MIN, 'cm/s', source, doi, metadata);
      addTrait(traits, 'in_situ_swimming_speed_max', r(row).ISS_ABS_MAX, 'cm/s', source, doi, metadata);
      addTrait(traits, 'in_situ_swimming_speed_rel', r(row).ISS_REL_MEAN, 'BL/s', source, doi, metadata);
    }
    // Vertical Position Database
    else if (filename.includes('vertical_position')) {
      const vertMeta = metadataWithMinMaxConf(metadata, r(row), 'MIN_DEPTH_CAPTURE', 'MAX_DEPTH_CAPTURE');
      // Negate depth values (depths are positive in DB but should display as negative)
      const negateDepth = (val: unknown): string | number | null | undefined => {
        if (val === null || val === undefined) return val as null | undefined;
        const numStr = String(val).trim();
        if (numStr === '' || numStr === 'NA') return numStr;
        const num = parseFloat(numStr);
        if (isNaN(num)) return numStr;
        return num === 0 ? 0 : -Math.abs(num);
      };
      const negatedMean = negateDepth(r(row).WEIGHTED_MEAN_DEPTH_CAPTURE);
      const negatedMin = negateDepth(r(row).MIN_DEPTH_CAPTURE);
      const negatedMax = negateDepth(r(row).MAX_DEPTH_CAPTURE);

      // Split by PERIOD column: Day vs Night
      const period = String(r(row).PERIOD ?? '').trim().toLowerCase();
      if (period === 'day') {
        addTrait(traits, 'vertical_day_depth', negatedMean, 'm', source, doi, vertMeta);
        addTrait(traits, 'vertical_day_depth_min', negatedMin, 'm', source, doi, metadata);
        addTrait(traits, 'vertical_day_depth_max', negatedMax, 'm', source, doi, metadata);
        traits.push({ traitType: 'vertical_day', value: 1, unit: '', source, doi, metadata });
      } else if (period === 'night') {
        addTrait(traits, 'vertical_night_depth', negatedMean, 'm', source, doi, vertMeta);
        addTrait(traits, 'vertical_night_depth_min', negatedMin, 'm', source, doi, metadata);
        addTrait(traits, 'vertical_night_depth_max', negatedMax, 'm', source, doi, metadata);
        traits.push({ traitType: 'vertical_night', value: 1, unit: '', source, doi, metadata });
      }
      // Also store combined vertical distribution (for backward compat)
      addTrait(traits, 'vertical_distribution', negatedMean, 'm', source, doi, vertMeta);
      addTrait(traits, 'vertical_distribution_min', negatedMin, 'm', source, doi, metadata);
      addTrait(traits, 'vertical_distribution_max', negatedMax, 'm', source, doi, metadata);
    }
    // Rafting Database
    else if (filename.includes('rafting')) {
      const raftMeta = metadataWithMinMaxConf(metadata, r(row), 'RAFTING_SIZE_MIN', 'RAFTING_SIZE_MAX');
      addTrait(traits, 'rafting_size', r(row).RAFTING_SIZE_MEAN, 'mm', source, doi, raftMeta);
      addTrait(traits, 'rafting_size_min', r(row).RAFTING_SIZE_MIN, 'mm', source, doi, metadata);
      addTrait(traits, 'rafting_size_max', r(row).RAFTING_SIZE_MAX, 'mm', source, doi, metadata);
      // Store rafting behavior as a flag (has data = 1)
      if (r(row).FLOATSAM) {
        traits.push({ traitType: 'rafting_behavior', value: 1, unit: 'observed', source, doi, metadata });
      }
      // Rafting age filter flag
      const raftAge = String(r(row).RAFTING_AGE ?? '').trim();
      if (raftAge && raftAge !== 'NA') {
        traits.push({ traitType: 'rafting_age', value: 1, unit: '', source, doi, metadata });
      }
    }
    // Pelagic Juvenile Database
    else if (filename.includes('pelagic_juvenile')) {
      const pjSizeMeta = metadataWithMinMaxConf(metadata, r(row), 'PELAGIC_JUV_SIZE_MIN', 'PELAGIC_JUV_SIZE_MAX', 'PELAGIC_JUV_SIZE_CONF', 'PELAGIC_JUV_SIZE_CONF_TYPE');
      addTrait(traits, 'pelagic_juvenile_size', r(row).PELAGIC_JUV_SIZE_MEAN, 'mm', source, doi, pjSizeMeta);
      const pjDurMeta = metadataWithMinMaxConf(metadata, r(row), 'PELAGIC_JUV_DURATION_MIN', 'PELAGIC_JUV_DURATION_MAX', 'PELAGIC_JUV_DURATION_CONF', 'PELAGIC_JUV_DURATION_CONF_TYPE');
      addTrait(traits, 'pelagic_juvenile_duration', r(row).PELAGIC_JUV_DURATION_MEAN, 'days', source, doi, pjDurMeta);
      // If no numeric data, still store a qualitative row for export (KEY_WORD, REFERENCE, etc.)
      if (extractNumeric(r(row).PELAGIC_JUV_SIZE_MEAN) === null && extractNumeric(r(row).PELAGIC_JUV_DURATION_MEAN) === null) {
        traits.push({ traitType: 'pelagic_juvenile_size', value: null, unit: 'mm', source, doi, metadata });
      }
      // Pelagic juvenile behavior filter flag (from KEY_WORD column)
      const pjKeyword = String(r(row).KEY_WORD ?? '').trim();
      if (pjKeyword && pjKeyword !== 'NA') {
        traits.push({ traitType: 'pelagic_juvenile_behavior', value: 1, unit: '', source, doi, metadata });
      }
    }
    // Larval Growth Database (age-at-length scatter data)
    else if (filename.includes('larval_growth')) {
      addTrait(traits, 'larval_length', r(row).LENGTH, 'mm', source, doi, metadata);
      addTrait(traits, 'larval_age', r(row).AGE, 'days', source, doi, metadata);
      // Virtual trait for sidebar filter: species has age-at-length data
      traits.push({ traitType: 'larval_age_at_length', value: 1, unit: '', source, doi, metadata });
    }

    // Add traits to species
    if (traits.length > 0) {
      const existing = traitsBySpecies.get(speciesId) || [];
      existing.push(...traits);
      traitsBySpecies.set(speciesId, existing);
    }
  }

  return traitsBySpecies;
}

/**
 * Merge trait data from multiple sources.
 */
function mergeTraits(
  existing: Map<string, TraitData[]>,
  newTraits: Map<string, TraitData[]>
): void {
  for (const [speciesId, traits] of newTraits) {
    const existingTraits = existing.get(speciesId) || [];
    existingTraits.push(...traits);
    existing.set(speciesId, existingTraits);
  }
}

/**
 * Extract year from date string.
 * Handles formats: "2015", "2015-2016", "Jan 2015", "2015-06-15", etc.
 */
function extractYearFromDate(dateStr: string | null | undefined): number | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  
  // Try to find a 4-digit year (1900-2099)
  const match = dateStr.match(/\b(19|20)\d{2}\b/);
  if (match) {
    return parseInt(match[0], 10);
  }
  return null;
}

/**
 * Extract location data from parsed rows for GPS map display.
 * Only extracts rows with valid latitude and longitude values.
 * Includes year and full metadata for Phase 11 requirements.
 */
function extractLocationsFromRows(
  rows: TraitRow[],
  filename: string
): Map<string, LocationData[]> {
  const locationsBySpecies = new Map<string, LocationData[]>();
  const r = (row: TraitRow) => row as Record<string, unknown>;

  for (const row of rows) {
    const validName = row.VALID_NAME ?? row.Valid_name ?? row.validname ?? '';
    if (!validName) continue;

    // Skip excluded families (non-fish taxonomy errors)
    const rowFamily = (row as Record<string, unknown>).FAMILY as string ?? (row as Record<string, unknown>).Family as string ?? '';
    if (isExcludedFamily(rowFamily)) continue;

    // Extract numeric coordinates (handles both number and string types from PapaParse)
    const latitude = extractNumeric(row.LATITUDE);
    const longitude = extractNumeric(row.LONGITUDE);

    if (latitude === null || longitude === null) {
      continue;
    }

    // Extract year from sampling date columns
    const samplingDates = r(row).SAMPLING_DATES as string | null | undefined;
    const startDate = r(row).START_DATE as string | null | undefined;
    const endDate = r(row).END_DATE as string | null | undefined;
    const year = extractYearFromDate(samplingDates) ?? 
                 extractYearFromDate(startDate) ?? 
                 extractYearFromDate(endDate);

    // Extract measurement value based on database type
    let value: number | null = null;
    let unit: string | null = null;
    let traitType: string | null = null;

    if (filename.includes('settlement_age')) {
      value = extractNumeric(r(row).SET_AGE_DPH_MEAN);
      unit = 'days';
      traitType = 'settlement_age';
    } else if (filename.includes('settlement_size')) {
      value = extractNumeric(r(row).SET_SIZE_MEAN ?? r(row).SET_SIZE_MM_MEAN);
      unit = 'mm';
      traitType = 'settlement_size';
    }

    const speciesId = slugify(validName);
    const locationData: LocationData = {
      latitude,
      longitude,
      location: typeof row.LOCATION === 'string' ? row.LOCATION : null,
      country: typeof row.COUNTRY === 'string' ? row.COUNTRY : null,
      year,
      unit,
      externalRef: typeof r(row).EXT_REF === 'string' ? r(row).EXT_REF as string : null,
      reference: typeof row.REFERENCE === 'string' ? row.REFERENCE : null,
      link: typeof row.LINK === 'string' ? row.LINK : null,
      traitType,
      value,
    };

    const existing = locationsBySpecies.get(speciesId) || [];
    existing.push(locationData);
    locationsBySpecies.set(speciesId, existing);
  }

  return locationsBySpecies;
}

/**
 * Merge location data from multiple sources.
 */
function mergeLocations(
  existing: Map<string, LocationData[]>,
  newLocations: Map<string, LocationData[]>
): void {
  for (const [speciesId, locations] of newLocations) {
    const existingLocations = existing.get(speciesId) || [];
    existingLocations.push(...locations);
    existing.set(speciesId, existingLocations);
  }
}

/**
 * Get or load all data using cache-aside pattern.
 *
 * This is the main entry point for data access:
 * - Returns cached data immediately if available (cache HIT)
 * - Loads from local files or GitHub on cache MISS (based on DATA_SOURCE)
 *
 * @returns AllData with species, taxonomy, and traits
 */
export async function getOrLoadData(): Promise<AllData> {
  const cache = getCache();
  const dataCache = getDataCache();

  // Check persistent DataCache first (survives LRU eviction)
  const cached = cache.get(CACHE_KEY);
  if (cached) {
    console.log('[data-repository] Cache HIT - returning cached data');
    return cached;
  }

  // Cache MISS - load and parse
  console.log(`[data-repository] Cache MISS - loading from ${DATA_SOURCE}`);

  // 1. Load CSVs based on data source mode
  const csvMap = new Map<string, string>();
  let fetchedAt = new Date();

  if (DATA_SOURCE === 'local' || DATA_SOURCE === 'hybrid') {
    // Load local files first
    console.log('[data-repository] Loading local CSV files...');
    const localResult = await loadAllLocalCSVs();
    for (const [filename, content] of localResult.data) {
      csvMap.set(filename, content);
    }
    fetchedAt = localResult.loadedAt;
  }

  if (DATA_SOURCE === 'github' || DATA_SOURCE === 'hybrid') {
    // Fetch from GitHub (supplements local in hybrid mode)
    console.log('[data-repository] Fetching from GitHub...');
    const fetchResult = await fetchAllCSVs();
    for (const [filepath, content] of fetchResult.data) {
      if (!csvMap.has(filepath)) {
        csvMap.set(filepath, content);
      }
    }
    if (DATA_SOURCE === 'github') {
      fetchedAt = fetchResult.fetchedAt;
    }
  }

  // 2. Parse each CSV and aggregate data
  const species = new Map<string, Species>();
  const traitsBySpecies = new Map<string, TraitData[]>();
  const locationsBySpecies = new Map<string, LocationData[]>();
  const successfulFiles: string[] = [];
  const failedFiles: string[] = [];

  // Track parsed data and validation results for registry building
  const parsedDatabases = new Map<string, unknown[]>();
  const validationResults = new Map<string, SchemaValidationResult>();

  for (const [filepath, csvText] of csvMap) {
    try {
      console.log(`[data-repository] Parsing ${filepath}...`);

      // Parse CSV
      const parseResult = parseTraitCSV<SpeciesRow>(csvText, filepath);

      if (parseResult.errors.length > 0) {
        console.warn(
          `[data-repository] ${filepath} had ${parseResult.errors.length} parse errors`
        );
      }

      // Validate parsed data against schema
      const validationResult = validateParsedCSV(parseResult.data, filepath);
      validationResults.set(filepath, validationResult);

      // Log validation warnings for low pass rates
      if (validationResult.passRate < 90) {
        console.warn(
          `[data-repository] ${filepath} validation: ${validationResult.passRate.toFixed(1)}% pass rate (${validationResult.invalidRows}/${validationResult.totalRows} invalid)`
        );
      } else {
        console.log(
          `[data-repository] ${filepath} validation: ${validationResult.passRate.toFixed(1)}% pass rate`
        );
      }

      // Store parsed data for registry building
      parsedDatabases.set(filepath, parseResult.data);

      // Extract species (accumulates unique species)
      const fileSpecies = extractSpeciesFromRows(parseResult.data);
      for (const [id, sp] of fileSpecies) {
        if (!species.has(id)) {
          species.set(id, sp);
        }
      }

      // Extract traits (skip column descriptions file)
      if (!filepath.includes('columns_descriptions')) {
        const fileTraits = extractTraitsFromRows(
          parseResult.data as TraitRow[],
          filepath,
          species
        );
        mergeTraits(traitsBySpecies, fileTraits);

        // Extract location data for GPS map
        const fileLocations = extractLocationsFromRows(
          parseResult.data as TraitRow[],
          filepath
        );
        mergeLocations(locationsBySpecies, fileLocations);
      }

      successfulFiles.push(filepath);
    } catch (error) {
      console.error(`[data-repository] Failed to parse ${filepath}:`, error);
      failedFiles.push(filepath);
    }
  }

  console.log(
    `[data-repository] Parsed ${successfulFiles.length} files, ${failedFiles.length} failed`
  );

  // Build database registry from parsed data
  const databaseRegistry = buildDatabaseTraitRegistry(parsedDatabases, validationResults);
  console.log(
    `[data-repository] Registry: ${databaseRegistry.speciesDatabases.size} species across ${databaseRegistry.databaseSpecies.size} databases`
  );

  // 2b. Add image-only species (not in any CSV but have photos)
  try {
    const imageRegistry = await loadImageRegistry();
    for (const images of imageRegistry.imagesBySpecies.values()) {
      if (images.length === 0) continue;
      const img = images[0];
      const id = slugify(img.speciesName);
      if (!species.has(id)) {
        const nameParts = img.speciesName.split(' ');
        species.set(id, {
          id,
          validName: img.speciesName,
          commonName: null,
          order: img.order || 'Unknown',
          family: img.family || 'Unknown',
          genus: nameParts[0] || 'Unknown',
        });
      }
    }
    console.log(`[data-repository] After image merge: ${species.size} total species`);
  } catch (error) {
    console.warn('[data-repository] Could not load image registry for species merge:', error);
  }

  // 2c. Tag species that have growth model data with virtual 'growth_model' trait
  // (same pattern as larval_age_at_length — ensures sidebar filter works)
  try {
    const growthModelSpecies = await getSpeciesWithGrowthModels();
    let growthModelCount = 0;
    for (const speciesName of growthModelSpecies) {
      const id = slugify(speciesName);
      const existing = traitsBySpecies.get(id) || [];
      existing.push({
        traitType: 'growth_model',
        value: 1,
        unit: '',
        source: null,
        doi: null,
      });
      traitsBySpecies.set(id, existing);
      growthModelCount++;
    }
    console.log(`[data-repository] Tagged ${growthModelCount} species with growth_model trait`);
  } catch (error) {
    console.warn('[data-repository] Could not load growth models for trait tagging:', error);
  }

  // 3. Build taxonomy tree from species list
  const speciesArray = Array.from(species.values());
  const taxonomy = buildTaxonomyTree(speciesArray);

  console.log(
    `[data-repository] Built taxonomy tree with ${taxonomy.speciesCount} species`
  );

  // 4. Create AllData object
  const allData: AllData = {
    species,
    taxonomy,
    traitsBySpecies,
    locationsBySpecies,
    databaseRegistry,
    fetchedAt,
  };

  // 5. Store in both LRU cache and persistent DataCache
  cache.set(CACHE_KEY, allData);

  // Store raw CSVs in persistent cache for fast reload
  for (const [filepath, csvText] of csvMap) {
    dataCache.setRawCSV(filepath, csvText);
  }
  dataCache.setLoaded(true);

  console.log(
    `[data-repository] Cached ${species.size} species, ${traitsBySpecies.size} with traits, ${locationsBySpecies.size} with locations`
  );

  return allData;
}

/**
 * Clear cache and reload all data from GitHub.
 * Use for manual refresh when data needs to be updated.
 *
 * @returns Fresh AllData from GitHub
 */
export async function refreshData(): Promise<AllData> {
  console.log('[data-repository] Refreshing data (clearing cache)');

  const cache = getCache();
  cache.delete(CACHE_KEY);

  return getOrLoadData();
}

/**
 * Check if data is currently cached.
 *
 * @returns true if cached data exists
 */
export function hasData(): boolean {
  const cache = getCache();
  return cache.has(CACHE_KEY);
}

/**
 * Check if a species has data in a specific database.
 *
 * @param data - AllData from getOrLoadData
 * @param speciesId - Species ID (slug form)
 * @param databaseName - Database filename (e.g., 'settlement_age_database.csv')
 * @returns true if species has data in the database
 */
export function speciesHasTraitData(
  data: AllData,
  speciesId: string,
  databaseName: string
): boolean {
  // Convert speciesId back to VALID_NAME format
  const species = data.species.get(speciesId);
  if (!species) return false;

  return data.databaseRegistry.speciesDatabases
    .get(species.validName)
    ?.has(databaseName) ?? false;
}

/**
 * Get count of databases with data for a species.
 *
 * @param data - AllData from getOrLoadData
 * @param speciesId - Species ID (slug form)
 * @returns Number of databases with data for the species
 */
export function getSpeciesDatabaseCount(
  data: AllData,
  speciesId: string
): number {
  const species = data.species.get(speciesId);
  if (!species) return 0;

  return data.databaseRegistry.speciesDatabases
    .get(species.validName)?.size ?? 0;
}

/**
 * Warmup the cache by pre-loading all CSV data.
 * Call this on server startup to ensure first request is fast.
 *
 * @returns AllData (same as getOrLoadData)
 */
export async function warmupCache(): Promise<AllData> {
  const dataCache = getDataCache();

  if (dataCache.isLoaded()) {
    console.log('[data-repository] Cache already warmed up');
    return getOrLoadData();
  }

  console.log('[data-repository] Warming up cache...');
  const data = await getOrLoadData();
  console.log(`[data-repository] Cache warmup complete (${data.species.size} species)`);
  return data;
}
