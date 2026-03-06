/**
 * API route to get Spalding province species counts for a family.
 *
 * Returns per-province counts of how many species from the family are present,
 * plus a mapping of province -> list of species names for filtering.
 */
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { getOrLoadData } from '@/lib/data/data-repository';

/** Province names in the shapefile (canonical names) */
const SHAPEFILE_PROVINCES = [
  'Agulhas Current', 'Antarctic', 'Antarctic Polar Front', 'Arctic',
  'Benguela Current', 'Black Sea', 'California Current', 'Canary Current',
  'Eastern Tropical Pacific', 'Equatorial Atlantic', 'Equatorial Pacific',
  'Guinea Current', 'Gulf Stream', 'Humboldt Current', 'Indian Ocean Gyre',
  'Indian Ocean Monsoon Gyre', 'Indonesian Through-Flow', 'Inter American Seas',
  'Kuroshio', 'Leeuwin Current', 'Malvinas Current', 'Mediterranean',
  'Non-gyral Southwest Pacific', 'North Atlantic Transitional',
  'North Central Atlantic Gyre', 'North Central Pacific Gyre',
  'North Pacific Transitional', 'Red Sea', 'Sea of Japan/East Sea',
  'Somali Current', 'South Central Atlantic Gyre', 'South Central Pacific Gyre',
  'South China Sea', 'Subantarctic', 'Subarctic Atlantic', 'Subarctic Pacific',
  'Subtropical Convergence',
];

/**
 * Map CSV column names to canonical shapefile province names.
 * The CSV has duplicate columns with different spellings (e.g., "Indonesian Through Flow"
 * and "Indonesian Through-Flow"). We map both to the shapefile canonical name.
 */
const CSV_TO_PROVINCE: Record<string, string> = {};

// Direct matches (most columns)
for (const p of SHAPEFILE_PROVINCES) {
  CSV_TO_PROVINCE[p] = p;
}

// Aliases: CSV variant -> canonical shapefile name
CSV_TO_PROVINCE['Indonesian Through Flow'] = 'Indonesian Through-Flow';
CSV_TO_PROVINCE['Non gyral Southwest Pacific'] = 'Non-gyral Southwest Pacific';
CSV_TO_PROVINCE['Sea of Japan East Sea'] = 'Sea of Japan/East Sea';
CSV_TO_PROVINCE['Somali Arabian'] = 'Somali Current';
CSV_TO_PROVINCE['Somali/Arabian'] = 'Somali Current';

// Additional CSV columns that map to ecoregion-level names (not provinces)
// These are individual ecoregions from the MEOW system — we skip them
// since they don't correspond to our 37 province polygons.

/** Cache for province data */
let provinceDataCache: Map<string, Map<string, string[]>> | null = null;

/**
 * Load province CSV and build a map: family -> (province -> species[])
 */
async function loadProvinceData(): Promise<Map<string, Map<string, string[]>>> {
  if (provinceDataCache) return provinceDataCache;

  const csvPath = path.join(process.cwd(), 'data', 'species_provinces_spalding.csv');
  const content = await fs.readFile(csvPath, 'utf-8');

  // Get species -> family mapping
  const data = await getOrLoadData();
  const speciesFamilyMap = new Map<string, string>();
  for (const [, species] of data.species) {
    speciesFamilyMap.set(species.validName, species.family);
  }

  // Parse CSV
  const familyProvinces = new Map<string, Map<string, string[]>>();

  Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    step: (result) => {
      const row = result.data as Record<string, string>;
      const speciesName = (row.VALID_NAME || '').replace(/^"|"$/g, '');
      const family = speciesFamilyMap.get(speciesName);
      if (!family) return;

      // Get or create family's province map
      if (!familyProvinces.has(family)) {
        familyProvinces.set(family, new Map());
      }
      const provinceMap = familyProvinces.get(family)!;

      // Check each province column
      for (const [csvCol, provinceName] of Object.entries(CSV_TO_PROVINCE)) {
        const val = (row[csvCol] || '').replace(/^"|"$/g, '');
        if (val === 'TRUE') {
          const list = provinceMap.get(provinceName) ?? [];
          if (!list.includes(speciesName)) {
            list.push(speciesName);
          }
          provinceMap.set(provinceName, list);
        }
      }
    },
  });

  provinceDataCache = familyProvinces;
  return familyProvinces;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const family = decodeURIComponent(name);
    const allData = await loadProvinceData();
    const provinceMap = allData.get(family) ?? new Map<string, string[]>();

    // Build response: { provinceName: { count, species[] } }
    const provinces: Record<string, { count: number; species: string[] }> = {};
    for (const provinceName of SHAPEFILE_PROVINCES) {
      const species = provinceMap.get(provinceName) ?? [];
      if (species.length > 0) {
        provinces[provinceName] = { count: species.length, species };
      }
    }

    return NextResponse.json({
      family,
      provinces,
      totalSpecies: new Set(
        Array.from(provinceMap.values()).flat()
      ).size,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch (error) {
    console.error('[provinces-api] Error:', error);
    return NextResponse.json({ error: 'Failed to load province data' }, { status: 500 });
  }
}
