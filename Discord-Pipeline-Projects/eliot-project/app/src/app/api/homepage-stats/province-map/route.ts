/**
 * API route for homepage province map data.
 *
 * Computes percentage of LarvalBase species per province:
 * (species in LarvalBase with TRUE) / (all marine species with TRUE) × 100
 *
 * Also supports trait filtering and returns species lists for sidebar filtering.
 */
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { getOrLoadData } from '@/lib/data/data-repository';
import { loadImageRegistry } from '@/lib/data/image-registry';
import { buildCsvToProvinceMap, buildDotCsvToProvinceMap, ALL_PROVINCES } from '@/lib/constants/provinces';

const CSV_TO_PROVINCE = buildCsvToProvinceMap();
const DOT_CSV_TO_PROVINCE = buildDotCsvToProvinceMap();

interface ProvinceMapData {
  provinces: Record<string, {
    larvalbaseCount: number;
    totalCount: number;
    percentage: number;
    species: string[];
  }>;
}

let cachedData: ProvinceMapData | null = null;
let cachedTraitData: Map<string, Set<string>> | null = null;
let cachedFamilyData: ProvinceMapData | null = null;

/**
 * Load all species province totals from spalding_provinces_all_species_032026.csv
 */
async function loadAllSpeciesProvinces(): Promise<Map<string, number>> {
  const csvPath = path.join(process.cwd(), 'data', 'spalding_provinces_all_species_032026.csv');
  const content = await fs.readFile(csvPath, 'utf-8');

  const totals = new Map<string, number>();

  Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    step: (result) => {
      const row = result.data as Record<string, string>;
      for (const [csvCol, provinceName] of Object.entries(DOT_CSV_TO_PROVINCE)) {
        if (provinceName === 'NA') continue;
        const val = (row[csvCol] || '').replace(/^"|"$/g, '').toUpperCase();
        if (val === 'TRUE') {
          totals.set(provinceName, (totals.get(provinceName) ?? 0) + 1);
        }
      }
    },
  });

  return totals;
}

/**
 * Load LarvalBase species province data from spalding_provinces_species_larvalbase_032026.csv
 */
async function loadLarvalBaseProvinces(): Promise<Map<string, string[]>> {
  const csvPath = path.join(process.cwd(), 'data', 'spalding_provinces_species_larvalbase_032026.csv');
  const content = await fs.readFile(csvPath, 'utf-8');

  const provinceSpecies = new Map<string, string[]>();

  Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    step: (result) => {
      const row = result.data as Record<string, string>;
      const speciesName = (row.VALID_NAME || '').replace(/^"|"$/g, '');
      if (!speciesName) return;

      for (const [csvCol, provinceName] of Object.entries(CSV_TO_PROVINCE)) {
        const val = (row[csvCol] || '').replace(/^"|"$/g, '').toUpperCase();
        if (val === 'TRUE') {
          const list = provinceSpecies.get(provinceName) ?? [];
          if (!list.includes(speciesName)) {
            list.push(speciesName);
          }
          provinceSpecies.set(provinceName, list);
        }
      }
    },
  });

  return provinceSpecies;
}

async function loadProvinceMapData(): Promise<ProvinceMapData> {
  if (cachedData) return cachedData;

  const [allTotals, lbProvinces] = await Promise.all([
    loadAllSpeciesProvinces(),
    loadLarvalBaseProvinces(),
  ]);

  const provinces: ProvinceMapData['provinces'] = {};

  for (const name of ALL_PROVINCES) {
    const lbSpecies = lbProvinces.get(name) ?? [];
    const total = allTotals.get(name) ?? 0;
    if (total === 0 && lbSpecies.length === 0) continue;

    provinces[name] = {
      larvalbaseCount: lbSpecies.length,
      totalCount: total,
      percentage: total > 0 ? (lbSpecies.length / total) * 100 : 0,
      species: lbSpecies,
    };
  }

  cachedData = { provinces };
  return cachedData;
}

/**
 * Load families province data for families mode.
 * Uses spalding_provinces_families_032026.csv for total families per province,
 * and derives LarvalBase families from species data.
 */
