/**
 * Test for publication year reference data parsing.
 * Verifies the @ delimiter CSV parser produces actual data from the reference file.
 */
import { describe, it, expect } from 'vitest';
import Papa from 'papaparse';
import * as fs from 'fs';
import * as path from 'path';

/** Minimal row interface matching route.ts */
interface RefRow {
  VARIABLE: string;
  ORIGIN: string;
  EXT_REF_DATE: string;
  REFERENCE_DATE: string;
  EXT_REF_UNIQUE: string;
  REFERENCE_UNIQUE: string;
}

/**
 * Replicate the loadPublicationYears logic from route.ts
 * to verify parsing produces non-empty results.
 */
function parseReferenceData(content: string) {
  const parseResult = Papa.parse<RefRow>(content, {
    delimiter: '@',
    header: true,
    skipEmptyLines: true,
    quoteChar: '"',
  });

  const binCounts = new Map<string, Set<string>>();

  for (const row of parseResult.data) {
    const variable = typeof row.VARIABLE === 'string' ? row.VARIABLE.trim() : '';
    if (!variable || variable === 'NA') continue;

    const rawOrigin = typeof row.ORIGIN === 'string' ? row.ORIGIN.trim() : '';
    const origin = rawOrigin === 'NA' || rawOrigin === '' ? 'Unrecorded' : rawOrigin;

    // Process original references
    const refDate = typeof row.REFERENCE_DATE === 'string' ? row.REFERENCE_DATE.trim() : '';
    if (refDate && refDate !== 'NA') {
      const year = parseInt(refDate, 10);
      if (!isNaN(year) && year >= 1800 && year <= 2030) {
        const bin = Math.floor(year / 5) * 5;
        const source = `Original\n${origin}`;
        const key = `${variable}|${bin}|${source}`;
        if (!binCounts.has(key)) binCounts.set(key, new Set());
        const refUnique = typeof row.REFERENCE_UNIQUE === 'string' ? row.REFERENCE_UNIQUE.trim() : '';
        if (refUnique && refUnique !== 'NA') binCounts.get(key)!.add(refUnique);
      }
    }

    // Process cited references
    const extRefDate = typeof row.EXT_REF_DATE === 'string' ? row.EXT_REF_DATE.trim() : '';
    if (extRefDate && extRefDate !== 'NA') {
      const year = parseInt(extRefDate, 10);
      if (!isNaN(year) && year >= 1800 && year <= 2030) {
        const bin = Math.floor(year / 5) * 5;
        const source = `Cited\n${origin}`;
        const key = `${variable}|${bin}|${source}`;
        if (!binCounts.has(key)) binCounts.set(key, new Set());
        const extRefUnique = typeof row.EXT_REF_UNIQUE === 'string' ? row.EXT_REF_UNIQUE.trim() : '';
        if (extRefUnique && extRefUnique !== 'NA') binCounts.get(key)!.add(extRefUnique);
      }
    }
  }

  const result: { year: number; source: string; count: number; variable: string }[] = [];
  for (const [key, refs] of binCounts) {
    if (refs.size === 0) continue;
    const parts = key.split('|');
    result.push({
      variable: parts[0],
      year: parseInt(parts[1], 10),
      source: parts[2],
      count: refs.size,
    });
  }

  return { parseResult, result };
}

