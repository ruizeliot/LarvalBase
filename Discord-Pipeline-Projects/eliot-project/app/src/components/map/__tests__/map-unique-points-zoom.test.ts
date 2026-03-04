/**
 * Test that map zoom for single UNIQUE GPS points uses maxZoom 3,
 * even when multiple location records share the same coordinates.
 *
 * Bug: The map used locations.length === 1 to detect single points,
 * but multiple records from the same GPS point gave length > 1,
 * causing zoom 12 instead of 3.
 *
 * Fix: Count unique GPS coordinates, not total records.
 */

describe('map zoom based on unique GPS points', () => {
  /**
   * Helper that replicates the zoom logic from leaflet-map.tsx
   */
  function getMaxZoom(locations: Array<{ latitude: number; longitude: number }>): number {
    // Count unique GPS coordinates
    const uniqueCoords = new Set(
      locations.map(loc => `${loc.latitude.toFixed(4)},${loc.longitude.toFixed(4)}`)
    );
    return uniqueCoords.size === 1 ? 3 : 12;
  }

  it('should use maxZoom 3 when all records share the same GPS point', () => {
    // 5 records from the same sampling site
    const locations = [
      { latitude: 21.3069, longitude: -157.8583 },
      { latitude: 21.3069, longitude: -157.8583 },
      { latitude: 21.3069, longitude: -157.8583 },
      { latitude: 21.3069, longitude: -157.8583 },
      { latitude: 21.3069, longitude: -157.8583 },
    ];

    expect(getMaxZoom(locations)).toBe(3);
  });

  it('should use maxZoom 12 when records come from different GPS points', () => {
    const locations = [
      { latitude: 21.3069, longitude: -157.8583 }, // Hawaii
      { latitude: -14.8350, longitude: 145.6753 },  // Lizard Island
    ];

    expect(getMaxZoom(locations)).toBe(12);
  });

  it('should use maxZoom 3 for a truly single location record', () => {
    const locations = [
      { latitude: 21.3069, longitude: -157.8583 },
    ];

    expect(getMaxZoom(locations)).toBe(3);
  });

  it('should handle slight coordinate variations as the same point (4 decimal places)', () => {
    // Coordinates that differ by less than 0.0001 degree (~11m) should be grouped
    const locations = [
      { latitude: 21.30691, longitude: -157.85832 },
      { latitude: 21.30689, longitude: -157.85828 },
    ];

    // After rounding to 4 decimal places, these are the same point
    expect(getMaxZoom(locations)).toBe(3);
  });
});
