# Orchestrator Todos

**Created:** 2026-01-08

---

## Todo 1: Get orchestrator PID

- Run `find-shell-pid.ps1` to get current shell's process ID
- Save to `.pipeline/orchestrator-pid.txt`
- Used later for message injection back to orchestrator

---

## Todo 2: Ask user about calibration

- AskUserQuestion: "Run calibration? (measures tokens-per-percent for cost tracking)"
- If yes: run `calibration-test.js`, save result to `calibration.json`
- If no: skip (use previous calibration if exists)

---

## Todo 3: Create .pipeline/ and manifest

- Create `.pipeline/` folder in project
- Copy `dashboard-v3.cjs` to `.pipeline/dashboard.cjs`
- Create `manifest.json` with:
  - version: "10.0.1"
  - status: "initializing"
  - currentPhase: "1"
  - orchestratorPid: (from todo 1)
  - dashboardPid: null
  - workerPid: null
  - supervisorPid: null
  - phases: 1-5 all "pending"
  - paneSizes: { workerSplit: 0.5, supervisorSplit: 0.5 }

---

## Todo 4: Spawn Dashboard

- Run `spawn-dashboard-wt.ps1`
- Creates NEW Windows Terminal window named "Pipeline-{OrchestratorPID}"
- Dashboard takes 100% of window initially
- Dashboard runs `node dashboard-v3.cjs` monitoring manifest
- Dashboard PID saved to manifest
- Layout after todo 4:
  ```
  +---------------------------+
  |                           |
  |         Dashboard         |
  |         (100%)            |
  |                           |
  +---------------------------+
  ```

---

## Todo 5: Wait for HEARTBEAT

- Dashboard sends HEARTBEAT message to orchestrator via injection
- Orchestrator STOPS and waits until message received
- HEARTBEAT confirms Dashboard is ready

---

## Todo 6: Spawn Worker

- Run `spawn-worker-wt.ps1`
- Adds Worker pane to EXISTING WT window (right side, 50% width)
- Worker CLAUDE.md prepared:
  - Source: `claude-md/phase-N.md` + `claude-md/_worker-base.md`
  - Destination: `project/.claude/CLAUDE.md`
- Worker Claude starts with `--dangerously-skip-permissions`
- Phase command injected after Claude ready
- Worker PID saved to manifest
- Layout after todo 6:
  ```
  +---------------------------+
  |           |               |
  | Dashboard |    Worker     |
  |   (50%)   |    (50%)      |
  |           |               |
  +---------------------------+
  ```

---

## Todo 7: Spawn Supervisor

- Run `spawn-supervisor-wt.ps1`
- Adds Supervisor pane to EXISTING WT window (below Worker, 50% of Worker area)
- Supervisor CLAUDE.md prepared:
  - Source: `claude-md/supervisor.md`
  - Destination: `project/.claude/CLAUDE.md`
- Supervisor Claude starts with `--model haiku --dangerously-skip-permissions`
- Startup message injected with reviewer instructions
- Supervisor PID saved to manifest
- Layout after todo 7:
  ```
  +---------------------------+
  |           |    Worker     |
  | Dashboard +---------------+
  |   (50%)   |  Supervisor   |
  +---------------------------+
  ```

---

## Todo 8: LOOP - HEARTBEAT: Check worker -> update manifest

- Triggered every 5 minutes by Dashboard HEARTBEAT message
- Check if Worker process is alive (Get-Process by PID)
- Read Worker console buffer (last 50 lines) via `read-console-buffer.ps1`
- Extract todo progress (X/Y completed)
- Update `manifest.phases[phase].workerProgress`

---

## Todo 9: LOOP - When worker dead: Check deliverables -> analyze

- Triggered when Worker process exits (detected in todo 8)
- Check phase deliverables exist:
  - Phase 1: `docs/user-stories.md`
  - Phase 2: `docs/test-specs.md`
  - Phase 3: `package.json` + `e2e/` folder
  - Phase 4: (pass)
  - Phase 5: `README.md`
- Kill Worker and Supervisor processes (`taskkill`)
- Set PIDs to null in manifest

---

## Todo 10: LOOP - Advance to next phase or complete

- If Phase 4 and more epics remain: increment currentEpic, go to todo 6
- If final phase (5 for new, 3 for feature): mark pipeline "complete", generate report
- Otherwise: increment currentPhase, update manifest, go to todo 6 (spawn new Worker)
