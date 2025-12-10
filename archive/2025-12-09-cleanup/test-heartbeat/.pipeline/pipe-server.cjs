#!/usr/bin/env node
/**
 * Named Pipe Server for Pipeline Orchestrator
 *
 * Listens for heartbeat messages from the dashboard.
 */

const net = require('net');
const PIPE_PATH = '\\\\.\\pipe\\pipeline-orchestrator';

const server = net.createServer((socket) => {
  socket.on('data', (data) => {
    const msg = data.toString().trim();
    console.log('[HEARTBEAT RECEIVED]', msg);
    try {
      const parsed = JSON.parse(msg);
      console.log(`  Phase: ${parsed.phase}, Progress: ${parsed.summary}`);
    } catch (e) {
      // Plain text message
    }
  });
});

server.listen(PIPE_PATH, () => {
  console.log('Named pipe server listening on:', PIPE_PATH);
  console.log('Waiting for heartbeats from dashboard...');
});

server.on('error', (err) => {
  console.error('Pipe server error:', err.message);
});
