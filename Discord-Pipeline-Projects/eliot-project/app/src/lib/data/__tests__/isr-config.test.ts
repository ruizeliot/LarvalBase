/**
 * Tests for US-1.3: ISR pre-render for species pages.
 *
 * Species pages must:
 * 1. Export revalidate = 3600 (1 hour)
 * 2. Export generateStaticParams for pre-rendering
 * 3. Have a proper page component that accepts params
 */
import { describe, it, expect, vi } from 'vitest';

// Mock all heavy dependencies that species page imports
vi.mock('@/lib/services/species.service', () => ({
  getSpeciesList: vi.fn().mockResolvedValue([
    { id: 'acanthurus-triostegus', validName: 'Acanthurus triostegus', commonName: null, order: 'Acanthuriformes', family: 'Acanthuridae', genus: 'Acanthurus' },
  ]),
  getSpeciesWithTraits: vi.fn().mockResolvedValue({
    species: { id: 'acanthurus-triostegus', scientificName: 'Acanthurus triostegus' },
    traits: {},
    locations: [],
    references: [],
  }),
  getAllSpeciesWithTaxonomy: vi.fn().mockResolvedValue({
    species: [],
    traitsBySpecies: new Map(),
    fetchedAt: new Date(),
  }),
}));

vi.mock('@/lib/data/image-registry', () => ({
  getSpeciesWithImages: vi.fn().mockResolvedValue(new Set()),
  getImagesForSpecies: vi.fn().mockResolvedValue([]),
}));

describe('US-1.3: ISR Pre-render Configuration', () => {
  it('should export revalidate = 3600 from species page', async () => {
    const mod = await import('@/app/species/[id]/page');
    expect(mod.revalidate).toBe(3600);
  });

  it('should export generateStaticParams function', async () => {
    const mod = await import('@/app/species/[id]/page');
    expect(typeof mod.generateStaticParams).toBe('function');
  });

  it('should generate params for all species', async () => {
    const mod = await import('@/app/species/[id]/page');
    const params = await mod.generateStaticParams();

    expect(Array.isArray(params)).toBe(true);
    expect(params.length).toBeGreaterThan(0);
    expect(params[0]).toHaveProperty('id');
  });

  it('should export a default page component', async () => {
    const mod = await import('@/app/species/[id]/page');
    expect(mod.default).toBeDefined();
  });
});
