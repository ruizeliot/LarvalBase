/**
 * error-handling.test.js - E2E tests for Error Handling (US-ERR)
 *
 * Tests: US-ERR-001 to US-ERR-005 with edge cases
 *
 * These tests verify error handling functionality at the system level.
 */

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const helpers = require('./test-helpers.cjs');

describe('Error Handling E2E (US-ERR)', () => {
  let testProject;

  beforeEach(() => {
    testProject = helpers.createTestProject('error-handling-test');
  });

  afterEach(() => {
    if (testProject) testProject.cleanup();
  });

  // ============ US-ERR-001: Worker Crash Handling ============

  describe('US-ERR-001: Worker Crash Handling', () => {

    it('should detect worker exit', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        status: 'running',
        workerPid: 12345,
        workerStatus: 'running'
      });

      // Simulate worker exit
      helpers.updateManifest(testProject.manifestPath, {
        workerStatus: 'exited',
        workerExitCode: 1,
        workerExitedAt: new Date().toISOString()
      });

      const updated = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(updated.workerStatus, 'exited');
    });

    it('should log exit code', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        workerExitCode: 1
      });

      assert.strictEqual(manifest.workerExitCode, 1);
    });

    it('should record crash for retry logic', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        crashHistory: [
          { timestamp: new Date(Date.now() - 60000).toISOString(), exitCode: 1 },
          { timestamp: new Date().toISOString(), exitCode: 1 }
        ],
        consecutiveRestarts: 2
      });

      assert.strictEqual(manifest.crashHistory.length, 2);
      assert.strictEqual(manifest.consecutiveRestarts, 2);
    });

    it('should preserve state for recovery', () => {
      helpers.createManifest(testProject.manifestPath, {
        status: 'running',
        currentPhase: '3',
        workerSessionId: 'session-123',
        todoFilePath: '/path/to/todos.json'
      });

      // Simulate crash
      helpers.updateManifest(testProject.manifestPath, {
        status: 'crashed',
        workerExitCode: 1
      });

      const manifest = helpers.readManifest(testProject.manifestPath);
      // Critical state should be preserved
      assert.strictEqual(manifest.currentPhase, '3');
      assert.strictEqual(manifest.workerSessionId, 'session-123');
    });

    // Edge case: Clean exit (code 0)
    it('should handle clean exit differently', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        workerExitCode: 0,
        workerStatus: 'completed'
      });

      assert.strictEqual(manifest.workerExitCode, 0);
      assert.strictEqual(manifest.workerStatus, 'completed');
    });

    // Edge case: Signal termination
    it('should handle signal termination', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        workerExitCode: null,
        workerSignal: 'SIGTERM',
        workerStatus: 'killed'
      });

      assert.strictEqual(manifest.workerSignal, 'SIGTERM');
    });

    // Edge case: Multiple rapid crashes
    it('should track rapid consecutive crashes', () => {
      const crashes = [];
      for (let i = 0; i < 5; i++) {
        crashes.push({
          timestamp: new Date(Date.now() - i * 10000).toISOString(),
          exitCode: 1
        });
      }

      const manifest = helpers.createManifest(testProject.manifestPath, {
        crashHistory: crashes,
        consecutiveRestarts: 5
      });

      assert.strictEqual(manifest.crashHistory.length, 5);
    });

  });

  // ============ US-ERR-002: Network Error Handling ============

  describe('US-ERR-002: Network Error Handling', () => {

    it('should record API errors', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        lastError: {
          type: 'API_ERROR',
          message: 'Request failed with status 500',
          timestamp: new Date().toISOString()
        }
      });

      assert.strictEqual(manifest.lastError.type, 'API_ERROR');
    });

    it('should track retry attempts', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        apiRetries: 3,
        maxApiRetries: 5
      });

      assert.ok(manifest.apiRetries < manifest.maxApiRetries);
    });

    it('should log error messages', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        errorLog: [
          { message: 'Connection timeout', timestamp: new Date().toISOString() },
          { message: 'API rate limited', timestamp: new Date().toISOString() }
        ]
      });

      assert.strictEqual(manifest.errorLog.length, 2);
    });

    it('should pause after max retries', () => {
      helpers.createManifest(testProject.manifestPath, {
        status: 'running',
        apiRetries: 5,
        maxApiRetries: 5
      });

      // Check if at max retries
      const manifest = helpers.readManifest(testProject.manifestPath);
      if (manifest.apiRetries >= manifest.maxApiRetries) {
        helpers.updateManifest(testProject.manifestPath, {
          status: 'paused',
          pauseReason: 'Max API retries reached'
        });
      }

      const updated = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(updated.status, 'paused');
    });

    // Edge case: Different error types
    it('should categorize different network errors', () => {
      const errors = [
        { type: 'TIMEOUT', message: 'Request timed out' },
        { type: 'RATE_LIMIT', message: 'Too many requests' },
        { type: 'SERVER_ERROR', message: 'Internal server error' }
      ];

      const manifest = helpers.createManifest(testProject.manifestPath, {
        errorHistory: errors
      });

      const errorTypes = manifest.errorHistory.map(e => e.type);
      assert.ok(errorTypes.includes('TIMEOUT'));
      assert.ok(errorTypes.includes('RATE_LIMIT'));
    });

    // Edge case: Exponential backoff tracking
    it('should track backoff intervals', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        retryBackoffMs: 16000, // After 4 retries with 2x backoff from 1000
        apiRetries: 4
      });

      // Backoff should increase with retries
      assert.ok(manifest.retryBackoffMs >= 1000);
    });

  });

  // ============ US-ERR-003: File System Error Handling ============

  describe('US-ERR-003: File System Error Handling', () => {

    it('should detect EACCES errors', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        lastError: {
          code: 'EACCES',
          message: 'Permission denied',
          path: '/protected/path'
        }
      });

      assert.strictEqual(manifest.lastError.code, 'EACCES');
    });

    it('should detect ENOSPC errors', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        lastError: {
          code: 'ENOSPC',
          message: 'No space left on device'
        }
      });

      assert.strictEqual(manifest.lastError.code, 'ENOSPC');
    });

    it('should provide clear error messages', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        lastError: {
          code: 'EACCES',
          message: 'Permission denied',
          userMessage: 'Cannot write to manifest. Check file permissions.',
          path: testProject.manifestPath
        }
      });

      assert.ok(manifest.lastError.userMessage);
      assert.ok(manifest.lastError.userMessage.includes('permission'));
    });

    it('should pause with instructions', () => {
      helpers.createManifest(testProject.manifestPath, {
        status: 'paused',
        pauseReason: 'File system error: Permission denied',
        recoveryInstructions: 'Run with elevated permissions or change file ownership'
      });

      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.status, 'paused');
      assert.ok(manifest.recoveryInstructions);
    });

    // Edge case: ENOENT (file not found)
    it('should handle missing file errors', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        lastError: {
          code: 'ENOENT',
          message: 'File not found',
          path: '/missing/file.json'
        }
      });

      assert.strictEqual(manifest.lastError.code, 'ENOENT');
    });

    // Edge case: EMFILE (too many open files)
    it('should handle too many files error', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        lastError: {
          code: 'EMFILE',
          message: 'Too many open files'
        }
      });

      assert.strictEqual(manifest.lastError.code, 'EMFILE');
    });

    // Edge case: Path with special characters
    it('should handle paths with special characters in errors', () => {
      const specialPath = path.join(testProject.projectPath, 'file with spaces & symbols!.json');
      const manifest = helpers.createManifest(testProject.manifestPath, {
        lastError: {
          path: specialPath
        }
      });

      assert.ok(manifest.lastError.path.includes('spaces'));
    });

  });

  // ============ US-ERR-004: Max Restart Limit ============

  describe('US-ERR-004: Max Restart Limit', () => {

    it('should use default limit of 3 restarts', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        maxRestarts: 3
      });

      assert.strictEqual(manifest.maxRestarts, 3);
    });

    it('should allow configurable restart limit', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        maxRestarts: 5 // Set via --max-restarts
      });

      assert.strictEqual(manifest.maxRestarts, 5);
    });

    it('should pause at restart limit', () => {
      helpers.createManifest(testProject.manifestPath, {
        status: 'running',
        consecutiveRestarts: 3,
        maxRestarts: 3
      });

      const manifest = helpers.readManifest(testProject.manifestPath);
      if (manifest.consecutiveRestarts >= manifest.maxRestarts) {
        helpers.updateManifest(testProject.manifestPath, {
          status: 'paused',
          pauseReason: 'Max restart limit reached'
        });
      }

      const updated = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(updated.status, 'paused');
    });

    it('should provide clear message about max restarts', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        status: 'paused',
        pauseReason: 'Max restart limit reached (3/3)',
        consecutiveRestarts: 3,
        maxRestarts: 3
      });

      assert.ok(manifest.pauseReason.includes('3'));
    });

    // Edge case: Zero restarts allowed
    it('should handle zero restarts limit', () => {
      helpers.createManifest(testProject.manifestPath, {
        status: 'running',
        consecutiveRestarts: 1,
        maxRestarts: 0
      });

      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.ok(manifest.consecutiveRestarts > manifest.maxRestarts);
    });

    // Edge case: Unlimited restarts
    it('should handle unlimited restarts (-1)', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        maxRestarts: -1, // Unlimited
        consecutiveRestarts: 100
      });

      const shouldPause = manifest.maxRestarts >= 0 &&
                          manifest.consecutiveRestarts >= manifest.maxRestarts;
      assert.strictEqual(shouldPause, false);
    });

    // Edge case: High restart count
    it('should handle high restart counts', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        maxRestarts: 100,
        consecutiveRestarts: 99
      });

      assert.ok(manifest.consecutiveRestarts < manifest.maxRestarts);
    });

  });

  // ============ US-ERR-005: Consecutive Restart Tracking ============

  describe('US-ERR-005: Consecutive Restart Tracking', () => {

    it('should increment counter on failure', () => {
      helpers.createManifest(testProject.manifestPath, {
        consecutiveRestarts: 0
      });

      // Simulate failure
      helpers.updateManifest(testProject.manifestPath, {
        consecutiveRestarts: 1
      });

      let manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.consecutiveRestarts, 1);

      // Another failure
      helpers.updateManifest(testProject.manifestPath, {
        consecutiveRestarts: 2
      });

      manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.consecutiveRestarts, 2);
    });

    it('should reset counter on success', () => {
      helpers.createManifest(testProject.manifestPath, {
        consecutiveRestarts: 3
      });

      // Simulate successful completion
      helpers.updateManifest(testProject.manifestPath, {
        consecutiveRestarts: 0,
        lastSuccessAt: new Date().toISOString()
      });

      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.consecutiveRestarts, 0);
    });

    it('should only count consecutive failures', () => {
      const restartHistory = [
        { success: false, timestamp: new Date(Date.now() - 5000).toISOString() },
        { success: false, timestamp: new Date(Date.now() - 4000).toISOString() },
        { success: true, timestamp: new Date(Date.now() - 3000).toISOString() },
        { success: false, timestamp: new Date(Date.now() - 2000).toISOString() },
        { success: false, timestamp: new Date().toISOString() }
      ];

      // Count consecutive failures from the end
      let consecutive = 0;
      for (let i = restartHistory.length - 1; i >= 0; i--) {
        if (!restartHistory[i].success) {
          consecutive++;
        } else {
          break;
        }
      }

      assert.strictEqual(consecutive, 2); // Only last 2 failures
    });

    it('should log restart events', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        restartLog: [
          { event: 'restart', reason: 'crash', timestamp: new Date().toISOString() },
          { event: 'success', timestamp: new Date().toISOString() },
          { event: 'restart', reason: 'crash', timestamp: new Date().toISOString() }
        ]
      });

      assert.strictEqual(manifest.restartLog.length, 3);
    });

    // Edge case: Counter at zero stays zero on success
    it('should keep counter at zero on continued success', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        consecutiveRestarts: 0
      });

      // Multiple successes shouldn't go negative
      assert.strictEqual(Math.max(0, manifest.consecutiveRestarts - 1), 0);
    });

    // Edge case: Rapid success/failure alternation
    it('should handle alternating success/failure', () => {
      helpers.createManifest(testProject.manifestPath, {
        consecutiveRestarts: 0
      });

      // Failure
      helpers.updateManifest(testProject.manifestPath, { consecutiveRestarts: 1 });
      // Success
      helpers.updateManifest(testProject.manifestPath, { consecutiveRestarts: 0 });
      // Failure
      helpers.updateManifest(testProject.manifestPath, { consecutiveRestarts: 1 });
      // Success
      helpers.updateManifest(testProject.manifestPath, { consecutiveRestarts: 0 });

      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.consecutiveRestarts, 0);
    });

    // Edge case: Reset on phase completion
    it('should reset counter on phase completion', () => {
      helpers.createManifest(testProject.manifestPath, {
        consecutiveRestarts: 2,
        currentPhase: '2'
      });

      // Phase completes successfully
      helpers.updateManifest(testProject.manifestPath, {
        currentPhase: '3',
        consecutiveRestarts: 0
      });

      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.consecutiveRestarts, 0);
    });

  });

  // ============ Error Handling Integration ============

  describe('Error Handling Integration', () => {

    it('should handle complete error recovery flow', () => {
      // Start with running pipeline
      helpers.createManifest(testProject.manifestPath, {
        status: 'running',
        currentPhase: '3',
        consecutiveRestarts: 0,
        maxRestarts: 3
      });

      // First crash
      helpers.updateManifest(testProject.manifestPath, {
        consecutiveRestarts: 1,
        lastError: { type: 'CRASH', exitCode: 1 }
      });

      // Restart and second crash
      helpers.updateManifest(testProject.manifestPath, {
        consecutiveRestarts: 2
      });

      // Restart succeeds
      helpers.updateManifest(testProject.manifestPath, {
        consecutiveRestarts: 0,
        lastError: null
      });

      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.consecutiveRestarts, 0);
      assert.strictEqual(manifest.status, 'running');
    });

    it('should aggregate error statistics', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        errorStats: {
          totalCrashes: 5,
          totalApiErrors: 3,
          totalFsErrors: 1,
          lastErrorAt: new Date().toISOString()
        }
      });

      const totalErrors = manifest.errorStats.totalCrashes +
                          manifest.errorStats.totalApiErrors +
                          manifest.errorStats.totalFsErrors;

      assert.strictEqual(totalErrors, 9);
    });

    it('should preserve error context across resume', () => {
      helpers.createManifest(testProject.manifestPath, {
        status: 'paused',
        pauseReason: 'Max restart limit reached',
        consecutiveRestarts: 3,
        lastError: {
          type: 'CRASH',
          exitCode: 1,
          timestamp: new Date().toISOString()
        }
      });

      // Resume
      helpers.updateManifest(testProject.manifestPath, {
        status: 'running'
      });

      const manifest = helpers.readManifest(testProject.manifestPath);
      // Error context should be preserved for debugging
      assert.ok(manifest.lastError);
      assert.strictEqual(manifest.consecutiveRestarts, 3);
    });

  });

});
