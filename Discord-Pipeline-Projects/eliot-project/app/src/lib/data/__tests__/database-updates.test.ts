/**
 * Tests for US-1.4: Update settlement & vertical position databases to 01.2026.
 *
 * Must verify:
 * 1. Settlement size database is the 01.2026 version
 * 2. Vertical position database is the latest available version
 * 3. All database files listed in LOCAL_TRAIT_FILES are loadable
 * 4. Database version mapping is defined for tracking
 */
import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { DATABASE_VERSIONS, getDatabaseVersion } from '../database-versions';
import { LOCAL_TRAIT_FILES } from '../local-data';

const DATA_DIR = path.join(process.cwd(), 'data');

describe('US-1.4: Database Updates (01.2026)', () => {
  it('should have a database versions registry', () => {
    expect(DATABASE_VERSIONS).toBeDefined();
    expect(typeof DATABASE_VERSIONS).toBe('object');
  });

  it('should track settlement_size as 01.2026 version', () => {
    const version = getDatabaseVersion('settlement_size_database.csv');
    expect(version).toBe('01.2026');
  });

  it('should track vertical_position version', () => {
    const version = getDatabaseVersion('vertical_position_database.csv');
    expect(version).toBeDefined();
    // Should be the latest available
    expect(version).toMatch(/\d{2}\.\d{4}/);
  });

  it('should track settlement_age version', () => {
    const version = getDatabaseVersion('settlement_age_database.csv');
    expect(version).toBeDefined();
    expect(version).toMatch(/\d{2}\.\d{4}/);
  });

  it('should have all LOCAL_TRAIT_FILES as actual files in data/', async () => {
    const existingFiles = await fs.readdir(DATA_DIR);

    for (const traitFile of LOCAL_TRAIT_FILES) {
      expect(
        existingFiles.includes(traitFile),
        `Expected ${traitFile} to exist in data/ directory`
      ).toBe(true);
    }
  });

  it('settlement_size_database.csv should have valid data', async () => {
    const content = await fs.readFile(
      path.join(DATA_DIR, 'settlement_size_database.csv'),
      'utf-8'
    );
    // Should have header + data rows
    const lines = content.trim().split('\n');
    expect(lines.length).toBeGreaterThan(100);
    // Header should contain expected columns
    expect(lines[0]).toContain('VALID_NAME');
    expect(lines[0]).toContain('SET_SIZE');
  });

  it('vertical_position_database.csv should have valid data', async () => {
    const content = await fs.readFile(
      path.join(DATA_DIR, 'vertical_position_database.csv'),
      'utf-8'
    );
    const lines = content.trim().split('\n');
    expect(lines.length).toBeGreaterThan(100);
    expect(lines[0]).toContain('VALID_NAME');
  });

  it('Lizard Island coordinates should use correct positive longitude (~145.4)', async () => {
    // Lizard Island is in Queensland, Australia: lat ~-14.664, lon ~145.448
    // Old data had wrong negative longitude -145.5 (Pacific Ocean)
    const files = ['settlement_age_database.csv', 'settlement_size_database.csv'];

    for (const file of files) {
      const content = await fs.readFile(path.join(DATA_DIR, file), 'utf-8');
      const lines = content.split('\n');

      for (const line of lines) {
        // Only check lines that mention Lizard Island AND have coordinate data (not NA)
        if (line.includes('"Lizard Island"') && !line.includes('@NA@NA@')) {
          // Should NOT have the old wrong negative longitude
          expect(line, `${file}: Lizard Island still has wrong longitude -145.5`).not.toContain('-145.5');
        }
      }
    }
  });
});
