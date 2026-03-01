/**
 * Tests for family/genus metadata parsing in homepage families API.
 *
 * Bug fix: fam_ids_pics_metadata.txt and gen_ids_pics_metadata.txt have a
 * leading row-number column in data rows but NO header for it. This causes
 * Papa Parse to misalign columns (FAMILY gets ORDER value instead).
 */
import { describe, it, expect } from 'vitest';
import Papa from 'papaparse';

/**
 * Reproduce the parsing logic from countImagesFromMetadata.
 * This simulates what happens when we parse the metadata files.
 */
function parseMetadataForFamilyCounts(content: string): Map<string, number> {
  const counts = new Map<string, number>();
  Papa.parse(content, {
    delimiter: '@',
    header: true,
    skipEmptyLines: true,
    step: (result) => {
      const row = result.data as Record<string, string>;
      const family = (row.FAMILY || '').replace(/^"|"$/g, '');
      if (family) {
        counts.set(family, (counts.get(family) ?? 0) + 1);
      }
    },
  });
  return counts;
}

/**
 * Fixed parsing that detects and handles the row-number column offset.
 */
function parseMetadataForFamilyCountsFixed(content: string): Map<string, number> {
  const counts = new Map<string, number>();

  // Detect row-number column offset: if first data row has more fields
  // than the header, prepend an empty header for the row-number column.
  const lines = content.split('\n');
  if (lines.length >= 2) {
    const headerFields = lines[0].split('@').length;
    // Find first non-empty data line
    for (let i = 1; i < Math.min(lines.length, 5); i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const dataFields = line.split('@').length;
      if (dataFields === headerFields + 1) {
        lines[0] = '""@' + lines[0];
        content = lines.join('\n');
      }
      break;
    }
  }

  Papa.parse(content, {
    delimiter: '@',
    header: true,
    skipEmptyLines: true,
    step: (result) => {
      const row = result.data as Record<string, string>;
      const family = (row.FAMILY || '').replace(/^"|"$/g, '');
      if (family) {
        counts.set(family, (counts.get(family) ?? 0) + 1);
      }
    },
  });
  return counts;
}

describe('fam_ids_pics_metadata.txt parsing', () => {
  // Actual format from the file: header has NO row number column,
  // but data rows DO have a leading row number field.
  const FAM_IDS_SAMPLE = [
    '"AUTHOR"@"UNCERTAIN"@"ORDER"@"FAMILY"@"PATH"@"FILE_NAME"',
    '"1313"@"Blackwater"@FALSE@"Lampriformes"@"Trachipteridae"@"images/classified_bw_images_family"@"Sure ID - Trachipteridae - ribbonfish.jpg"',
    '"1314"@"Blackwater"@FALSE@"Lampriformes"@"Trachipteridae"@"images/classified_bw_images_family"@"Sure ID - Trachipteridae - ribbonfish2.jpg"',
    '"1714"@"ADLIFISH 1"@TRUE@"Syngnathiformes"@"Fistulariidae"@"images/Maldives"@"M0653 B scale.jpg"',
  ].join('\n');

  it('BUG: naive parsing maps ORDER to FAMILY column (misalignment)', () => {
    const counts = parseMetadataForFamilyCounts(FAM_IDS_SAMPLE);
    // Without fix, FAMILY column gets ORDER values instead
    expect(counts.has('Lampriformes')).toBe(true); // ORDER, not FAMILY!
    expect(counts.has('Trachipteridae')).toBe(false); // actual family missing
  });

  it('FIXED: parsing correctly extracts FAMILY column', () => {
    const counts = parseMetadataForFamilyCountsFixed(FAM_IDS_SAMPLE);
    // With fix, FAMILY column gets actual family names
    expect(counts.has('Trachipteridae')).toBe(true);
    expect(counts.get('Trachipteridae')).toBe(2);
    expect(counts.has('Fistulariidae')).toBe(true);
    expect(counts.get('Fistulariidae')).toBe(1);
    // ORDER values should NOT appear as family names
    expect(counts.has('Lampriformes')).toBe(false);
    expect(counts.has('Syngnathiformes')).toBe(false);
  });
});

describe('gen_ids_pics_metadata.txt parsing', () => {
  // Same issue: header has NO row number column, data rows DO.
  const GEN_IDS_SAMPLE = [
    '"AUTHOR"@"UNCERTAIN"@"ORDER"@"FAMILY"@"GENUS"@"PATH"@"FILE_NAME"',
    '"1"@"Blackwater"@FALSE@"Ophidiiformes"@"Acanthonidae"@"Acanthonus"@"images/classified_bw_images_genus"@"Sure ID - Acanthonus.jpg"',
    '"2"@"Blackwater"@FALSE@"Ophidiiformes"@"Acanthonidae"@"Acanthonus"@"images/classified_bw_images_genus"@"Sure ID - Acanthonus2.jpg"',
  ].join('\n');

  it('FIXED: parsing correctly extracts FAMILY column from gen_ids', () => {
    const counts = parseMetadataForFamilyCountsFixed(GEN_IDS_SAMPLE);
    expect(counts.has('Acanthonidae')).toBe(true);
    expect(counts.get('Acanthonidae')).toBe(2);
    // ORDER value should NOT appear
    expect(counts.has('Ophidiiformes')).toBe(false);
  });
});

describe('sp_ids_pics_metadata.txt parsing (already correct)', () => {
  // sp_ids has the empty "" header for row numbers — no offset issue
  const SP_IDS_SAMPLE = [
    '""@"AUTHOR"@"UNCERTAIN"@"ORDER"@"FAMILY"@"GENUS"@"VALID_NAME"@"PATH"@"FILE_NAME"',
    '"1"@"Blackwater"@FALSE@"Acanthuriformes"@"Acanthuridae"@"Acanthurus"@"Acanthurus olivaceus"@"images/classified_bw_images_species"@"Sure ID - image.jpg"',
  ].join('\n');

  it('sp_ids parsing works correctly (no offset)', () => {
    const counts = parseMetadataForFamilyCountsFixed(SP_IDS_SAMPLE);
    expect(counts.has('Acanthuridae')).toBe(true);
    expect(counts.get('Acanthuridae')).toBe(1);
  });
});
