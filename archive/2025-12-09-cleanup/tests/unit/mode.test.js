/**
 * mode.test.js - Unit tests for pipeline mode functions
 *
 * Tests: US-MODE-001 to US-MODE-006
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  getPhaseSequence,
  isValidMode,
  getDefaultMode
} = require('../../lib/dashboard-core.cjs');

describe('Pipeline Modes (US-MODE)', () => {

  // US-MODE-001: New Project Mode
  describe('US-MODE-001: New Mode', () => {
    it('should return all 5 phases for new mode', () => {
      const phases = getPhaseSequence('new');
      assert.deepStrictEqual(phases, ['1', '2', '3', '4', '5']);
    });

    it('should include phases 1-5 in order', () => {
      const phases = getPhaseSequence('new');
      assert.strictEqual(phases.length, 5);
      assert.strictEqual(phases[0], '1');
      assert.strictEqual(phases[4], '5');
    });
  });

  // US-MODE-002: Feature Mode
  describe('US-MODE-002: Feature Mode', () => {
    it('should return 3 phases for feature mode', () => {
      const phases = getPhaseSequence('feature');
      assert.deepStrictEqual(phases, ['1', '2', '3']);
    });

    it('should not include phases 4 or 5', () => {
      const phases = getPhaseSequence('feature');
      assert.ok(!phases.includes('4'));
      assert.ok(!phases.includes('5'));
    });
  });

  // US-MODE-003: Fix Mode
  describe('US-MODE-003: Fix Mode', () => {
    it('should return only phase 2 for fix mode', () => {
      const phases = getPhaseSequence('fix');
      assert.deepStrictEqual(phases, ['2']);
    });

    it('should have exactly 1 phase', () => {
      const phases = getPhaseSequence('fix');
      assert.strictEqual(phases.length, 1);
    });
  });

  // US-MODE-004: Mode Validation
  describe('US-MODE-004: Mode Validation', () => {
    it('should validate "new" as valid mode', () => {
      assert.strictEqual(isValidMode('new'), true);
    });

    it('should validate "feature" as valid mode', () => {
      assert.strictEqual(isValidMode('feature'), true);
    });

    it('should validate "fix" as valid mode', () => {
      assert.strictEqual(isValidMode('fix'), true);
    });

    it('should reject invalid modes', () => {
      assert.strictEqual(isValidMode('invalid'), false);
      assert.strictEqual(isValidMode(''), false);
      assert.strictEqual(isValidMode(null), false);
      assert.strictEqual(isValidMode(undefined), false);
    });
  });

  // US-MODE-005: Phase Sequence by Mode
  describe('US-MODE-005: Phase Sequence by Mode', () => {
    it('getPhaseSequence returns correct phases for each mode', () => {
      assert.deepStrictEqual(getPhaseSequence('new'), ['1', '2', '3', '4', '5']);
      assert.deepStrictEqual(getPhaseSequence('feature'), ['1', '2', '3']);
      assert.deepStrictEqual(getPhaseSequence('fix'), ['2']);
    });
  });

  // US-MODE-006: Default Mode
  describe('US-MODE-006: Default Mode', () => {
    it('should return "new" as default mode', () => {
      assert.strictEqual(getDefaultMode(), 'new');
    });

    it('should return 5 phases for unknown/undefined mode (defaults to new)', () => {
      const phases = getPhaseSequence('unknown');
      assert.deepStrictEqual(phases, ['1', '2', '3', '4', '5']);
    });

    it('should return 5 phases for undefined mode', () => {
      const phases = getPhaseSequence(undefined);
      assert.deepStrictEqual(phases, ['1', '2', '3', '4', '5']);
    });
  });

});
