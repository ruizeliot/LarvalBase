# Codebase Concerns

**Analysis Date:** 2026-01-26

## Tech Debt

**Windows Terminal Process Detection (Unreliable PID capture):**
- Issue: `lib/process/spawn.cjs` (lines 163-179) falls back to timestamp as PID when actual Claude process PID detection fails
- Files: `lib/process/spawn.cjs`, `lib/process/pid.cjs`
- Impact: Worker process tracking becomes unreliable when PIDs can't be detected. Fallback timestamp may collide with other processes. Causes potential issues with:
  - Dashboard heartbeat detection
  - Process cleanup at phase completion
  - Supervisor assignment to wrong worker
- Fix approach: Implement Windows Terminal window grouping ID tracking instead of PID-based tracking. Use `wt -w "Pipeline-{id}"` window names as the primary identifier. See recent commit `ca9e82a` which partially addresses this.

**Message Injection via Windows Pipes (Fragile architecture):**
- Issue: `lib/process/inject.cjs` uses P/Invoke calls to Windows kernel APIs (WriteConsoleInput) to inject messages into Claude processes
- Files: `lib/process/inject.cjs`, `lib/spawn-dashboard-wt.ps1`
- Impact: High fragility due to:
  - Requires elevated permissions in some Windows configurations
  - Process must be attached/detached carefully to avoid console state corruption
  - No error recovery if AttachConsole fails mid-injection
  - Testing this requires actual Windows Terminal environment
- Fix approach: Replace with stdio-based message passing through a named pipe or network socket. This would be more reliable and testable.

**Dashboard State Persistence (Manual JSON writes):**
- Issue: `lib/dashboard-runner-v11.cjs` saves dashboard state to `dashboard-state.json` every 5 seconds (line 32)
- Files: `lib/dashboard-runner-v11.cjs`, `.pipeline/dashboard-state.json`
- Impact:
  - No atomic write protection - crash during write corrupts state
  - State file can drift from actual phase state if orchestrator updates manifest during write
  - No conflict resolution between concurrent writes
- Fix approach: Use read-update-write pattern with exclusive file locks or use manifest as single source of truth for state.

**Phase Transition Dependencies (Manual state coordination):**
- Issue: Phase transitions require coordinated updates across:
  - `manifest.json` (orchestrator updates)
  - Todo file (worker writes)
  - Dashboard state (dashboard updates)
- Files: `lib/orchestrator/handlers/phase-transition.cjs`, `lib/manifest/index.cjs`, `lib/dashboard-runner-v11.cjs`
- Impact: Race conditions if any component updates out of sync. Dashboard may show wrong phase while orchestrator is already starting next phase.
- Fix approach: Implement phase transition as atomic operation with transaction log.

---

## Known Bugs

**Supervisor Transcript Role Detection (BUG-20260122-supervisor-transcript):**
- Symptoms: Supervisor receives incorrect transcript context when worker PID detection fails
- Files: `lib/orchestrator/supervisor-check.cjs` (lines 25-89), `lib/hooks/__tests__/sync-todos.test.cjs`
- Trigger: When worker PID is fallback timestamp, supervisor check looks for wrong role identifier in transcript
- Workaround: Restart worker and orchestrator to force fresh PID detection
- Status: Fixed in commit `38f4705` - now filters todos by role and includes full transcript

**Worker Window Accumulation (Historical - v10):**
- Symptoms: PowerShell panes accumulate in Windows Terminal without closing after phase completion
- Files: `lib/spawn-worker-wt.ps1` (v10), fixed in v11 `lib/process/spawn.cjs` (line 139)
- Trigger: Worker process exit doesn't trigger pane close when `-NoExit` flag used
- Workaround: Manually close panes or run cleanup script
- Status: Fixed in v11 by removing `-NoExit` flag and implementing explicit pane cleanup

