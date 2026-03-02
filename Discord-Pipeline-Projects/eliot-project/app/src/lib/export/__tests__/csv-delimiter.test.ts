/**
 * Test: CSV export uses '@' as column delimiter (not comma).
 */
import { describe, it, expect } from 'vitest';
import { generateCSV } from '../csv-utils';

describe('CSV delimiter', () => {
  it('should use @ as column delimiter', () => {
    const data = [
      { A: '1', B: '2', C: '3' },
    ];
    const csv = generateCSV(data);
    const lines = csv.split(/\r?\n/);
    // Header
    expect(lines[0]).toBe('A@B@C');
    // Data row
    expect(lines[1]).toBe('1@2@3');
  });

  it('should not use comma as delimiter', () => {
    const data = [
      { COL1: 'val1', COL2: 'val2' },
    ];
    const csv = generateCSV(data);
    expect(csv).not.toContain(',');
    expect(csv).toContain('@');
  });
});
