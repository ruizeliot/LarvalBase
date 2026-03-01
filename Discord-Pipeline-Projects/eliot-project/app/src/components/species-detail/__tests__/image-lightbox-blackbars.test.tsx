/**
 * Tests for US-5.2: Letterbox/pillarbox enlargement with black bars.
 *
 * PRD Section 3.4: Enlarged images should fit fully with black bars.
 * - Black background in lightbox container
 * - Image uses object-contain to fit without cropping
 * - Caption always visible in lightbox
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpeciesImageGallery } from '../species-image-gallery';
import type { SpeciesImage } from '@/lib/types/image.types';

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock UI components
vi.mock('@/components/ui/carousel', () => ({
  Carousel: ({ children, ...props }: { children: React.ReactNode }) => <div data-testid="carousel" {...props}>{children}</div>,
  CarouselContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CarouselItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CarouselNext: () => <button>Next</button>,
  CarouselPrevious: () => <button>Previous</button>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="lightbox-dialog" role="dialog">{children}</div> : null,
  DialogContent: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    <div data-testid="lightbox-content" className={className}>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

const mockImage: SpeciesImage = {
  author: 'Blackwater',
  displayAuthor: 'Test Photographer',
  uncertain: false,
  path: 'classified_bw_images_species',
  filename: 'test-image.jpg',
  sourceDescription: 'Blackwater',
  priority: 1,
  speciesName: 'Chromis viridis',
  family: 'Pomacentridae',
  order: 'Perciformes',
};

describe('US-5.2: Lightbox with black bars (letterbox/pillarbox)', () => {
  it('should render lightbox with black background when image is clicked', () => {
    const { container } = render(
      <SpeciesImageGallery images={[mockImage]} speciesName="Chromis viridis" />
    );

    // Click on the image to open lightbox
    const clickableArea = container.querySelector('.cursor-pointer');
    if (clickableArea) {
      fireEvent.click(clickableArea);
    }

    // Lightbox should be open
    const dialog = screen.getByTestId('lightbox-dialog');
    expect(dialog).toBeDefined();

    // The lightbox content should have black background class
    const lightboxContent = screen.getByTestId('lightbox-content');
    expect(lightboxContent.className).toContain('bg-black');
  });

  it('should use object-contain on lightbox image so it fits without cropping', () => {
    const { container } = render(
      <SpeciesImageGallery images={[mockImage]} speciesName="Chromis viridis" />
    );

    // Open lightbox
    const clickableArea = container.querySelector('.cursor-pointer');
    if (clickableArea) {
      fireEvent.click(clickableArea);
    }

    // The lightbox image should use object-contain
    const lightboxImg = screen.getByTestId('lightbox-dialog')?.querySelector('img');
    expect(lightboxImg).toBeDefined();
    expect(lightboxImg?.className).toContain('object-contain');
  });

  it('should show caption in lightbox with species name and photographer', () => {
    const { container } = render(
      <SpeciesImageGallery images={[mockImage]} speciesName="Chromis viridis" />
    );

    // Open lightbox
    const clickableArea = container.querySelector('.cursor-pointer');
    if (clickableArea) {
      fireEvent.click(clickableArea);
    }

    // Caption should show species name and photographer
    const dialog = screen.getByTestId('lightbox-dialog');
    expect(dialog.textContent).toContain('Chromis viridis');
    expect(dialog.textContent).toContain('Test Photographer');
  });

  it('should render species name in italic in the lightbox caption', () => {
    const { container } = render(
      <SpeciesImageGallery images={[mockImage]} speciesName="Chromis viridis" />
    );

    // Open lightbox
    const clickableArea = container.querySelector('.cursor-pointer');
    if (clickableArea) {
      fireEvent.click(clickableArea);
    }

    // Find the species name element in the lightbox
    const dialog = screen.getByTestId('lightbox-dialog');
    const speciesNameEl = Array.from(dialog.querySelectorAll('p')).find(
      (p) => p.textContent === 'Chromis viridis'
    );
    expect(speciesNameEl).toBeDefined();
    expect(speciesNameEl!.className).toContain('italic');
  });

  it('lightbox image container should have black background for letterbox/pillarbox effect', () => {
    const { container } = render(
      <SpeciesImageGallery images={[mockImage]} speciesName="Chromis viridis" />
    );

    // Open lightbox
    const clickableArea = container.querySelector('.cursor-pointer');
    if (clickableArea) {
      fireEvent.click(clickableArea);
    }

    // The image container within the lightbox should have a black background
    const lightboxContent = screen.getByTestId('lightbox-content');
    // bg-black is the key class for letterbox/pillarbox effect
    expect(lightboxContent.className).toContain('bg-black');
  });
});
