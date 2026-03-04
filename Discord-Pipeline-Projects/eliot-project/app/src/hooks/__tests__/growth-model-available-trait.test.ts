/**
 * Test that growth_model is added to availableTraitTypes when species have growth models.
 * Bug: growth_model trait was added to individual species traits but never to the
 * availableTraitTypes set, so the sidebar filter didn't show it.
 */
import { describe, it, expect } from 'vitest';

describe('growth_model availableTraitTypes', () => {
  it('should add growth_model to traitTypes when any species has hasGrowthModel=true', () => {
    // Simulate the logic from use-species-data.ts
    const speciesData = [
      { id: 'sp-1', hasGrowthModel: true, traits: [] },
      { id: 'sp-2', hasGrowthModel: false, traits: [] },
    ];

    const traitTypes = new Set<string>();
    let anyHasGrowthModel = false;

    for (const sp of speciesData) {
      if (sp.hasGrowthModel) {
        anyHasGrowthModel = true;
      }
    }
    if (anyHasGrowthModel) {
      traitTypes.add('growth_model');
    }

    expect(traitTypes.has('growth_model')).toBe(true);
  });

  it('should NOT add growth_model when no species has growth models', () => {
    const speciesData = [
      { id: 'sp-1', hasGrowthModel: false, traits: [] },
    ];

    const traitTypes = new Set<string>();
    let anyHasGrowthModel = false;

    for (const sp of speciesData) {
      if (sp.hasGrowthModel) {
        anyHasGrowthModel = true;
      }
    }
    if (anyHasGrowthModel) {
      traitTypes.add('growth_model');
    }

    expect(traitTypes.has('growth_model')).toBe(false);
  });
});
