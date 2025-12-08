/**
 * E2E Test Setup
 * Pipeline v8
 *
 * Setup for E2E tests - CLET, node-pty, mock Claude
 */
import { beforeEach, afterEach, vi } from 'vitest';
import * as path from 'path';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

beforeEach(() => {
  vi.clearAllMocks();
  // Set up mock Claude environment
  process.env.MOCK_CLAUDE_DIR = FIXTURES_DIR;
  process.env.USE_MOCK_CLAUDE = 'true';
});

afterEach(() => {
  vi.restoreAllMocks();
  // Clean up mock Claude environment
  delete process.env.MOCK_CLAUDE_DIR;
  delete process.env.USE_MOCK_CLAUDE;
});

export { FIXTURES_DIR };
