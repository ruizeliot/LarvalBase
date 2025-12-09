#!/usr/bin/env node
/**
 * Pipeline Coordinator Service
 *
 * WebSocket server that manages remote worker agents.
 * Runs on VPS, accepts connections from user laptops/PCs.
 *
 * Usage: node coordinator.js [--port 8765]
 */

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const http = require('http');

// Configuration
const PORT = parseInt(process.env.COORDINATOR_PORT || process.argv[2]?.replace('--port=', '') || '8765');
const AUTH_TOKENS = new Map(); // token -> worker config (generated on registration)

// Worker registry
const workers = new Map(); // workerId -> { ws, info, status, currentJob }

// Job queue
const pendingJobs = []; // Jobs waiting for workers
const activeJobs = new Map(); // jobId -> { workerId, command, startTime, output }

// Supervisor connections (to stream output back)
const supervisors = new Map(); // supervisorId -> ws

console.log(`
╔════════════════════════════════════════════════════════════╗
║          Pipeline Coordinator Service v1.0                 ║
╚════════════════════════════════════════════════════════════╝
`);

// Create HTTP server for health checks
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', workers: workers.size, pendingJobs: pendingJobs.length }));
  } else if (req.url === '/workers') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const workerList = Array.from(workers.values()).map(w => ({
      id: w.info.id,
      name: w.info.name,
      cores: w.info.cores,
      ram: w.info.ram,
      status: w.status,
      currentJob: w.currentJob?.id || null,
      connectedAt: w.connectedAt
    }));
    res.end(JSON.stringify(workerList));
  } else if (req.url === '/token') {
    // Generate a new connection token
    const token = uuidv4().substring(0, 8).toUpperCase();
    AUTH_TOKENS.set(token, { createdAt: Date.now(), used: false });
    // Tokens expire after 1 hour
    setTimeout(() => AUTH_TOKENS.delete(token), 3600000);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ token, expiresIn: '1 hour' }));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`[${timestamp()}] New connection from ${clientIp}`);

  let workerId = null;
  let isSupervisor = false;

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      handleMessage(ws, msg, clientIp, (id) => { workerId = id; }, (sup) => { isSupervisor = sup; });
    } catch (e) {
      console.error(`[${timestamp()}] Invalid message:`, e.message);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
    }
  });

  ws.on('close', () => {
    if (workerId && workers.has(workerId)) {
      const worker = workers.get(workerId);
      console.log(`[${timestamp()}] Worker disconnected: ${worker.info.name} (${workerId})`);

      // If worker had active job, requeue it
      if (worker.currentJob) {
        console.log(`[${timestamp()}] Requeuing job ${worker.currentJob.id}`);
        pendingJobs.unshift(worker.currentJob);
        activeJobs.delete(worker.currentJob.id);
      }

      workers.delete(workerId);
      broadcastWorkerUpdate();
    }
    if (isSupervisor) {
      supervisors.forEach((s, id) => {
        if (s === ws) supervisors.delete(id);
      });
    }
  });

  ws.on('error', (err) => {
    console.error(`[${timestamp()}] WebSocket error:`, err.message);
  });
});

function handleMessage(ws, msg, clientIp, setWorkerId, setIsSupervisor) {
  switch (msg.type) {
    case 'register':
      handleRegister(ws, msg, clientIp, setWorkerId);
      break;

    case 'supervisor_register':
      handleSupervisorRegister(ws, msg, setIsSupervisor);
      break;

    case 'output':
      handleOutput(msg);
      break;

    case 'complete':
      handleComplete(msg);
      break;

    case 'job_submit':
      handleJobSubmit(ws, msg);
      break;

    case 'pong':
      // Heartbeat response, worker is alive
      break;

    default:
      console.log(`[${timestamp()}] Unknown message type: ${msg.type}`);
  }
}

function handleRegister(ws, msg, clientIp, setWorkerId) {
  // Validate token if provided
  if (msg.token) {
    if (!AUTH_TOKENS.has(msg.token)) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid or expired token' }));
      ws.close();
      return;
    }
    AUTH_TOKENS.get(msg.token).used = true;
  }

  const workerId = uuidv4();
  setWorkerId(workerId);

  const workerInfo = {
    id: workerId,
    name: msg.name || `Worker-${workerId.substring(0, 8)}`,
    cores: msg.cores || 1,
    ram: msg.ram || 4,
    os: msg.os || 'unknown',
    ip: clientIp
  };

  workers.set(workerId, {
    ws,
    info: workerInfo,
    status: 'idle',
    currentJob: null,
    connectedAt: new Date().toISOString()
  });

  console.log(`[${timestamp()}] Worker registered: ${workerInfo.name} (${workerInfo.cores} cores, ${workerInfo.ram}GB RAM)`);

  ws.send(JSON.stringify({
    type: 'registered',
    workerId,
    message: `Welcome ${workerInfo.name}! You are now connected.`
  }));

  broadcastWorkerUpdate();

  // Check if there are pending jobs
  dispatchPendingJobs();
}

