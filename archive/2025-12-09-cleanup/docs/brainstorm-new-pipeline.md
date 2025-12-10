# Brainstorm: Named Pipe Orchestration System

**Date:** 2025-12-03
**Status:** Prototype Complete (v7.0)

---

## The Idea

A self-spawning supervisor-worker system where:
1. One command spawns a supervisor
2. Supervisor spawns workers for each phase
3. Workers notify supervisor via **Named Pipes** (not polling files)
4. Supervisor kills worker, spawns next one
5. Fully automatic, works on Windows

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   YOU RUN:  claude -p "/pipeline-orchestrator --project ./my-app"           │
│                                                                             │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SUPERVISOR (Claude #1)                            │
│                                                                             │
│   1. Reads manifest.json → "currentPhase: 0a"                               │
│   2. Uses Bash tool to spawn worker (background)                            │
│   3. Runs: node pipe-listen.js (BLOCKS, waiting for message)                │
│   4. Worker sends "done:0a" via named pipe                                  │
│   5. Supervisor wakes up INSTANTLY                                          │
│   6. Updates manifest → "currentPhase: 0b"                                  │
│   7. Kills worker, spawns next one                                          │
│   8. Repeats until phase 3 done                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │  spawns via Bash
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            WORKER (Claude #2)                               │
│                                                                             │
│   • Executes phase tasks                                                    │
│   • When done, runs: node pipe-send.js my-project "done:0a"                 │
│   • Exits                                                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Named Pipe Communication (Windows)

```
                    \\.\pipe\pipeline-supervisor
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
        ▼                                           ▼
┌───────────────────┐                     ┌───────────────────┐
│    SUPERVISOR     │                     │      WORKER       │
│                   │                     │                   │
│  net.createServer │ ◄───── connect ──── │  net.connect()    │
│  .listen(pipePath)│                     │                   │
│                   │ ◄───── message ──── │  socket.write()   │
│  socket.on('data')│      "done:0a"      │  "done:0a"        │
│                   │                     │                   │
│  (wakes up!)      │                     │  socket.end()     │
└───────────────────┘                     └───────────────────┘
```

---

## Helper Scripts Needed

### .pipeline/pipe-listen.js (Supervisor uses this)

```javascript
// Blocks until a message arrives, then prints it and exits
const net = require('net');
const pipePath = '\\\\.\\pipe\\pipeline-' + process.argv[2]; // project ID

const server = net.createServer((socket) => {
  socket.on('data', (data) => {
    console.log(data.toString()); // Output message to stdout
    socket.end();
    server.close();
    process.exit(0);
  });
});

server.listen(pipePath);
console.error('Listening on ' + pipePath); // stderr for debug
```

### .pipeline/pipe-send.js (Worker uses this)

```javascript
// Sends a message to the pipe and exits
const net = require('net');
const pipePath = '\\\\.\\pipe\\pipeline-' + process.argv[2]; // project ID
const message = process.argv[3]; // e.g., "done:0a"

const client = net.connect(pipePath, () => {
  client.write(message);
  client.end();
  process.exit(0);
});
```

---

## Why Named Pipes vs Signal Files

| Aspect | Signal File (polling) | Named Pipe |
|--------|----------------------|------------|
| **Latency** | Up to 1 second | Instant (microseconds) |
| **CPU usage** | Constant polling | Zero (blocked waiting) |
| **Complexity** | Simple (just file I/O) | Needs helper scripts |
| **Reliability** | Can miss if file deleted | Connection-based, reliable |
| **Bidirectional** | No (one-way) | Yes (supervisor can reply) |

---

## Files Structure

```
.pipeline/
├── manifest.json        ← State tracking (currentPhase, etc.)
├── pipe-listen.js       ← Supervisor helper script
├── pipe-send.js         ← Worker helper script
└── pipeline.log         ← Debug logs
```

---

## Slash Commands Needed

1. `/pipeline-orchestrator` - The supervisor command
2. `/worker-phase-0a` - Worker for phase 0a
3. `/worker-phase-0b` - Worker for phase 0b
4. `/worker-phase-1` - Worker for phase 1
5. `/worker-phase-2` - Worker for phase 2
6. `/worker-phase-3` - Worker for phase 3

---

## Open Questions

1. How to handle worker crashes? (timeout + restart?)
2. How to handle phase 0a user approval? (interactive phase)
3. Should supervisor also expose an API for monitoring?
4. Integration with existing pipeline manifest format?

---

## Next Steps

- [x] Prototype pipe-listen.js and pipe-send.js
- [x] Test Claude spawning Claude via Bash
- [x] Build supervisor slash command (`/supervisor-pipeline-v7.0`)
- [x] Add pipe signals to all worker commands (phases 0a, 0b, 1, 2, 3)
- [ ] Test full flow on Windows (end-to-end)

---

## References

- Node.js Named Pipes: https://nodejs.org/api/net.html
- Claude Headless Mode: https://code.claude.com/docs/en/headless
- Windows Named Pipes: `\\.\pipe\<name>` format
