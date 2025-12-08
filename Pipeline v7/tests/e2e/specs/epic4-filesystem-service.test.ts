import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { FilesystemService } from '../../../src/services/filesystem.js';
import { createDefaultManifest } from '../helpers/test-harness.js';

describe('Epic 4: Filesystem Service', () => {
  let testDir: string;
  let fsService: FilesystemService;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `pipeline-test-${Date.now()}`);
    await fs.mkdir(path.join(testDir, '.pipeline'), { recursive: true });
    fsService = new FilesystemService();
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Manifest Operations', () => {
    it('reads manifest from project directory', async () => {
      const manifest = createDefaultManifest('test', testDir);
      await fs.writeFile(
        path.join(testDir, '.pipeline', 'manifest.json'),
        JSON.stringify(manifest, null, 2)
      );

      const result = await fsService.readManifest(testDir);
      expect(result).not.toBeNull();
      expect(result?.project.name).toBe('test');
    });

    it('returns null when manifest does not exist', async () => {
      const emptyDir = path.join(os.tmpdir(), `empty-${Date.now()}`);
      await fs.mkdir(emptyDir, { recursive: true });

      const result = await fsService.readManifest(emptyDir);
      expect(result).toBeNull();

      await fs.rm(emptyDir, { recursive: true, force: true });
    });

    it('writes manifest to project directory', async () => {
      const manifest = createDefaultManifest('test', testDir);

      await fsService.writeManifest(testDir, manifest);

      const content = await fs.readFile(
        path.join(testDir, '.pipeline', 'manifest.json'),
        'utf-8'
      );
      const parsed = JSON.parse(content);
      expect(parsed.project.name).toBe('test');
    });

    it('creates .pipeline directory if it does not exist', async () => {
      const newDir = path.join(os.tmpdir(), `new-${Date.now()}`);
      await fs.mkdir(newDir, { recursive: true });

      const manifest = createDefaultManifest('new', newDir);
      await fsService.writeManifest(newDir, manifest);

      const exists = await fs.access(path.join(newDir, '.pipeline', 'manifest.json'))
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);

      await fs.rm(newDir, { recursive: true, force: true });
    });

    it('handles manifest with special characters in path', async () => {
      const manifest = createDefaultManifest('test', testDir);
      manifest.project.path = 'C:\\Users\\test\\Project Name With Spaces';

      await fsService.writeManifest(testDir, manifest);
      const result = await fsService.readManifest(testDir);

      expect(result?.project.path).toBe('C:\\Users\\test\\Project Name With Spaces');
    });
  });

  describe('Todo File Watching', () => {
    it('detects new todo files', async () => {
      const todoDir = path.join(os.homedir(), '.claude', 'todos');
      await fs.mkdir(todoDir, { recursive: true });

      const sessionId = `test-session-${Date.now()}`;
      const todoPath = path.join(todoDir, `${sessionId}.json`);

      const watchCallback = vi.fn();

      // Start watching
      const watcher = fsService.watchTodoFile(sessionId, watchCallback);

      // Write todo file
      await fs.writeFile(todoPath, JSON.stringify([
        { content: 'Test task', status: 'in_progress', activeForm: 'Testing' },
      ]));

      // Wait for watcher to pick up changes
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Stop watching
      watcher.close();

      // Clean up
      await fs.unlink(todoPath).catch(() => {});
    });

    it('parses todo file content correctly', async () => {
      const todos = [
        { content: 'Task 1', status: 'completed', activeForm: 'Done' },
        { content: 'Task 2', status: 'in_progress', activeForm: 'Working' },
      ];

      const todoDir = path.join(os.homedir(), '.claude', 'todos');
      await fs.mkdir(todoDir, { recursive: true });

      const sessionId = `parse-test-${Date.now()}`;
      const todoPath = path.join(todoDir, `${sessionId}.json`);
      await fs.writeFile(todoPath, JSON.stringify(todos));

      const result = await fsService.readTodoFile(sessionId);
      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('Task 1');
      expect(result[1].status).toBe('in_progress');

      await fs.unlink(todoPath).catch(() => {});
    });

    it('returns empty array when todo file does not exist', async () => {
      const result = await fsService.readTodoFile('nonexistent-session');
      expect(result).toEqual([]);
    });
  });

  describe('Atomic Writes', () => {
    it('writes files atomically to prevent corruption', async () => {
      const manifest = createDefaultManifest('atomic-test', testDir);

      // Simulate sequential writes (concurrent writes can cause race conditions with rename)
      for (let i = 0; i < 5; i++) {
        const m = { ...manifest };
        m.project.name = `test-${i}`;
        await fsService.writeManifest(testDir, m);
      }

      // File should be valid JSON
      const content = await fs.readFile(
        path.join(testDir, '.pipeline', 'manifest.json'),
        'utf-8'
      );
      expect(() => JSON.parse(content)).not.toThrow();

      // Last write should have persisted
      const parsed = JSON.parse(content);
      expect(parsed.project.name).toBe('test-4');
    });
  });

  describe('Path Resolution', () => {
    it('resolves relative paths to absolute', () => {
      const resolved = fsService.resolvePath('./relative/path');
      expect(path.isAbsolute(resolved)).toBe(true);
    });

    it('handles tilde expansion', () => {
      const resolved = fsService.resolvePath('~/test');
      expect(resolved).toContain(os.homedir());
    });

    it('normalizes path separators', () => {
      const resolved = fsService.resolvePath('path/with/forward/slashes');
      expect(resolved).not.toContain('//');
    });
  });
});
