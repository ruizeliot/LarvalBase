/**
 * Tests for species ID certainty labels and scale color labels.
 *
 * - Sure ID: green #00BA38
 * - Unsure ID: red #F8766D
 * - Scale TRUE: green 50% transparency rgba(0, 186, 56, 0.5)
 * - Scale FALSE: red 50% transparency rgba(248, 118, 109, 0.5)
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ImageCaption } from '../image-caption';

describe('Species ID certainty labels', () => {
  it('should show green "Sure ID" label when uncertain=false', () => {
    render(
      <ImageCaption
        author="Bartick (2026) - Instagram page"
        displayAuthor="Bartick (2026) - Instagram page"
        uncertain={false}
      />
    );

    const label = screen.getByText('(Sure ID)');
    expect(label).toBeDefined();
    // JSDOM normalizes hex to rgb
    expect(label.style.color).toBe('rgb(0, 186, 56)');
  });

  it('should show red "Unsure ID" label when uncertain=true', () => {
    render(
      <ImageCaption
        author="Some Author"
        displayAuthor="Some Author"
        uncertain={true}
      />
    );

    const label = screen.getByText('(Unsure ID)');
    expect(label).toBeDefined();
    expect(label.style.color).toBe('rgb(248, 118, 109)');
  });

  it('should show "Picture source:" format', () => {
    render(
      <ImageCaption
        author="Bartick (2026) - Instagram page"
        displayAuthor="Bartick (2026) - Instagram page"
        uncertain={false}
        link="https://example.com"
      />
    );

    expect(screen.getByText(/Picture source:/)).toBeDefined();
  });

  it('should show green scale text when scale=true', () => {
    render(
      <ImageCaption
        author="Test Author"
        displayAuthor="Test Author"
        uncertain={false}
        scale={true}
      />
    );

    const scaleEl = screen.getByText(/Specimen size or scale available/);
    expect(scaleEl).toBeDefined();
    expect(scaleEl.style.color).toBe('rgba(0, 186, 56, 0.5)');
  });

  it('should show red scale text when scale=false', () => {
    render(
      <ImageCaption
        author="Test Author"
        displayAuthor="Test Author"
        uncertain={false}
        scale={false}
      />
    );

    const scaleEl = screen.getByText(/Specimen size or scale unavailable/);
    expect(scaleEl).toBeDefined();
    expect(scaleEl.style.color).toBe('rgba(248, 118, 109, 0.5)');
  });

  it('should not show scale info when scale is undefined', () => {
    render(
      <ImageCaption
        author="Test Author"
        displayAuthor="Test Author"
        uncertain={false}
      />
    );

    expect(screen.queryByText(/Specimen size or scale/)).toBeNull();
  });
});
