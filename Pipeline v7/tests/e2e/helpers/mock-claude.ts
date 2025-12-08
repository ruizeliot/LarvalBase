import * as fs from 'fs/promises';
import * as path from 'path';
import type { Todo, Manifest } from '../../../src/types/index.js';

interface TodoState {
  timestamp: number;
  todos: Todo[];
}

interface MockFixture {
  output: string[];
  todoStates: TodoState[];
  finalState: {
    exitCode: number | null;
    manifestUpdate?: Record<string, unknown>;
    error?: string;
    timeout?: boolean;
    timeoutAfterMs?: number;
  };
}

/**
 * MockClaude simulates Claude CLI behavior by:
 * 1. Writing todo files at specified intervals
 * 2. Updating manifest.json for phase transitions
 * 3. Returning mock PIDs for process detection
 */
export class MockClaude {
  private fixture: MockFixture | null = null;
  private projectPath: string;
  private sessionId: string;
  private todoDir: string;
  private running = false;
  private pid = Math.floor(Math.random() * 90000) + 10000;
  private timers: NodeJS.Timeout[] = [];

  constructor(projectPath: string, sessionId = 'mock-session-001') {
    this.projectPath = projectPath;
    this.sessionId = sessionId;
    this.todoDir = path.join(process.env.HOME || process.env.USERPROFILE || '', '.claude', 'todos');
  }

  async loadFixture(fixturePath: string): Promise<void> {
    const content = await fs.readFile(fixturePath, 'utf-8');
    this.fixture = JSON.parse(content);
  }

  setFixture(fixture: MockFixture): void {
    this.fixture = fixture;
  }

  getPid(): number {
    return this.pid;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  isRunning(): boolean {
    return this.running;
  }

  async start(): Promise<void> {
    if (!this.fixture) {
      throw new Error('No fixture loaded');
    }

    this.running = true;

    // Create todo directory
    await fs.mkdir(this.todoDir, { recursive: true });

    // Schedule todo state updates
    for (const state of this.fixture.todoStates) {
      const timer = setTimeout(async () => {
        if (this.running) {
          await this.writeTodos(state.todos);
        }
      }, state.timestamp);
      this.timers.push(timer);
    }

    // Schedule final state
    const lastTimestamp = this.fixture.todoStates[this.fixture.todoStates.length - 1]?.timestamp || 0;
    const finalTimer = setTimeout(async () => {
      await this.handleFinalState();
    }, lastTimestamp + 500);
    this.timers.push(finalTimer);
  }

  async stop(): Promise<void> {
    this.running = false;
    for (const timer of this.timers) {
      clearTimeout(timer);
    }
    this.timers = [];
  }

  private async writeTodos(todos: Todo[]): Promise<void> {
    const todoPath = path.join(this.todoDir, `${this.sessionId}.json`);
    await fs.writeFile(todoPath, JSON.stringify(todos, null, 2));
  }

  private async handleFinalState(): Promise<void> {
    if (!this.fixture) return;

    const { finalState } = this.fixture;

    // Update manifest if specified
    if (finalState.manifestUpdate) {
      await this.updateManifest(finalState.manifestUpdate);
    }

    // Handle timeout
    if (finalState.timeout) {
      // Just keep running - the test should handle timeout detection
      return;
    }

    // Handle completion or error
    this.running = false;
  }

  private async updateManifest(updates: Record<string, unknown>): Promise<void> {
    const manifestPath = path.join(this.projectPath, '.pipeline', 'manifest.json');

    try {
      const content = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(content) as Manifest;

      // Apply updates using dot notation
      for (const [key, value] of Object.entries(updates)) {
        this.setNestedValue(manifest, key, value);
      }

      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    } catch {
      // Manifest doesn't exist yet, ignore
    }
  }

  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const keys = path.split('.');
    let current: Record<string, unknown> = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }

    current[keys[keys.length - 1]] = value;
  }
}

/**
 * Create a mock fixture for testing
 */
export function createMockFixture(options: Partial<MockFixture>): MockFixture {
  return {
    output: options.output || ['Mock output'],
    todoStates: options.todoStates || [
      {
        timestamp: 0,
        todos: [{ content: 'Test task', status: 'in_progress', activeForm: 'Testing' }],
      },
      {
        timestamp: 100,
        todos: [{ content: 'Test task', status: 'completed', activeForm: 'Testing' }],
      },
    ],
    finalState: options.finalState || {
      exitCode: 0,
    },
  };
}

/**
 * Quick fixtures for common scenarios
 */
export const fixtures = {
  success: createMockFixture({
    finalState: { exitCode: 0 },
  }),

  error: createMockFixture({
    finalState: { exitCode: 1, error: 'Test error' },
  }),

  timeout: createMockFixture({
    todoStates: [
      { timestamp: 0, todos: [{ content: 'Long task', status: 'in_progress', activeForm: 'Processing' }] },
    ],
    finalState: { exitCode: null, timeout: true, timeoutAfterMs: 5000 },
  }),

  phaseComplete: (phase: number) =>
    createMockFixture({
      todoStates: [
        { timestamp: 0, todos: [{ content: `Phase ${phase} task`, status: 'in_progress', activeForm: 'Working' }] },
        { timestamp: 100, todos: [{ content: `Phase ${phase} task`, status: 'completed', activeForm: 'Working' }] },
      ],
      finalState: {
        exitCode: 0,
        manifestUpdate: {
          currentPhase: String(phase + 1),
          [`phases.${phase}.status`]: 'complete',
        },
      },
    }),
};
