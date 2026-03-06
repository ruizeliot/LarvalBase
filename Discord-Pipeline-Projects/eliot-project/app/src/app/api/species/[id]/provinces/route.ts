/**
 * API route to get Spalding province presence for a species.
 *
 * Returns list of province names where the species is found (TRUE in CSV).
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

const CSV_TO_PROVINCE: Record<string, string> = {};
for (const p of SHAPEFILE_PROVINCES) {
  CSV_TO_PROVINCE[p] = p;
}
CSV_TO_PROVINCE['Indonesian Through Flow'] = 'Indonesian Through-Flow';
CSV_TO_PROVINCE['Non gyral Southwest Pacific'] = 'Non-gyral Southwest Pacific';
CSV_TO_PROVINCE['Sea of Japan East Sea'] = 'Sea of Japan/East Sea';
CSV_TO_PROVINCE['Somali Arabian'] = 'Somali Current';
CSV_TO_PROVINCE['Somali/Arabian'] = 'Somali Current';

/** Cache: species name -> province names */
let speciesProvinceCache: Map<string, string[]> | null = null;

async function loadSpeciesProvinces(): Promise<Map<string, string[]>> {
  if (speciesProvinceCache) return speciesProvinceCache;

  const csvPath = path.join(process.cwd(), 'data', 'species_provinces_spalding.csv');
  const content = await fs.readFile(csvPath, 'utf-8');

  const result = new Map<string, string[]>();

  Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    step: (row) => {
      const data = row.data as Record<string, string>;
      const speciesName = (data.VALID_NAME || '').replace(/^"|"$/g, '');
      if (!speciesName) return;

      const provinces: string[] = [];
      for (const [csvCol, provinceName] of Object.entries(CSV_TO_PROVINCE)) {
        const val = (data[csvCol] || '').replace(/^"|"$/g, '');
        if (val === 'TRUE' && !provinces.includes(provinceName)) {
          provinces.push(provinceName);
        }
      }

      if (provinces.length > 0) {
        result.set(speciesName, provinces);
      }
    },
  });

  speciesProvinceCache = result;
  return result;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await getOrLoadData();
    const species = data.species.get(id);
    if (!species) {
      return NextResponse.json({ error: 'Species not found' }, { status: 404 });
    }

    const allProvinces = await loadSpeciesProvinces();
    const provinces = allProvinces.get(species.validName) ?? [];

    return NextResponse.json({
      speciesName: species.validName,
      provinces,
      source: 'FishBase / Spalding et al. (2012)',
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch (error) {
    console.error('[species-provinces-api] Error:', error);
    return NextResponse.json({ error: 'Failed to load province data' }, { status: 500 });
  }
}
