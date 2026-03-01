/**
 * Tests for US-0.1: Replace all family SVGs with 608 new ones.
 *
 * Verifies:
 * 1. app/public/family-icons/ contains at least 608 SVGs
 * 2. All SVGs from the new set are present
 * 3. Placeholder SVG still exists
 */
import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';

const FAMILY_ICONS_DIR = path.join(process.cwd(), 'public', 'family-icons');
const NEW_SVGS_DIR = path.join(process.cwd(), '..', 'eliot-svgs-update', 'all_families_svg_black');

describe('US-0.1: Family SVG Icons Update', () => {
  it('should have at least 608 SVG files in public/family-icons/', async () => {
    const files = await fs.readdir(FAMILY_ICONS_DIR);
    const svgFiles = files.filter(f => f.endsWith('.svg') && !f.startsWith('placeholder') && !f.startsWith('_placeholder'));
    expect(svgFiles.length).toBeGreaterThanOrEqual(608);
  });

  it('should include all 608 new SVGs from eliot-svgs-update/all_families_svg_black/', async () => {
    const newFiles = await fs.readdir(NEW_SVGS_DIR);
    const newSvgs = newFiles.filter(f => f.endsWith('.svg'));
    const installedFiles = await fs.readdir(FAMILY_ICONS_DIR);
    const installedSet = new Set(installedFiles);

    const missing: string[] = [];
    for (const svg of newSvgs) {
      if (!installedSet.has(svg)) {
        missing.push(svg);
      }
    }
    expect(missing, `Missing SVGs: ${missing.join(', ')}`).toHaveLength(0);
  });

  it('should keep the placeholder SVG', async () => {
    const files = await fs.readdir(FAMILY_ICONS_DIR);
    const hasPlaceholder = files.some(f => f.includes('placeholder'));
    expect(hasPlaceholder).toBe(true);
  });

  it('each new SVG should be a valid SVG file (spot check first 5)', async () => {
    const newFiles = await fs.readdir(NEW_SVGS_DIR);
    const svgs = newFiles.filter(f => f.endsWith('.svg')).slice(0, 5);

    for (const svg of svgs) {
      const content = await fs.readFile(path.join(FAMILY_ICONS_DIR, svg), 'utf-8');
      expect(content, `${svg} should contain <svg`).toContain('<svg');
    }
  });
});
