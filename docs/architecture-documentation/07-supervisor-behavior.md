# Supervisor Behavior

**Created:** 2026-01-08
**Status:** Complete Reference

---

## Overview

The Supervisor is a Claude instance using the Haiku model that monitors Worker agents for rule violations. It runs alongside the Worker in a split pane, analyzing tool calls and text messages for forbidden patterns.

---

## Architecture

```
+---------------------------+
|           |    Worker     |
| Dashboard +---------------+
|   (50%)   |  Supervisor   |  ← Monitors Worker for violations
+---------------------------+
```

The Supervisor:
- Uses Claude Haiku model (cost-efficient for monitoring)
- Receives transcript snippets from Worker
- Writes violations to `.pipeline/violation.json`
- Dashboard displays alerts to user

---

## Startup Sequence

1. **Spawned after Worker** (Orchestrator Todo 7)
2. **CLAUDE.md loaded** from `claude-md/supervisor.md`
3. **Startup message injected:** "You are a Code Reviewer. Watch for rule violations."
4. **Begins monitoring** Worker transcript

### Spawn Command

```powershell
wt -w "Pipeline-$OrchestratorPid" split-pane -V -s 0.5 `
    --title "Supervisor" `
    pwsh -NoExit -Command "cd '$ProjectPath'; claude --model haiku --dangerously-skip-permissions"
```

---

## What Supervisor Monitors

Supervisor analyzes BOTH:

| Source | What It Contains | Violation Indicators |
|--------|------------------|---------------------|
| **Tool calls** | Actions Worker takes | `jest.mock()`, `dispatchEvent()`, empty handlers |
| **Text messages** | Worker's reasoning | "I'll mock this", "This doesn't work", "I'll change the test" |

---

## Violation Types

| Code | Violation | Trigger Indicators |
|------|-----------|-------------------|
| V1 | No mocking | "I'll mock this", `jest.mock()` calls, `vi.mock()` |
| V2 | Limitation without WebSearch | "This doesn't work", "known issue" without search |
| V3 | Synthetic events in E2E | `dispatchEvent()`, "I'll use synthetic", fake events |
| V4 | Test cheating | "I'll change the test to...", modifying test expectations |
| V5 | Empty handlers | `onClick={() => {}}`, placeholder functions |
| V6 | AskUserQuestion in autonomous | AskUserQuestion tool call in phase 2-5 |

---

## Violation Detection Flow

```
Worker executes task
        │
        ▼
Orchestrator extracts transcript snippet
        │
        ▼
Supervisor receives snippet
        │
        ▼
┌───────────────────┐
│ Analyze for V1-V6 │
└─────────┬─────────┘
          │
    Violation found?
          │
    YES   │   NO
    ▼     │   ▼
┌─────────┴───────────┐
│ Write violation.json│
│ Alert Dashboard     │
└─────────────────────┘
```

---

## Violation Output Format

When a violation is found, Supervisor writes to `.pipeline/violation.json`:

```json
{
  "code": "V3",
  "description": "Synthetic event in E2E test",
  "evidence": "Worker wrote: dispatchEvent(new MouseEvent...)",
  "timestamp": "2026-01-08T12:34:56Z",
  "workerTask": "Implement drag-drop test",
  "severity": "high"
}
```

### Orchestrator Response

| Severity | Action |
|----------|--------|
| `low` | Log warning, continue |
| `medium` | Display alert, continue |
| `high` | Stop Worker, require fix |

---

## Transcript Analysis

Orchestrator periodically sends transcript snippets to Supervisor for analysis.

### What Supervisor Checks

| Check | Purpose |
|-------|---------|
| Worker's reasoning | Detect violation patterns in thinking |
| Tool calls | Forbidden patterns in actions |
| Decisions | Shortcuts that skip requirements |
| Justifications | Invalid excuses for bad patterns |

---

## Known Issue: Incomplete Transcript Data

**Status:** Unresolved - needs fix in future version

### Problem

The supervisor only receives **tool calls and tool results**, but NOT the **assistant messages between tools**.

### Example Transcript Structure

```
1. [Tool Call: Read file.tsx]
2. [Tool Result: file contents...]

3. "I see the onClick is empty. I should add the real handler.    ← NOT RECEIVED
    Let me also check if I need to import the action..."          ← NOT RECEIVED

4. [Tool Call: Edit file.tsx]
5. [Tool Result: success]

6. "Good, now let me run the test to verify..."                   ← NOT RECEIVED

7. [Tool Call: Bash - npm test]
8. [Tool Result: test output]
```

### What Supervisor Receives vs. Misses

| Receives | Misses |
|----------|--------|
| Tool calls (#1, #4, #7) | Assistant messages (#3, #6) |
| Tool results (#2, #5, #8) | Worker's reasoning between tools |

### Impact

Without assistant messages, supervisor cannot detect:
- **Why** the worker chose an approach
- **What** the worker noticed or decided
- **Plans** that may indicate rule violations
- **Shortcuts** made in reasoning before tool execution

### Example Missed Violation

Worker thinks: "This drag-drop is hard to test. I'll just use dispatchEvent instead..."

This reasoning happens BEFORE the tool call. Supervisor only sees the Edit tool writing the code, not the decision to cheat.

### Proposed Solution

1. Modify transcript extraction to include assistant messages
2. Pass full transcript slice (tools + messages) to supervisor
3. Or: Parse JSONL directly to extract `role: "assistant"` entries

### Files to Modify

| File | Change |
|------|--------|
| `lib/dashboard-v3.cjs` | Include assistant messages in transcript analysis |
| `lib/spawn-supervisor.ps1` | Pass full transcript in message injection |
| `claude-md/supervisor.md` | Update supervisor prompt for full analysis |

---

## Supervisor CLAUDE.md Content

The supervisor receives focused instructions:

```markdown
# Supervisor Instructions

You are a Code Reviewer monitoring a Worker agent for rule violations.

## Your Job

1. Receive transcript snippets from the Worker
2. Analyze for violations V1-V6
3. Write violations to .pipeline/violation.json
4. Alert on high-severity violations

## Violation Codes

- V1: No mocking (jest.mock, vi.mock)
- V2: Limitation claim without WebSearch
- V3: Synthetic events in E2E
- V4: Test cheating (changing test to pass)
- V5: Empty handlers (onClick={() => {}})
- V6: AskUserQuestion in autonomous phase

## Output Format

When you detect a violation, write JSON to .pipeline/violation.json
```

---

## Version History

| Date | Change |
|------|--------|
| 2026-01-08 | Initial document |
| 2026-01-13 | Made standalone (added full architecture and detection flow) |
