/**
 * Service for rafting qualitative data with species → genus → family cascade.
 *
 * Extracts known/unknown status, FLOATSAM/STAGE values, and lists of species
 * with known rafting records in the same genus and family.
 */

import { getOrLoadData } from '@/lib/data/data-repository';
import type {
  RaftingData,
  RaftingStats,
  RaftingDotStripRecord,
  RaftingComparisonLevel,
  BarChartData,
  BarChartSpeciesEntry,
  RaftingQualitativeRecord,
  RaftingAgeRecord,
  FrequencyCount,
} from '@/components/species-detail/rafting-panel';

/**
 * Get rafting database rows from raw CSV cache.
 */
async function getRaftingRows(): Promise<Record<string, unknown>[]> {
  const { getDataCache } = await import('@/lib/data/csv-cache');
  const { parseTraitCSV } = await import('@/lib/data/csv-parser');

  const dataCache = getDataCache();
  const rawCSVs = dataCache.getAllRawCSVs();

  for (const [filepath, csvText] of rawCSVs) {
    if (filepath.includes('rafting_database')) {
      const result = parseTraitCSV<Record<string, unknown>>(csvText, filepath);
      return result.data;
    }
  }

  return [];
}

/** Check if a value is non-null, non-NA, and non-empty. */
function isValid(v: unknown): v is string | number {
  if (v === null || v === undefined) return false;
  const str = String(v).trim();
  return str !== '' && str !== 'NA' && str !== 'N/A';
}

