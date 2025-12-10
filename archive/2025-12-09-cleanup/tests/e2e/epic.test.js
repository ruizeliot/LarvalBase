/**
 * epic.test.js - E2E tests for Epic Loop Tracking (US-EPIC)
 *
 * Tests: US-EPIC-001 to US-EPIC-005 with edge cases
 *
 * These tests verify epic loop behavior at the system level.
 */

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const helpers = require('./test-helpers.cjs');
const dashboardCore = require(path.join(helpers.PIPELINE_OFFICE, 'lib', 'dashboard-core.cjs'));

describe('Epic Loop Tracking E2E (US-EPIC)', () => {
  let testProject;

  beforeEach(() => {
    testProject = helpers.createTestProject('epic-test');
  });

  afterEach(() => {
    if (testProject) testProject.cleanup();
  });

  // ============ US-EPIC-001: Epic Discovery ============

  describe('US-EPIC-001: Epic Discovery', () => {

    it('should get epics from manifest with epicLoops in phase 4', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        phases: {
          '1': { status: 'complete' },
          '2': { status: 'complete' },
          '3': { status: 'complete' },
          '4': {
            status: 'running',
            epicLoops: helpers.createEpicList(3)
          },
          '5': { status: 'pending' }
        }
      });

      const epics = dashboardCore.getEpicsFromManifest(manifest);
      assert.strictEqual(epics.length, 3);
    });

    it('should get epic metadata', () => {
      const epicList = helpers.createEpicList(2);
      const manifest = helpers.createManifest(testProject.manifestPath, {
        phases: {
          '4': { status: 'running', epicLoops: epicList }
        }
      });

      const epics = dashboardCore.getEpicsFromManifest(manifest);
      assert.ok(epics[0].id);
      assert.ok(epics[0].name);
      assert.ok(epics[0].status);
    });

    it('should preserve epic order', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        phases: {
          '4': {
            status: 'running',
            epicLoops: [
              { id: 'epic-1', name: 'First', status: 'pending' },
              { id: 'epic-2', name: 'Second', status: 'pending' },
              { id: 'epic-3', name: 'Third', status: 'pending' }
            ]
          }
        }
      });

      const epics = dashboardCore.getEpicsFromManifest(manifest);
      assert.strictEqual(epics[0].id, 'epic-1');
      assert.strictEqual(epics[1].id, 'epic-2');
      assert.strictEqual(epics[2].id, 'epic-3');
    });

    it('should handle manifest with loops in phase 2 (older format)', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        phases: {
          '2': {
            status: 'running',
            loops: [
              { id: 'loop-1', name: 'Loop 1', status: 'pending' }
            ]
          }
        }
      });

      const epics = dashboardCore.getEpicsFromManifest(manifest);
      assert.strictEqual(epics.length, 1);
    });

    // Edge case: Empty epic list
    it('should handle empty epic list', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        phases: {
          '4': { status: 'running', epicLoops: [] }
        }
      });

      const epics = dashboardCore.getEpicsFromManifest(manifest);
      assert.strictEqual(epics.length, 0);
    });

    // Edge case: No epics defined
    it('should return empty array for manifest without epics', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        phases: {
          '4': { status: 'running' }
        }
      });

      const epics = dashboardCore.getEpicsFromManifest(manifest);
      assert.strictEqual(epics.length, 0);
    });

    // Edge case: Null manifest
    it('should return empty array for null manifest', () => {
      const epics = dashboardCore.getEpicsFromManifest(null);
      assert.strictEqual(epics.length, 0);
    });

    // Edge case: Large number of epics
    it('should handle large number of epics', () => {
      const manyEpics = helpers.createEpicList(50);
      const manifest = helpers.createManifest(testProject.manifestPath, {
        phases: {
          '4': { status: 'running', epicLoops: manyEpics }
        }
      });

      const epics = dashboardCore.getEpicsFromManifest(manifest);
      assert.strictEqual(epics.length, 50);
    });

  });

  // ============ US-EPIC-002: Current Epic Tracking ============

  describe('US-EPIC-002: Current Epic Tracking', () => {

    it('should get first pending epic as current', () => {
      const epics = [
        { id: 'epic-1', status: 'pending' },
        { id: 'epic-2', status: 'pending' }
      ];

      const next = dashboardCore.getNextEpic(epics);
      assert.strictEqual(next.id, 'epic-1');
    });

    it('should skip completed epics', () => {
      const epics = [
        { id: 'epic-1', status: 'complete' },
        { id: 'epic-2', status: 'pending' },
        { id: 'epic-3', status: 'pending' }
      ];

      const next = dashboardCore.getNextEpic(epics);
      assert.strictEqual(next.id, 'epic-2');
    });

    it('should return in_progress epic as current', () => {
      const epics = [
        { id: 'epic-1', status: 'complete' },
        { id: 'epic-2', status: 'in_progress' },
        { id: 'epic-3', status: 'pending' }
      ];

      const next = dashboardCore.getNextEpic(epics);
      assert.strictEqual(next.id, 'epic-2');
    });

    it('should return null when all epics complete', () => {
      const epics = [
        { id: 'epic-1', status: 'complete' },
        { id: 'epic-2', status: 'complete' }
      ];

      const next = dashboardCore.getNextEpic(epics);
      assert.strictEqual(next, null);
    });

    // Edge case: Empty array
    it('should return null for empty epics array', () => {
      const next = dashboardCore.getNextEpic([]);
      assert.strictEqual(next, null);
    });

    // Edge case: Non-array
    it('should return null for non-array', () => {
      const next = dashboardCore.getNextEpic(null);
      assert.strictEqual(next, null);
    });

    // Edge case: First epic still in progress
    it('should return first epic if still in progress', () => {
      const epics = [
        { id: 'epic-1', status: 'in_progress' },
        { id: 'epic-2', status: 'pending' }
      ];

      const next = dashboardCore.getNextEpic(epics);
      assert.strictEqual(next.id, 'epic-1');
    });

    // Edge case: Mixed statuses
    it('should handle mixed status values', () => {
      const epics = [
        { id: 'epic-1', status: 'complete' },
        { id: 'epic-2', status: 'failed' },  // Non-standard status
        { id: 'epic-3', status: 'pending' }
      ];

      const next = dashboardCore.getNextEpic(epics);
      // 'failed' is not 'complete', so epic-2 should be returned
      assert.strictEqual(next.id, 'epic-2');
    });

  });

  // ============ US-EPIC-003: Epic Completion ============

  describe('US-EPIC-003: Epic Completion', () => {

    it('should mark epic as complete', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        phases: {
          '4': {
            status: 'running',
            epicLoops: [
              { id: 'epic-1', status: 'in_progress' },
              { id: 'epic-2', status: 'pending' }
            ]
          }
        }
      });

      // Simulate completion
      helpers.simulateEpicComplete(testProject.manifestPath, 'epic-1');

      const updated = helpers.readManifest(testProject.manifestPath);
      const epic1 = updated.phases['4'].epicLoops.find(e => e.id === 'epic-1');
      assert.strictEqual(epic1.status, 'complete');
    });

    it('should record completion timestamp', () => {
      helpers.createManifest(testProject.manifestPath, {
        phases: {
          '4': {
            status: 'running',
            epicLoops: [{ id: 'epic-1', status: 'in_progress' }]
          }
        }
      });

      helpers.simulateEpicComplete(testProject.manifestPath, 'epic-1');

      const updated = helpers.readManifest(testProject.manifestPath);
      const epic1 = updated.phases['4'].epicLoops.find(e => e.id === 'epic-1');
      assert.ok(epic1.completedAt, 'Should have completion timestamp');
    });

    it('should advance to next epic after completion', () => {
      helpers.createManifest(testProject.manifestPath, {
        phases: {
          '4': {
            status: 'running',
            epicLoops: [
              { id: 'epic-1', status: 'in_progress' },
              { id: 'epic-2', status: 'pending' }
            ]
          }
        }
      });

      helpers.simulateEpicComplete(testProject.manifestPath, 'epic-1');

      const updated = helpers.readManifest(testProject.manifestPath);
      const epics = updated.phases['4'].epicLoops;
      const next = dashboardCore.getNextEpic(epics);

      assert.strictEqual(next.id, 'epic-2');
    });

    // Edge case: Complete non-existent epic
    it('should handle completing non-existent epic gracefully', () => {
      helpers.createManifest(testProject.manifestPath, {
        phases: {
          '4': {
            status: 'running',
            epicLoops: [{ id: 'epic-1', status: 'pending' }]
          }
        }
      });

      // This should not throw
      helpers.simulateEpicComplete(testProject.manifestPath, 'non-existent');

      const updated = helpers.readManifest(testProject.manifestPath);
      const epic1 = updated.phases['4'].epicLoops.find(e => e.id === 'epic-1');
      assert.strictEqual(epic1.status, 'pending'); // Unchanged
    });

    // Edge case: Complete already completed epic
    it('should handle re-completing completed epic', () => {
      helpers.createManifest(testProject.manifestPath, {
        phases: {
          '4': {
            status: 'running',
            epicLoops: [{ id: 'epic-1', status: 'complete', completedAt: '2025-01-01T00:00:00Z' }]
          }
        }
      });

      helpers.simulateEpicComplete(testProject.manifestPath, 'epic-1');

      const updated = helpers.readManifest(testProject.manifestPath);
      const epic1 = updated.phases['4'].epicLoops.find(e => e.id === 'epic-1');
      assert.strictEqual(epic1.status, 'complete');
      // Timestamp updated
      assert.notStrictEqual(epic1.completedAt, '2025-01-01T00:00:00Z');
    });

  });

  // ============ US-EPIC-004: Epic Duration/Cost ============

  describe('US-EPIC-004: Epic Duration/Cost', () => {

    it('should track epic start time', () => {
      const startTime = new Date().toISOString();
      const manifest = helpers.createManifest(testProject.manifestPath, {
        phases: {
          '4': {
            status: 'running',
            epicLoops: [
              { id: 'epic-1', status: 'in_progress', startedAt: startTime }
            ]
          }
        }
      });

      const updated = helpers.readManifest(testProject.manifestPath);
      const epic1 = updated.phases['4'].epicLoops[0];
      assert.strictEqual(epic1.startedAt, startTime);
    });

    it('should calculate epic duration', () => {
      const startTime = new Date(Date.now() - 300000).toISOString(); // 5 min ago
      const endTime = new Date().toISOString();

      const manifest = helpers.createManifest(testProject.manifestPath, {
        phases: {
          '4': {
            status: 'running',
            epicLoops: [
              {
                id: 'epic-1',
                status: 'complete',
                startedAt: startTime,
                completedAt: endTime
              }
            ]
          }
        }
      });

      const updated = helpers.readManifest(testProject.manifestPath);
      const epic1 = updated.phases['4'].epicLoops[0];

      const start = new Date(epic1.startedAt).getTime();
      const end = new Date(epic1.completedAt).getTime();
      const duration = end - start;

      assert.ok(duration > 0, 'Duration should be positive');
      assert.ok(duration >= 290000, 'Duration should be at least ~5 minutes');
    });

    it('should store epic cost', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        phases: {
          '4': {
            status: 'running',
            epicLoops: [
              {
                id: 'epic-1',
                status: 'complete',
                cost: 1.234
              }
            ]
          }
        }
      });

      const updated = helpers.readManifest(testProject.manifestPath);
      const epic1 = updated.phases['4'].epicLoops[0];
      assert.strictEqual(epic1.cost, 1.234);
    });

    // Edge case: Epic with zero duration (immediate completion)
    it('should handle epic with zero duration', () => {
      const now = new Date().toISOString();
      const manifest = helpers.createManifest(testProject.manifestPath, {
        phases: {
          '4': {
            status: 'running',
            epicLoops: [
              { id: 'epic-1', status: 'complete', startedAt: now, completedAt: now }
            ]
          }
        }
      });

      const epic1 = manifest.phases['4'].epicLoops[0];
      const start = new Date(epic1.startedAt).getTime();
      const end = new Date(epic1.completedAt).getTime();

      assert.strictEqual(end - start, 0);
    });

    // Edge case: Epic cost precision
    it('should preserve cost precision', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        phases: {
          '4': {
            status: 'running',
            epicLoops: [
              { id: 'epic-1', status: 'complete', cost: 0.00123 }
            ]
          }
        }
      });

      const updated = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(updated.phases['4'].epicLoops[0].cost, 0.00123);
    });

  });

  // ============ US-EPIC-005: All Epics Complete Detection ============

  describe('US-EPIC-005: All Epics Complete Detection', () => {

    it('should return true when all epics complete', () => {
      const epics = [
        { id: 'epic-1', status: 'complete' },
        { id: 'epic-2', status: 'complete' },
        { id: 'epic-3', status: 'complete' }
      ];

      assert.strictEqual(dashboardCore.allEpicsComplete(epics), true);
    });

    it('should return false when any epic is pending', () => {
      const epics = [
        { id: 'epic-1', status: 'complete' },
        { id: 'epic-2', status: 'pending' }
      ];

      assert.strictEqual(dashboardCore.allEpicsComplete(epics), false);
    });

    it('should return false when any epic is in_progress', () => {
      const epics = [
        { id: 'epic-1', status: 'complete' },
        { id: 'epic-2', status: 'in_progress' }
      ];

      assert.strictEqual(dashboardCore.allEpicsComplete(epics), false);
    });

    it('should return true for empty array (no epics to complete)', () => {
      assert.strictEqual(dashboardCore.allEpicsComplete([]), true);
    });

    it('should return true for non-array (no epics)', () => {
      assert.strictEqual(dashboardCore.allEpicsComplete(null), true);
      assert.strictEqual(dashboardCore.allEpicsComplete(undefined), true);
    });

    // Edge case: Single epic
    it('should detect single epic completion', () => {
      const complete = [{ id: 'epic-1', status: 'complete' }];
      const pending = [{ id: 'epic-1', status: 'pending' }];

      assert.strictEqual(dashboardCore.allEpicsComplete(complete), true);
      assert.strictEqual(dashboardCore.allEpicsComplete(pending), false);
    });

    // Edge case: Large epic list
    it('should check all epics in large list', () => {
      const manyComplete = Array(100).fill(null).map((_, i) => ({
        id: `epic-${i}`,
        status: 'complete'
      }));

      assert.strictEqual(dashboardCore.allEpicsComplete(manyComplete), true);

      // Add one incomplete
      manyComplete[50].status = 'pending';
      assert.strictEqual(dashboardCore.allEpicsComplete(manyComplete), false);
    });

  });

  // ============ Epic Workflow Integration ============

  describe('Epic Workflow Integration', () => {

    it('should simulate full epic workflow', () => {
      // Create manifest with epics
      const manifest = helpers.createManifest(testProject.manifestPath, {
        mode: 'new',
        currentPhase: '4',
        phases: {
          '1': { status: 'complete' },
          '2': { status: 'complete' },
          '3': { status: 'complete' },
          '4': {
            status: 'running',
            epicLoops: [
              { id: 'epic-1', name: 'Auth', status: 'pending' },
              { id: 'epic-2', name: 'Dashboard', status: 'pending' },
              { id: 'epic-3', name: 'API', status: 'pending' }
            ]
          },
          '5': { status: 'pending' }
        }
      });

      // Verify initial state
      let epics = dashboardCore.getEpicsFromManifest(manifest);
      let current = dashboardCore.getNextEpic(epics);
      assert.strictEqual(current.id, 'epic-1');
      assert.strictEqual(dashboardCore.allEpicsComplete(epics), false);

      // Complete each epic
      for (let i = 1; i <= 3; i++) {
        helpers.simulateEpicComplete(testProject.manifestPath, `epic-${i}`);

        const updated = helpers.readManifest(testProject.manifestPath);
        epics = dashboardCore.getEpicsFromManifest(updated);
        current = dashboardCore.getNextEpic(epics);

        if (i < 3) {
          assert.strictEqual(current.id, `epic-${i + 1}`, `After epic ${i}, next should be epic ${i + 1}`);
          assert.strictEqual(dashboardCore.allEpicsComplete(epics), false);
        } else {
          assert.strictEqual(current, null, 'After last epic, current should be null');
          assert.strictEqual(dashboardCore.allEpicsComplete(epics), true);
        }
      }
    });

    it('should track epic progress in manifest', () => {
      helpers.createManifest(testProject.manifestPath, {
        currentPhase: '4',
        currentEpic: 'epic-1',
        phases: {
          '4': {
            status: 'running',
            epicLoops: helpers.createEpicList(3)
          }
        }
      });

      // Update current epic
      helpers.updateManifest(testProject.manifestPath, {
        currentEpic: 'epic-2'
      });

      const updated = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(updated.currentEpic, 'epic-2');
    });

    it('should handle phase 4 completion after all epics done', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        currentPhase: '4',
        phases: {
          '4': {
            status: 'running',
            epicLoops: [
              { id: 'epic-1', status: 'complete' },
              { id: 'epic-2', status: 'complete' }
            ]
          },
          '5': { status: 'pending' }
        }
      });

      const epics = dashboardCore.getEpicsFromManifest(manifest);
      if (dashboardCore.allEpicsComplete(epics)) {
        manifest.phases['4'].status = 'complete';
        manifest.phases['4'].completedAt = new Date().toISOString();
        manifest.currentPhase = '5';
        manifest.phases['5'].status = 'running';
      }

      fs.writeFileSync(testProject.manifestPath, JSON.stringify(manifest, null, 2));

      const updated = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(updated.phases['4'].status, 'complete');
      assert.strictEqual(updated.currentPhase, '5');
    });

  });

});
