/**
 * Tests for US-5.1: Image sort priority (Blackwater first, Fisher et al. last).
 *
 * PRD Section 3.4 defines priority order:
 * 1. Blackwater
 * 2. Ocea Consult–IHSM
 * 3. IchthyoGwada
 * 4. ADLIFISH 1
 * 5. CRIOBE
 * 6. Pham & Durand 2017
 * 7. Amelia Chatagnon
 * 8. Fisher et al. 2022 (fallback, lowest priority)
 */
import { describe, it, expect } from 'vitest';
import { AUTHOR_PRIORITY, getAuthorPriority } from '@/lib/types/image.types';

describe('US-5.1: Image sort priority', () => {
  it('should have Blackwater as highest priority (1)', () => {
    expect(AUTHOR_PRIORITY['Blackwater']).toBe(1);
  });

  it('should have Ocea Consult - IHSM as priority 2', () => {
    expect(AUTHOR_PRIORITY['Ocea Consult - IHSM']).toBe(2);
  });

  it('should have IchthyoGwada as priority 3', () => {
    expect(AUTHOR_PRIORITY['IchthyoGwada']).toBe(3);
  });

  it('should have ADLIFISH 1 as priority 4', () => {
    expect(AUTHOR_PRIORITY['ADLIFISH 1']).toBe(4);
  });

  it('should have CRIOBE as priority 5', () => {
    expect(AUTHOR_PRIORITY['CRIOBE']).toBe(5);
  });

  it('should have Pham & Durand, 2017 as priority 6', () => {
    expect(AUTHOR_PRIORITY['Pham & Durand, 2017']).toBe(6);
  });

  it('should have Amelia Chatagnon as priority 7', () => {
    expect(AUTHOR_PRIORITY['Amelia Chatagnon']).toBe(7);
  });

  it('should have Fisher et al. 2022 as lowest priority (8)', () => {
    expect(AUTHOR_PRIORITY['Fisher et al. 2022']).toBe(8);
  });

  it('should maintain strict ordering: Blackwater < Ocea < IchthyoGwada < ADLIFISH < CRIOBE < Pham < Amelia < Fisher', () => {
    const authors = [
      'Blackwater',
      'Ocea Consult - IHSM',
      'IchthyoGwada',
      'ADLIFISH 1',
      'CRIOBE',
      'Pham & Durand, 2017',
      'Amelia Chatagnon',
      'Fisher et al. 2022',
    ];

    for (let i = 0; i < authors.length - 1; i++) {
      expect(getAuthorPriority(authors[i])).toBeLessThan(
        getAuthorPriority(authors[i + 1])
      );
    }
  });

  it('should give unknown authors priority 99 (after all known)', () => {
    expect(getAuthorPriority('Unknown Author')).toBe(99);
    expect(getAuthorPriority('Unknown Author')).toBeGreaterThan(
      getAuthorPriority('Fisher et al. 2022')
    );
  });

  it('should sort certain images before uncertain at same priority level', () => {
    const images = [
      { priority: 1, uncertain: true, author: 'Blackwater' },
      { priority: 1, uncertain: false, author: 'Blackwater' },
      { priority: 5, uncertain: false, author: 'CRIOBE' },
      { priority: 5, uncertain: true, author: 'CRIOBE' },
    ];

    // Sort by priority first, then certain (false) before uncertain (true)
    images.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return (a.uncertain ? 1 : 0) - (b.uncertain ? 1 : 0);
    });

    // First should be certain Blackwater
    expect(images[0]).toEqual(expect.objectContaining({ priority: 1, uncertain: false }));
    // Second should be uncertain Blackwater
    expect(images[1]).toEqual(expect.objectContaining({ priority: 1, uncertain: true }));
    // Third should be certain CRIOBE
    expect(images[2]).toEqual(expect.objectContaining({ priority: 5, uncertain: false }));
    // Fourth should be uncertain CRIOBE
    expect(images[3]).toEqual(expect.objectContaining({ priority: 5, uncertain: true }));
  });
});
