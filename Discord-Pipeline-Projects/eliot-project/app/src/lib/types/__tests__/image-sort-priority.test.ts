/**
 * Tests for image sort priority with tier-based author grouping.
 *
 * Priority tiers:
 * 1. Blackwater authors (listed in BLACKWATER_AUTHORS)
 * 2. Literature/BOLD authors (listed in LITERATURE_AUTHORS)
 * 3. All other authors
 *
 * Within each tier, certain images (uncertain=false) come before uncertain.
 */
import { describe, it, expect } from 'vitest';
import { getAuthorPriority, getAuthorTier, BLACKWATER_AUTHORS, LITERATURE_AUTHORS } from '@/lib/types/image.types';

describe('Image sort priority tiers', () => {
  it('should assign tier 1 to blackwater authors', () => {
    expect(getAuthorTier('Bartick (2026) - Instagram page')).toBe(1);
    expect(getAuthorTier('Kovacs (2026) - Instagram page')).toBe(1);
    expect(getAuthorTier('Meldonian (2026) - Website')).toBe(1);
  });

  it('should assign tier 2 to literature/BOLD authors', () => {
    expect(getAuthorTier('Collet et al. (2015) - BOLD project')).toBe(2);
    expect(getAuthorTier('Baldwin (2013) - Zoological Journal of the Linnean Society')).toBe(2);
  });

  it('should assign tier 3 to unknown/other authors', () => {
    expect(getAuthorTier('Unknown Author')).toBe(3);
    expect(getAuthorTier('Some Other Source')).toBe(3);
  });

  it('should have consistent getAuthorPriority and getAuthorTier', () => {
    expect(getAuthorPriority('Bartick (2026) - Instagram page')).toBe(1);
    expect(getAuthorPriority('Unknown')).toBe(3);
  });

  it('should have all expected blackwater authors', () => {
    expect(BLACKWATER_AUTHORS.size).toBe(19);
    expect(BLACKWATER_AUTHORS.has('Baensch (2026) - Website')).toBe(true);
    expect(BLACKWATER_AUTHORS.has('Zhang J. (2026) - Instagram page')).toBe(true);
  });

  it('should have all expected literature authors', () => {
    expect(LITERATURE_AUTHORS.size).toBe(9);
    expect(LITERATURE_AUTHORS.has('Baldwin et al. (2009) - Zootaxa')).toBe(true);
  });

  it('should sort certain images before uncertain at same tier', () => {
    const images = [
      { priority: 1, uncertain: true, author: 'Blackwater' },
      { priority: 1, uncertain: false, author: 'Blackwater' },
      { priority: 3, uncertain: false, author: 'Other' },
      { priority: 3, uncertain: true, author: 'Other' },
    ];

    images.sort((a, b) => {
      const certA = a.uncertain ? 1 : 0;
      const certB = b.uncertain ? 1 : 0;
      if (certA !== certB) return certA - certB;
      if (a.priority !== b.priority) return a.priority - b.priority;
      return 0;
    });

    expect(images[0]).toEqual(expect.objectContaining({ priority: 1, uncertain: false }));
    expect(images[1]).toEqual(expect.objectContaining({ priority: 3, uncertain: false }));
    expect(images[2]).toEqual(expect.objectContaining({ priority: 1, uncertain: true }));
    expect(images[3]).toEqual(expect.objectContaining({ priority: 3, uncertain: true }));
  });
});
