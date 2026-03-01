/**
 * Tests for species ID certainty labels.
 *
 * User QA feedback: certain ID should show green label,
 * uncertain ID should show red label (was yellow before).
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ImageCaption } from '../image-caption';

describe('Species ID certainty labels', () => {
  it('should show green "Sure ID" label when uncertain=false', () => {
    render(
      <ImageCaption
        author="Blackwater"
        displayAuthor="Frank Baensch"
        uncertain={false}
        sourceDescription="Blackwater"
      />
    );

    const label = screen.getByText('(Sure ID)');
    expect(label).toBeDefined();
    expect(label.className).toContain('text-green');
  });

  it('should show red "Unsure ID" label when uncertain=true', () => {
    render(
      <ImageCaption
        author="CRIOBE"
        displayAuthor="CRIOBE"
        uncertain={true}
        sourceDescription="Polynesia — CRIOBE field collection"
      />
    );

    const label = screen.getByText('(Unsure ID)');
    expect(label).toBeDefined();
    expect(label.className).toContain('text-red');
  });

  it('should render certainty label below the Photo author line', () => {
    const { container } = render(
      <ImageCaption
        author="Blackwater"
        displayAuthor="Frank Baensch"
        uncertain={false}
        sourceDescription="Blackwater"
      />
    );

    // The caption should be a flex column — Photo author on one line, certainty below
    const photoLine = screen.getByText(/Photo: Frank Baensch/);
    const certaintyLabel = screen.getByText('(Sure ID)');

    // They should be in separate parent elements (not siblings in same flex row)
    expect(photoLine.parentElement).not.toBe(certaintyLabel.parentElement);
  });
});
