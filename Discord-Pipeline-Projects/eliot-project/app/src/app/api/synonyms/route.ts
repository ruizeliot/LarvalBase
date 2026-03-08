import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

/**
 * Synonym lookup API.
 * Loads marine_fish_synonyms.csv (@ delimited) and returns valid name(s)
 * for a given synonym search query.
 *
 * GET /api/synonyms?q=<search_term>
 * Returns: { matches: [{ synonym: string, validName: string, authority?: string }] }
 */

interface SynonymEntry {
  synonym: string;
  validName: string;
  authority: string;
}

let cachedSynonyms: SynonymEntry[] | null = null;

function loadSynonyms(): SynonymEntry[] {
  if (cachedSynonyms) return cachedSynonyms;

  const csvPath = path.join(process.cwd(), 'data', 'marine_fish_synonyms.csv');
  if (!fs.existsSync(csvPath)) {
    return [];
  }

  const raw = fs.readFileSync(csvPath, 'utf-8');
  const lines = raw.split('\n');
  if (lines.length < 2) return [];

  // Parse header - @ delimited like other database files
  const header = lines[0].split('@').map(h => h.replace(/"/g, '').trim().toUpperCase());

  // Try common column names
  const synonymIdx = header.findIndex(h => h === 'SYNONYM' || h === 'ORIGINAL_NAME' || h === 'SYNONYM_NAME');
  const validIdx = header.findIndex(h => h === 'VALID_NAME' || h === 'ACCEPTED_NAME');
  const authorIdx = header.findIndex(h => h === 'AUTHORITY' || h === 'AUTHOR');

  if (synonymIdx < 0 || validIdx < 0) {
    // Fallback: try first two columns
    if (header.length >= 2) {
      const entries: SynonymEntry[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split('@').map(c => c.replace(/"/g, '').trim());
        if (cols.length < 2) continue;
        // Skip rows where synonym equals valid name
        if (cols[0].toLowerCase() === cols[1].toLowerCase()) continue;
        entries.push({
          synonym: cols[0],
          validName: cols[1],
          authority: cols.length > 2 ? cols[2] : '',
        });
      }
      cachedSynonyms = entries;
      return entries;
    }
    console.warn('Synonyms CSV: could not identify synonym/validName columns. Headers:', header);
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
    // Skip rows where synonym equals valid name
    if (syn.toLowerCase() === valid.toLowerCase()) continue;
    if (!syn || !valid) continue;

    entries.push({
      synonym: syn,
      validName: valid,
      authority: authorIdx >= 0 && cols.length > authorIdx ? cols[authorIdx] : '',
    });
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

    // Find synonyms matching the query (prefix or substring)
    const matches = synonyms
      .filter(s => s.synonym.toLowerCase().includes(query))
      .slice(0, 20)
      .map(s => ({
        synonym: s.synonym,
        validName: s.validName,
        authority: s.authority,
      }));

    return NextResponse.json({ matches, available: true });
  } catch (error) {
    console.error('Error in synonyms API:', error);
    return NextResponse.json({ matches: [], error: 'Failed to load synonyms' });
  }
}
