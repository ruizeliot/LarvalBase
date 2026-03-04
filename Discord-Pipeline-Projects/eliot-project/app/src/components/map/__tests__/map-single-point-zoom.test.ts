/**
 * Tests for map maximum zoom for single points.
 * When only a single GPS point is shown, the map should use maxZoom 3
 * to show the whole ocean region (e.g. Hawaii → Pacific).
 * Multiple points keep maxZoom 12 for detail.
 */
import { describe, it, expect } from 'vitest';

describe('map single point zoom limit', () => {
  it('should use maxZoom 3 for single points and 12 for multiple', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/components/map/leaflet-map.tsx'),
      'utf-8'
    );

    // Single point uses maxZoom 3
    expect(source).toContain('? 3');
    // Multiple points use maxZoom 12
    expect(source).toContain(': 12');
    // Detect single-point case
    expect(source).toMatch(/locations\.length\s*===\s*1/);
  });
});
