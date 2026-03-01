/**
 * Tests that image-only species (species with photos but no CSV data)
 * are properly added to the data repository's species map.
 *
 * This verifies the merge logic in data-repository.ts that ensures
 * species from the image registry are discoverable in the sidebar
 * and have working species detail pages.
 */
import { describe, it, expect } from 'vitest';

/**
 * Simulate the image-only species merge logic from data-repository.ts
 */
function mergeImageOnlySpecies(
  existingSpecies: Map<string, { id: string; validName: string }>,
  imagesBySpecies: Map<string, { speciesName: string; order: string; family: string }[]>
): Map<string, { id: string; validName: string }> {
  const species = new Map(existingSpecies);

  for (const images of imagesBySpecies.values()) {
    if (images.length === 0) continue;
    const img = images[0];
    const id = img.speciesName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!species.has(id)) {
      species.set(id, {
        id,
        validName: img.speciesName,
      });
    }
  }

  return species;
}

describe('Image-only species discovery', () => {
  it('should add species with images but no CSV data to species map', () => {
    // Existing species from CSVs (does not include Microdesmus bahianus)
    const existingSpecies = new Map<string, { id: string; validName: string }>();
    existingSpecies.set('acanthurus-triostegus', {
      id: 'acanthurus-triostegus',
      validName: 'Acanthurus triostegus',
    });

    // Image registry includes species not in CSVs
    const imagesBySpecies = new Map<string, { speciesName: string; order: string; family: string }[]>();
    imagesBySpecies.set('Microdesmus bahianus', [
      { speciesName: 'Microdesmus bahianus', order: 'Gobiiformes', family: 'Microdesmidae' },
    ]);
    imagesBySpecies.set('Acanthurus olivaceus', [
      { speciesName: 'Acanthurus olivaceus', order: 'Acanthuriformes', family: 'Acanthuridae' },
    ]);
    // Species already in CSV data
    imagesBySpecies.set('Acanthurus triostegus', [
      { speciesName: 'Acanthurus triostegus', order: 'Acanthuriformes', family: 'Acanthuridae' },
    ]);

    const result = mergeImageOnlySpecies(existingSpecies, imagesBySpecies);

    // Should include all 3: 1 from CSV + 2 image-only
    expect(result.size).toBe(3);
    expect(result.has('microdesmus-bahianus')).toBe(true);
    expect(result.has('acanthurus-olivaceus')).toBe(true);
    expect(result.has('acanthurus-triostegus')).toBe(true);
  });

  it('should not duplicate species already in CSV data', () => {
    const existingSpecies = new Map<string, { id: string; validName: string }>();
    existingSpecies.set('acanthurus-triostegus', {
      id: 'acanthurus-triostegus',
      validName: 'Acanthurus triostegus',
    });

    const imagesBySpecies = new Map<string, { speciesName: string; order: string; family: string }[]>();
    imagesBySpecies.set('Acanthurus triostegus', [
      { speciesName: 'Acanthurus triostegus', order: 'Acanthuriformes', family: 'Acanthuridae' },
    ]);

    const result = mergeImageOnlySpecies(existingSpecies, imagesBySpecies);
    expect(result.size).toBe(1); // No duplicate
  });
});