async function loadFamilyProvinceData(): Promise<ProvinceMapData> {
  if (cachedFamilyData) return cachedFamilyData;

  // Load total families per province from families CSV
  const csvPath = path.join(process.cwd(), 'data', 'spalding_provinces_families_032026.csv');
  const content = await fs.readFile(csvPath, 'utf-8');

  const totalFamilies = new Map<string, number>();
  Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    step: (result) => {
      const row = result.data as Record<string, string>;
      for (const [csvCol, provinceName] of Object.entries(DOT_CSV_TO_PROVINCE)) {
        if (provinceName === 'NA') continue;
        const val = (row[csvCol] || '').replace(/^"|"$/g, '').toUpperCase();
        if (val === 'TRUE') {
          totalFamilies.set(provinceName, (totalFamilies.get(provinceName) ?? 0) + 1);
        }
      }
    },
  });

  // Derive LarvalBase families per province from species data
  const speciesMapData = await loadProvinceMapData();
  const data = await getOrLoadData();

  // Build species -> family mapping
  const speciesFamilyMap = new Map<string, string>();
  for (const [, sp] of data.species) {
    speciesFamilyMap.set(sp.validName, sp.family);
  }

  const provinces: ProvinceMapData['provinces'] = {};
  for (const [name, spData] of Object.entries(speciesMapData.provinces)) {
    // Get unique families from species in this province
    const families = new Set<string>();
    const familySpecies: string[] = [];
    for (const sp of spData.species) {
      const fam = speciesFamilyMap.get(sp);
      if (fam) families.add(fam);
      familySpecies.push(sp);
    }

    const total = totalFamilies.get(name) ?? 0;
    if (total === 0 && families.size === 0) continue;

    provinces[name] = {
      larvalbaseCount: families.size,
      totalCount: total,
      percentage: total > 0 ? (families.size / total) * 100 : 0,
      species: familySpecies,
    };
  }

  cachedFamilyData = { provinces };
  return cachedFamilyData;
}

/**
 * Load trait data: which species have which traits.
 * Returns Map: traitKey -> Set of species names.
 */
async function loadTraitData(): Promise<Map<string, Set<string>>> {
  if (cachedTraitData) return cachedTraitData;

  const data = await getOrLoadData();
  const traitMap = new Map<string, Set<string>>();

  // Build from traitsBySpecies: speciesId -> TraitData[]
  for (const [speciesId, traits] of data.traitsBySpecies) {
    const species = data.species.get(speciesId);
    if (!species) continue;
    for (const trait of traits) {
      if (!traitMap.has(trait.traitType)) traitMap.set(trait.traitType, new Set());
      traitMap.get(trait.traitType)!.add(species.validName);
    }
  }

  // Add image-based traits
  try {
    const registry = await loadImageRegistry();
    const hasImages = new Set<string>();
    for (const [speciesName] of registry.imagesBySpecies) {
      hasImages.add(speciesName);
    }
    traitMap.set('has_images', hasImages);
  } catch { /* ignore */ }

  cachedTraitData = traitMap;
  return traitMap;
}

export async function GET(request: NextRequest) {
  try {
    const trait = request.nextUrl.searchParams.get('trait');
    const mode = request.nextUrl.searchParams.get('mode');

    // Families mode: show percentage of families per province
    if (mode === 'families') {
      const familyData = await loadFamilyProvinceData();

      // Apply trait filter if specified
      if (trait && trait !== 'all') {
        const traitData = await loadTraitData();
        const traitSpecies = traitData.get(trait);

        if (!traitSpecies) {
          return NextResponse.json({ provinces: {} });
        }

        // Build species->family lookup
        const speciesData = await getOrLoadData();
        const speciesFamilyMap = new Map<string, string>();
        for (const [, spInfo] of speciesData.species) {
          speciesFamilyMap.set(spInfo.validName, spInfo.family);
        }

        const filteredProvinces: ProvinceMapData['provinces'] = {};
        for (const [name, data] of Object.entries(familyData.provinces)) {
          const filteredSpecies = data.species.filter(s => traitSpecies.has(s));
          if (filteredSpecies.length === 0) continue;

          const families = new Set<string>();
          for (const sp of filteredSpecies) {
            const fam = speciesFamilyMap.get(sp);
            if (fam) families.add(fam);
          }

          filteredProvinces[name] = {
            larvalbaseCount: families.size,
            totalCount: data.totalCount,
            percentage: data.totalCount > 0 ? (families.size / data.totalCount) * 100 : 0,
            species: filteredSpecies,
          };
        }

        return NextResponse.json({ provinces: filteredProvinces }, {
          headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
        });
      }

      return NextResponse.json(familyData, {
        headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
      });
    }

    const mapData = await loadProvinceMapData();

    if (trait && trait !== 'all') {
      // Filter: only count species that have the given trait
      const traitData = await loadTraitData();
      const traitSpecies = traitData.get(trait);

      if (!traitSpecies) {
        return NextResponse.json({ provinces: {} });
      }

      // Recompute provinces with only species that have this trait
      const filteredProvinces: ProvinceMapData['provinces'] = {};
      for (const [name, data] of Object.entries(mapData.provinces)) {
        const filteredSpecies = data.species.filter(s => traitSpecies.has(s));
        if (filteredSpecies.length === 0) continue;
        filteredProvinces[name] = {
          larvalbaseCount: filteredSpecies.length,
          totalCount: data.totalCount,
          percentage: data.totalCount > 0 ? (filteredSpecies.length / data.totalCount) * 100 : 0,
          species: filteredSpecies,
        };
      }

      return NextResponse.json({ provinces: filteredProvinces }, {
        headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
      });
    }

    return NextResponse.json(mapData, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch (error) {
    console.error('[province-map-api] Error:', error);
    return NextResponse.json({ error: 'Failed to load province map data' }, { status: 500 });
  }
}
