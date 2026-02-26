/**
 * Tests for US-1.1: Page load <1s — data repository performance.
 *
 * The data repository must:
 * 1. Use the persistent DataCache instead of LRU cache
 * 2. Return cached data instantly on subsequent calls
 * 3. Load data only once (first call loads, subsequent calls hit cache)
 * 4. Support cache warmup via warmupCache()
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getDataCache, resetDataCache } from '../csv-cache';

// Mock the entire local-data module
vi.mock('../local-data', () => ({
  loadAllLocalCSVs: vi.fn().mockResolvedValue({
    data: new Map([
      ['settlement_age_database.csv', 'VALID_NAME@FAMILY@ORDER@GENUS@SET_AGE_DPH_MEAN\nAcanthurus triostegus@Acanthuridae@Acanthuriformes@Acanthurus@25'],
    ]),
    errors: new Map(),
    loadedAt: new Date(),
  }),
  LOCAL_TRAIT_FILES: ['settlement_age_database.csv'],
  getLocalFileType: vi.fn().mockReturnValue('settlement_age'),
  readLocalCSV: vi.fn(),
  hasLocalData: vi.fn().mockResolvedValue(true),
  listLocalFiles: vi.fn().mockResolvedValue(['settlement_age_database.csv']),
}));

// Mock github-client
vi.mock('../github-client', () => ({
  fetchAllCSVs: vi.fn().mockResolvedValue({ data: new Map(), fetchedAt: new Date() }),
  getFileType: vi.fn().mockReturnValue('settlement_age'),
}));

// Mock schema-validator
vi.mock('../schema-validator', () => ({
  validateParsedCSV: vi.fn().mockReturnValue({
    totalRows: 1,
    validRows: 1,
    invalidRows: 0,
    passRate: 100,
    errors: [],
  }),
}));

// Mock database-registry
vi.mock('../database-registry', () => ({
  buildDatabaseTraitRegistry: vi.fn().mockReturnValue({
    speciesDatabases: new Map(),
    databaseSpecies: new Map(),
  }),
}));

// Mock taxonomy service
vi.mock('@/lib/services/taxonomy.service', () => ({
  buildTaxonomyTree: vi.fn().mockReturnValue({
    name: 'root',
    children: [],
    speciesCount: 1,
  }),
}));

describe('US-1.1: Data repository uses persistent cache', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    resetDataCache();
    // Reset modules so data-repository re-initializes
    vi.resetModules();
  });

  it('should use DataCache singleton (not LRU)', () => {
    const cache = getDataCache();
    expect(cache.hasTTL()).toBe(false);
  });

  it('should expose warmupCache function', async () => {
    const mod = await import('../data-repository');
    expect(typeof mod.warmupCache).toBe('function');
  });

  it('should mark cache as loaded after warmup', async () => {
    const { warmupCache } = await import('../data-repository');
    const csvCacheMod = await import('../csv-cache');
    await warmupCache();

    const cache = csvCacheMod.getDataCache();
    expect(cache.isLoaded()).toBe(true);
  });

  it('should return data from getOrLoadData', async () => {
    const { getOrLoadData } = await import('../data-repository');
    const data = await getOrLoadData();

    expect(data).toBeDefined();
    expect(data.species).toBeInstanceOf(Map);
    expect(data.traitsBySpecies).toBeInstanceOf(Map);
  });

  it('should not re-load files on second getOrLoadData call', async () => {
    const { loadAllLocalCSVs } = await import('../local-data');
    const { getOrLoadData } = await import('../data-repository');

    await getOrLoadData();
    const firstCallCount = vi.mocked(loadAllLocalCSVs).mock.calls.length;

    await getOrLoadData();
    // Should not have called loadAllLocalCSVs again
    expect(vi.mocked(loadAllLocalCSVs).mock.calls.length).toBe(firstCallCount);
  });

  it('should provide cache stats showing memory usage', () => {
    const cache = getDataCache();
    cache.setRawCSV('test.csv', 'a'.repeat(1000));

    const stats = cache.getStats();
    expect(stats.rawBytes).toBeGreaterThan(0);
    expect(stats.fileCount).toBe(1);
  });
});
