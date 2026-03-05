/**
 * Tests for image caption display with new format.
 *
 * New format:
 * - "Picture source: AUTHOR" (with hyperlink if LINK available)
 * - Scale info in italic
 * - Sure/Unsure ID indicator
 */
import { describe, it, expect } from 'vitest';
import { BLACKWATER_AUTHORS, LITERATURE_AUTHORS, getAuthorTier } from '@/lib/types/image.types';

describe('Image caption author tiers', () => {
  it('should classify blackwater authors as tier 1', () => {
    for (const author of BLACKWATER_AUTHORS) {
      expect(getAuthorTier(author)).toBe(1);
    }
  });

  it('should classify literature authors as tier 2', () => {
    for (const author of LITERATURE_AUTHORS) {
      expect(getAuthorTier(author)).toBe(2);
    }
  });

  it('should classify other authors as tier 4', () => {
    expect(getAuthorTier('Random Author')).toBe(4);
  });
});
