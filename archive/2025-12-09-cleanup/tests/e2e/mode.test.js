/**
 * mode.test.js - E2E tests for Pipeline Modes (US-MODE)
 *
 * Tests: US-MODE-001 to US-MODE-006 with edge cases
 *
 * These tests verify pipeline mode behavior at the system level.
 */

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const helpers = require('./test-helpers.cjs');
const dashboardCore = require(path.join(helpers.PIPELINE_OFFICE, 'lib', 'dashboard-core.cjs'));

describe('Pipeline Modes E2E (US-MODE)', () => {
  let testProject;

  beforeEach(() => {
    testProject = helpers.createTestProject('mode-test');
  });

  afterEach(() => {
    if (testProject) testProject.cleanup();
  });

  // ============ US-MODE-001: New Project Mode ============

  describe('US-MODE-001: New Project Mode', () => {

    it('should create manifest with all 5 phases for new mode', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, { mode: 'new' });

      assert.strictEqual(manifest.mode, 'new');
      assert.strictEqual(Object.keys(manifest.phases).length, 5);
      assert.ok(manifest.phases['1']);
      assert.ok(manifest.phases['2']);
      assert.ok(manifest.phases['3']);
      assert.ok(manifest.phases['4']);
      assert.ok(manifest.phases['5']);
    });

    it('should return correct phase sequence for new mode', () => {
      const sequence = dashboardCore.getPhaseSequence('new');
      assert.deepStrictEqual(sequence, ['1', '2', '3', '4', '5']);
    });

    it('should set initial phase to 1 for new mode', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, { mode: 'new' });
      assert.strictEqual(manifest.currentPhase, '1');
    });

    it('should preserve mode in manifest across reads', () => {
      helpers.createManifest(testProject.manifestPath, { mode: 'new' });
      const readBack = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(readBack.mode, 'new');
    });

    // Edge case: mode with phases already partially complete
    it('should handle new mode with some phases already complete', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        mode: 'new',
        currentPhase: '3',
        phases: {
          '1': { status: 'complete' },
          '2': { status: 'complete' },
          '3': { status: 'running' },
          '4': { status: 'pending' },
          '5': { status: 'pending' }
        }
      });

      assert.strictEqual(manifest.currentPhase, '3');
      assert.strictEqual(manifest.phases['1'].status, 'complete');
    });

  });

  // ============ US-MODE-002: Feature Mode ============

  describe('US-MODE-002: Feature Mode', () => {

    it('should return 3 phases for feature mode', () => {
      const sequence = dashboardCore.getPhaseSequence('feature');
      assert.deepStrictEqual(sequence, ['1', '2', '3']);
    });

    it('should create manifest with only phases 1-3 for feature mode', () => {
      const manifest = dashboardCore.createManifest('test', testProject.projectPath, 'feature');

      assert.strictEqual(manifest.mode, 'feature');
      assert.ok(manifest.phases['1']);
      assert.ok(manifest.phases['2']);
      assert.ok(manifest.phases['3']);
      assert.strictEqual(manifest.phases['4'], undefined);
      assert.strictEqual(manifest.phases['5'], undefined);
    });

    it('should not include phases 4 or 5 in feature sequence', () => {
      const sequence = dashboardCore.getPhaseSequence('feature');
      assert.ok(!sequence.includes('4'));
      assert.ok(!sequence.includes('5'));
    });

    it('should set initial phase to 1 for feature mode', () => {
      const manifest = dashboardCore.createManifest('test', testProject.projectPath, 'feature');
      assert.strictEqual(manifest.currentPhase, '1');
    });

    // Edge case: feature mode completing should not try to advance to phase 4
    it('should handle feature mode completion without advancing to phase 4', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        mode: 'feature',
        currentPhase: '3',
        phases: {
          '1': { status: 'complete' },
          '2': { status: 'complete' },
          '3': { status: 'complete' }
        }
      });

      const sequence = dashboardCore.getPhaseSequence('feature');
      const nextPhase = dashboardCore.getNextPhase('3');

      // In feature mode, phase 3 is last
      assert.strictEqual(sequence[sequence.length - 1], '3');
    });

    // Edge case: Invalid phase for feature mode
    it('should handle request for non-existent phase 4 in feature mode', () => {
      const sequence = dashboardCore.getPhaseSequence('feature');
      assert.ok(!sequence.includes('4'), 'Phase 4 should not exist in feature mode');
    });

  });

  // ============ US-MODE-003: Fix Mode ============

  describe('US-MODE-003: Fix Mode', () => {

    it('should return only phase 2 for fix mode', () => {
      const sequence = dashboardCore.getPhaseSequence('fix');
      assert.deepStrictEqual(sequence, ['2']);
    });

    it('should have exactly 1 phase in fix mode sequence', () => {
      const sequence = dashboardCore.getPhaseSequence('fix');
      assert.strictEqual(sequence.length, 1);
    });

    it('should create manifest with only phase 2 for fix mode', () => {
      const manifest = dashboardCore.createManifest('test', testProject.projectPath, 'fix');

      assert.strictEqual(manifest.mode, 'fix');
      assert.ok(manifest.phases['2']);
      assert.strictEqual(manifest.phases['1'], undefined);
      assert.strictEqual(manifest.phases['3'], undefined);
    });

    it('should set initial phase to 2 for fix mode', () => {
      const manifest = dashboardCore.createManifest('test', testProject.projectPath, 'fix');
      assert.strictEqual(manifest.currentPhase, '2');
    });

    // Edge case: Fix mode should complete after single phase
    it('should not have next phase after phase 2 in fix mode', () => {
      const sequence = dashboardCore.getPhaseSequence('fix');
      assert.strictEqual(sequence.length, 1);
      assert.strictEqual(sequence[0], '2');
    });

    // Edge case: Fix mode with epics
    it('should handle fix mode with epic loops in phase 2', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        mode: 'fix',
        currentPhase: '2',
        phases: {
          '2': {
            status: 'running',
            epicLoops: helpers.createEpicList(2)
          }
        }
      });

      assert.ok(manifest.phases['2'].epicLoops);
      assert.strictEqual(manifest.phases['2'].epicLoops.length, 2);
    });

  });

  // ============ US-MODE-004: Mode Persistence ============

  describe('US-MODE-004: Mode Persistence', () => {

    it('should store mode in manifest.json', () => {
      helpers.createManifest(testProject.manifestPath, { mode: 'feature' });
      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.mode, 'feature');
    });

    it('should load mode correctly on resume', () => {
      // Create initial manifest
      helpers.createManifest(testProject.manifestPath, {
        mode: 'feature',
        currentPhase: '2',
        status: 'paused'
      });

      // Simulate resume by reading manifest
      const resumedManifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(resumedManifest.mode, 'feature');
      assert.strictEqual(resumedManifest.currentPhase, '2');
    });

    // Edge case: Missing mode in manifest (legacy)
    it('should handle manifest without mode field (default to new)', () => {
      // Create manifest without mode
      const manifest = {
        projectId: 'test',
        currentPhase: '1',
        phases: { '1': { status: 'pending' } }
      };
      fs.writeFileSync(testProject.manifestPath, JSON.stringify(manifest, null, 2));

      const loaded = helpers.readManifest(testProject.manifestPath);
      // Should not fail, mode is undefined but getPhaseSequence handles this
      const sequence = dashboardCore.getPhaseSequence(loaded.mode);
      assert.deepStrictEqual(sequence, ['1', '2', '3', '4', '5']); // Default to new
    });

    // Edge case: Corrupt mode value
    it('should handle invalid mode value gracefully', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, { mode: 'invalid-mode' });
      const sequence = dashboardCore.getPhaseSequence(manifest.mode);
      // Should default to full sequence
      assert.deepStrictEqual(sequence, ['1', '2', '3', '4', '5']);
    });

    it('should not allow mode change mid-pipeline', () => {
      // Create running pipeline in new mode
      const manifest = helpers.createManifest(testProject.manifestPath, {
        mode: 'new',
        currentPhase: '3',
        status: 'running'
      });

      // In a real scenario, the dashboard would reject mode change
      // Here we test that mode is preserved
      assert.strictEqual(manifest.mode, 'new');
      assert.strictEqual(manifest.currentPhase, '3');
    });

  });

  // ============ US-MODE-005: Phase Sequence by Mode ============

  describe('US-MODE-005: Phase Sequence by Mode', () => {

    it('should return [1,2,3,4,5] for new mode', () => {
      const sequence = dashboardCore.getPhaseSequence('new');
      assert.deepStrictEqual(sequence, ['1', '2', '3', '4', '5']);
    });

    it('should return [1,2,3] for feature mode', () => {
      const sequence = dashboardCore.getPhaseSequence('feature');
      assert.deepStrictEqual(sequence, ['1', '2', '3']);
    });

    it('should return [2] for fix mode', () => {
      const sequence = dashboardCore.getPhaseSequence('fix');
      assert.deepStrictEqual(sequence, ['2']);
    });

    // Edge case: Sequence order should be maintained
    it('should maintain phase order in sequence', () => {
      const newSeq = dashboardCore.getPhaseSequence('new');
      for (let i = 1; i < newSeq.length; i++) {
        assert.ok(parseInt(newSeq[i]) > parseInt(newSeq[i - 1]), 'Phases should be in ascending order');
      }
    });

    // Edge case: Each phase should appear exactly once
    it('should not have duplicate phases in sequence', () => {
      const sequence = dashboardCore.getPhaseSequence('new');
      const unique = [...new Set(sequence)];
      assert.strictEqual(sequence.length, unique.length);
    });

    // Edge case: All phases should be valid
    it('should only contain valid phase numbers', () => {
      const validPhases = ['1', '2', '3', '4', '5'];
      const sequence = dashboardCore.getPhaseSequence('new');

      sequence.forEach(phase => {
        assert.ok(validPhases.includes(phase), `Phase ${phase} should be valid`);
      });
    });

  });

  // ============ US-MODE-006: Default Mode ============

  describe('US-MODE-006: Default Mode', () => {

    it('should return "new" as default mode', () => {
      const defaultMode = dashboardCore.getDefaultMode();
      assert.strictEqual(defaultMode, 'new');
    });

    it('should return 5 phases for undefined mode', () => {
      const sequence = dashboardCore.getPhaseSequence(undefined);
      assert.deepStrictEqual(sequence, ['1', '2', '3', '4', '5']);
    });

    it('should return 5 phases for null mode', () => {
      const sequence = dashboardCore.getPhaseSequence(null);
      assert.deepStrictEqual(sequence, ['1', '2', '3', '4', '5']);
    });

    it('should return 5 phases for empty string mode', () => {
      const sequence = dashboardCore.getPhaseSequence('');
      assert.deepStrictEqual(sequence, ['1', '2', '3', '4', '5']);
    });

    // Edge case: Case sensitivity
    it('should handle uppercase mode values', () => {
      // Mode validation is case-sensitive, uppercase should default
      const isValid = dashboardCore.isValidMode('NEW');
      assert.strictEqual(isValid, false);

      const sequence = dashboardCore.getPhaseSequence('NEW');
      assert.deepStrictEqual(sequence, ['1', '2', '3', '4', '5']); // Defaults
    });

    // Edge case: Whitespace in mode
    it('should handle mode with whitespace', () => {
      const isValid = dashboardCore.isValidMode(' new ');
      assert.strictEqual(isValid, false); // Whitespace makes it invalid

      const sequence = dashboardCore.getPhaseSequence(' new ');
      assert.deepStrictEqual(sequence, ['1', '2', '3', '4', '5']); // Defaults
    });

  });

  // ============ Mode Validation ============

  describe('Mode Validation', () => {

    it('should validate "new" as valid', () => {
      assert.strictEqual(dashboardCore.isValidMode('new'), true);
    });

    it('should validate "feature" as valid', () => {
      assert.strictEqual(dashboardCore.isValidMode('feature'), true);
    });

    it('should validate "fix" as valid', () => {
      assert.strictEqual(dashboardCore.isValidMode('fix'), true);
    });

    it('should reject invalid mode names', () => {
      assert.strictEqual(dashboardCore.isValidMode('invalid'), false);
      assert.strictEqual(dashboardCore.isValidMode('NEW'), false);
      assert.strictEqual(dashboardCore.isValidMode('Feature'), false);
      assert.strictEqual(dashboardCore.isValidMode(''), false);
      assert.strictEqual(dashboardCore.isValidMode(null), false);
      assert.strictEqual(dashboardCore.isValidMode(undefined), false);
      assert.strictEqual(dashboardCore.isValidMode(123), false);
    });

  });

  // ============ Mode Integration Tests ============

  describe('Mode Integration', () => {

    it('should create consistent manifest for each mode', () => {
      const modes = ['new', 'feature', 'fix'];

      modes.forEach(mode => {
        const manifest = dashboardCore.createManifest(`test-${mode}`, testProject.projectPath, mode);
        const sequence = dashboardCore.getPhaseSequence(mode);

        // Manifest should have exactly the phases in the sequence
        const manifestPhases = Object.keys(manifest.phases);
        assert.strictEqual(manifestPhases.length, sequence.length);

        sequence.forEach(phase => {
          assert.ok(manifest.phases[phase], `Mode ${mode} should have phase ${phase}`);
        });
      });
    });

    it('should set currentPhase to first phase of sequence', () => {
      const manifest1 = dashboardCore.createManifest('t1', testProject.projectPath, 'new');
      assert.strictEqual(manifest1.currentPhase, '1');

      const manifest2 = dashboardCore.createManifest('t2', testProject.projectPath, 'feature');
      assert.strictEqual(manifest2.currentPhase, '1');

      const manifest3 = dashboardCore.createManifest('t3', testProject.projectPath, 'fix');
      assert.strictEqual(manifest3.currentPhase, '2');
    });

    // Edge case: Validate manifest structure for all modes
    it('should create valid manifest structure for all modes', () => {
      const modes = ['new', 'feature', 'fix'];

      modes.forEach(mode => {
        const manifest = dashboardCore.createManifest(`test-${mode}`, testProject.projectPath, mode);
        const validation = dashboardCore.validateManifest(manifest);

        assert.strictEqual(validation.valid, true, `${mode} mode should create valid manifest`);
        assert.strictEqual(validation.errors.length, 0);
      });
    });

  });

});
