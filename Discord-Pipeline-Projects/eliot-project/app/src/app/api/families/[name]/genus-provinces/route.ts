/**
 * API route to get genus-level province presence for a family.
 *
 * Uses spalding_provinces_genera_032026.csv.
 * Returns: { genera: { [genus]: province[] } }
 */
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { buildCsvToProvinceMap } from '@/lib/constants/provinces';

const CSV_TO_PROVINCE = buildCsvToProvinceMap();

/** Cache: family -> { genus -> provinces[] } */
let genusProvinceCache: Map<string, Map<string, string[]>> | null = null;

async function loadGenusProvinces(): Promise<Map<string, Map<string, string[]>>> {
  if (genusProvinceCache) return genusProvinceCache;

  const csvPath = path.join(process.cwd(), 'data', 'spalding_provinces_genera_032026.csv');
  const content = await fs.readFile(csvPath, 'utf-8');

  const result = new Map<string, Map<string, string[]>>();

  Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    step: (row) => {
      const data = row.data as Record<string, string>;
      const family = (data.FAMILY || '').replace(/^"|"$/g, '');
      const genus = (data.GENUS || '').replace(/^"|"$/g, '');
      if (!family || !genus) return;

      const provinces = new Set<string>();
      for (const [csvCol, provinceName] of Object.entries(CSV_TO_PROVINCE)) {
        if (provinceName === 'NA') continue;
        const val = (data[csvCol] || '').replace(/^"|"$/g, '').toUpperCase();
        if (val === 'TRUE') {
          provinces.add(provinceName);
        }
      }
      if (provinces.size === 0) return;

      if (!result.has(family)) result.set(family, new Map());
      result.get(family)!.set(genus, [...provinces]);
    },
  });

  genusProvinceCache = result;
  return result;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const family = decodeURIComponent(name);
    const allData = await loadGenusProvinces();
    const genusMap = allData.get(family) ?? new Map<string, string[]>();

    const genera: Record<string, string[]> = {};
    for (const [genus, provinces] of genusMap) {
      genera[genus] = provinces;
    }

    return NextResponse.json({ family, genera }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch (error) {
    console.error('[genus-provinces-api] Error:', error);
    return NextResponse.json({ error: 'Failed to load genus province data' }, { status: 500 });
  }
}
