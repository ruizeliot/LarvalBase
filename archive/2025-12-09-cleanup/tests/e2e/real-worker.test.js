/**
 * real-worker.test.js - E2E tests for Worker behavior (EMULATED)
 *
 * These tests EMULATE worker behavior without spawning real Claude CLI.
 * Tests cover: worker spawning logic, process lifecycle, cleanup, and integration.
 *
 * NO REAL CLAUDE CLI CALLS - all worker behavior is simulated via manifest/file manipulation.
 */

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const helpers = require('./test-helpers.cjs');
const workerLifecycle = require(path.join(helpers.PIPELINE_OFFICE, 'lib', 'worker-lifecycle.cjs'));

describe('Worker E2E Tests (Emulated)', () => {
  let testProject;

  beforeEach(() => {
    testProject = helpers.createTestProject('emulated-worker-test');
    helpers.createManifest(testProject.manifestPath, {});
    workerLifecycle.initWorkerLifecycle(testProject.projectPath);
  });

  afterEach(() => {
    try {
      workerLifecycle.cleanupAllWorkers(testProject.projectPath);
    } catch (e) { /* ignore */ }
    if (testProject) testProject.cleanup();
  });

  // ============ Worker Spawning Tests (Emulated) ============

  describe('Worker Spawning (Emulated)', () => {

    it('should register worker with PID tracking', () => {
      const fakePid = 12345;
      workerLifecycle.registerWorker(fakePid, '1', { title: 'Test-Worker-Spawn' }, testProject.projectPath);

      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.ok(manifest.workerPids.includes(fakePid), 'PID should be tracked in manifest');
    });

    it('should track worker session ID', () => {
      const fakePid = 12346;
      const sessionId = 'e2e-test-session-' + Date.now();
      workerLifecycle.registerWorker(fakePid, '1', { sessionId }, testProject.projectPath);

      const workers = workerLifecycle.getTrackedWorkers();
      const worker = workers.find(w => w.pid === fakePid);
      assert.ok(worker, 'Worker should be tracked');
      assert.strictEqual(worker.sessionId, sessionId, 'Session ID should be stored');
    });

    it('should register worker with custom title', () => {
      const fakePid = 12347;
      const customTitle = 'Custom-E2E-Test-Title';
      workerLifecycle.registerWorker(fakePid, '1', { title: customTitle }, testProject.projectPath);

      const workers = workerLifecycle.getTrackedWorkers();
      const worker = workers.find(w => w.pid === fakePid);
      assert.strictEqual(worker.title, customTitle);
    });

    it('should generate project-scoped window title', () => {
      const title = workerLifecycle.generateWorkerWindowTitle('3');
      const projectId = workerLifecycle.getProjectIdentifier();

      assert.ok(title.includes('Pipeline-Worker-'), 'Title should have prefix');
      assert.ok(title.includes(projectId), 'Title should include project identifier');
    });

  });

  // ============ Worker Cleanup Tests (Emulated) ============

  describe('Worker Cleanup (Emulated)', () => {

    it('should remove worker from tracking on cleanup', () => {
      const fakePid = 22222;
      workerLifecycle.registerWorker(fakePid, '1', {}, testProject.projectPath);

      assert.strictEqual(workerLifecycle.getTrackedWorkers().length, 1);

      workerLifecycle.cleanupAllWorkers(testProject.projectPath);

      assert.strictEqual(workerLifecycle.getTrackedWorkers().length, 0);
    });

    it('should clear workerPids in manifest after cleanup', () => {
      workerLifecycle.registerWorker(22223, '1', {}, testProject.projectPath);
      workerLifecycle.registerWorker(22224, '2', {}, testProject.projectPath);

      let manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.workerPids.length, 2);

      workerLifecycle.cleanupAllWorkers(testProject.projectPath);

      manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.workerPids.length, 0);
    });

    it('should handle cleanup when no workers registered', () => {
      const cleaned = workerLifecycle.cleanupAllWorkers(testProject.projectPath);
      assert.strictEqual(cleaned, 0);
    });

    it('should kill previous workers before registering new', () => {
      workerLifecycle.registerWorker(22225, '1', {}, testProject.projectPath);
      workerLifecycle.registerWorker(22226, '1', {}, testProject.projectPath);

      assert.strictEqual(workerLifecycle.getTrackedWorkers().length, 2);

      // Kill previous workers
      workerLifecycle.killPreviousWorkers(testProject.projectPath);

      assert.strictEqual(workerLifecycle.getTrackedWorkers().length, 0);

      // Register new worker
      workerLifecycle.registerWorker(22227, '2', {}, testProject.projectPath);
      assert.strictEqual(workerLifecycle.getTrackedWorkers().length, 1);
    });

  });

  // ============ Process Count Tests (Emulated) ============

  describe('Process Counting (Emulated)', () => {

    it('should count Claude processes', () => {
      const count = helpers.countClaudeProcesses();
      assert.strictEqual(typeof count, 'number');
      assert.ok(count >= 0);
    });

    it('should get PIDs of Claude processes', () => {
      const pids = helpers.getClaudePids();
      assert.ok(Array.isArray(pids));
      pids.forEach(pid => {
        assert.strictEqual(typeof pid, 'number');
      });
    });

    it('should track worker count correctly', () => {
      assert.strictEqual(workerLifecycle.getWorkerCount(), 0);

      // Register workers with fake PIDs (won't be "running")
      workerLifecycle.registerWorker(33331, '1', {}, testProject.projectPath);
      workerLifecycle.registerWorker(33332, '2', {}, testProject.projectPath);

      // getWorkerCount checks if processes are actually running
      // Fake PIDs won't be running, so count stays 0
      assert.strictEqual(workerLifecycle.getWorkerCount(), 0);

      // But tracked workers should have 2
      assert.strictEqual(workerLifecycle.getTrackedWorkers().length, 2);
    });

  });

  // ============ NEW Mode Tests (Emulated) ============

  describe('NEW Mode Pipeline Tests (Emulated)', () => {

    it('should track Phase 1 NEW worker correctly', () => {
      const fakePid = 44441;
      workerLifecycle.registerWorker(fakePid, '1', {
        title: 'Test-Phase1-New',
        mode: 'new'
      }, testProject.projectPath);

      const workers = workerLifecycle.getTrackedWorkers();
      assert.strictEqual(workers.length, 1);
      assert.strictEqual(workers[0].phase, '1');
    });

    it('should track Phase 2 NEW worker correctly', () => {
      const fakePid = 44442;
      workerLifecycle.registerWorker(fakePid, '2', {
        title: 'Test-Phase2-New',
        mode: 'new'
      }, testProject.projectPath);

      const workers = workerLifecycle.getTrackedWorkers();
      assert.strictEqual(workers[0].phase, '2');
    });

    it('should track Phase 4 NEW worker (looping)', () => {
      const fakePid = 44444;
      workerLifecycle.registerWorker(fakePid, '4', {
        title: 'Test-Phase4-New',
        mode: 'new',
        epic: 1
      }, testProject.projectPath);

      const workers = workerLifecycle.getTrackedWorkers();
      assert.strictEqual(workers[0].phase, '4');
    });

  });

  // ============ FEATURE Mode Tests (Emulated) ============

  describe('FEATURE Mode Pipeline Tests (Emulated)', () => {

    it('should track Phase 1 FEATURE worker', () => {
      const fakePid = 55551;
      workerLifecycle.registerWorker(fakePid, '1', {
        title: 'Test-Phase1-Feature',
        mode: 'feature'
      }, testProject.projectPath);

      const workers = workerLifecycle.getTrackedWorkers();
      assert.strictEqual(workers.length, 1);
    });

    it('should track Phase 3 FEATURE worker (looping)', () => {
      const fakePid = 55553;
      workerLifecycle.registerWorker(fakePid, '3', {
        title: 'Test-Phase3-Feature',
        mode: 'feature',
        epic: 2
      }, testProject.projectPath);

      const workers = workerLifecycle.getTrackedWorkers();
      assert.strictEqual(workers[0].phase, '3');
    });

  });

  // ============ FIX Mode Tests (Emulated) ============

  describe('FIX Mode Pipeline Tests (Emulated)', () => {

    it('should track Phase 1 FIX worker', () => {
      const fakePid = 66661;
      workerLifecycle.registerWorker(fakePid, '1', {
        title: 'Test-Phase1-Fix',
        mode: 'fix'
      }, testProject.projectPath);

      const workers = workerLifecycle.getTrackedWorkers();
      assert.strictEqual(workers.length, 1);
      assert.strictEqual(workers[0].phase, '1');
    });

  });

  // ============ Dashboard Integration Tests (Emulated) ============

  describe('Dashboard Integration (Emulated)', () => {

    it('should create manifest with correct structure', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        mode: 'new',
        currentPhase: '1',
        status: 'running'
      });

      assert.ok(manifest.projectId);
      assert.strictEqual(manifest.mode, 'new');
      assert.strictEqual(manifest.currentPhase, '1');
      assert.strictEqual(manifest.status, 'running');
    });

    it('should update manifest on phase transition', () => {
      helpers.createManifest(testProject.manifestPath, {
        mode: 'new',
        currentPhase: '1',
        status: 'running'
      });

      const updated = helpers.updateManifest(testProject.manifestPath, {
        currentPhase: '2',
        phaseHistory: [{ phase: '1', completedAt: new Date().toISOString() }]
      });

      assert.strictEqual(updated.currentPhase, '2');
      assert.ok(updated.phaseHistory.length > 0);
    });

    it('should track worker PIDs in manifest', () => {
      workerLifecycle.registerWorker(77771, '1', {}, testProject.projectPath);
      workerLifecycle.registerWorker(77772, '2', {}, testProject.projectPath);

      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.ok(manifest.workerPids.includes(77771));
      assert.ok(manifest.workerPids.includes(77772));
    });

  });

  // ============ Wait Helper Tests (Emulated) ============

  describe('Wait Helpers (Emulated)', () => {

    it('should wait for condition with timeout', async () => {
      let counter = 0;
      const condition = () => {
        counter++;
        return counter >= 3;
      };

      const result = await helpers.waitFor(condition, 5000, 100);
      assert.strictEqual(result, true);
      assert.ok(counter >= 3);
    });

    it('should timeout when condition not met', async () => {
      const result = await helpers.waitFor(() => false, 500, 100);
      assert.strictEqual(result, false);
    });

    it('should handle async conditions', async () => {
      let ready = false;
      setTimeout(() => { ready = true; }, 200);

      const result = await helpers.waitFor(() => ready, 2000, 50);
      assert.strictEqual(result, true);
    });

  });

  // ============ Window Title Tests (Emulated) ============

  describe('Window Titles (Emulated)', () => {

    it('should generate unique titles per project', () => {
      const project1 = helpers.createTestProject('title-test-1');
      const project2 = helpers.createTestProject('title-test-2');

      try {
        workerLifecycle.initWorkerLifecycle(project1.projectPath);
        const title1 = workerLifecycle.generateWorkerWindowTitle('1');
        const id1 = workerLifecycle.getProjectIdentifier();

        workerLifecycle.initWorkerLifecycle(project2.projectPath);
        const title2 = workerLifecycle.generateWorkerWindowTitle('1');
        const id2 = workerLifecycle.getProjectIdentifier();

        assert.notStrictEqual(id1, id2);
        assert.notStrictEqual(title1, title2);
      } finally {
        project1.cleanup();
        project2.cleanup();
      }
    });

    it('should include phase in window title', () => {
      const title = workerLifecycle.generateWorkerWindowTitle('3');
      assert.ok(title.includes('-3-'), 'Title should include phase number');
    });

  });

});

