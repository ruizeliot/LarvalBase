# Pipeline Orchestration System v7.0
## Named Pipe Architecture for Windows

**Date:** 2025-12-03
**Author:** Claude Code Pipeline Officer

---

## Executive Summary

A self-spawning supervisor-worker system where:
- One command spawns a supervisor Claude
- Supervisor spawns workers for each phase
- Workers notify supervisor via **Named Pipes** (instant, no polling)
- Fully automatic, works on Windows

---

## The Problem (v6.x)

```
┌─────────────────────────────────────────────────────────────┐
│  OLD WAY: File Polling                                      │
│                                                             │
│  Worker writes: .pipeline/worker-status.txt                 │
│                        ↓                                    │
│  Supervisor polls every 1-5 seconds                         │
│                        ↓                                    │
│  Detects change, advances phase                             │
│                                                             │
│  Problems:                                                  │
│  - CPU wasted on constant polling                           │
│  - 1-5 second latency                                       │
│  - Can miss signals if file deleted                         │
│  - Complex retry logic needed                               │
└─────────────────────────────────────────────────────────────┘
```

---

## The Solution (v7.0)

```
┌─────────────────────────────────────────────────────────────┐
│  NEW WAY: Named Pipes                                       │
│                                                             │
│  Supervisor blocks on: \\.\pipe\pipeline-myproject          │
│                        ↓                                    │
│  Worker connects and sends: "done:0a"                       │
│                        ↓                                    │
│  Supervisor wakes INSTANTLY (microseconds)                  │
│                                                             │
│  Benefits:                                                  │
│  - Zero CPU while waiting                                   │
│  - Instant notification                                     │
│  - Connection-based = reliable                              │
│  - Simple, clean code                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   YOU RUN:  /supervisor-pipeline-v7.0                                       │
│                                                                             │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SUPERVISOR (Claude #1)                            │
│                                                                             │
│   1. Reads manifest.json → "currentPhase: 0a"                               │
│   2. Spawns worker via: claude -p "/0a-..." --dangerously-skip-permissions  │
│   3. Runs: node pipe-listen.js myproject (BLOCKS)                           │
│   4. Worker sends "done:0a" via named pipe                                  │
│   5. Supervisor wakes up INSTANTLY                                          │
│   6. Updates manifest → "currentPhase: 0b"                                  │
│   7. Spawns next worker, repeats                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │  spawns via Bash
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            WORKER (Claude #2)                               │
│                                                                             │
│   • Executes phase tasks (brainstorm, build, test, etc.)                    │
│   • When done: node pipe-send.js myproject "done:0a"                        │
│   • Exits cleanly                                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Named Pipe Communication

```
                    \\.\pipe\pipeline-myproject
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

## Components Built

### 1. Helper Scripts

| File | Purpose | Location |
|------|---------|----------|
| `pipe-listen.js` | Supervisor blocks waiting for signal | `.pipeline/` |
| `pipe-send.js` | Worker sends completion signal | `.pipeline/` |

### 2. Supervisor Command

| File | Purpose |
|------|---------|
| `supervisor-pipeline-v7.0.md` | Orchestrates entire pipeline |

### 3. Updated Worker Commands

| Phase | Command | Signal Sent |
|-------|---------|-------------|
| 0a | `/0a-pipeline-desktop-brainstorm-v6.0` | `done:0a` |
| 0b | `/0b-pipeline-desktop-technical-v6.0` | `done:0b` |
| 1 | `/1-pipeline-desktop-bootstrap-v6.0` | `done:1` |
| 2 | `/2-pipeline-desktop-implementEpic-v6.0` | `done:2` |
| 3 | `/3-pipeline-desktop-finalize-v6.0` | `done:3` |

---

## Test Results

### Test 1: Manual Pipe Communication ✅

```bash
# Terminal 1 - Listener
$ node pipe-listen.js test-project 10000
[pipe-listen] Listening on \\.\pipe\pipeline-test-project
[pipe-listen] Waiting for worker signal...

# Terminal 2 - Sender
$ node pipe-send.js test-project "done:0a"
[pipe-send] Connecting to \\.\pipe\pipeline-test-project
[pipe-send] Connected, sending: done:0a
[pipe-send] Message sent successfully

# Terminal 1 - Output
done:0a
```

