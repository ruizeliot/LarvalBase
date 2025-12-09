#!/usr/bin/env node
/**
 * Mock Claude CLI Binary
 *
 * This script simulates the Claude CLI for E2E testing.
 * It reads a fixture file and outputs the contents with realistic timing.
 *
 * Usage:
 *   node mock-claude-bin.js <fixture-path> [args...]
 *
 * The fixture file should be JSON with the format:
 * {
 *   "output": ["line1", "line2", ...],
 *   "finalState": { "exitCode": 0 },
 *   "lineDelay": 50
 * }
 *
 * Environment variables:
 *   MOCK_DELAY_MULTIPLIER - Multiply all delays (default: 1.0)
 *   MOCK_INSTANT - Set to 'true' to skip all delays
 */

const fs = require('fs');
const path = require('path');

// Parse arguments
const args = process.argv.slice(2);
const fixturePath = args[0];

if (!fixturePath) {
  console.error('Usage: mock-claude-bin.js <fixture-path> [args...]');
  process.exit(1);
}

// Load fixture
let fixture;
try {
  const resolvedPath = path.isAbsolute(fixturePath)
    ? fixturePath
    : path.resolve(process.cwd(), fixturePath);

  const content = fs.readFileSync(resolvedPath, 'utf-8');
  fixture = JSON.parse(content);
} catch (error) {
  console.error(`Failed to load fixture: ${error.message}`);
  process.exit(1);
}

// Configuration
const delayMultiplier = parseFloat(process.env.MOCK_DELAY_MULTIPLIER || '1.0');
const instant = process.env.MOCK_INSTANT === 'true';
const baseDelay = fixture.lineDelay || 50;

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  if (instant) return Promise.resolve();
  return new Promise(resolve => setTimeout(resolve, ms * delayMultiplier));
}

/**
 * Format a progress update as JSON
 */
function formatProgress(percent, message) {
  return JSON.stringify({
    type: 'progress',
    percent,
    message,
    timestamp: new Date().toISOString()
  });
}

/**
 * Format a todo update
 */
function formatTodo(action, content) {
  return JSON.stringify({
    type: 'todo',
    action,
    content,
    timestamp: new Date().toISOString()
  });
}

/**
 * Output a single line
 */
async function outputLine(line) {
  if (typeof line === 'string') {
    // Simple string output
    console.log(line);
  } else if (typeof line === 'object') {
    // Complex output type
    switch (line.type) {
      case 'stdout':
        console.log(line.content);
        break;

      case 'stderr':
        console.error(line.content);
        break;

      case 'progress':
        // Output progress in Claude-like format
        console.log(`[PROGRESS] ${formatProgress(line.percent, line.message)}`);
        break;

      case 'todo':
        // Output todo update in Claude-like format
        console.log(`[TODO] ${formatTodo(line.action, line.content)}`);
        break;

      default:
        console.log(JSON.stringify(line));
    }

    // Use line-specific delay if provided
    if (line.delay) {
      await sleep(line.delay);
      return;
    }
  }

  await sleep(baseDelay);
}

/**
 * Main execution
 */
async function main() {
  const { output, finalState } = fixture;

  // Output each line with delays
  for (const line of output) {
    await outputLine(line);
  }

  // Handle final state
  if (finalState.files) {
    // Simulate file creation (for testing file-based outputs)
    for (const [filePath, content] of Object.entries(finalState.files)) {
      const resolvedPath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(process.cwd(), filePath);

      const dir = path.dirname(resolvedPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(resolvedPath, content);
    }
  }

  // Exit with specified code
  process.exit(finalState.exitCode || 0);
}

// Handle signals gracefully
process.on('SIGINT', () => {
  console.log('\n[Mock Claude] Interrupted');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n[Mock Claude] Terminated');
  process.exit(143);
});

// Run
main().catch(error => {
  console.error(`Mock Claude error: ${error.message}`);
  process.exit(1);
});
