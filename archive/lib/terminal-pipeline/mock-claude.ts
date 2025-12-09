/**
 * Mock Claude CLI for Terminal Pipeline E2E Tests
 *
 * This module provides utilities to mock the Claude CLI in E2E tests,
 * preventing real API calls while simulating realistic behavior.
 *
 * Usage in tests:
 * ```typescript
 * beforeEach(() => {
 *   process.env.USE_MOCK_CLAUDE = 'true';
 *   process.env.MOCK_CLAUDE_FIXTURE = 'path/to/fixture.json';
 * });
 * ```
 *
 * Usage in app code:
 * ```typescript
 * import { spawnClaude } from './services/claude';
 * const child = spawnClaude(['--print', 'Hello']);
 * ```
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// Path to the mock Claude binary (relative to project root)
const MOCK_CLAUDE_BIN = path.resolve(__dirname, '../bin/mock-claude.js');

/**
 * Options for spawning Claude CLI
 */
export interface SpawnClaudeOptions {
  /** Working directory for Claude process */
  cwd?: string;
  /** Environment variables to pass */
  env?: NodeJS.ProcessEnv;
  /** Whether to pipe stdio */
  stdio?: 'pipe' | 'inherit' | 'ignore';
}

/**
 * Spawn Claude CLI (real or mock based on environment)
 *
 * In mock mode (USE_MOCK_CLAUDE=true), spawns the mock binary
 * that reads from MOCK_CLAUDE_FIXTURE to simulate Claude output.
 *
 * @param args - Arguments to pass to Claude CLI
 * @param options - Spawn options
 * @returns ChildProcess for the Claude CLI
 */
export function spawnClaude(
  args: string[] = [],
  options: SpawnClaudeOptions = {}
): ChildProcess {
  const useMock = process.env.USE_MOCK_CLAUDE === 'true';

  if (useMock) {
    const fixture = process.env.MOCK_CLAUDE_FIXTURE;
    if (!fixture) {
      throw new Error('MOCK_CLAUDE_FIXTURE must be set when USE_MOCK_CLAUDE is true');
    }

    // Verify fixture exists
    if (!fs.existsSync(fixture)) {
      throw new Error(`Mock fixture not found: ${fixture}`);
    }

    return spawn('node', [MOCK_CLAUDE_BIN, fixture, ...args], {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: options.stdio || 'pipe',
    });
  }

  // Real Claude CLI
  return spawn('claude', args, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    stdio: options.stdio || 'pipe',
  });
}

/**
 * Mock fixture format for Claude CLI simulation
 */
export interface MockClaudeFixture {
  /** Array of output lines to emit (with timing) */
  output: MockOutputLine[];
  /** Final state after execution */
  finalState: {
    exitCode: number;
    /** Optional files to "create" (for testing file operations) */
    files?: Record<string, string>;
  };
  /** Optional: Delay between output lines in ms (default: 50) */
  lineDelay?: number;
}

/**
 * A single output line in a mock fixture
 */
export type MockOutputLine =
  | string  // Simple stdout line
  | { type: 'stdout' | 'stderr'; content: string; delay?: number }
  | { type: 'progress'; percent: number; message: string }
  | { type: 'todo'; action: 'add' | 'update' | 'complete'; content: string };

/**
 * Create a mock fixture programmatically
 *
 * @param config - Fixture configuration
 * @returns Fixture JSON string
 */
export function createMockFixture(config: {
  output: string[];
  exitCode?: number;
  progressUpdates?: { percent: number; message: string }[];
  todoUpdates?: { action: 'add' | 'update' | 'complete'; content: string }[];
}): MockClaudeFixture {
  const outputLines: MockOutputLine[] = [];

  // Interleave output with progress and todo updates
  let outputIndex = 0;
  let progressIndex = 0;
  let todoIndex = 0;

  const progress = config.progressUpdates || [];
  const todos = config.todoUpdates || [];

  for (const line of config.output) {
    outputLines.push(line);
    outputIndex++;

    // Add progress update every few lines
    if (progress.length > 0 && progressIndex < progress.length) {
      if (outputIndex % Math.ceil(config.output.length / progress.length) === 0) {
        outputLines.push({
          type: 'progress',
          ...progress[progressIndex]
        });
        progressIndex++;
      }
    }

    // Add todo updates
    if (todos.length > 0 && todoIndex < todos.length) {
      if (outputIndex % Math.ceil(config.output.length / todos.length) === 0) {
        outputLines.push({
          type: 'todo',
          ...todos[todoIndex]
        });
        todoIndex++;
      }
    }
  }

  return {
    output: outputLines,
    finalState: {
      exitCode: config.exitCode ?? 0,
    },
    lineDelay: 50,
  };
}

/**
 * Write a mock fixture to a file
 *
 * @param fixturePath - Path to write the fixture
 * @param fixture - Fixture data
 */
export function writeMockFixture(
  fixturePath: string,
  fixture: MockClaudeFixture
): void {
  const dir = path.dirname(fixturePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fixturePath, JSON.stringify(fixture, null, 2));
}

/**
 * Common fixture templates for typical Claude interactions
 */
export const FIXTURE_TEMPLATES = {
  /**
   * Simple task completion
   */
  simpleTask: (taskName: string): MockClaudeFixture => ({
    output: [
      `[TODO] Starting: ${taskName}`,
      `[PROGRESS] {"step": "analyzing", "percent": 25}`,
      `Working on ${taskName}...`,
      `[PROGRESS] {"step": "implementing", "percent": 50}`,
      `Making progress...`,
      `[PROGRESS] {"step": "completing", "percent": 75}`,
      `[TODO] Completed: ${taskName}`,
      `[PROGRESS] {"step": "done", "percent": 100}`,
    ],
    finalState: { exitCode: 0 },
    lineDelay: 100,
  }),

  /**
   * Task with error
   */
  taskWithError: (error: string): MockClaudeFixture => ({
    output: [
      `[TODO] Starting task...`,
      `[PROGRESS] {"step": "analyzing", "percent": 25}`,
      `Working...`,
      `[ERROR] ${error}`,
    ],
    finalState: { exitCode: 1 },
    lineDelay: 100,
  }),

  /**
   * Multi-step task with todos
   */
  multiStepTask: (steps: string[]): MockClaudeFixture => {
    const output: MockOutputLine[] = [];

    steps.forEach((step, index) => {
      output.push({
        type: 'todo',
        action: 'add',
        content: step,
      });
    });

    steps.forEach((step, index) => {
      output.push({
        type: 'todo',
        action: 'update',
        content: `Working on: ${step}`,
      });
      output.push(`Implementing ${step}...`);
      output.push({
        type: 'progress',
        percent: Math.round(((index + 1) / steps.length) * 100),
        message: step,
      });
      output.push({
        type: 'todo',
        action: 'complete',
        content: step,
      });
    });

    return {
      output,
      finalState: { exitCode: 0 },
      lineDelay: 50,
    };
  },

  /**
   * Interactive conversation simulation
   */
  conversation: (exchanges: { prompt: string; response: string }[]): MockClaudeFixture => {
    const output: MockOutputLine[] = [];

    exchanges.forEach(({ prompt, response }) => {
      output.push(`> ${prompt}`);
      output.push(response);
    });

    return {
      output,
      finalState: { exitCode: 0 },
      lineDelay: 200,
    };
  },
};
