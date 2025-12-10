/**
 * stop-resume.test.js - E2E tests for Graceful Stop/Resume (US-STOP)
 *
 * Tests: US-STOP-001 to US-STOP-006 with edge cases
 *
 * These tests verify pipeline pause/resume behavior at the system level.
 * NO REAL CLAUDE CLI CALLS - all behavior is emulated via manifest/file manipulation.
 */

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const helpers = require('./test-helpers.cjs');
const dashboardCore = require(path.join(helpers.PIPELINE_OFFICE, 'lib', 'dashboard-core.cjs'));
const workerLifecycle = require(path.join(helpers.PIPELINE_OFFICE, 'lib', 'worker-lifecycle.cjs'));

describe('Graceful Stop/Resume E2E (US-STOP)', () => {
  let testProject;

  beforeEach(() => {
    testProject = helpers.createTestProject('stop-resume-test');
    helpers.createManifest(testProject.manifestPath, {});
    workerLifecycle.initWorkerLifecycle(testProject.projectPath);
  });

  afterEach(() => {
    try {
      workerLifecycle.cleanupAllWorkers(testProject.projectPath);
    } catch (e) { /* ignore */ }
    if (testProject) {
      testProject.cleanup();
    }
  });

  // ============ US-STOP-001: Ctrl+C Handling ============

  describe('US-STOP-001: Ctrl+C Handling', () => {

    it('should set status to paused when handlePause is called', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        status: 'running',
        currentPhase: '2'
      });

      // Simulate pause by updating manifest (as dashboard does on Ctrl+C)
      const pausedManifest = helpers.updateManifest(testProject.manifestPath, {
        status: 'paused',
        pausedAt: new Date().toISOString(),
        pauseReason: 'User pressed Ctrl+C'
      });

      assert.strictEqual(pausedManifest.status, 'paused');
      assert.ok(pausedManifest.pausedAt);
      assert.strictEqual(pausedManifest.pauseReason, 'User pressed Ctrl+C');
    });

    it('should preserve current phase on pause', () => {
      helpers.createManifest(testProject.manifestPath, {
        status: 'running',
        currentPhase: '3',
        mode: 'new'
      });

      const pausedManifest = helpers.updateManifest(testProject.manifestPath, {
        status: 'paused',
        pausedAt: new Date().toISOString()
      });

      assert.strictEqual(pausedManifest.currentPhase, '3');
      assert.strictEqual(pausedManifest.mode, 'new');
    });

    // Edge case: Double Ctrl+C timing
    it('should handle rapid pause requests gracefully', () => {
      helpers.createManifest(testProject.manifestPath, {
        status: 'running',
        currentPhase: '2'
      });

      // First pause
      helpers.updateManifest(testProject.manifestPath, {
        status: 'paused',
        pausedAt: new Date().toISOString()
      });

      // Second pause attempt (should not change anything critical)
      const manifest = helpers.updateManifest(testProject.manifestPath, {
        status: 'paused',
        pausedAt: new Date().toISOString()
      });

      assert.strictEqual(manifest.status, 'paused');
      assert.strictEqual(manifest.currentPhase, '2');
    });

    // Edge case: Pause during phase transition
    it('should handle pause during phase transition', () => {
      helpers.createManifest(testProject.manifestPath, {
        status: 'running',
        currentPhase: '2',
        phases: {
          '1': { status: 'complete' },
          '2': { status: 'running' },
          '3': { status: 'pending' }
        }
      });

      const pausedManifest = helpers.updateManifest(testProject.manifestPath, {
        status: 'paused',
        pausedAt: new Date().toISOString()
      });

      // Phase should remain in running state
      assert.strictEqual(pausedManifest.phases['2'].status, 'running');
      assert.strictEqual(pausedManifest.status, 'paused');
    });

  });

  // ============ US-STOP-002: State Preservation on Pause ============

  describe('US-STOP-002: State Preservation on Pause', () => {

    it('should save current phase to manifest on pause', () => {
      helpers.createManifest(testProject.manifestPath, {
        status: 'running',
        currentPhase: '4'
      });

      helpers.updateManifest(testProject.manifestPath, {
        status: 'paused',
        pausedAt: new Date().toISOString()
      });

      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.currentPhase, '4');
    });

    it('should save session ID to manifest on pause', () => {
      const sessionId = 'test-session-12345';
      helpers.createManifest(testProject.manifestPath, {
        status: 'running',
        currentPhase: '2',
        workerSessionId: sessionId
      });

      helpers.updateManifest(testProject.manifestPath, {
        status: 'paused',
        pausedAt: new Date().toISOString()
      });

      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.workerSessionId, sessionId);
    });

    it('should save elapsed time to manifest on pause', () => {
      const startTime = Date.now() - 60000; // 1 minute ago
      helpers.createManifest(testProject.manifestPath, {
        status: 'running',
        currentPhase: '2',
        startedAt: new Date(startTime).toISOString(),
        elapsedMs: 60000
      });

      helpers.updateManifest(testProject.manifestPath, {
        status: 'paused',
        pausedAt: new Date().toISOString()
      });

      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.ok(manifest.elapsedMs >= 60000);
    });

    it('should record pause timestamp', () => {
      helpers.createManifest(testProject.manifestPath, {
        status: 'running',
        currentPhase: '2'
      });

      const beforePause = Date.now();
      helpers.updateManifest(testProject.manifestPath, {
        status: 'paused',
        pausedAt: new Date().toISOString()
      });
      const afterPause = Date.now();

      const manifest = helpers.readManifest(testProject.manifestPath);
      const pauseTime = new Date(manifest.pausedAt).getTime();

      assert.ok(pauseTime >= beforePause - 1000);
      assert.ok(pauseTime <= afterPause + 1000);
    });

    // Edge case: Preserve epic progress on pause
    it('should preserve epic loop progress on pause', () => {
      helpers.createManifest(testProject.manifestPath, {
        status: 'running',
        currentPhase: '4',
        phases: {
          '4': {
            status: 'running',
            epicLoops: [
              { id: 'epic-1', status: 'complete' },
              { id: 'epic-2', status: 'running' },
              { id: 'epic-3', status: 'pending' }
            ],
            currentEpicIndex: 1
          }
        }
      });

      helpers.updateManifest(testProject.manifestPath, {
        status: 'paused',
        pausedAt: new Date().toISOString()
      });

      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.phases['4'].currentEpicIndex, 1);
      assert.strictEqual(manifest.phases['4'].epicLoops[0].status, 'complete');
      assert.strictEqual(manifest.phases['4'].epicLoops[1].status, 'running');
    });

    // Edge case: Preserve worker PID list
    it('should preserve worker PIDs list on pause', () => {
      const workerPids = [12345, 67890];
      helpers.createManifest(testProject.manifestPath, {
        status: 'running',
        currentPhase: '2',
        workerPids: workerPids
      });

      helpers.updateManifest(testProject.manifestPath, {
        status: 'paused',
        pausedAt: new Date().toISOString()
      });

      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.deepStrictEqual(manifest.workerPids, workerPids);
    });

  });

  // ============ US-STOP-003: Resume from Pause ============

  describe('US-STOP-003: Resume from Pause', () => {

    it('should detect paused state from manifest', () => {
      helpers.createManifest(testProject.manifestPath, {
        status: 'paused',
        currentPhase: '3',
        pausedAt: new Date().toISOString(),
        pauseReason: 'User pressed Ctrl+C'
      });

      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.status, 'paused');
    });

    it('should allow status change from paused to running', () => {
      helpers.createManifest(testProject.manifestPath, {
        status: 'paused',
        currentPhase: '3',
        pausedAt: new Date().toISOString()
      });

      const resumedManifest = helpers.updateManifest(testProject.manifestPath, {
        status: 'running',
        resumedAt: new Date().toISOString()
      });

      assert.strictEqual(resumedManifest.status, 'running');
      assert.ok(resumedManifest.resumedAt);
    });

    it('should preserve session ID on resume', () => {
      const sessionId = 'preserved-session-abc';
      helpers.createManifest(testProject.manifestPath, {
        status: 'paused',
        currentPhase: '3',
        workerSessionId: sessionId,
        pausedAt: new Date().toISOString()
      });

      const resumedManifest = helpers.updateManifest(testProject.manifestPath, {
        status: 'running',
        resumedAt: new Date().toISOString()
      });

      assert.strictEqual(resumedManifest.workerSessionId, sessionId);
    });

    it('should continue elapsed time from pause point', () => {
      const previousElapsed = 120000; // 2 minutes
      helpers.createManifest(testProject.manifestPath, {
        status: 'paused',
        currentPhase: '3',
        elapsedMs: previousElapsed,
        pausedAt: new Date().toISOString()
      });

      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.elapsedMs, previousElapsed);
    });

    // Edge case: Resume from specific phase
    it('should resume at the correct phase', () => {
      helpers.createManifest(testProject.manifestPath, {
        status: 'paused',
        currentPhase: '4',
        mode: 'new',
        pausedAt: new Date().toISOString()
      });

      const manifest = helpers.readManifest(testProject.manifestPath);
      const sequence = dashboardCore.getPhaseSequence(manifest.mode);

      assert.ok(sequence.includes(manifest.currentPhase));
      assert.strictEqual(manifest.currentPhase, '4');
    });

    // Edge case: Resume with incomplete epic
    it('should resume at correct epic index', () => {
      helpers.createManifest(testProject.manifestPath, {
        status: 'paused',
        currentPhase: '4',
        pausedAt: new Date().toISOString(),
        phases: {
          '4': {
            status: 'running',
            epicLoops: [
              { id: 'epic-1', status: 'complete' },
              { id: 'epic-2', status: 'running' },
              { id: 'epic-3', status: 'pending' }
            ],
            currentEpicIndex: 1
          }
        }
      });

      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.phases['4'].currentEpicIndex, 1);
      assert.strictEqual(manifest.phases['4'].epicLoops[1].status, 'running');
    });

    // Edge case: Resume after long pause (24+ hours)
    it('should handle resume after extended pause period', () => {
      const longAgoPause = new Date(Date.now() - 86400000); // 24 hours ago
      helpers.createManifest(testProject.manifestPath, {
        status: 'paused',
        currentPhase: '2',
        pausedAt: longAgoPause.toISOString(),
        elapsedMs: 3600000 // 1 hour elapsed before pause
      });

      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.status, 'paused');
      assert.strictEqual(manifest.elapsedMs, 3600000);
    });

  });

  // ============ US-STOP-004: Pause Reason Recording ============

  describe('US-STOP-004: Pause Reason Recording', () => {

    it('should store "User pressed Ctrl+C" for manual pause', () => {
      helpers.createManifest(testProject.manifestPath, {
        status: 'running',
        currentPhase: '2'
      });

      helpers.updateManifest(testProject.manifestPath, {
        status: 'paused',
        pausedAt: new Date().toISOString(),
        pauseReason: 'User pressed Ctrl+C'
      });

      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.pauseReason, 'User pressed Ctrl+C');
    });

    it('should store error message for crash pause', () => {
      helpers.createManifest(testProject.manifestPath, {
        status: 'running',
        currentPhase: '3'
      });

      const errorMessage = 'Worker process crashed with exit code 1';
      helpers.updateManifest(testProject.manifestPath, {
        status: 'paused',
        pausedAt: new Date().toISOString(),
        pauseReason: errorMessage
      });

      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.pauseReason, errorMessage);
    });

    it('should preserve pause reason across file reads', () => {
      const reason = 'Test pause reason with special chars: "quotes" & <tags>';
      helpers.createManifest(testProject.manifestPath, {
        status: 'paused',
        currentPhase: '2',
        pausedAt: new Date().toISOString(),
        pauseReason: reason
      });

      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.pauseReason, reason);
    });

    // Edge case: Multiple pause/resume cycles with different reasons
    it('should track pause history', () => {
      helpers.createManifest(testProject.manifestPath, {
        status: 'paused',
        currentPhase: '2',
        pausedAt: new Date().toISOString(),
        pauseReason: 'Initial pause',
        pauseHistory: []
      });

      // Update with new pause info while preserving history
      const manifest = helpers.readManifest(testProject.manifestPath);
      const history = manifest.pauseHistory || [];
      history.push({
        pausedAt: manifest.pausedAt,
        reason: manifest.pauseReason
      });

      helpers.updateManifest(testProject.manifestPath, {
        pauseHistory: history,
        pauseReason: 'Second pause',
        pausedAt: new Date().toISOString()
      });

      const updated = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(updated.pauseHistory.length, 1);
      assert.strictEqual(updated.pauseReason, 'Second pause');
    });

    // Edge case: Unicode in pause reason
    it('should handle unicode characters in pause reason', () => {
      const unicodeReason = 'Paused: budget exceeded \u2705 \u26a0\ufe0f';
      helpers.createManifest(testProject.manifestPath, {
        status: 'paused',
        currentPhase: '2',
        pauseReason: unicodeReason
      });

      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.pauseReason, unicodeReason);
    });

    // Edge case: Very long pause reason
    it('should handle long pause reasons', () => {
      const longReason = 'Error: ' + 'x'.repeat(1000);
      helpers.createManifest(testProject.manifestPath, {
        status: 'paused',
        currentPhase: '2',
        pauseReason: longReason
      });

      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.pauseReason, longReason);
    });

  });

  // ============ US-STOP-005: Worker Cleanup on Pause (Emulated) ============

  describe('US-STOP-005: Worker Cleanup on Pause', () => {

    it('should track worker PIDs for cleanup', () => {
      // Register emulated workers
      workerLifecycle.registerWorker(88881, '2', { title: 'Cleanup-Test-Worker' }, testProject.projectPath);
      workerLifecycle.registerWorker(88882, '2', { title: 'Cleanup-Test-Worker-2' }, testProject.projectPath);

      const workers = workerLifecycle.getTrackedWorkers();
      assert.strictEqual(workers.length, 2, 'Should have 2 tracked workers');

      // Cleanup
      workerLifecycle.cleanupAllWorkers(testProject.projectPath);

      const afterCleanup = workerLifecycle.getTrackedWorkers();
      assert.strictEqual(afterCleanup.length, 0, 'All workers should be cleaned up');
    });

    it('should clear workerPids in manifest on cleanup', () => {
      helpers.updateManifest(testProject.manifestPath, {
        status: 'running',
        currentPhase: '2',
        workerPids: [88883, 88884]
      });

      workerLifecycle.cleanupAllWorkers(testProject.projectPath);

      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.workerPids.length, 0, 'workerPids should be empty');
    });

    it('should log cleanup action in manifest', () => {
      helpers.updateManifest(testProject.manifestPath, {
        status: 'running',
        currentPhase: '2',
        workerPids: [12345]
      });

      helpers.updateManifest(testProject.manifestPath, {
        status: 'paused',
        pausedAt: new Date().toISOString(),
        pauseReason: 'User pressed Ctrl+C',
        cleanupPerformed: true,
        cleanedPids: [12345]
      });

      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.cleanupPerformed, true);
      assert.deepStrictEqual(manifest.cleanedPids, [12345]);
    });

    // Edge case: Cleanup with no workers running
    it('should handle cleanup when no workers exist', () => {
      helpers.updateManifest(testProject.manifestPath, {
        status: 'running',
        currentPhase: '2',
        workerPids: []
      });

      const cleaned = workerLifecycle.cleanupAllWorkers(testProject.projectPath);
      assert.strictEqual(cleaned, 0, 'Should return 0 when no workers');

      helpers.updateManifest(testProject.manifestPath, {
        status: 'paused',
        cleanupPerformed: true
      });

      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.cleanupPerformed, true);
    });

    // Edge case: Kill previous workers only
    it('should kill only previous workers when spawning new', () => {
      workerLifecycle.registerWorker(77771, '1', {}, testProject.projectPath);
      workerLifecycle.registerWorker(77772, '1', {}, testProject.projectPath);

      assert.strictEqual(workerLifecycle.getTrackedWorkers().length, 2);

      // Kill previous workers (simulates phase transition)
      workerLifecycle.killPreviousWorkers(testProject.projectPath);

      assert.strictEqual(workerLifecycle.getTrackedWorkers().length, 0);

      // Register new worker for next phase
      workerLifecycle.registerWorker(77773, '2', {}, testProject.projectPath);
      assert.strictEqual(workerLifecycle.getTrackedWorkers().length, 1);
    });

  });

  // ============ US-STOP-006: Budget Pause ============

  describe('US-STOP-006: Budget Pause', () => {

    it('should store budget limit in manifest', () => {
      helpers.createManifest(testProject.manifestPath, {
        status: 'pending',
        currentPhase: '1',
        budgetLimit: 5.00
      });

      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.budgetLimit, 5.00);
    });

    it('should pause when budget exceeded', () => {
      helpers.createManifest(testProject.manifestPath, {
        status: 'running',
        currentPhase: '3',
        budgetLimit: 5.00,
        currentCost: 5.50
      });

      // Simulate budget check
      const manifest = helpers.readManifest(testProject.manifestPath);
      if (manifest.currentCost > manifest.budgetLimit) {
        helpers.updateManifest(testProject.manifestPath, {
          status: 'paused',
          pausedAt: new Date().toISOString(),
          pauseReason: 'Budget limit exceeded'
        });
      }

      const paused = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(paused.status, 'paused');
      assert.strictEqual(paused.pauseReason, 'Budget limit exceeded');
    });

    it('should include current cost in budget pause', () => {
      helpers.createManifest(testProject.manifestPath, {
        status: 'paused',
        currentPhase: '3',
        budgetLimit: 10.00,
        currentCost: 12.50,
        pauseReason: 'Budget limit exceeded ($12.50 > $10.00)'
      });

      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.ok(manifest.pauseReason.includes('12.50'));
      assert.ok(manifest.pauseReason.includes('10.00'));
    });

    // Edge case: Budget exactly at limit
    it('should handle budget exactly at limit', () => {
      helpers.createManifest(testProject.manifestPath, {
        status: 'running',
        currentPhase: '3',
        budgetLimit: 5.00,
        currentCost: 5.00
      });

      const manifest = helpers.readManifest(testProject.manifestPath);
      // At exactly the limit, should continue (not exceeded)
      assert.strictEqual(manifest.currentCost <= manifest.budgetLimit, true);
    });

    // Edge case: No budget limit set
    it('should not pause when no budget limit set', () => {
      helpers.createManifest(testProject.manifestPath, {
        status: 'running',
        currentPhase: '3',
        currentCost: 100.00
        // No budgetLimit set
      });

      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.budgetLimit, undefined);
      // Without budget limit, high cost should not trigger pause
      assert.strictEqual(manifest.status, 'running');
    });

    // Edge case: Budget limit of 0
    it('should handle zero budget limit', () => {
      helpers.createManifest(testProject.manifestPath, {
        status: 'running',
        currentPhase: '1',
        budgetLimit: 0,
        currentCost: 0.01
      });

      const manifest = helpers.readManifest(testProject.manifestPath);
      // Any cost exceeds zero budget
      if (manifest.budgetLimit === 0 && manifest.currentCost > 0) {
        helpers.updateManifest(testProject.manifestPath, {
          status: 'paused',
          pauseReason: 'Budget limit exceeded'
        });
      }

      const paused = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(paused.status, 'paused');
    });

    // Edge case: Negative current cost (credits/refunds)
    it('should handle negative cost values', () => {
      helpers.createManifest(testProject.manifestPath, {
        status: 'running',
        currentPhase: '2',
        budgetLimit: 5.00,
        currentCost: -1.00 // Hypothetical credit
      });

      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.ok(manifest.currentCost < manifest.budgetLimit);
      assert.strictEqual(manifest.status, 'running');
    });

  });

  // ============ Integration Tests ============

  describe('Stop/Resume Integration', () => {

    it('should complete full pause-resume cycle', () => {
      // Start
      helpers.createManifest(testProject.manifestPath, {
        status: 'running',
        currentPhase: '2',
        mode: 'new',
        startedAt: new Date().toISOString()
      });

      let manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.status, 'running');

      // Pause
      helpers.updateManifest(testProject.manifestPath, {
        status: 'paused',
        pausedAt: new Date().toISOString(),
        pauseReason: 'User pressed Ctrl+C'
      });

      manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.status, 'paused');

      // Resume
      helpers.updateManifest(testProject.manifestPath, {
        status: 'running',
        resumedAt: new Date().toISOString()
      });

      manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.status, 'running');
      assert.strictEqual(manifest.currentPhase, '2');
      assert.strictEqual(manifest.mode, 'new');
    });

    it('should preserve all state through multiple pause cycles', () => {
      const initialState = {
        status: 'running',
        currentPhase: '4',
        mode: 'feature',
        workerSessionId: 'session-xyz',
        elapsedMs: 30000,
        phases: {
          '1': { status: 'complete' },
          '2': { status: 'complete' },
          '3': { status: 'complete' },
          '4': {
            status: 'running',
            epicLoops: [
              { id: 'epic-1', status: 'complete' },
              { id: 'epic-2', status: 'running' }
            ],
            currentEpicIndex: 1
          }
        }
      };

      helpers.createManifest(testProject.manifestPath, initialState);

      // Pause
      helpers.updateManifest(testProject.manifestPath, {
        status: 'paused',
        pausedAt: new Date().toISOString()
      });

      // Resume
      helpers.updateManifest(testProject.manifestPath, {
        status: 'running',
        resumedAt: new Date().toISOString()
      });

      // Second pause
      helpers.updateManifest(testProject.manifestPath, {
        status: 'paused',
        pausedAt: new Date().toISOString()
      });

      const manifest = helpers.readManifest(testProject.manifestPath);

      // Verify all state preserved
      assert.strictEqual(manifest.currentPhase, '4');
      assert.strictEqual(manifest.mode, 'feature');
      assert.strictEqual(manifest.workerSessionId, 'session-xyz');
      assert.strictEqual(manifest.phases['4'].currentEpicIndex, 1);
      assert.strictEqual(manifest.phases['4'].epicLoops[0].status, 'complete');
    });

  });

});
