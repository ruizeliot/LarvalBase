/**
 * Tests for BUG 2: Family click opens gallery page instead of table popup.
 *
 * Must:
 * 1. PhotoGrid calls onSelectFamily (not open a modal) when card is clicked
 * 2. FamilyGallery renders genus sections with images
 * 3. FamilyGallery has lightbox with prev/next/close
 * 4. Species names link to species pages
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PhotoGrid } from '../photo-grid';
import { FamilyGallery } from '../family-gallery';

const mockFamilies = [
  {
    family: 'Acanthuridae',
    order: 'Acanthuriformes',
    imageUrl: '/api/images/test.jpg',
    species: [
      { validName: 'Acanthurus triostegus', genus: 'Acanthurus', records: 42 },
    ],
  },
];

describe('BUG 2: Family gallery navigation', () => {
  it('should call onSelectFamily when a card is clicked (not open modal)', () => {
    const onSelectFamily = vi.fn();
    render(
      <PhotoGrid
        families={mockFamilies}
        onSelectFamily={onSelectFamily}
        onSelectSpecies={vi.fn()}
      />
    );

    const card = screen.getByText('Acanthuridae').closest('[data-testid="photo-card"]');
    fireEvent.click(card!);

    expect(onSelectFamily).toHaveBeenCalledWith('Acanthuridae');
  });

  it('should NOT render any modal/overlay on card click', () => {
    render(
      <PhotoGrid
        families={mockFamilies}
        onSelectFamily={vi.fn()}
        onSelectSpecies={vi.fn()}
      />
    );

    const card = screen.getByText('Acanthuridae').closest('[data-testid="photo-card"]');
    fireEvent.click(card!);

    // No fixed overlay should appear
    expect(document.querySelector('.fixed')).toBeNull();
  });
});

describe('BUG 2: FamilyGallery component', () => {
  beforeEach(() => {
    // Mock fetch for gallery data
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        family: 'Acanthuridae',
        sections: [
          {
            genus: 'Acanthurus',
            images: [
              {
                imageUrl: '/api/images/sp/img1.jpg',
                species: 'Acanthurus triostegus',
                genus: 'Acanthurus',
                author: 'Blackwater',
                uncertain: false,
                level: 'species',
              },
              {
                imageUrl: '/api/images/sp/img2.jpg',
                species: 'Acanthurus olivaceus',
                genus: 'Acanthurus',
                author: 'Blackwater',
                uncertain: false,
                level: 'species',
              },
            ],
          },
        ],
      }),
    });
  });

  it('should render the gallery page with family name', async () => {
    render(
      <FamilyGallery family="Acanthuridae" onBack={vi.fn()} onSelectSpecies={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText('Acanthuridae — Photo Gallery')).toBeInTheDocument();
    });
  });

  it('should render genus sections with images (no names below pictures)', async () => {
    render(
      <FamilyGallery family="Acanthuridae" onBack={vi.fn()} onSelectSpecies={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText('Acanthurus')).toBeInTheDocument();
    });

    // Species names should NOT appear as buttons below thumbnails
    const buttons = screen.queryAllByRole('button');
    const speciesButtons = buttons.filter(
      (btn) => btn.textContent === 'Acanthurus triostegus' || btn.textContent === 'Acanthurus olivaceus'
    );
    expect(speciesButtons).toHaveLength(0);
  });

  it('should use color-coded section titles (species=#00BA38, genus=#619CFF, family=#F8766D)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        family: 'Acanthuridae',
        sections: [
          { genus: 'Acanthurus sp. — Genus-level', images: [{ imageUrl: '/api/images/g/1.jpg', species: null, genus: 'Acanthurus', author: 'BW', uncertain: false, level: 'genus' }], sectionType: 'genus' },
          { genus: 'Acanthurus', images: [{ imageUrl: '/api/images/s/1.jpg', species: 'Acanthurus triostegus', genus: 'Acanthurus', author: 'BW', uncertain: false, level: 'species' }], sectionType: 'species' },
          { genus: 'Acanthuridae — Family-level', images: [{ imageUrl: '/api/images/f/1.jpg', species: null, genus: null, author: 'BW', uncertain: false, level: 'family' }], sectionType: 'family' },
        ],
      }),
    });

    render(
      <FamilyGallery family="Acanthuridae" onBack={vi.fn()} onSelectSpecies={vi.fn()} />
    );

    await waitFor(() => {
      const genusHeader = screen.getByText('Acanthurus sp. — Genus-level');
      expect(genusHeader).toHaveStyle({ color: '#619CFF' });
      const speciesHeader = screen.getByText('Acanthurus');
      expect(speciesHeader).toHaveStyle({ color: '#00BA38' });
      const familyHeader = screen.getByText('Acanthuridae — Family-level');
      expect(familyHeader).toHaveStyle({ color: '#F8766D' });
    });
  });

  it('should have a back button', async () => {
    const onBack = vi.fn();
    render(
      <FamilyGallery family="Acanthuridae" onBack={onBack} onSelectSpecies={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText(/back to homepage/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/back to homepage/i));
    expect(onBack).toHaveBeenCalled();
  });

  it('should open lightbox when image is clicked', async () => {
    render(
      <FamilyGallery family="Acanthuridae" onBack={vi.fn()} onSelectSpecies={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('family-gallery')).toBeInTheDocument();
    });

    // Click a gallery image (skip the header family icon)
    const images = screen.getAllByRole('img');
    const galleryImage = images.find(img => img.closest('.cursor-pointer'));
    fireEvent.click(galleryImage!.closest('.cursor-pointer')!);

    // Lightbox should show with counter
    await waitFor(() => {
      expect(screen.getByText('1 / 2')).toBeInTheDocument();
    });
  });

  it('should show "See dispersal traits" link in lightbox that calls onSelectSpecies', async () => {
    const onSelectSpecies = vi.fn();
    render(
      <FamilyGallery family="Acanthuridae" onBack={vi.fn()} onSelectSpecies={onSelectSpecies} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('family-gallery')).toBeInTheDocument();
    });

    // Open lightbox by clicking an image card
    const images = screen.getAllByRole('img');
    const galleryImage = images.find(img => img.closest('.cursor-pointer'));
    fireEvent.click(galleryImage!.closest('.cursor-pointer')!);

    // Lightbox should show "See dispersal traits" link
    await waitFor(() => {
      expect(screen.getByText(/see dispersal traits/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/see dispersal traits/i));
    expect(onSelectSpecies).toHaveBeenCalledWith('Acanthurus triostegus');
  });
});
