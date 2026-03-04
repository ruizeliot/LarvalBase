/**
 * Test that Settlement-stage sampling locations SVG icon path is URL-encoded.
 */
import { describe, it, expect } from 'vitest';
import { getSectionIcon } from '../section-icons';

describe('Settlement-stage sampling locations icon', () => {
  it('should return a URL-encoded path for Settlement-stage sampling locations', () => {
    const icon = getSectionIcon('Settlement-stage sampling locations');
    // Spaces must be %20-encoded for use in <img src>
    expect(icon).not.toContain(' ');
    expect(icon).toContain('Settlement-stage%20sampling%20locations');
  });
});
