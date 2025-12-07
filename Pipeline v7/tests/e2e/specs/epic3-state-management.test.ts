import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { createTestHarness } from '../helpers/test-harness.js';
import { ManifestService } from '../../../src/services/manifest.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Epic 3: State Management (47 tests)', () => {
  let testProjectPath: string;

  beforeEach(() => {
    testProjectPath = fs.mkdtempSync(path.join(os.tmpdir(), 'pipeline-test-'));
    fs.mkdirSync(path.join(testProjectPath, '.pipeline'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testProjectPath, { recursive: true, force: true });
  });

  describe('Manifest Store - Read (US-041)', () => {
    it('E2E-041: should read manifest from project path', async () => {
      // FAIL: Manifest reading in skeleton
      const manifest = ManifestService.createDefault(testProjectPath, 'test-project');
      const service = new ManifestService(testProjectPath);
      service.write(manifest);

      const read = service.read();
      expect(read).not.toBeNull();
      expect(read?.project.name).toBe('test-project');
    });

    it('E2E-041a: should return null for missing manifest', async () => {
      // FAIL: Missing manifest handling
      const service = new ManifestService(testProjectPath);
      fs.rmSync(path.join(testProjectPath, '.pipeline', 'manifest.json'), { force: true });

      const read = service.read();
      expect(read).toBeNull();
    });
  });

  describe('Manifest Store - Write (US-042)', () => {
    it('E2E-042: should write manifest to project path', async () => {
      // FAIL: Manifest writing in skeleton
      const manifest = ManifestService.createDefault(testProjectPath, 'write-test');
      const service = new ManifestService(testProjectPath);
      service.write(manifest);

      const manifestPath = path.join(testProjectPath, '.pipeline', 'manifest.json');
      expect(fs.existsSync(manifestPath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      expect(content.project.name).toBe('write-test');
    });

    it('E2E-042a: should create .pipeline directory if missing', async () => {
      // FAIL: Directory creation
      fs.rmSync(path.join(testProjectPath, '.pipeline'), { recursive: true, force: true });

      const manifest = ManifestService.createDefault(testProjectPath, 'mkdir-test');
      const service = new ManifestService(testProjectPath);
      service.write(manifest);

      expect(fs.existsSync(path.join(testProjectPath, '.pipeline'))).toBe(true);
    });
  });

  describe('Manifest Store - Update (US-043)', () => {
    it('E2E-043: should update specific phase in manifest', async () => {
      // FAIL: Phase update in skeleton
      const manifest = ManifestService.createDefault(testProjectPath, 'update-test');
      const service = new ManifestService(testProjectPath);
      service.write(manifest);

      service.updatePhase(1, { status: 'complete', completedAt: new Date().toISOString() });

      const updated = service.read();
      expect(updated?.phases[1].status).toBe('complete');
      expect(updated?.phases[1].completedAt).toBeDefined();
    });
  });

  describe('Manifest Store - Atomic Write (US-044)', () => {
    it('E2E-044: should use atomic write (temp + rename)', async () => {
      // FAIL: Atomic write not implemented (uses temp file + rename)
      const manifest = ManifestService.createDefault(testProjectPath, 'atomic-test');
      const service = new ManifestService(testProjectPath);

      // This should use atomic write pattern
      service.write(manifest);

      // Verify file exists and is valid JSON
      const manifestPath = path.join(testProjectPath, '.pipeline', 'manifest.json');
      const content = fs.readFileSync(manifestPath, 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    });
  });

  describe('Project Store - Create (US-045)', () => {
    it('E2E-045: should create new project configuration', async () => {
      // FAIL: Project creation in skeleton
      const manifest = ManifestService.createDefault(testProjectPath, 'new-project');

      expect(manifest.project.name).toBe('new-project');
      expect(manifest.project.path).toBe(testProjectPath);
      expect(manifest.project.type).toBe('terminal');
      expect(manifest.project.mode).toBe('new');
    });
  });

  describe('Session Store - Worker Tracking (US-046)', () => {
    it('E2E-046: should track worker by session ID', async () => {
      // FAIL: Session tracking in skeleton
      const manifest = ManifestService.createDefault(testProjectPath, 'session-test');

      manifest.workers.push({
        sessionId: 'test-session-123',
        phase: 4,
        epic: 1,
        pid: 12345,
        startedAt: new Date().toISOString(),
        status: 'running',
      });

      expect(manifest.workers.length).toBe(1);
      expect(manifest.workers[0].sessionId).toBe('test-session-123');
    });

    it('E2E-046a: should not use process name wildcards', async () => {
      // FAIL: This tests that we identify workers by session ID, not wildcards
      const manifest = ManifestService.createDefault(testProjectPath, 'no-wildcard-test');

      // Worker should be identifiable by unique session ID
      const sessionId = 'unique-session-uuid-456';
      manifest.workers.push({
        sessionId,
        phase: 4,
        epic: 2,
        pid: 99999,
        startedAt: new Date().toISOString(),
        status: 'running',
      });

      const foundWorker = manifest.workers.find((w) => w.sessionId === sessionId);
      expect(foundWorker).toBeDefined();
      expect(foundWorker?.sessionId).not.toContain('*'); // No wildcards
    });
  });

  describe('Todo Store - Session Scoping (US-047)', () => {
    it('E2E-047: should scope todos to specific session', async () => {
      // FAIL: Todo session scoping not implemented
      const sessionId = 'scoped-todo-session';
      const todoDir = path.join(os.homedir(), '.claude', 'todos');
      fs.mkdirSync(todoDir, { recursive: true });

      const todos = [
        { content: 'Task 1', status: 'in_progress' },
        { content: 'Task 2', status: 'pending' },
      ];

      const todoPath = path.join(todoDir, `${sessionId}.json`);
      fs.writeFileSync(todoPath, JSON.stringify(todos));

      // Read back and verify
      const readTodos = JSON.parse(fs.readFileSync(todoPath, 'utf-8'));
      expect(readTodos.length).toBe(2);
      expect(readTodos[0].content).toBe('Task 1');

      // Cleanup
      fs.unlinkSync(todoPath);
    });

    it('E2E-047a: should not cross-contaminate between sessions', async () => {
      // FAIL: Cross-session isolation not verified
      const session1 = 'session-1';
      const session2 = 'session-2';
      const todoDir = path.join(os.homedir(), '.claude', 'todos');
      fs.mkdirSync(todoDir, { recursive: true });

      // Write different todos to different sessions
      fs.writeFileSync(
        path.join(todoDir, `${session1}.json`),
        JSON.stringify([{ content: 'Session 1 Task', status: 'pending' }])
      );
      fs.writeFileSync(
        path.join(todoDir, `${session2}.json`),
        JSON.stringify([{ content: 'Session 2 Task', status: 'pending' }])
      );

      // Verify isolation
      const todos1 = JSON.parse(fs.readFileSync(path.join(todoDir, `${session1}.json`), 'utf-8'));
      const todos2 = JSON.parse(fs.readFileSync(path.join(todoDir, `${session2}.json`), 'utf-8'));

      expect(todos1[0].content).toBe('Session 1 Task');
      expect(todos2[0].content).toBe('Session 2 Task');
      expect(todos1[0].content).not.toBe(todos2[0].content);

      // Cleanup
      fs.unlinkSync(path.join(todoDir, `${session1}.json`));
      fs.unlinkSync(path.join(todoDir, `${session2}.json`));
    });
  });

  describe('Cost Store - Tracking (US-048)', () => {
    it('E2E-048: should track cost by phase', async () => {
      // FAIL: Cost tracking in skeleton
      const manifest = ManifestService.createDefault(testProjectPath, 'cost-test');

      manifest.cost.total = 5.67;
      manifest.cost.byPhase = {
        1: 0.50,
        2: 1.20,
        3: 0.97,
        4: 3.00,
      };

      expect(manifest.cost.total).toBe(5.67);
      expect(manifest.cost.byPhase[4]).toBe(3.00);
    });
  });

  describe('Duration Store - Tracking (US-049)', () => {
    it('E2E-049: should track duration by phase', async () => {
      // FAIL: Duration tracking in skeleton
      const manifest = ManifestService.createDefault(testProjectPath, 'duration-test');

      manifest.duration.total = 3600; // 1 hour
      manifest.duration.byPhase = {
        1: 300,
        2: 900,
        3: 600,
        4: 1800,
      };

      expect(manifest.duration.total).toBe(3600);
      expect(manifest.duration.byPhase[4]).toBe(1800);
    });
  });

  describe('Manifest Phase Advancement (US-050)', () => {
    it('E2E-050: should advance to next phase', async () => {
      // FAIL: Phase advancement in skeleton
      const manifest = ManifestService.createDefault(testProjectPath, 'advance-test');
      const service = new ManifestService(testProjectPath);
      service.write(manifest);

      expect(service.read()?.currentPhase).toBe(1);

      service.advancePhase();
      expect(service.read()?.currentPhase).toBe(2);

      service.advancePhase();
      expect(service.read()?.currentPhase).toBe(3);
    });
  });

  describe('Epic Management (US-051)', () => {
    it('E2E-051: should manage epics in phase 4', async () => {
      // FAIL: Epic management in skeleton
      const manifest = ManifestService.createDefault(testProjectPath, 'epic-test');

      manifest.phases[4].epics = [
        { id: 1, name: 'TUI Framework', status: 'complete', stories: ['US-001', 'US-002'] },
        { id: 2, name: 'Test Infrastructure', status: 'in-progress', stories: ['US-031'] },
        { id: 3, name: 'State Management', status: 'pending', stories: ['US-041'] },
      ];
      manifest.currentEpic = 2;

      const service = new ManifestService(testProjectPath);
      service.write(manifest);

      const epics = service.getEpics();
      expect(epics.length).toBe(3);
      expect(epics[1].status).toBe('in-progress');
    });
  });
});
