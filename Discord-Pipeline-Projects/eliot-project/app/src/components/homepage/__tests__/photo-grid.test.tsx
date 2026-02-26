/**
 * Tests for Photo grid with real images.
 *
 * BUG 1: Photo grid must show actual photos (not fish emoji placeholders).
 * BUG 2: Clicking a family card calls onSelectFamily (navigates to gallery).
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

describe('Photo grid', () => {
  it('should render actual img elements when imageUrl is provided', () => {
    render(<PhotoGrid families={mockFamiliesWithImages} onSelectFamily={vi.fn()} />);
    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThanOrEqual(2);
    expect(images[0]).toHaveAttribute('src', '/api/images/classified_bw_images_species/test-image.jpg');
  });

  it('should display the section title', () => {
    render(<PhotoGrid families={mockFamiliesWithImages} onSelectFamily={vi.fn()} />);
    expect(
      screen.getByText(/post-flexion and early juvenile stages/i)
    ).toBeInTheDocument();
  });

  it('should call onSelectFamily when card is clicked', () => {
    const onSelectFamily = vi.fn();
    render(<PhotoGrid families={mockFamiliesWithImages} onSelectFamily={onSelectFamily} />);
    const card = screen.getByText('Acanthuridae').closest('[data-testid="photo-card"]');
    fireEvent.click(card!);
    expect(onSelectFamily).toHaveBeenCalledWith('Acanthuridae');
  });

  it('should render nothing when families is empty', () => {
    const { container } = render(<PhotoGrid families={[]} onSelectFamily={vi.fn()} />);
    expect(container.querySelector('[data-testid="photo-grid"]')).toBeNull();
  });
});
