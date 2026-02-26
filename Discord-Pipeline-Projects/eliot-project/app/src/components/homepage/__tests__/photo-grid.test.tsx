/**
 * Tests for Photo grid with real images and drill-down.
 *
 * BUG 1: Photo grid must show actual photos (not fish emoji placeholders).
 * Images come from the API with real imageUrl values.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PhotoGrid } from '../photo-grid';

const mockFamiliesWithImages = [
  {
    family: 'Acanthuridae',
    order: 'Acanthuriformes',
    imageUrl: '/api/images/classified_bw_images_species/test-image.jpg',
    species: [
      { validName: 'Acanthurus triostegus', genus: 'Acanthurus', records: 42 },
      { validName: 'Naso unicornis', genus: 'Naso', records: 19 },
    ],
  },
  {
    family: 'Pomacentridae',
    order: 'Ovalentaria',
    imageUrl: '/api/images/classified_bw_images_species/poma-image.jpg',
    species: [
      { validName: 'Chromis viridis', genus: 'Chromis', records: 31 },
    ],
  },
];

const mockFamiliesNoImages = [
  {
    family: 'Unknown',
    order: 'Unknown Order',
    imageUrl: null,
    species: [
      { validName: 'Unknown sp', genus: 'Unknown', records: 1 },
    ],
  },
];

describe('BUG 1: Photo grid shows real images', () => {
  it('should render actual img elements when imageUrl is provided', () => {
    render(<PhotoGrid families={mockFamiliesWithImages} onSelectSpecies={vi.fn()} />);
    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThanOrEqual(2);
    expect(images[0]).toHaveAttribute('src', '/api/images/classified_bw_images_species/test-image.jpg');
  });

  it('should show fish SVG placeholder only when imageUrl is null', () => {
    render(<PhotoGrid families={mockFamiliesNoImages} onSelectSpecies={vi.fn()} />);
    // No img tag should exist
    expect(screen.queryAllByRole('img')).toHaveLength(0);
  });

  it('should display the section title', () => {
    render(<PhotoGrid families={mockFamiliesWithImages} onSelectSpecies={vi.fn()} />);
    expect(
      screen.getByText(/post-flexion and early juvenile stages/i)
    ).toBeInTheDocument();
  });

  it('should render a card for each family', () => {
    render(<PhotoGrid families={mockFamiliesWithImages} onSelectSpecies={vi.fn()} />);
    expect(screen.getByText('Acanthuridae')).toBeInTheDocument();
    expect(screen.getByText('Pomacentridae')).toBeInTheDocument();
  });

  it('should render nothing when families is empty', () => {
    const { container } = render(<PhotoGrid families={[]} onSelectSpecies={vi.fn()} />);
    expect(container.querySelector('[data-testid="photo-grid"]')).toBeNull();
  });
});
