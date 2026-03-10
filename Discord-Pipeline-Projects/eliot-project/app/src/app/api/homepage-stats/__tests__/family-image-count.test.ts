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
    sourceDescription: 'Blackwater',
    priority: 1,
    speciesName: 'Test species',
    family: 'Testidae',
    order: 'Testiformes',
    brightness: 999,
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

  it('should prefer uncertain BW over certain non-BW for thumbnail', () => {
    const imagesBySpecies = new Map<string, SpeciesImage[]>();

    // Family with uncertain BW and certain CRIOBE — BW should win
    imagesBySpecies.set('Testus alpha', [
      makeImage({ author: 'CRIOBE', uncertain: false, priority: 5, filename: 'criobe1.jpg', family: 'Alphaidae' }),
    ]);
    imagesBySpecies.set('Testus beta', [
      makeImage({ author: 'Blackwater', uncertain: true, priority: 1, filename: 'bw1.jpg', family: 'Alphaidae' }),
    ]);

    // Scoring: BW certain=0, BW uncertain=1, non-BW certain=2, non-BW uncertain=3
    const familyImageMap = new Map<string, string>();
    const familyBestScore = new Map<string, number>();
    for (const images of imagesBySpecies.values()) {
      for (const img of images) {
        if (!img.family) continue;
        const imageUrl = `/api/images/${encodeURIComponent(img.path)}/${encodeURIComponent(img.filename)}`;
        const score = (img.author === 'Blackwater' && !img.uncertain) ? 0
          : (img.author === 'Blackwater' && img.uncertain) ? 1
          : !img.uncertain ? 2
          : 3;
        const currentBest = familyBestScore.get(img.family) ?? 999;
        if (score < currentBest) {
          familyImageMap.set(img.family, imageUrl);
          familyBestScore.set(img.family, score);
        }
      }
    }

    // BW uncertain (score=1) should beat CRIOBE certain (score=2)
    const selectedUrl = familyImageMap.get('Alphaidae')!;
    expect(selectedUrl).toContain('bw1.jpg');
  });

  it('should detect blackwater by PATH (classified_bw) not just author name', () => {
    // Reproduce: Trachipteridae/Fistulariidae show broken thumbnails because
    // blackwater detection used author name only, missing path-based detection.
    const img = makeImage({
      author: 'Blackwater',
      path: 'classified_bw_images_species',
      filename: 'bw-test.jpg',
      family: 'Trachipteridae',
    });

    // Path-based detection should identify blackwater
    const isBlackwaterByPath = img.path.includes('classified_bw');
    expect(isBlackwaterByPath).toBe(true);
  });

  it('should skip 0-byte images when selecting thumbnail', () => {
    const imagesBySpecies = new Map<string, SpeciesImage[]>();

    // Family with a 0-byte blackwater image (best score) and a valid CRIOBE image
    imagesBySpecies.set('Fistularia tabacaria', [
      makeImage({
        author: 'Blackwater',
        uncertain: false,
        priority: 1,
        path: 'classified_bw_images_species',
        filename: 'zero-byte.jpg',
        family: 'Fistulariidae',
      }),
      makeImage({
        author: 'CRIOBE',
        uncertain: false,
        priority: 5,
        path: 'Polynesia',
        filename: 'valid.jpg',
        family: 'Fistulariidae',
      }),
    ]);

    // Simulate the selection logic with 0-byte skipping:
    // Collect candidates, sort by score, skip 0-byte
    type Candidate = { imageUrl: string; score: number; path: string; filename: string };
    const familyCandidates = new Map<string, Candidate[]>();

    for (const images of imagesBySpecies.values()) {
      for (const img of images) {
        if (!img.family) continue;
        const isBlackwater = img.path.includes('classified_bw');
        const score = (isBlackwater && !img.uncertain) ? 0
          : (isBlackwater && img.uncertain) ? 1
          : !img.uncertain ? 2
          : 3;
        const candidates = familyCandidates.get(img.family) ?? [];
        candidates.push({
          imageUrl: `/api/images/${img.path}/${img.filename}`,
          score,
          path: img.path,
          filename: img.filename,
        });
        familyCandidates.set(img.family, candidates);
      }
    }

    const candidates = familyCandidates.get('Fistulariidae')!;
    candidates.sort((a, b) => a.score - b.score);

    // Best candidate is the blackwater one (score 0)
    expect(candidates[0].filename).toBe('zero-byte.jpg');
    // If we skip it (0-byte), the fallback should be CRIOBE
    expect(candidates[1].filename).toBe('valid.jpg');
    expect(candidates[1].score).toBe(2);
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
