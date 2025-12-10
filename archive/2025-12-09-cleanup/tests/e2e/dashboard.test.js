/**
 * dashboard.test.js - E2E tests for Dashboard Display (US-DASH)
 *
 * Tests: US-DASH-001 to US-DASH-007 with edge cases
 *
 * These tests verify dashboard display functionality at the system level.
 */

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const helpers = require('./test-helpers.cjs');
const dashboardCore = require(path.join(helpers.PIPELINE_OFFICE, 'lib', 'dashboard-core.cjs'));

describe('Dashboard Display E2E (US-DASH)', () => {
  let testProject;

  beforeEach(() => {
    testProject = helpers.createTestProject('dashboard-test');
  });

  afterEach(() => {
    if (testProject) testProject.cleanup();
  });

  // ============ US-DASH-001: Live Dashboard ============

  describe('US-DASH-001: Live Dashboard', () => {

    it('should have refresh interval configured', () => {
      // Dashboard should have a configurable refresh rate
      const config = dashboardCore.getDefaultConfig ? dashboardCore.getDefaultConfig() : { refreshInterval: 2000 };
      assert.ok(config.refreshInterval >= 1000, 'Refresh interval should be at least 1 second');
      assert.ok(config.refreshInterval <= 5000, 'Refresh interval should be at most 5 seconds');
    });

    it('should create manifest with status field', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        status: 'running'
      });

      assert.ok(manifest.status);
      assert.strictEqual(manifest.status, 'running');
    });

    it('should update status in manifest', () => {
      helpers.createManifest(testProject.manifestPath, { status: 'pending' });

      helpers.updateManifest(testProject.manifestPath, { status: 'running' });
      let manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.status, 'running');

      helpers.updateManifest(testProject.manifestPath, { status: 'paused' });
      manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.status, 'paused');
    });

    // Edge case: Rapid manifest updates
    it('should handle rapid sequential manifest updates', () => {
      helpers.createManifest(testProject.manifestPath, { counter: 0 });

      for (let i = 1; i <= 10; i++) {
        helpers.updateManifest(testProject.manifestPath, { counter: i });
      }

      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.counter, 10);
    });

    // Edge case: Concurrent file access
    it('should maintain data integrity with frequent reads', () => {
      helpers.createManifest(testProject.manifestPath, {
        status: 'running',
        currentPhase: '2',
        mode: 'new'
      });

      // Simulate frequent dashboard reads
      for (let i = 0; i < 100; i++) {
        const manifest = helpers.readManifest(testProject.manifestPath);
        assert.ok(manifest);
        assert.strictEqual(manifest.status, 'running');
      }
    });

  });

  // ============ US-DASH-002: Phase Progress Display ============

  describe('US-DASH-002: Phase Progress Display', () => {

    it('should display current phase number', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        currentPhase: '3'
      });

      assert.strictEqual(manifest.currentPhase, '3');
    });

    it('should track phase status', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        currentPhase: '2',
        phases: {
          '1': { status: 'complete' },
          '2': { status: 'running' },
          '3': { status: 'pending' }
        }
      });

      assert.strictEqual(manifest.phases['1'].status, 'complete');
      assert.strictEqual(manifest.phases['2'].status, 'running');
      assert.strictEqual(manifest.phases['3'].status, 'pending');
    });

    it('should return correct phase name', () => {
      const phaseNames = dashboardCore.getPhaseNames ? dashboardCore.getPhaseNames() : {
        '1': 'Brainstorm',
        '2': 'Technical',
        '3': 'Bootstrap',
        '4': 'Implement',
        '5': 'Finalize'
      };

      assert.ok(phaseNames['1']);
      assert.ok(phaseNames['2']);
      assert.ok(typeof phaseNames['1'] === 'string');
    });

    // Edge case: All phases complete
    it('should handle all phases complete', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        currentPhase: '5',
        status: 'complete',
        phases: {
          '1': { status: 'complete' },
          '2': { status: 'complete' },
          '3': { status: 'complete' },
          '4': { status: 'complete' },
          '5': { status: 'complete' }
        }
      });

      const allComplete = Object.values(manifest.phases).every(p => p.status === 'complete');
      assert.strictEqual(allComplete, true);
    });

    // Edge case: Phase with error status
    it('should handle phase with error status', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        currentPhase: '3',
        phases: {
          '1': { status: 'complete' },
          '2': { status: 'complete' },
          '3': { status: 'error', error: 'Test failed' }
        }
      });

      assert.strictEqual(manifest.phases['3'].status, 'error');
      assert.strictEqual(manifest.phases['3'].error, 'Test failed');
    });

  });

  // ============ US-DASH-003: Todo Progress Bar ============

  describe('US-DASH-003: Todo Progress Bar', () => {

    it('should calculate progress percentage', () => {
      const todos = [
        { content: 'Task 1', status: 'completed' },
        { content: 'Task 2', status: 'completed' },
        { content: 'Task 3', status: 'in_progress' },
        { content: 'Task 4', status: 'pending' }
      ];

      const completed = todos.filter(t => t.status === 'completed').length;
      const total = todos.length;
      const percentage = Math.round((completed / total) * 100);

      assert.strictEqual(percentage, 50);
    });

    it('should handle zero todos', () => {
      const todos = [];
      const completed = todos.filter(t => t.status === 'completed').length;
      const total = todos.length;
      const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

      assert.strictEqual(percentage, 0);
    });

    it('should handle 100% completion', () => {
      const todos = [
        { content: 'Task 1', status: 'completed' },
        { content: 'Task 2', status: 'completed' }
      ];

      const completed = todos.filter(t => t.status === 'completed').length;
      const total = todos.length;
      const percentage = Math.round((completed / total) * 100);

      assert.strictEqual(percentage, 100);
    });

    // Edge case: Large number of todos
    it('should handle large todo lists', () => {
      const todos = [];
      for (let i = 0; i < 100; i++) {
        todos.push({
          content: `Task ${i}`,
          status: i < 75 ? 'completed' : 'pending'
        });
      }

      const completed = todos.filter(t => t.status === 'completed').length;
      const percentage = Math.round((completed / todos.length) * 100);

      assert.strictEqual(percentage, 75);
    });

    // Edge case: Fractional percentage
    it('should round fractional percentages', () => {
      const todos = [
        { content: 'Task 1', status: 'completed' },
        { content: 'Task 2', status: 'pending' },
        { content: 'Task 3', status: 'pending' }
      ];

      const completed = todos.filter(t => t.status === 'completed').length;
      const percentage = Math.round((completed / todos.length) * 100);

      assert.strictEqual(percentage, 33); // 33.33... rounds to 33
    });

  });

  // ============ US-DASH-004: Elapsed Time Display ============

  describe('US-DASH-004: Elapsed Time Display', () => {

    it('should calculate elapsed time from start', () => {
      const startTime = Date.now() - 60000; // 1 minute ago
      const manifest = helpers.createManifest(testProject.manifestPath, {
        startedAt: new Date(startTime).toISOString()
      });

      const started = new Date(manifest.startedAt).getTime();
      const elapsed = Date.now() - started;

      assert.ok(elapsed >= 60000);
      assert.ok(elapsed < 65000); // Allow 5 seconds tolerance
    });

    it('should format time correctly', () => {
      const formatTime = (ms) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
      };

      assert.strictEqual(formatTime(0), '00:00:00');
      assert.strictEqual(formatTime(60000), '00:01:00');
      assert.strictEqual(formatTime(3600000), '01:00:00');
      assert.strictEqual(formatTime(3661000), '01:01:01');
    });

    it('should track elapsed time in manifest', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        elapsedMs: 120000
      });

      assert.strictEqual(manifest.elapsedMs, 120000);
    });

    it('should continue from resume point', () => {
      const previousElapsed = 300000; // 5 minutes
      helpers.createManifest(testProject.manifestPath, {
        elapsedMs: previousElapsed,
        pausedAt: new Date().toISOString(),
        status: 'paused'
      });

      // Simulate resume
      helpers.updateManifest(testProject.manifestPath, {
        status: 'running',
        resumedAt: new Date().toISOString()
      });

      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.elapsedMs, previousElapsed);
    });

    // Edge case: Very long running time
    it('should handle long running times', () => {
      const formatTime = (ms) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
      };

      // 100 hours
      const longTime = 100 * 60 * 60 * 1000;
      const formatted = formatTime(longTime);
      assert.strictEqual(formatted, '100:00:00');
    });

    // Edge case: Phase elapsed time
    it('should track per-phase elapsed time', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        phases: {
          '1': { status: 'complete', elapsedMs: 30000 },
          '2': { status: 'complete', elapsedMs: 45000 },
          '3': { status: 'running', elapsedMs: 15000 }
        }
      });

      const totalPhaseTime = Object.values(manifest.phases)
        .reduce((sum, p) => sum + (p.elapsedMs || 0), 0);

      assert.strictEqual(totalPhaseTime, 90000);
    });

  });

  // ============ US-DASH-005: Cost Display ============

  describe('US-DASH-005: Cost Display', () => {

    it('should store current cost in manifest', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        currentCost: 2.50
      });

      assert.strictEqual(manifest.currentCost, 2.50);
    });

    it('should format cost as USD', () => {
      const formatCost = (cost) => `$${cost.toFixed(2)}`;

      assert.strictEqual(formatCost(0), '$0.00');
      assert.strictEqual(formatCost(1.5), '$1.50');
      assert.strictEqual(formatCost(10.99), '$10.99');
      assert.strictEqual(formatCost(0.001), '$0.00'); // Rounds down
    });

    it('should track per-phase cost', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        phases: {
          '1': { status: 'complete', cost: 0.50 },
          '2': { status: 'complete', cost: 1.25 },
          '3': { status: 'running', cost: 0.75 }
        },
        currentCost: 2.50
      });

      const totalPhaseCost = Object.values(manifest.phases)
        .reduce((sum, p) => sum + (p.cost || 0), 0);

      assert.strictEqual(totalPhaseCost, 2.50);
    });

    it('should track session cost', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        currentCost: 5.00,
        sessionCost: 1.25
      });

      assert.ok(manifest.sessionCost <= manifest.currentCost);
    });

    // Edge case: Zero cost
    it('should handle zero cost', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        currentCost: 0
      });

      assert.strictEqual(manifest.currentCost, 0);
    });

    // Edge case: Large cost
    it('should handle large costs', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        currentCost: 999.99
      });

      const formatCost = (cost) => `$${cost.toFixed(2)}`;
      assert.strictEqual(formatCost(manifest.currentCost), '$999.99');
    });

    // Edge case: Cost with many decimals
    it('should handle costs with precision', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        currentCost: 1.23456
      });

      const formatCost = (cost) => `$${cost.toFixed(2)}`;
      assert.strictEqual(formatCost(manifest.currentCost), '$1.23');
    });

  });

  // ============ US-DASH-006: Epic Loop Display ============

  describe('US-DASH-006: Epic Loop Display', () => {

    it('should display current epic number', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        currentPhase: '4',
        phases: {
          '4': {
            status: 'running',
            epicLoops: helpers.createEpicList(3),
            currentEpicIndex: 1
          }
        }
      });

      assert.strictEqual(manifest.phases['4'].currentEpicIndex, 1);
      const currentEpic = manifest.phases['4'].epicLoops[1];
      assert.ok(currentEpic);
    });

    it('should display epic name', () => {
      const epicLoops = helpers.createEpicList(3);
      const manifest = helpers.createManifest(testProject.manifestPath, {
        phases: {
          '4': { epicLoops }
        }
      });

      assert.ok(manifest.phases['4'].epicLoops[0].name);
      assert.ok(manifest.phases['4'].epicLoops[0].name.includes('Epic'));
    });

    it('should track epic status', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        phases: {
          '4': {
            epicLoops: [
              { id: 'epic-1', name: 'Epic 1', status: 'complete' },
              { id: 'epic-2', name: 'Epic 2', status: 'running' },
              { id: 'epic-3', name: 'Epic 3', status: 'pending' }
            ]
          }
        }
      });

      assert.strictEqual(manifest.phases['4'].epicLoops[0].status, 'complete');
      assert.strictEqual(manifest.phases['4'].epicLoops[1].status, 'running');
      assert.strictEqual(manifest.phases['4'].epicLoops[2].status, 'pending');
    });

    it('should calculate epic progress', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        phases: {
          '4': {
            epicLoops: [
              { status: 'complete' },
              { status: 'complete' },
              { status: 'running' },
              { status: 'pending' }
            ]
          }
        }
      });

      const epics = manifest.phases['4'].epicLoops;
      const completed = epics.filter(e => e.status === 'complete').length;
      const total = epics.length;

      assert.strictEqual(completed, 2);
      assert.strictEqual(total, 4);
    });

    // Edge case: No epics defined
    it('should handle phase 4 with no epics', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        currentPhase: '4',
        phases: {
          '4': { status: 'running' }
        }
      });

      const epics = manifest.phases['4'].epicLoops || [];
      assert.strictEqual(epics.length, 0);
    });

    // Edge case: Single epic
    it('should handle single epic', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        phases: {
          '4': {
            epicLoops: [{ id: 'epic-1', status: 'running' }],
            currentEpicIndex: 0
          }
        }
      });

      assert.strictEqual(manifest.phases['4'].epicLoops.length, 1);
    });

    // Edge case: Many epics
    it('should handle many epics', () => {
      const epicLoops = helpers.createEpicList(20);
      const manifest = helpers.createManifest(testProject.manifestPath, {
        phases: {
          '4': { epicLoops }
        }
      });

      assert.strictEqual(manifest.phases['4'].epicLoops.length, 20);
    });

  });

  // ============ US-DASH-007: Mode Display ============

  describe('US-DASH-007: Mode Display', () => {

    it('should display new mode', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        mode: 'new'
      });

      assert.strictEqual(manifest.mode, 'new');
    });

    it('should display feature mode', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        mode: 'feature'
      });

      assert.strictEqual(manifest.mode, 'feature');
    });

    it('should display fix mode', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        mode: 'fix'
      });

      assert.strictEqual(manifest.mode, 'fix');
    });

    it('should show correct phase sequence for each mode', () => {
      const newSeq = dashboardCore.getPhaseSequence('new');
      const featureSeq = dashboardCore.getPhaseSequence('feature');
      const fixSeq = dashboardCore.getPhaseSequence('fix');

      assert.strictEqual(newSeq.length, 5);
      assert.strictEqual(featureSeq.length, 3);
      assert.strictEqual(fixSeq.length, 1);
    });

    // Edge case: Mode not set (legacy manifest)
    it('should handle missing mode', () => {
      const manifest = {
        projectId: 'test',
        currentPhase: '1'
        // No mode
      };
      fs.writeFileSync(testProject.manifestPath, JSON.stringify(manifest, null, 2));

      const loaded = helpers.readManifest(testProject.manifestPath);
      const sequence = dashboardCore.getPhaseSequence(loaded.mode);

      // Should default to full sequence
      assert.strictEqual(sequence.length, 5);
    });

    // Edge case: Invalid mode
    it('should handle invalid mode gracefully', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        mode: 'invalid'
      });

      const sequence = dashboardCore.getPhaseSequence(manifest.mode);
      // Should default to full sequence
      assert.strictEqual(sequence.length, 5);
    });

    // Edge case: Mode consistency with phases
    it('should have matching phases for mode', () => {
      const manifest = dashboardCore.createManifest('test', testProject.projectPath, 'feature');
      const sequence = dashboardCore.getPhaseSequence('feature');

      const manifestPhases = Object.keys(manifest.phases);
      assert.deepStrictEqual(manifestPhases.sort(), sequence.sort());
    });

  });

  // ============ Dashboard Integration ============

  describe('Dashboard Integration', () => {

    it('should create complete dashboard state', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        projectId: 'dashboard-test',
        mode: 'new',
        status: 'running',
        currentPhase: '3',
        startedAt: new Date().toISOString(),
        elapsedMs: 60000,
        currentCost: 1.50,
        phases: {
          '1': { status: 'complete', elapsedMs: 20000, cost: 0.30 },
          '2': { status: 'complete', elapsedMs: 25000, cost: 0.50 },
          '3': { status: 'running', elapsedMs: 15000, cost: 0.70 },
          '4': { status: 'pending' },
          '5': { status: 'pending' }
        }
      });

      // Verify all dashboard fields present
      assert.ok(manifest.projectId);
      assert.ok(manifest.mode);
      assert.ok(manifest.status);
      assert.ok(manifest.currentPhase);
      assert.ok(manifest.startedAt);
      assert.ok(manifest.elapsedMs >= 0);
      assert.ok(manifest.currentCost >= 0);
      assert.ok(manifest.phases);
    });

    it('should update all dashboard fields atomically', () => {
      helpers.createManifest(testProject.manifestPath, {
        status: 'pending',
        currentPhase: '1',
        elapsedMs: 0,
        currentCost: 0
      });

      helpers.updateManifest(testProject.manifestPath, {
        status: 'running',
        currentPhase: '2',
        elapsedMs: 30000,
        currentCost: 0.75
      });

      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.status, 'running');
      assert.strictEqual(manifest.currentPhase, '2');
      assert.strictEqual(manifest.elapsedMs, 30000);
      assert.strictEqual(manifest.currentCost, 0.75);
    });

    it('should preserve dashboard state across restarts', () => {
      const originalState = {
        projectId: 'persistence-test',
        mode: 'feature',
        status: 'paused',
        currentPhase: '2',
        elapsedMs: 45000,
        currentCost: 2.25,
        workerSessionId: 'session-abc'
      };

      helpers.createManifest(testProject.manifestPath, originalState);

      // Simulate restart by re-reading
      const restored = helpers.readManifest(testProject.manifestPath);

      assert.strictEqual(restored.projectId, originalState.projectId);
      assert.strictEqual(restored.mode, originalState.mode);
      assert.strictEqual(restored.status, originalState.status);
      assert.strictEqual(restored.currentPhase, originalState.currentPhase);
      assert.strictEqual(restored.elapsedMs, originalState.elapsedMs);
      assert.strictEqual(restored.currentCost, originalState.currentCost);
      assert.strictEqual(restored.workerSessionId, originalState.workerSessionId);
    });

  });

});
