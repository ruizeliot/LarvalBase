/**
 * Integration Test Setup
 * Pipeline v8
 *
 * Setup for integration tests - file system, services
 */
import { beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

let tempDir: string;

beforeEach(() => {
  vi.clearAllMocks();
  // Create temp directory for each test
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pipeline-test-'));
});

afterEach(() => {
  vi.restoreAllMocks();
  // Cleanup temp directory
  if (tempDir && fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

export function getTempDir(): string {
  return tempDir;
}

export async function createTempDir(prefix: string = 'pipeline-test-'): Promise<string> {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}
