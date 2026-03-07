import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

/**
 * Generic names to filter out (overly broad or common across many species).
 */
const GENERIC_NAMES = new Set([
  'coral fish', 'damsel fish', 'damselfish', 'five finger', 'pilotfish',
  'pilot fish', 'reef fish', 'rock fish', 'rockfish', 'sea fish',
  'coral reef fish', 'marine fish', 'bony fish', 'small fish',
]);

interface CommonNameEntry {
  validName: string;
  commonName: string;
  language: string;
  source: string;
}

let cachedData: CommonNameEntry[] | null = null;

/**
 * Load and parse the common names CSV (@ delimited).
 */
function loadCommonNames(): CommonNameEntry[] {
  if (cachedData) return cachedData;

  const csvPath = path.join(process.cwd(), 'data', 'common_names_marine_fish.csv');
  if (!fs.existsSync(csvPath)) {
    console.warn('Common names CSV not found:', csvPath);
    return [];
  }

  const raw = fs.readFileSync(csvPath, 'utf-8');
  const lines = raw.split('\n');
  if (lines.length < 2) return [];

  // Parse header
  const header = lines[0].split('@').map(h => h.replace(/"/g, '').trim());
  const validNameIdx = header.indexOf('VALID_NAME');
  const commonNameIdx = header.indexOf('COMMON_NAME');
  const languageIdx = header.indexOf('LANGUAGE');
  const sourceIdx = header.indexOf('SOURCE');

  if (validNameIdx < 0 || commonNameIdx < 0 || languageIdx < 0) {
    console.warn('Common names CSV missing required columns');
    return [];
  }

  const entries: CommonNameEntry[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split('@').map(c => c.replace(/"/g, '').trim());
    if (cols.length <= Math.max(validNameIdx, commonNameIdx, languageIdx)) continue;

    entries.push({
      validName: cols[validNameIdx],
      commonName: cols[commonNameIdx],
      language: cols[languageIdx],
      source: sourceIdx >= 0 ? cols[sourceIdx] : '',
    });
  }

  cachedData = entries;
  return entries;
}

/**
 * Unslugify species ID: "dascyllus-aruanus" → "Dascyllus aruanus"
 */
function unslugify(id: string): string {
  return id.replace(/-/g, ' ').replace(/\b\w/, c => c.toUpperCase());
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const lang = url.searchParams.get('lang') || 'English';

    const speciesName = unslugify(id);
    const allEntries = loadCommonNames();

    // Filter by species and language (case-insensitive match)
    const speciesLower = speciesName.toLowerCase();
    const langLower = lang.toLowerCase();
    const matches = allEntries.filter(
      e => e.validName.toLowerCase() === speciesLower && e.language.toLowerCase() === langLower
    );

    if (matches.length === 0) {
      return NextResponse.json({ names: [] });
    }

    // Count name frequency across sources for relevance
    const nameFreq = new Map<string, number>();
    for (const m of matches) {
      const name = m.commonName.trim();
      if (!name) continue;
      const lower = name.toLowerCase();
      // Filter out generic names
      if (GENERIC_NAMES.has(lower)) continue;
      // Filter single-word generic-sounding names (less than 4 chars)
      nameFreq.set(name, (nameFreq.get(name) || 0) + 1);
    }

    // Sort by frequency (most common first), then alphabetically
    const sorted = [...nameFreq.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name]) => name);

    // Return at most 3
    return NextResponse.json({ names: sorted.slice(0, 3) });
  } catch (error) {
    console.error('Error loading common names:', error);
    return NextResponse.json({ names: [] });
  }
}
