/**
 * phase.test.js - Unit tests for phase functions
 *
 * Tests: US-EXEC-002, US-EXEC-008 related phase functions
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  PHASE_ORDER,
  PHASE_NAMES,
  PHASE_TIMEOUTS,
  getNextPhase,
  getPhaseName,
  isValidPhase,
  getPhaseTimeout,
  formatTime
} = require('../../lib/dashboard-core.cjs');

describe('Phase Functions (US-EXEC)', () => {

  // US-EXEC: Phase Constants
  describe('Phase Constants', () => {

    it('should have 5 phases in order', () => {
      assert.deepStrictEqual(PHASE_ORDER, ['1', '2', '3', '4', '5']);
    });

    it('should have names for all phases', () => {
      assert.strictEqual(PHASE_NAMES['1'], 'Brainstorm');
      assert.strictEqual(PHASE_NAMES['2'], 'Technical');
      assert.strictEqual(PHASE_NAMES['3'], 'Bootstrap');
      assert.strictEqual(PHASE_NAMES['4'], 'Implement');
      assert.strictEqual(PHASE_NAMES['5'], 'Finalize');
    });

    it('should have timeouts for all phases', () => {
      for (const phase of PHASE_ORDER) {
        assert.ok(PHASE_TIMEOUTS[phase] > 0, `Phase ${phase} should have timeout`);
      }
    });

  });

  // US-EXEC-002: Phase Timeouts
  describe('US-EXEC-002: Phase Timeouts', () => {

    it('should return correct timeout for each phase', () => {
      assert.strictEqual(getPhaseTimeout('1'), 60 * 60 * 1000);  // 60 min
      assert.strictEqual(getPhaseTimeout('2'), 15 * 60 * 1000);  // 15 min
      assert.strictEqual(getPhaseTimeout('3'), 45 * 60 * 1000);  // 45 min
      assert.strictEqual(getPhaseTimeout('4'), 90 * 60 * 1000);  // 90 min
      assert.strictEqual(getPhaseTimeout('5'), 30 * 60 * 1000);  // 30 min
    });

    it('should return default timeout for unknown phase', () => {
      const defaultTimeout = getPhaseTimeout('99');
      assert.strictEqual(defaultTimeout, 60 * 60 * 1000); // 1 hour default
    });

    it('Phase 4 should have longest timeout (complex implementation)', () => {
      const timeouts = PHASE_ORDER.map(p => getPhaseTimeout(p));
      const maxTimeout = Math.max(...timeouts);
      assert.strictEqual(getPhaseTimeout('4'), maxTimeout);
    });

  });

  // US-EXEC-008: Phase Navigation
  describe('US-EXEC-008: Phase Navigation', () => {

    it('should get next phase correctly', () => {
      assert.strictEqual(getNextPhase('1'), '2');
      assert.strictEqual(getNextPhase('2'), '3');
      assert.strictEqual(getNextPhase('3'), '4');
      assert.strictEqual(getNextPhase('4'), '5');
    });

    it('should return null for last phase', () => {
      assert.strictEqual(getNextPhase('5'), null);
    });

    it('should return null for invalid phase', () => {
      assert.strictEqual(getNextPhase('99'), null);
      assert.strictEqual(getNextPhase('invalid'), null);
    });

  });

  // Phase Names
  describe('Phase Names', () => {

    it('should return correct name for each phase', () => {
      assert.strictEqual(getPhaseName('1'), 'Brainstorm');
      assert.strictEqual(getPhaseName('2'), 'Technical');
      assert.strictEqual(getPhaseName('3'), 'Bootstrap');
      assert.strictEqual(getPhaseName('4'), 'Implement');
      assert.strictEqual(getPhaseName('5'), 'Finalize');
    });

    it('should return "Unknown" for invalid phase', () => {
      assert.strictEqual(getPhaseName('99'), 'Unknown');
      assert.strictEqual(getPhaseName(''), 'Unknown');
    });

  });

  // Phase Validation
  describe('Phase Validation', () => {

    it('should validate all 5 phases', () => {
      for (const phase of PHASE_ORDER) {
        assert.strictEqual(isValidPhase(phase), true, `Phase ${phase} should be valid`);
      }
    });

    it('should reject invalid phases', () => {
      assert.strictEqual(isValidPhase('0'), false);
      assert.strictEqual(isValidPhase('6'), false);
      assert.strictEqual(isValidPhase('invalid'), false);
      assert.strictEqual(isValidPhase(''), false);
      assert.strictEqual(isValidPhase(null), false);
    });

  });

  // Time Formatting
  describe('Time Formatting', () => {

    it('should format seconds correctly', () => {
      assert.strictEqual(formatTime(30000), '0m 30s');
    });

    it('should format minutes correctly', () => {
      assert.strictEqual(formatTime(120000), '2m 00s');
      assert.strictEqual(formatTime(150000), '2m 30s');
    });

    it('should handle hours', () => {
      assert.strictEqual(formatTime(3600000), '60m 00s');
      assert.strictEqual(formatTime(3660000), '61m 00s');
    });

    it('should handle zero', () => {
      assert.strictEqual(formatTime(0), '0m 00s');
    });

    it('should handle negative (treat as 0)', () => {
      assert.strictEqual(formatTime(-1000), '0m 00s');
    });

    it('should pad seconds with leading zero', () => {
      assert.strictEqual(formatTime(65000), '1m 05s');
    });

  });

});
