/**
 * GET /api/export/province-traits?province=XXX
 *
 * Returns CSV of ALL traits for all species in the selected province(s).
 * Uses spalding_provinces_species_larvalbase_032026.csv to find species in province.
 */
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { buildCsvToProvinceMap } from '@/lib/constants/provinces';
import { getProvinceTraitsExport, rowsToCsv } from '@/lib/services/all-traits-export.service';

const CSV_TO_PROVINCE = buildCsvToProvinceMap();

/** Cache: province name -> species valid names */
let provinceSpeciesCache: Map<string, string[]> | null = null;

async function loadProvinceSpecies(): Promise<Map<string, string[]>> {
  if (provinceSpeciesCache) return provinceSpeciesCache;

  const csvPath = path.join(process.cwd(), 'data', 'spalding_provinces_species_larvalbase_032026.csv');
  const content = await fs.readFile(csvPath, 'utf-8');

  const result = new Map<string, string[]>();

  Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    step: (row) => {
      const data = row.data as Record<string, string>;
      const speciesName = (data.VALID_NAME || '').replace(/^"|"$/g, '').trim();
      if (!speciesName) return;

      for (const [csvCol, provinceName] of Object.entries(CSV_TO_PROVINCE)) {
        const val = (data[csvCol] || '').replace(/^"|"$/g, '').toUpperCase();
        if (val === 'TRUE') {
          const list = result.get(provinceName) ?? [];
          if (!list.includes(speciesName)) {
            list.push(speciesName);
          }
          result.set(provinceName, list);
        }
      }
    },
  });

  provinceSpeciesCache = result;
  return result;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const province = url.searchParams.get('province');

    if (!province) {
      return NextResponse.json({ error: 'Missing required param: province' }, { status: 400 });
    }

    const provinceSpecies = await loadProvinceSpecies();
    const speciesList = provinceSpecies.get(province) ?? [];

    if (speciesList.length === 0) {
      return NextResponse.json(
        { error: `No species found in province: ${province}` },
        { status: 404 }
      );
    }

    const result = await getProvinceTraitsExport([province], speciesList);
    const csv = rowsToCsv(result.columns, result.rows);
    const safeProvince = province.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '_');
    const filename = `${safeProvince}_all_traits.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, s-maxage=1800',
      },
    });
  } catch (error) {
    console.error('[province-traits-export] Error:', error);
    return NextResponse.json({ error: 'Failed to generate export' }, { status: 500 });
  }
}
