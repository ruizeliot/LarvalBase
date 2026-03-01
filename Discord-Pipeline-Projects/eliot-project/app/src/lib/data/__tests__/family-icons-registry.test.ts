/**
 * Tests for Epic 0 Fix: Family icons registry path.
 *
 * Verifies that the image registry scans public/family-icons/ (not adult_svg_fishbase/)
 * so that familiesWithIcons set is populated correctly.
 */
import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';

const FAMILY_ICONS_DIR = path.join(process.cwd(), 'public', 'family-icons');
const WRONG_DIR = path.join(process.cwd(), 'adult_svg_fishbase');

describe('Family icons registry path fix', () => {
  it('public/family-icons/ should exist and contain 608+ SVGs', async () => {
    const files = await fs.readdir(FAMILY_ICONS_DIR);
    const svgFiles = files.filter(f => f.endsWith('.svg') && f !== 'placeholder.svg');
    expect(svgFiles.length).toBeGreaterThanOrEqual(608);
  });

  it('adult_svg_fishbase/ should NOT exist (old incorrect path)', async () => {
    let exists = true;
    try {
      await fs.access(WRONG_DIR);
    } catch {
      exists = false;
    }
    expect(exists).toBe(false);
  });

  it('image-registry.ts should reference public/family-icons not adult_svg_fishbase', async () => {
    const registrySource = await fs.readFile(
      path.join(process.cwd(), 'src', 'lib', 'data', 'image-registry.ts'),
      'utf-8'
    );
    expect(registrySource).toContain("'public', 'family-icons'");
    expect(registrySource).not.toContain('adult_svg_fishbase');
  });
});
