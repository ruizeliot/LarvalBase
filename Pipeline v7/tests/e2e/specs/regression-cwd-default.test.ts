import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { createTestHarness } from '../helpers/test-harness.js';

describe('Regression: Launcher should default to cwd', () => {
  let testProjectPath: string;

  beforeEach(() => {
    // Create a temp directory to act as the "current directory"
    testProjectPath = fs.mkdtempSync(path.join(os.tmpdir(), 'cwd-test-'));
  });

  afterEach(async () => {
    // Give Windows time to release file handles
    await new Promise(resolve => setTimeout(resolve, 200));
    try {
      fs.rmSync(testProjectPath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors on Windows
    }
  });

  it('should show current working directory as default project path', async () => {
    // Run pipeline from a specific directory without any path argument
    const harness = createTestHarness([], { cwd: testProjectPath });

    try {
      // Wait for launcher to display
      await harness.waitForOutput(/PIPELINE v7|Project Path/, 5000);

      // The project path field should show the cwd, not an empty placeholder
      // Wait for the path to appear - use the folder name for simpler matching
      const folderName = path.basename(testProjectPath);
      await harness.waitForOutput(new RegExp(folderName), 3000);
    } finally {
      harness.kill();
      // Wait for process to fully exit on Windows
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  });

  it('should not show placeholder when launched from a directory', async () => {
    const harness = createTestHarness([], { cwd: testProjectPath });

    try {
      await harness.waitForOutput(/PIPELINE v7/, 5000);

      // The placeholder "/path/to/project" should NOT appear when cwd is the default
      // Give it time to render, then check output doesn't contain placeholder
      await new Promise(resolve => setTimeout(resolve, 1000));

      const allOutput = harness.stdout.join('\n');
      // Should NOT show the placeholder path
      expect(allOutput).not.toContain('/path/to/project');
    } finally {
      harness.kill();
    }
  });
});
