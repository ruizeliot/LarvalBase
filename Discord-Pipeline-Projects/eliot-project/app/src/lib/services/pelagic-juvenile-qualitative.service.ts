/**
 * Service for pelagic juvenile qualitative data with species → genus → family cascade.
 *
 * Extracts known/unknown status, KEY_WORD values, and lists of species
 * with known pelagic juveniles in the same genus and family.
 */

import { getOrLoadData } from '@/lib/data/data-repository';
import type { PelagicJuvenileData, PelagicJuvenileStats, DotStripRecord, ComparisonLevel, BarChartData, BarChartSpeciesEntry, QualitativeRecord } from '@/components/species-detail/pelagic-juvenile-panel';

/**
 * Get pelagic juvenile database rows from raw CSV cache.
 */
async function getPelagicJuvenileRows(): Promise<Record<string, unknown>[]> {
  const { getDataCache } = await import('@/lib/data/csv-cache');
  const { parseTraitCSV } = await import('@/lib/data/csv-parser');

  const dataCache = getDataCache();
  const rawCSVs = dataCache.getAllRawCSVs();

  for (const [filepath, csvText] of rawCSVs) {
    if (filepath.includes('pelagic_juvenile_database')) {
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
 * Extract unique keyword values from rows.
 */
function extractKeywords(rows: Record<string, unknown>[]): string[] {
  const keywords = new Set<string>();
  for (const row of rows) {
    const kw = row['KEY_WORD'] as string | null;
    if (isValid(kw)) {
      const val = String(kw).trim();
      // Skip generic "Pelagic juvenile" keyword
      if (val.toLowerCase() !== 'pelagic juvenile') {
        keywords.add(val);
      }
    }
  }
  return Array.from(keywords).sort();
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
    if (name && name !== excludeSpecies) {
      names.add(name);
    }
  }
  return Array.from(names).sort();
}

/**
 * Build qualitative records from all rows (no mean filter).
 */
function buildQualitativeRecords(
  rows: Record<string, unknown>[]
): QualitativeRecord[] {
  const records: QualitativeRecord[] = [];

  for (const row of rows) {
    const species = String(row['VALID_NAME'] ?? '').trim();
    const keyword = isValid(row['KEY_WORD']) ? String(row['KEY_WORD']).trim() : null;
    const remarks = isValid(row['REMARKS']) ? String(row['REMARKS']).trim() : null;
    const extRef = isValid(row['EXT_REF']) ? String(row['EXT_REF']).trim() : null;
    const reference = String(row['REFERENCE'] ?? '').trim();
    const link = String(row['LINK'] ?? '').trim();

    records.push({
      species,
      keyword,
      remarks,
      extRef,
      reference: reference || 'Unknown reference',
      link: link || null,
    });
  }

  return records;
}

/**
 * Build records (per reference) for size or duration measurements.
 */
function buildDotStripRecords(
  rows: Record<string, unknown>[],
  meanCol: string,
  minCol: string,
  maxCol: string,
  confCol: string,
  confTypeCol: string,
  meanTypeCol: string
): DotStripRecord[] {
  const records: DotStripRecord[] = [];

  for (const row of rows) {
    const mean = parseNum(row[meanCol]);
    if (mean === null) continue;

    const min = parseNum(row[minCol]);
    const max = parseNum(row[maxCol]);
    const conf = parseNum(row[confCol]);
    const reference = String(row['REFERENCE'] ?? '').trim();
    const link = String(row['LINK'] ?? '').trim();
    const species = String(row['VALID_NAME'] ?? '').trim();
    const n = parseNum(row['N']);
    const keyword = isValid(row['KEY_WORD']) ? String(row['KEY_WORD']).trim() : null;
    const remarks = isValid(row['REMARKS']) ? String(row['REMARKS']).trim() : null;
    const extRef = isValid(row['EXT_REF']) ? String(row['EXT_REF']).trim() : null;
    const lengthType = isValid(row['LENGTH_TYPE']) ? String(row['LENGTH_TYPE']).trim() : null;
    const confType = isValid(row[confTypeCol]) ? String(row[confTypeCol]).trim() : null;
    const meanType = isValid(row[meanTypeCol]) ? String(row[meanTypeCol]).trim() : null;

    // Compute error bar bounds:
    // If CONF exists, use mean ± conf as error range
    // Else if min/max exist, use those
    let errorLow: number | null = null;
    let errorHigh: number | null = null;

    if (conf !== null) {
      errorLow = mean - conf;
      errorHigh = mean + conf;
    } else if (min !== null && max !== null) {
      errorLow = min;
      errorHigh = max;
    }

    records.push({
      mean,
      errorLow,
      errorHigh,
      reference: reference || 'Unknown reference',
      link: link || null,
      species,
      n: n !== null ? n : undefined,
      keyword,
      remarks,
      extRef,
      lengthType,
      conf,
      confType,
      rawMin: min,
      rawMax: max,
      meanType,
    });
  }

  return records;
}

/**
 * Compute per-species means from CSV rows for bar chart display.
 * Groups rows by VALID_NAME, computes mean of the specified column,
 * and returns entries sorted for the FamilyBarChart component.
 */
function computeBarChartData(
  rows: Record<string, unknown>[],
  meanCol: string,
  taxonomyName: string,
  comparisonType: 'family' | 'genus' | 'order'
): BarChartData | null {
  // Group by species
  const speciesMeans = new Map<string, { name: string; values: number[] }>();

  for (const row of rows) {
    const mean = parseNum(row[meanCol]);
    if (mean === null) continue;
    const name = String(row['VALID_NAME'] ?? '').trim();
    if (!name) continue;

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
 * Compute summary statistics (mean, SD, min, max, n) from dot-strip records.
 */
function computeRecordStats(records: DotStripRecord[]): PelagicJuvenileStats {
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
 * Compute comparison stats (mean across all records at each taxonomic level).
 * Includes speciesCount for n_sp display.
 */
function computeComparisonStats(
  speciesRows: Record<string, unknown>[],
  genusRows: Record<string, unknown>[],
  familyRows: Record<string, unknown>[],
  meanCol: string,
  orderRows?: Record<string, unknown>[]
): { species: ComparisonLevel | null; genus: ComparisonLevel | null; family: ComparisonLevel | null; order: ComparisonLevel | null } {
  const computeLevel = (rows: Record<string, unknown>[]): ComparisonLevel | null => {
    const values: number[] = [];
    const speciesSet = new Set<string>();
    for (const row of rows) {
      const v = parseNum(row[meanCol]);
      if (v !== null) {
        values.push(v);
        const name = String(row['VALID_NAME'] ?? '').trim();
        if (name) speciesSet.add(name);
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
 * Get pelagic juvenile data for a species with genus → family cascade.
 *
 * @param speciesId - Species ID (slug form, e.g. "chromis-viridis")
 * @returns PelagicJuvenileData or null if species not found
 */
export async function getPelagicJuvenileData(
  speciesId: string
): Promise<PelagicJuvenileData | null> {
  const allData = await getOrLoadData();
  const species = allData.species.get(speciesId);
  if (!species) return null;

  const emptyStats: PelagicJuvenileStats = { mean: null, sd: null, min: null, max: null, n: 0 };

  const rows = await getPelagicJuvenileRows();
  if (rows.length === 0) {
    return {
      level: 'species',
      levelName: species.validName,
      status: 'Unknown',
      keywords: [],
      genusSpecies: [],
      familySpecies: [],
      qualitativeRecords: [],
      sizeRecords: [],
      durationRecords: [],
      sizeStats: emptyStats,
      durationStats: emptyStats,
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

  // Extract keywords from species rows (or genus if none at species level)
  const keywords = extractKeywords(isKnown ? speciesRows : genusRows);

  // Extract related species in genus (excluding target species)
  const genusSpecies = extractSpeciesNames(genusRows, species.validName);

  // Extract related species in family (excluding same genus)
  const familySpeciesRows = familyRows.filter(
    (r) => String(r['GENUS'] ?? '').trim() !== species.genus
  );
  const familySpecies = extractSpeciesNames(familySpeciesRows, species.validName);

  // Build qualitative records from all species/genus rows
  const qualitativeRows = speciesRows.length > 0 ? speciesRows : genusRows;
  const qualitativeRecords = buildQualitativeRecords(qualitativeRows);

  // Build records for size
  const sizeRecords = buildDotStripRecords(
    speciesRows.length > 0 ? speciesRows : genusRows,
    'PELAGIC_JUV_SIZE_MEAN',
    'PELAGIC_JUV_SIZE_MIN',
    'PELAGIC_JUV_SIZE_MAX',
    'PELAGIC_JUV_SIZE_CONF',
    'PELAGIC_JUV_SIZE_CONF_TYPE',
    'PELAGIC_JUV_SIZE_MEAN_TYPE'
  );

  // Build records for duration
  const durationRecords = buildDotStripRecords(
    speciesRows.length > 0 ? speciesRows : genusRows,
    'PELAGIC_JUV_DURATION_MEAN',
    'PELAGIC_JUV_DURATION_MIN',
    'PELAGIC_JUV_DURATION_MAX',
    'PELAGIC_JUV_DURATION_CONF',
    'PELAGIC_JUV_DURATION_CONF_TYPE',
    'PELAGIC_JUV_DURATION_MEAN_TYPE'
  );

  // Compute bar chart data (family-level, fall back to genus if >10 species)
  let sizeBarChart = computeBarChartData(familyRows, 'PELAGIC_JUV_SIZE_MEAN', species.family, 'family');
  if (sizeBarChart && sizeBarChart.entries.length > 10) {
    const genusChart = computeBarChartData(genusRows, 'PELAGIC_JUV_SIZE_MEAN', species.genus, 'genus');
    if (genusChart) sizeBarChart = genusChart;
  }

  let durationBarChart = computeBarChartData(familyRows, 'PELAGIC_JUV_DURATION_MEAN', species.family, 'family');
  if (durationBarChart && durationBarChart.entries.length > 10) {
    const genusChart = computeBarChartData(genusRows, 'PELAGIC_JUV_DURATION_MEAN', species.genus, 'genus');
    if (genusChart) durationBarChart = genusChart;
  }

  // Compute order bar charts
  const sizeOrderBarChart = computeBarChartData(orderRows, 'PELAGIC_JUV_SIZE_MEAN', species.order, 'order');
  const durationOrderBarChart = computeBarChartData(orderRows, 'PELAGIC_JUV_DURATION_MEAN', species.order, 'order');

  // Compute comparison stats for size (including order)
  const sizeComparisons = computeComparisonStats(
    speciesRows, genusRows, familyRows, 'PELAGIC_JUV_SIZE_MEAN', orderRows
  );
  const durationComparisons = computeComparisonStats(
    speciesRows, genusRows, familyRows, 'PELAGIC_JUV_DURATION_MEAN', orderRows
  );

  // Determine cascade level
  const level = speciesRows.length > 0 ? 'species' : genusRows.length > 0 ? 'genus' : 'family';
  const levelName = level === 'species' ? species.validName : level === 'genus' ? species.genus : species.family;

  return {
    level: level as 'species' | 'genus' | 'family',
    levelName,
    status: isKnown ? 'Known' : 'Unknown',
    keywords,
    genusSpecies,
    familySpecies,
    qualitativeRecords,
    sizeRecords,
    durationRecords,
    sizeStats: computeRecordStats(sizeRecords),
    durationStats: computeRecordStats(durationRecords),
    comparisonStats: {
      size: sizeComparisons,
      duration: durationComparisons,
    },
    currentSpeciesId: speciesId,
    sizeBarChart,
    durationBarChart,
    sizeOrderBarChart,
    durationOrderBarChart,
  };
}
