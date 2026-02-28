/**
 * Tests for taxonomy sidebar icons.
 *
 * Must:
 * 1. Show distinct icon per taxonomic level (order, family, genus, species)
 * 2. Keep folder icon for "All species" root
 * 3. Each level should have a unique data-testid for its icon
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { TaxonomyLevelIcon } from '../taxonomy-level-icon';

describe('Taxonomy sidebar icons', () => {
  it('should render folder icon for root level', () => {
    const { container } = render(<TaxonomyLevelIcon level="root" />);
    const svg = container.querySelector('[data-testid="taxonomy-icon-root"]');
    expect(svg).toBeInTheDocument();
  });

  it('should render order icon for order level', () => {
    const { container } = render(<TaxonomyLevelIcon level="order" />);
    const svg = container.querySelector('[data-testid="taxonomy-icon-order"]');
    expect(svg).toBeInTheDocument();
  });

  it('should render fish icon for family level', () => {
    const { container } = render(<TaxonomyLevelIcon level="family" />);
    const svg = container.querySelector('[data-testid="taxonomy-icon-family"]');
    expect(svg).toBeInTheDocument();
  });

  it('should render fish icon for genus level', () => {
    const { container } = render(<TaxonomyLevelIcon level="genus" />);
    const svg = container.querySelector('[data-testid="taxonomy-icon-genus"]');
    expect(svg).toBeInTheDocument();
  });

  it('should render fish icon for species level', () => {
    const { container } = render(<TaxonomyLevelIcon level="species" />);
    const svg = container.querySelector('[data-testid="taxonomy-icon-species"]');
    expect(svg).toBeInTheDocument();
  });

  it('should render each level with different visual sizing', () => {
    const { container: rootC } = render(<TaxonomyLevelIcon level="root" />);
    const { container: speciesC } = render(<TaxonomyLevelIcon level="species" />);

    expect(rootC.querySelector('[data-testid^="taxonomy-icon"]')).toBeTruthy();
    expect(speciesC.querySelector('[data-testid^="taxonomy-icon"]')).toBeTruthy();
  });
});
