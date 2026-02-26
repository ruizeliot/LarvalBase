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

  it('should render genus sections with images', async () => {
    render(
      <FamilyGallery family="Acanthuridae" onBack={vi.fn()} onSelectSpecies={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText('Acanthurus')).toBeInTheDocument();
      // Should show species names as clickable links
      expect(screen.getByText('Acanthurus triostegus')).toBeInTheDocument();
      expect(screen.getByText('Acanthurus olivaceus')).toBeInTheDocument();
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

    // Click an image
    const images = screen.getAllByRole('img');
    fireEvent.click(images[0].closest('.cursor-pointer')!);

    // Lightbox should show with counter
    await waitFor(() => {
      expect(screen.getByText('1 / 2')).toBeInTheDocument();
    });
  });

  it('should call onSelectSpecies when species name is clicked', async () => {
    const onSelectSpecies = vi.fn();
    render(
      <FamilyGallery family="Acanthuridae" onBack={vi.fn()} onSelectSpecies={onSelectSpecies} />
    );

    await waitFor(() => {
      expect(screen.getByText('Acanthurus triostegus')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Acanthurus triostegus'));
    expect(onSelectSpecies).toHaveBeenCalledWith('Acanthurus triostegus');
  });
});
