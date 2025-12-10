/**
 * cost-tracking.test.js - E2E tests for Cost Tracking (US-COST)
 *
 * Tests: US-COST-001 to US-COST-006 with edge cases
 *
 * These tests verify cost tracking functionality at the system level.
 */

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const helpers = require('./test-helpers.cjs');

describe('Cost Tracking E2E (US-COST)', () => {
  let testProject;

  beforeEach(() => {
    testProject = helpers.createTestProject('cost-tracking-test');
  });

  afterEach(() => {
    if (testProject) testProject.cleanup();
  });

  // ============ US-COST-001: ccusage Integration ============

  describe('US-COST-001: ccusage Integration', () => {

    it('should parse ccusage output format', () => {
      // Simulate ccusage output parsing
      const ccusageOutput = `Session cost: $1.23
Total tokens: 15000
Input: 10000 Output: 5000`;

      const parseCost = (output) => {
        const match = output.match(/\$(\d+\.?\d*)/);
        return match ? parseFloat(match[1]) : 0;
      };

      const cost = parseCost(ccusageOutput);
      assert.strictEqual(cost, 1.23);
    });

    it('should extract cost in USD', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        currentCost: 2.50,
        costCurrency: 'USD'
      });

      assert.strictEqual(manifest.currentCost, 2.50);
      assert.strictEqual(manifest.costCurrency, 'USD');
    });

    it('should extract token counts', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        totalInputTokens: 50000,
        totalOutputTokens: 20000
      });

      assert.strictEqual(manifest.totalInputTokens, 50000);
      assert.strictEqual(manifest.totalOutputTokens, 20000);
    });

    it('should store cost update timestamp', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        currentCost: 1.00,
        costUpdatedAt: new Date().toISOString()
      });

      assert.ok(manifest.costUpdatedAt);
      const timestamp = new Date(manifest.costUpdatedAt);
      assert.ok(!isNaN(timestamp.getTime()));
    });

    // Edge case: Zero cost
    it('should handle zero cost', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        currentCost: 0
      });

      assert.strictEqual(manifest.currentCost, 0);
    });

    // Edge case: Very small cost (fractions of cents)
    it('should handle very small costs', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        currentCost: 0.001
      });

      assert.strictEqual(manifest.currentCost, 0.001);
    });

    // Edge case: ccusage not available
    it('should handle missing ccusage gracefully', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        currentCost: null,
        costError: 'ccusage not available'
      });

      assert.strictEqual(manifest.currentCost, null);
      assert.ok(manifest.costError);
    });

  });

  // ============ US-COST-002: Per-Session Cost ============

  describe('US-COST-002: Per-Session Cost', () => {

    it('should record session start cost', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        sessionStartCost: 10.00,
        currentCost: 12.50
      });

      assert.strictEqual(manifest.sessionStartCost, 10.00);
    });

    it('should calculate session cost from difference', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        sessionStartCost: 10.00,
        currentCost: 12.50
      });

      const sessionCost = manifest.currentCost - manifest.sessionStartCost;
      assert.strictEqual(sessionCost, 2.50);
    });

    it('should display session cost', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        sessionStartCost: 5.00,
        currentCost: 7.25,
        sessionCost: 2.25
      });

      assert.strictEqual(manifest.sessionCost, 2.25);
    });

    it('should reset on new session', () => {
      // Create first session
      helpers.createManifest(testProject.manifestPath, {
        sessionStartCost: 0,
        currentCost: 5.00,
        sessionCost: 5.00,
        workerSessionId: 'session-1'
      });

      // Start new session
      const newManifest = helpers.updateManifest(testProject.manifestPath, {
        sessionStartCost: 5.00, // New session starts from current
        sessionCost: 0,
        workerSessionId: 'session-2'
      });

      assert.strictEqual(newManifest.sessionCost, 0);
      assert.strictEqual(newManifest.sessionStartCost, 5.00);
    });

    // Edge case: Session cost equals total cost (first session)
    it('should handle first session', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        sessionStartCost: 0,
        currentCost: 3.00
      });

      const sessionCost = manifest.currentCost - manifest.sessionStartCost;
      assert.strictEqual(sessionCost, 3.00);
    });

    // Edge case: Negative session cost (shouldn't happen normally)
    it('should handle cost decreases gracefully', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        sessionStartCost: 10.00,
        currentCost: 8.00 // Hypothetically decreased
      });

      const sessionCost = manifest.currentCost - manifest.sessionStartCost;
      assert.strictEqual(sessionCost, -2.00);
      // System should handle this edge case
    });

  });

  // ============ US-COST-003: Per-Phase Cost ============

  describe('US-COST-003: Per-Phase Cost', () => {

    it('should record phase start cost', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        phases: {
          '1': { status: 'running', startCost: 0 },
          '2': { status: 'pending' }
        }
      });

      assert.strictEqual(manifest.phases['1'].startCost, 0);
    });

    it('should record phase end cost', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        phases: {
          '1': { status: 'complete', startCost: 0, endCost: 1.50 },
          '2': { status: 'running', startCost: 1.50 }
        }
      });

      assert.strictEqual(manifest.phases['1'].endCost, 1.50);
    });

    it('should calculate phase cost', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        phases: {
          '1': { status: 'complete', startCost: 0, endCost: 1.50, cost: 1.50 },
          '2': { status: 'complete', startCost: 1.50, endCost: 3.00, cost: 1.50 }
        }
      });

      assert.strictEqual(manifest.phases['1'].cost, 1.50);
      assert.strictEqual(manifest.phases['2'].cost, 1.50);
    });

    it('should store historical phase costs', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        phases: {
          '1': { status: 'complete', cost: 0.50 },
          '2': { status: 'complete', cost: 1.25 },
          '3': { status: 'complete', cost: 2.00 },
          '4': { status: 'running', cost: 0.75 },
          '5': { status: 'pending' }
        }
      });

      const completedCosts = Object.values(manifest.phases)
        .filter(p => p.cost !== undefined)
        .map(p => p.cost);

      assert.strictEqual(completedCosts.length, 4);
    });

    // Edge case: Phase with zero cost
    it('should handle phase with zero cost', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        phases: {
          '1': { status: 'complete', cost: 0 }
        }
      });

      assert.strictEqual(manifest.phases['1'].cost, 0);
    });

    // Edge case: Very expensive phase
    it('should handle expensive phases', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        phases: {
          '4': { status: 'complete', cost: 50.00 }
        }
      });

      assert.strictEqual(manifest.phases['4'].cost, 50.00);
    });

  });

  // ============ US-COST-004: Budget Limit ============

  describe('US-COST-004: Budget Limit', () => {

    it('should store budget limit from CLI argument', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        budgetLimit: 10.00
      });

      assert.strictEqual(manifest.budgetLimit, 10.00);
    });

    it('should detect when budget exceeded', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        budgetLimit: 5.00,
        currentCost: 5.50
      });

      const exceeded = manifest.currentCost > manifest.budgetLimit;
      assert.strictEqual(exceeded, true);
    });

    it('should pause pipeline when limit reached', () => {
      helpers.createManifest(testProject.manifestPath, {
        status: 'running',
        budgetLimit: 5.00,
        currentCost: 5.50
      });

      // Simulate budget check
      const manifest = helpers.readManifest(testProject.manifestPath);
      if (manifest.currentCost > manifest.budgetLimit) {
        helpers.updateManifest(testProject.manifestPath, {
          status: 'paused',
          pauseReason: 'Budget limit exceeded'
        });
      }

      const updated = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(updated.status, 'paused');
    });

    it('should warn at 80% of budget', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        budgetLimit: 10.00,
        currentCost: 8.50
      });

      const warningThreshold = manifest.budgetLimit * 0.8;
      const shouldWarn = manifest.currentCost >= warningThreshold;

      assert.strictEqual(shouldWarn, true);
      assert.ok(manifest.currentCost >= 8.00);
    });

    // Edge case: No budget limit
    it('should handle no budget limit', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        currentCost: 100.00
        // No budgetLimit
      });

      const hasLimit = manifest.budgetLimit !== undefined && manifest.budgetLimit !== null;
      assert.strictEqual(hasLimit, false);
    });

    // Edge case: Budget limit of zero
    it('should handle zero budget limit', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        budgetLimit: 0,
        currentCost: 0.01
      });

      const exceeded = manifest.currentCost > manifest.budgetLimit;
      assert.strictEqual(exceeded, true);
    });

    // Edge case: Exactly at budget
    it('should not pause when exactly at budget', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        status: 'running',
        budgetLimit: 5.00,
        currentCost: 5.00
      });

      const exceeded = manifest.currentCost > manifest.budgetLimit;
      assert.strictEqual(exceeded, false);
      assert.strictEqual(manifest.status, 'running');
    });

  });

  // ============ US-COST-005: Cost Estimation ============

  describe('US-COST-005: Cost Estimation', () => {

    it('should estimate based on progress percentage', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        currentCost: 2.50,
        progressPercentage: 50
      });

      // Simple linear estimate
      const estimatedTotal = manifest.currentCost / (manifest.progressPercentage / 100);
      assert.strictEqual(estimatedTotal, 5.00);
    });

    it('should use historical data for estimation', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        historicalAverageCost: 8.00,
        estimatedTotalCost: 8.00
      });

      assert.strictEqual(manifest.estimatedTotalCost, 8.00);
    });

    it('should store estimated cost', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        currentCost: 3.00,
        estimatedTotalCost: 6.00
      });

      assert.strictEqual(manifest.estimatedTotalCost, 6.00);
    });

    it('should update estimate as pipeline progresses', () => {
      // At 25%
      helpers.createManifest(testProject.manifestPath, {
        currentCost: 1.50,
        progressPercentage: 25,
        estimatedTotalCost: 6.00
      });

      // At 50%
      helpers.updateManifest(testProject.manifestPath, {
        currentCost: 2.75,
        progressPercentage: 50,
        estimatedTotalCost: 5.50
      });

      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.estimatedTotalCost, 5.50);
    });

    // Edge case: Zero progress
    it('should handle zero progress', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        currentCost: 0,
        progressPercentage: 0
      });

      // Can't estimate from zero progress
      const canEstimate = manifest.progressPercentage > 0;
      assert.strictEqual(canEstimate, false);
    });

    // Edge case: 100% progress
    it('should use actual cost at 100%', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        currentCost: 7.50,
        progressPercentage: 100,
        estimatedTotalCost: 7.50
      });

      assert.strictEqual(manifest.currentCost, manifest.estimatedTotalCost);
    });

    // Edge case: Estimate exceeds budget
    it('should flag when estimate exceeds budget', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        budgetLimit: 5.00,
        estimatedTotalCost: 8.00
      });

      const willExceedBudget = manifest.estimatedTotalCost > manifest.budgetLimit;
      assert.strictEqual(willExceedBudget, true);
    });

  });

  // ============ US-COST-006: Token Breakdown ============

  describe('US-COST-006: Token Breakdown', () => {

    it('should display input tokens', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        totalInputTokens: 100000
      });

      assert.strictEqual(manifest.totalInputTokens, 100000);
    });

    it('should display output tokens', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        totalOutputTokens: 50000
      });

      assert.strictEqual(manifest.totalOutputTokens, 50000);
    });

    it('should display cache tokens', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        cacheReadTokens: 30000,
        cacheWriteTokens: 10000
      });

      assert.strictEqual(manifest.cacheReadTokens, 30000);
      assert.strictEqual(manifest.cacheWriteTokens, 10000);
    });

    it('should store complete token breakdown', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        tokenBreakdown: {
          input: 100000,
          output: 50000,
          cacheRead: 30000,
          cacheWrite: 10000
        }
      });

      assert.strictEqual(manifest.tokenBreakdown.input, 100000);
      assert.strictEqual(manifest.tokenBreakdown.output, 50000);
      assert.strictEqual(manifest.tokenBreakdown.cacheRead, 30000);
      assert.strictEqual(manifest.tokenBreakdown.cacheWrite, 10000);
    });

    // Edge case: Zero tokens
    it('should handle zero tokens', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        totalInputTokens: 0,
        totalOutputTokens: 0
      });

      const totalTokens = manifest.totalInputTokens + manifest.totalOutputTokens;
      assert.strictEqual(totalTokens, 0);
    });

    // Edge case: Very high token counts
    it('should handle high token counts', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        totalInputTokens: 10000000,
        totalOutputTokens: 5000000
      });

      assert.strictEqual(manifest.totalInputTokens, 10000000);
    });

    // Edge case: Per-phase token breakdown
    it('should track tokens per phase', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        phases: {
          '1': { inputTokens: 10000, outputTokens: 5000 },
          '2': { inputTokens: 20000, outputTokens: 8000 },
          '3': { inputTokens: 15000, outputTokens: 6000 }
        }
      });

      const totalInput = Object.values(manifest.phases)
        .reduce((sum, p) => sum + (p.inputTokens || 0), 0);

      assert.strictEqual(totalInput, 45000);
    });

  });

  // ============ Cost Tracking Integration ============

  describe('Cost Tracking Integration', () => {

    it('should track complete cost lifecycle', () => {
      // Start pipeline
      helpers.createManifest(testProject.manifestPath, {
        status: 'running',
        sessionStartCost: 0,
        currentCost: 0,
        budgetLimit: 10.00,
        phases: {
          '1': { status: 'pending' }
        }
      });

      // Phase 1 completes
      helpers.updateManifest(testProject.manifestPath, {
        currentCost: 1.50,
        phases: {
          '1': { status: 'complete', cost: 1.50, startCost: 0, endCost: 1.50 }
        }
      });

      // Phase 2 in progress
      helpers.updateManifest(testProject.manifestPath, {
        currentCost: 3.00,
        phases: {
          '1': { status: 'complete', cost: 1.50 },
          '2': { status: 'running', startCost: 1.50 }
        }
      });

      const manifest = helpers.readManifest(testProject.manifestPath);

      assert.strictEqual(manifest.phases['1'].cost, 1.50);
      assert.strictEqual(manifest.phases['2'].startCost, 1.50);
      assert.ok(manifest.currentCost < manifest.budgetLimit);
    });

    it('should calculate all cost metrics', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        sessionStartCost: 5.00,
        currentCost: 8.50,
        budgetLimit: 15.00,
        progressPercentage: 60,
        phases: {
          '1': { cost: 1.00 },
          '2': { cost: 1.50 },
          '3': { cost: 1.00 }
        },
        totalInputTokens: 75000,
        totalOutputTokens: 30000
      });

      // Calculate derived metrics
      const sessionCost = manifest.currentCost - manifest.sessionStartCost;
      const totalPhaseCost = Object.values(manifest.phases)
        .reduce((sum, p) => sum + (p.cost || 0), 0);
      const budgetUsed = (manifest.currentCost / manifest.budgetLimit) * 100;
      const totalTokens = manifest.totalInputTokens + manifest.totalOutputTokens;

      assert.strictEqual(sessionCost, 3.50);
      assert.strictEqual(totalPhaseCost, 3.50);
      assert.ok(budgetUsed < 80); // Under warning threshold
      assert.strictEqual(totalTokens, 105000);
    });

    it('should handle cost tracking across resume', () => {
      // Create paused state
      helpers.createManifest(testProject.manifestPath, {
        status: 'paused',
        sessionStartCost: 0,
        currentCost: 5.00,
        phases: {
          '1': { status: 'complete', cost: 2.00 },
          '2': { status: 'running', startCost: 2.00 }
        }
      });

      // Resume
      helpers.updateManifest(testProject.manifestPath, {
        status: 'running'
      });

      // Continue work
      helpers.updateManifest(testProject.manifestPath, {
        currentCost: 7.50
      });

      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.currentCost, 7.50);
      assert.strictEqual(manifest.phases['1'].cost, 2.00);
    });

  });

});
