#!/usr/bin/env node
/**
 * Regression test for atomic manifest writes
 * Tests that:
 * 1. Writes are atomic (temp file + rename)
 * 2. Backups are created before writes
 * 3. Recovery works when manifest is empty/corrupt
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const TEST_DIR = path.join(__dirname, '.test-manifest-atomic');
const MANIFEST_PATH = path.join(TEST_DIR, 'manifest.json');

// Simulated functions from dashboard (isolated for testing)
function recoverFromBackup(manifestPath) {
  const backupPath = manifestPath + '.backup';
  try {
    if (fs.existsSync(backupPath)) {
      const backupContent = fs.readFileSync(backupPath, 'utf8');
      if (backupContent && backupContent.trim().length > 0) {
        const manifest = JSON.parse(backupContent);
        console.log('[TEST] Successfully recovered from backup!');
        const tempPath = manifestPath + '.tmp';
        fs.writeFileSync(tempPath, backupContent);
        fs.renameSync(tempPath, manifestPath);
        return manifest;
      }
    }
  } catch (backupErr) {
    console.log('[TEST] Backup recovery failed: ' + backupErr.message);
  }
  return null;
}

function readManifest(manifestPath) {
  try {
    if (fs.existsSync(manifestPath)) {
      const content = fs.readFileSync(manifestPath, 'utf8');
      if (!content || content.trim().length === 0) {
        console.log('[TEST] Empty file detected, attempting recovery...');
        return recoverFromBackup(manifestPath);
      }
      return JSON.parse(content);
    }
  } catch (err) {
    console.log('[TEST] Corrupt file detected: ' + err.message);
    return recoverFromBackup(manifestPath);
  }
  return null;
}

function writeManifest(manifestPath, manifest) {
  try {
    // Create backup
    if (fs.existsSync(manifestPath)) {
      try {
        const currentContent = fs.readFileSync(manifestPath, 'utf8');
        if (currentContent.trim().length > 0) {
          JSON.parse(currentContent);
          fs.writeFileSync(manifestPath + '.backup', currentContent);
        }
      } catch (backupErr) {}
    }

    // Atomic write
    const tempPath = manifestPath + '.tmp';
    const content = JSON.stringify(manifest, null, 2);
    fs.writeFileSync(tempPath, content);
    fs.renameSync(tempPath, manifestPath);
    return true;
  } catch (err) {
    console.log('[TEST] Write error: ' + err.message);
    return false;
  }
}

// Setup and teardown
function setup() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true });
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

function teardown() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true });
  }
}

// Tests
function testAtomicWrite() {
  console.log('\n[TEST] Atomic write creates temp file then renames...');
  setup();

  const manifest = { version: '1.0', test: 'data' };
  const result = writeManifest(MANIFEST_PATH, manifest);

  assert.strictEqual(result, true, 'Write should succeed');
  assert.strictEqual(fs.existsSync(MANIFEST_PATH), true, 'Manifest should exist');
  assert.strictEqual(fs.existsSync(MANIFEST_PATH + '.tmp'), false, 'Temp file should be removed');

  const read = readManifest(MANIFEST_PATH);
  assert.deepStrictEqual(read, manifest, 'Read data should match written data');

  console.log('[TEST] PASS: Atomic write works');
  teardown();
}

function testBackupCreation() {
  console.log('\n[TEST] Backup is created before each write...');
  setup();

  const manifest1 = { version: '1.0', data: 'first' };
  writeManifest(MANIFEST_PATH, manifest1);

  const manifest2 = { version: '2.0', data: 'second' };
  writeManifest(MANIFEST_PATH, manifest2);

  assert.strictEqual(fs.existsSync(MANIFEST_PATH + '.backup'), true, 'Backup should exist');

  const backup = JSON.parse(fs.readFileSync(MANIFEST_PATH + '.backup', 'utf8'));
  assert.deepStrictEqual(backup, manifest1, 'Backup should contain previous version');

  console.log('[TEST] PASS: Backup created correctly');
  teardown();
}

function testRecoveryFromEmptyFile() {
  console.log('\n[TEST] Recovery from empty manifest file...');
  setup();

  // Write valid manifest first (creates backup on next write)
  const validManifest = { version: '1.0', recovered: true };
  writeManifest(MANIFEST_PATH, validManifest);

  // Write again to create backup
  const manifest2 = { version: '2.0' };
  writeManifest(MANIFEST_PATH, manifest2);

  // Simulate corruption: truncate main file to 0 bytes
  fs.writeFileSync(MANIFEST_PATH, '');

  // Read should recover from backup
  const recovered = readManifest(MANIFEST_PATH);
  assert.notStrictEqual(recovered, null, 'Should recover from backup');
  assert.strictEqual(recovered.version, '1.0', 'Should recover previous version');

  // Main file should be restored
  const mainContent = fs.readFileSync(MANIFEST_PATH, 'utf8');
  assert.strictEqual(mainContent.trim().length > 0, true, 'Main file should be restored');

  console.log('[TEST] PASS: Recovery from empty file works');
  teardown();
}

function testRecoveryFromCorruptFile() {
  console.log('\n[TEST] Recovery from corrupt JSON...');
  setup();

  const validManifest = { version: '1.0', test: 'valid' };
  writeManifest(MANIFEST_PATH, validManifest);
  writeManifest(MANIFEST_PATH, { version: '2.0' }); // Creates backup

  // Simulate corruption: write invalid JSON
  fs.writeFileSync(MANIFEST_PATH, '{ invalid json }}}');

  const recovered = readManifest(MANIFEST_PATH);
  assert.notStrictEqual(recovered, null, 'Should recover from backup');
  assert.strictEqual(recovered.version, '1.0', 'Should recover to valid version');

  console.log('[TEST] PASS: Recovery from corrupt JSON works');
  teardown();
}

function testNoBackupAvailable() {
  console.log('\n[TEST] Graceful handling when no backup available...');
  setup();

  // Write corrupt content with no backup
  fs.writeFileSync(MANIFEST_PATH, '');

  const result = readManifest(MANIFEST_PATH);
  assert.strictEqual(result, null, 'Should return null when no recovery possible');

  console.log('[TEST] PASS: Graceful null when no backup');
  teardown();
}

// Run all tests
console.log('=== Manifest Atomic Write Regression Tests ===');

try {
  testAtomicWrite();
  testBackupCreation();
  testRecoveryFromEmptyFile();
  testRecoveryFromCorruptFile();
  testNoBackupAvailable();

  console.log('\n=== ALL TESTS PASSED ===\n');
  process.exit(0);
} catch (err) {
  console.error('\n[FAIL]', err.message);
  console.error(err.stack);
  teardown();
  process.exit(1);
}