**Orchestrator Killing Wrong Windows (Historical - v10):**
- Symptoms: Orchestrator's shutdown kills all Terminal windows instead of just its session
- Files: Fixed in v11 with UUID-based window naming (`ca9e82a`)
- Trigger: Window targeting was by generic title instead of unique ID
- Status: Fixed - now uses `Pipeline-{orchestratorPid}` window groups

---

## Security Considerations

**P/Invoke Kernel API Access (Medium Risk):**
- Risk: `lib/process/inject.cjs` uses direct Windows kernel P/Invoke calls to access console input
- Files: `lib/process/inject.cjs` (lines 27-120)
- Current mitigation: Only used for heartbeat injection, not user input. Limited to legitimate console operations.
- Recommendations:
  - Document the security model
  - Consider sandboxing the injection mechanism
  - Add audit logging for all message injections

**PowerShell Execution Policy Bypass (Medium Risk):**
- Risk: `lib/process/spawn.cjs` (line 103) uses `-ExecutionPolicy Bypass` to spawn processes
- Files: `lib/process/spawn.cjs`
- Current mitigation: Only spawns Claude processes in controlled project directories
- Recommendations:
  - Use signed scripts instead of bypass
  - Document why bypass is necessary
  - Restrict to trusted project paths only

**Environment Variable Expansion in Commands (Low Risk):**
- Risk: Project paths are interpolated into PowerShell commands without proper escaping
- Files: `lib/process/spawn.cjs` (lines 149-154)
- Current mitigation: Paths are enclosed in single quotes
- Recommendations:
  - Add validation that project paths don't contain shell metacharacters
  - Use parameter binding instead of string interpolation

**Process Elevation (Admin) Requirements (Medium Risk):**
- Risk: Some console injection operations may require elevated privileges
- Files: `lib/process/inject.cjs`
- Current mitigation: Falls back to graceful error messages
- Recommendations:
  - Document which operations require elevation
  - Implement fallback mechanisms for non-elevated environments
  - Consider UAC prompt strategy

---

## Performance Bottlenecks

**Dashboard Refresh Interval (1 second ticks):**
- Problem: Dashboard refreshes every 1 second (line 31 in `dashboard-runner-v11.cjs`)
- Files: `lib/dashboard-runner-v11.cjs`
- Cause: Full console redraw happens on each refresh, consuming CPU
- Current capacity: ~60 refreshes/min on average hardware
- Limit: May exceed 100% CPU on slower systems or heavily loaded terminals
- Improvement path:
  - Implement incremental console updates (only redraw changed regions)
  - Increase refresh interval to 2-5 seconds
  - Cache formatted output to avoid re-calculating on each refresh

**Todo File I/O on Each Update:**
- Problem: Worker writes todo file synchronously on every status change
- Files: `lib/orchestrator/handlers/worker-monitor.cjs` (lines 74-77)
- Cause: No batching or debouncing of todo updates
- Impact: Orchestrator checks todos every 10 seconds, causing 6 file I/O operations/min per worker
- Improvement path:
  - Implement debounced todo writes (batch updates over 500ms window)
  - Use in-memory buffer with periodic flush
  - Consider event emitter instead of file polling

**Heartbeat Timeout Calculation (Linear array scan):**
- Problem: `supervisor-check.cjs` extracts transcript slice by scanning entire events array (lines 25-89)
- Files: `lib/orchestrator/supervisor-check.cjs`
- Cause: No index tracking for todo transitions
- Impact: O(n) operation for each todo completion check
- Current capacity: Handles ~1000 events efficiently, degrades at 10,000+ events per phase
- Improvement path:
  - Implement event index map keyed by todo content
  - Track todo state transitions in manifest instead of deriving from events
  - Cache transcript slices in manifest.todoBreakdown

**Manifest Validation on Every Phase:**
- Problem: `lib/manifest/validate.cjs` validates entire manifest schema on every phase transition
- Files: `lib/manifest/validate.cjs`, `lib/manifest/migrations.cjs`
- Cause: Full schema validation instead of incremental validation
- Impact: ~50-100ms validation time per phase transition
- Improvement path:
  - Cache validation results based on manifest hash
  - Only validate changed fields
  - Use lazy validation for optional fields

