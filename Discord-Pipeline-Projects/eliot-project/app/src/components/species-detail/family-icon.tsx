'use client';

import { useState } from 'react';
import Image from 'next/image';

/**
 * Props for the FamilyIcon component.
 */
export interface FamilyIconProps {
  /** Family name (e.g., "Acanthuridae") */
  family: string;
  /** Size of the icon container in pixels (default: 48) */
  size?: number;
  /** Optional additional className */
  className?: string;
}

/**
 * FamilyIcon displays a fish family silhouette SVG.
 *
 * Implements:
 * - ICON-01: Load family silhouette SVGs from adult_svg_fishbase folder
 * - ICON-04: Blank placeholder shown when family SVG is missing
 *
 * SVG files are served from public/family-icons/{FamilyName}.svg
 * Falls back to placeholder.svg on error.
 */
export function FamilyIcon({ family, size = 48, className = '' }: FamilyIconProps) {
  const [hasError, setHasError] = useState(false);

  // Construct the SVG path
  const svgPath = hasError
    ? '/family-icons/placeholder.svg'
    : `/family-icons/${family}.svg`;

  // Calculate height proportionally (typical fish silhouettes are ~1.5:1 ratio)
  const height = Math.round(size * 0.67);

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ width: size, height }}
      title={hasError ? 'No icon available' : family}
    >
      <Image
        src={svgPath}
        alt={hasError ? 'No family icon' : `${family} silhouette`}
        width={size}
        height={height}
        className="object-contain"
        style={{
          filter: 'brightness(0) invert(1)',
        }}
        onError={() => {
          if (!hasError) {
            setHasError(true);
          }
        }}
        priority={false}
        unoptimized // SVGs don't need optimization
      />
    </div>
  );
}