/** Parse a numeric value, returning null if invalid. */
function parseNum(v: unknown): number | null {
  if (!isValid(v)) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

/**
 * Extract unique flotsam values from rows.
 * Splits compound values like "FAD | other object" into individual items.
 */
function extractFlotsamValues(rows: Record<string, unknown>[]): string[] {
  const values = new Set<string>();
  for (const row of rows) {
    const v = row['FLOATSAM'] as string | null;
    if (isValid(v)) {
      const parts = String(v).split('|').map(s => s.trim()).filter(s => s);
      parts.forEach(p => values.add(p));
    }
  }
  return Array.from(values).sort();
}

/**
 * Extract unique stage values from rows.
 * Splits compound values like "J | A" into individual items.
 */
function extractStageValues(rows: Record<string, unknown>[]): string[] {
  const values = new Set<string>();
  for (const row of rows) {
    const v = row['STAGE'] as string | null;
    if (isValid(v)) {
      const parts = String(v).split('|').map(s => s.trim()).filter(s => s);
      parts.forEach(p => values.add(p));
    }
  }
  return Array.from(values).sort();
}

/**
 * Compute frequency counts for a qualitative column.
 * Splits compound values and counts each individual value.
 */
function computeFrequencies(rows: Record<string, unknown>[], column: string): FrequencyCount[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const v = row[column] as string | null;
    if (isValid(v)) {
      const parts = String(v).split('|').map(s => s.trim()).filter(s => s);
      for (const part of parts) {
        counts.set(part, (counts.get(part) ?? 0) + 1);
      }
    }
  }

  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Extract unique species names from rows (excluding the target species).
 */
function extractSpeciesNames(
  rows: Record<string, unknown>[],
  excludeSpecies: string
): string[] {
  const names = new Set<string>();
  for (const row of rows) {
    const name = String(row['VALID_NAME'] ?? '').trim();
    if (name && name !== 'NA' && name !== excludeSpecies) {
      names.add(name);
    }
  }
  return Array.from(names).sort();
}

/**
 * Build qualitative records from rows.
 */
function buildQualitativeRecords(
  rows: Record<string, unknown>[]
): RaftingQualitativeRecord[] {
  const records: RaftingQualitativeRecord[] = [];

  for (const row of rows) {
    const species = String(row['VALID_NAME'] ?? '').trim();
    const flotsam = isValid(row['FLOATSAM']) ? String(row['FLOATSAM']).trim() : null;
    const stage = isValid(row['STAGE']) ? String(row['STAGE']).trim() : null;
    const extRef = isValid(row['EXT_REF']) ? String(row['EXT_REF']).trim() : null;
    const reference = String(row['REFERENCE'] ?? '').trim();
    const link = String(row['LINK'] ?? '').trim();

    records.push({
      species: species || 'Unknown',
      flotsam,
      stage,
      extRef,
      reference: reference || 'Unknown reference',
      link: link && link !== 'NA' ? link : null,
    });
  }

  return records;
}

/**
 * Build records (per reference) for size measurements.
 */
function buildSizeRecords(
  rows: Record<string, unknown>[]
): RaftingDotStripRecord[] {
  const records: RaftingDotStripRecord[] = [];

  for (const row of rows) {
    const mean = parseNum(row['RAFTING_SIZE_MEAN']);
    if (mean === null) continue;

    const min = parseNum(row['RAFTING_SIZE_MIN']);
    const max = parseNum(row['RAFTING_SIZE_MAX']);
    const reference = String(row['REFERENCE'] ?? '').trim();
    const link = String(row['LINK'] ?? '').trim();
    const species = String(row['VALID_NAME'] ?? '').trim();
    const extRef = isValid(row['EXT_REF']) ? String(row['EXT_REF']).trim() : null;
    const lengthType = isValid(row['LENGTH_TYPE']) ? String(row['LENGTH_TYPE']).trim() : null;
    const meanType = isValid(row['RAFTING_SIZE_MEAN_TYPE']) ? String(row['RAFTING_SIZE_MEAN_TYPE']).trim() : null;

    let errorLow: number | null = null;
    let errorHigh: number | null = null;

    if (min !== null && max !== null) {
      errorLow = min;
      errorHigh = max;
    }

    records.push({
      mean,
      errorLow,
      errorHigh,
      reference: reference || 'Unknown reference',
      link: link && link !== 'NA' ? link : null,
      species,
      extRef,
      lengthType,
      rawMin: min,
      rawMax: max,
      meanType,
      conf: null,
      confType: null,
    });
  }

  return records;
}

/**
 * Build qualitative records for age (RAFTING_AGE contains text values).
 */
function buildAgeQualitativeRecords(
  rows: Record<string, unknown>[]
): RaftingAgeRecord[] {
  const records: RaftingAgeRecord[] = [];

  for (const row of rows) {
    const ageVal = row['RAFTING_AGE'];
    if (!isValid(ageVal)) continue;

    const age = String(ageVal).trim();
    const reference = String(row['REFERENCE'] ?? '').trim();
    const link = String(row['LINK'] ?? '').trim();
    const species = String(row['VALID_NAME'] ?? '').trim();
    const extRef = isValid(row['EXT_REF']) ? String(row['EXT_REF']).trim() : null;

    records.push({
      species: species || 'Unknown',
      age,
      extRef,
      reference: reference || 'Unknown reference',
      link: link && link !== 'NA' ? link : null,
    });
  }

  return records;
}

/**
 * Compute per-species means for bar chart display.
 */
function computeBarChartData(
  rows: Record<string, unknown>[],
  meanCol: string,
  taxonomyName: string,
  comparisonType: 'family' | 'genus' | 'order'
): BarChartData | null {
  const speciesMeans = new Map<string, { name: string; values: number[] }>();

  for (const row of rows) {
    const mean = parseNum(row[meanCol]);
    if (mean === null) continue;
    const name = String(row['VALID_NAME'] ?? '').trim();
    if (!name || name === 'NA') continue;

    const existing = speciesMeans.get(name);
    if (existing) {
      existing.values.push(mean);
    } else {
      speciesMeans.set(name, { name, values: [mean] });
    }
  }

  if (speciesMeans.size < 1) return null;

  const entries: BarChartSpeciesEntry[] = [];
  for (const [, { name, values }] of speciesMeans) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    entries.push({
      speciesId: name.toLowerCase().replace(/\s+/g, '-'),
      speciesName: name,
      meanValue: avg,
    });
  }

  // Aggregation cascade for order-level: >15 species → per-genus, >15 genera → per-family
  if (comparisonType === 'order' && entries.length > 15) {
    // Group by genus (first word of species name)
    const genusMeans = new Map<string, number[]>();
    for (const entry of entries) {
      const genus = entry.speciesName.split(' ')[0];
      const existing = genusMeans.get(genus) ?? [];
      existing.push(entry.meanValue);
      genusMeans.set(genus, existing);
    }

    if (genusMeans.size <= 15) {
      const genusEntries: BarChartSpeciesEntry[] = [];
      for (const [genusName, values] of genusMeans) {
        genusEntries.push({
          speciesId: `genus:${genusName}`,
          speciesName: genusName,
          meanValue: values.reduce((a, b) => a + b, 0) / values.length,
        });
      }
      return { entries: genusEntries, comparisonType, taxonomyName };
    }

    // >15 genera: aggregate by family from original rows
    const familyMeans = new Map<string, number[]>();
    for (const row of rows) {
      const mean = parseNum(row[meanCol]);
      if (mean === null) continue;
      const family = String(row['FAMILY'] ?? '').trim();
      if (!family || family === 'NA') continue;
      const existing = familyMeans.get(family) ?? [];
      existing.push(mean);
      familyMeans.set(family, existing);
    }
    const familyEntries: BarChartSpeciesEntry[] = [];
    for (const [familyName, values] of familyMeans) {
      familyEntries.push({
        speciesId: `family:${familyName}`,
        speciesName: familyName,
        meanValue: values.reduce((a, b) => a + b, 0) / values.length,
      });
    }
    return { entries: familyEntries, comparisonType, taxonomyName };
  }

  return { entries, comparisonType, taxonomyName };
}

