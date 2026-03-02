/**
 * Test: TXT export uses '@' as column delimiter with all fields quoted.
 */
import { describe, it, expect } from 'vitest';
import { generateCSV } from '../csv-utils';

describe('TXT delimiter and quoting', () => {
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
});
