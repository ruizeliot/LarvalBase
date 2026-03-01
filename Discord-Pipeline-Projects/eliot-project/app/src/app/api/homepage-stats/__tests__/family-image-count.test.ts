/**
 * Tests for family image count correctness.
 *
 * Verifies that image counts include ALL images per family,
 * not just images up to the first certain blackwater image.
 */
import { describe, it, expect } from 'vitest';
import type { SpeciesImage } from '@/lib/types/image.types';

/**
 * Simulate the image counting logic from families/route.ts
 * to verify it counts all images without early termination.
 */
function countFamilyImages(
  imagesBySpecies: Map<string, SpeciesImage[]>
): Map<string, number> {
  const familyImageCount = new Map<string, number>();
  for (const images of imagesBySpecies.values()) {
    for (const img of images) {
      if (!img.family) continue;
      familyImageCount.set(img.family, (familyImageCount.get(img.family) ?? 0) + 1);
    }
  }
  return familyImageCount;
}

function makeImage(overrides: Partial<SpeciesImage>): SpeciesImage {
  return {
    author: 'Blackwater',
    displayAuthor: 'Photographer',
    uncertain: false,
    path: 'classified_bw_images_species',
    filename: 'test.jpg',
    sourceDescription: 'Blackwater — Species ID confirmed',
    priority: 1,
    speciesName: 'Test species',
    family: 'Testidae',
    order: 'Testiformes',
    ...overrides,
  };
}

describe('Family image count', () => {
  it('should count ALL images per family, not stop at first certain blackwater', () => {
    const imagesBySpecies = new Map<string, SpeciesImage[]>();

    // Species with 5 images: 1 certain BW + 4 CRIOBE
    imagesBySpecies.set('Testus testus', [
      makeImage({ author: 'Blackwater', uncertain: false, priority: 1, filename: 'bw1.jpg' }),
      makeImage({ author: 'CRIOBE', uncertain: false, priority: 5, filename: 'c1.jpg' }),
      makeImage({ author: 'CRIOBE', uncertain: false, priority: 5, filename: 'c2.jpg' }),
      makeImage({ author: 'CRIOBE', uncertain: false, priority: 5, filename: 'c3.jpg' }),
      makeImage({ author: 'CRIOBE', uncertain: false, priority: 5, filename: 'c4.jpg' }),
    ]);

    const counts = countFamilyImages(imagesBySpecies);
    // Must count ALL 5, not just 1 (the blackwater one)
    expect(counts.get('Testidae')).toBe(5);
  });

  it('should count images across multiple species in same family', () => {
    const imagesBySpecies = new Map<string, SpeciesImage[]>();

    imagesBySpecies.set('Testus alpha', [
      makeImage({ speciesName: 'Testus alpha', filename: 'a1.jpg' }),
      makeImage({ speciesName: 'Testus alpha', filename: 'a2.jpg' }),
    ]);
    imagesBySpecies.set('Testus beta', [
      makeImage({ speciesName: 'Testus beta', filename: 'b1.jpg' }),
      makeImage({ speciesName: 'Testus beta', filename: 'b2.jpg' }),
      makeImage({ speciesName: 'Testus beta', filename: 'b3.jpg' }),
    ]);

    const counts = countFamilyImages(imagesBySpecies);
    expect(counts.get('Testidae')).toBe(5);
  });
});