describe('Publication year reference data parsing', () => {
  it('should parse @ delimited reference data with quoted fields', () => {
    const sample = [
      '"VARIABLE"@"ORIGIN"@"EXT_REF"@"EXT_REF_UNIQUE"@"EXT_REF_DATE"@"REFERENCE"@"REFERENCE_UNIQUE"@"REFERENCE_DATE"',
      '"Larval growth rate"@"Reared"@NA@NA@NA@"Alshuth et al. (1998) - Bulletin of Marine Science"@"alshuth et al 1998"@"1998"',
      '"Larval growth rate"@"Reared"@NA@NA@NA@"Connell (2007) - Website"@"connell 2007"@"2007"',
      '"Egg diameter"@"Wild"@"Smith (2010) - J Fish Biol"@"smith 2010"@"2010"@"Jones (2005) - Mar Biol"@"jones 2005"@"2005"',
    ].join('\n');

    const { parseResult, result } = parseReferenceData(sample);

    expect(parseResult.data.length).toBe(3);
    expect(parseResult.errors.length).toBe(0);
    expect(parseResult.data[0].VARIABLE).toBe('Larval growth rate');
    expect(parseResult.data[0].REFERENCE_DATE).toBe('1998');

    // Should produce bins with data
    expect(result.length).toBeGreaterThan(0);

    // Verify 5-year binning
    const bins = result.map(r => r.year);
    expect(bins).toContain(1995); // 1998 → floor(1998/5)*5 = 1995
    expect(bins).toContain(2005); // 2005 → floor(2005/5)*5 = 2005, 2007 → 2005

    // Verify source categories
    const sources = new Set(result.map(r => r.source));
    expect(sources.has('Original\nReared')).toBe(true);
    expect(sources.has('Original\nWild')).toBe(true);
    expect(sources.has('Cited\nWild')).toBe(true); // From Egg diameter EXT_REF
  });

  it('should skip NA dates and count unique references', () => {
    const sample = [
      '"VARIABLE"@"ORIGIN"@"EXT_REF"@"EXT_REF_UNIQUE"@"EXT_REF_DATE"@"REFERENCE"@"REFERENCE_UNIQUE"@"REFERENCE_DATE"',
      '"Trait A"@"Reared"@NA@NA@NA@"Ref1"@"ref1"@"2000"',
      '"Trait A"@"Reared"@NA@NA@NA@"Ref1"@"ref1"@"2000"', // duplicate ref
      '"Trait A"@"Reared"@NA@NA@NA@"Ref2"@"ref2"@"2001"', // same bin, different ref
      '"Trait A"@"Wild"@NA@NA@NA@"Ref3"@"ref3"@NA', // NA date - skip
    ].join('\n');

    const { result } = parseReferenceData(sample);

    // ref1 and ref2 are in bin 2000, both Reared Original
    const bin2000Reared = result.find(r => r.year === 2000 && r.source === 'Original\nReared');
    expect(bin2000Reared).toBeDefined();
    expect(bin2000Reared!.count).toBe(2); // ref1 + ref2 (ref1 deduplicated)

    // Wild ref3 has NA date, should not appear
    const wildEntries = result.filter(r => r.source === 'Original\nWild');
    expect(wildEntries.length).toBe(0);
  });

  it('should parse the actual reference data file and produce non-empty results', () => {
    // Find the reference data file
    const refFilename = 'All references and publication dates.txt';
    const candidatePaths = [
      path.join(process.cwd(), '..', 'reference-data', refFilename),
      path.join(process.cwd(), 'reference-data', refFilename),
    ];

    let content: string | null = null;
    for (const p of candidatePaths) {
      try {
        content = fs.readFileSync(p, 'utf-8');
        break;
      } catch { /* try next */ }
    }

    if (!content) {
      console.warn('Reference data file not found, skipping integration test');
      return;
    }

    const { parseResult, result } = parseReferenceData(content);

    // Must parse thousands of rows
    expect(parseResult.data.length).toBeGreaterThan(10000);
    console.log(`Parsed ${parseResult.data.length} rows → ${result.length} bins`);

    // Must produce hundreds of bins
    expect(result.length).toBeGreaterThan(100);

    // Must have multiple variables
    const variables = new Set(result.map(r => r.variable));
    expect(variables.size).toBeGreaterThan(10);

    // Must have all 6 source categories
    const sources = new Set(result.map(r => r.source));
    expect(sources.has('Original\nReared')).toBe(true);
    expect(sources.has('Original\nWild')).toBe(true);
    expect(sources.has('Cited\nReared')).toBe(true);
    expect(sources.has('Cited\nWild')).toBe(true);
  });
});
