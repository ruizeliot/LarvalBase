# Pipeline Worker Agent System

Distributed compute system for running pipeline workers on remote machines.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         VPS                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Coordinator Service                    Port 8765       │    │
│  │  - Accepts WebSocket connections                        │    │
│  │  - Manages worker registry                              │    │
│  │  - Dispatches jobs                                      │    │
│  │  - Streams output to supervisors                        │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ WebSocket (agent connects OUT)
                              │ No port forwarding needed!
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    User's Laptop                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Worker Agent                                           │    │
│  │  - Connects to coordinator                              │    │
│  │  - Receives jobs                                        │    │
│  │  - Executes commands (Claude, npm, etc)                │    │
│  │  - Streams output back                                  │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Start Coordinator (on VPS)

```bash
cd /home/claude/IMT/Pipeline-Office/agent
npm install
npm run coordinator
```

### 2. Get Connection Token

```bash
curl http://localhost:8765/token
# Returns: {"token":"ABC123XY","expiresIn":"1 hour"}
```

### 3. Run Worker Agent (on laptop)

```bash
# Copy worker-agent.js to laptop, then:
npm install ws uuid
node worker-agent.js --server wss://your-vps.com:8765 --token ABC123XY
```

## User Experience

```
$ node worker-agent.js

╔════════════════════════════════════════════════════════════╗
║           Pipeline Worker Agent v1.0                       ║
╚════════════════════════════════════════════════════════════╝

System: Anthony-Laptop
  CPU:  24 cores
  RAM:  64 GB
  OS:   win32 10.0.22631

Enter connection token (from coordinator): ABC123XY

Connecting to wss://pipeline.ingevision.cloud:8765...
Connected! Registering...

✓ Registered as: Anthony-Laptop
✓ Worker ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890

Status: IDLE - Waiting for jobs...
```

## API Endpoints (Coordinator)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/workers` | GET | List connected workers |
| `/token` | GET | Generate new connection token |
| `ws://` | WebSocket | Main communication channel |

## Message Protocol

### Agent → Coordinator

```javascript
// Register as worker
{ "type": "register", "token": "ABC123", "name": "My-Laptop", "cores": 24, "ram": 64, "os": "win32" }

// Job output (streaming)
{ "type": "output", "jobId": "job-123", "data": "Installing dependencies..." }

// Job complete
{ "type": "complete", "jobId": "job-123", "exitCode": 0 }

// Heartbeat response
{ "type": "pong" }
```

### Coordinator → Agent

```javascript
// Registration confirmed
{ "type": "registered", "workerId": "uuid", "message": "Welcome!" }

// New job to execute
{ "type": "job", "jobId": "job-123", "command": "claude", "args": ["/0a-pipeline"], "cwd": "/path/to/project" }

// Kill running job
{ "type": "kill", "jobId": "job-123" }

// Heartbeat
{ "type": "ping" }

// Error
{ "type": "error", "message": "Invalid token" }
```

### Supervisor → Coordinator

```javascript
// Register as supervisor
{ "type": "supervisor_register", "supervisorId": "sup-123" }

// Submit job
{ "type": "job_submit", "jobId": "job-123", "command": "claude", "args": [...], "supervisorId": "sup-123" }
```

### Coordinator → Supervisor

```javascript
// Workers list update
{ "type": "workers_update", "workers": [...], "pendingJobs": 0 }

// Job output (streaming)
{ "type": "job_output", "jobId": "job-123", "data": "..." }

// Job complete
{ "type": "job_complete", "jobId": "job-123", "exitCode": 0, "duration": 123.4 }
```

## Pipeline Integration

```bash
# Start pipeline with remote worker
./pipeline supervise /path/to/project --offload agent

# Coordinator assigns job to available worker
# Worker executes Claude session
# Output streams back to supervisor
```

## Security

- **Tokens**: One-time use, expire after 1 hour
- **No inbound ports**: Agent connects OUT (works behind NAT)
- **Heartbeat**: Dead connections detected within 30s

## Files

| File | Description |
|------|-------------|
| `coordinator.js` | WebSocket server (runs on VPS) |
| `worker-agent.js` | Worker client (runs on user's machine) |
| `package.json` | Dependencies |
| `README.md` | This file |

## Future Enhancements

- [ ] Web UI for worker management
- [ ] Persistent worker registration (database)
- [ ] Job priority queue
- [ ] Worker capacity tracking
- [ ] SSL/TLS for WebSocket
- [ ] Package as standalone executables (pkg)
