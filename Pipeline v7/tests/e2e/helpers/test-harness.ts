import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { render, cleanup } from 'ink-testing-library';
import React from 'react';
import { MockClaude, createMockFixture } from './mock-claude.js';
import type { Manifest, Todo, Epic } from '../../../src/types/index.js';

export interface TestContext {
  projectPath: string;
  todoDir: string;
  mockClaude: MockClaude;
  manifest: Manifest;
  cleanup: () => Promise<void>;
}

/**
 * Create a test project directory with initial manifest
 */
export async function createTestProject(name = 'test-project'): Promise<TestContext> {
  const tempDir = path.join(os.tmpdir(), 'pipeline-v7-test', name);
  const pipelineDir = path.join(tempDir, '.pipeline');
  const todoDir = path.join(os.homedir(), '.claude', 'todos');

  // Create directories
  await fs.mkdir(pipelineDir, { recursive: true });
  await fs.mkdir(todoDir, { recursive: true });

  // Create default manifest
  const manifest = createDefaultManifest(name, tempDir);
  await fs.writeFile(
    path.join(pipelineDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  // Create mock Claude instance
  const mockClaude = new MockClaude(tempDir);
  mockClaude.setFixture(createMockFixture({}));

  return {
    projectPath: tempDir,
    todoDir,
    mockClaude,
    manifest,
    cleanup: async () => {
      await mockClaude.stop();
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    },
  };
}

/**
 * Create a default test manifest
 */
export function createDefaultManifest(name: string, projectPath: string): Manifest {
  return {
    version: '7.0.0',
    project: {
      name,
      path: projectPath,
      type: 'terminal',
      mode: 'new',
    },
    currentPhase: '1',
    phases: {
      '1': { status: 'pending', startedAt: null, completedAt: null },
      '2': { status: 'pending', startedAt: null, completedAt: null },
      '3': { status: 'pending', startedAt: null, completedAt: null },
      '4': { status: 'pending', startedAt: null, completedAt: null },
      '5': { status: 'pending', startedAt: null, completedAt: null },
    },
    epics: [],
    tests: {
      total: 0,
      passing: 0,
      failing: 0,
      coverage: 0,
    },
    cost: {
      total: 0,
      byPhase: {},
    },
    duration: {
      total: 0,
      byPhase: {},
    },
    worker: {
      sessionId: null,
      pid: null,
      status: 'idle',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Create a manifest with epics for testing
 */
export function createManifestWithEpics(
  name: string,
  projectPath: string,
  epicCount = 3
): Manifest {
  const manifest = createDefaultManifest(name, projectPath);
  manifest.epics = Array.from({ length: epicCount }, (_, i) => ({
    id: `epic-${i + 1}`,
    name: `Epic ${i + 1}`,
    status: 'pending' as const,
    testsTotal: 10,
    testsPass: 0,
    startedAt: null,
    completedAt: null,
  }));
  return manifest;
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`waitFor timed out after ${timeout}ms`);
}

/**
 * Create test todos
 */
export function createTestTodos(count = 3): Todo[] {
  return Array.from({ length: count }, (_, i) => ({
    content: `Task ${i + 1}`,
    status: i === 0 ? 'in_progress' as const : 'pending' as const,
    activeForm: `Working on task ${i + 1}`,
  }));
}

/**
 * Render helper for ink components
 */
export function renderComponent(component: React.ReactElement) {
  const result = render(component);

  return {
    ...result,
    getOutput: () => result.lastFrame() || '',
    hasText: (text: string | RegExp) => {
      const output = result.lastFrame() || '';
      if (typeof text === 'string') {
        return output.includes(text);
      }
      return text.test(output);
    },
    waitForText: async (text: string | RegExp, timeout = 5000) => {
      await waitFor(() => {
        const output = result.lastFrame() || '';
        if (typeof text === 'string') {
          return output.includes(text);
        }
        return text.test(output);
      }, { timeout });
    },
  };
}

/**
 * Keyboard key constants for testing
 */
export const KEYS = {
  UP: '\u001B[A',
  DOWN: '\u001B[B',
  LEFT: '\u001B[D',
  RIGHT: '\u001B[C',
  ENTER: '\r',
  SPACE: ' ',
  TAB: '\t',
  ESCAPE: '\u001B',
  BACKSPACE: '\u007F',
  DELETE: '\u001B[3~',
  HOME: '\u001B[H',
  END: '\u001B[F',
  CTRL_C: '\u0003',
  CTRL_D: '\u0004',
};

/**
 * Simulate key press
 */
export function pressKey(stdin: { write: (s: string) => void }, key: string): void {
  stdin.write(key);
}

/**
 * Type text character by character
 */
export function typeText(stdin: { write: (s: string) => void }, text: string): void {
  for (const char of text) {
    stdin.write(char);
  }
}

export { cleanup };
