/**
 * Terminal Pipeline Utilities
 *
 * This module exports all utilities needed for Terminal Pipeline projects:
 * - Mock Claude CLI for testing
 * - CLET test helpers
 * - Test setup and configuration
 *
 * Install in your project:
 * ```bash
 * npm install --save-dev vitest clet node-pty @types/node
 * ```
 *
 * Usage in tests:
 * ```typescript
 * import {
 *   createTestRunner,
 *   setupMockClaude,
 *   KEYS,
 *   navigation,
 *   patterns
 * } from './test-helpers';
 *
 * describe('My CLI', () => {
 *   beforeEach(() => {
 *     setupMockClaude('my-fixture.json');
 *   });
 *
 *   it('should navigate menu', async () => {
 *     await createTestRunner()
 *       .wait('stdout', /Main Menu/)
 *       .stdin('stdout', /Menu/, navigation.selectIndex(2))
 *       .wait('stdout', patterns.success())
 *       .wait('close', 0);
 *   });
 * });
 * ```
 */

// Mock Claude utilities
export {
  spawnClaude,
  createMockFixture,
  writeMockFixture,
  FIXTURE_TEMPLATES,
  type SpawnClaudeOptions,
  type MockClaudeFixture,
  type MockOutputLine,
} from './mock-claude';

// CLET helpers
export {
  createTestRunner,
  setupMockClaude,
  clearMockClaude,
  navigation,
  textInput,
  patterns,
  waits,
  testData,
  EXTENDED_KEYS,
  runner,
  KEYS,
  type TestRunnerOptions,
} from './clet-helpers';

// Test setup
export {
  configureTests,
  createTempDir,
  createTestFixture,
  debugLog,
  waitFor,
  assertFileExists,
  assertFileContains,
  assertFileMatches,
  readJsonFile,
  fixtures,
  type TestConfig,
} from './test-setup';
