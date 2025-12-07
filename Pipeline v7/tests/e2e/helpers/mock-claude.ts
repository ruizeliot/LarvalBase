import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface MockClaudeOptions {
  fixture: string;
  delay?: number;
  exitCode?: number;
}

interface TodoState {
  timestamp: number;
  todos: Array<{
    content: string;
    status: 'pending' | 'in_progress' | 'completed';
  }>;
}

interface ClaudeFixture {
  output: string[];
  todoStates?: TodoState[];
  finalState: {
    exitCode: number;
  };
}

/**
 * Creates a mock Claude process that:
 * 1. Reads from a fixture file
 * 2. Streams output with delays
 * 3. Exits with specified code
 */
export function createMockClaude(options: MockClaudeOptions): ChildProcess {
  // Handle missing fixture file - return a process that exits with code 1
  if (!fs.existsSync(options.fixture)) {
    const script = `
      console.error('Error: Fixture file not found: ${options.fixture.replace(/\\/g, '\\\\')}');
      process.exit(1);
    `;
    return spawn('node', ['-e', script], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });
  }

  const fixtureContent = fs.readFileSync(options.fixture, 'utf-8');
  const fixture: ClaudeFixture = JSON.parse(fixtureContent);

  // Default delay to 100ms if not specified, but allow explicit 0
  const delay = options.delay !== undefined ? options.delay : 100;

  // Create a Node script that emulates Claude behavior
  const script = `
    const output = ${JSON.stringify(fixture.output)};
    const delay = ${delay};
    const exitCode = ${options.exitCode ?? fixture.finalState.exitCode};
    const todoStates = ${JSON.stringify(fixture.todoStates || [])};
    const sessionId = process.env.PIPELINE_SESSION_ID || 'mock-session';
    const todoDir = require('path').join(require('os').homedir(), '.claude', 'todos');

    // Ensure todo directory exists
    require('fs').mkdirSync(todoDir, { recursive: true });

    const startTime = Date.now();
    let todoIndex = 0;

    function writeTodo() {
      const elapsed = Date.now() - startTime;
      while (todoIndex < todoStates.length && elapsed >= todoStates[todoIndex].timestamp) {
        const todoPath = require('path').join(todoDir, sessionId + '.json');
        require('fs').writeFileSync(todoPath, JSON.stringify(todoStates[todoIndex].todos, null, 2));
        todoIndex++;
      }
    }

    // Write final todo state (in case we exit before all timestamps)
    function writeFinalTodo() {
      if (todoStates.length > 0) {
        const finalState = todoStates[todoStates.length - 1];
        const todoPath = require('path').join(todoDir, sessionId + '.json');
        require('fs').writeFileSync(todoPath, JSON.stringify(finalState.todos, null, 2));
      }
    }

    // If delay is 0, output everything immediately (synchronously)
    if (delay === 0) {
      for (const line of output) {
        console.log(line);
      }
      writeFinalTodo();
      process.exit(exitCode);
    } else {
      // Use async iteration with delays
      let index = 0;

      function emitNext() {
        writeTodo();
        if (index < output.length) {
          console.log(output[index]);
          index++;
          setTimeout(emitNext, delay);
        } else {
          // Write final todo state before exiting
          writeFinalTodo();
          process.exit(exitCode);
        }
      }

      emitNext();
    }
  `;

  return spawn('node', ['-e', script], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env },
  });
}

/**
 * Set up mock Claude in test environment
 */
export function setupMockClaude(fixturesDir: string): void {
  process.env.MOCK_CLAUDE_DIR = fixturesDir;
  process.env.USE_MOCK_CLAUDE = 'true';
}

/**
 * Clean up mock Claude after tests
 */
export function cleanupMockClaude(): void {
  delete process.env.MOCK_CLAUDE_DIR;
  delete process.env.USE_MOCK_CLAUDE;

  // Clean up any created todo files
  const todoDir = path.join(os.homedir(), '.claude', 'todos');
  if (fs.existsSync(todoDir)) {
    const files = fs.readdirSync(todoDir);
    for (const file of files) {
      if (file.startsWith('mock-') || file.startsWith('test-')) {
        fs.unlinkSync(path.join(todoDir, file));
      }
    }
  }
}
