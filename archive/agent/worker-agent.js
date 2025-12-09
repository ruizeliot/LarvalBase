#!/usr/bin/env node
/**
 * Pipeline Worker Agent
 *
 * Runs on user's laptop/PC, connects to coordinator on VPS.
 * Executes pipeline jobs locally using the machine's compute power.
 *
 * Usage: node worker-agent.js [--server wss://host:port] [--token XXXXX] [--name "My Laptop"]
 */

const WebSocket = require('ws');
const { spawn } = require('child_process');
const os = require('os');
const readline = require('readline');

// Configuration
let SERVER_URL = process.env.COORDINATOR_URL || 'ws://localhost:8765';
let AUTH_TOKEN = process.env.AGENT_TOKEN || null;
let WORKER_NAME = process.env.WORKER_NAME || os.hostname();

// Parse command line arguments
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg === '--server' || arg === '-s') {
    SERVER_URL = process.argv[++i];
  } else if (arg === '--token' || arg === '-t') {
    AUTH_TOKEN = process.argv[++i];
  } else if (arg === '--name' || arg === '-n') {
    WORKER_NAME = process.argv[++i];
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
Pipeline Worker Agent

Usage: node worker-agent.js [options]

Options:
  --server, -s <url>    Coordinator WebSocket URL (default: ws://localhost:8765)
  --token, -t <token>   Connection token (get from coordinator)
  --name, -n <name>     Worker name (default: hostname)
  --help, -h            Show this help

Environment variables:
  COORDINATOR_URL       Alternative to --server
  AGENT_TOKEN           Alternative to --token
  WORKER_NAME           Alternative to --name

Example:
  node worker-agent.js --server wss://pipeline.example.com:8765 --token ABC123
`);
    process.exit(0);
  }
}

// System info
const SYSTEM_INFO = {
  name: WORKER_NAME,
  cores: os.cpus().length,
  ram: Math.round(os.totalmem() / 1024 / 1024 / 1024),
  os: `${os.platform()} ${os.release()}`,
  arch: os.arch()
};

// State
let ws = null;
let workerId = null;
let currentJob = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 5000;

console.log(`
╔════════════════════════════════════════════════════════════╗
║           Pipeline Worker Agent v1.0                       ║
╚════════════════════════════════════════════════════════════╝

System: ${SYSTEM_INFO.name}
  CPU:  ${SYSTEM_INFO.cores} cores
  RAM:  ${SYSTEM_INFO.ram} GB
  OS:   ${SYSTEM_INFO.os}
`);

// If no token provided, prompt for it
async function getToken() {
  if (AUTH_TOKEN) return AUTH_TOKEN;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('Enter connection token (from coordinator): ', (answer) => {
      rl.close();
      resolve(answer.trim().toUpperCase());
    });
  });
}

async function connect() {
  if (!AUTH_TOKEN) {
    AUTH_TOKEN = await getToken();
  }

  console.log(`\nConnecting to ${SERVER_URL}...`);

  ws = new WebSocket(SERVER_URL);

  ws.on('open', () => {
    console.log('Connected! Registering...');
    reconnectAttempts = 0;

    // Register with coordinator
    ws.send(JSON.stringify({
      type: 'register',
      token: AUTH_TOKEN,
      ...SYSTEM_INFO
    }));
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      handleMessage(msg);
    } catch (e) {
      console.error('Invalid message received:', e.message);
    }
  });

  ws.on('close', () => {
    console.log('\nDisconnected from coordinator');
    workerId = null;

    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      console.log(`Reconnecting in ${RECONNECT_DELAY / 1000}s (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
      setTimeout(connect, RECONNECT_DELAY);
    } else {
      console.log('Max reconnection attempts reached. Exiting.');
      process.exit(1);
    }
  });

  ws.on('error', (err) => {
    console.error('Connection error:', err.message);
  });
}

function handleMessage(msg) {
  switch (msg.type) {
    case 'registered':
      workerId = msg.workerId;
      console.log(`\n✓ Registered as: ${SYSTEM_INFO.name}`);
      console.log(`✓ Worker ID: ${workerId}`);
      console.log(`\nStatus: IDLE - Waiting for jobs...\n`);
      break;

    case 'error':
      console.error(`Error: ${msg.message}`);
      if (msg.message.includes('token')) {
        AUTH_TOKEN = null; // Clear invalid token
        ws.close();
      }
      break;

    case 'job':
      handleJob(msg);
      break;

    case 'kill':
      handleKill(msg);
      break;

    case 'ping':
      ws.send(JSON.stringify({ type: 'pong' }));
      break;

    default:
      // Ignore unknown messages
      break;
  }
}

function handleJob(msg) {
  console.log(`\n════════════════════════════════════════`);
  console.log(`📦 New Job: ${msg.jobId}`);
  console.log(`   Command: ${msg.command} ${(msg.args || []).join(' ')}`);
  console.log(`   CWD: ${msg.cwd || '.'}`);
  console.log(`════════════════════════════════════════\n`);

  const startTime = Date.now();

  // Spawn the process
  const proc = spawn(msg.command, msg.args || [], {
    cwd: msg.cwd || process.cwd(),
    env: { ...process.env, ...msg.env },
    shell: true
  });

  currentJob = {
    id: msg.jobId,
    process: proc,
    startTime
  };

  // Stream stdout
  proc.stdout.on('data', (data) => {
    const text = data.toString();
    process.stdout.write(text); // Show locally

    ws.send(JSON.stringify({
      type: 'output',
      jobId: msg.jobId,
      data: text
    }));
  });

  // Stream stderr
  proc.stderr.on('data', (data) => {
    const text = data.toString();
    process.stderr.write(text); // Show locally

    ws.send(JSON.stringify({
      type: 'output',
      jobId: msg.jobId,
      data: text
    }));
  });

  // Handle completion
  proc.on('close', (code) => {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n════════════════════════════════════════`);
    console.log(`✓ Job ${msg.jobId} completed`);
    console.log(`  Exit code: ${code}`);
    console.log(`  Duration: ${duration}s`);
    console.log(`════════════════════════════════════════\n`);

    ws.send(JSON.stringify({
      type: 'complete',
      jobId: msg.jobId,
      exitCode: code
    }));

    currentJob = null;
    console.log('Status: IDLE - Waiting for jobs...\n');
  });

  proc.on('error', (err) => {
    console.error(`Job error: ${err.message}`);

    ws.send(JSON.stringify({
      type: 'complete',
      jobId: msg.jobId,
      exitCode: 1,
      error: err.message
    }));

    currentJob = null;
  });
}

function handleKill(msg) {
  if (currentJob && currentJob.id === msg.jobId) {
    console.log(`\n⚠️  Killing job ${msg.jobId}...`);
    currentJob.process.kill('SIGTERM');

    // Force kill after 5 seconds
    setTimeout(() => {
      if (currentJob && currentJob.id === msg.jobId) {
        currentJob.process.kill('SIGKILL');
      }
    }, 5000);
  }
}

// Status display
function showStatus() {
  const status = currentJob ? `BUSY (${currentJob.id})` : 'IDLE';
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const mins = Math.floor((uptime % 3600) / 60);

  console.log(`\n[Status] ${status} | Uptime: ${hours}h ${mins}m | Connected: ${workerId ? 'yes' : 'no'}`);
}

// Periodic status update (every 5 minutes)
setInterval(showStatus, 300000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down...');

  if (currentJob) {
    console.log('Killing active job...');
    currentJob.process.kill('SIGTERM');
  }

  if (ws) {
    ws.close();
  }

  setTimeout(() => process.exit(0), 1000);
});

// Start
connect();
