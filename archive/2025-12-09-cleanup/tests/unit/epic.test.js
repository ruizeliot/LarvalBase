/**
 * epic.test.js - Unit tests for epic loop tracking
 *
 * Tests: US-EPIC-001 to US-EPIC-005
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  getEpicsFromManifest,
  getNextEpic,
  allEpicsComplete
} = require('../../lib/dashboard-core.cjs');

// Load fixture
const sampleManifest = require('../fixtures/sample-manifest.json');

describe('Epic Loop Tracking (US-EPIC)', () => {

  // US-EPIC-001: Epic Discovery
  describe('US-EPIC-001: Epic Discovery', () => {

    it('should get epics from manifest with epicLoops (phase 4)', () => {
      const epics = getEpicsFromManifest(sampleManifest);
      assert.ok(Array.isArray(epics));
      assert.strictEqual(epics.length, 2);
    });

    it('should get epic metadata', () => {
      const epics = getEpicsFromManifest(sampleManifest);
      const firstEpic = epics[0];

      assert.strictEqual(firstEpic.epic, 1);
      assert.strictEqual(firstEpic.name, 'Core Features');
      assert.ok(Array.isArray(firstEpic.stories));
      assert.ok(Array.isArray(firstEpic.tests));
    });

    it('should handle manifest with loops in phase 2 (older format)', () => {
      const oldManifest = {
        phases: {
          '2': {
            loops: [
              { id: 1, name: 'Epic 1', status: 'pending' }
            ]
          }
        }
      };
      const epics = getEpicsFromManifest(oldManifest);
      assert.strictEqual(epics.length, 1);
    });

    it('should return empty array for manifest without epics', () => {
      const manifestNoEpics = {
        phases: {
          '1': { status: 'pending' },
          '2': { status: 'pending' }
        }
      };
      const epics = getEpicsFromManifest(manifestNoEpics);
      assert.deepStrictEqual(epics, []);
    });

    it('should return empty array for null manifest', () => {
      const epics = getEpicsFromManifest(null);
      assert.deepStrictEqual(epics, []);
    });

  });

  // US-EPIC-002: Current Epic Tracking
  describe('US-EPIC-002: Current Epic Tracking', () => {

    it('should get first pending epic', () => {
      const epics = [
        { epic: 1, name: 'First', status: 'complete' },
        { epic: 2, name: 'Second', status: 'pending' },
        { epic: 3, name: 'Third', status: 'pending' }
      ];
      const nextEpic = getNextEpic(epics);
      assert.strictEqual(nextEpic.epic, 2);
      assert.strictEqual(nextEpic.name, 'Second');
    });

    it('should return null when all epics complete', () => {
      const epics = [
        { epic: 1, status: 'complete' },
        { epic: 2, status: 'complete' }
      ];
      const nextEpic = getNextEpic(epics);
      assert.strictEqual(nextEpic, null);
    });

    it('should return null for empty epics array', () => {
      const nextEpic = getNextEpic([]);
      assert.strictEqual(nextEpic, null);
    });

    it('should return null for non-array', () => {
      const nextEpic = getNextEpic(null);
      assert.strictEqual(nextEpic, null);
    });

    it('should skip over complete epics', () => {
      const epics = [
        { epic: 1, status: 'complete' },
        { epic: 2, status: 'complete' },
        { epic: 3, status: 'pending' }
      ];
      const nextEpic = getNextEpic(epics);
      assert.strictEqual(nextEpic.epic, 3);
    });

  });

  // US-EPIC-003: Epic Completion Check
  describe('US-EPIC-003: Epic Completion Check', () => {

    it('should return true when all epics complete', () => {
      const epics = [
        { epic: 1, status: 'complete' },
        { epic: 2, status: 'complete' }
      ];
      assert.strictEqual(allEpicsComplete(epics), true);
    });

    it('should return false when any epic is pending', () => {
      const epics = [
        { epic: 1, status: 'complete' },
        { epic: 2, status: 'pending' }
      ];
      assert.strictEqual(allEpicsComplete(epics), false);
    });

    it('should return true for empty array (no epics to complete)', () => {
      assert.strictEqual(allEpicsComplete([]), true);
    });

    it('should return true for non-array (no epics)', () => {
      assert.strictEqual(allEpicsComplete(null), true);
      assert.strictEqual(allEpicsComplete(undefined), true);
    });

  });

  // US-EPIC-004: Epic Status Values
  describe('US-EPIC-004: Epic Status Values', () => {

    it('should recognize "complete" as done', () => {
      const epics = [{ epic: 1, status: 'complete' }];
      assert.strictEqual(allEpicsComplete(epics), true);
    });

    it('should recognize "pending" as not done', () => {
      const epics = [{ epic: 1, status: 'pending' }];
      assert.strictEqual(allEpicsComplete(epics), false);
      assert.ok(getNextEpic(epics) !== null);
    });

    it('should recognize "in_progress" as not done', () => {
      const epics = [{ epic: 1, status: 'in_progress' }];
      assert.strictEqual(allEpicsComplete(epics), false);
    });

    it('should recognize any non-complete status as not done', () => {
      const epics = [{ epic: 1, status: 'running' }];
      assert.strictEqual(allEpicsComplete(epics), false);
    });

  });

  // US-EPIC-005: Sample Fixture Integration
  describe('US-EPIC-005: Fixture Integration', () => {

    it('should process sample-manifest epics correctly', () => {
      const epics = getEpicsFromManifest(sampleManifest);

      assert.strictEqual(epics.length, 2);
      assert.strictEqual(epics[0].name, 'Core Features');
      assert.strictEqual(epics[1].name, 'UI Polish');
    });

    it('should find next pending epic from fixture', () => {
      const epics = getEpicsFromManifest(sampleManifest);
      const nextEpic = getNextEpic(epics);

      // Both epics in fixture are pending
      assert.ok(nextEpic !== null);
      assert.strictEqual(nextEpic.epic, 1); // First pending
    });

    it('should report not all epics complete for fixture', () => {
      const epics = getEpicsFromManifest(sampleManifest);
      assert.strictEqual(allEpicsComplete(epics), false);
    });

  });

});
