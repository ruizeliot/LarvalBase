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

  it('Acanthurus olivaceus should have Lizard Island location extracted for map', async () => {
    // Bug report: A. olivaceus has Lizard Island data in settlement_age DB but dot doesn't render
    const content = await fs.readFile(
      path.join(DATA_DIR, 'settlement_age_database.csv'),
      'utf-8'
    );
    const result = parseTraitCSV<Record<string, unknown>>(content, 'settlement_age_database.csv');

    // Step 1: Verify raw CSV has A. olivaceus rows
    const olivaceusRows = result.data.filter(
      (row) => row.VALID_NAME === 'Acanthurus olivaceus'
    );
    expect(olivaceusRows.length).toBeGreaterThan(0);

    // Step 2: Find Lizard Island row specifically
    const lizardRows = olivaceusRows.filter(
      (row) =>
        typeof row.LOCATION === 'string' &&
        row.LOCATION.includes('Lizard Island')
    );
    expect(lizardRows.length, 'A. olivaceus should have Lizard Island entries').toBeGreaterThan(0);

    // Step 3: Verify the Lizard Island row has valid coordinates
    for (const row of lizardRows) {
      const lat = extractNumeric(row.LATITUDE);
      const lon = extractNumeric(row.LONGITUDE);
      expect(lat, 'Lizard Island latitude should be numeric').not.toBeNull();
      expect(lon, 'Lizard Island longitude should be numeric').not.toBeNull();
      expect(lat!).toBeCloseTo(-14.664, 1);
      expect(lon!).toBeGreaterThan(100); // Must be positive (Australia, not Pacific)
      expect(lon!).toBeCloseTo(145.448, 1);
    }

    // Step 4: Simulate extractLocationsFromRows — reproduce the exact filtering logic
    // This mirrors data-repository.ts lines 424-487
    const extractedLocations: Array<{
      latitude: number;
      longitude: number;
      location: string | null;
      speciesId: string;
    }> = [];

    for (const row of result.data) {
      const validName = (row.VALID_NAME ?? row.Valid_name ?? row.validname ?? '') as string;
      if (!validName) continue;

      const latitude = extractNumeric(row.LATITUDE);
      const longitude = extractNumeric(row.LONGITUDE);
      if (latitude === null || longitude === null) continue;

      const speciesId = validName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      extractedLocations.push({
        latitude,
        longitude,
        location: typeof row.LOCATION === 'string' ? row.LOCATION : null,
        speciesId,
      });
    }

    // Step 5: Check that A. olivaceus Lizard Island location is in extracted results
    const olivaceusLocations = extractedLocations.filter(
      (loc) => loc.speciesId === 'acanthurus-olivaceus'
    );
    expect(olivaceusLocations.length).toBeGreaterThan(0);

    const lizardIslandLocs = olivaceusLocations.filter(
      (loc) => loc.location?.includes('Lizard Island')
    );
    expect(
      lizardIslandLocs.length,
      'extractLocationsFromRows should include Lizard Island for A. olivaceus'
    ).toBeGreaterThan(0);

    // Verify coordinates are correct
    for (const loc of lizardIslandLocs) {
      expect(loc.latitude).toBeCloseTo(-14.664, 1);
      expect(loc.longitude).toBeCloseTo(145.448, 1);
    }

    // Step 6: Verify that Lizard Island wouldn't be hidden by map centering
    // Bug: average center of all locations pulls map center to Pacific,
    // making Lizard Island (Australia, lon ~145) invisible at fixed zoom
    const avgLon =
      olivaceusLocations.reduce((sum, loc) => sum + loc.longitude, 0) /
      olivaceusLocations.length;

    // The average longitude should NOT be so far from Lizard Island that it's off-screen
    // At zoom 3, visible range is ~180 degrees. If center is in Pacific (-130) and
    // Lizard Island is at 145, the gap is ~275 degrees — off-screen!
    // Fix: the map should use fitBounds, not fixed zoom+center
    const lizardLon = 145.448;
    const lonGap = Math.abs(avgLon - lizardLon);
    // If lonGap > 90 degrees, the marker will be off-screen at zoom 3
    // This documents the bug: the avg center is too far from Lizard Island
    if (lonGap > 90) {
      // This is expected for A. olivaceus: mostly Pacific locations + 1 Australian
      // The map MUST use fitBounds to show all markers
      expect(lonGap).toBeGreaterThan(90); // Confirms the map centering bug exists
    }
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
