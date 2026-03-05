/**
 * Tests for species ID certainty labels.
 *
 * User QA feedback: certain ID should show green label,
 * uncertain ID should show red label.
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
    expect(label.className).toContain('text-green');
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
    expect(label.className).toContain('text-red');
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

  it('should show scale info when provided', () => {
    render(
      <ImageCaption
        author="Test Author"
        displayAuthor="Test Author"
        uncertain={false}
        scale={true}
      />
    );

    expect(screen.getByText(/Specimen size or scale available/)).toBeDefined();
  });

  it('should show scale unavailable when scale=false', () => {
    render(
      <ImageCaption
        author="Test Author"
        displayAuthor="Test Author"
        uncertain={false}
        scale={false}
      />
    );

    expect(screen.getByText(/Specimen size or scale unavailable/)).toBeDefined();
  });
});
