#!/usr/bin/env node

/**
 * Mock Claude Binary
 *
 * This script emulates Claude CLI behavior for testing purposes.
 * It reads a fixture file and streams output with timing.
 *
 * Environment Variables:
 *   MOCK_CLAUDE_FIXTURE - Path to JSON fixture file
 *   PIPELINE_SESSION_ID - Session ID for todo file naming
 *
 * Fixture Format:
 * {
 *   "output": ["line1", "line2", ...],
 *   "todoStates": [{ "timestamp": 100, "todos": [...] }],
 *   "finalState": { "exitCode": 0 }
 * }
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const fixturePath = process.env.MOCK_CLAUDE_FIXTURE;

if (!fixturePath) {
  console.error('Error: MOCK_CLAUDE_FIXTURE environment variable not set');
  process.exit(1);
}

if (!fs.existsSync(fixturePath)) {
  console.error(`Error: Fixture file not found: ${fixturePath}`);
  process.exit(1);
}

let fixture;
try {
  const content = fs.readFileSync(fixturePath, 'utf-8');
  fixture = JSON.parse(content);
} catch (error) {
  console.error(`Error: Invalid JSON in fixture file: ${error.message}`);
  process.exit(2);
}

const output = fixture.output || [];
const todoStates = fixture.todoStates || [];
const exitCode = fixture.finalState?.exitCode ?? 0;
const delay = parseInt(process.env.MOCK_CLAUDE_DELAY || '100', 10);
const sessionId = process.env.PIPELINE_SESSION_ID || 'mock-session';

// Ensure todo directory exists
const todoDir = path.join(os.homedir(), '.claude', 'todos');
fs.mkdirSync(todoDir, { recursive: true });

let outputIndex = 0;
let todoIndex = 0;
const startTime = Date.now();

function writeTodoState() {
  if (todoIndex >= todoStates.length) return;

  const elapsed = Date.now() - startTime;
  const todoState = todoStates[todoIndex];

  if (elapsed >= todoState.timestamp) {
    const todoPath = path.join(todoDir, `${sessionId}.json`);
    fs.writeFileSync(todoPath, JSON.stringify(todoState.todos, null, 2));
    todoIndex++;
  }
}

function emitNext() {
  writeTodoState();

  if (outputIndex < output.length) {
    console.log(output[outputIndex]);
    outputIndex++;
    setTimeout(emitNext, delay);
  } else {
    // Final todo state write
    writeTodoState();
    process.exit(exitCode);
  }
}

// Start emitting output
emitNext();
