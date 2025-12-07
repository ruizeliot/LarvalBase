// E2E test setup
import { beforeEach, afterEach } from 'vitest';
import { setupMockClaude, cleanupMockClaude } from './helpers/mock-claude.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, 'fixtures');

beforeEach(() => {
  setupMockClaude(FIXTURES_DIR);
});

afterEach(() => {
  cleanupMockClaude();
});
