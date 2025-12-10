/**
 * manifest.test.js - Unit tests for manifest management functions
 *
 * Tests: US-MAN-001 to US-MAN-005
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  createManifest,
  validateManifest,
  getPhaseSequence
} = require('../../lib/dashboard-core.cjs');

// Load fixture
const sampleManifest = require('../fixtures/sample-manifest.json');

describe('Manifest Management (US-MAN)', () => {

  // US-MAN-001: Manifest Creation
  describe('US-MAN-001: Manifest Creation', () => {
    it('should create manifest with correct project info', () => {
      const manifest = createManifest('my-project', '/path/to/project', 'new');
      assert.strictEqual(manifest.projectId, 'my-project');
      assert.strictEqual(manifest.projectPath, '/path/to/project');
      assert.strictEqual(manifest.mode, 'new');
    });

    it('should set initial status to running', () => {
      const manifest = createManifest('test', '/path', 'new');
      assert.strictEqual(manifest.status, 'running');
    });

    it('should set currentPhase to first phase of sequence', () => {
      const manifestNew = createManifest('test', '/path', 'new');
      assert.strictEqual(manifestNew.currentPhase, '1');

      const manifestFix = createManifest('test', '/path', 'fix');
      assert.strictEqual(manifestFix.currentPhase, '2');
    });

    it('should create phases based on mode', () => {
      const manifestNew = createManifest('test', '/path', 'new');
      assert.ok(manifestNew.phases['1']);
      assert.ok(manifestNew.phases['5']);

      const manifestFeature = createManifest('test', '/path', 'feature');
      assert.ok(manifestFeature.phases['1']);
      assert.ok(manifestFeature.phases['3']);
      assert.ok(!manifestFeature.phases['4']);
    });

    it('should set all phases to pending', () => {
      const manifest = createManifest('test', '/path', 'new');
      for (const phase of getPhaseSequence('new')) {
        assert.strictEqual(manifest.phases[phase].status, 'pending');
      }
    });

    it('should include createdAt timestamp', () => {
      const before = new Date().toISOString();
      const manifest = createManifest('test', '/path', 'new');
      const after = new Date().toISOString();

      assert.ok(manifest.createdAt >= before);
      assert.ok(manifest.createdAt <= after);
    });

    it('should default to new mode if not specified', () => {
      const manifest = createManifest('test', '/path');
      assert.strictEqual(manifest.mode, 'new');
    });
  });

  // US-MAN-002: Manifest Validation
  describe('US-MAN-002: Manifest Validation', () => {
    it('should validate correct manifest', () => {
      const result = validateManifest(sampleManifest);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    it('should reject null manifest', () => {
      const result = validateManifest(null);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.includes('Manifest is not an object'));
    });

    it('should reject non-object manifest', () => {
      const result = validateManifest('not an object');
      assert.strictEqual(result.valid, false);
    });

    it('should require projectId', () => {
      const manifest = { ...sampleManifest };
      delete manifest.projectId;
      const result = validateManifest(manifest);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.includes('Missing projectId'));
    });

    it('should require phases object', () => {
      const manifest = { ...sampleManifest };
      delete manifest.phases;
      const result = validateManifest(manifest);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.includes('Missing or invalid phases object'));
    });

    it('should require currentPhase', () => {
      const manifest = { ...sampleManifest };
      delete manifest.currentPhase;
      const result = validateManifest(manifest);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.includes('Missing currentPhase'));
    });

    it('should collect multiple errors', () => {
      const manifest = {};
      const result = validateManifest(manifest);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.length >= 2);
    });
  });

  // US-MAN-003: Sample Manifest Fixture
  describe('US-MAN-003: Fixture Structure', () => {
    it('should have correct phase structure', () => {
      assert.strictEqual(sampleManifest.phases['1'].status, 'complete');
      assert.strictEqual(sampleManifest.phases['2'].status, 'complete');
      assert.strictEqual(sampleManifest.phases['3'].status, 'running');
      assert.strictEqual(sampleManifest.phases['4'].status, 'pending');
    });

    it('should have phaseStats for completed phases', () => {
      assert.ok(sampleManifest.phaseStats['1']);
      assert.strictEqual(sampleManifest.phaseStats['1'].duration, 1800000);
      assert.strictEqual(sampleManifest.phaseStats['1'].cost, '0.500');
    });

    it('should have costBaseline', () => {
      assert.ok(sampleManifest.costBaseline);
      assert.strictEqual(sampleManifest.costBaseline.input, 10000);
    });

    it('should have epicLoops in phase 4', () => {
      const epics = sampleManifest.phases['4'].epicLoops;
      assert.ok(Array.isArray(epics));
      assert.strictEqual(epics.length, 2);
      assert.strictEqual(epics[0].name, 'Core Features');
    });
  });

  // US-MAN-004: Manifest with Different Modes
  describe('US-MAN-004: Mode-Specific Manifests', () => {
    it('should create valid manifest for each mode', () => {
      const modes = ['new', 'feature', 'fix'];

      for (const mode of modes) {
        const manifest = createManifest('test', '/path', mode);
        const result = validateManifest(manifest);
        assert.strictEqual(result.valid, true, `Manifest for ${mode} mode should be valid`);
      }
    });
  });

  // US-MAN-005: Edge Cases
  describe('US-MAN-005: Edge Cases', () => {
    it('should handle empty projectId', () => {
      const manifest = createManifest('', '/path', 'new');
      const result = validateManifest(manifest);
      assert.strictEqual(result.valid, false);
    });

    it('should handle phases as non-object', () => {
      const manifest = { projectId: 'test', currentPhase: '1', phases: [] };
      const result = validateManifest(manifest);
      assert.strictEqual(result.valid, false);
    });
  });

});
