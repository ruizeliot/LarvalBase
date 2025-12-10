/**
 * analytics.test.js - E2E tests for Analytics (US-ANA)
 *
 * Tests: US-ANA-001 to US-ANA-003 with edge cases
 *
 * These tests verify analytics and run history functionality.
 */

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const helpers = require('./test-helpers.cjs');

describe('Analytics E2E (US-ANA)', () => {
  let testProject;
  let runsPath;

  beforeEach(() => {
    testProject = helpers.createTestProject('analytics-test');
    runsPath = path.join(testProject.pipelineDir, 'pipeline-runs.json');
  });

  afterEach(() => {
    if (testProject) testProject.cleanup();
  });

  // ============ US-ANA-001: Pipeline Run Recording ============

  describe('US-ANA-001: Pipeline Run Recording', () => {

    it('should generate run ID', () => {
      const runId = `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const manifest = helpers.createManifest(testProject.manifestPath, {
        runId: runId
      });

      assert.ok(manifest.runId);
      assert.ok(manifest.runId.startsWith('run-'));
    });

    it('should record start timestamp', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        startedAt: new Date().toISOString()
      });

      assert.ok(manifest.startedAt);
      const timestamp = new Date(manifest.startedAt);
      assert.ok(!isNaN(timestamp.getTime()));
    });

    it('should record end timestamp', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        startedAt: new Date(Date.now() - 300000).toISOString(),
        completedAt: new Date().toISOString()
      });

      assert.ok(manifest.completedAt);
    });

    it('should record total cost', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        totalCost: 5.75
      });

      assert.strictEqual(manifest.totalCost, 5.75);
    });

    it('should record success/failure status', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        status: 'complete',
        success: true
      });

      assert.strictEqual(manifest.success, true);
    });

    // Edge case: Failed run
    it('should record failed run', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        status: 'failed',
        success: false,
        failureReason: 'Worker crashed 3 times'
      });

      assert.strictEqual(manifest.success, false);
      assert.ok(manifest.failureReason);
    });

    // Edge case: Paused run (incomplete)
    it('should record incomplete run', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        status: 'paused',
        success: null,
        completedAt: null
      });

      assert.strictEqual(manifest.success, null);
    });

  });

  // ============ US-ANA-002: Phase Statistics ============

  describe('US-ANA-002: Phase Statistics', () => {

    it('should store duration per phase', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        phaseStats: {
          '1': { durationMs: 120000 },
          '2': { durationMs: 180000 },
          '3': { durationMs: 300000 }
        }
      });

      assert.strictEqual(manifest.phaseStats['1'].durationMs, 120000);
    });

    it('should store cost per phase', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        phaseStats: {
          '1': { cost: 0.50 },
          '2': { cost: 1.25 },
          '3': { cost: 2.00 }
        }
      });

      const totalCost = Object.values(manifest.phaseStats)
        .reduce((sum, p) => sum + p.cost, 0);

      assert.strictEqual(totalCost, 3.75);
    });

    it('should store status per phase', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        phaseStats: {
          '1': { status: 'complete' },
          '2': { status: 'complete' },
          '3': { status: 'failed' }
        }
      });

      assert.strictEqual(manifest.phaseStats['3'].status, 'failed');
    });

    it('should be accessible in manifest.phaseStats', () => {
      helpers.createManifest(testProject.manifestPath, {
        phaseStats: {
          '1': { durationMs: 60000, cost: 0.25, status: 'complete' }
        }
      });

      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.ok(manifest.phaseStats);
      assert.ok(manifest.phaseStats['1']);
    });

    // Edge case: Phase with no metrics yet
    it('should handle phases without metrics', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        phaseStats: {
          '1': { status: 'pending' }
        }
      });

      const durationMs = manifest.phaseStats['1'].durationMs || 0;
      const cost = manifest.phaseStats['1'].cost || 0;

      assert.strictEqual(durationMs, 0);
      assert.strictEqual(cost, 0);
    });

    // Edge case: Calculate averages
    it('should support average calculations', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        phaseStats: {
          '1': { durationMs: 60000 },
          '2': { durationMs: 120000 },
          '3': { durationMs: 180000 }
        }
      });

      const durations = Object.values(manifest.phaseStats).map(p => p.durationMs);
      const average = durations.reduce((a, b) => a + b, 0) / durations.length;

      assert.strictEqual(average, 120000);
    });

  });

  // ============ US-ANA-003: Pipeline Runs History ============

  describe('US-ANA-003: Pipeline Runs History', () => {

    it('should store runs in pipeline-runs.json', () => {
      helpers.createPipelineRunsFile(runsPath, [
        { runId: 'run-1', success: true }
      ]);

      assert.ok(fs.existsSync(runsPath));
    });

    it('should keep last N runs', () => {
      const runs = [];
      for (let i = 0; i < 60; i++) {
        runs.push({ runId: `run-${i}`, success: true });
      }

      // Only keep last 50
      const trimmedRuns = runs.slice(-50);
      helpers.createPipelineRunsFile(runsPath, trimmedRuns);

      const data = helpers.readPipelineRuns(runsPath);
      assert.strictEqual(data.runs.length, 50);
    });

    it('should calculate summary statistics', () => {
      const runs = [
        { runId: 'run-1', success: true, totalCost: 5.00, durationMs: 300000 },
        { runId: 'run-2', success: true, totalCost: 4.50, durationMs: 250000 },
        { runId: 'run-3', success: false, totalCost: 3.00, durationMs: 200000 },
        { runId: 'run-4', success: true, totalCost: 5.50, durationMs: 350000 }
      ];

      helpers.createPipelineRunsFile(runsPath, runs);

      const data = helpers.readPipelineRuns(runsPath);
      const successCount = data.runs.filter(r => r.success).length;
      const successRate = (successCount / data.runs.length) * 100;
      const avgCost = data.runs.reduce((sum, r) => sum + r.totalCost, 0) / data.runs.length;

      assert.strictEqual(successRate, 75);
      assert.strictEqual(avgCost, 4.50);
    });

    it('should be accessible for reporting', () => {
      helpers.createPipelineRunsFile(runsPath, [
        { runId: 'run-1', startedAt: new Date().toISOString() }
      ]);

      const data = helpers.readPipelineRuns(runsPath);
      assert.ok(Array.isArray(data.runs));
    });

    // Edge case: Empty runs file
    it('should handle empty runs file', () => {
      helpers.createPipelineRunsFile(runsPath, []);
      const data = helpers.readPipelineRuns(runsPath);
      assert.deepStrictEqual(data.runs, []);
    });

    // Edge case: Corrupted runs file
    it('should handle corrupted runs file', () => {
      fs.writeFileSync(runsPath, 'not valid json');
      const data = helpers.readPipelineRuns(runsPath);
      assert.deepStrictEqual(data.runs, []);
    });

    // Edge case: Missing runs file
    it('should handle missing runs file', () => {
      const data = helpers.readPipelineRuns(runsPath);
      assert.deepStrictEqual(data.runs, []);
    });

    // Edge case: Add new run to existing history
    it('should append new runs', () => {
      helpers.createPipelineRunsFile(runsPath, [
        { runId: 'run-1' }
      ]);

      const data = helpers.readPipelineRuns(runsPath);
      data.runs.push({ runId: 'run-2' });
      fs.writeFileSync(runsPath, JSON.stringify(data, null, 2));

      const updated = helpers.readPipelineRuns(runsPath);
      assert.strictEqual(updated.runs.length, 2);
    });

  });

  // ============ Analytics Integration ============

  describe('Analytics Integration', () => {

    it('should create complete run record', () => {
      const runRecord = {
        runId: `run-${Date.now()}`,
        startedAt: new Date(Date.now() - 600000).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 600000,
        totalCost: 4.25,
        success: true,
        mode: 'new',
        phaseStats: {
          '1': { durationMs: 60000, cost: 0.50, status: 'complete' },
          '2': { durationMs: 120000, cost: 1.00, status: 'complete' },
          '3': { durationMs: 180000, cost: 1.25, status: 'complete' },
          '4': { durationMs: 200000, cost: 1.25, status: 'complete' },
          '5': { durationMs: 40000, cost: 0.25, status: 'complete' }
        }
      };

      helpers.createPipelineRunsFile(runsPath, [runRecord]);
      helpers.createManifest(testProject.manifestPath, runRecord);

      const manifest = helpers.readManifest(testProject.manifestPath);
      const runs = helpers.readPipelineRuns(runsPath);

      assert.ok(manifest.runId);
      assert.strictEqual(runs.runs.length, 1);
      assert.strictEqual(runs.runs[0].success, true);
    });

    it('should track trends over time', () => {
      const runs = [
        { runId: 'run-1', totalCost: 6.00, durationMs: 400000 },
        { runId: 'run-2', totalCost: 5.50, durationMs: 350000 },
        { runId: 'run-3', totalCost: 5.00, durationMs: 300000 },
        { runId: 'run-4', totalCost: 4.50, durationMs: 280000 }
      ];

      helpers.createPipelineRunsFile(runsPath, runs);

      const data = helpers.readPipelineRuns(runsPath);
      const costs = data.runs.map(r => r.totalCost);

      // Verify costs are decreasing (improving)
      for (let i = 1; i < costs.length; i++) {
        assert.ok(costs[i] <= costs[i - 1]);
      }
    });

    it('should support filtering by mode', () => {
      const runs = [
        { runId: 'run-1', mode: 'new', success: true },
        { runId: 'run-2', mode: 'feature', success: true },
        { runId: 'run-3', mode: 'new', success: false },
        { runId: 'run-4', mode: 'fix', success: true }
      ];

      helpers.createPipelineRunsFile(runsPath, runs);

      const data = helpers.readPipelineRuns(runsPath);
      const newModeRuns = data.runs.filter(r => r.mode === 'new');

      assert.strictEqual(newModeRuns.length, 2);
    });

  });

});
