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
import { ALL_PROVINCES, buildCsvToProvinceMap } from '@/lib/constants/provinces';

const CSV_TO_PROVINCE = buildCsvToProvinceMap();

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
    for (const provinceName of ALL_PROVINCES) {
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
