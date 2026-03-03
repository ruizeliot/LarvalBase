/**
 * Test: CSV export uses ';' as column delimiter with NO field quoting.
 */
import { describe, it, expect, vi } from 'vitest';
import { generateCSV, downloadCSV } from '../csv-utils';

describe('CSV delimiter and formatting', () => {
  it('should use ; as column delimiter with no quoting', () => {
    const data = [
      { A: '1', B: '2', C: '3' },
    ];
    const txt = generateCSV(data);
    const lines = txt.split(/\r?\n/);
    // Header — unquoted, semicolon-delimited
    expect(lines[0]).toBe('A;B;C');
    // Data row — unquoted, semicolon-delimited
    expect(lines[1]).toBe('1;2;3');
  });

  it('should not use @ or comma as delimiter', () => {
    const data = [
      { COL1: 'val1', COL2: 'val2' },
    ];
    const txt = generateCSV(data);
    expect(txt).not.toContain('@');
    expect(txt).not.toContain(',');
    expect(txt).toContain(';');
  });

  it('should replace semicolons in field values with " -"', () => {
    const data = [
      { A: 'value;with;semicolon', B: 'clean' },
    ];
    const txt = generateCSV(data);
    expect(txt).toContain('value -with -semicolon');
  });

  it('should output empty string for null and undefined values', () => {
    const data = [
      { ORDER: null, FAMILY: 'Pomacentridae', EXT_REF: undefined },
    ];
    const txt = generateCSV(data);
    const lines = txt.split(/\r?\n/);
    expect(lines[1]).toBe(';Pomacentridae;');
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
    expect(txt).toContain('Fishelson 1964 - Danilowicz & Brown 1992');
  });

  it('should not quote numeric values', () => {
    const data = [
      { A: 42, B: 3.14 },
    ];
    const txt = generateCSV(data);
    const lines = txt.split(/\r?\n/);
    expect(lines[1]).toBe('42;3.14');
  });

  it('should export Dascyllus aruanus egg data matching gold standard format', () => {
    const data = [
      {
        ORDER: 'Ovalentaria incertae sedis',
        FAMILY: 'Pomacentridae',
        GENUS: 'Dascyllus',
        VALID_NAME: 'Dascyllus aruanus',
        TYPE: 'Egg length',
        MEAN: 0.75,
        EXT_REF: 'Fishelson 1964 - Danilowicz & Brown 1992',
        REFERENCE: 'Some reference',
      },
    ];
    const txt = generateCSV(data);
    const lines = txt.split(/\r?\n/);

    // Semicolons used as delimiter
    expect(lines[0]).toBe('ORDER;FAMILY;GENUS;VALID_NAME;TYPE;MEAN;EXT_REF;REFERENCE');
    // No @ delimiter
    expect(txt).not.toContain('@');

    // The data row must have exactly the same number of ; delimiters as the header
    const headerDelimiters = (lines[0].match(/;/g) || []).length;
    const dataDelimiters = (lines[1].match(/;/g) || []).length;
    expect(dataDelimiters).toBe(headerDelimiters);
  });

  it('downloadCSV should use .csv extension', () => {
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

    expect(mockLink.download).toBe('test-export.csv');

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });
});
