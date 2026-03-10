/**
 * Tests for image sort priority with tier-based author grouping.
 *
 * Priority tiers:
 * 1. Blackwater authors (listed in BLACKWATER_AUTHORS)
 * 2. Secondary authors (literature/BOLD + specific research)
 * 3. Tertiary authors (Chatagnon, Current study)
 * 4. All other authors
 *
 * Within each tier, certain images (uncertain=false) come before uncertain.
 */
import { describe, it, expect } from 'vitest';
import {
  getAuthorPriority,
  getAuthorTier,
  BLACKWATER_AUTHORS,
  SECONDARY_AUTHORS,
  TERTIARY_AUTHORS,
} from '@/lib/types/image.types';

describe('Image sort priority tiers', () => {
  it('should assign tier 1 to blackwater authors', () => {
    expect(getAuthorTier('Bartick (2026) - Instagram page')).toBe(1);
    expect(getAuthorTier('Kovacs (2026) - Instagram page')).toBe(1);
    expect(getAuthorTier('Meldonian (2026) - Website')).toBe(1);
    expect(getAuthorTier('BW Cozumel (2026) - Instagram page')).toBe(1);
  });

  it('should assign tier 2 to secondary authors', () => {
    expect(getAuthorTier('Collet et al. (2015) - BOLD project')).toBe(2);
    expect(getAuthorTier('Baldwin (2013) - Zoological Journal of the Linnean Society')).toBe(2);
    expect(getAuthorTier('Baldwin et al. (2009) - Zootaxa')).toBe(2);
    expect(getAuthorTier('Baldwin et al. (2011) - Zootaxa')).toBe(2);
    expect(getAuthorTier('Johnson et al. (2025) - Journal of the Ocean Science Foundation')).toBe(2);
  });

  it('should assign tier 3 to tertiary authors', () => {
    expect(getAuthorTier('Chatagnon & Aimar (2015) - Book')).toBe(3);
    expect(getAuthorTier('Current study (ADLIFISH 1)')).toBe(3);
    expect(getAuthorTier('Current Study')).toBe(3);
    expect(getAuthorTier('Current study (IchthyoGwada)')).toBe(3);
  });

  it('should assign tier 4 to unknown/other authors', () => {
    expect(getAuthorTier('Unknown Author')).toBe(4);
    expect(getAuthorTier('Some Other Source')).toBe(4);
  });

  it('should have consistent getAuthorPriority and getAuthorTier', () => {
    expect(getAuthorPriority('Bartick (2026) - Instagram page')).toBe(1);
    expect(getAuthorPriority('Unknown')).toBe(4);
  });

  it('should have all expected blackwater authors (20 total)', () => {
    expect(BLACKWATER_AUTHORS.size).toBe(20);
    expect(BLACKWATER_AUTHORS.has('Baensch (2026) - Website')).toBe(true);
    expect(BLACKWATER_AUTHORS.has('Zhang J. (2026) - Instagram page')).toBe(true);
    expect(BLACKWATER_AUTHORS.has('BW Cozumel (2026) - Instagram page')).toBe(true);
  });

  it('should have all expected secondary authors', () => {
    expect(SECONDARY_AUTHORS.has('Baldwin et al. (2009) - Zootaxa')).toBe(true);
    expect(SECONDARY_AUTHORS.has('CLIP-OI (2020) - SWIO ID key')).toBe(true);
    // Em-dash variants
    expect(SECONDARY_AUTHORS.has('Baldwin et al. (2009) – Zootaxa')).toBe(true);
  });

  it('should have all expected tertiary authors', () => {
    expect(TERTIARY_AUTHORS.size).toBe(5);
    expect(TERTIARY_AUTHORS.has('Chatagnon & Aimar (2015) - Book')).toBe(true);
    expect(TERTIARY_AUTHORS.has('Current Study')).toBe(true);
  });

  it('should sort by tier first, then certainty within tier', () => {
    const images = [
      { priority: 4, uncertain: false, author: 'Other', brightness: 100 },
      { priority: 1, uncertain: true, author: 'Blackwater', brightness: 10 },
      { priority: 1, uncertain: false, author: 'Blackwater', brightness: 20 },
      { priority: 4, uncertain: true, author: 'Other', brightness: 150 },
    ];

    images.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      const certA = a.uncertain ? 1 : 0;
      const certB = b.uncertain ? 1 : 0;
      if (certA !== certB) return certA - certB;
      return a.brightness - b.brightness;
    });

    // Tier 1 (blackwater) first, certain before uncertain
    expect(images[0]).toEqual(expect.objectContaining({ priority: 1, uncertain: false }));
    expect(images[1]).toEqual(expect.objectContaining({ priority: 1, uncertain: true }));
    // Tier 4 (other) last, certain before uncertain
    expect(images[2]).toEqual(expect.objectContaining({ priority: 4, uncertain: false }));
    expect(images[3]).toEqual(expect.objectContaining({ priority: 4, uncertain: true }));
  });

  it('should order tiers correctly: blackwater < secondary < tertiary < other', () => {
    const bw = getAuthorTier('Bartick (2026) - Instagram page');
    const sec = getAuthorTier('Collet et al. (2015) - BOLD project');
    const ter = getAuthorTier('Current Study');
    const other = getAuthorTier('Random Author');

    expect(bw).toBeLessThan(sec);
    expect(sec).toBeLessThan(ter);
    expect(ter).toBeLessThan(other);
  });
});
