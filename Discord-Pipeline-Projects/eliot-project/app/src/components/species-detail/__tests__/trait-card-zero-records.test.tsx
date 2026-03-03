/**
 * Test: TraitCard shows 0 records as grey non-clickable text.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TraitCard } from '../trait-card';

describe('TraitCard 0 records', () => {
  it('should show "0 records" as grey non-clickable text when n=0', () => {
    render(
      <TraitCard
        label="Egg diameter"
        mean={null}
        sd={null}
        min={null}
        max={null}
        unit="mm"
        n={0}
      />
    );

    const zeroRecords = screen.getByText('0 records');
    // Should be a span, not a button
    expect(zeroRecords.tagName).toBe('SPAN');
    // Should have muted foreground color class
    expect(zeroRecords.className).toContain('text-muted-foreground');
  });

  it('should show clickable link when n > 0', () => {
    const onClick = vi.fn();
    render(
      <TraitCard
        label="Egg diameter"
        mean={0.75}
        sd={0.1}
        min={0.5}
        max={1.0}
        unit="mm"
        n={5}
        onRecordsClick={onClick}
      />
    );

    const recordsLink = screen.getByText('5 records');
    expect(recordsLink.tagName).toBe('BUTTON');
    expect(recordsLink.className).toContain('text-primary');
  });
});
