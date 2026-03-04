/**
 * Tests for n_sp subscript rendering in TraitCard.
 * "sp" should be rendered as a <sub> subscript in all n_sp labels.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { TraitCard } from '../trait-card';

describe('n_sp subscript rendering', () => {
  it('should show "No known values" when species has no data even if genus stats available', () => {
    const { container } = render(
      <TraitCard
        label="Settlement Age"
        mean={null}
        sd={null}
        min={null}
        max={null}
        unit="days"
        n={0}
        genusStats={{
          level: 'genus',
          name: 'Dascyllus',
          traitType: 'settlement_age',
          stats: { mean: 25.5, sd: 3.2, min: 20, max: 30, n: 5 },
          speciesCount: 5,
        }}
      />
    );

    // Should show "No known values" instead of genus average fallback
    expect(container.textContent).toContain('No known values');
  });

  it('should render n_sp with <sub> tag in comparison stats row', () => {
    const { container } = render(
      <TraitCard
        label="Settlement Age"
        mean={30}
        sd={5}
        min={20}
        max={40}
        unit="days"
        n={10}
        genusStats={{
          level: 'genus',
          name: 'Dascyllus',
          traitType: 'settlement_age',
          stats: { mean: 25.5, sd: 3.2, min: 20, max: 30, n: 5 },
          speciesCount: 5,
        }}
        familyStats={{
          level: 'family',
          name: 'Pomacentridae',
          traitType: 'settlement_age',
          stats: { mean: 28.0, sd: 4.0, min: 18, max: 38, n: 15 },
          speciesCount: 15,
        }}
      />
    );

    // Should have <sub> elements for both genus and family comparison rows
    const subs = container.querySelectorAll('sub');
    const spSubs = Array.from(subs).filter((sub) => sub.textContent === 'sp');
    expect(spSubs.length).toBeGreaterThanOrEqual(2);
  });
});
