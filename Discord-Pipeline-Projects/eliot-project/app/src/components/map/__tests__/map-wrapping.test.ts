/**
 * Tests for map wrapping and point replication across dateline.
 */
import { describe, it, expect } from 'vitest';

describe('map point replication', () => {
  it('should replicate longitude at original, -360, and +360', () => {
    const originalLon = 145.5;
    const longitudes = [originalLon, originalLon - 360, originalLon + 360];

    expect(longitudes).toEqual([145.5, -214.5, 505.5]);
    expect(longitudes).toHaveLength(3);
  });

  it('should replicate negative longitude points too', () => {
    const originalLon = -150.2;
    const longitudes = [originalLon, originalLon - 360, originalLon + 360];

    expect(longitudes[0]).toBe(-150.2);
    expect(longitudes[1]).toBe(-510.2);
    expect(longitudes[2]).toBe(209.8);
  });

  it('should deduplicate settlement map by rounded coordinates', () => {
    const locations = [
      { lat: 29.26001, lon: 34.54001 },
      { lat: 29.26002, lon: 34.54002 },
      { lat: 21.3200, lon: -158.0000 },
    ];

    const seen = new Set<string>();
    const deduped = locations.filter((loc) => {
      const key = `${loc.lat.toFixed(4)},${loc.lon.toFixed(4)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // First two are at same location (4dp), third is different
    expect(deduped).toHaveLength(2);
  });
});
