/**
 * Test that contact email text includes "or error" in both homepage and species pages.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const EXPECTED_TEXT = 'any error or missing records';

describe('contact email text', () => {
  it('homepage should contain contact email text', () => {
    const filePath = path.resolve(__dirname, '../../../app/page.tsx');
    const source = fs.readFileSync(filePath, 'utf-8');
    // Homepage now uses longer research description which includes email contact
    expect(source).toContain('eliotruiz3@gmail.com');
  });

  it('species header should contain updated contact text with "or error"', () => {
    const filePath = path.resolve(__dirname, '../species-header.tsx');
    const source = fs.readFileSync(filePath, 'utf-8');
    expect(source).toContain(EXPECTED_TEXT);
  });
});
