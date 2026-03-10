import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

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

function loadCommonNames(): CommonNameEntry[] {
  if (cachedData) return cachedData;

  const csvPath = path.join(process.cwd(), 'data', 'common_names_marine_fish.csv');
  if (!fs.existsSync(csvPath)) return [];

  const raw = fs.readFileSync(csvPath, 'utf-8');
  const lines = raw.split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].split('@').map(h => h.replace(/"/g, '').trim());
  const validNameIdx = header.indexOf('VALID_NAME');
  const commonNameIdx = header.indexOf('COMMON_NAME');
  const languageIdx = header.indexOf('LANGUAGE');
  const sourceIdx = header.indexOf('SOURCE');

  if (validNameIdx < 0 || commonNameIdx < 0 || languageIdx < 0) return [];

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

function getTopNames(allEntries: CommonNameEntry[], speciesName: string, lang: string): string[] {
  const speciesLower = speciesName.toLowerCase();
  const langLower = lang.toLowerCase();
  const matches = allEntries.filter(
    e => e.validName.toLowerCase() === speciesLower && e.language.toLowerCase() === langLower
  );

  if (matches.length === 0) return [];

  const nameScores = new Map<string, { score: number; freq: number; sources: Set<string> }>();
  for (const m of matches) {
    const name = m.commonName.trim();
    if (!name || name.length < 3) continue;
    if (GENERIC_NAMES.has(name.toLowerCase())) continue;

    const existing = nameScores.get(name) || { score: 0, freq: 0, sources: new Set<string>() };
    existing.freq += 1;
    if (m.source) existing.sources.add(m.source.toLowerCase());
    nameScores.set(name, existing);
  }

  for (const [n, data] of nameScores) {
    let score = data.freq * 2;
    for (const src of data.sources) {
      if (src.includes('fishbase') || src.includes('fish base')) score += 5;
      if (src.includes('fao')) score += 3;
      if (src.includes('iucn')) score += 2;
    }
    if (n.split(/\s+/).length >= 2) score += 2;
    if (n.length > 40) score -= 2;
    data.score = score;
  }

  return [...nameScores.entries()]
    .sort((a, b) => b[1].score - a[1].score || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([name]) => name);
}

/**
 * POST /api/species/common-names-batch
 * Body: { species: string[], lang?: string }
 * Returns: { results: Record<string, string[]> }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const speciesList: string[] = body.species || [];
    const lang = body.lang || 'English';

    const allEntries = loadCommonNames();
    const results: Record<string, string[]> = {};

    for (const sp of speciesList) {
      const names = getTopNames(allEntries, sp, lang);
      if (names.length > 0) {
        results[sp] = names;
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error in common-names-batch:', error);
    return NextResponse.json({ results: {} });
  }
}
