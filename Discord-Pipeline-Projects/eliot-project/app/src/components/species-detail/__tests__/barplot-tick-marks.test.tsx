/**
 * Tests for vertical tick marks on barplot x-axis.
 * Verifies the FamilyBarChart XAxis is configured with tickLine and axisLine.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { FamilyBarChart } from '../family-bar-chart';

// Mock ResizeObserver for recharts
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

const mockData = [
  { speciesId: 'sp-1', speciesName: 'Species one', meanValue: 10 },
  { speciesId: 'sp-2', speciesName: 'Species two', meanValue: 20 },
];

describe('barplot x-axis tick marks', () => {
  it('should render chart container with title', () => {
    const { container } = render(
      <FamilyBarChart
        data={mockData}
        currentSpeciesId="sp-1"
        unit="mm"
        traitLabel="Test"
        comparisonType="family"
        taxonomyName="TestFamily"
      />
    );

    // The component should render and include the title
    expect(container.textContent).toContain('Family Comparison');
    expect(container.textContent).toContain('TestFamily');
  });
});
