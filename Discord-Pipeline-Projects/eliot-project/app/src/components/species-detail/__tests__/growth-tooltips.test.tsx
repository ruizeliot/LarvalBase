/**
 * Tests for US-4.2: Tooltips showing "Age: …" and "Size: …" on hover.
 *
 * Must:
 * 1. Tooltip label for X value shows "Age: {value}" not "x: {value}"
 * 2. Tooltip entries for curves show "Size: {value}" label
 * 3. Tooltip for scatter points shows "Age:" and "Size:" labels
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GrowthTooltip } from '../species-growth-chart';

describe('US-4.2: Growth chart tooltips', () => {
  it('should display "Age: {value}" as tooltip header', () => {
    render(
      <GrowthTooltip
        active={true}
        label={15.5}
        payload={[
          {
            color: '#d73027',
            name: 'Ruiz 2024',
            value: 8.3,
            dataKey: 'curve-0',
            payload: {},
          },
        ]}
      />
    );

    expect(screen.getByText(/Age:\s*15\.50/)).toBeInTheDocument();
  });

  it('should display "Size:" label for curve values', () => {
    render(
      <GrowthTooltip
        active={true}
        label={20}
        payload={[
          {
            color: '#d73027',
            name: 'Ruiz 2024',
            value: 12.45,
            dataKey: 'curve-0',
            payload: {},
          },
        ]}
      />
    );

    expect(screen.getByText(/Size:\s*12\.45/)).toBeInTheDocument();
  });

  it('should not render when inactive', () => {
    const { container } = render(
      <GrowthTooltip
        active={false}
        label={10}
        payload={[]}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should not render when payload is empty', () => {
    const { container } = render(
      <GrowthTooltip
        active={true}
        label={10}
        payload={[]}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should show multiple entries with Size label', () => {
    render(
      <GrowthTooltip
        active={true}
        label={30}
        payload={[
          { color: '#d73027', name: 'Ref A', value: 18.2, dataKey: 'c-0', payload: {} },
          { color: '#4575b4', name: 'Ref B', value: 14.7, dataKey: 'c-1', payload: {} },
        ]}
      />
    );

    expect(screen.getByText(/Age:\s*30\.00/)).toBeInTheDocument();
    expect(screen.getByText(/Size:\s*18\.20/)).toBeInTheDocument();
    expect(screen.getByText(/Size:\s*14\.70/)).toBeInTheDocument();
  });
});
