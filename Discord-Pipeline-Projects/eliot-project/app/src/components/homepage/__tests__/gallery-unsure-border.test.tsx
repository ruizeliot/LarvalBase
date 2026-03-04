/**
 * Tests for Fix 7: Unsure ID red border on family gallery images.
 * - Unsure ID images should have a thin red #F8766D border
 * - Sure ID images should NOT have the border
 * - Hover tooltip "Unsure ID" on red-bordered images
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { FamilyGallery } from '../family-gallery';

describe('Unsure ID red border on gallery', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        family: 'Acanthuridae',
        genusSections: [
          {
            genusName: 'Acanthurus',
            genusImages: [],
            speciesSubsections: [{
              speciesName: 'Acanthurus triostegus',
              images: [
                { imageUrl: '/sure.jpg', species: 'Acanthurus triostegus', genus: 'Acanthurus', author: 'BW', uncertain: false, level: 'species' },
                { imageUrl: '/unsure.jpg', species: 'Acanthurus triostegus', genus: 'Acanthurus', author: 'BW', uncertain: true, level: 'species' },
              ],
            }],
          },
        ],
        familyImages: [],
      }),
    });
  });

  it('should render unsure images with red border and sure images without', async () => {
    render(
      <FamilyGallery family="Acanthuridae" onBack={vi.fn()} onSelectSpecies={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('family-gallery')).toBeInTheDocument();
    });

    // Find all image containers (cursor-pointer divs)
    const imageContainers = screen.getByTestId('family-gallery').querySelectorAll('.cursor-pointer');
    expect(imageContainers.length).toBe(2);

    // First image (sure) should NOT have red border
    const sureContainer = imageContainers[0];
    expect(sureContainer.className).not.toContain('border-[#F8766D]');

    // Second image (unsure) should have red border
    const unsureContainer = imageContainers[1];
    expect(unsureContainer.className).toContain('border-[#F8766D]');
  });

  it('should show "Unsure ID" title attribute on unsure images', async () => {
    render(
      <FamilyGallery family="Acanthuridae" onBack={vi.fn()} onSelectSpecies={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('family-gallery')).toBeInTheDocument();
    });

    const unsureElements = screen.getByTestId('family-gallery').querySelectorAll('[title="Unsure ID"]');
    expect(unsureElements.length).toBeGreaterThanOrEqual(1);
  });
});
