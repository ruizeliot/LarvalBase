/**
 * Tests for URL encoding of image paths with spaces and special characters.
 * Root cause of missing images: spaces in paths not being encoded properly.
 */
import { describe, it, expect } from 'vitest';
import { encodeImagePath, buildImageUrl } from '../encode-image-path';

describe('encodeImagePath', () => {
  it('should encode spaces in single-level paths', () => {
    expect(encodeImagePath('Guadeloupe - Amelia')).toBe('Guadeloupe%20-%20Amelia');
    expect(encodeImagePath('Madagascar - Reunion')).toBe('Madagascar%20-%20Reunion');
  });

  it('should not alter paths without special characters', () => {
    expect(encodeImagePath('classified_bw_images_species')).toBe('classified_bw_images_species');
    expect(encodeImagePath('Fisher')).toBe('Fisher');
  });

  it('should encode each segment separately for nested paths', () => {
    // Nested path should produce multiple URL segments, not one with %2F
    const encoded = encodeImagePath('Guadeloupe - Amelia/subfolder');
    expect(encoded).toBe('Guadeloupe%20-%20Amelia/subfolder');
    expect(encoded).not.toContain('%2F');
  });
});

describe('buildImageUrl', () => {
  it('should build correct URL for path with spaces', () => {
    const url = buildImageUrl('Guadeloupe - Amelia', 'Sure ID - Acanthurus.jpg');
    expect(url).toBe('/api/images/Guadeloupe%20-%20Amelia/Sure%20ID%20-%20Acanthurus.jpg');
  });

  it('should build correct URL for simple path', () => {
    const url = buildImageUrl('Polynesia', 'fish.jpg');
    expect(url).toBe('/api/images/Polynesia/fish.jpg');
  });

  it('should encode parentheses and other special characters in filenames', () => {
    const url = buildImageUrl('Fisher', 'image (1).jpg');
    expect(url).toBe('/api/images/Fisher/image%20(1).jpg');
  });
});
