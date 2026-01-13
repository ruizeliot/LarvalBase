# Supervisor Behavior

**Created:** 2026-01-08

---

## Overview

Supervisor monitors Worker for rule violations. Uses Haiku model for cost efficiency.

---

## Startup

1. Spawned after Worker (Todo 7)
2. Loads `claude-md/supervisor.md` as CLAUDE.md
3. Receives startup message: "You are a Code Reviewer. Watch for rule violations."

---

## What Supervisor Monitors

Supervisor analyzes BOTH:
1. **Tool calls** - What actions Worker takes
2. **Text messages** - What Worker says/plans

---

## Violation Types

| Code | Violation | Indicators |
|------|-----------|------------|
| V1 | No mocking | "I'll mock this", `jest.mock()` calls |
| V2 | Limitation without WebSearch | "This doesn't work" without search |
| V3 | Synthetic events in E2E | `dispatchEvent()`, "I'll use synthetic" |
| V4 | Test cheating | "I'll change the test to..." |
| V5 | Empty handlers | `onClick={() => {}}` |
| V6 | AskUserQuestion in autonomous phase | AskUserQuestion tool in phase 2-5 |

---

## When Violation Found

1. Write to `.pipeline/violation.json`:
   ```json
   {
     "code": "V3",
     "description": "Synthetic event in E2E test",
     "evidence": "Worker wrote: dispatchEvent(new MouseEvent...)",
     "timestamp": "2026-01-08T12:34:56Z"
   }
   ```
2. Dashboard displays violation alert
3. Orchestrator decides action (warn or stop)

---

## Transcript Analysis

Orchestrator periodically sends transcript snippets to Supervisor.

Supervisor checks:
- Worker's reasoning for violation patterns
- Tool calls for forbidden patterns
- Decisions that skip requirements

---

## Known Issue: Incomplete Transcript Data (v11 TODO)

**Status:** Unresolved - needs fix in v11

### Problem

The supervisor only receives **tool calls and tool results**, but NOT the **assistant messages between tools**.

**Example transcript structure:**
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

### What Supervisor Receives
- Tool calls (#1, #4, #7)
- Tool results (#2, #5, #8)

### What Supervisor Does NOT Receive
- Assistant messages (#3, #6) - the worker's reasoning between tools

### Impact

Without assistant messages, supervisor cannot detect:
- Why the worker chose an approach
- What the worker noticed or decided
- Plans and reasoning that may indicate rule violations
- Shortcuts or bad decisions made in reasoning (before tool execution)

### Example Missed Violation

Worker thinks: "This drag-drop is hard to test. I'll just use dispatchEvent instead..."

This reasoning happens BEFORE the tool call. Supervisor only sees the Edit tool writing the code, not the decision to cheat.

### Proposed Solution (v11)

1. Modify transcript extraction to include assistant messages
2. Pass full transcript slice (tools + messages) to supervisor
3. Or: Parse JSONL directly to extract `role: "assistant"` entries

### Files to Modify
- `lib/dashboard-v3.cjs` - transcript analysis
- `lib/spawn-supervisor.ps1` - message injection
- `lib/supervisor-claude.md` - supervisor prompt
