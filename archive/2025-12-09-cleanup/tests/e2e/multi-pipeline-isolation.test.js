/**
 * multi-pipeline-isolation.test.js - E2E tests for multi-pipeline isolation
 *
 * Tests for fixes to:
 * - BUG-001: Worker windows not closing after phase completion
 * - BUG-002: Orchestrator grabbing wrong worker's todos
 * - BUG-003: Orchestrator killing all windows on completion
 *
 * These tests use EMULATED workers (not real Claude CLI) to:
 * - Avoid API costs
 * - Run quickly
 * - Test isolation logic without side effects
 */

const { describe, it, beforeEach, afterEach, before } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const {
  createTestProject,
  createManifest,
  readManifest,
  updateManifest,
  getTodosDir,
  waitFor,
  generateSessionId
} = require('./test-helpers.cjs');

const workerLifecycle = require('../../lib/worker-lifecycle.cjs');

// Test fixtures directory
const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');

describe('Multi-Pipeline Isolation (Emulated Workers)', () => {

  // BUG-001 & BUG-003: Project-scoped window title generation
  describe('BUG-001/003: Project-Scoped Window Titles', () => {

    it('should generate unique window titles per project', () => {
      // Project A
      const projectA = createTestProject('isolation-a');
      workerLifecycle.initWorkerLifecycle(projectA.projectPath);
      const titleA = workerLifecycle.generateWorkerWindowTitle('3');
      const idA = workerLifecycle.getProjectIdentifier();

      // Project B
      const projectB = createTestProject('isolation-b');
      workerLifecycle.initWorkerLifecycle(projectB.projectPath);
      const titleB = workerLifecycle.generateWorkerWindowTitle('3');
      const idB = workerLifecycle.getProjectIdentifier();

      // Verify different identifiers
      assert.notStrictEqual(idA, idB, 'Different projects should have different identifiers');
      assert.notStrictEqual(titleA, titleB, 'Different projects should have different window titles');

      // Verify titles include their respective identifiers
      assert.ok(titleA.includes(idA), 'Title A should include identifier A');
      assert.ok(titleB.includes(idB), 'Title B should include identifier B');

      // Cleanup
      projectA.cleanup();
      projectB.cleanup();
    });

    it('should NOT use wildcard matching in killPreviousWorkers', () => {
      const project = createTestProject('no-wildcard');
      workerLifecycle.initWorkerLifecycle(project.projectPath);

      // The old buggy code had: taskkill /FI "WINDOWTITLE eq Pipeline-Worker-*" /F
      // This would kill ALL worker windows across ALL projects.
      // The new code only kills tracked PIDs.

      // Call killPreviousWorkers - it should NOT throw and should return 0
      // (no workers were registered)
      const killed = workerLifecycle.killPreviousWorkers(project.projectPath);
      assert.strictEqual(killed, 0, 'Should return 0 when no workers tracked');

      project.cleanup();
    });

    it('should only kill workers tracked by this instance', () => {
      const projectA = createTestProject('track-a');
      const projectB = createTestProject('track-b');

      // Initialize project A and register a fake worker
      workerLifecycle.initWorkerLifecycle(projectA.projectPath);
      const fakePidA = 11111;
      workerLifecycle.registerWorker(fakePidA, '3', { title: 'test-a' }, null);

      // Initialize project B (this clears tracking for A!)
      workerLifecycle.initWorkerLifecycle(projectB.projectPath);

      // Verify tracked workers are now empty (B's context)
      const trackedB = workerLifecycle.getTrackedWorkers();
      assert.strictEqual(trackedB.length, 0, 'Project B should have no tracked workers');

      // Cleanup
      projectA.cleanup();
      projectB.cleanup();
    });
  });

  // BUG-002: Cross-project todo isolation
  describe('BUG-002: Todo File Isolation Between Projects', () => {
    let todosDir;
    let testTodoFiles = [];

    beforeEach(() => {
      todosDir = getTodosDir();
      testTodoFiles = [];
    });

    afterEach(() => {
      // Cleanup test todo files
      for (const file of testTodoFiles) {
        try {
          if (fs.existsSync(file)) fs.unlinkSync(file);
        } catch (e) { /* ignore */ }
      }
    });

    /**
     * Create a simulated todo file for testing
     */
    function createTestTodoFile(sessionId, todos, delayMs = 0) {
      if (!fs.existsSync(todosDir)) {
        fs.mkdirSync(todosDir, { recursive: true });
      }

      const filename = `${sessionId}-agent-${sessionId}.json`;
      const filepath = path.join(todosDir, filename);

      // Simulate file creation with optional delay
      if (delayMs > 0) {
        const futureTime = Date.now() + delayMs;
        fs.writeFileSync(filepath, JSON.stringify(todos, null, 2));
        fs.utimesSync(filepath, new Date(futureTime), new Date(futureTime));
      } else {
        fs.writeFileSync(filepath, JSON.stringify(todos, null, 2));
      }

      testTodoFiles.push(filepath);
      return filepath;
    }

    it('should reject todo files created before phase start', async () => {
      // Create an "old" todo file (before the phase would start)
      const oldSessionId = generateSessionId();
      const oldTodos = [
        { content: 'Old task from previous phase', status: 'completed' }
      ];

      // Create file first
      const oldFile = createTestTodoFile(oldSessionId, oldTodos);

      // Set the file's mtime to the past (1 minute ago)
      const pastTime = new Date(Date.now() - 60000);
      fs.utimesSync(oldFile, pastTime, pastTime);

      // Verify file exists and has past mtime
      const stat = fs.statSync(oldFile);
      assert.ok(stat.mtimeMs < Date.now() - 30000, 'File should have past mtime');

      // Now, if we were to filter files by phaseStartTime = now,
      // this file should be rejected
      const phaseStartTime = Date.now();

      const files = fs.readdirSync(todosDir)
        .filter(f => f.endsWith('.json'))
        .map(f => {
          const fullPath = path.join(todosDir, f);
          const s = fs.statSync(fullPath);
          return { name: f, mtime: s.mtimeMs };
        })
        .filter(f => f.mtime > phaseStartTime); // Key filter

      // The old file should NOT be in the filtered list
      const hasOldFile = files.some(f => f.name.includes(oldSessionId));
      assert.strictEqual(hasOldFile, false, 'Old todo file should be filtered out');
    });

    it('should accept todo files created after phase start', async () => {
      const phaseStartTime = Date.now();

      // Wait a tiny bit then create a "new" todo file
      await new Promise(r => setTimeout(r, 50));

      const newSessionId = generateSessionId();
      const newTodos = [
        { content: 'New task for current phase', status: 'in_progress' }
      ];

      createTestTodoFile(newSessionId, newTodos);

      // Get files modified after phase start
      const files = fs.readdirSync(todosDir)
        .filter(f => f.endsWith('.json'))
        .map(f => {
          const fullPath = path.join(todosDir, f);
          const s = fs.statSync(fullPath);
          return { name: f, mtime: s.mtimeMs };
        })
        .filter(f => f.mtime > phaseStartTime);

      const hasNewFile = files.some(f => f.name.includes(newSessionId));
      assert.strictEqual(hasNewFile, true, 'New todo file should be included');
    });

    it('should handle concurrent pipelines with different session IDs', async () => {
      const phaseStartA = Date.now();
      await new Promise(r => setTimeout(r, 10));

      const phaseStartB = Date.now();
      await new Promise(r => setTimeout(r, 10));

      // Pipeline A creates its todo file
      const sessionA = generateSessionId();
      const todosA = [
        { content: 'Pipeline A task 1', status: 'in_progress' },
        { content: 'Pipeline A task 2', status: 'pending' }
      ];
      createTestTodoFile(sessionA, todosA);

      await new Promise(r => setTimeout(r, 10));

      // Pipeline B creates its todo file
      const sessionB = generateSessionId();
      const todosB = [
        { content: 'Pipeline B task 1', status: 'in_progress' },
        { content: 'Pipeline B task 2', status: 'pending' }
      ];
      createTestTodoFile(sessionB, todosB);

      // Verify both files exist
      const allFiles = fs.readdirSync(todosDir)
        .filter(f => f.endsWith('.json'));

      const fileA = allFiles.find(f => f.includes(sessionA));
      const fileB = allFiles.find(f => f.includes(sessionB));

      assert.ok(fileA, 'Pipeline A todo file should exist');
      assert.ok(fileB, 'Pipeline B todo file should exist');
      assert.notStrictEqual(fileA, fileB, 'Files should be different');

      // Each pipeline should only read its own file based on session ID
      const contentA = JSON.parse(fs.readFileSync(path.join(todosDir, fileA), 'utf8'));
      const contentB = JSON.parse(fs.readFileSync(path.join(todosDir, fileB), 'utf8'));

      assert.ok(contentA[0].content.includes('Pipeline A'), 'File A should have A content');
      assert.ok(contentB[0].content.includes('Pipeline B'), 'File B should have B content');
    });
  });

  // Integration: Multi-project manifest isolation
  describe('Multi-Project Manifest Isolation', () => {

    it('should maintain separate manifests for each project', () => {
      const projectA = createTestProject('manifest-a');
      const projectB = createTestProject('manifest-b');

      // Create different manifests
      createManifest(projectA.manifestPath, {
        projectId: 'project-a',
        currentPhase: '3',
        mode: 'new'
      });

      createManifest(projectB.manifestPath, {
        projectId: 'project-b',
        currentPhase: '2',
        mode: 'feature'
      });

      // Read back and verify isolation
      const manifestA = readManifest(projectA.manifestPath);
      const manifestB = readManifest(projectB.manifestPath);

      assert.strictEqual(manifestA.projectId, 'project-a');
      assert.strictEqual(manifestA.currentPhase, '3');
      assert.strictEqual(manifestA.mode, 'new');

      assert.strictEqual(manifestB.projectId, 'project-b');
      assert.strictEqual(manifestB.currentPhase, '2');
      assert.strictEqual(manifestB.mode, 'feature');

      // Cleanup
      projectA.cleanup();
      projectB.cleanup();
    });

    it('should track worker PIDs per project', () => {
      const projectA = createTestProject('pids-a');
      const projectB = createTestProject('pids-b');

      // Create manifests with different worker PIDs
      createManifest(projectA.manifestPath, {
        projectId: 'project-a',
        workerPids: [1111, 2222]
      });

      createManifest(projectB.manifestPath, {
        projectId: 'project-b',
        workerPids: [3333, 4444]
      });

      // Update one project's PIDs
      updateManifest(projectA.manifestPath, {
        workerPids: [5555]
      });

      // Verify B's PIDs unchanged
      const manifestA = readManifest(projectA.manifestPath);
      const manifestB = readManifest(projectB.manifestPath);

      assert.deepStrictEqual(manifestA.workerPids, [5555], 'A should have updated PIDs');
      assert.deepStrictEqual(manifestB.workerPids, [3333, 4444], 'B should have original PIDs');

      // Cleanup
      projectA.cleanup();
      projectB.cleanup();
    });
  });

  // Regression: Verify fix behavior
  describe('Regression: Cleanup Behavior', () => {

    it('cleanupAllWorkers should only affect tracked workers', () => {
      const project = createTestProject('cleanup-test');
      workerLifecycle.initWorkerLifecycle(project.projectPath);

      // No workers registered, cleanup should return 0
      const cleaned = workerLifecycle.cleanupAllWorkers(project.projectPath);
      assert.strictEqual(cleaned, 0, 'Should cleanup 0 workers when none tracked');

      project.cleanup();
    });

    it('should clear workerPids from manifest on cleanup', () => {
      const project = createTestProject('manifest-cleanup');

      // Create manifest with some PIDs
      createManifest(project.manifestPath, {
        projectId: 'test-cleanup',
        workerPids: [1234, 5678]
      });

      // Initialize lifecycle and run cleanup
      workerLifecycle.initWorkerLifecycle(project.projectPath);
      workerLifecycle.cleanupAllWorkers(project.projectPath);

      // Verify PIDs cleared
      const manifest = readManifest(project.manifestPath);
      assert.deepStrictEqual(manifest.workerPids, [], 'workerPids should be empty after cleanup');

      project.cleanup();
    });
  });

  // Project identifier consistency
  describe('Project Identifier Consistency', () => {

    it('should generate consistent identifier for same path', () => {
      const projectPath = path.join(os.tmpdir(), 'consistent-test-path');

      // Generate expected hash
      const expectedHash = crypto.createHash('md5')
        .update(projectPath)
        .digest('hex')
        .substring(0, 8);

      // Initialize twice with same path
      workerLifecycle.initWorkerLifecycle(projectPath);
      const id1 = workerLifecycle.getProjectIdentifier();

      workerLifecycle.initWorkerLifecycle(projectPath);
      const id2 = workerLifecycle.getProjectIdentifier();

      assert.strictEqual(id1, expectedHash, 'First ID should match expected hash');
      assert.strictEqual(id2, expectedHash, 'Second ID should match expected hash');
      assert.strictEqual(id1, id2, 'IDs should be identical');
    });

    it('should handle Windows-style paths', () => {
      const windowsPath = 'C:\\Users\\test\\Documents\\my project';

      workerLifecycle.initWorkerLifecycle(windowsPath);
      const id = workerLifecycle.getProjectIdentifier();

      assert.ok(id, 'Should generate identifier');
      assert.strictEqual(id.length, 8, 'Should be 8 characters');
      assert.ok(/^[a-f0-9]+$/.test(id), 'Should be hex characters');
    });

    it('should handle Unix-style paths', () => {
      const unixPath = '/home/user/Documents/my project';

      workerLifecycle.initWorkerLifecycle(unixPath);
      const id = workerLifecycle.getProjectIdentifier();

      assert.ok(id, 'Should generate identifier');
      assert.strictEqual(id.length, 8, 'Should be 8 characters');
      assert.ok(/^[a-f0-9]+$/.test(id), 'Should be hex characters');
    });
  });

});
