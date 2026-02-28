/**
 * Tests for US-4.3: Growth curves colored by Spectral scale based on temperature.
 *
 * Must:
 * 1. Cool temperatures (~18°C) produce blue colors
 * 2. Warm temperatures (~32°C) produce red colors
 * 3. Mid temperatures (~25°C) produce green/yellow colors
 * 4. Single temperature value maps to central green
 * 5. Unknown temperature gets a default neutral color
 * 6. Temperature gradient legend bar is rendered
 */
import { describe, it, expect } from 'vitest';
import { temperatureToSpectralColor, SPECTRAL_COLORS } from '@/lib/types/growth.types';

describe('US-4.3: Spectral color scale for growth curves', () => {
  it('should return blue-ish color for cold temperatures (18°C)', () => {
    const color = temperatureToSpectralColor(18);
    // Spectral blue range: #4575b4 area
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    // Blue channel should be dominant
    const r = parseInt(color.slice(1, 3), 16);
    const b = parseInt(color.slice(5, 7), 16);
    expect(b).toBeGreaterThan(r);
  });

  it('should return red-ish color for warm temperatures (32°C)', () => {
    const color = temperatureToSpectralColor(32);
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    // Red channel should be dominant
    const r = parseInt(color.slice(1, 3), 16);
    const b = parseInt(color.slice(5, 7), 16);
    expect(r).toBeGreaterThan(b);
  });

  it('should return green/yellow for mid temperatures (~25°C)', () => {
    const color = temperatureToSpectralColor(25);
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    // Green channel should be high
    const g = parseInt(color.slice(3, 5), 16);
    expect(g).toBeGreaterThan(150);
  });

  it('should clamp temperatures below 18°C to cold blue', () => {
    const color = temperatureToSpectralColor(10);
    const colorAt18 = temperatureToSpectralColor(18);
    expect(color).toBe(colorAt18);
  });

  it('should clamp temperatures above 32°C to warm red', () => {
    const color = temperatureToSpectralColor(40);
    const colorAt32 = temperatureToSpectralColor(32);
    expect(color).toBe(colorAt32);
  });

  it('should return a neutral gray for null temperature', () => {
    const color = temperatureToSpectralColor(null);
    expect(color).toBe('#6b7280');
  });

  it('should export SPECTRAL_COLORS array with defined stops', () => {
    expect(SPECTRAL_COLORS).toBeDefined();
    expect(SPECTRAL_COLORS.length).toBeGreaterThanOrEqual(5);
  });
});