// ============ Quick Smoke Test ============

describe('Quick Smoke Test (Emulated)', () => {

  it('should verify test helpers load correctly', () => {
    assert.ok(helpers.IS_WINDOWS !== undefined);
    assert.ok(helpers.PIPELINE_OFFICE);
    assert.ok(typeof helpers.createTestProject === 'function');
    assert.ok(typeof helpers.createManifest === 'function');
  });

  it('should verify worker lifecycle module loads', () => {
    assert.ok(typeof workerLifecycle.initWorkerLifecycle === 'function');
    assert.ok(typeof workerLifecycle.registerWorker === 'function');
    assert.ok(typeof workerLifecycle.cleanupAllWorkers === 'function');
    assert.ok(typeof workerLifecycle.getTrackedWorkers === 'function');
  });

});

// ============ Process Protection Tests (Emulated) ============

describe('Process Protection (Emulated)', () => {

  it('should be able to get list of Claude processes', () => {
    const pids = helpers.getClaudePids();
    assert.ok(Array.isArray(pids));
  });

  it('should verify own process is running', () => {
    const ownPid = process.pid;
    const isRunning = helpers.isProcessRunning(ownPid);
    assert.strictEqual(isRunning, true, 'Own process should be running');
  });

  it('should verify non-existent PID is not running', () => {
    const fakePid = 999999999;
    const isRunning = helpers.isProcessRunning(fakePid);
    assert.strictEqual(isRunning, false, 'Fake PID should not be running');
  });

  it('should not include own PID in orphan detection', () => {
    const testProject = helpers.createTestProject('orphan-test');
    try {
      workerLifecycle.initWorkerLifecycle(testProject.projectPath);
      const orphans = workerLifecycle.findOrphanProcesses();

      assert.ok(!orphans.includes(process.pid), 'Own PID should not be orphan');
    } finally {
      testProject.cleanup();
    }
  });

});
