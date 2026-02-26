/**
 * Persistent in-memory CSV cache singleton.
 *
 * Unlike the LRU cache, this cache:
 * - Loads all CSV files once on first access
 * - Keeps data in memory permanently (no TTL expiry)
 * - Only clears on manual invalidation or server restart
 *
 * This eliminates repeated CSV re-parsing and ensures sub-second API responses.
 */

/**
 * Cache statistics for monitoring.
 */
export interface CacheStats {
  /** Number of raw CSV files loaded */
  fileCount: number;
  /** Total bytes of raw CSV content in memory */
  rawBytes: number;
  /** Number of parsed data entries */
  parsedCount: number;
  /** Whether initial load is complete */
  loaded: boolean;
  /** Timestamp of last load */
  loadedAt: Date | null;
}

/**
 * Persistent in-memory data cache.
 * Stores both raw CSV text and parsed row arrays.
 */
class DataCache {
  private rawCSVs = new Map<string, string>();
  private parsedDataMap = new Map<string, unknown[]>();
  private loaded = false;
  private loadedAt: Date | null = null;

  /**
   * Check if initial data load is complete.
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * This cache has no TTL — data persists until manually cleared.
   */
  hasTTL(): boolean {
    return false;
  }

  /**
   * Mark the cache as loaded/unloaded.
   */
  setLoaded(value: boolean): void {
    this.loaded = value;
    if (value) {
      this.loadedAt = new Date();
    }
  }

  /**
   * Store raw CSV content by filename.
   */
  setRawCSV(filename: string, content: string): void {
    this.rawCSVs.set(filename, content);
  }

  /**
   * Get raw CSV content by filename.
   */
  getRawCSV(filename: string): string | undefined {
    return this.rawCSVs.get(filename);
  }

  /**
   * Check if raw CSV exists for filename.
   */
  hasRawCSV(filename: string): boolean {
    return this.rawCSVs.has(filename);
  }

  /**
   * Store parsed data rows by filename.
   */
  setParsedData(filename: string, data: unknown[]): void {
    this.parsedDataMap.set(filename, data);
  }

  /**
   * Get parsed data rows by filename.
   */
  getParsedData(filename: string): unknown[] | undefined {
    return this.parsedDataMap.get(filename);
  }

  /**
   * Get count of loaded files.
   */
  getFileCount(): number {
    return this.rawCSVs.size;
  }

  /**
   * Get cache statistics.
   */
  getStats(): CacheStats {
    let rawBytes = 0;
    for (const content of this.rawCSVs.values()) {
      rawBytes += content.length * 2; // Approximate UTF-16 byte size
    }

    return {
      fileCount: this.rawCSVs.size,
      rawBytes,
      parsedCount: this.parsedDataMap.size,
      loaded: this.loaded,
      loadedAt: this.loadedAt,
    };
  }

  /**
   * Clear all cached data.
   */
  clear(): void {
    this.rawCSVs.clear();
    this.parsedDataMap.clear();
    this.loaded = false;
    this.loadedAt = null;
  }
}

/**
 * Singleton instance — persists for server lifetime.
 */
let instance: DataCache | null = null;

/**
 * Get or create the persistent data cache singleton.
 */
export function getDataCache(): DataCache {
  if (!instance) {
    instance = new DataCache();
  }
  return instance;
}

/**
 * Reset singleton (for testing only).
 */
export function resetDataCache(): void {
  instance = null;
}
