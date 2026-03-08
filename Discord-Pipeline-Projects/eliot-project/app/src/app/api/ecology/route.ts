import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

/**
 * Ecology filter API.
 * Loads marine_larvae_synonyms_habitat.csv and returns species lists
 * filtered by ecosystem (ADULT_ZONE_WITH_FRESHWATER) and/or habitat (HABITAT).
 *
 * GET /api/ecology?ecosystem=Marine&habitat=Benthic
 * GET /api/ecology (returns all modalities and species mapping)
 */

interface EcologyEntry {
  validName: string;
  habitat: string;
  ecosystem: string;
}

let cachedEntries: EcologyEntry[] | null = null;

function loadEcologyData(): EcologyEntry[] {
  if (cachedEntries) return cachedEntries;

  const csvPath = path.join(process.cwd(), 'data', 'marine_larvae_synonyms_habitat.csv');
  if (!fs.existsSync(csvPath)) {
    return [];
  }

  const raw = fs.readFileSync(csvPath, 'utf-8');
  const lines = raw.split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].split('@').map(h => h.replace(/"/g, '').trim().toUpperCase());
  const validNameIdx = header.indexOf('VALID_NAME');
  const habitatIdx = header.indexOf('HABITAT');
  const ecosystemIdx = header.indexOf('ADULT_ZONE_WITH_FRESHWATER');

  if (validNameIdx < 0 || habitatIdx < 0 || ecosystemIdx < 0) {
    console.warn('Ecology CSV: missing required columns. Headers:', header);
    return [];
  }

  // Deduplicate by VALID_NAME (take first occurrence)
  const seen = new Set<string>();
  const entries: EcologyEntry[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split('@').map(c => c.replace(/"/g, '').trim());
    if (cols.length <= Math.max(validNameIdx, habitatIdx, ecosystemIdx)) continue;

    const validName = cols[validNameIdx];
    if (!validName || seen.has(validName)) continue;
    seen.add(validName);

    entries.push({
      validName,
      habitat: cols[habitatIdx] || '',
      ecosystem: cols[ecosystemIdx] || '',
    });
  }

  cachedEntries = entries;
  return entries;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const ecosystem = url.searchParams.get('ecosystem');
    const habitat = url.searchParams.get('habitat');

    const entries = loadEcologyData();
    if (entries.length === 0) {
      return NextResponse.json({ species: [], modalities: { ecosystems: [], habitats: [] } });
    }

    // If no filters, return modalities list
    if (!ecosystem && !habitat) {
      const ecosystems = [...new Set(entries.map(e => e.ecosystem).filter(Boolean))].sort();
      const habitats = [...new Set(entries.map(e => e.habitat).filter(Boolean))].sort();
      return NextResponse.json({ modalities: { ecosystems, habitats } });
    }

    // Filter by ecosystem and/or habitat
    let filtered = entries;
    if (ecosystem) {
      const ecoValues = ecosystem.split(',');
      filtered = filtered.filter(e => ecoValues.includes(e.ecosystem));
    }
    if (habitat) {
      const habValues = habitat.split(',');
      filtered = filtered.filter(e => habValues.includes(e.habitat));
    }

    const species = filtered.map(e => e.validName);
    return NextResponse.json({ species });
  } catch (error) {
    console.error('Error in ecology API:', error);
    return NextResponse.json({ species: [], error: 'Failed to load ecology data' });
  }
}
