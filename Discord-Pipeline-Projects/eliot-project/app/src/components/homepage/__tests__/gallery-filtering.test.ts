/**
 * Tests for Fix 5: Gallery sidebar filtering removes species without selected trait.
 * Family/genus-level entries always remain visible.
 */
import { describe, it, expect } from 'vitest';

interface GalleryImage {
  imageUrl: string;
  species: string | null;
  genus: string | null;
  author: string;
  uncertain: boolean;
  level: 'species' | 'genus' | 'family';
}

interface SpeciesSubsection {
  speciesName: string;
  images: GalleryImage[];
}

interface GenusSection {
  genusName: string;
  genusImages: GalleryImage[];
  speciesSubsections: SpeciesSubsection[];
}

interface GalleryData {
  family: string;
  genusSections: GenusSection[];
  familyImages: GalleryImage[];
}

/**
 * Filter logic extracted from FamilyGallery component.
 */
function filterGalleryData(
  data: GalleryData,
  filteredSpeciesNames: Set<string> | null
): GalleryData {
  if (!filteredSpeciesNames) return data;
  const genusSections = data.genusSections
    .map((genus) => ({
      ...genus,
      speciesSubsections: genus.speciesSubsections.filter(
        (sp) => filteredSpeciesNames.has(sp.speciesName)
      ),
    }))
    .filter((genus) => genus.genusImages.length > 0 || genus.speciesSubsections.length > 0);
  return { ...data, genusSections };
}

const mockImage = (species: string | null): GalleryImage => ({
  imageUrl: '/test.jpg',
  species,
  genus: species?.split(' ')[0] ?? null,
  author: 'Author',
  uncertain: false,
  level: species ? 'species' : 'genus',
});

const mockData: GalleryData = {
  family: 'Pomacentridae',
  genusSections: [
    {
      genusName: 'Amphiprion',
      genusImages: [mockImage(null)],
      speciesSubsections: [
        { speciesName: 'Amphiprion ocellaris', images: [mockImage('Amphiprion ocellaris')] },
        { speciesName: 'Amphiprion clarkii', images: [mockImage('Amphiprion clarkii')] },
      ],
    },
    {
      genusName: 'Dascyllus',
      genusImages: [],
      speciesSubsections: [
        { speciesName: 'Dascyllus aruanus', images: [mockImage('Dascyllus aruanus')] },
      ],
    },
  ],
  familyImages: [{ ...mockImage(null), level: 'family' }],
};

describe('gallery filtering by sidebar traits', () => {
  it('should show all species when no filter is active (null)', () => {
    const result = filterGalleryData(mockData, null);
    expect(result.genusSections).toHaveLength(2);
    expect(result.genusSections[0].speciesSubsections).toHaveLength(2);
    expect(result.genusSections[1].speciesSubsections).toHaveLength(1);
  });

  it('should remove species not in filteredSpeciesNames', () => {
    const allowed = new Set(['Amphiprion ocellaris']);
    const result = filterGalleryData(mockData, allowed);
    // Amphiprion genus kept (has genus images + 1 matching species)
    expect(result.genusSections).toHaveLength(1);
    expect(result.genusSections[0].genusName).toBe('Amphiprion');
    expect(result.genusSections[0].speciesSubsections).toHaveLength(1);
    expect(result.genusSections[0].speciesSubsections[0].speciesName).toBe('Amphiprion ocellaris');
  });

  it('should keep genus section with genus-level images even if no species match', () => {
    const allowed = new Set(['Dascyllus aruanus']);
    const result = filterGalleryData(mockData, allowed);
    // Amphiprion kept because it has genusImages
    expect(result.genusSections).toHaveLength(2);
    expect(result.genusSections[0].genusName).toBe('Amphiprion');
    expect(result.genusSections[0].speciesSubsections).toHaveLength(0); // species filtered out
    expect(result.genusSections[0].genusImages).toHaveLength(1); // genus images stay
  });

  it('should always keep family-level images', () => {
    const allowed = new Set<string>(); // empty set - no species pass
    const result = filterGalleryData(mockData, allowed);
    expect(result.familyImages).toHaveLength(1);
  });

  it('should remove genus section with no genus images and no matching species', () => {
    // Dascyllus has no genusImages, so if its only species is filtered out, section is removed
    const allowed = new Set(['Amphiprion ocellaris']);
    const result = filterGalleryData(mockData, allowed);
    const dascyllus = result.genusSections.find(g => g.genusName === 'Dascyllus');
    expect(dascyllus).toBeUndefined();
  });
});
