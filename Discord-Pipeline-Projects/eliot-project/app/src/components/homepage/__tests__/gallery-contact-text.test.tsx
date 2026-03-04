/**
 * Tests for Fix 6: Contact text on family gallery page.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { FamilyGallery } from '../family-gallery';

describe('Family gallery contact text', () => {
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
              images: [{ imageUrl: '/test.jpg', species: 'Acanthurus triostegus', genus: 'Acanthurus', author: 'BW', uncertain: false, level: 'species' }],
            }],
          },
        ],
        familyImages: [],
      }),
    });
  });

  it('should display contact email text at the top of the gallery', async () => {
    render(
      <FamilyGallery family="Acanthuridae" onBack={vi.fn()} onSelectSpecies={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText(/eliotruiz3@gmail\.com/)).toBeInTheDocument();
    });
  });

  it('should mention identification errors in the contact text', async () => {
    render(
      <FamilyGallery family="Acanthuridae" onBack={vi.fn()} onSelectSpecies={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText(/identification error/i)).toBeInTheDocument();
    });
  });
});
