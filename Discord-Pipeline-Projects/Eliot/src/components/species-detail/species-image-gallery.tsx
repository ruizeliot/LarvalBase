'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ImageIcon, X, ZoomIn } from 'lucide-react';
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

interface SpeciesImageGalleryProps {
  /** Array of species images (sorted by priority) */
  images: SpeciesImage[];
  /** Species name for accessibility */
  speciesName: string;
}

/**
 * Image gallery with carousel and lightbox for species photos.
 *
 * Implements:
 * - IMG-05: Multiple images per species navigable via gallery/carousel
 * - IMG-06: Species detail shows image placeholder when no images exist
 * - NEW: Click to enlarge in lightbox
 */
export function SpeciesImageGallery({ images, speciesName }: SpeciesImageGalleryProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

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
    const imageSrc = `/api/images/${encodeURIComponent(image.path)}/${encodeURIComponent(image.filename)}`;

    return (
      <>
        <div className="w-full">
          <div 
            className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted cursor-pointer group"
            onClick={() => openLightbox(0)}
          >
            <Image
              src={imageSrc}
              alt={`${speciesName} - photo by ${image.displayAuthor}`}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 400px"
              unoptimized
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          <ImageCaption 
            author={image.author} 
            displayAuthor={image.displayAuthor}
            uncertain={image.uncertain} 
          />
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
              const imageSrc = `/api/images/${encodeURIComponent(image.path)}/${encodeURIComponent(image.filename)}`;

              return (
                <CarouselItem key={index}>
                  <div 
                    className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted cursor-pointer group"
                    onClick={() => openLightbox(index)}
                  >
                    <Image
                      src={imageSrc}
                      alt={`${speciesName} - photo ${index + 1} of ${images.length} by ${image.displayAuthor}`}
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, 400px"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <ImageCaption 
                    author={image.author} 
                    displayAuthor={image.displayAuthor}
                    uncertain={image.uncertain} 
                  />
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
  if (!image) return null;

  const imageSrc = `/api/images/${encodeURIComponent(image.path)}/${encodeURIComponent(image.filename)}`;

  const goNext = () => {
    onIndexChange((currentIndex + 1) % images.length);
  };

  const goPrev = () => {
    onIndexChange((currentIndex - 1 + images.length) % images.length);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto p-0 bg-black/95 border-none">
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

        {/* Navigation */}
        {images.length > 1 && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
            >
              ‹
            </button>
            <button
              onClick={goNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
            >
              ›
            </button>
          </>
        )}

        {/* Image */}
        <div className="relative w-full h-[80vh] flex items-center justify-center">
          <Image
            src={imageSrc}
            alt={`${speciesName} - photo by ${image.displayAuthor}`}
            fill
            className="object-contain"
            sizes="95vw"
            unoptimized
            priority
          />
        </div>

        {/* Caption */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
          <div className="text-center">
            <p className="font-medium">{speciesName}</p>
            <p className="text-sm opacity-90">
              Photo: {image.displayAuthor}
              {image.author !== image.displayAuthor && (
                <span className="opacity-75"> (via {image.author})</span>
              )}
            </p>
            {image.uncertain && (
              <p className="text-yellow-400 text-sm">(uncertain identification)</p>
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
