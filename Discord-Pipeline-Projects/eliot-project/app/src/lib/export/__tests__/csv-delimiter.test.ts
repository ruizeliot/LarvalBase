/**
 * Test: CSV export uses '@' as column delimiter with all fields quoted.
 */
import { describe, it, expect } from 'vitest';
import { generateCSV } from '../csv-utils';

describe('CSV delimiter and quoting', () => {
  it('should use @ as column delimiter with all fields quoted', () => {
    const data = [
      { A: '1', B: '2', C: '3' },
    ];
    const txt = generateCSV(data);
    const lines = txt.split(/\r?\n/);
    // Header — all fields quoted
    expect(lines[0]).toBe('"A"@"B"@"C"');
    // Data row — all fields quoted
    expect(lines[1]).toBe('"1"@"2"@"3"');
  });

  it('should not use comma as delimiter', () => {
    const data = [
      { COL1: 'val1', COL2: 'val2' },
    ];
    const txt = generateCSV(data);
    expect(txt).not.toContain(',');
    expect(txt).toContain('@');
  });

  it('should properly quote fields containing @ or ; or newlines', () => {
    const data = [
      { A: 'value@with@at', B: 'value;with;semicolon', C: 'line1\nline2' },
    ];
    const txt = generateCSV(data);
    // All fields are always quoted, so special chars are safe
    expect(txt).toContain('"value@with@at"');
    expect(txt).toContain('"value;with;semicolon"');
  });

  it('should quote null and undefined values as empty quoted fields', () => {
    const data = [
      { ORDER: null, FAMILY: 'Pomacentridae', EXT_REF: undefined },
    ];
    const txt = generateCSV(data);
    const lines = txt.split(/\r?\n/);
    // Every field MUST be quoted, including null/undefined (as empty string)
    expect(lines[1]).toBe('""@"Pomacentridae"@""');
  });

  it('should preserve semicolons in EXT_REF fields', () => {
    const data = [
      {
        ORDER: 'Ovalentaria incertae sedis',
        FAMILY: 'Pomacentridae',
        EXT_REF: 'Fishelson 1964; Danilowicz & Brown 1992',
      },
    ];
    const txt = generateCSV(data);
    // Semicolons must be preserved exactly as-is inside quoted fields
    expect(txt).toContain('"Fishelson 1964; Danilowicz & Brown 1992"');
  });

  it('should escape internal double quotes as double-double quotes', () => {
    const data = [
      { A: 'value with "quotes" inside' },
    ];
    const txt = generateCSV(data);
    expect(txt).toContain('"value with ""quotes"" inside"');
  });

  it('should quote numeric values', () => {
    const data = [
      { A: 42, B: 3.14 },
    ];
    const txt = generateCSV(data);
    const lines = txt.split(/\r?\n/);
    expect(lines[1]).toBe('"42"@"3.14"');
  });
});
