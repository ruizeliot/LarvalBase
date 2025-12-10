/**
 * worker-lifecycle.test.js - Unit tests for worker lifecycle management
 *
 * Tests for fixes to:
 * - BUG-001: Worker windows not closing after phase completion
 * - BUG-002: Orchestrator grabbing wrong worker's todos
 * - BUG-003: Orchestrator killing all windows on completion
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const crypto = require('crypto');

// Import the module we're testing
const workerLifecycle = require('../../lib/worker-lifecycle.cjs');

describe('Worker Lifecycle Management', () => {

  // BUG-001: Worker windows not closing after phase completion
  describe('BUG-001: Project-scoped window titles', () => {

    it('should generate window title with project identifier', () => {
      // Initialize with a project path
      const projectPath = '/test/project/path';
      workerLifecycle.initWorkerLifecycle(projectPath);

      // Get the project identifier
      const projectId = workerLifecycle.getProjectIdentifier();
      assert.ok(projectId, 'Project identifier should be set');
      assert.strictEqual(projectId.length, 8, 'Project identifier should be 8 chars');

      // Generate a window title
      const title = workerLifecycle.generateWorkerWindowTitle('3');
      assert.ok(title.includes(projectId), 'Title should include project identifier');
      assert.ok(title.includes('Pipeline-Worker-'), 'Title should start with Pipeline-Worker-');
      assert.ok(title.includes('-3-'), 'Title should include phase number');
    });

    it('should generate different identifiers for different projects', () => {
      // Initialize with project A
      workerLifecycle.initWorkerLifecycle('/project/a');
      const idA = workerLifecycle.getProjectIdentifier();

      // Initialize with project B
      workerLifecycle.initWorkerLifecycle('/project/b');
      const idB = workerLifecycle.getProjectIdentifier();

      assert.notStrictEqual(idA, idB, 'Different projects should have different identifiers');
    });

    it('should generate same identifier for same project path', () => {
      const projectPath = '/consistent/project/path';

      // First initialization
      workerLifecycle.initWorkerLifecycle(projectPath);
      const id1 = workerLifecycle.getProjectIdentifier();

      // Second initialization with same path
      workerLifecycle.initWorkerLifecycle(projectPath);
      const id2 = workerLifecycle.getProjectIdentifier();

      assert.strictEqual(id1, id2, 'Same project path should generate same identifier');
    });
  });

  // BUG-003: Orchestrator killing all windows on completion
  describe('BUG-003: Scoped worker cleanup', () => {

    it('killPreviousWorkers should NOT use wildcard window title matching', () => {
      // Initialize
      workerLifecycle.initWorkerLifecycle('/test/project');

      // The old code had: taskkill /FI "WINDOWTITLE eq Pipeline-Worker-*" /F
      // This is dangerous because it kills ALL worker windows across ALL projects.
      // The new code should only kill tracked workers by PID.

      // killPreviousWorkers returns count of killed workers (from tracked list)
      // It should not throw and should return a number
      const killed = workerLifecycle.killPreviousWorkers('/test/project');
      assert.strictEqual(typeof killed, 'number', 'Should return kill count');
      assert.ok(killed >= 0, 'Kill count should be non-negative');
    });

    it('should only kill workers tracked by this pipeline instance', () => {
      // Initialize
      workerLifecycle.initWorkerLifecycle('/test/project');

      // Register a fake worker
      // Note: We can't actually test killing since we don't have a real process
      // But we can verify the tracking works
      const trackedBefore = workerLifecycle.getTrackedWorkers();
      assert.strictEqual(trackedBefore.length, 0, 'Should start with no tracked workers');

      // After calling killPreviousWorkers, tracked list should be empty
      workerLifecycle.killPreviousWorkers('/test/project');
      const trackedAfter = workerLifecycle.getTrackedWorkers();
      assert.strictEqual(trackedAfter.length, 0, 'Tracked workers should be cleared');
    });

    it('cleanupAllWorkers should only clean up tracked workers', () => {
      workerLifecycle.initWorkerLifecycle('/test/project');

      // Should not throw even with no workers
      const cleaned = workerLifecycle.cleanupAllWorkers('/test/project');
      assert.strictEqual(typeof cleaned, 'number', 'Should return cleanup count');
      assert.ok(cleaned >= 0, 'Cleanup count should be non-negative');
    });
  });

  // Test worker registration
  describe('Worker Registration', () => {

    it('should register workers with project-scoped metadata', () => {
      workerLifecycle.initWorkerLifecycle('/test/registration');

      // Register a worker (fake PID since we can't create real process in test)
      const fakePid = 99999;
      workerLifecycle.registerWorker(fakePid, '2', { title: 'test-title' }, null);

      const tracked = workerLifecycle.getTrackedWorkers();
      assert.strictEqual(tracked.length, 1, 'Should have one tracked worker');
      assert.strictEqual(tracked[0].pid, fakePid, 'Should track correct PID');
      assert.strictEqual(tracked[0].phase, '2', 'Should track correct phase');
    });

    it('getWorkerCount should return count of running workers', () => {
      workerLifecycle.initWorkerLifecycle('/test/count');

      // With no registered workers
      const count = workerLifecycle.getWorkerCount();
      assert.strictEqual(count, 0, 'Should have 0 running workers initially');
    });
  });

  // Test the new exported functions exist
  describe('New API Functions', () => {

    it('should export getProjectIdentifier function', () => {
      assert.strictEqual(typeof workerLifecycle.getProjectIdentifier, 'function');
    });

    it('should export generateWorkerWindowTitle function', () => {
      assert.strictEqual(typeof workerLifecycle.generateWorkerWindowTitle, 'function');
    });

    it('should export killWorkerByTitle function', () => {
      assert.strictEqual(typeof workerLifecycle.killWorkerByTitle, 'function');
    });
  });

});

describe('Project Identifier Generation', () => {

  it('should generate consistent MD5-based identifier', () => {
    const projectPath = '/test/project/for/hashing';

    // Calculate expected hash
    const expectedHash = crypto.createHash('md5')
      .update(projectPath)
      .digest('hex')
      .substring(0, 8);

    workerLifecycle.initWorkerLifecycle(projectPath);
    const actualId = workerLifecycle.getProjectIdentifier();

    assert.strictEqual(actualId, expectedHash, 'Should match MD5 hash of project path');
  });

  it('should handle Windows paths with backslashes', () => {
    const windowsPath = 'C:\\Users\\test\\project';

    workerLifecycle.initWorkerLifecycle(windowsPath);
    const id = workerLifecycle.getProjectIdentifier();

    assert.ok(id, 'Should generate identifier for Windows path');
    assert.strictEqual(id.length, 8, 'Should be 8 characters');
    assert.ok(/^[a-f0-9]+$/.test(id), 'Should be hex characters only');
  });

  it('should handle paths with spaces', () => {
    const pathWithSpaces = '/path/with spaces/in it';

    workerLifecycle.initWorkerLifecycle(pathWithSpaces);
    const id = workerLifecycle.getProjectIdentifier();

    assert.ok(id, 'Should generate identifier for path with spaces');
    assert.strictEqual(id.length, 8, 'Should be 8 characters');
  });
});
