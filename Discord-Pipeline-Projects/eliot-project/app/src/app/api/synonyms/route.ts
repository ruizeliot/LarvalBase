import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

/**
 * Synonym lookup API.
 * Loads marine_larvae_synonyms_habitat.csv (@ delimited, 48k+ rows)
 * with ORIGINAL_NAME -> VALID_NAME mapping.
 *
 * GET /api/synonyms?q=<search_term>
 * Returns: { matches: [{ synonym: string, validName: string }] }
 */

interface SynonymEntry {
  synonym: string;
  validName: string;
}

let cachedSynonyms: SynonymEntry[] | null = null;

function loadSynonyms(): SynonymEntry[] {
  if (cachedSynonyms) return cachedSynonyms;

  // Primary: marine_larvae_synonyms_habitat.csv (has ORIGINAL_NAME → VALID_NAME, 48k+ rows)
  // Note: marine_larvae_valid_names_synonyms_habitat_032026.txt does NOT have ORIGINAL_NAME
  const primaryPath = path.join(process.cwd(), 'data', 'marine_larvae_synonyms_habitat.csv');
  // Fallback: marine_fish_synonyms.csv (old)
  const fallbackPath = path.join(process.cwd(), 'data', 'marine_fish_synonyms.csv');

  const csvPath = fs.existsSync(primaryPath) ? primaryPath : fallbackPath;
  if (!fs.existsSync(csvPath)) {
    return [];
  }

  const raw = fs.readFileSync(csvPath, 'utf-8');
  const lines = raw.split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].split('@').map(h => h.replace(/"/g, '').trim().toUpperCase());
  const synonymIdx = header.findIndex(h => h === 'ORIGINAL_NAME' || h === 'SYNONYM' || h === 'SYNONYM_NAME');
  const validIdx = header.findIndex(h => h === 'VALID_NAME' || h === 'ACCEPTED_NAME');

  if (synonymIdx < 0 || validIdx < 0) {
    console.warn('Synonyms CSV: could not identify columns. Headers:', header);
    return [];
  }

  const entries: SynonymEntry[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split('@').map(c => c.replace(/"/g, '').trim());
    if (cols.length <= Math.max(synonymIdx, validIdx)) continue;

    const syn = cols[synonymIdx];
    const valid = cols[validIdx];
    if (!syn || !valid) continue;
    // Skip rows where synonym equals valid name (not useful for search)
    if (syn.toLowerCase() === valid.toLowerCase()) continue;

    entries.push({ synonym: syn, validName: valid });
  }

  cachedSynonyms = entries;
  return entries;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = (url.searchParams.get('q') || '').trim().toLowerCase();

    if (!query || query.length < 2) {
      return NextResponse.json({ matches: [] });
    }

    const synonyms = loadSynonyms();
    if (synonyms.length === 0) {
      return NextResponse.json({ matches: [], available: false });
    }

    // Find synonyms matching the query (substring match)
    const matches = synonyms
      .filter(s => s.synonym.toLowerCase().includes(query))
      .slice(0, 20)
      .map(s => ({
        synonym: s.synonym,
        validName: s.validName,
        authority: '',
      }));

    return NextResponse.json({ matches, available: true });
  } catch (error) {
    console.error('Error in synonyms API:', error);
    return NextResponse.json({ matches: [], error: 'Failed to load synonyms' });
  }
}
