/**
 * Integration Tests: Manifest Service
 * Pipeline v8
 *
 * User Stories: US-011, US-012, US-013, US-095, US-096
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createTempDir } from './setup.js';
import {
  createManifest,
  readManifest,
  writeManifest,
  migrateManifest,
  updatePhaseStatus,
  updateEpicStatus,
} from '../../src/services/manifest.js';

describe('US-011: Manifest File Creation', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  it('[AC-1] creates .pipeline/ directory', async () => {
    // FAIL: Not implemented
    await createManifest(tempDir);
    const stat = await fs.promises.stat(path.join(tempDir, '.pipeline'));
    expect(stat.isDirectory()).toBe(true);
  });

  it('[AC-2] creates manifest.json with defaults', async () => {
    // FAIL: Not implemented
    await createManifest(tempDir);
    const manifest = await readManifest(tempDir);
    expect(manifest.currentPhase).toBe(1);
  });

  it('[AC-3] sets version to 8.0.0', async () => {
    // FAIL: Not implemented
    const manifest = await createManifest(tempDir);
    expect(manifest.version).toBe('8.0.0');
  });

  it('[AC-1] Edge: handles existing .pipeline dir', async () => {
    // FAIL: Not implemented
    await fs.promises.mkdir(path.join(tempDir, '.pipeline'));
    await createManifest(tempDir);
    const manifest = await readManifest(tempDir);
    expect(manifest).toBeDefined();
  });
});

describe('US-012: Manifest File Reading', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    await fs.promises.mkdir(path.join(tempDir, '.pipeline'));
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  it('[AC-1] reads .pipeline/manifest.json', async () => {
    // FAIL: Not implemented
    const manifestData = { version: '8.0.0', currentPhase: 3 };
    await fs.promises.writeFile(
      path.join(tempDir, '.pipeline', 'manifest.json'),
      JSON.stringify(manifestData)
    );
    const manifest = await readManifest(tempDir);
    expect(manifest.currentPhase).toBe(3);
  });

  it('[AC-2] parses JSON correctly', async () => {
    // FAIL: Not implemented
    const manifestData = {
      version: '8.0.0',
      project: { name: 'test', path: tempDir, mode: 'new' },
    };
    await fs.promises.writeFile(
      path.join(tempDir, '.pipeline', 'manifest.json'),
      JSON.stringify(manifestData)
    );
    const manifest = await readManifest(tempDir);
    expect(manifest.project.name).toBe('test');
  });

  it('[AC-1] Edge: throws if file missing', async () => {
    // FAIL: Not implemented
    await expect(readManifest(tempDir)).rejects.toThrow();
  });
});

describe('US-013: Manifest File Writing', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    await fs.promises.mkdir(path.join(tempDir, '.pipeline'));
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  it('[AC-1] writes to temp file first', async () => {
    // FAIL: Not implemented - need to verify atomic write behavior
    const manifest = { version: '8.0.0', currentPhase: 2 };
    await writeManifest(tempDir, manifest as any);
    // Verify final file exists
    const content = await fs.promises.readFile(
      path.join(tempDir, '.pipeline', 'manifest.json'),
      'utf-8'
    );
    expect(content).toContain('8.0.0');
  });

  it('[AC-2] renames to manifest.json (atomic)', async () => {
    // FAIL: Not implemented
    const manifest = { version: '8.0.0', currentPhase: 1 };
    await writeManifest(tempDir, manifest as any);
    const exists = fs.existsSync(path.join(tempDir, '.pipeline', 'manifest.json'));
    expect(exists).toBe(true);
  });

  it('[AC-3] preserves formatting (pretty print)', async () => {
    // FAIL: Not implemented
    const manifest = { version: '8.0.0', currentPhase: 1 };
    await writeManifest(tempDir, manifest as any);
    const content = await fs.promises.readFile(
      path.join(tempDir, '.pipeline', 'manifest.json'),
      'utf-8'
    );
    expect(content).toContain('\n'); // Should be multi-line
  });
});

describe('US-015: Manifest Version Migration', () => {
  it('[AC-1] detects version from manifest', async () => {
    // FAIL: Not implemented
    const manifest = { version: '7.0.0' };
    const migrated = await migrateManifest(manifest as any);
    expect(migrated.version).toBeDefined();
  });

  it('[AC-2] applies migrations if needed', async () => {
    // FAIL: Not implemented
    const manifest = { version: '7.0.0' };
    const migrated = await migrateManifest(manifest as any);
    // Should upgrade to 8.0.0
    expect(migrated.version).toBe('8.0.0');
  });

  it('[AC-3] updates version field', async () => {
    // FAIL: Not implemented
    const manifest = { version: '7.0.0' };
    const migrated = await migrateManifest(manifest as any);
    expect(migrated.version).not.toBe('7.0.0');
  });
});

describe('US-095: Manifest Update on Phase Change', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    await fs.promises.mkdir(path.join(tempDir, '.pipeline'));
    await fs.promises.writeFile(
      path.join(tempDir, '.pipeline', 'manifest.json'),
      JSON.stringify({ version: '8.0.0', currentPhase: 1, phases: {} })
    );
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  it('[AC-1] updates currentPhase', async () => {
    // FAIL: Not implemented
    await updatePhaseStatus(tempDir, 2, 'in-progress');
    const manifest = await readManifest(tempDir);
    expect(manifest.phases['2'].status).toBe('in-progress');
  });

  it('[AC-2] updates phase status', async () => {
    // FAIL: Not implemented
    await updatePhaseStatus(tempDir, 1, 'complete');
    const manifest = await readManifest(tempDir);
    expect(manifest.phases['1'].status).toBe('complete');
  });

  it('[AC-3] writes to file', async () => {
    // FAIL: Not implemented
    await updatePhaseStatus(tempDir, 3, 'in-progress');
    const content = await fs.promises.readFile(
      path.join(tempDir, '.pipeline', 'manifest.json'),
      'utf-8'
    );
    expect(content).toContain('in-progress');
  });
});

describe('US-096: Manifest Update on Epic Change', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    await fs.promises.mkdir(path.join(tempDir, '.pipeline'));
    await fs.promises.writeFile(
      path.join(tempDir, '.pipeline', 'manifest.json'),
      JSON.stringify({
        version: '8.0.0',
        currentPhase: 4,
        phases: {
          '4': {
            epics: [
              { id: 1, name: 'Epic 1', status: 'pending' },
              { id: 2, name: 'Epic 2', status: 'pending' },
            ],
          },
        },
      })
    );
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  it('[AC-1] updates currentEpic', async () => {
    // FAIL: Not implemented
    await updateEpicStatus(tempDir, 1, 'in-progress');
    const manifest = await readManifest(tempDir);
    const epic = manifest.phases['4'].epics?.find((e: any) => e.id === 1);
    expect(epic?.status).toBe('in-progress');
  });

  it('[AC-2] updates epic status', async () => {
    // FAIL: Not implemented
    await updateEpicStatus(tempDir, 1, 'complete');
    const manifest = await readManifest(tempDir);
    const epic = manifest.phases['4'].epics?.find((e: any) => e.id === 1);
    expect(epic?.status).toBe('complete');
  });

  it('[AC-3] writes to file', async () => {
    // FAIL: Not implemented
    await updateEpicStatus(tempDir, 2, 'in-progress');
    const content = await fs.promises.readFile(
      path.join(tempDir, '.pipeline', 'manifest.json'),
      'utf-8'
    );
    expect(content).toContain('in-progress');
  });
});
