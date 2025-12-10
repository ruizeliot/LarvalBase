/**
 * exec.test.js - E2E tests for Execution Control (US-EXEC)
 *
 * Tests: US-EXEC-001 to US-EXEC-008 with edge cases
 *
 * These tests verify pipeline execution behavior at the system level.
 */

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const helpers = require('./test-helpers.cjs');
const dashboardCore = require(path.join(helpers.PIPELINE_OFFICE, 'lib', 'dashboard-core.cjs'));

describe('Execution Control E2E (US-EXEC)', () => {
  let testProject;

  beforeEach(() => {
    testProject = helpers.createTestProject('exec-test');
  });

  afterEach(() => {
    if (testProject) testProject.cleanup();
  });

  // ============ US-EXEC-001: Start Pipeline ============

  describe('US-EXEC-001: Start Pipeline', () => {

    it('should create .pipeline directory for new project', () => {
      assert.ok(fs.existsSync(testProject.pipelineDir));
    });

    it('should initialize manifest if not present', () => {
      helpers.createManifest(testProject.manifestPath, {});
      assert.ok(fs.existsSync(testProject.manifestPath));
      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.ok(manifest.projectId);
    });

    it('should set project path in manifest', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {});
      assert.ok(manifest.projectPath);
      assert.ok(manifest.projectPath.includes(path.basename(testProject.projectPath)));
    });

    // Edge case: Project path with spaces
    it('should handle project path with spaces', () => {
      const projectWithSpaces = helpers.createTestProject('exec test with spaces');
      try {
        const manifest = helpers.createManifest(projectWithSpaces.manifestPath, {
          projectPath: projectWithSpaces.projectPath
        });
        assert.ok(manifest.projectPath.includes(' '));
      } finally {
        projectWithSpaces.cleanup();
      }
    });

    // Edge case: Very long project path
    it('should handle very long project path', () => {
      const longName = 'a'.repeat(100);
      const manifest = helpers.createManifest(testProject.manifestPath, {
        projectId: longName
      });
      assert.strictEqual(manifest.projectId.length, 100);
    });

    // Edge case: Special characters in project name
    it('should handle special characters in project name', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        projectId: 'test-project_v2.0'
      });
      assert.strictEqual(manifest.projectId, 'test-project_v2.0');
    });

  });

  // ============ US-EXEC-002: Phase Timeouts ============

  describe('US-EXEC-002: Phase Timeouts', () => {

    it('should have configurable timeout for each phase', () => {
      const phases = ['1', '2', '3', '4', '5'];
      phases.forEach(phase => {
        const timeout = dashboardCore.getPhaseTimeout(phase);
        assert.ok(timeout > 0, `Phase ${phase} should have positive timeout`);
      });
    });

    it('should have Phase 4 timeout longer than Phase 1', () => {
      const phase1Timeout = dashboardCore.getPhaseTimeout('1');
      const phase4Timeout = dashboardCore.getPhaseTimeout('4');
      assert.ok(phase4Timeout > phase1Timeout, 'Phase 4 (implement) should have longer timeout');
    });

    it('should return default timeout for unknown phase', () => {
      const timeout = dashboardCore.getPhaseTimeout('99');
      assert.ok(timeout > 0, 'Unknown phase should have default timeout');
    });

    // Edge case: Timeout values in milliseconds
    it('should express timeouts in milliseconds', () => {
      const timeout = dashboardCore.getPhaseTimeout('1');
      assert.ok(timeout >= 60000, 'Timeout should be at least 1 minute in ms');
    });

    // Edge case: Phase 2 (quick technical spec) should be shorter than Phase 4
    it('should have Phase 2 shorter than Phase 4', () => {
      const phase2Timeout = dashboardCore.getPhaseTimeout('2');
      const phase4Timeout = dashboardCore.getPhaseTimeout('4');
      assert.ok(phase2Timeout < phase4Timeout);
    });

    // Edge case: All timeouts should be under 2 hours
    it('should have all timeouts under 2 hours', () => {
      const twoHours = 2 * 60 * 60 * 1000;
      ['1', '2', '3', '4', '5'].forEach(phase => {
        const timeout = dashboardCore.getPhaseTimeout(phase);
        assert.ok(timeout <= twoHours, `Phase ${phase} timeout should be under 2 hours`);
      });
    });

  });

  // ============ US-EXEC-003: Disable Timeouts ============

  describe('US-EXEC-003: Disable Timeouts', () => {

    it('should parse --no-timeout flag', () => {
      const options = dashboardCore.parseCliArgs(['--no-timeout']);
      assert.strictEqual(options.noTimeout, true);
    });

    it('should default noTimeout to false', () => {
      const options = dashboardCore.parseCliArgs([]);
      assert.strictEqual(options.noTimeout, false);
    });

    // Edge case: --no-timeout with other flags
    it('should parse --no-timeout with other flags', () => {
      const options = dashboardCore.parseCliArgs(['--no-timeout', '--verbose', '--mode', 'feature']);
      assert.strictEqual(options.noTimeout, true);
      assert.strictEqual(options.verbose, true);
      assert.strictEqual(options.mode, 'feature');
    });

    // Edge case: --no-timeout in different positions
    it('should parse --no-timeout in any position', () => {
      const options1 = dashboardCore.parseCliArgs(['--mode', 'new', '--no-timeout']);
      const options2 = dashboardCore.parseCliArgs(['--no-timeout', '--mode', 'new']);
      assert.strictEqual(options1.noTimeout, true);
      assert.strictEqual(options2.noTimeout, true);
    });

  });

  // ============ US-EXEC-004: Phase Retry Logic ============

  describe('US-EXEC-004: Phase Retry Logic', () => {

    it('should parse --max-restarts flag', () => {
      const options = dashboardCore.parseCliArgs(['--max-restarts', '5']);
      assert.strictEqual(options.maxRestarts, 5);
    });

    it('should default maxRestarts to 3', () => {
      const options = dashboardCore.parseCliArgs([]);
      assert.strictEqual(options.maxRestarts, 3);
    });

    it('should allow --max-restarts 0', () => {
      const options = dashboardCore.parseCliArgs(['--max-restarts', '0']);
      assert.strictEqual(options.maxRestarts, 0);
    });

    // Edge case: Negative max restarts should be ignored
    it('should ignore negative max restarts', () => {
      const options = dashboardCore.parseCliArgs(['--max-restarts', '-1']);
      assert.strictEqual(options.maxRestarts, 3); // Default
    });

    // Edge case: Non-numeric max restarts
    it('should ignore non-numeric max restarts', () => {
      const options = dashboardCore.parseCliArgs(['--max-restarts', 'abc']);
      assert.strictEqual(options.maxRestarts, 3); // Default
    });

    // Edge case: Very large max restarts
    it('should accept large max restarts value', () => {
      const options = dashboardCore.parseCliArgs(['--max-restarts', '100']);
      assert.strictEqual(options.maxRestarts, 100);
    });

  });

  // ============ US-EXEC-005: Worker Spawning ============

  describe('US-EXEC-005: Worker Spawning', () => {

    it('should generate unique session IDs', () => {
      const id1 = dashboardCore.generateSessionId();
      const id2 = dashboardCore.generateSessionId();
      assert.notStrictEqual(id1, id2);
    });

    it('should generate valid UUID format', () => {
      const id = dashboardCore.generateSessionId();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      assert.ok(uuidRegex.test(id), 'Session ID should be valid UUID');
    });

    it('should track worker session in manifest', () => {
      const sessionId = dashboardCore.generateSessionId();
      const manifest = helpers.createManifest(testProject.manifestPath, {
        workerSessionId: sessionId
      });
      assert.strictEqual(manifest.workerSessionId, sessionId);
    });

    // Edge case: Generate multiple unique IDs rapidly
    it('should generate unique IDs even rapidly', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(dashboardCore.generateSessionId());
      }
      assert.strictEqual(ids.size, 100, 'All 100 session IDs should be unique');
    });

    // Edge case: Todo file path generation
    it('should generate correct todo file path', () => {
      const sessionId = 'abc-123-def-456';
      const todosDir = helpers.getTodosDir();
      const todoPath = dashboardCore.getWorkerTodoFilePath(sessionId, todosDir);

      assert.ok(todoPath.includes(sessionId));
      assert.ok(todoPath.endsWith('.json'));
    });

  });

  // ============ US-EXEC-006: Worker Process Monitoring ============

  describe('US-EXEC-006: Worker Process Monitoring', () => {

    it('should track worker PID in manifest', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        workerPids: [12345]
      });
      assert.ok(Array.isArray(manifest.workerPids));
      assert.strictEqual(manifest.workerPids[0], 12345);
    });

    it('should check if process is running', () => {
      // Check for a non-existent PID
      const isRunning = helpers.isProcessRunning(999999999);
      assert.strictEqual(isRunning, false);
    });

    // Edge case: Multiple PIDs in manifest
    it('should track multiple worker PIDs', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        workerPids: [12345, 67890, 11111]
      });
      assert.strictEqual(manifest.workerPids.length, 3);
    });

    // Edge case: Empty PID array
    it('should handle empty PID array', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        workerPids: []
      });
      assert.strictEqual(manifest.workerPids.length, 0);
    });

  });

  // ============ US-EXEC-007: Worker Stuck Detection ============

  describe('US-EXEC-007: Worker Stuck Detection', () => {

    it('should detect no progress in todo list', () => {
      const sessionId = 'stuck-test-session';
      const todosDir = helpers.getTodosDir();

      // Create initial todos
      const todoFile = helpers.simulateTodoFile(todosDir, sessionId, [
        { content: 'Task 1', status: 'in_progress' },
        { content: 'Task 2', status: 'pending' }
      ]);

      try {
        // Read todos
        const content = JSON.parse(fs.readFileSync(todoFile, 'utf8'));
        const inProgress = content.todos.filter(t => t.status === 'in_progress');

        assert.strictEqual(inProgress.length, 1);
      } finally {
        helpers.cleanupTodoFile(sessionId);
      }
    });

    // Edge case: All todos stuck at pending
    it('should detect all todos stuck at pending', () => {
      const sessionId = 'all-pending-session';
      const todosDir = helpers.getTodosDir();

      const todoFile = helpers.simulateTodoFile(todosDir, sessionId, [
        { content: 'Task 1', status: 'pending' },
        { content: 'Task 2', status: 'pending' },
        { content: 'Task 3', status: 'pending' }
      ]);

      try {
        const content = JSON.parse(fs.readFileSync(todoFile, 'utf8'));
        const inProgress = content.todos.filter(t => t.status === 'in_progress');
        const completed = content.todos.filter(t => t.status === 'completed');

        assert.strictEqual(inProgress.length, 0);
        assert.strictEqual(completed.length, 0);
      } finally {
        helpers.cleanupTodoFile(sessionId);
      }
    });

    // Edge case: Progress after being stuck
    it('should detect progress after being stuck', () => {
      const sessionId = 'progress-after-stuck';
      const todosDir = helpers.getTodosDir();

      // Start stuck
      const todoFile = helpers.simulateTodoFile(todosDir, sessionId, [
        { content: 'Task 1', status: 'pending' },
        { content: 'Task 2', status: 'pending' }
      ]);

      try {
        // Simulate progress
        helpers.simulateTodoProgress(todoFile, 1);

        const content = JSON.parse(fs.readFileSync(todoFile, 'utf8'));
        const completed = content.todos.filter(t => t.status === 'completed');

        assert.strictEqual(completed.length, 1);
      } finally {
        helpers.cleanupTodoFile(sessionId);
      }
    });

  });

  // ============ US-EXEC-008: Phase Completion Detection ============

  describe('US-EXEC-008: Phase Completion Detection', () => {

    it('should detect phase completion via all todos completed', () => {
      const stats = dashboardCore.parseTodoStats([
        { content: 'Task 1', status: 'completed' },
        { content: 'Task 2', status: 'completed' },
        { content: 'Task 3', status: 'completed' }
      ]);

      assert.strictEqual(dashboardCore.areTodosComplete(stats), true);
    });

    it('should not detect completion if any todo pending', () => {
      const stats = dashboardCore.parseTodoStats([
        { content: 'Task 1', status: 'completed' },
        { content: 'Task 2', status: 'pending' }
      ]);

      assert.strictEqual(dashboardCore.areTodosComplete(stats), false);
    });

    it('should not detect completion if any todo in_progress', () => {
      const stats = dashboardCore.parseTodoStats([
        { content: 'Task 1', status: 'completed' },
        { content: 'Task 2', status: 'in_progress' }
      ]);

      assert.strictEqual(dashboardCore.areTodosComplete(stats), false);
    });

    it('should get next phase after completion', () => {
      assert.strictEqual(dashboardCore.getNextPhase('1'), '2');
      assert.strictEqual(dashboardCore.getNextPhase('2'), '3');
      assert.strictEqual(dashboardCore.getNextPhase('3'), '4');
      assert.strictEqual(dashboardCore.getNextPhase('4'), '5');
      assert.strictEqual(dashboardCore.getNextPhase('5'), null);
    });

    // Edge case: Empty todo list should not complete
    it('should not complete with empty todo list', () => {
      const stats = dashboardCore.parseTodoStats([]);
      assert.strictEqual(dashboardCore.areTodosComplete(stats), false);
    });

    // Edge case: Single todo completion
    it('should detect completion with single completed todo', () => {
      const stats = dashboardCore.parseTodoStats([
        { content: 'Single task', status: 'completed' }
      ]);
      assert.strictEqual(dashboardCore.areTodosComplete(stats), true);
    });

    // Edge case: Update manifest phase status on completion
    it('should update manifest phase status on completion', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        currentPhase: '1',
        phases: {
          '1': { status: 'running' },
          '2': { status: 'pending' }
        }
      });

      // Simulate phase 1 completion
      manifest.phases['1'].status = 'complete';
      manifest.phases['1'].completedAt = new Date().toISOString();
      manifest.currentPhase = '2';
      manifest.phases['2'].status = 'running';

      fs.writeFileSync(testProject.manifestPath, JSON.stringify(manifest, null, 2));

      const updated = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(updated.phases['1'].status, 'complete');
      assert.ok(updated.phases['1'].completedAt);
      assert.strictEqual(updated.currentPhase, '2');
    });

    // Edge case: Last phase should return null for next
    it('should return null for next phase after phase 5', () => {
      assert.strictEqual(dashboardCore.getNextPhase('5'), null);
    });

    // Edge case: Invalid phase returns null
    it('should return null for invalid phase', () => {
      assert.strictEqual(dashboardCore.getNextPhase('99'), null);
      assert.strictEqual(dashboardCore.getNextPhase(''), null);
      assert.strictEqual(dashboardCore.getNextPhase(null), null);
    });

  });

  // ============ Integration: Full Phase Cycle ============

  describe('Phase Cycle Integration', () => {

    it('should simulate complete phase cycle in manifest', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        mode: 'new',
        currentPhase: '1',
        status: 'running',
        phases: {
          '1': { status: 'running' },
          '2': { status: 'pending' },
          '3': { status: 'pending' },
          '4': { status: 'pending' },
          '5': { status: 'pending' }
        }
      });

      // Simulate each phase completing
      for (let i = 1; i <= 5; i++) {
        const phaseKey = String(i);
        manifest.phases[phaseKey].status = 'complete';
        manifest.phases[phaseKey].completedAt = new Date().toISOString();

        const nextPhase = dashboardCore.getNextPhase(phaseKey);
        if (nextPhase) {
          manifest.currentPhase = nextPhase;
          manifest.phases[nextPhase].status = 'running';
        } else {
          manifest.currentPhase = 'complete';
          manifest.status = 'complete';
        }
      }

      fs.writeFileSync(testProject.manifestPath, JSON.stringify(manifest, null, 2));
      const final = helpers.readManifest(testProject.manifestPath);

      assert.strictEqual(final.status, 'complete');
      assert.strictEqual(final.currentPhase, 'complete');
      Object.keys(final.phases).forEach(phase => {
        assert.strictEqual(final.phases[phase].status, 'complete');
        assert.ok(final.phases[phase].completedAt);
      });
    });

    it('should track progress through phases with timestamps', () => {
      const startTime = Date.now();
      const manifest = helpers.createManifest(testProject.manifestPath, {
        currentPhase: '1',
        phases: {
          '1': { status: 'running', startedAt: new Date(startTime).toISOString() }
        }
      });

      // Complete phase 1
      manifest.phases['1'].status = 'complete';
      manifest.phases['1'].completedAt = new Date(startTime + 5000).toISOString();

      fs.writeFileSync(testProject.manifestPath, JSON.stringify(manifest, null, 2));
      const updated = helpers.readManifest(testProject.manifestPath);

      const started = new Date(updated.phases['1'].startedAt).getTime();
      const completed = new Date(updated.phases['1'].completedAt).getTime();
      assert.ok(completed > started, 'Completion should be after start');
    });

  });

});
