/**
 * Axis capping service for growth charts.
 * Computes biologically relevant X (age) and Y (size) maximums
 * from metamorphosis and settlement databases.
 */

import { promises as fs } from 'fs';
import path from 'path';

/**
 * A row of axis cap data aggregated from met/set databases.
 */
export interface AxisCapRow {
  speciesName: string;
  genus: string;
  family: string;
  source: string;
  metAgeMean: number | null;
  metAgeMax: number | null;
  setAgeMean: number | null;
  setAgeMax: number | null;
  metSizeMean: number | null;
  metSizeMax: number | null;
  setSizeMean: number | null;
  setSizeMax: number | null;
}

/**
 * Computed axis caps result.
 */
export interface AxisCaps {
  xMax: number | null;
  yMax: number | null;
  level: 'species' | 'genus' | 'family' | null;
}

function parseNum(value: unknown): number | null {
  if (value === null || value === undefined || value === 'NA' || value === '') return null;
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  return isNaN(num) ? null : num;
}

/**
 * Compute max from a set of nullable numbers.
 */
function maxOfValues(...values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v !== null);
  return nums.length > 0 ? Math.max(...nums) : null;
}

/**
 * Compute axis caps for a species, with genus/family fallback.
 * Pure function — accepts pre-loaded rows for testability.
 */
export function computeAxisCaps(
  speciesName: string,
  rows: AxisCapRow[],
  genus?: string,
  family?: string
): AxisCaps {
  // Try species level
  const speciesRows = rows.filter(r => r.speciesName === speciesName);
  const speciesCaps = computeCapsFromRows(speciesRows);
  if (speciesCaps.xMax !== null || speciesCaps.yMax !== null) {
    return { ...speciesCaps, level: 'species' };
  }

  // Try genus level
  if (genus) {
    const genusRows = rows.filter(r => r.genus === genus);
    const genusCaps = computeCapsFromRows(genusRows);
    if (genusCaps.xMax !== null || genusCaps.yMax !== null) {
      return { ...genusCaps, level: 'genus' };
    }
  }

  // Try family level
  if (family) {
    const familyRows = rows.filter(r => r.family === family);
    const familyCaps = computeCapsFromRows(familyRows);
    if (familyCaps.xMax !== null || familyCaps.yMax !== null) {
      return { ...familyCaps, level: 'family' };
    }
  }

  return { xMax: null, yMax: null, level: null };
}

/**
 * Compute max age and size from a set of rows.
 */
function computeCapsFromRows(rows: AxisCapRow[]): Omit<AxisCaps, 'level'> {
  const allAgeValues: (number | null)[] = [];
  const allSizeValues: (number | null)[] = [];

  for (const row of rows) {
    allAgeValues.push(row.metAgeMean, row.metAgeMax, row.setAgeMean, row.setAgeMax);
    allSizeValues.push(row.metSizeMean, row.metSizeMax, row.setSizeMean, row.setSizeMax);
  }

  return {
    xMax: maxOfValues(...allAgeValues),
    yMax: maxOfValues(...allSizeValues),
  };
}

// Cache for loaded axis cap data
let axisCapRowsCache: AxisCapRow[] | null = null;

/**
 * Load axis cap data from metamorphosis and settlement databases.
 */
export async function loadAxisCapData(): Promise<AxisCapRow[]> {
  if (axisCapRowsCache) return axisCapRowsCache;

  const dbDir = path.join(process.cwd(), 'database');
  const rows: AxisCapRow[] = [];

  // Load metamorphosis age database
  try {
    const content = await fs.readFile(
      path.join(dbDir, 'Metamorphosis age database final 01.2026.txt'),
      'utf-8'
    );
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length >= 2) {
      const headers = lines[0].split('@').map(h => h.replace(/^"|"$/g, '').trim());
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split('@').map(v => v.replace(/^"|"$/g, '').trim());
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

        rows.push({
          speciesName: row['VALID_NAME'] || '',
          genus: row['GENUS'] || '',
          family: row['FAMILY'] || '',
          source: 'met_age',
          metAgeMean: parseNum(row['MET_AGE_DPH_MEAN']),
          metAgeMax: parseNum(row['MET_AGE_DPH_MAX']),
          setAgeMean: null,
          setAgeMax: null,
          metSizeMean: null,
          metSizeMax: null,
          setSizeMean: null,
          setSizeMax: null,
        });
      }
    }
  } catch { /* file may not exist */ }

  // Load settlement age database
  try {
    const content = await fs.readFile(
      path.join(dbDir, 'Settlement_age_database_final_01.2026.txt'),
      'utf-8'
    );
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length >= 2) {
      const headers = lines[0].split('@').map(h => h.replace(/^"|"$/g, '').trim());
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split('@').map(v => v.replace(/^"|"$/g, '').trim());
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

        rows.push({
          speciesName: row['VALID_NAME'] || '',
          genus: row['GENUS'] || '',
          family: row['FAMILY'] || '',
          source: 'set_age',
          metAgeMean: null,
          metAgeMax: null,
          setAgeMean: parseNum(row['SET_AGE_DPH_MEAN']),
          setAgeMax: parseNum(row['SET_AGE_DPH_MAX']),
          metSizeMean: null,
          metSizeMax: null,
          setSizeMean: null,
          setSizeMax: null,
        });
      }
    }
  } catch { /* file may not exist */ }

  // Load metamorphosis size database
  try {
    const content = await fs.readFile(
      path.join(dbDir, 'Metamorphosis size database final 06.2025.txt'),
      'utf-8'
    );
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length >= 2) {
      const headers = lines[0].split('@').map(h => h.replace(/^"|"$/g, '').trim());
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split('@').map(v => v.replace(/^"|"$/g, '').trim());
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

        rows.push({
          speciesName: row['VALID_NAME'] || '',
          genus: row['GENUS'] || '',
          family: row['FAMILY'] || '',
          source: 'met_size',
          metAgeMean: null,
          metAgeMax: null,
          setAgeMean: null,
          setAgeMax: null,
          metSizeMean: parseNum(row['MET_SIZE_MEAN']),
          metSizeMax: parseNum(row['MET_SIZE_MAX']),
          setSizeMean: null,
          setSizeMax: null,
        });
      }
    }
  } catch { /* file may not exist */ }

  // Load settlement size database
  try {
    const content = await fs.readFile(
      path.join(dbDir, 'Settlement_size_database_final_01.2026.txt'),
      'utf-8'
    );
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length >= 2) {
      const headers = lines[0].split('@').map(h => h.replace(/^"|"$/g, '').trim());
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split('@').map(v => v.replace(/^"|"$/g, '').trim());
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

        rows.push({
          speciesName: row['VALID_NAME'] || '',
          genus: row['GENUS'] || '',
          family: row['FAMILY'] || '',
          source: 'set_size',
          metAgeMean: null,
          metAgeMax: null,
          setAgeMean: null,
          setAgeMax: null,
          metSizeMean: null,
          metSizeMax: null,
          setSizeMean: parseNum(row['SET_SIZE_MEAN']),
          setSizeMax: parseNum(row['SET_SIZE_MAX']),
        });
      }
    }
  } catch { /* file may not exist */ }

  axisCapRowsCache = rows;
  return rows;
}

/**
 * Get axis caps for a species with taxonomy fallback.
 */
export async function getAxisCapsForSpecies(
  speciesName: string,
  genus: string,
  family: string
): Promise<AxisCaps> {
  const rows = await loadAxisCapData();
  return computeAxisCaps(speciesName, rows, genus, family);
}
