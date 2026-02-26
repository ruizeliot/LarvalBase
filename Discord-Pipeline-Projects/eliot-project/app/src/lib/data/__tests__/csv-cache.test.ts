/**
 * Tests for US-1.2: CSV in-memory cache.
 *
 * The cache must:
 * 1. Load all CSV files once on first access
 * 2. Keep parsed data in memory permanently (no TTL expiry)
 * 3. Return cached data on subsequent calls without re-parsing
 * 4. Support manual invalidation via clearCache()
 * 5. Be a singleton (same instance across imports)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock fs to avoid real file system access
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    readdir: vi.fn(),
  },
}));

// We'll import after mocking
let csvCacheModule: typeof import('../csv-cache');

describe('US-1.2: CSV In-Memory Cache', () => {
  beforeEach(async () => {
    // Reset modules to get fresh singleton
    vi.resetModules();
    csvCacheModule = await import('../csv-cache');
  });

  it('should be a singleton - same instance across calls', () => {
    const cache1 = csvCacheModule.getDataCache();
    const cache2 = csvCacheModule.getDataCache();
    expect(cache1).toBe(cache2);
  });

  it('should not have data before initialization', () => {
    const cache = csvCacheModule.getDataCache();
    expect(cache.isLoaded()).toBe(false);
  });

  it('should keep data in memory permanently (no TTL)', () => {
    const cache = csvCacheModule.getDataCache();
    // The cache should NOT use LRU TTL - data stays forever until manually cleared
    expect(cache.hasTTL()).toBe(false);
  });

  it('should support manual cache invalidation', () => {
    const cache = csvCacheModule.getDataCache();
    // Set some test data
    cache.setRawCSV('test.csv', 'col1@col2\nval1@val2');
    expect(cache.hasRawCSV('test.csv')).toBe(true);

    cache.clear();
    expect(cache.hasRawCSV('test.csv')).toBe(false);
    expect(cache.isLoaded()).toBe(false);
  });

  it('should store and retrieve raw CSV content by filename', () => {
    const cache = csvCacheModule.getDataCache();
    const csvContent = 'VALID_NAME@FAMILY@ORDER\nAcanthurus triostegus@Acanthuridae@Acanthuriformes';

    cache.setRawCSV('settlement_age_database.csv', csvContent);

    expect(cache.hasRawCSV('settlement_age_database.csv')).toBe(true);
    expect(cache.getRawCSV('settlement_age_database.csv')).toBe(csvContent);
  });

  it('should store and retrieve parsed data', () => {
    const cache = csvCacheModule.getDataCache();
    const parsedData = [
      { VALID_NAME: 'Acanthurus triostegus', FAMILY: 'Acanthuridae' },
    ];

    cache.setParsedData('settlement_age_database.csv', parsedData);
    expect(cache.getParsedData('settlement_age_database.csv')).toEqual(parsedData);
  });

  it('should track loaded file count', () => {
    const cache = csvCacheModule.getDataCache();
    expect(cache.getFileCount()).toBe(0);

    cache.setRawCSV('file1.csv', 'data');
    cache.setRawCSV('file2.csv', 'data');
    expect(cache.getFileCount()).toBe(2);
  });

  it('should report memory estimate', () => {
    const cache = csvCacheModule.getDataCache();
    cache.setRawCSV('test.csv', 'a'.repeat(1000));

    const stats = cache.getStats();
    expect(stats.rawBytes).toBeGreaterThan(0);
    expect(stats.fileCount).toBe(1);
  });

  it('should mark as loaded after setLoaded()', () => {
    const cache = csvCacheModule.getDataCache();
    expect(cache.isLoaded()).toBe(false);

    cache.setLoaded(true);
    expect(cache.isLoaded()).toBe(true);
  });
});
