#!/usr/bin/env node
/**
 * Pipeline Job Dispatcher
 *
 * CLI tool for supervisors to dispatch jobs to remote workers.
 * Connects to coordinator, submits job, streams output, waits for completion.
 *
 * Usage: node dispatch.js --command "claude" --args "/0a-pipeline /path" [--cwd /path]
 */

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

// Configuration
const COORDINATOR_URL = process.env.COORDINATOR_URL || 'ws://localhost:8765';

// Parse arguments
let command = null;
let args = [];
let cwd = process.cwd();
let timeout = 3600000; // 1 hour default

for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg === '--command' || arg === '-c') {
    command = process.argv[++i];
  } else if (arg === '--args' || arg === '-a') {
    args = process.argv[++i].split(' ');
  } else if (arg === '--cwd' || arg === '-d') {
    cwd = process.argv[++i];
  } else if (arg === '--timeout' || arg === '-t') {
    timeout = parseInt(process.argv[++i]) * 1000;
  } else if (arg === '--server' || arg === '-s') {
    // Override coordinator URL
    process.env.COORDINATOR_URL = process.argv[++i];
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
Pipeline Job Dispatcher

Dispatches a job to a remote worker agent via the coordinator.

Usage: node dispatch.js --command <cmd> [options]

Options:
  --command, -c <cmd>      Command to execute (required)
  --args, -a <args>        Arguments (space-separated string)
  --cwd, -d <path>         Working directory on worker
  --timeout, -t <seconds>  Job timeout (default: 3600)
  --server, -s <url>       Coordinator URL (default: ws://localhost:8765)
  --help, -h               Show this help

Examples:
  # Dispatch Claude pipeline phase
  node dispatch.js -c claude -a "/0a-pipeline /home/user/project" -d /home/user/project

  # Dispatch npm build
  node dispatch.js -c npm -a "run build" -d /path/to/project

Environment:
  COORDINATOR_URL          Alternative to --server
`);
    process.exit(0);
  }
}

if (!command) {
  console.error('Error: --command is required');
  process.exit(1);
}

// State
const supervisorId = uuidv4();
const jobId = uuidv4();
let jobComplete = false;
let exitCode = null;

console.log(`Dispatching job to remote worker...`);
console.log(`  Command: ${command} ${args.join(' ')}`);
console.log(`  CWD: ${cwd}`);
console.log(`  Job ID: ${jobId}`);
console.log('');

const ws = new WebSocket(COORDINATOR_URL);

ws.on('open', () => {
  // Register as supervisor
  ws.send(JSON.stringify({
    type: 'supervisor_register',
    supervisorId
  }));
});

ws.on('message', (data) => {
  try {
    const msg = JSON.parse(data);
    handleMessage(msg);
  } catch (e) {
    console.error('Invalid message:', e.message);
  }
});

ws.on('close', () => {
  if (!jobComplete) {
    console.error('\nConnection lost before job completed');
    process.exit(1);
  }
});

ws.on('error', (err) => {
  console.error('Connection error:', err.message);
  process.exit(1);
});

function handleMessage(msg) {
  switch (msg.type) {
    case 'supervisor_registered':
      console.log(`Connected to coordinator (${msg.workers.length} workers online)`);

      if (msg.workers.length === 0) {
        console.error('\nNo workers available! Start a worker agent first.');
        ws.close();
        process.exit(1);
      }

      // Submit job
      ws.send(JSON.stringify({
        type: 'job_submit',
        jobId,
        command,
        args,
        cwd,
        supervisorId
      }));
      console.log('Job submitted, waiting for worker...\n');
      console.log('─'.repeat(60));
      break;

    case 'job_queued':
      console.log(`Job queued (position ${msg.position})`);
      break;

    case 'job_output':
      if (msg.jobId === jobId) {
        process.stdout.write(msg.data);
      }
      break;

    case 'job_complete':
      if (msg.jobId === jobId) {
        console.log('─'.repeat(60));
        console.log(`\nJob completed`);
        console.log(`  Exit code: ${msg.exitCode}`);
        console.log(`  Duration: ${msg.duration}s`);

        jobComplete = true;
        exitCode = msg.exitCode;
        ws.close();
        process.exit(msg.exitCode);
      }
      break;

    case 'workers_update':
      // Silently track worker updates
      break;

    case 'error':
      console.error(`Error: ${msg.message}`);
      ws.close();
      process.exit(1);
      break;
  }
}

// Timeout handler
setTimeout(() => {
  if (!jobComplete) {
    console.error(`\nJob timed out after ${timeout / 1000}s`);
    ws.close();
    process.exit(124); // Standard timeout exit code
  }
}, timeout);

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\nInterrupted. Job may still be running on worker.');
  ws.close();
  process.exit(130);
});