/**
 * Compute summary statistics from dot-strip records.
 */
function computeRecordStats(records: RaftingDotStripRecord[]): RaftingStats {
  if (records.length === 0) {
    return { mean: null, sd: null, min: null, max: null, n: 0 };
  }

  const means = records.map(r => r.mean);
  const n = means.length;
  const mean = means.reduce((a, b) => a + b, 0) / n;
  const sd = n >= 2
    ? Math.sqrt(means.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1))
    : null;

  const allLows = records.map(r => r.errorLow ?? r.mean);
  const allHighs = records.map(r => r.errorHigh ?? r.mean);
  const min = Math.min(...allLows, ...means);
  const max = Math.max(...allHighs, ...means);

  return { mean, sd, min, max, n };
}

/**
 * Compute comparison stats at each taxonomic level.
 */
function computeComparisonStats(
  speciesRows: Record<string, unknown>[],
  genusRows: Record<string, unknown>[],
  familyRows: Record<string, unknown>[],
  meanCol: string,
  orderRows?: Record<string, unknown>[]
): { species: RaftingComparisonLevel | null; genus: RaftingComparisonLevel | null; family: RaftingComparisonLevel | null; order: RaftingComparisonLevel | null } {
  const computeLevel = (rows: Record<string, unknown>[]): RaftingComparisonLevel | null => {
    const values: number[] = [];
    const speciesSet = new Set<string>();
    for (const row of rows) {
      const v = parseNum(row[meanCol]);
      if (v !== null) {
        values.push(v);
        const name = String(row['VALID_NAME'] ?? '').trim();
        if (name && name !== 'NA') speciesSet.add(name);
      }
    }
    if (values.length === 0) return null;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return { mean, n: values.length, speciesCount: speciesSet.size };
  };

  return {
    species: computeLevel(speciesRows),
    genus: computeLevel(genusRows),
    family: computeLevel(familyRows),
    order: orderRows ? computeLevel(orderRows) : null,
  };
}

/**
 * Get rafting data for a species with genus → family cascade.
 */