---

## Fragile Areas

**Windows Terminal Window Targeting (Prone to race conditions):**
- Files: `lib/process/spawn.cjs` (lines 154), `lib/spawn-*.ps1`
- Why fragile:
  - Window grouping ID is determined by orchestrator PID, but PID detection is unreliable
  - If orchestrator PID wrong, new panes go to wrong window group
  - Timing-sensitive: must check window exists before attaching to it
  - Race condition between pane creation and worker attachment
- Safe modification:
  - Always verify window exists before attaching
  - Use window ID instead of PID for targeting
  - Add retry logic with exponential backoff
- Test coverage: Limited - only integration tests with actual Windows Terminal

**Process Lifecycle Management (Unclear ownership):**
- Files: `lib/orchestrator/runner.cjs`, `lib/process/spawn.cjs`, `lib/process/inject.cjs`
- Why fragile:
  - Unclear when processes should be killed (phase end? orchestrator end? user interrupt?)
  - Multiple code paths attempt to kill same processes (potential race conditions)
  - PID tracking unreliable so kill operations may target wrong processes
- Safe modification:
  - Explicitly define process ownership model
  - Use window groups instead of PIDs for cleanup
  - Test kill operations thoroughly
- Test coverage: Partial - see `archive/2025-12-09-cleanup/tests/unit/worker-lifecycle.test.js`

**Supervisor Check Transcript Slicing (Complex logic):**
- Files: `lib/orchestrator/supervisor-check.cjs` (lines 25-89)
- Why fragile:
  - Must find exact start/end boundaries in event stream
  - Assumes todo content strings never change (mutable assumption)
  - Handles missing boundaries with silent fallback
  - Assistant message lookback (line 56) may grab wrong content
- Safe modification:
  - Add explicit event indexing instead of linear scan
  - Store todo boundaries in manifest.todoBreakdown
  - Test with various todo content patterns
- Test coverage: Added in commit `38f4705`

**Phase Transition State Machine (Many edge cases):**
- Files: `lib/orchestrator/handlers/phase-transition.cjs`, `lib/orchestrator/state-machine.cjs`
- Why fragile:
  - Must handle: phase complete, user restart, worker crash, supervisor feedback
  - State transitions have preconditions that aren't always enforced
  - No recovery path if transition fails mid-way
- Safe modification:
  - Document all valid state transitions
  - Add precondition checks before each transition
  - Implement rollback for failed transitions
- Test coverage: Partial - see `lib/orchestrator/__tests__/orchestrator.test.cjs`

---

## Scaling Limits

**Single Manifest File (v11):**
- Current capacity: ~10MB manifest file (100+ phases recorded)
- Limit: Node.js JSON parsing becomes slow >50MB
- Scaling path:
  - Archive old phases to separate files
  - Use streaming JSON parser for large manifests
  - Move phase history to separate history.json

**Todo File Polling (10-second intervals):**
- Current capacity: 5 workers × 6 checks/min = 30 file I/O ops/min
- Limit: File system may throttle at 100+ file operations/sec
- Scaling path:
  - Use file watchers instead of polling
  - Implement message queue for todo updates
  - Use shared database for todo state

**Dashboard Console Rendering (1-second refresh):**
- Current capacity: 1 dashboard process per orchestrator session
- Limit: Terminal output size limits rendering at ~50KB output/sec
- Scaling path:
  - Implement sparse rendering (only changed lines)
  - Use TUI library with partial screen updates
  - Move metrics to separate metrics window

**Transcript Event History (unbounded growth):**
- Current capacity: ~10,000 events before performance degrades
- Limit: Memory exhaustion after 100,000+ events (gigabyte of RAM)
- Scaling path:
  - Implement event archival (move old events to file)
  - Use circular buffer for real-time events
  - Sample events at lower frequency as phase progresses

---

## Dependencies at Risk

