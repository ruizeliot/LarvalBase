#!/usr/bin/env node
/**
 * pipe-send.js - Worker helper script
 *
 * Sends a message to the supervisor via named pipe and exits.
 * Used by workers to signal phase completion.
 *
 * Usage: node pipe-send.js <project-id> <message>
 *
 * Example:
 *   node pipe-send.js my-project "done:0a"
 *   node pipe-send.js my-project "done:0b"
 *   node pipe-send.js my-project "error:0a:build failed"
 *
 * Exit codes:
 *   0 - Message sent successfully
 *   1 - Error (connection failed, pipe not found, etc.)
 */

const net = require('net');

const projectId = process.argv[2];
const message = process.argv[3];

if (!projectId || !message) {
  console.error('Usage: node pipe-send.js <project-id> <message>');
  console.error('');
  console.error('Examples:');
  console.error('  node pipe-send.js my-project "done:0a"');
  console.error('  node pipe-send.js my-project "done:1"');
  console.error('  node pipe-send.js my-project "error:2:test failed"');
  process.exit(1);
}

// Windows named pipe path format
const pipePath = '\\\\.\\pipe\\pipeline-' + projectId;

console.error(`[pipe-send] Connecting to ${pipePath}`);

const client = net.connect(pipePath, () => {
  console.error(`[pipe-send] Connected, sending: ${message}`);
  client.write(message);
  client.end();
});

client.on('end', () => {
  console.error('[pipe-send] Message sent successfully');
  process.exit(0);
});

client.on('error', (err) => {
  if (err.code === 'ENOENT') {
    console.error(`[pipe-send] ERROR: Pipe not found. Is the supervisor listening?`);
    console.error(`[pipe-send] Pipe path: ${pipePath}`);
  } else {
    console.error(`[pipe-send] ERROR: ${err.message}`);
  }
  process.exit(1);
});

// Timeout after 5 seconds if can't connect
setTimeout(() => {
  console.error('[pipe-send] ERROR: Connection timeout');
  client.destroy();
  process.exit(1);
}, 5000);
