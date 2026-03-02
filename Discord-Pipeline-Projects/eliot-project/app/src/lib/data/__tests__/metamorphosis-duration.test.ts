/**
 * Tests for Epic 9 Fix: Metamorphosis Duration panel.
 *
 * The metamorphosis age database contains MET_DURATION_MEAN/MIN/MAX columns.
 * These should be extracted as a separate 'metamorphosis_duration' trait.
 */
import { describe, it, expect } from 'vitest';

describe('Metamorphosis duration trait extraction', () => {
  it('should extract metamorphosis_duration traits from the data', async () => {
    const { getOrLoadData } = await import('../data-repository');
    const data = await getOrLoadData();

    let durationCount = 0;
    for (const [, traits] of data.traitsBySpecies) {
      for (const trait of traits) {
        if (trait.traitType === 'metamorphosis_duration') {
          durationCount++;
        }
      }
    }

    // We know there are 734 rows with duration data
    expect(durationCount).toBeGreaterThan(0);
  });

  it('metamorphosis_duration traits should have unit "days"', async () => {
    const { getOrLoadData } = await import('../data-repository');
    const data = await getOrLoadData();

    for (const [, traits] of data.traitsBySpecies) {
      for (const trait of traits) {
        if (trait.traitType === 'metamorphosis_duration') {
          expect(trait.unit).toBe('days');
          return; // Just need to verify one
        }
      }
    }
  });

  it('metamorphosis_duration traits should have min/max metadata', async () => {
    const { getOrLoadData } = await import('../data-repository');
    const data = await getOrLoadData();

    let found = false;
    for (const [, traits] of data.traitsBySpecies) {
      for (const trait of traits) {
        if (trait.traitType === 'metamorphosis_duration' && trait.value !== null) {
          // Should have metadata with potential min/max from metadataWithMinMaxConf
          expect(trait.metadata).toBeDefined();
          found = true;
          break;
        }
      }
      if (found) break;
    }

    expect(found).toBe(true);
  });
});

describe('Metamorphosis section config', () => {
  it('DISPLAY_GROUPS should include metamorphosis_duration', async () => {
    const { DISPLAY_GROUPS } = await import('@/components/species-detail/species-detail-config');
    const metGroup = DISPLAY_GROUPS.find(g => g.title === 'Metamorphosis');
    expect(metGroup).toBeDefined();
    expect(metGroup!.traits).toContain('metamorphosis_duration');
  });

  it('TRAIT_UNITS should have metamorphosis_duration as days', async () => {
    const { TRAIT_UNITS } = await import('@/components/species-detail/species-detail-config');
    expect(TRAIT_UNITS.metamorphosis_duration).toBe('days');
  });

  it('TRAIT_GROUPS should include metamorphosis_duration', async () => {
    const { TRAIT_GROUPS } = await import('@/lib/constants/trait-groups');
    const metGroup = TRAIT_GROUPS.find(g => g.name === 'Metamorphosis');
    expect(metGroup).toBeDefined();
    expect(metGroup!.traits).toContain('metamorphosis_duration');
  });
});
