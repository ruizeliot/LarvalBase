/**
 * cli.test.js - Unit tests for CLI argument parsing
 *
 * Tests: US-CLI-001 to US-CLI-002
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { parseCliArgs } = require('../../lib/dashboard-core.cjs');

describe('CLI Arguments (US-CLI)', () => {

  // US-CLI-001: Argument Parsing
  describe('US-CLI-001: Argument Parsing', () => {

    it('should parse --mode flag with value', () => {
      const result = parseCliArgs(['--mode', 'feature']);
      assert.strictEqual(result.mode, 'feature');
    });

    it('should parse --no-timeout flag', () => {
      const result = parseCliArgs(['--no-timeout']);
      assert.strictEqual(result.noTimeout, true);
    });

    it('should parse --verbose flag', () => {
      const result = parseCliArgs(['--verbose']);
      assert.strictEqual(result.verbose, true);
    });

    it('should parse -v shorthand for verbose', () => {
      const result = parseCliArgs(['-v']);
      assert.strictEqual(result.verbose, true);
    });

    it('should parse --budget with number value', () => {
      const result = parseCliArgs(['--budget', '10.5']);
      assert.strictEqual(result.budget, 10.5);
    });

    it('should ignore invalid budget value', () => {
      const result = parseCliArgs(['--budget', 'invalid']);
      assert.strictEqual(result.budget, null);
    });

    it('should ignore negative budget value', () => {
      const result = parseCliArgs(['--budget', '-5']);
      assert.strictEqual(result.budget, null);
    });

    it('should parse --max-restarts with number value', () => {
      const result = parseCliArgs(['--max-restarts', '5']);
      assert.strictEqual(result.maxRestarts, 5);
    });

    it('should allow --max-restarts 0', () => {
      const result = parseCliArgs(['--max-restarts', '0']);
      assert.strictEqual(result.maxRestarts, 0);
    });

    it('should parse --resume flag', () => {
      const result = parseCliArgs(['--resume']);
      assert.strictEqual(result.resume, true);
    });

    it('should parse --resume-session flag', () => {
      const result = parseCliArgs(['--resume-session']);
      assert.strictEqual(result.resumeSession, true);
    });

    it('should parse --phase with value', () => {
      const result = parseCliArgs(['--phase', '3']);
      assert.strictEqual(result.phase, '3');
    });

    it('should parse --help flag', () => {
      const result = parseCliArgs(['--help']);
      assert.strictEqual(result.help, true);
    });

    it('should parse -h shorthand for help', () => {
      const result = parseCliArgs(['-h']);
      assert.strictEqual(result.help, true);
    });

    it('should parse multiple flags together', () => {
      const result = parseCliArgs([
        '--mode', 'feature',
        '--no-timeout',
        '--verbose',
        '--budget', '20',
        '--max-restarts', '2'
      ]);

      assert.strictEqual(result.mode, 'feature');
      assert.strictEqual(result.noTimeout, true);
      assert.strictEqual(result.verbose, true);
      assert.strictEqual(result.budget, 20);
      assert.strictEqual(result.maxRestarts, 2);
    });

  });

  // US-CLI-002: Default Values
  describe('US-CLI-002: Default Values', () => {

    it('should have correct default values', () => {
      const result = parseCliArgs([]);

      assert.strictEqual(result.mode, 'new');
      assert.strictEqual(result.noTimeout, false);
      assert.strictEqual(result.verbose, false);
      assert.strictEqual(result.budget, null);
      assert.strictEqual(result.maxRestarts, 3);
      assert.strictEqual(result.resume, false);
      assert.strictEqual(result.resumeSession, false);
      assert.strictEqual(result.phase, null);
      assert.strictEqual(result.help, false);
    });

    it('should ignore unknown flags', () => {
      const result = parseCliArgs(['--unknown-flag', '--another']);
      // Should still have defaults
      assert.strictEqual(result.mode, 'new');
      assert.strictEqual(result.verbose, false);
    });

    it('should handle empty array', () => {
      const result = parseCliArgs([]);
      assert.ok(result);
      assert.strictEqual(typeof result, 'object');
    });

  });

  // US-CLI-003: Edge Cases
  describe('US-CLI-003: Edge Cases', () => {

    it('should handle flag without value at end of array', () => {
      const result = parseCliArgs(['--mode']);
      assert.strictEqual(result.mode, 'new'); // Keeps default since no value
    });

    it('should handle budget as integer', () => {
      const result = parseCliArgs(['--budget', '10']);
      assert.strictEqual(result.budget, 10);
    });

    it('should handle very large budget', () => {
      const result = parseCliArgs(['--budget', '999999']);
      assert.strictEqual(result.budget, 999999);
    });

    it('should handle flags in any order', () => {
      const result = parseCliArgs(['--verbose', '--mode', 'fix', '--no-timeout']);
      assert.strictEqual(result.verbose, true);
      assert.strictEqual(result.mode, 'fix');
      assert.strictEqual(result.noTimeout, true);
    });

  });

});
