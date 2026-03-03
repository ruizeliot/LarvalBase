/**
 * Tests for section icon sizing in white round.
 * Icons should be 44×44 inside a 56×56 white circle.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { TraitGroup } from '../trait-group';

// Mock fetch for family chart data
vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false })));

describe('section icon sizing', () => {
  it('should render section icon with 56px circle and 44px icon', () => {
    const { container } = render(
      <TraitGroup
        title="Settlement"
        traits={[{
          traitKey: 'settlement_age',
          name: 'Settlement Age',
          stats: { mean: 30, sd: 5, min: 20, max: 40, n: 10 },
          unit: 'days',
        }]}
      />
    );

    const circle = container.querySelector('[title="Settlement"]') as HTMLElement;
    expect(circle).toBeTruthy();
    expect(circle.style.width).toBe('56px');
    expect(circle.style.height).toBe('56px');

    const img = circle.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('width')).toBe('44');
    expect(img?.getAttribute('height')).toBe('44');
  });
});
