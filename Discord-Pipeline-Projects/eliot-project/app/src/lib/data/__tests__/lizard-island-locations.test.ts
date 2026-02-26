/**
 * Tests for US-1.4: Lizard Island location extraction from settlement databases.
 *
 * Verifies that:
 * 1. Lizard Island entries are parsed with numeric coordinates
 * 2. extractLocationsFromRows includes Lizard Island entries
 * 3. Species with Lizard Island data have correct locations
 */
import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { parseTraitCSV } from '../csv-parser';

const DATA_DIR = path.join(process.cwd(), 'data');

/**
 * Helper: extract numeric value (mirrors data-repository extractNumeric).
 */
function extractNumeric(value: unknown): number | null {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) return parsed;
  }
  return null;
}

describe('US-1.4: Lizard Island locations on settlement map', () => {
  it('settlement_age should have Lizard Island rows with valid coordinates', async () => {
    const content = await fs.readFile(
      path.join(DATA_DIR, 'settlement_age_database.csv'),
      'utf-8'
    );
    const result = parseTraitCSV<Record<string, unknown>>(content, 'settlement_age_database.csv');

    // Find rows with actual Lizard Island coordinates (not multi-location entries with NA coords)
    const lizardRows = result.data.filter(
      (row) =>
        typeof row.LOCATION === 'string' &&
        row.LOCATION.includes('Lizard Island') &&
        extractNumeric(row.LATITUDE) !== null &&
        extractNumeric(row.LONGITUDE) !== null
    );

    expect(lizardRows.length).toBeGreaterThan(0);

    for (const row of lizardRows) {
      const lat = extractNumeric(row.LATITUDE)!;
      const lon = extractNumeric(row.LONGITUDE)!;
      // Lizard Island region: lat around -10 to -25, lon around 140-150 (northeast Australia)
      expect(lat).toBeLessThan(0); // Southern hemisphere
      expect(lat).toBeGreaterThan(-25);
      // Longitude must be positive (~145) — old bug had -145.5 (wrong hemisphere)
      expect(lon, `Lizard Island lon should be positive, got ${lon}`).toBeGreaterThan(100);
      expect(lon).toBeLessThan(160);
    }
  });

  it('settlement_size should have Lizard Island rows with valid coordinates', async () => {
    const content = await fs.readFile(
      path.join(DATA_DIR, 'settlement_size_database.csv'),
      'utf-8'
    );
    const result = parseTraitCSV<Record<string, unknown>>(content, 'settlement_size_database.csv');

    const lizardRows = result.data.filter(
      (row) =>
        typeof row.LOCATION === 'string' &&
        row.LOCATION.includes('Lizard Island') &&
        extractNumeric(row.LATITUDE) !== null &&
        extractNumeric(row.LONGITUDE) !== null
    );

    expect(lizardRows.length).toBeGreaterThan(0);

    for (const row of lizardRows) {
      const lat = extractNumeric(row.LATITUDE)!;
      const lon = extractNumeric(row.LONGITUDE)!;
      expect(lat).toBeLessThan(0);
      expect(lat).toBeGreaterThan(-25);
      expect(lon, `Lizard Island lon should be positive, got ${lon}`).toBeGreaterThan(100);
      expect(lon).toBeLessThan(160);
    }
  });

  it('Naso hexacanthus (known Lizard Island species) should have location data extracted', async () => {
    const content = await fs.readFile(
      path.join(DATA_DIR, 'settlement_age_database.csv'),
      'utf-8'
    );
    const result = parseTraitCSV<Record<string, unknown>>(content, 'settlement_age_database.csv');

    const nasoRows = result.data.filter(
      (row) => row.VALID_NAME === 'Naso hexacanthus'
    );
    expect(nasoRows.length).toBeGreaterThan(0);

    // Check that at least one row has Lizard Island coordinates
    const lizardNasoRows = nasoRows.filter((row) => {
      const lat = extractNumeric(row.LATITUDE);
      const lon = extractNumeric(row.LONGITUDE);
      return (
        lat !== null &&
        lon !== null &&
        Math.abs(lat - (-14.664)) < 0.1 &&
        Math.abs(lon - 145.448) < 0.1
      );
    });

    expect(
      lizardNasoRows.length,
      'Naso hexacanthus should have Lizard Island entries with valid coords'
    ).toBeGreaterThan(0);
  });

  it('Acanthurus triostegus has locations but not Lizard Island', async () => {
    // A. triostegus has settlement data but no Lizard Island entries
    const content = await fs.readFile(
      path.join(DATA_DIR, 'settlement_age_database.csv'),
      'utf-8'
    );
    const result = parseTraitCSV<Record<string, unknown>>(content, 'settlement_age_database.csv');

    const acantRows = result.data.filter(
      (row) => row.VALID_NAME === 'Acanthurus triostegus'
    );
    expect(acantRows.length).toBeGreaterThan(0);

    // A. triostegus has GPS data for other locations
    const withCoords = acantRows.filter(
      (row) => extractNumeric(row.LATITUDE) !== null && extractNumeric(row.LONGITUDE) !== null
    );
    expect(withCoords.length).toBeGreaterThan(0);

    // But NOT Lizard Island
    const lizardAcant = acantRows.filter(
      (row) =>
        typeof row.LOCATION === 'string' &&
        row.LOCATION.includes('Lizard Island')
    );
    expect(lizardAcant.length).toBe(0);
  });
});