export async function getRaftingData(
  speciesId: string
): Promise<RaftingData | null> {
  const allData = await getOrLoadData();
  const species = allData.species.get(speciesId);
  if (!species) return null;

  const emptyStats: RaftingStats = { mean: null, sd: null, min: null, max: null, n: 0 };

  const rows = await getRaftingRows();
  if (rows.length === 0) {
    return {
      level: 'species',
      levelName: species.validName,
      status: 'Unknown',
      flotsamValues: [],
      stageValues: [],
      genusSpecies: [],
      familySpecies: [],
      qualitativeRecords: [],
      sizeRecords: [],
      ageRecords: [],
      sizeStats: emptyStats,
      ageStats: emptyStats,
      comparisonStats: null,
    };
  }

  // Filter rows at each taxonomic level
  const speciesRows = rows.filter(
    (r) => String(r['VALID_NAME'] ?? '').trim() === species.validName
  );
  const genusRows = rows.filter(
    (r) => String(r['GENUS'] ?? '').trim() === species.genus
  );
  const familyRows = rows.filter(
    (r) => String(r['FAMILY'] ?? '').trim() === species.family
  );
  const orderRows = rows.filter(
    (r) => String(r['ORDER'] ?? '').trim() === species.order
  );

  // Determine status
  const isKnown = speciesRows.length > 0;

  // Extract qualitative values from species rows ONLY (no genus fallback for qualitative display)
  const flotsamValues = extractFlotsamValues(speciesRows);
  const stageValues = extractStageValues(speciesRows);

  // Compute frequencies for barplots — species-only to avoid showing other species' data
  const flotsamFrequencies = computeFrequencies(speciesRows, 'FLOATSAM');
  const stageFrequencies = computeFrequencies(speciesRows, 'STAGE');

  // Extract related species in genus (excluding target species)
  const genusSpecies = extractSpeciesNames(genusRows, species.validName);

  // Extract related species in family (excluding same genus)
  const familySpeciesRows = familyRows.filter(
    (r) => String(r['GENUS'] ?? '').trim() !== species.genus
  );
  const familySpecies = extractSpeciesNames(familySpeciesRows, species.validName);

  // Build qualitative records — species-only for record counts (not genus fallback)
  const qualitativeRecords = buildQualitativeRecords(speciesRows);

  // Build records for size — species-only for record counts
  const sizeRecords = buildSizeRecords(speciesRows);

  // Build qualitative records for age — species-only for record counts
  const ageQualitativeRecords = buildAgeQualitativeRecords(speciesRows);

  // Compute age frequencies for barplots — species-only
  const ageFrequencies = computeFrequencies(speciesRows, 'RAFTING_AGE');

  // Compute bar chart data (family-level, fall back to genus if >10 species)
  let sizeBarChart = computeBarChartData(familyRows, 'RAFTING_SIZE_MEAN', species.family, 'family');
  if (sizeBarChart && sizeBarChart.entries.length > 10) {
    const genusChart = computeBarChartData(genusRows, 'RAFTING_SIZE_MEAN', species.genus, 'genus');
    if (genusChart) sizeBarChart = genusChart;
  }

  // Compute order bar chart
  const sizeOrderBarChart = computeBarChartData(orderRows, 'RAFTING_SIZE_MEAN', species.order, 'order');

  // Compute comparison stats
  const sizeComparisons = computeComparisonStats(
    speciesRows, genusRows, familyRows, 'RAFTING_SIZE_MEAN', orderRows
  );

  // Determine cascade level
  const level = speciesRows.length > 0 ? 'species' : genusRows.length > 0 ? 'genus' : 'family';
  const levelName = level === 'species' ? species.validName : level === 'genus' ? species.genus : species.family;

  return {
    level: level as 'species' | 'genus' | 'family',
    levelName,
    status: isKnown ? 'Known' : 'Unknown',
    flotsamValues,
    stageValues,
    genusSpecies,
    familySpecies,
    qualitativeRecords,
    sizeRecords,
    ageRecords: [],
    sizeStats: computeRecordStats(sizeRecords),
    ageStats: { mean: null, sd: null, min: null, max: null, n: 0 },
    comparisonStats: {
      size: sizeComparisons,
      age: { species: null, genus: null, family: null, order: null },
    },
    currentSpeciesId: speciesId,
    sizeBarChart,
    ageBarChart: null,
    sizeOrderBarChart,
    flotsamFrequencies,
    stageFrequencies,
    ageFrequencies,
    ageQualitativeRecords,
  };
}
