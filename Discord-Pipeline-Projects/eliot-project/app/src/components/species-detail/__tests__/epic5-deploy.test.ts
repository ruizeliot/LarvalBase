/**
 * Tests for deploy verification.
 *
 * Verifies that key structures are properly configured for deployment.
 */
import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';

describe('Deploy verification', () => {
  it('should have tier-based author priority system', async () => {
    const source = await fs.readFile(
      path.join(process.cwd(), 'src', 'lib', 'types', 'image.types.ts'),
      'utf-8'
    );
    expect(source).toContain('BLACKWATER_AUTHORS');
    expect(source).toContain('LITERATURE_AUTHORS');
    expect(source).toContain('getAuthorTier');
  });

  it('should have SCALE and LINK in ImageMetadataSchema', async () => {
    const source = await fs.readFile(
      path.join(process.cwd(), 'src', 'lib', 'types', 'image.types.ts'),
      'utf-8'
    );
    expect(source).toContain('SCALE');
    expect(source).toContain('LINK');
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
