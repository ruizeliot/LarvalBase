/**
 * Tests for US-5.3: Fix captions for Polynesia, Maldives, classified_bw.
 *
 * PRD Section 3.4: Fix missing captions for images from:
 * - images/Polynesia → "CRIOBE field collection"
 * - images/Maldives → "ADLIFISH survey"
 * - classified_bw_images_species → "Blackwater — Species ID confirmed"
 */
import { describe, it, expect } from 'vitest';
import { getSourceDescription } from '@/lib/types/image.types';

describe('US-5.3: Image caption fixes', () => {
  it('should return proper source description for Polynesia path', () => {
    const desc = getSourceDescription('Polynesia');
    expect(desc).toBe('Polynesia — CRIOBE field collection');
  });

  it('should return proper source description for Maldives path', () => {
    const desc = getSourceDescription('Maldives');
    expect(desc).toBe('Maldives — ADLIFISH survey');
  });

  it('should return proper source description for classified_bw_images_species path', () => {
    const desc = getSourceDescription('classified_bw_images_species');
    expect(desc).toBe('Blackwater — Species ID confirmed');
  });

  it('should return proper source description for Madagascar - Reunion path', () => {
    const desc = getSourceDescription('Madagascar - Reunion');
    expect(desc).toBe('Madagascar — Ocea Consult–IHSM');
  });

  it('should return proper source description for Guadeloupe paths', () => {
    expect(getSourceDescription('Guadeloupe')).toBe('Guadeloupe — IchthyoGwada');
    expect(getSourceDescription('Guadeloupe - Amelia')).toBe('Guadeloupe — Amelia Chatagnon');
  });

  it('should return proper source description for Vietnam path', () => {
    const desc = getSourceDescription('Vietnam');
    expect(desc).toBe('Vietnam — Pham & Durand');
  });

  it('should return proper source description for Fisher path', () => {
    const desc = getSourceDescription('Fisher');
    expect(desc).toBe('Fisher et al. 2022');
  });

  it('should return the path itself for unknown paths', () => {
    const desc = getSourceDescription('unknown/path');
    expect(desc).toBe('unknown/path');
  });
});
