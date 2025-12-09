#!/usr/bin/env node
/**
 * pipe-listen.js - Supervisor helper script
 *
 * Blocks until a message arrives via named pipe, then prints it and exits.
 * Used by the supervisor to wait for worker completion signals.
 *
 * Usage: node pipe-listen.js <project-id> [timeout-ms]
 *
 * Example:
 *   node pipe-listen.js my-project
 *   node pipe-listen.js my-project 300000  # 5 minute timeout
 *
 * Output: Prints the received message to stdout
 * Exit codes:
 *   0 - Message received successfully
 *   1 - Error (connection failed, etc.)
 *   2 - Timeout
 */

const net = require('net');

const projectId = process.argv[2];
const timeoutMs = parseInt(process.argv[3]) || 0; // 0 = no timeout

if (!projectId) {
  console.error('Usage: node pipe-listen.js <project-id> [timeout-ms]');
  process.exit(1);
}

// Windows named pipe path format
const pipePath = '\\\\.\\pipe\\pipeline-' + projectId;

let timeoutHandle = null;
let server = null;

// Setup timeout if specified
if (timeoutMs > 0) {
  timeoutHandle = setTimeout(() => {
    console.error(`Timeout after ${timeoutMs}ms waiting for message`);
    if (server) server.close();
    process.exit(2);
  }, timeoutMs);
}

server = net.createServer((socket) => {
  let data = '';

  socket.on('data', (chunk) => {
    data += chunk.toString();
  });

  socket.on('end', () => {
    // Clear timeout since we got a message
    if (timeoutHandle) clearTimeout(timeoutHandle);

    // Output the message to stdout (supervisor reads this)
    console.log(data.trim());

    // Clean up and exit
    socket.end();
    server.close();
    process.exit(0);
  });

  socket.on('error', (err) => {
    console.error('Socket error:', err.message);
  });
});

server.on('error', (err) => {
  if (timeoutHandle) clearTimeout(timeoutHandle);
  console.error('Server error:', err.message);
  process.exit(1);
});

server.listen(pipePath, () => {
  console.error(`[pipe-listen] Listening on ${pipePath}`);
  console.error(`[pipe-listen] Waiting for worker signal...`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('[pipe-listen] Interrupted');
  if (timeoutHandle) clearTimeout(timeoutHandle);
  if (server) server.close();
  process.exit(1);
});
