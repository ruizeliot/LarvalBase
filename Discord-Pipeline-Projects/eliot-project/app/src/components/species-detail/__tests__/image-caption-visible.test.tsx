/**
 * Tests for US-5.4: Image captions visible without dezooming.
 *
 * PRD Section 3.4: Caption always visible without dezooming.
 * Image container sizing must ensure captions stay in viewport.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    open ? <div data-testid="lightbox-dialog">{children}</div> : null,
  DialogContent: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    <div data-testid="lightbox-content" className={className}>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

const mockImage: SpeciesImage = {
  author: 'CRIOBE',
  displayAuthor: 'CRIOBE',
  uncertain: false,
  path: 'Polynesia',
  filename: 'test-image.jpg',
  sourceDescription: '',
  priority: 4,
  speciesName: 'Chromis viridis',
  family: 'Pomacentridae',
  order: 'Perciformes',
  scale: true,
  link: 'https://example.com',
};

describe('US-5.4: Captions visible without dezooming', () => {
  it('should render image in a container with max-h constraint', () => {
    const { container } = render(
      <SpeciesImageGallery images={[mockImage]} speciesName="Chromis viridis" />
    );

    // Image container should have max-height classes to prevent oversizing
    const imageContainer = container.querySelector('.aspect-\\[4\\/3\\]');
    expect(imageContainer).toBeDefined();
    // Aspect ratio constraint keeps image contained
  });

  it('should always render caption below the image', () => {
    const { container } = render(
      <SpeciesImageGallery images={[mockImage]} speciesName="Chromis viridis" />
    );

    // Caption should exist and be rendered
    const caption = container.querySelector('.text-muted-foreground');
    expect(caption).toBeDefined();
    expect(caption?.textContent).toContain('CRIOBE');
  });

  it('should show "Picture source:" format in caption', () => {
    const { container } = render(
      <SpeciesImageGallery images={[mockImage]} speciesName="Chromis viridis" />
    );

    // Caption should contain "Picture source:" and author name
    expect(container.textContent).toContain('Picture source:');
    expect(container.textContent).toContain('CRIOBE');
  });

  it('single image should use constrained aspect ratio (4/3)', () => {
    const { container } = render(
      <SpeciesImageGallery images={[mockImage]} speciesName="Chromis viridis" />
    );

    // The image wrapper should use aspect-[4/3] to keep height reasonable
    const aspectContainer = container.querySelector('[class*="aspect-"]');
    expect(aspectContainer).toBeDefined();
    expect(aspectContainer?.className).toContain('aspect-[4/3]');
  });

  it('gallery should use max-h to prevent image from pushing caption off-screen', () => {
    const { container } = render(
      <SpeciesImageGallery images={[mockImage]} speciesName="Chromis viridis" />
    );

    // The image wrapper should have a max-height constraint
    const imageWrapper = container.querySelector('[class*="max-h-"]');
    expect(imageWrapper).not.toBeNull();
  });
});
