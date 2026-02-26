/**
 * Tests for US-2.4: Photo grid of post-flexion/early juvenile stages by family with drill-down.
 *
 * Must:
 * 1. Display title "Colored pictures of post-flexion and early juvenile stages library"
 * 2. Show 5 images per row (grid layout)
 * 3. Each card shows family name and order
 * 4. Clicking a card opens a drill-down modal with genus/species
 * 5. Sorted by order
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PhotoGrid } from '../photo-grid';

const mockFamilies = [
  {
    family: 'Acanthuridae',
    order: 'Acanthuriformes',
    imageUrl: null,
    species: [
      { validName: 'Acanthurus triostegus', genus: 'Acanthurus', records: 42 },
      { validName: 'Naso unicornis', genus: 'Naso', records: 19 },
    ],
  },
  {
    family: 'Pomacentridae',
    order: 'Ovalentaria',
    imageUrl: null,
    species: [
      { validName: 'Chromis viridis', genus: 'Chromis', records: 31 },
    ],
  },
];

describe('US-2.4: Photo grid with drill-down', () => {
  it('should display the section title', () => {
    render(<PhotoGrid families={mockFamilies} onSelectSpecies={vi.fn()} />);
    expect(
      screen.getByText(/post-flexion and early juvenile stages/i)
    ).toBeInTheDocument();
  });

  it('should render a card for each family', () => {
    render(<PhotoGrid families={mockFamilies} onSelectSpecies={vi.fn()} />);
    expect(screen.getByText('Acanthuridae')).toBeInTheDocument();
    expect(screen.getByText('Pomacentridae')).toBeInTheDocument();
  });

  it('should show order on each card', () => {
    render(<PhotoGrid families={mockFamilies} onSelectSpecies={vi.fn()} />);
    expect(screen.getByText('Acanthuriformes')).toBeInTheDocument();
    expect(screen.getByText('Ovalentaria')).toBeInTheDocument();
  });

  it('should open drill-down modal on card click', () => {
    render(<PhotoGrid families={mockFamilies} onSelectSpecies={vi.fn()} />);

    const card = screen.getByText('Acanthuridae').closest('[data-testid="photo-card"]');
    expect(card).toBeTruthy();
    fireEvent.click(card!);

    // Modal should show species list
    expect(screen.getByText(/Acanthurus triostegus/)).toBeInTheDocument();
    expect(screen.getByText(/Naso unicornis/)).toBeInTheDocument();
  });

  it('should render nothing when families is empty', () => {
    const { container } = render(<PhotoGrid families={[]} onSelectSpecies={vi.fn()} />);
    expect(container.querySelector('[data-testid="photo-grid"]')).toBeNull();
  });
});