**Result:** Message received instantly.

---

### Test 2: Claude Spawning Claude ✅

```bash
# Start listener
$ node pipe-listen.js spawn-test2 30000 &

# Spawn Claude worker
$ claude -p "Execute this exact bash command: node .pipeline/pipe-send.js spawn-test2 hello-from-worker" \
    --dangerously-skip-permissions \
    --max-turns 5

# Listener output
hello-from-worker
```

**Result:** Spawned Claude successfully sent message via pipe.

---

## Comparison: v6 vs v7

| Aspect | v6 (File Polling) | v7 (Named Pipes) |
|--------|-------------------|------------------|
| **Detection Latency** | 1-5 seconds | Microseconds |
| **CPU Usage (waiting)** | Constant polling | Zero (blocked) |
| **Reliability** | Can miss if file deleted | Connection-based |
| **Code Complexity** | Retry logic, timeouts | Simple block/send |
| **Windows Support** | Yes | Yes |
| **Bidirectional** | No | Yes (future) |

---

## Pipeline Flow

```
┌────────┐     ┌────────┐     ┌────────┐     ┌────────┐     ┌────────┐
│ Phase  │     │ Phase  │     │ Phase  │     │ Phase  │     │ Phase  │
│   0a   │────▶│   0b   │────▶│   1    │────▶│   2    │────▶│   3    │
│        │     │        │     │        │     │        │     │        │
│Brainsrm│     │Tech Spc│     │Bootstrp│     │Implment│     │Finalize│
└────────┘     └────────┘     └────────┘     └────────┘     └────────┘
     │              │              │              │              │
     ▼              ▼              ▼              ▼              ▼
  done:0a        done:0b        done:1         done:2         done:3
     │              │              │              │              │
     └──────────────┴──────────────┴──────────────┴──────────────┘
                                   │
                                   ▼
                         Supervisor receives
                         each signal INSTANTLY
```

---

## Usage

### Starting a Pipeline

```bash
# In your project directory
claude

# Then type:
/supervisor-pipeline-v7.0
```

### What Happens

1. Supervisor reads manifest to get current phase
2. Spawns worker for that phase in background
3. Blocks waiting on named pipe
4. Worker completes phase and sends signal
5. Supervisor wakes up, advances to next phase
6. Repeat until Phase 3 complete

---

## Signal Protocol

Workers MUST signal completion by running:

```bash
# Get project ID from directory name
PROJECT_ID=$(basename "$(pwd)" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')

# Send completion signal via named pipe
node .pipeline/pipe-send.js "$PROJECT_ID" "done:$PHASE"

# Fallback: also write status file
echo "phase-complete:$PHASE" > .pipeline/worker-status.txt
```

---

## Error Handling

### Timeout (Worker Crash)

```bash
SIGNAL=$(node pipe-listen.js "$PROJECT_ID" 1800000)  # 30 min timeout
EXIT_CODE=$?

if [[ $EXIT_CODE -eq 2 ]]; then
  echo "TIMEOUT: Worker may have crashed"
  # Decision: retry or abort
fi
```

### Error Signal

Workers can send error signals:

```
error:0a:build failed
error:2:tests stuck
```

---

## What's Ready

| Component | Status |
|-----------|--------|
| `pipe-listen.js` | ✅ Complete |
| `pipe-send.js` | ✅ Complete |
| Manual pipe test | ✅ Verified |
| Claude spawn test | ✅ Verified |
| Supervisor command | ✅ Complete |
| Worker signals (all phases) | ✅ Updated |

---

## What's Next

| Item | Priority |
|------|----------|
| End-to-end test on real project | High |
| Error recovery (retry failed phases) | Medium |
| Progress streaming (bidirectional pipes) | Low |
| Cost tracking integration | Low |

---

## Conclusion

The Named Pipe Orchestration System v7.0 provides:

- **Instant** completion detection (microseconds vs seconds)
- **Zero-CPU** waiting (blocked vs polling)
- **Reliable** communication (connection-based)
- **Clean** code (simple block/send pattern)
- **Windows-native** support

Ready for end-to-end testing on a real project.

---

*Generated by Claude Code Pipeline Officer*
*2025-12-03*
