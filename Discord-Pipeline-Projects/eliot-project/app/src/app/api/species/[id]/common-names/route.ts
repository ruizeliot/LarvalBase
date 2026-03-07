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

    // Relevance scoring: frequency + source authority + name quality
    const nameScores = new Map<string, { score: number; freq: number; sources: Set<string> }>();
    for (const m of matches) {
      const name = m.commonName.trim();
      if (!name) continue;
      const lower = name.toLowerCase();
      if (GENERIC_NAMES.has(lower)) continue;
      // Skip very short names (likely abbreviations)
      if (name.length < 3) continue;

      const existing = nameScores.get(name) || { score: 0, freq: 0, sources: new Set<string>() };
      existing.freq += 1;
      if (m.source) existing.sources.add(m.source.toLowerCase());
      nameScores.set(name, existing);
    }

    // Compute final score for each name
    for (const [name, data] of nameScores) {
      let score = data.freq * 2; // frequency weight
      // Authoritative source bonus
      for (const src of data.sources) {
        if (src.includes('fishbase') || src.includes('fish base')) score += 5;
        if (src.includes('fao')) score += 3;
        if (src.includes('iucn')) score += 2;
      }
      // Prefer multi-word descriptive names over single words
      const words = name.split(/\s+/).length;
      if (words >= 2) score += 2;
      // Penalize overly long names (>40 chars)
      if (name.length > 40) score -= 2;
      data.score = score;
    }

    // Sort by score descending, then alphabetically
    const sorted = [...nameScores.entries()]
      .sort((a, b) => b[1].score - a[1].score || a[0].localeCompare(b[0]))
      .map(([name]) => name);

    // Return at most 3
    return NextResponse.json({ names: sorted.slice(0, 3) });
  } catch (error) {
    console.error('Error loading common names:', error);
    return NextResponse.json({ names: [] });
  }
}
