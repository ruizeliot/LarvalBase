import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

/**
 * Returns adult ecosystem and habitat for a species.
 * GET /api/species/[id]/habitat
 *
 * Source: marine_larvae_synonyms_habitat.csv (@ delimited)
 * Looks up by VALID_NAME (case-insensitive match against slugified ID).
 */

interface HabitatEntry {
  validName: string;
  habitat: string;
  ecosystem: string;
}

let cachedMap: Map<string, HabitatEntry> | null = null;

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function loadHabitatMap(): Map<string, HabitatEntry> {
  if (cachedMap) return cachedMap;

  // Prefer newest file (with spaces in name), then underscored version, then old synonym file
  const newestPath = path.join(process.cwd(), 'data', 'Marine larvae valid names synonyms and habitat 03.2026.txt');
  const newPath = path.join(process.cwd(), 'data', 'marine_larvae_valid_names_synonyms_habitat_032026.txt');
  const oldPath = path.join(process.cwd(), 'data', 'marine_larvae_synonyms_habitat.csv');
  const csvPath = fs.existsSync(newestPath) ? newestPath : fs.existsSync(newPath) ? newPath : oldPath;
  if (!fs.existsSync(csvPath)) {
    cachedMap = new Map();
    return cachedMap;
  }

  const raw = fs.readFileSync(csvPath, 'utf-8');
  const lines = raw.split('\n');
  if (lines.length < 2) {
    cachedMap = new Map();
    return cachedMap;
  }

  const header = lines[0].split('@').map(h => h.replace(/"/g, '').trim().toUpperCase());
  const validNameIdx = header.indexOf('VALID_NAME');
  const habitatIdx = header.indexOf('HABITAT');
  const ecosystemIdx = header.indexOf('ADULT_ZONE_WITH_FRESHWATER');

  if (validNameIdx < 0 || habitatIdx < 0 || ecosystemIdx < 0) {
    cachedMap = new Map();
    return cachedMap;
  }

  const map = new Map<string, HabitatEntry>();
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split('@').map(c => c.replace(/"/g, '').trim());
    if (cols.length <= Math.max(validNameIdx, habitatIdx, ecosystemIdx)) continue;

    const validName = cols[validNameIdx];
    if (!validName) continue;

    const slug = slugify(validName);
    if (map.has(slug)) continue; // first occurrence wins

    map.set(slug, {
      validName,
      habitat: cols[habitatIdx] || '',
      ecosystem: cols[ecosystemIdx] || '',
    });
  }

  cachedMap = map;
  return cachedMap;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const map = loadHabitatMap();
    const entry = map.get(id.toLowerCase());

    if (!entry) {
      return NextResponse.json({ habitat: null, ecosystem: null });
    }

    return NextResponse.json({
      habitat: entry.habitat || null,
      ecosystem: entry.ecosystem || null,
    });
  } catch (error) {
    console.error('Error loading habitat data:', error);
    return NextResponse.json({ habitat: null, ecosystem: null });
  }
}
