/**
 * Service for qualitative egg trait data with species → genus → family cascade.
 *
 * Extracts EGG_LOCATION, EGG_DETAILS, EGG_SHAPE, NB_OIL_GLOBULE from egg_database.csv
 * and computes value frequencies at the appropriate taxonomic level.
 */

import { getOrLoadData } from '@/lib/data/data-repository';
import type {
  FrequencyEntry,
  EggQualitativeData,
  QualitativeTraitData,
  QualitativeReference,
} from '@/components/species-detail/egg-qualitative-panel';

/** Qualitative columns to extract from egg database rows. */
const QUALITATIVE_COLUMNS = ['EGG_LOCATION', 'EGG_DETAILS', 'EGG_SHAPE', 'NB_OIL_GLOBULE'] as const;

type QualitativeTraitKey = typeof QUALITATIVE_COLUMNS[number];

/**
 * Compute value frequencies from an array of string values.
 * Filters out null/NA/empty values.
 */
function computeFrequencies(values: (string | number | null | undefined)[]): FrequencyEntry[] {
  const counts = new Map<string, number>();

  for (const v of values) {
    if (v === null || v === undefined) continue;
    const str = String(v).trim();
    if (!str || str === 'NA' || str === 'N/A') continue;
    counts.set(str, (counts.get(str) || 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Extract qualitative egg data rows from the raw CSV cache.
 */
async function getEggDatabaseRows(): Promise<Record<string, unknown>[]> {
  const { getDataCache } = await import('@/lib/data/csv-cache');
  const { parseTraitCSV } = await import('@/lib/data/csv-parser');

  const dataCache = getDataCache();
  const rawCSVs = dataCache.getAllRawCSVs();

  // Find egg database
  for (const [filepath, csvText] of rawCSVs) {
    if (filepath.includes('egg_database')) {
      const result = parseTraitCSV<Record<string, unknown>>(csvText, filepath);
      return result.data;
    }
  }

  return [];
}

/**
 * Extract unique references from rows for a given qualitative column.
 */
function extractReferences(
  rows: Record<string, unknown>[],
  column: string
): QualitativeReference[] {
  const refMap = new Map<string, QualitativeReference>();

  for (const row of rows) {
    const val = row[column] as string | null;
    if (!val || !String(val).trim() || val === 'NA' || val === 'N/A') continue;

    // Try to find reference column (varies across databases)
    const source = String(
      row['REFERENCE'] ?? row['Reference'] ?? row['SOURCE'] ?? row['Source'] ?? ''
    ).trim();
    const doi = String(row['DOI'] ?? row['Doi'] ?? '').trim() || null;
    const species = String(row['VALID_NAME'] ?? row['Valid_name'] ?? '').trim() || undefined;

    if (source) {
      const key = source + (doi || '');
      if (!refMap.has(key)) {
        refMap.set(key, { source, doi: doi || null, species });
      }
    }
  }

  return Array.from(refMap.values()).sort((a, b) => a.source.localeCompare(b.source));
}

/**
 * Build frequency data and references for qualitative traits from matching rows.
 */
function buildTraitFrequenciesWithDetails(
  rows: Record<string, unknown>[]
): {
  traits: EggQualitativeData['traits'];
  traitDetails: NonNullable<EggQualitativeData['traitDetails']>;
} {
  const traits: EggQualitativeData['traits'] = {
    EGG_LOCATION: [],
    EGG_DETAILS: [],
    EGG_SHAPE: [],
    NB_OIL_GLOBULE: [],
  };

  const traitDetails: NonNullable<EggQualitativeData['traitDetails']> = {};

  for (const col of QUALITATIVE_COLUMNS) {
    const values = rows.map((r) => r[col] as string | null);
    const frequencies = computeFrequencies(values);
    traits[col] = frequencies;

    // Count non-null/NA records for this trait
    const validRows = rows.filter((r) => {
      const v = r[col] as string | null;
      return v !== null && v !== undefined && String(v).trim() !== '' && v !== 'NA' && v !== 'N/A';
    });

    const references = extractReferences(rows, col);

    traitDetails[col] = {
      frequencies,
      totalRecords: validRows.length,
      references,
    };
  }

  return { traits, traitDetails };
}

/**
 * Check if traits object has any non-empty frequency data.
 */
function hasAnyData(traits: EggQualitativeData['traits']): boolean {
  return QUALITATIVE_COLUMNS.some((col) => traits[col].length > 0);
}

/**
 * Get qualitative egg data for a species with genus → family fallback cascade.
 *
 * @param speciesId - Species ID (slug form)
 * @returns EggQualitativeData with cascade level info, or null if no data at any level
 */
export async function getEggQualitativeData(
  speciesId: string
): Promise<EggQualitativeData | null> {
  const allData = await getOrLoadData();
  const species = allData.species.get(speciesId);
  if (!species) return null;

  const rows = await getEggDatabaseRows();
  if (rows.length === 0) return null;

  // Try species level
  const speciesRows = rows.filter(
    (r) => {
      const name = (r.VALID_NAME ?? r.Valid_name ?? '') as string;
      return name === species.validName;
    }
  );

  const speciesResult = buildTraitFrequenciesWithDetails(speciesRows);
  if (hasAnyData(speciesResult.traits)) {
    return {
      level: 'species',
      levelName: species.validName,
      traits: speciesResult.traits,
      traitDetails: speciesResult.traitDetails,
    };
  }

  // Try genus level
  const genusRows = rows.filter(
    (r) => {
      const genus = (r.GENUS ?? r.Genus ?? '') as string;
      return genus === species.genus;
    }
  );

  const genusResult = buildTraitFrequenciesWithDetails(genusRows);
  if (hasAnyData(genusResult.traits)) {
    return {
      level: 'genus',
      levelName: species.genus,
      traits: genusResult.traits,
      traitDetails: genusResult.traitDetails,
    };
  }

  // Try family level
  const familyRows = rows.filter(
    (r) => {
      const family = (r.FAMILY ?? r.Family ?? '') as string;
      return family === species.family;
    }
  );

  const familyResult = buildTraitFrequenciesWithDetails(familyRows);
  if (hasAnyData(familyResult.traits)) {
    return {
      level: 'family',
      levelName: species.family,
      traits: familyResult.traits,
      traitDetails: familyResult.traitDetails,
    };
  }

  return null;
}
