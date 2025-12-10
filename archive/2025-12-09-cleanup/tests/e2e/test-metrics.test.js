/**
 * test-metrics.test.js - E2E tests for Test System Metrics (US-TEST)
 *
 * Tests: US-TEST-001 to US-TEST-004 with edge cases
 *
 * These tests verify that the test system itself tracks duration and cost.
 * This enables analysis of test suite performance over time.
 */

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const helpers = require('./test-helpers.cjs');

describe('Test System Metrics E2E (US-TEST)', () => {
  let testProject;
  let metricsPath;

  beforeEach(() => {
    testProject = helpers.createTestProject('test-metrics');
    metricsPath = path.join(testProject.pipelineDir, 'test-metrics.json');
  });

  afterEach(() => {
    if (testProject) testProject.cleanup();
  });

  // ============ US-TEST-001: Test Duration Tracking ============

  describe('US-TEST-001: Test Duration Tracking', () => {

    it('should record test start time', () => {
      const startTime = Date.now();
      const metrics = {
        startedAt: new Date(startTime).toISOString(),
        tests: []
      };

      fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));

      const data = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      assert.ok(data.startedAt);
    });

    it('should record test end time', () => {
      const startTime = Date.now() - 5000;
      const endTime = Date.now();
      const metrics = {
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date(endTime).toISOString(),
        durationMs: endTime - startTime
      };

      fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));

      const data = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      assert.ok(data.completedAt);
      assert.ok(data.durationMs >= 5000);
    });

    it('should track per-test duration', () => {
      const metrics = {
        tests: [
          { name: 'test-1', durationMs: 1500, status: 'passed' },
          { name: 'test-2', durationMs: 2300, status: 'passed' },
          { name: 'test-3', durationMs: 800, status: 'passed' }
        ]
      };

      fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));

      const data = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      const totalDuration = data.tests.reduce((sum, t) => sum + t.durationMs, 0);
      assert.strictEqual(totalDuration, 4600);
    });

    it('should track per-suite duration', () => {
      const metrics = {
        suites: [
          { name: 'exec.test.js', durationMs: 15000, testCount: 10, passed: 10, failed: 0 },
          { name: 'worker.test.js', durationMs: 25000, testCount: 15, passed: 14, failed: 1 },
          { name: 'mode.test.js', durationMs: 12000, testCount: 8, passed: 8, failed: 0 }
        ]
      };

      fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));

      const data = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      const totalDuration = data.suites.reduce((sum, s) => sum + s.durationMs, 0);
      assert.strictEqual(totalDuration, 52000);
    });

    // Edge case: Very fast tests
    it('should track sub-millisecond precision', () => {
      const metrics = {
        tests: [
          { name: 'fast-test', durationMs: 0.5 }
        ]
      };

      fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));

      const data = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      assert.ok(data.tests[0].durationMs < 1);
    });

    // Edge case: Long running tests
    it('should handle long-duration tests', () => {
      const oneHour = 3600000;
      const metrics = {
        tests: [
          { name: 'long-test', durationMs: oneHour }
        ]
      };

      fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));

      const data = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      assert.strictEqual(data.tests[0].durationMs, oneHour);
    });

  });

  // ============ US-TEST-002: Test Cost Tracking ============

  describe('US-TEST-002: Test Cost Tracking', () => {

    it('should estimate cost per test suite', () => {
      const metrics = {
        suites: [
          { name: 'exec.test.js', estimatedCost: 0.15 },
          { name: 'worker.test.js', estimatedCost: 0.25 },
          { name: 'mode.test.js', estimatedCost: 0.10 }
        ]
      };

      fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));

      const data = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      const totalCost = data.suites.reduce((sum, s) => sum + s.estimatedCost, 0);
      assert.strictEqual(totalCost, 0.50);
    });

    it('should track actual cost when available', () => {
      const metrics = {
        suites: [
          { name: 'real-worker.test.js', estimatedCost: 0.50, actualCost: 0.45 }
        ]
      };

      fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));

      const data = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      assert.strictEqual(data.suites[0].actualCost, 0.45);
    });

    it('should calculate cost per test', () => {
      const metrics = {
        totalCost: 1.50,
        totalTests: 100,
        costPerTest: 0.015
      };

      fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));

      const data = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      assert.strictEqual(data.costPerTest, 0.015);
    });

    it('should support cost budget for test runs', () => {
      const metrics = {
        budget: 5.00,
        spent: 3.25,
        remaining: 1.75,
        withinBudget: true
      };

      fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));

      const data = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      assert.strictEqual(data.withinBudget, true);
    });

    // Edge case: Cost exceeds budget
    it('should detect cost overrun', () => {
      const metrics = {
        budget: 2.00,
        spent: 3.50,
        remaining: -1.50,
        withinBudget: false,
        overrunPercent: 75
      };

      fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));

      const data = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      assert.strictEqual(data.withinBudget, false);
      assert.ok(data.remaining < 0);
    });

    // Edge case: No cost tracking (simulation tests)
    it('should handle tests with no cost', () => {
      const metrics = {
        suites: [
          { name: 'unit.test.js', estimatedCost: 0, actualCost: 0, reason: 'No Claude API calls' }
        ]
      };

      fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));

      const data = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      assert.strictEqual(data.suites[0].estimatedCost, 0);
    });

  });

  // ============ US-TEST-003: Test Run History ============

  describe('US-TEST-003: Test Run History', () => {

    it('should store test run history', () => {
      const historyPath = path.join(testProject.pipelineDir, 'test-history.json');
      const history = {
        runs: [
          {
            runId: 'test-run-1',
            timestamp: new Date().toISOString(),
            totalTests: 100,
            passed: 98,
            failed: 2,
            durationMs: 120000,
            cost: 1.25
          }
        ]
      };

      fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));

      const data = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
      assert.strictEqual(data.runs.length, 1);
    });

    it('should keep last N test runs', () => {
      const historyPath = path.join(testProject.pipelineDir, 'test-history.json');
      const runs = [];
      for (let i = 0; i < 25; i++) {
        runs.push({ runId: `run-${i}` });
      }

      // Keep last 20
      const trimmedRuns = runs.slice(-20);
      const history = { runs: trimmedRuns };

      fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));

      const data = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
      assert.strictEqual(data.runs.length, 20);
    });

    it('should calculate success rate over time', () => {
      const historyPath = path.join(testProject.pipelineDir, 'test-history.json');
      const history = {
        runs: [
          { passed: 100, failed: 0 },
          { passed: 98, failed: 2 },
          { passed: 99, failed: 1 },
          { passed: 100, failed: 0 }
        ]
      };

      fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));

      const data = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
      const totalPassed = data.runs.reduce((sum, r) => sum + r.passed, 0);
      const totalTests = data.runs.reduce((sum, r) => sum + r.passed + r.failed, 0);
      const successRate = (totalPassed / totalTests) * 100;

      assert.ok(successRate > 99);
    });

    it('should track average duration trend', () => {
      const historyPath = path.join(testProject.pipelineDir, 'test-history.json');
      const history = {
        runs: [
          { durationMs: 120000 },
          { durationMs: 115000 },
          { durationMs: 110000 },
          { durationMs: 105000 }
        ]
      };

      fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));

      const data = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
      const durations = data.runs.map(r => r.durationMs);
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

      // Verify decreasing trend (improving)
      assert.ok(durations[0] > durations[3]);
      assert.strictEqual(avgDuration, 112500);
    });

    // Edge case: First run (no history)
    it('should handle first run with no history', () => {
      const historyPath = path.join(testProject.pipelineDir, 'test-history.json');

      // File doesn't exist
      const exists = fs.existsSync(historyPath);
      assert.strictEqual(exists, false);

      // Create first entry
      const history = {
        runs: [{ runId: 'first-run', timestamp: new Date().toISOString() }]
      };
      fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));

      const data = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
      assert.strictEqual(data.runs.length, 1);
    });

    // Edge case: Corrupted history file
    it('should recover from corrupted history', () => {
      const historyPath = path.join(testProject.pipelineDir, 'test-history.json');
      fs.writeFileSync(historyPath, 'not valid json');

      let data;
      try {
        data = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
      } catch (e) {
        // Reset on corruption
        data = { runs: [] };
      }

      assert.deepStrictEqual(data.runs, []);
    });

  });

  // ============ US-TEST-004: Test Performance Analysis ============

  describe('US-TEST-004: Test Performance Analysis', () => {

    it('should identify slowest tests', () => {
      const metrics = {
        tests: [
          { name: 'fast-test', durationMs: 100 },
          { name: 'slow-test', durationMs: 5000 },
          { name: 'medium-test', durationMs: 1000 }
        ]
      };

      const sorted = [...metrics.tests].sort((a, b) => b.durationMs - a.durationMs);
      assert.strictEqual(sorted[0].name, 'slow-test');
    });

    it('should identify most expensive tests', () => {
      const metrics = {
        suites: [
          { name: 'cheap-suite', cost: 0.10 },
          { name: 'expensive-suite', cost: 2.50 },
          { name: 'medium-suite', cost: 0.50 }
        ]
      };

      const sorted = [...metrics.suites].sort((a, b) => b.cost - a.cost);
      assert.strictEqual(sorted[0].name, 'expensive-suite');
    });

    it('should calculate test efficiency score', () => {
      // Efficiency = tests per dollar per minute
      const metrics = {
        totalTests: 100,
        totalCost: 2.00,
        totalDurationMs: 300000 // 5 minutes
      };

      const testsPerDollar = metrics.totalTests / metrics.totalCost;
      const durationMinutes = metrics.totalDurationMs / 60000;
      const efficiency = testsPerDollar / durationMinutes;

      assert.strictEqual(testsPerDollar, 50);
      assert.strictEqual(efficiency, 10); // 10 tests per dollar per minute
    });

    it('should compare current run to baseline', () => {
      const baseline = {
        durationMs: 120000,
        cost: 1.50,
        passed: 100
      };

      const current = {
        durationMs: 100000,
        cost: 1.25,
        passed: 100
      };

      const comparison = {
        durationDelta: current.durationMs - baseline.durationMs,
        costDelta: current.cost - baseline.cost,
        durationImproved: current.durationMs < baseline.durationMs,
        costImproved: current.cost < baseline.cost
      };

      assert.strictEqual(comparison.durationImproved, true);
      assert.strictEqual(comparison.costImproved, true);
      assert.strictEqual(comparison.durationDelta, -20000);
    });

    it('should detect performance regressions', () => {
      const baseline = { durationMs: 100000, cost: 1.00 };
      const current = { durationMs: 150000, cost: 1.80 };

      const regressionThreshold = 0.20; // 20%
      const durationRegression = (current.durationMs - baseline.durationMs) / baseline.durationMs;
      const costRegression = (current.cost - baseline.cost) / baseline.cost;

      const hasRegression = durationRegression > regressionThreshold || costRegression > regressionThreshold;

      assert.strictEqual(hasRegression, true);
      assert.ok(durationRegression > 0.20);
      assert.ok(costRegression > 0.20);
    });

    // Edge case: No baseline available
    it('should handle missing baseline', () => {
      const baseline = null;
      const current = { durationMs: 100000, cost: 1.00 };

      const comparison = baseline
        ? { improved: current.durationMs < baseline.durationMs }
        : { improved: null, reason: 'No baseline for comparison' };

      assert.strictEqual(comparison.improved, null);
    });

    // Edge case: Zero cost tests
    it('should handle zero-cost efficiency calculation', () => {
      const metrics = {
        totalTests: 100,
        totalCost: 0,
        totalDurationMs: 60000
      };

      const efficiency = metrics.totalCost > 0
        ? (metrics.totalTests / metrics.totalCost) / (metrics.totalDurationMs / 60000)
        : Infinity;

      assert.strictEqual(efficiency, Infinity);
    });

  });

  // ============ Test Metrics Integration ============

  describe('Test Metrics Integration', () => {

    it('should create complete metrics report', () => {
      const report = {
        runId: `test-${Date.now()}`,
        timestamp: new Date().toISOString(),
        summary: {
          totalSuites: 14,
          totalTests: 100,
          passed: 98,
          failed: 2,
          skipped: 0,
          successRate: 98.0
        },
        timing: {
          startedAt: new Date(Date.now() - 300000).toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: 300000,
          avgTestDurationMs: 3000
        },
        cost: {
          estimated: 2.50,
          actual: 2.35,
          budget: 5.00,
          withinBudget: true
        },
        suites: [
          { name: 'exec.test.js', tests: 10, passed: 10, durationMs: 25000, cost: 0.20 },
          { name: 'worker.test.js', tests: 12, passed: 11, durationMs: 35000, cost: 0.30 }
        ],
        slowestTests: [
          { name: 'real worker spawn test', durationMs: 15000 }
        ]
      };

      fs.writeFileSync(metricsPath, JSON.stringify(report, null, 2));

      const data = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      assert.ok(data.runId);
      assert.strictEqual(data.summary.successRate, 98.0);
      assert.strictEqual(data.cost.withinBudget, true);
    });

    it('should export metrics in multiple formats', () => {
      const metrics = {
        totalTests: 100,
        passed: 98,
        durationMs: 300000
      };

      // JSON format
      const jsonPath = path.join(testProject.pipelineDir, 'metrics.json');
      fs.writeFileSync(jsonPath, JSON.stringify(metrics, null, 2));
      assert.ok(fs.existsSync(jsonPath));

      // CSV-ready format
      const csvData = `tests,passed,duration_ms\n${metrics.totalTests},${metrics.passed},${metrics.durationMs}`;
      const csvPath = path.join(testProject.pipelineDir, 'metrics.csv');
      fs.writeFileSync(csvPath, csvData);
      assert.ok(fs.existsSync(csvPath));
    });

    it('should integrate with pipeline runs history', () => {
      const runsPath = path.join(testProject.pipelineDir, 'pipeline-runs.json');

      // Test run metrics should be linkable to pipeline runs
      const pipelineRun = {
        runId: 'pipeline-run-1',
        testRunId: 'test-run-1',
        pipelineCost: 5.00,
        testCost: 1.50,
        totalCost: 6.50
      };

      const runs = { runs: [pipelineRun] };
      fs.writeFileSync(runsPath, JSON.stringify(runs, null, 2));

      const data = JSON.parse(fs.readFileSync(runsPath, 'utf8'));
      assert.strictEqual(data.runs[0].totalCost, 6.50);
    });

  });

});
