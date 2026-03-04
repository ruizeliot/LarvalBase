/**
 * Test that Settlement-stage sampling locations uses inline SVG instead of <img>.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Settlement sampling icon', () => {
  it('species-detail should use SettlementSamplingIcon component (not img tag)', () => {
    const filePath = path.resolve(__dirname, '../species-detail.tsx');
    const source = fs.readFileSync(filePath, 'utf-8');
    // Should import the inline SVG component
    expect(source).toContain('SettlementSamplingIcon');
    // Should NOT use <img> with the Settlement-stage URL-encoded path
    expect(source).not.toMatch(/src=.*Settlement-stage.*sampling/);
  });

  it('settlement-sampling-icon.tsx should export an inline SVG component', () => {
    const filePath = path.resolve(__dirname, '../settlement-sampling-icon.tsx');
    const source = fs.readFileSync(filePath, 'utf-8');
    expect(source).toContain('<svg');
    expect(source).toContain('viewBox="0 0 48.625 48.625"');
    expect(source).toContain('export function SettlementSamplingIcon');
  });
});