function handleSupervisorRegister(ws, msg, setIsSupervisor) {
  const supervisorId = msg.supervisorId || uuidv4();
  supervisors.set(supervisorId, ws);
  setIsSupervisor(true);

  console.log(`[${timestamp()}] Supervisor connected: ${supervisorId}`);

  ws.send(JSON.stringify({
    type: 'supervisor_registered',
    supervisorId,
    workers: Array.from(workers.values()).map(w => ({
      id: w.info.id,
      name: w.info.name,
      status: w.status
    }))
  }));
}

function handleJobSubmit(ws, msg) {
  const job = {
    id: msg.jobId || uuidv4(),
    command: msg.command,
    args: msg.args || [],
    cwd: msg.cwd || '.',
    env: msg.env || {},
    supervisorId: msg.supervisorId,
    submittedAt: Date.now()
  };

  console.log(`[${timestamp()}] Job submitted: ${job.id} - ${job.command} ${job.args.join(' ')}`);

  // Find available worker
  const availableWorker = findAvailableWorker();

  if (availableWorker) {
    dispatchJob(availableWorker, job);
  } else {
    pendingJobs.push(job);
    ws.send(JSON.stringify({
      type: 'job_queued',
      jobId: job.id,
      position: pendingJobs.length
    }));
  }
}

function findAvailableWorker() {
  for (const [workerId, worker] of workers) {
    if (worker.status === 'idle') {
      return workerId;
    }
  }
  return null;
}

function dispatchJob(workerId, job) {
  const worker = workers.get(workerId);
  if (!worker) return false;

  worker.status = 'busy';
  worker.currentJob = job;
  activeJobs.set(job.id, { workerId, ...job, output: '', startTime: Date.now() });

  worker.ws.send(JSON.stringify({
    type: 'job',
    jobId: job.id,
    command: job.command,
    args: job.args,
    cwd: job.cwd,
    env: job.env
  }));

  console.log(`[${timestamp()}] Job ${job.id} dispatched to ${worker.info.name}`);
  broadcastWorkerUpdate();

  return true;
}

function dispatchPendingJobs() {
  while (pendingJobs.length > 0) {
    const workerId = findAvailableWorker();
    if (!workerId) break;

    const job = pendingJobs.shift();
    dispatchJob(workerId, job);
  }
}

function handleOutput(msg) {
  const job = activeJobs.get(msg.jobId);
  if (!job) return;

  job.output += msg.data;

  // Stream to supervisor if connected
  if (job.supervisorId && supervisors.has(job.supervisorId)) {
    supervisors.get(job.supervisorId).send(JSON.stringify({
      type: 'job_output',
      jobId: msg.jobId,
      data: msg.data
    }));
  }
}

function handleComplete(msg) {
  const job = activeJobs.get(msg.jobId);
  if (!job) return;

  const worker = workers.get(job.workerId);
  if (worker) {
    worker.status = 'idle';
    worker.currentJob = null;
  }

  const duration = ((Date.now() - job.startTime) / 1000).toFixed(1);
  console.log(`[${timestamp()}] Job ${msg.jobId} completed (${duration}s, exit: ${msg.exitCode})`);

  // Notify supervisor
  if (job.supervisorId && supervisors.has(job.supervisorId)) {
    supervisors.get(job.supervisorId).send(JSON.stringify({
      type: 'job_complete',
      jobId: msg.jobId,
      exitCode: msg.exitCode,
      duration: parseFloat(duration),
      output: job.output
    }));
  }

  activeJobs.delete(msg.jobId);
  broadcastWorkerUpdate();

  // Check for more pending jobs
  dispatchPendingJobs();
}

function broadcastWorkerUpdate() {
  const update = {
    type: 'workers_update',
    workers: Array.from(workers.values()).map(w => ({
      id: w.info.id,
      name: w.info.name,
      cores: w.info.cores,
      status: w.status
    })),
    pendingJobs: pendingJobs.length
  };

  supervisors.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(update));
    }
  });
}

// Heartbeat - ping all workers every 30s
setInterval(() => {
  workers.forEach((worker, workerId) => {
    if (worker.ws.readyState === WebSocket.OPEN) {
      worker.ws.send(JSON.stringify({ type: 'ping' }));
    }
  });
}, 30000);

function timestamp() {
  return new Date().toISOString().substring(11, 19);
}

// Start server
server.listen(PORT, () => {
  console.log(`Coordinator listening on port ${PORT}`);
  console.log(`
Endpoints:
  WebSocket: ws://localhost:${PORT}
  Health:    http://localhost:${PORT}/health
  Workers:   http://localhost:${PORT}/workers
  New Token: http://localhost:${PORT}/token

Waiting for workers to connect...
`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  workers.forEach(w => w.ws.close());
  wss.close();
  server.close();
  process.exit(0);
});
