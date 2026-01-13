/**
 * Manifest Library Tests
 *
 * Tests for schema, validation, read/write, and migrations.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const manifest = require('../index.cjs');

// Test fixtures
const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const validManifest = require('./fixtures/valid-manifest-v11.json');
const invalidManifest = require('./fixtures/invalid-missing-brainstorm.json');
const v10Manifest = require('./fixtures/v10-manifest.json');

describe('Manifest Schema', () => {
  test('SCHEMA_VERSION is 11.0.0', () => {
    expect(manifest.SCHEMA_VERSION).toBe('11.0.0');
  });

  test('VALID_STACKS contains expected values', () => {
    expect(manifest.VALID_STACKS).toContain('desktop');
    expect(manifest.VALID_STACKS).toContain('unity');
    expect(manifest.VALID_STACKS).toContain('android');
  });

  test('VALID_PHASES does NOT include "1"', () => {
    expect(manifest.VALID_PHASES).not.toContain('1');
    expect(manifest.VALID_PHASES).toContain('2');
    expect(manifest.VALID_PHASES).toContain('5');
  });

  test('createDefaultManifest creates valid structure', () => {
    const result = manifest.createDefaultManifest('/test/path', 'test-project', {
      stack: 'desktop',
      mode: 'new',
      userMode: 'dev'
    });

    expect(result.version).toBe('11.0.0');
    expect(result.project.name).toBe('test-project');
    expect(result.project.path).toBe('/test/path');
    expect(result.stack).toBe('desktop');
    expect(result.mode).toBe('new');
    expect(result.userMode).toBe('dev');
    expect(result.brainstorm.completed).toBe(false);
    expect(result.phases['2'].status).toBe('pending');
    expect(result.phases['1']).toBeUndefined(); // No phase 1 in v11
  });
});

describe('Manifest Validation', () => {
  test('validate() accepts valid manifest', () => {
    const result = manifest.validate(validManifest);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('validate() rejects null manifest', () => {
    const result = manifest.validate(null);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Manifest must be an object');
  });

  test('validate() rejects missing version', () => {
    const invalid = { ...validManifest };
    delete invalid.version;
    const result = manifest.validate(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('version'))).toBe(true);
  });

  test('validate() rejects invalid version format', () => {
    const invalid = { ...validManifest, version: '10.0.0' };
    const result = manifest.validate(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('11.x.x'))).toBe(true);
  });

  test('validate() rejects invalid stack', () => {
    const invalid = { ...validManifest, stack: 'invalid' };
    const result = manifest.validate(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('stack'))).toBe(true);
  });

  test('validate() rejects invalid status', () => {
    const invalid = { ...validManifest, status: 'unknown' };
    const result = manifest.validate(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('status'))).toBe(true);
  });

  test('validateBrainstormComplete() returns false for incomplete brainstorm', () => {
    const result = manifest.validateBrainstormComplete(invalidManifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('not completed'))).toBe(true);
  });

  test('validateBrainstormComplete() returns true for complete brainstorm', () => {
    const result = manifest.validateBrainstormComplete(validManifest);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('validatePhaseCanStart() blocks phase 2 without brainstorm', () => {
    const result = manifest.validatePhaseCanStart(invalidManifest, '2');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('brainstorm') || e.includes('Brainstorm'))).toBe(true);
  });

  test('validatePhaseCanStart() blocks phase 3 without phase 2 complete', () => {
    const incomplete = {
      ...validManifest,
      phases: {
        ...validManifest.phases,
        '2': { status: 'pending' }
      }
    };
    const result = manifest.validatePhaseCanStart(incomplete, '3');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Phase 2'))).toBe(true);
  });
});

describe('Manifest Read/Write', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'manifest-test-'));
  });

  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('create() creates a new manifest', () => {
    const result = manifest.create(tempDir, {
      name: 'test-project',
      stack: 'desktop',
      mode: 'new',
      userMode: 'dev'
    });

    expect(result.project.name).toBe('test-project');
    expect(manifest.exists(tempDir)).toBe(true);
  });

  test('read() reads existing manifest', () => {
    manifest.create(tempDir, { name: 'read-test' });
    const result = manifest.read(tempDir);

    expect(result.project.name).toBe('read-test');
    expect(result.version).toBe('11.0.0');
  });

  test('read() throws for non-existent manifest', () => {
    expect(() => manifest.read(tempDir)).toThrow('Manifest not found');
  });

  test('write() creates backup', () => {
    manifest.create(tempDir, { name: 'backup-test' });

    const updated = manifest.read(tempDir);
    updated.status = 'running';
    manifest.write(tempDir, updated);

    const backupPath = manifest.getBackupPath(tempDir);
    expect(fs.existsSync(backupPath)).toBe(true);
  });

  test('write() updates manifest', () => {
    manifest.create(tempDir, { name: 'update-test' });

    const updated = manifest.read(tempDir);
    updated.status = 'running';
    manifest.write(tempDir, updated);

    const result = manifest.read(tempDir);
    expect(result.status).toBe('running');
  });

  test('remove() deletes manifest and backup', () => {
    manifest.create(tempDir, { name: 'remove-test' });
    const m = manifest.read(tempDir);
    manifest.write(tempDir, m); // Create backup

    manifest.remove(tempDir);

    expect(manifest.exists(tempDir)).toBe(false);
    expect(fs.existsSync(manifest.getBackupPath(tempDir))).toBe(false);
  });
});

describe('Manifest Migrations', () => {
  test('needsMigration() returns true for v10', () => {
    expect(manifest.needsMigration(v10Manifest)).toBe(true);
  });

  test('needsMigration() returns false for v11', () => {
    expect(manifest.needsMigration(validManifest)).toBe(false);
  });

  test('migrate() converts v10 to v11', () => {
    const migrated = manifest.migrate(v10Manifest);

    expect(migrated.version).toBe('11.0.0');
    expect(migrated.phases['1']).toBeUndefined(); // Phase 1 removed
    expect(migrated.brainstorm.completed).toBe(true); // Converted from phase 1
    expect(migrated.brainstorm.epicCount).toBe(2);
    expect(migrated.brainstorm.storyCount).toBe(4);
  });

  test('migrate() handles status conversion', () => {
    const migrated = manifest.migrate(v10Manifest);

    // 'in-progress' -> 'running'
    expect(migrated.status).toBe('running');
    expect(migrated.phases['3'].status).toBe('running');
  });

  test('migrate() preserves completed phases', () => {
    const migrated = manifest.migrate(v10Manifest);

    expect(migrated.phases['2'].status).toBe('complete');
    expect(migrated.phases['2'].cost).toBe(0.75);
  });
});

describe('Manifest High-Level Operations', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'manifest-ops-test-'));
    manifest.create(tempDir, { name: 'ops-test' });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('completeBrainstorm() marks brainstorm complete', () => {
    const m = manifest.read(tempDir);
    manifest.completeBrainstorm(m, { epicCount: 3, storyCount: 10 });
    manifest.write(tempDir, m);

    const result = manifest.read(tempDir);
    expect(result.brainstorm.completed).toBe(true);
    expect(result.brainstorm.completedAt).toBeTruthy();
    expect(result.brainstorm.epicCount).toBe(3);
    expect(result.brainstorm.storyCount).toBe(10);
  });

  test('startPhase() fails without brainstorm', () => {
    const m = manifest.read(tempDir);

    expect(() => manifest.startPhase(m, '2')).toThrow('Brainstorm');
  });

  test('startPhase() works with complete brainstorm', () => {
    const m = manifest.read(tempDir);
    manifest.completeBrainstorm(m, { epicCount: 1, storyCount: 3 });
    manifest.startPhase(m, '2');

    expect(m.currentPhase).toBe('2');
    expect(m.status).toBe('running');
    expect(m.phases['2'].status).toBe('running');
    expect(m.phases['2'].startedAt).toBeTruthy();
  });

  test('completePhase() updates totals', () => {
    const m = manifest.read(tempDir);
    manifest.completeBrainstorm(m, { epicCount: 1, storyCount: 3 });
    manifest.startPhase(m, '2');
    manifest.completePhase(m, '2', { cost: 0.50, duration: 3600000 });

    expect(m.phases['2'].status).toBe('complete');
    expect(m.phases['2'].cost).toBe(0.50);
    expect(m.phases['2'].duration).toBe(3600000);
    expect(m.totalCost).toBe(0.50);
    expect(m.totalDuration).toBe(3600000);
  });

  test('completePhase() on phase 5 marks pipeline complete', () => {
    const m = manifest.read(tempDir);
    manifest.completeBrainstorm(m, { epicCount: 1, storyCount: 3 });

    // Complete all phases
    for (const phase of ['2', '3', '4', '5']) {
      manifest.startPhase(m, phase);
      manifest.completePhase(m, phase, { cost: 0.10, duration: 1000 });
    }

    expect(m.status).toBe('complete');
    expect(m.currentPhase).toBe(null);
  });

  test('failPhase() marks pipeline failed', () => {
    const m = manifest.read(tempDir);
    manifest.completeBrainstorm(m, { epicCount: 1, storyCount: 3 });
    manifest.startPhase(m, '2');
    manifest.failPhase(m, '2', 'Test failure');

    expect(m.phases['2'].status).toBe('failed');
    expect(m.phases['2'].failureReason).toBe('Test failure');
    expect(m.status).toBe('failed');
  });

  test('updateHeartbeat() sets lastSeen', () => {
    const m = manifest.read(tempDir);
    const before = m.heartbeat.lastSeen;

    manifest.updateHeartbeat(m);

    expect(m.heartbeat.lastSeen).toBeTruthy();
    expect(m.heartbeat.lastSeen).not.toBe(before);
  });

  test('updateWorker() sets worker info', () => {
    const m = manifest.read(tempDir);

    manifest.updateWorker(m, {
      type: 'current',
      data: { pid: 12345, phase: '2', startedAt: new Date().toISOString() }
    });

    expect(m.workers.current.pid).toBe(12345);
    expect(m.workers.current.phase).toBe('2');
  });

  test('updateWorker() clears worker info', () => {
    const m = manifest.read(tempDir);
    manifest.updateWorker(m, { type: 'current', data: { pid: 12345 } });
    manifest.updateWorker(m, { type: 'current', data: null });

    expect(m.workers.current).toBe(null);
  });
});