**PowerShell (Windows-only, Version-dependent):**
- Risk: Code relies on PowerShell 5.0+ features (like `-ExecutionPolicy` parameter)
- Impact: Breaks on very old Windows versions or PowerShell 2.0
- Migration plan:
  - Use native Windows APIs through .NET instead of PowerShell wrapping
  - Or detect PowerShell version and use fallback commands

**Windows Terminal (Distribution/Versioning risk):**
- Risk: Code requires Windows Terminal 1.x+, may break with Terminal 2.0+ API changes
- Impact: Future Terminal updates could break window grouping or pane spawning
- Migration plan:
  - Monitor Terminal releases for breaking changes
  - Consider fallback to conhost (older console host)
  - Implement feature detection instead of version checks

**Node.js child_process API (Stability risk):**
- Risk: Direct use of `spawn` and `execSync` without comprehensive error handling
- Impact: Unhandled process errors could crash orchestrator
- Migration plan:
  - Wrap with error boundaries
  - Use library like `execa` for more robust process handling
  - Add timeout protection to all spawn operations

---

## Missing Critical Features

**Process Recovery After Crash:**
- Problem: If worker crashes, orchestrator waits for heartbeat timeout (5 min) before detecting failure
- Blocks: Testing automated recovery, production reliability
- Recommendation: Implement aggressive crash detection and automatic worker restart

**Graceful Shutdown Sequence:**
- Problem: No coordinated shutdown - just kills processes
- Blocks: Cleanup operations, saving in-progress work, logging
- Recommendation: Implement signal handlers (SIGTERM) for graceful shutdown

**Transaction Logging:**
- Problem: No replay capability if crash happens during phase transition
- Blocks: Recovery from orchestrator crashes during manifest update
- Recommendation: Implement write-ahead log for all state changes

**Metrics Export:**
- Problem: Dashboard state is ephemeral - no export to metrics system
- Blocks: Historical analysis, trend detection, SLA tracking
- Recommendation: Export metrics to JSON/CSV after phase completion

---

## Test Coverage Gaps

**Windows Terminal Pane Lifecycle (Untested area):**
- What's not tested:
  - Pane creation race conditions
  - Window group targeting with unreliable PIDs
  - Cleanup of orphaned panes
- Files: `lib/process/spawn.cjs`, `lib/spawn-*.ps1`
- Risk: Production windows may accumulate orphaned panes without detecting
- Priority: **High** - directly impacts user experience

**Process Injection Edge Cases (Partially tested):**
- What's not tested:
  - P/Invoke failures in different Windows configurations
  - Message injection with special characters
  - Concurrent injection attempts
  - Process detach failures
- Files: `lib/process/inject.cjs`
- Risk: Silent injection failures may leave heartbeat unprocessed
- Priority: **High** - heartbeat is critical to phase completion detection

**Supervisor Check Transcript Extraction (Added coverage):**
- What's tested: Role detection, project path identification (commit `38f4705`)
- What's not tested:
  - Transcript with gaps in event sequence
  - Large transcript files (>1MB)
  - Todo content with newlines or special characters
- Files: `lib/orchestrator/supervisor-check.cjs`
- Risk: Supervisor may fail silently on edge case transcripts
- Priority: **Medium** - supervisor feedback is secondary validation

**Phase Transition Failures (Minimal coverage):**
- What's not tested:
  - Manifest corruption mid-transition
  - Worker crash during transition
  - Disk full during state write
  - Network timeout (if using remote state)
- Files: `lib/orchestrator/handlers/phase-transition.cjs`
- Risk: Phase may transition incorrectly, causing orphaned work
- Priority: **High** - state consistency is critical

**Dashboard State Consistency (No coverage):**
- What's not tested:
  - Concurrent manifest and dashboard state updates
  - Dashboard recovery after crash
  - State file corruption recovery
- Files: `lib/dashboard-runner-v11.cjs`, `lib/manifest/read-write.cjs`
- Risk: Dashboard may show wrong phase or cost
- Priority: **Medium** - UI inconsistency rather than data loss

---

*Codebase analysis: 2026-01-26*
