/**
 * cost.test.js - Unit tests for cost tracking functions
 *
 * Tests: US-COST-001 to US-COST-006
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  formatCost,
  formatTokens,
  calculateCost,
  generateCcusageSessionId,
  checkBudget,
  PRICING
} = require('../../lib/dashboard-core.cjs');

describe('Cost Tracking (US-COST)', () => {

  // US-COST-001: Cost Calculation
  describe('US-COST-001: Cost Calculation', () => {
    it('should calculate cost correctly for input tokens', () => {
      const tokens = { input: 1000000, output: 0, cacheWrite: 0, cacheRead: 0 };
      const cost = calculateCost(tokens);
      assert.strictEqual(cost, PRICING.input); // $5.00 per 1M
    });

    it('should calculate cost correctly for output tokens', () => {
      const tokens = { input: 0, output: 1000000, cacheWrite: 0, cacheRead: 0 };
      const cost = calculateCost(tokens);
      assert.strictEqual(cost, PRICING.output); // $25.00 per 1M
    });

    it('should calculate cost correctly for cache write', () => {
      const tokens = { input: 0, output: 0, cacheWrite: 1000000, cacheRead: 0 };
      const cost = calculateCost(tokens);
      assert.strictEqual(cost, PRICING.cacheWrite); // $6.25 per 1M
    });

    it('should calculate cost correctly for cache read', () => {
      const tokens = { input: 0, output: 0, cacheWrite: 0, cacheRead: 1000000 };
      const cost = calculateCost(tokens);
      assert.strictEqual(cost, PRICING.cacheRead); // $0.50 per 1M
    });

    it('should calculate combined cost correctly', () => {
      const tokens = {
        input: 500000,    // 0.5M * $5 = $2.50
        output: 100000,   // 0.1M * $25 = $2.50
        cacheWrite: 200000, // 0.2M * $6.25 = $1.25
        cacheRead: 1000000  // 1M * $0.50 = $0.50
      };
      const cost = calculateCost(tokens);
      assert.strictEqual(cost, 2.5 + 2.5 + 1.25 + 0.5); // $6.75
    });

    it('should handle zero tokens', () => {
      const tokens = { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 };
      const cost = calculateCost(tokens);
      assert.strictEqual(cost, 0);
    });

    it('should handle missing properties', () => {
      const cost = calculateCost({});
      assert.strictEqual(cost, 0);
    });
  });

  // US-COST-002: Cost Formatting
  describe('US-COST-002: Cost Formatting', () => {
    it('should format cost with 3 decimal places', () => {
      assert.strictEqual(formatCost(1.234), '$1.234');
      assert.strictEqual(formatCost(0.5), '$0.500');
      assert.strictEqual(formatCost(10), '$10.000');
    });

    it('should handle zero cost', () => {
      assert.strictEqual(formatCost(0), '$0.000');
    });

    it('should handle string input', () => {
      assert.strictEqual(formatCost('1.5'), '$1.500');
    });

    it('should handle null/undefined', () => {
      assert.strictEqual(formatCost(null), '$0.000');
      assert.strictEqual(formatCost(undefined), '$0.000');
    });
  });

  // US-COST-003: Token Formatting
  describe('US-COST-003: Token Formatting', () => {
    it('should format millions with M suffix', () => {
      assert.strictEqual(formatTokens(1000000), '1.0M');
      assert.strictEqual(formatTokens(1500000), '1.5M');
      assert.strictEqual(formatTokens(10000000), '10.0M');
    });

    it('should format thousands with K suffix', () => {
      assert.strictEqual(formatTokens(1000), '1.0K');
      assert.strictEqual(formatTokens(1500), '1.5K');
      assert.strictEqual(formatTokens(999999), '1000.0K');
    });

    it('should format small numbers without suffix', () => {
      assert.strictEqual(formatTokens(0), '0');
      assert.strictEqual(formatTokens(100), '100');
      assert.strictEqual(formatTokens(999), '999');
    });
  });

  // US-COST-004: Budget Limit Check
  describe('US-COST-004: Budget Limit Check', () => {
    it('should return not exceeded when under budget', () => {
      const result = checkBudget(5, 10);
      assert.strictEqual(result.exceeded, false);
      assert.strictEqual(result.remaining, 5);
      assert.strictEqual(result.percentage, 50);
    });

    it('should return exceeded when at budget', () => {
      const result = checkBudget(10, 10);
      assert.strictEqual(result.exceeded, true);
      assert.strictEqual(result.remaining, 0);
      assert.strictEqual(result.percentage, 100);
    });

    it('should return exceeded when over budget', () => {
      const result = checkBudget(15, 10);
      assert.strictEqual(result.exceeded, true);
      assert.strictEqual(result.remaining, 0);
      assert.strictEqual(result.percentage, 150);
    });

    it('should handle null budget (no limit)', () => {
      const result = checkBudget(100, null);
      assert.strictEqual(result.exceeded, false);
      assert.strictEqual(result.remaining, null);
      assert.strictEqual(result.percentage, null);
    });
  });

  // US-COST-005: Session ID Generation
  describe('US-COST-005: ccusage Session ID', () => {
    it('should generate session ID from Unix path', () => {
      const id = generateCcusageSessionId('/home/user/project');
      assert.strictEqual(id, 'home-user-project');
    });

    it('should generate session ID from Windows path', () => {
      const id = generateCcusageSessionId('C:\\Users\\test\\project');
      assert.strictEqual(id, 'C--Users-test-project');
    });

    it('should handle paths with spaces', () => {
      const id = generateCcusageSessionId('C:\\Users\\test\\My Project');
      assert.strictEqual(id, 'C--Users-test-My-Project');
    });
  });

  // US-COST-006: Pricing Constants
  describe('US-COST-006: Pricing Constants', () => {
    it('should have correct Opus 4.5 pricing', () => {
      assert.strictEqual(PRICING.input, 5.00);
      assert.strictEqual(PRICING.output, 25.00);
      assert.strictEqual(PRICING.cacheWrite, 6.25);
      assert.strictEqual(PRICING.cacheRead, 0.50);
    });
  });

});
