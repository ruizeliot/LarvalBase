import { vi, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Mock temp directory for tests - use a unique base dir for entire test run
export const TEST_TEMP_DIR = path.join(os.tmpdir(), `pipeline-v7-test-${Date.now()}`);

// Create temp directory once before all tests
beforeAll(async () => {
  await fs.mkdir(TEST_TEMP_DIR, { recursive: true });
});

// Clean up temp directory once after all tests
afterAll(async () => {
  try {
    await fs.rm(TEST_TEMP_DIR, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
});

// Mock process.spawn for Windows Terminal
vi.mock('child_process', async () => {
  const actual = await vi.importActual('child_process');
  return {
    ...actual,
    spawn: vi.fn().mockImplementation(() => ({
      pid: 12345,
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn((event, callback) => {
        if (event === 'spawn') {
          setTimeout(() => callback(), 10);
        }
      }),
      kill: vi.fn(),
    })),
  };
});
