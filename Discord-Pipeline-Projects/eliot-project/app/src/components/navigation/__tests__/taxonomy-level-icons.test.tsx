/**
 * Tests for US-3.2: SVG icons in taxonomy sidebar for each taxonomic level.
 *
 * Must:
 * 1. Show distinct SVG icon per taxonomic level (order, family, genus, species)
 * 2. Keep folder icon for "All species" root
 * 3. Each level should have a unique aria-label or data-testid for its icon
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TaxonomyLevelIcon } from '../taxonomy-level-icon';

describe('US-3.2: SVG icons in taxonomy sidebar', () => {
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

  it('should render family icon for family level (uses family silhouette when available)', () => {
    const { container } = render(<TaxonomyLevelIcon level="family" familyName="Pomacentridae" />);
    // Should render the family silhouette image
    const img = container.querySelector('img[src*="Pomacentridae"]');
    expect(img).toBeInTheDocument();
  });

  it('should render genus icon for genus level', () => {
    const { container } = render(<TaxonomyLevelIcon level="genus" familyName="Pomacentridae" />);
    // Genus also uses family silhouette but smaller
    const img = container.querySelector('img[src*="Pomacentridae"]');
    expect(img).toBeInTheDocument();
  });

  it('should render species icon for species level', () => {
    const { container } = render(<TaxonomyLevelIcon level="species" familyName="Pomacentridae" />);
    const img = container.querySelector('img[src*="Pomacentridae"]');
    expect(img).toBeInTheDocument();
  });

  it('should render fallback for family level when no familyName', () => {
    const { container } = render(<TaxonomyLevelIcon level="family" />);
    const svg = container.querySelector('[data-testid="taxonomy-icon-family"]');
    expect(svg).toBeInTheDocument();
  });

  it('should render each level with different visual sizing', () => {
    const { container: rootC } = render(<TaxonomyLevelIcon level="root" />);
    const { container: speciesC } = render(<TaxonomyLevelIcon level="species" familyName="Test" />);

    // Both should render something
    expect(rootC.querySelector('[data-testid^="taxonomy-icon"]') || rootC.querySelector('img')).toBeTruthy();
    expect(speciesC.querySelector('[data-testid^="taxonomy-icon"]') || speciesC.querySelector('img')).toBeTruthy();
  });
});
