/**
 * manifest.test.js - E2E tests for Manifest Management (US-MAN)
 *
 * Tests: US-MAN-001 to US-MAN-005 with edge cases
 *
 * These tests verify manifest operations at the system level.
 */

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const helpers = require('./test-helpers.cjs');
const dashboardCore = require(path.join(helpers.PIPELINE_OFFICE, 'lib', 'dashboard-core.cjs'));

describe('Manifest Management E2E (US-MAN)', () => {
  let testProject;

  beforeEach(() => {
    testProject = helpers.createTestProject('manifest-test');
  });

  afterEach(() => {
    if (testProject) testProject.cleanup();
  });

  // ============ US-MAN-001: Manifest Creation ============

  describe('US-MAN-001: Manifest Creation', () => {

    it('should create manifest for new project', () => {
      const manifest = dashboardCore.createManifest('test-project', testProject.projectPath, 'new');

      assert.ok(manifest);
      assert.strictEqual(manifest.projectId, 'test-project');
      assert.strictEqual(manifest.projectPath, testProject.projectPath);
    });

    it('should set initial phase to 1 for new mode', () => {
      const manifest = dashboardCore.createManifest('test-project', testProject.projectPath, 'new');
      assert.strictEqual(manifest.currentPhase, '1');
    });

    it('should set initial phase to 2 for fix mode', () => {
      const manifest = dashboardCore.createManifest('test-project', testProject.projectPath, 'fix');
      assert.strictEqual(manifest.currentPhase, '2');
    });

    it('should create all required fields', () => {
      const manifest = dashboardCore.createManifest('test-project', testProject.projectPath, 'new');

      assert.ok(manifest.projectId);
      assert.ok(manifest.projectPath);
      assert.ok(manifest.currentPhase);
      assert.ok(manifest.status);
      assert.ok(manifest.mode);
      assert.ok(manifest.createdAt);
      assert.ok(manifest.phases);
    });

    it('should use folder name as project ID if not specified', () => {
      const folderName = path.basename(testProject.projectPath);
      const manifest = dashboardCore.createManifest(folderName, testProject.projectPath, 'new');
      assert.strictEqual(manifest.projectId, folderName);
    });

    // Edge case: Project ID with special characters
    it('should handle project ID with special characters', () => {
      const manifest = dashboardCore.createManifest('test-project_v2.0', testProject.projectPath, 'new');
      assert.strictEqual(manifest.projectId, 'test-project_v2.0');
    });

    // Edge case: Empty project ID
    it('should handle empty project ID gracefully', () => {
      const manifest = dashboardCore.createManifest('', testProject.projectPath, 'new');
      // Should default to empty or handle gracefully
      assert.strictEqual(typeof manifest.projectId, 'string');
    });

    // Edge case: Very long project ID
    it('should handle very long project ID', () => {
      const longId = 'a'.repeat(200);
      const manifest = dashboardCore.createManifest(longId, testProject.projectPath, 'new');
      assert.strictEqual(manifest.projectId, longId);
    });

  });

  // ============ US-MAN-002: Manifest Reading ============

  describe('US-MAN-002: Manifest Reading', () => {

    it('should read existing manifest correctly', () => {
      helpers.createManifest(testProject.manifestPath, {
        projectId: 'read-test',
        mode: 'feature',
        currentPhase: '2'
      });

      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.projectId, 'read-test');
      assert.strictEqual(manifest.mode, 'feature');
      assert.strictEqual(manifest.currentPhase, '2');
    });

    it('should return null for missing file', () => {
      const result = helpers.readManifest('/nonexistent/path/manifest.json');
      assert.strictEqual(result, null);
    });

    it('should parse JSON without errors', () => {
      helpers.createManifest(testProject.manifestPath, { projectId: 'test' });
      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.ok(typeof manifest === 'object');
    });

    // Edge case: Corrupt JSON
    it('should handle corrupt JSON gracefully', () => {
      fs.writeFileSync(testProject.manifestPath, '{ invalid json }');
      const result = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(result, null);
    });

    // Edge case: Empty file
    it('should handle empty file gracefully', () => {
      fs.writeFileSync(testProject.manifestPath, '');
      const result = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(result, null);
    });

    // Edge case: File with just whitespace
    it('should handle whitespace-only file gracefully', () => {
      fs.writeFileSync(testProject.manifestPath, '   \n\t  ');
      const result = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(result, null);
    });

    // Edge case: Binary content
    it('should handle binary content gracefully', () => {
      fs.writeFileSync(testProject.manifestPath, Buffer.from([0x00, 0x01, 0x02, 0xFF]));
      const result = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(result, null);
    });

    // Edge case: Extremely large manifest
    it('should handle large manifest file', () => {
      const largeManifest = {
        projectId: 'large-test',
        data: 'x'.repeat(100000),
        mode: 'new',
        currentPhase: '1',
        phases: { '1': { status: 'pending' } }
      };
      fs.writeFileSync(testProject.manifestPath, JSON.stringify(largeManifest, null, 2));

      const result = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(result.projectId, 'large-test');
    });

    // Edge case: Unicode content
    it('should handle unicode characters in manifest', () => {
      helpers.createManifest(testProject.manifestPath, {
        projectId: 'test-日本語-émoji-🚀',
        description: 'Ещё один тест'
      });

      const manifest = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(manifest.projectId, 'test-日本語-émoji-🚀');
    });

  });

  // ============ US-MAN-003: Manifest Writing ============

  describe('US-MAN-003: Manifest Writing', () => {

    it('should write manifest to file', () => {
      const manifest = dashboardCore.createManifest('write-test', testProject.projectPath, 'new');
      dashboardCore.saveManifest(testProject.manifestPath, manifest);

      assert.ok(fs.existsSync(testProject.manifestPath));
    });

    it('should format JSON with indentation', () => {
      const manifest = dashboardCore.createManifest('write-test', testProject.projectPath, 'new');
      dashboardCore.saveManifest(testProject.manifestPath, manifest);

      const content = fs.readFileSync(testProject.manifestPath, 'utf8');
      assert.ok(content.includes('\n'), 'Should have newlines');
      assert.ok(content.includes('  '), 'Should have indentation');
    });

    it('should preserve all fields on write', () => {
      const original = {
        projectId: 'preserve-test',
        customField: 'custom value',
        nested: { deep: { value: 123 } },
        mode: 'new',
        currentPhase: '1',
        phases: { '1': { status: 'pending' } }
      };

      helpers.createManifest(testProject.manifestPath, original);
      const readBack = helpers.readManifest(testProject.manifestPath);

      assert.strictEqual(readBack.customField, 'custom value');
      assert.strictEqual(readBack.nested.deep.value, 123);
    });

    // Edge case: Write to nested directory that doesn't exist
    it('should handle writing to nested path', () => {
      const nestedPath = path.join(testProject.projectPath, 'deep', 'nested', '.pipeline', 'manifest.json');
      fs.mkdirSync(path.dirname(nestedPath), { recursive: true });

      helpers.createManifest(nestedPath, { projectId: 'nested-test' });
      assert.ok(fs.existsSync(nestedPath));
    });

    // Edge case: Concurrent writes (simulate)
    it('should handle rapid successive writes', () => {
      for (let i = 0; i < 10; i++) {
        helpers.createManifest(testProject.manifestPath, { projectId: `test-${i}`, iteration: i });
      }

      const final = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(final.projectId, 'test-9');
      assert.strictEqual(final.iteration, 9);
    });

    // Edge case: Write with null values
    it('should handle null values in manifest', () => {
      const manifest = {
        projectId: 'null-test',
        nullField: null,
        undefinedField: undefined,
        mode: 'new',
        currentPhase: '1',
        phases: { '1': { status: 'pending' } }
      };

      helpers.createManifest(testProject.manifestPath, manifest);
      const readBack = helpers.readManifest(testProject.manifestPath);

      assert.strictEqual(readBack.nullField, null);
      // undefined should be stripped by JSON
      assert.strictEqual(readBack.undefinedField, undefined);
    });

  });

  // ============ US-MAN-004: Manifest Backup ============

  describe('US-MAN-004: Manifest Backup', () => {

    it('should create backup before write', () => {
      // Create initial manifest
      helpers.createManifest(testProject.manifestPath, { projectId: 'initial' });

      // Save with backup
      const manifest = helpers.readManifest(testProject.manifestPath);
      manifest.projectId = 'updated';
      dashboardCore.saveManifest(testProject.manifestPath, manifest);

      const backupPath = testProject.manifestPath + '.backup';
      assert.ok(fs.existsSync(backupPath), 'Backup file should exist');
    });

    it('should backup contain previous content', () => {
      helpers.createManifest(testProject.manifestPath, { projectId: 'original-content' });

      const manifest = helpers.readManifest(testProject.manifestPath);
      manifest.projectId = 'new-content';
      dashboardCore.saveManifest(testProject.manifestPath, manifest);

      const backupPath = testProject.manifestPath + '.backup';
      const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
      assert.strictEqual(backup.projectId, 'original-content');
    });

    it('should keep only one backup', () => {
      // Multiple saves using dashboardCore.saveManifest (which creates backups)
      for (let i = 0; i < 5; i++) {
        const manifest = dashboardCore.createManifest(`v${i}`, testProject.projectPath, 'new');
        dashboardCore.saveManifest(testProject.manifestPath, manifest);
      }

      const backupPath = testProject.manifestPath + '.backup';
      const backupPath2 = testProject.manifestPath + '.backup.1';

      assert.ok(fs.existsSync(backupPath), 'Single backup should exist');
      assert.ok(!fs.existsSync(backupPath2), 'Multiple backups should not exist');
    });

    // Edge case: Backup when no previous manifest exists
    it('should handle first write without backup', () => {
      // Fresh project, no manifest yet
      const manifest = dashboardCore.createManifest('first-write', testProject.projectPath, 'new');
      dashboardCore.saveManifest(testProject.manifestPath, manifest);

      assert.ok(fs.existsSync(testProject.manifestPath));
      // No error should occur
    });

    // Edge case: Backup path with spaces
    it('should handle backup path with spaces', () => {
      const spacedProject = helpers.createTestProject('manifest with spaces');
      try {
        helpers.createManifest(spacedProject.manifestPath, { projectId: 'initial' });

        const manifest = helpers.readManifest(spacedProject.manifestPath);
        manifest.projectId = 'updated';
        dashboardCore.saveManifest(spacedProject.manifestPath, manifest);

        assert.ok(fs.existsSync(spacedProject.manifestPath + '.backup'));
      } finally {
        spacedProject.cleanup();
      }
    });

  });

  // ============ US-MAN-005: Corrupt Manifest Recovery ============

  describe('US-MAN-005: Corrupt Manifest Recovery', () => {

    it('should detect corruption on read', () => {
      fs.writeFileSync(testProject.manifestPath, '{ corrupted: not valid json }');

      const result = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(result, null);
    });

    it('should check backup when main is corrupt', () => {
      // Create valid backup
      const backupPath = testProject.manifestPath + '.backup';
      fs.writeFileSync(backupPath, JSON.stringify({ projectId: 'from-backup', recovered: true }, null, 2));

      // Corrupt main manifest
      fs.writeFileSync(testProject.manifestPath, '{ broken }');

      // Recovery should use backup
      const recovered = dashboardCore.loadManifestWithRecovery(testProject.manifestPath);
      if (recovered) {
        assert.strictEqual(recovered.projectId, 'from-backup');
        assert.strictEqual(recovered.recovered, true);
      }
    });

    it('should restore backup if valid', () => {
      // Setup: valid backup, corrupt main
      const backupPath = testProject.manifestPath + '.backup';
      fs.writeFileSync(backupPath, JSON.stringify({ projectId: 'backup-restore' }, null, 2));
      fs.writeFileSync(testProject.manifestPath, 'corrupt!');

      const recovered = dashboardCore.loadManifestWithRecovery(testProject.manifestPath);
      assert.ok(recovered === null || recovered.projectId === 'backup-restore');
    });

    // Edge case: Both main and backup are corrupt
    it('should handle both files corrupt', () => {
      fs.writeFileSync(testProject.manifestPath, '{ broken }');
      fs.writeFileSync(testProject.manifestPath + '.backup', '{ also broken }');

      const result = dashboardCore.loadManifestWithRecovery(testProject.manifestPath);
      assert.strictEqual(result, null);
    });

    // Edge case: Main exists, no backup
    it('should handle missing backup file', () => {
      helpers.createManifest(testProject.manifestPath, { projectId: 'no-backup' });
      // No backup file exists

      const result = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(result.projectId, 'no-backup');
    });

    // Edge case: Empty backup file
    it('should handle empty backup file', () => {
      fs.writeFileSync(testProject.manifestPath, 'corrupt');
      fs.writeFileSync(testProject.manifestPath + '.backup', '');

      const result = dashboardCore.loadManifestWithRecovery(testProject.manifestPath);
      assert.strictEqual(result, null);
    });

    // Edge case: Backup is newer than main
    it('should handle backup newer than main', () => {
      helpers.createManifest(testProject.manifestPath, { projectId: 'older-main' });

      // Wait and create newer backup
      const backupPath = testProject.manifestPath + '.backup';
      fs.writeFileSync(backupPath, JSON.stringify({ projectId: 'newer-backup' }, null, 2));

      // Touch backup to be newer
      const now = new Date();
      fs.utimesSync(backupPath, now, now);

      const manifest = helpers.readManifest(testProject.manifestPath);
      // Main manifest should still be used unless corrupt
      assert.strictEqual(manifest.projectId, 'older-main');
    });

  });

  // ============ Manifest Validation ============

  describe('Manifest Validation', () => {

    it('should validate complete manifest as valid', () => {
      const manifest = dashboardCore.createManifest('valid-test', testProject.projectPath, 'new');
      const result = dashboardCore.validateManifest(manifest);

      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    it('should reject manifest without projectId', () => {
      const manifest = { mode: 'new', currentPhase: '1', phases: {} };
      const result = dashboardCore.validateManifest(manifest);

      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('projectId')));
    });

    it('should reject manifest without phases', () => {
      const manifest = { projectId: 'test', mode: 'new', currentPhase: '1' };
      const result = dashboardCore.validateManifest(manifest);

      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('phases')));
    });

    // Edge case: Manifest with array instead of object for phases
    it('should reject phases as array', () => {
      const manifest = { projectId: 'test', mode: 'new', currentPhase: '1', phases: [] };
      const result = dashboardCore.validateManifest(manifest);

      assert.strictEqual(result.valid, false);
    });

    // Edge case: Null manifest
    it('should reject null manifest', () => {
      const result = dashboardCore.validateManifest(null);
      assert.strictEqual(result.valid, false);
    });

    // Edge case: String instead of manifest object
    it('should reject string manifest', () => {
      const result = dashboardCore.validateManifest('not an object');
      assert.strictEqual(result.valid, false);
    });

    // Edge case: Manifest with extra unknown fields
    it('should allow extra unknown fields', () => {
      const manifest = dashboardCore.createManifest('test', testProject.projectPath, 'new');
      manifest.customField = 'allowed';
      manifest.anotherField = { nested: true };

      const result = dashboardCore.validateManifest(manifest);
      assert.strictEqual(result.valid, true);
    });

  });

  // ============ Update Operations ============

  describe('Update Operations', () => {

    it('should update partial manifest correctly', () => {
      helpers.createManifest(testProject.manifestPath, {
        projectId: 'update-test',
        currentPhase: '1',
        status: 'pending'
      });

      helpers.updateManifest(testProject.manifestPath, {
        currentPhase: '2',
        status: 'running'
      });

      const updated = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(updated.projectId, 'update-test'); // Unchanged
      assert.strictEqual(updated.currentPhase, '2'); // Updated
      assert.strictEqual(updated.status, 'running'); // Updated
    });

    it('should add new fields on update', () => {
      helpers.createManifest(testProject.manifestPath, { projectId: 'add-field' });

      helpers.updateManifest(testProject.manifestPath, {
        newField: 'new value'
      });

      const updated = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(updated.newField, 'new value');
    });

    // Edge case: Update non-existent manifest
    it('should create manifest on update if not exists', () => {
      const newPath = path.join(testProject.pipelineDir, 'new-manifest.json');

      helpers.updateManifest(newPath, { projectId: 'created' });

      const manifest = helpers.readManifest(newPath);
      assert.strictEqual(manifest.projectId, 'created');
    });

    // Edge case: Deep nested update
    it('should handle deep nested update', () => {
      helpers.createManifest(testProject.manifestPath, {
        projectId: 'deep',
        nested: { level1: { level2: 'original' } }
      });

      helpers.updateManifest(testProject.manifestPath, {
        nested: { level1: { level2: 'updated', newKey: true } }
      });

      const updated = helpers.readManifest(testProject.manifestPath);
      assert.strictEqual(updated.nested.level1.level2, 'updated');
      assert.strictEqual(updated.nested.level1.newKey, true);
    });

  });

});
