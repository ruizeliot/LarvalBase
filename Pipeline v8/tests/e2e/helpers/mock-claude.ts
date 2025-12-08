/**
 * Mock Claude Binary Helper
 * Pipeline v8
 *
 * Simulates Claude CLI for E2E testing without real API calls.
 * Reads fixture files to determine output, todo states, and exit code.
 *
 * Environment Variables:
 * - MOCK_FIXTURE: Path to fixture JSON file
 * - PIPELINE_SESSION_ID: Session ID for todo file naming
 * - CLAUDE_TODO_DIR: Directory for todo files (defaults to ~/.claude/todos)
 *
 * Fixture Format:
 * {
 *   "output": ["line1", "line2"],
 *   "todoStates": [{ "timestamp": 0, "todos": [...] }],
 *   "exitCode": 0,
 *   "duration": 1000
 * }
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// FAIL: Not implemented
export interface MockFixture {
  output: string[];
  todoStates: TodoState[];
  exitCode: number;
  duration?: number;
}

export interface TodoState {
  timestamp: number;
  todos: MockTodo[];
}

export interface MockTodo {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm?: string;
}

/**
 * Load fixture from path
 * FAIL: Not implemented
 */
export function loadFixture(fixturePath: string): MockFixture {
  throw new Error('Not implemented');
}

/**
 * Write todo file for session
 * FAIL: Not implemented
 */
export function writeTodoFile(
  sessionId: string,
  todos: MockTodo[],
  todoDir?: string
): void {
  throw new Error('Not implemented');
}

/**
 * Simulate Claude CLI output
 * FAIL: Not implemented
 */
export function simulateOutput(
  output: string[],
  duration: number
): Promise<void> {
  throw new Error('Not implemented');
}

/**
 * Run mock Claude with fixture
 * FAIL: Not implemented
 */
export async function runMockClaude(): Promise<number> {
  throw new Error('Not implemented');
}

// Entry point when run directly
if (require.main === module) {
  runMockClaude()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
