# BUG-20260122-supervisor-transcript

**Status:** Fixed
**Date:** 2026-01-22
**Commit:** 38f4705

## User Story

> As a pipeline supervisor, I expect to receive transcript slices showing the worker's activity when a todo completes,
> but the supervisor was not receiving any messages, and when it did, the transcript was missing the assistant's reasoning text.

## Acceptance Criteria

- [x] Supervisor receives messages only from the worker (not orchestrator or supervisor)
- [x] Hook correctly detects project path when worker runs from .pipeline/worker/ subdirectory
- [x] Transcript slice includes assistant reasoning text (not just tool calls)
- [x] 12 unit tests cover the fix

## Root Cause

Two issues:

1. **Wrong project path:** The `sync-todos.js` hook used `hookInput.cwd` directly as the project path. When workers run from `.pipeline/worker/` subdirectory, it looked for PID files at `.pipeline/worker/.pipeline/` which doesn't exist.

2. **Missing assistant text:** The `extractTranscriptSlice()` function set `startIndex` at the TodoWrite that marked the task as `in_progress`, but the assistant's explanatory text comes BEFORE that TodoWrite in the same message, so it was excluded from the slice.

## Solution

1. **Role detection:** Added `getRoleFromCwd()` to extract the role (worker/orchestrator/supervisor) from the cwd path. `isFromWorker()` now filters to only process worker todos.

2. **Project path fix:** `getProjectPath()` now detects when cwd contains `/.pipeline/` and returns the parent project directory.

3. **Transcript slice fix:** `extractTranscriptSlice()` now looks backwards from the TodoWrite to include any preceding `assistant_message` events.

## Test Coverage

| Test Type | File | Description |
|-----------|------|-------------|
| Unit | `lib/hooks/__tests__/sync-todos.test.cjs` | 6 tests for getRoleFromCwd() |
| Unit | `lib/hooks/__tests__/sync-todos.test.cjs` | 6 tests for getProjectPath() |

## Files Changed

- `lib/hooks/sync-todos.js` - New hook with role detection and project path fix
- `lib/hooks/__tests__/sync-todos.test.cjs` - 12 unit tests
- `lib/orchestrator/supervisor-check.cjs` - Include assistant text in transcript slice

## Verification

- [x] Automated tests pass (317/317)
- [x] User manually verified fix works

---

*This bug fix is documented to prevent regression and maintain project knowledge.*
