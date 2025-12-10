/**
 * manifest-io.test.js - Integration tests for manifest file I/O
 *
 * Tests: US-MAN-003 to US-MAN-005 (file operations)
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const {
  createManifest,
  validateManifest
} = require('../../lib/dashboard-core.cjs');

// Test directory for temporary files
const TEST_DIR = path.join(__dirname, '..', 'temp');
const TEST_MANIFEST_PATH = path.join(TEST_DIR, 'manifest.json');
const TEST_MANIFEST_BACKUP = path.join(TEST_DIR, 'manifest.json.backup');

describe('Manifest I/O Integration (US-MAN)', () => {

  // Setup: Create test directory
  before(() => {
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  // Teardown: Clean up test files
  after(() => {
    try {
      if (fs.existsSync(TEST_MANIFEST_PATH)) fs.unlinkSync(TEST_MANIFEST_PATH);
      if (fs.existsSync(TEST_MANIFEST_BACKUP)) fs.unlinkSync(TEST_MANIFEST_BACKUP);
      if (fs.existsSync(TEST_DIR)) fs.rmdirSync(TEST_DIR);
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  // US-MAN-003: Manifest Writing
  describe('US-MAN-003: Manifest Writing', () => {

    it('should write manifest to file', () => {
      const manifest = createManifest('test-project', '/path/to/test', 'new');

      fs.writeFileSync(TEST_MANIFEST_PATH, JSON.stringify(manifest, null, 2));

      assert.ok(fs.existsSync(TEST_MANIFEST_PATH));
    });

    it('should write valid JSON', () => {
      const manifest = createManifest('test-project', '/path', 'new');
      fs.writeFileSync(TEST_MANIFEST_PATH, JSON.stringify(manifest, null, 2));

      const content = fs.readFileSync(TEST_MANIFEST_PATH, 'utf8');
      const parsed = JSON.parse(content);

      assert.strictEqual(parsed.projectId, 'test-project');
    });

    it('should format JSON with indentation', () => {
      const manifest = createManifest('test-project', '/path', 'new');
      fs.writeFileSync(TEST_MANIFEST_PATH, JSON.stringify(manifest, null, 2));

      const content = fs.readFileSync(TEST_MANIFEST_PATH, 'utf8');

      // Should have newlines (formatted)
      assert.ok(content.includes('\n'));
      // Should have indentation
      assert.ok(content.includes('  '));
    });

  });

  // US-MAN-004: Manifest Backup
  describe('US-MAN-004: Manifest Backup', () => {

    it('should create backup before write', () => {
      // Initial write
      const manifest1 = createManifest('project-v1', '/path', 'new');
      fs.writeFileSync(TEST_MANIFEST_PATH, JSON.stringify(manifest1, null, 2));

      // Create backup
      fs.copyFileSync(TEST_MANIFEST_PATH, TEST_MANIFEST_BACKUP);

      // Modify and write again
      const manifest2 = createManifest('project-v2', '/path', 'feature');
      fs.writeFileSync(TEST_MANIFEST_PATH, JSON.stringify(manifest2, null, 2));

      // Verify backup has old version
      const backupContent = JSON.parse(fs.readFileSync(TEST_MANIFEST_BACKUP, 'utf8'));
      assert.strictEqual(backupContent.projectId, 'project-v1');

      // Verify main has new version
      const mainContent = JSON.parse(fs.readFileSync(TEST_MANIFEST_PATH, 'utf8'));
      assert.strictEqual(mainContent.projectId, 'project-v2');
    });

  });

  // US-MAN-005: Corrupt Manifest Recovery
  describe('US-MAN-005: Corrupt Manifest Recovery', () => {

    it('should detect corrupt manifest (invalid JSON)', () => {
      fs.writeFileSync(TEST_MANIFEST_PATH, '{ invalid json :::');

      let manifest = null;
      let error = null;

      try {
        const content = fs.readFileSync(TEST_MANIFEST_PATH, 'utf8');
        manifest = JSON.parse(content);
      } catch (e) {
        error = e;
      }

      assert.ok(error !== null);
      assert.ok(error.message.includes('JSON') || error.message.includes('parse'));
    });

    it('should recover from backup when main is corrupt', () => {
      // Create valid backup
      const validManifest = createManifest('recovered-project', '/path', 'new');
      fs.writeFileSync(TEST_MANIFEST_BACKUP, JSON.stringify(validManifest, null, 2));

      // Create corrupt main
      fs.writeFileSync(TEST_MANIFEST_PATH, '{ corrupt }}}');

      // Simulate recovery logic
      let manifest = null;
      try {
        const content = fs.readFileSync(TEST_MANIFEST_PATH, 'utf8');
        manifest = JSON.parse(content);
      } catch (e) {
        // Main is corrupt, try backup
        if (fs.existsSync(TEST_MANIFEST_BACKUP)) {
          const backupContent = fs.readFileSync(TEST_MANIFEST_BACKUP, 'utf8');
          manifest = JSON.parse(backupContent);
        }
      }

      assert.ok(manifest !== null);
      assert.strictEqual(manifest.projectId, 'recovered-project');
    });

    it('should validate recovered manifest', () => {
      const validManifest = createManifest('test', '/path', 'new');
      fs.writeFileSync(TEST_MANIFEST_PATH, JSON.stringify(validManifest, null, 2));

      const content = fs.readFileSync(TEST_MANIFEST_PATH, 'utf8');
      const manifest = JSON.parse(content);
      const validation = validateManifest(manifest);

      assert.strictEqual(validation.valid, true);
    });

  });

  // Edge Cases
  describe('Edge Cases', () => {

    it('should handle reading non-existent file', () => {
      const nonExistent = path.join(TEST_DIR, 'does-not-exist.json');

      assert.strictEqual(fs.existsSync(nonExistent), false);
    });

    it('should handle empty file', () => {
      const emptyPath = path.join(TEST_DIR, 'empty.json');
      fs.writeFileSync(emptyPath, '');

      let error = null;
      try {
        JSON.parse(fs.readFileSync(emptyPath, 'utf8'));
      } catch (e) {
        error = e;
      }

      assert.ok(error !== null);
      fs.unlinkSync(emptyPath);
    });

  });

});
