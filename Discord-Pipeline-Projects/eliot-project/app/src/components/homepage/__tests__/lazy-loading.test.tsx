/**
 * Tests for BUG 3: Homepage performance optimization.
 *
 * Must:
 * 1. Images in photo grid use lazy loading (loading="lazy")
 * 2. Images use async decoding (decoding="async")
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PhotoGrid } from '../photo-grid';

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

describe('BUG 3: Homepage performance', () => {
  it('should use lazy loading on photo grid images', () => {
    render(<PhotoGrid families={mockFamilies} onSelectSpecies={vi.fn()} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('should use async decoding on photo grid images', () => {
    render(<PhotoGrid families={mockFamilies} onSelectSpecies={vi.fn()} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('decoding', 'async');
  });
});
