'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { ImageIcon, X, ZoomIn, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { ImageCaption } from './image-caption';
import type { SpeciesImage } from '@/lib/types/image.types';
import { buildImageUrl } from '@/lib/utils/encode-image-path';

interface SpeciesImageGalleryProps {
  /** Array of species images (sorted by priority) */
  images: SpeciesImage[];
  /** Species name for accessibility */
  speciesName: string;
  /** Whether to hide the caption below images (when rendered externally) */
  hideCaption?: boolean;
  /** Callback when current image index changes */
  onCurrentIndexChange?: (index: number) => void;
}

/**
 * Image gallery with carousel and lightbox for species photos.
 *
 * Implements:
 * - IMG-05: Multiple images per species navigable via gallery/carousel
 * - IMG-06: Species detail shows image placeholder when no images exist
 * - NEW: Click to enlarge in lightbox
 */
/**
 * Component for displaying an image with error handling.
 */
function SpeciesImageWithFallback({
  image,
  speciesName,
  onClick,
  showZoomHint = true,
}: {
  image: SpeciesImage;
  speciesName: string;
  onClick?: () => void;
  showZoomHint?: boolean;
}) {
  const [hasError, setHasError] = useState(false);
  const imageSrc = buildImageUrl(image.path, image.filename);

  if (hasError) {
    return (
      <div className="w-full h-full bg-muted flex flex-col items-center justify-center">
        <AlertCircle className="w-8 h-8 text-muted-foreground mb-2" />
        <span className="text-xs text-muted-foreground">Image unavailable</span>
      </div>
    );
  }

  return (
    <div 
      className="relative w-full h-full cursor-pointer group"
      onClick={onClick}
    >
      <Image
        src={imageSrc}
        alt={`${speciesName} - photo by ${image.displayAuthor}`}
        fill
        className="object-contain"
        sizes="(max-width: 768px) 100vw, 400px"
        unoptimized
        onError={() => setHasError(true)}
      />
      {showZoomHint && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}
    </div>
  );
}

export function SpeciesImageGallery({ images, speciesName, hideCaption, onCurrentIndexChange }: SpeciesImageGalleryProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    const idx = api.selectedScrollSnap();
    setCurrent(idx);
    onCurrentIndexChange?.(idx);

    api.on('select', () => {
      const newIdx = api.selectedScrollSnap();
      setCurrent(newIdx);
      onCurrentIndexChange?.(newIdx);
    });
  }, [api, onCurrentIndexChange]);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  // IMG-06: Show placeholder when no images
  if (images.length === 0) {
    return (
      <div className="w-full aspect-[4/3] rounded-lg bg-muted flex flex-col items-center justify-center">
        <ImageIcon className="w-12 h-12 text-muted-foreground mb-2" />
        <span className="text-sm text-muted-foreground">No photos available</span>
      </div>
    );
  }

  // Single image - no carousel needed
  if (images.length === 1) {
    const image = images[0];

    return (
      <>
        <div className="w-full max-h-[60vh]">
          <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted">
            <SpeciesImageWithFallback
              image={image}
              speciesName={speciesName}
              onClick={() => openLightbox(0)}
            />
          </div>
          {!hideCaption && (
            <ImageCaption
              author={image.author}
              displayAuthor={image.displayAuthor}
              uncertain={image.uncertain}
              sourceDescription={image.sourceDescription}
            />
          )}
        </div>
        <ImageLightbox
          images={images}
          speciesName={speciesName}
          currentIndex={lightboxIndex}
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
          onIndexChange={setLightboxIndex}
        />
      </>
    );
  }

  // Multiple images - use carousel
  return (
    <>
      <div className="w-full">
        <Carousel setApi={setApi} className="w-full">
          <CarouselContent>
            {images.map((image, index) => {
              return (
                <CarouselItem key={index}>
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted">
                    <SpeciesImageWithFallback
                      image={image}
                      speciesName={speciesName}
                      onClick={() => openLightbox(index)}
                    />
                  </div>
                  {!hideCaption && (
                    <ImageCaption
                      author={image.author}
                      displayAuthor={image.displayAuthor}
                      uncertain={image.uncertain}
                    />
                  )}
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious className="left-2" />
          <CarouselNext className="right-2" />
        </Carousel>

        {/* Image counter */}
        <div className="text-center text-sm text-muted-foreground mt-1">
          {current + 1} / {count}
        </div>
      </div>
      <ImageLightbox
        images={images}
        speciesName={speciesName}
        currentIndex={lightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        onIndexChange={setLightboxIndex}
      />
    </>
  );
}

/**
 * Lightbox component for enlarged image viewing.
 */
interface ImageLightboxProps {
  images: SpeciesImage[];
  speciesName: string;
  currentIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIndexChange: (index: number) => void;
}

function ImageLightbox({
  images,
  speciesName,
  currentIndex,
  open,
  onOpenChange,
  onIndexChange,
}: ImageLightboxProps) {
  const image = images[currentIndex];

  const goNext = useCallback(() => {
    onIndexChange((currentIndex + 1) % images.length);
  }, [currentIndex, images.length, onIndexChange]);

  const goPrev = useCallback(() => {
    onIndexChange((currentIndex - 1 + images.length) % images.length);
  }, [currentIndex, images.length, onIndexChange]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'Escape') onOpenChange(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, goNext, goPrev, onOpenChange]);

  if (!image) return null;

  const imageSrc = buildImageUrl(image.path, image.filename);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh] p-0 bg-black border-none flex flex-col [&>button]:hidden">
        <DialogTitle className="sr-only">
          {speciesName} - Photo {currentIndex + 1} of {images.length}
        </DialogTitle>
        
        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button
              onClick={goNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
              aria-label="Next image"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </>
        )}

        {/* Image container - use img tag directly for lightbox */}
        <div className="flex-1 flex items-center justify-center overflow-hidden p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt={`${speciesName} - photo by ${image.displayAuthor}`}
            className="max-w-full max-h-full object-contain"
          />
        </div>

        {/* Caption */}
        <div className="bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
          <div className="text-center">
            <p className="font-medium italic">{speciesName}</p>
            <p className="text-sm opacity-90">
              Photo: {image.displayAuthor}
              {image.sourceDescription && (
                <span className="opacity-75"> · {image.sourceDescription}</span>
              )}
            </p>
            {image.uncertain ? (
              <p className="text-red-400 text-sm">(Unsure ID)</p>
            ) : (
              <p className="text-green-400 text-sm">(Sure ID)</p>
            )}
            {images.length > 1 && (
              <p className="text-xs opacity-75 mt-1">
                {currentIndex + 1} / {images.length}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
