/**
 * Tests for Fix 5: Map maximum zoom for single points.
 * When only a single GPS point is shown, the map should not zoom in excessively.
 * MaxZoom should be around 10-12 for context.
 */
import { describe, it, expect } from 'vitest';

// We test the fitBounds maxZoom config indirectly by checking the source code
// The leaflet-map.tsx already has maxZoom: 10 in fitBounds options
// This test validates the configuration value
describe('map single point zoom limit', () => {
  it('should have maxZoom between 10 and 12 in fitBounds config', async () => {
    // Read the source to verify the maxZoom config
    const fs = await import('fs');
    const path = await import('path');
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/components/map/leaflet-map.tsx'),
      'utf-8'
    );

    // Check fitBounds has maxZoom
    const fitBoundsMatch = source.match(/fitBounds\([^)]+maxZoom:\s*(\d+)/);
    expect(fitBoundsMatch).not.toBeNull();
    const maxZoom = parseInt(fitBoundsMatch![1], 10);
    expect(maxZoom).toBeGreaterThanOrEqual(10);
    expect(maxZoom).toBeLessThanOrEqual(12);
  });
});
