/**
 * Test Setup and Configuration for Terminal Pipeline E2E Tests
 *
 * This module provides the standard test setup used by all terminal
 * pipeline projects. It handles:
 * - Mock Claude configuration
 * - Test environment setup
 * - Common beforeEach/afterEach hooks
 * - Test utilities and helpers
 */

import { beforeAll, afterAll, beforeEach, afterEach, expect } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { setupMockClaude, clearMockClaude } from './clet-helpers';

/**
 * Test configuration options
 */
export interface TestConfig {
  /** Path to fixtures directory */
  fixturesDir?: string;
  /** Default fixture to use if none specified */
  defaultFixture?: string;
  /** Whether to enable debug logging */
  debug?: boolean;
  /** Timeout for tests in ms */
  timeout?: number;
  /** Whether to clean up temp files after tests */
  cleanup?: boolean;
}

/**
 * Global test state
 */
interface TestState {
  tempDirs: string[];
  originalEnv: Record<string, string | undefined>;
}

const testState: TestState = {
  tempDirs: [],
  originalEnv: {},
};

/**
 * Configure the test environment
 *
 * Call this in your test setup file (e.g., tests/e2e/setup.ts)
 *
 * @param config - Test configuration
 */
export function configureTests(config: TestConfig = {}): void {
  const {
    fixturesDir = path.resolve(process.cwd(), 'tests/e2e/fixtures'),
    defaultFixture,
    debug = false,
    timeout = 30000,
    cleanup = true,
  } = config;

  // Store configuration for later use
  process.env.TEST_FIXTURES_DIR = fixturesDir;
  if (defaultFixture) {
    process.env.TEST_DEFAULT_FIXTURE = defaultFixture;
  }
  if (debug) {
    process.env.TEST_DEBUG = 'true';
  }

  // Global setup
  beforeAll(() => {
    // Save original environment
    testState.originalEnv = {
      USE_MOCK_CLAUDE: process.env.USE_MOCK_CLAUDE,
      MOCK_CLAUDE_FIXTURE: process.env.MOCK_CLAUDE_FIXTURE,
      FORCE_COLOR: process.env.FORCE_COLOR,
      NO_COLOR: process.env.NO_COLOR,
    };

    // Disable colors for consistent output
    process.env.FORCE_COLOR = '0';
    process.env.NO_COLOR = '1';

    // Always use mock Claude in tests
    process.env.USE_MOCK_CLAUDE = 'true';
  });

  // Global teardown
  afterAll(() => {
    // Restore original environment
    for (const [key, value] of Object.entries(testState.originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    // Clean up temp directories
    if (cleanup) {
      for (const dir of testState.tempDirs) {
        if (fs.existsSync(dir)) {
          fs.rmSync(dir, { recursive: true, force: true });
        }
      }
      testState.tempDirs = [];
    }
  });

  // Per-test setup
  beforeEach(() => {
    // Set default fixture if specified
    if (defaultFixture) {
      setupMockClaude(defaultFixture, fixturesDir);
    }
  });

  // Per-test teardown
  afterEach(() => {
    clearMockClaude();
  });
}

/**
 * Create a temporary directory for test artifacts
 *
 * @param prefix - Prefix for the temp directory name
 * @returns Path to the created directory
 */
export function createTempDir(prefix: string = 'test'): string {
  const tempBase = path.join(process.cwd(), '.test-temp');
  if (!fs.existsSync(tempBase)) {
    fs.mkdirSync(tempBase, { recursive: true });
  }

  const tempDir = path.join(tempBase, `${prefix}-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  testState.tempDirs.push(tempDir);
  return tempDir;
}

/**
 * Create a test fixture file
 *
 * @param name - Fixture file name
 * @param content - Fixture content (object will be JSON stringified)
 * @returns Path to the created fixture
 */
export function createTestFixture(
  name: string,
  content: object
): string {
  const fixturesDir = process.env.TEST_FIXTURES_DIR ||
    path.resolve(process.cwd(), 'tests/e2e/fixtures');

  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }

  const fixturePath = path.join(fixturesDir, name);
  fs.writeFileSync(fixturePath, JSON.stringify(content, null, 2));

  return fixturePath;
}

/**
 * Debug log (only outputs when TEST_DEBUG is true)
 */
export function debugLog(...args: unknown[]): void {
  if (process.env.TEST_DEBUG === 'true') {
    console.log('[TEST DEBUG]', ...args);
  }
}

/**
 * Wait for a condition to be true
 *
 * @param condition - Function that returns true when condition is met
 * @param options - Wait options
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number; message?: string } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100, message = 'Condition not met' } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Timeout: ${message}`);
}

/**
 * Assert that a file exists
 */
export function assertFileExists(filePath: string): void {
  expect(fs.existsSync(filePath), `File should exist: ${filePath}`).toBe(true);
}

/**
 * Assert that a file contains specific content
 */
export function assertFileContains(filePath: string, content: string): void {
  assertFileExists(filePath);
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  expect(fileContent).toContain(content);
}

/**
 * Assert that a file matches a pattern
 */
export function assertFileMatches(filePath: string, pattern: RegExp): void {
  assertFileExists(filePath);
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  expect(fileContent).toMatch(pattern);
}

/**
 * Read and parse a JSON file
 */
export function readJsonFile<T = unknown>(filePath: string): T {
  assertFileExists(filePath);
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

/**
 * Standard test fixture templates
 */
export const fixtures = {
  /**
   * Empty/minimal fixture (for basic navigation tests)
   */
  minimal: {
    output: ['Ready'],
    finalState: { exitCode: 0 },
    lineDelay: 10,
  },

  /**
   * Quick success fixture
   */
  quickSuccess: {
    output: [
      '[TODO] Starting task...',
      '[PROGRESS] {"percent": 50}',
      '[TODO] Task complete!',
    ],
    finalState: { exitCode: 0 },
    lineDelay: 20,
  },

  /**
   * Error fixture
   */
  error: {
    output: [
      '[TODO] Starting task...',
      '[ERROR] Something went wrong',
    ],
    finalState: { exitCode: 1 },
    lineDelay: 20,
  },

  /**
   * Timeout simulation fixture
   */
  slow: {
    output: [
      '[TODO] Starting slow task...',
      '[PROGRESS] {"percent": 10}',
      'Processing...',
      '[PROGRESS] {"percent": 50}',
      'Still processing...',
      '[PROGRESS] {"percent": 90}',
      '[TODO] Task complete!',
    ],
    finalState: { exitCode: 0 },
    lineDelay: 500,  // Slow output
  },
};

/**
 * Export common test utilities
 */
export {
  setupMockClaude,
  clearMockClaude,
} from './clet-helpers';
