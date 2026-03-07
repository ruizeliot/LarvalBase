/**
 * API route to get Spalding province presence for a species.
 *
 * Uses species_provinces_spalding.csv.
 * Returns list of province names where the species is found (TRUE in CSV).
 */
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { getOrLoadData } from '@/lib/data/data-repository';
import { buildCsvToProvinceMap } from '@/lib/constants/provinces';

const CSV_TO_PROVINCE = buildCsvToProvinceMap();

/** Cache: species name -> { provinces, source } */
let speciesProvinceCache: Map<string, { provinces: string[]; source: string }> | null = null;

async function loadSpeciesProvinces(): Promise<Map<string, { provinces: string[]; source: string }>> {
  if (speciesProvinceCache) return speciesProvinceCache;

  const csvPath = path.join(process.cwd(), 'data', 'species_provinces_spalding.csv');
  const content = await fs.readFile(csvPath, 'utf-8');

  const result = new Map<string, { provinces: string[]; source: string }>();

  Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    step: (row) => {
      const data = row.data as Record<string, string>;
      const speciesName = (data.VALID_NAME || '').replace(/^"|"$/g, '');
      if (!speciesName) return;

      // Read SOURCE column and deduplicate
      const rawSource = (data.SOURCE || '').replace(/^"|"$/g, '');
      const sourceParts = rawSource.split(',').map((s) => s.trim()).filter(Boolean);
      const uniqueSources = [...new Set(sourceParts)];
      const source = uniqueSources.join(', ');

      const provinces: string[] = [];
      for (const [csvCol, provinceName] of Object.entries(CSV_TO_PROVINCE)) {
        const val = (data[csvCol] || '').replace(/^"|"$/g, '').toUpperCase();
        if (val === 'TRUE' && !provinces.includes(provinceName)) {
          provinces.push(provinceName);
        }
      }

      if (provinces.length > 0) {
        result.set(speciesName, { provinces, source });
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
    const entry = allProvinces.get(species.validName);
    const provinces = entry?.provinces ?? [];
    const source = entry?.source ?? '';

    return NextResponse.json({
      speciesName: species.validName,
      provinces,
      source,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch (error) {
    console.error('[species-provinces-api] Error:', error);
    return NextResponse.json({ error: 'Failed to load province data' }, { status: 500 });
  }
}
