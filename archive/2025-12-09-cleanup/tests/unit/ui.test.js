/**
 * ui.test.js - Unit tests for UI rendering functions
 *
 * Tests: US-DASH-003 progress bar rendering
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  renderProgressBar,
  generateSessionId
} = require('../../lib/dashboard-core.cjs');

describe('UI Functions (US-DASH)', () => {

  // US-DASH-003: Progress Bar
  describe('US-DASH-003: Progress Bar', () => {

    it('should render 0% progress', () => {
      const bar = renderProgressBar(0, 20);
      assert.strictEqual(bar, '....................');
      assert.strictEqual(bar.length, 20);
    });

    it('should render 100% progress', () => {
      const bar = renderProgressBar(100, 20);
      assert.strictEqual(bar, '####################');
      assert.strictEqual(bar.length, 20);
    });

    it('should render 50% progress', () => {
      const bar = renderProgressBar(50, 20);
      assert.strictEqual(bar, '##########..........');
      assert.strictEqual(bar.length, 20);
    });

    it('should render 25% progress', () => {
      const bar = renderProgressBar(25, 20);
      assert.strictEqual(bar, '#####...............');
      assert.strictEqual(bar.length, 20);
    });

    it('should use custom width', () => {
      const bar10 = renderProgressBar(50, 10);
      assert.strictEqual(bar10.length, 10);
      assert.strictEqual(bar10, '#####.....');

      const bar40 = renderProgressBar(50, 40);
      assert.strictEqual(bar40.length, 40);
    });

    it('should default to width 20', () => {
      const bar = renderProgressBar(50);
      assert.strictEqual(bar.length, 20);
    });

    it('should handle edge percentages', () => {
      // Just above 0%
      const bar1 = renderProgressBar(1, 20);
      assert.ok(bar1.includes('#') || bar1 === '....................'); // May round down

      // Just below 100%
      const bar99 = renderProgressBar(99, 20);
      assert.ok(bar99.includes('#'));
    });

  });

  // Session ID Generation
  describe('Session ID Generation', () => {

    it('should generate valid UUID format', () => {
      const sessionId = generateSessionId();
      // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
      assert.ok(uuidRegex.test(sessionId), `Session ID "${sessionId}" should match UUID format`);
    });

    it('should generate unique session IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateSessionId());
      }
      assert.strictEqual(ids.size, 100, 'All session IDs should be unique');
    });

    it('should generate different ID each call', () => {
      const id1 = generateSessionId();
      const id2 = generateSessionId();
      assert.notStrictEqual(id1, id2);
    });

  });

});
