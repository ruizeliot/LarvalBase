/**
 * Tests for US-5.5: Image-only species pages.
 *
 * PRD Section 3.4: Create species pages for species with images but no data
 * records. Badge indicating "Image only" status.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SpeciesHeader } from '../species-header';

// Mock useSpeciesImages hook
const mockImages = [
  {
    author: 'Blackwater',
    displayAuthor: 'Test Photographer',
    uncertain: false,
    path: 'classified_bw_images_species',
    filename: 'test.jpg',
    sourceDescription: 'Blackwater — Species ID confirmed',
    priority: 1,
    speciesName: 'Test species',
    family: 'Testidae',
    order: 'Testiformes',
    brightness: 999,
  },
];

vi.mock('@/hooks/use-species-images', () => ({
  useSpeciesImages: () => ({
    images: mockImages,
    orderFamily: null,
    isLoading: false,
    error: null,
  }),
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock UI components
vi.mock('@/components/ui/carousel', () => ({
  Carousel: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
  CarouselContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CarouselItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CarouselNext: () => <button>Next</button>,
  CarouselPrevious: () => <button>Previous</button>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => <div className={className} />,
}));

describe('US-5.5: Image-only species pages', () => {
  it('should NOT show "Image only" badge when recordCount is 0 (badge removed per QA feedback)', () => {
    render(
      <SpeciesHeader
        speciesId="test-species"
        scientificName="Test species"
        commonName={null}
        family="Testidae"
        order="Testiformes"
        recordCount={0}
        studyCount={0}
      />
    );

    // Badge was removed — should not appear
    expect(screen.queryByText('Image only')).toBeNull();
  });

  it('should show record/study counts when recordCount > 0', () => {
    render(
      <SpeciesHeader
        speciesId="test-species"
        scientificName="Test species"
        commonName={null}
        family="Testidae"
        order="Testiformes"
        recordCount={5}
        studyCount={2}
      />
    );

    expect(screen.getByText('5')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();
  });

  it('should still show the image gallery for image-only species', () => {
    const { container } = render(
      <SpeciesHeader
        speciesId="test-species"
        scientificName="Test species"
        commonName={null}
        family="Testidae"
        order="Testiformes"
        recordCount={0}
        studyCount={0}
      />
    );

    // Image gallery should be rendered
    expect(container.querySelector('img')).not.toBeNull();
  });

  it('should center family icon vertically relative to species name', () => {
    const { container } = render(
      <SpeciesHeader
        speciesId="test-species"
        scientificName="Test species"
        commonName={null}
        family="Testidae"
        order="Testiformes"
        recordCount={5}
        studyCount={2}
      />
    );

    // The family icon's parent flex container should NOT use items-start (should be items-center)
    const familyIcon = container.querySelector('img[src*="family-icons"]');
    expect(familyIcon).not.toBeNull();
    const iconParent = familyIcon!.closest('.flex.gap-4');
    expect(iconParent).not.toBeNull();
    expect(iconParent!.className).not.toContain('items-start');
    expect(iconParent!.className).toContain('items-center');
  });

  it('should not show record counts when recordCount is 0', () => {
    render(
      <SpeciesHeader
        speciesId="test-species"
        scientificName="Test species"
        commonName={null}
        family="Testidae"
        order="Testiformes"
        recordCount={0}
        studyCount={0}
      />
    );

    // No record/study count stats displayed (but contact email text with "records" is OK)
    expect(screen.queryByText(/^\d+ record/)).toBeNull();
    expect(screen.queryByText(/^\d+ stud/)).toBeNull();
  });
});
