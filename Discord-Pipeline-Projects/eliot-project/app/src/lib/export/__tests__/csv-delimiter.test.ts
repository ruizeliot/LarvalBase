/**
 * Test: CSV export uses '@' as column delimiter with all fields quoted.
 */
import { describe, it, expect, vi } from 'vitest';
import { generateCSV, downloadCSV } from '../csv-utils';

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

  it('should properly quote fields containing @ or newlines, and replace semicolons', () => {
    const data = [
      { A: 'value@with@at', B: 'value;with;semicolon', C: 'line1\nline2' },
    ];
    const txt = generateCSV(data);
    // All fields are always quoted, so special chars are safe
    expect(txt).toContain('"value@with@at"');
    // Semicolons replaced with ' -'
    expect(txt).toContain('"value -with -semicolon"');
    expect(txt).not.toContain(';');
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

  it('should replace semicolons with dashes in field values', () => {
    const data = [
      {
        ORDER: 'Ovalentaria incertae sedis',
        FAMILY: 'Pomacentridae',
        EXT_REF: 'Fishelson 1964; Danilowicz & Brown 1992',
      },
    ];
    const txt = generateCSV(data);
    // Semicolons must be replaced with ' -' to prevent Excel splitting
    expect(txt).toContain('"Fishelson 1964 - Danilowicz & Brown 1992"');
    expect(txt).not.toContain(';');
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

  it('should export Dascyllus aruanus egg data with semicolons replaced by dashes', () => {
    const data = [
      {
        ORDER: 'Ovalentaria incertae sedis',
        FAMILY: 'Pomacentridae',
        GENUS: 'Dascyllus',
        VALID_NAME: 'Dascyllus aruanus',
        TYPE: 'Egg diameter',
        MEAN: 0.75,
        EXT_REF: 'Fishelson 1964; Danilowicz & Brown 1992',
        REFERENCE: 'Some reference',
      },
    ];
    const txt = generateCSV(data);
    const lines = txt.split(/\r?\n/);

    // Semicolons must be replaced with ' -'
    expect(lines[1]).toContain('"Fishelson 1964 - Danilowicz & Brown 1992"');
    // No semicolons should remain anywhere in the output
    expect(txt).not.toContain(';');

    // The data row must have exactly the same number of @ delimiters as the header
    const headerDelimiters = (lines[0].match(/@/g) || []).length;
    const dataDelimiters = (lines[1].match(/@/g) || []).length;
    expect(dataDelimiters).toBe(headerDelimiters);
  });

  it('downloadCSV should use .txt extension to prevent Excel auto-parsing', () => {
    // Export as .csv with @ delimiter — semicolons replaced in values
    // Mock DOM APIs
    const mockLink = {
      href: '',
      download: '',
      style: { display: '' },
      click: vi.fn(),
    };
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockReturnValue(mockLink as any);
    const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockReturnValue(mockLink as any);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined);

    downloadCSV([{ A: '1' }], 'test-export');

    // File extension must be .csv
    expect(mockLink.download).toBe('test-export.csv');

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });
});
