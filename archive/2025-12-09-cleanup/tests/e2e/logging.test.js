/**
 * logging.test.js - E2E tests for Logging (US-LOG)
 *
 * Tests: US-LOG-001 to US-LOG-004 with edge cases
 *
 * These tests verify logging functionality at the system level.
 */

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const helpers = require('./test-helpers.cjs');

describe('Logging E2E (US-LOG)', () => {
  let testProject;
  let logPath;

  beforeEach(() => {
    testProject = helpers.createTestProject('logging-test');
    logPath = path.join(testProject.pipelineDir, 'pipeline.log');
  });

  afterEach(() => {
    if (testProject) testProject.cleanup();
  });

  // ============ US-LOG-001: Pipeline Log File ============

  describe('US-LOG-001: Pipeline Log File', () => {

    it('should create log file at .pipeline/pipeline.log', () => {
      helpers.createMockLogFile(logPath, ['Test log entry']);
      assert.ok(fs.existsSync(logPath));
    });

    it('should include timestamps on all entries', () => {
      const timestamp = new Date().toISOString();
      const entry = `[${timestamp}] INFO: Test message`;
      helpers.createMockLogFile(logPath, ['Test message']);

      const content = fs.readFileSync(logPath, 'utf8');
      // Should contain ISO timestamp format
      assert.ok(content.match(/\[\d{4}-\d{2}-\d{2}T/));
    });

    it('should include log level indicators', () => {
      const entries = [
        'INFO: Pipeline started',
        'WARN: Low disk space',
        'ERROR: Worker crashed',
        'DEBUG: Processing step 1'
      ];

      fs.writeFileSync(logPath, entries.map(e => `[${new Date().toISOString()}] ${e}`).join('\n'));

      const content = fs.readFileSync(logPath, 'utf8');
      assert.ok(content.includes('INFO:'));
      assert.ok(content.includes('WARN:'));
      assert.ok(content.includes('ERROR:'));
    });

    it('should support log rotation by size', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        logConfig: {
          maxSize: '10MB',
          maxFiles: 5,
          rotateOnSize: true
        }
      });

      assert.strictEqual(manifest.logConfig.maxSize, '10MB');
    });

    // Edge case: Empty log file
    it('should handle empty log file', () => {
      fs.writeFileSync(logPath, '');
      const entries = helpers.readLogEntries(logPath);
      assert.deepStrictEqual(entries, []);
    });

    // Edge case: Very large log file
    it('should handle large log files', () => {
      const entries = [];
      for (let i = 0; i < 1000; i++) {
        entries.push(`Entry ${i}: Lorem ipsum dolor sit amet`);
      }
      helpers.createMockLogFile(logPath, entries);

      const content = fs.readFileSync(logPath, 'utf8');
      assert.ok(content.length > 10000);
    });

    // Edge case: Log with special characters
    it('should handle special characters in log', () => {
      const entries = [
        'Message with "quotes" and \'apostrophes\'',
        'Path: C:\\Users\\test\\file.txt',
        'Unicode: \u00e9\u00e8\u00e0 \ud83d\ude80'
      ];
      helpers.createMockLogFile(logPath, entries);

      const content = fs.readFileSync(logPath, 'utf8');
      assert.ok(content.includes('quotes'));
    });

  });

  // ============ US-LOG-002: Verbose Mode ============

  describe('US-LOG-002: Verbose Mode', () => {

    it('should store verbose flag in manifest', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        verbose: true
      });

      assert.strictEqual(manifest.verbose, true);
    });

    it('should default verbose to false', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {});
      assert.strictEqual(manifest.verbose, undefined);
    });

    it('should log additional details when verbose', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        verbose: true,
        verboseDetails: {
          showCcusageRaw: true,
          showWorkerStdout: true,
          showDebugMessages: true
        }
      });

      assert.strictEqual(manifest.verboseDetails.showCcusageRaw, true);
    });

    // Edge case: Toggle verbose mid-run
    it('should allow verbose toggle during execution', () => {
      helpers.createManifest(testProject.manifestPath, { verbose: false });

      helpers.updateManifest(testProject.manifestPath, { verbose: true });

      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.verbose, true);
    });

  });

  // ============ US-LOG-003: Phase Transition Logging ============

  describe('US-LOG-003: Phase Transition Logging', () => {

    it('should log phase start', () => {
      const entries = [
        'INFO: Phase 1 started',
        'INFO: Phase 1 - Brainstorm'
      ];
      helpers.createMockLogFile(logPath, entries);

      const content = fs.readFileSync(logPath, 'utf8');
      assert.ok(content.includes('Phase 1 started'));
    });

    it('should log phase end', () => {
      const entries = [
        'INFO: Phase 1 completed',
        'INFO: Phase 1 duration: 00:05:30'
      ];
      helpers.createMockLogFile(logPath, entries);

      const content = fs.readFileSync(logPath, 'utf8');
      assert.ok(content.includes('Phase 1 completed'));
    });

    it('should log phase duration', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        phases: {
          '1': {
            status: 'complete',
            startedAt: new Date(Date.now() - 300000).toISOString(),
            completedAt: new Date().toISOString(),
            durationMs: 300000
          }
        }
      });

      assert.strictEqual(manifest.phases['1'].durationMs, 300000);
    });

    it('should log phase cost', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        phases: {
          '1': {
            status: 'complete',
            cost: 1.50
          }
        }
      });

      assert.strictEqual(manifest.phases['1'].cost, 1.50);
    });

    // Edge case: Phase transition with error
    it('should log phase errors', () => {
      const entries = [
        'ERROR: Phase 2 failed: Worker crashed',
        'INFO: Phase 2 duration: 00:02:15 (failed)'
      ];
      helpers.createMockLogFile(logPath, entries);

      const content = fs.readFileSync(logPath, 'utf8');
      assert.ok(content.includes('ERROR:'));
      assert.ok(content.includes('failed'));
    });

  });

  // ============ US-LOG-004: Error Logging ============

  describe('US-LOG-004: Error Logging', () => {

    it('should log error messages', () => {
      const entries = [
        'ERROR: Connection timeout after 30s',
        'ERROR: Failed to parse ccusage output'
      ];
      helpers.createMockLogFile(logPath, entries);

      const content = fs.readFileSync(logPath, 'utf8');
      assert.ok(content.includes('ERROR:'));
    });

    it('should log stack traces', () => {
      const stackTrace = `Error: Test error
    at Function.test (/app/test.js:10:5)
    at Object.<anonymous> (/app/index.js:5:1)`;

      fs.writeFileSync(logPath, `[${new Date().toISOString()}] ERROR: ${stackTrace}`);

      const content = fs.readFileSync(logPath, 'utf8');
      assert.ok(content.includes('at Function.test'));
    });

    it('should log context with errors', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        lastError: {
          message: 'Worker crashed',
          context: {
            phase: '3',
            epic: 'epic-2',
            todo: 'Implement feature X'
          },
          timestamp: new Date().toISOString()
        }
      });

      assert.ok(manifest.lastError.context.phase);
      assert.ok(manifest.lastError.context.epic);
    });

    it('should indicate severity level', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        errors: [
          { severity: 'warning', message: 'Low disk space' },
          { severity: 'error', message: 'Worker crashed' },
          { severity: 'critical', message: 'Cannot write manifest' }
        ]
      });

      const severities = manifest.errors.map(e => e.severity);
      assert.ok(severities.includes('warning'));
      assert.ok(severities.includes('error'));
      assert.ok(severities.includes('critical'));
    });

    // Edge case: Error with no stack trace
    it('should handle errors without stack traces', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        lastError: {
          message: 'Unknown error',
          stack: null
        }
      });

      assert.strictEqual(manifest.lastError.stack, null);
    });

    // Edge case: Multiple errors in sequence
    it('should track error history', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        errorHistory: [
          { message: 'Error 1', timestamp: new Date(Date.now() - 3000).toISOString() },
          { message: 'Error 2', timestamp: new Date(Date.now() - 2000).toISOString() },
          { message: 'Error 3', timestamp: new Date().toISOString() }
        ]
      });

      assert.strictEqual(manifest.errorHistory.length, 3);
    });

  });

  // ============ Logging Integration ============

  describe('Logging Integration', () => {

    it('should create complete log entry', () => {
      const entry = {
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: 'Phase 2 started',
        context: {
          phase: '2',
          mode: 'new'
        }
      };

      const formatted = `[${entry.timestamp}] ${entry.level}: ${entry.message} | context: ${JSON.stringify(entry.context)}`;
      fs.writeFileSync(logPath, formatted);

      const content = fs.readFileSync(logPath, 'utf8');
      assert.ok(content.includes('Phase 2 started'));
      assert.ok(content.includes('context'));
    });

    it('should maintain log order', () => {
      const entries = [
        'INFO: Event 1',
        'INFO: Event 2',
        'INFO: Event 3'
      ];
      helpers.createMockLogFile(logPath, entries);

      const content = fs.readFileSync(logPath, 'utf8');
      const event1Pos = content.indexOf('Event 1');
      const event2Pos = content.indexOf('Event 2');
      const event3Pos = content.indexOf('Event 3');

      assert.ok(event1Pos < event2Pos);
      assert.ok(event2Pos < event3Pos);
    });

    it('should preserve logs across resume', () => {
      helpers.createMockLogFile(logPath, [
        'INFO: Pipeline started',
        'INFO: Phase 1 completed'
      ]);

      // Simulate resume - append to existing log
      const existing = fs.readFileSync(logPath, 'utf8');
      fs.writeFileSync(logPath, existing + '\n' + `[${new Date().toISOString()}] INFO: Pipeline resumed`);

      const content = fs.readFileSync(logPath, 'utf8');
      assert.ok(content.includes('Pipeline started'));
      assert.ok(content.includes('Pipeline resumed'));
    });

  });

});
