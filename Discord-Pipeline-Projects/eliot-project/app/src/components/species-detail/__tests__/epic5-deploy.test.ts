/**
 * Tests for US-5.6: Deploy verification.
 *
 * Verifies that Epic 5 changes are properly structured for deployment.
 */
import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';

describe('US-5.6: Deploy verification', () => {
  it('should have updated AUTHOR_PRIORITY with correct order', async () => {
    const source = await fs.readFile(
      path.join(process.cwd(), 'src', 'lib', 'types', 'image.types.ts'),
      'utf-8'
    );
    // Verify Blackwater=1, Fisher=8 (first and last)
    expect(source).toContain("'Blackwater': 1");
    expect(source).toContain("'Fisher et al. 2022': 8");
    // Verify IchthyoGwada=3 (was previously 4)
    expect(source).toContain("'IchthyoGwada': 3");
  });

  it('should have getSourceDescription function', async () => {
    const source = await fs.readFile(
      path.join(process.cwd(), 'src', 'lib', 'types', 'image.types.ts'),
      'utf-8'
    );
    expect(source).toContain('getSourceDescription');
    expect(source).toContain('Polynesia — CRIOBE field collection');
    expect(source).toContain('Maldives — ADLIFISH survey');
    expect(source).toContain("'classified_bw_images_species': 'Blackwater'");
  });

  it('should have lightbox with pure black background', async () => {
    const source = await fs.readFile(
      path.join(process.cwd(), 'src', 'components', 'species-detail', 'species-image-gallery.tsx'),
      'utf-8'
    );
    expect(source).toContain('bg-black border-none');
  });

  it('should have max-h constraint for caption visibility', async () => {
    const source = await fs.readFile(
      path.join(process.cwd(), 'src', 'components', 'species-detail', 'species-image-gallery.tsx'),
      'utf-8'
    );
    expect(source).toContain('max-h-[60vh]');
  });

  it('should NOT have Image only badge in species header (removed per QA)', async () => {
    const source = await fs.readFile(
      path.join(process.cwd(), 'src', 'components', 'species-detail', 'species-header.tsx'),
      'utf-8'
    );
    expect(source).not.toContain('Image only');
  });
});
