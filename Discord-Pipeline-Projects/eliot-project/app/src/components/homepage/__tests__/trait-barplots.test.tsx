/**
 * Tests for US-2.2: Horizontal barplots showing record/species/genus/family/order counts per trait.
 *
 * Barplots must:
 * 1. Show one horizontal bar per trait database
 * 2. Each bar has 5 colored segments: Records, Species, Genus, Family, Order
 * 3. Colors match PRD spec: #F8766D=Order, #A3A500=Family, #00BF7D=Genus, #00B0F6=Species, #E76BF3=Row
 * 4. A legend identifies each color
 * 5. Flat colors only - NO gradients
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TraitBarplots } from '../trait-barplots';

const mockStats = [
  {
    traitName: 'Egg traits',
    records: 1240,
    species: 890,
    genus: 412,
    family: 186,
    order: 42,
  },
  {
    traitName: 'Settlement',
    records: 850,
    species: 680,
    genus: 320,
    family: 140,
    order: 35,
  },
];

describe('US-2.2: Horizontal barplots counts per trait', () => {
  it('should render a bar row for each trait', () => {
    render(<TraitBarplots stats={mockStats} />);

    expect(screen.getByText('Egg traits')).toBeInTheDocument();
    expect(screen.getByText('Settlement')).toBeInTheDocument();
  });

  it('should display a legend with all 5 categories', () => {
    render(<TraitBarplots stats={mockStats} />);

    expect(screen.getByText('Row')).toBeInTheDocument();
    expect(screen.getByText('Species')).toBeInTheDocument();
    expect(screen.getByText('Genus')).toBeInTheDocument();
    expect(screen.getByText('Family')).toBeInTheDocument();
    expect(screen.getByText('Order')).toBeInTheDocument();
  });

  it('should render segment values as text', () => {
    render(<TraitBarplots stats={mockStats} />);

    // Check that counts are rendered
    expect(screen.getByText('1,240')).toBeInTheDocument();
    expect(screen.getByText('890')).toBeInTheDocument();
  });

  it('should use correct PRD colors in legend dots', () => {
    const { container } = render(<TraitBarplots stats={mockStats} />);

    // Check legend dots have correct background colors
    const legendDots = container.querySelectorAll('[data-testid="legend-dot"]');
    const colors = Array.from(legendDots).map(
      (dot) => (dot as HTMLElement).style.backgroundColor
    );

    // PRD colors mapped to rgb
    expect(colors).toContain('rgb(248, 118, 109)'); // #F8766D - Records (Order color in PRD)
    expect(colors).toContain('rgb(0, 176, 246)');    // #00B0F6 - Species
  });

  it('should render nothing when stats is empty', () => {
    const { container } = render(<TraitBarplots stats={[]} />);
    expect(container.querySelector('[data-testid="barplots-container"]')).toBeNull();
  });
});
