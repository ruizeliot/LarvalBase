# BUG-20260122-fix-agent-phases

**Status:** Fixed
**Date:** 2026-01-22
**Commit:** 3b13e2a

## User Story

> As a user, I expect that when I run `claude-fix` and describe a bug, the agent follows the structured phases pattern defined in fix-agent.md,
> but the agent was diverging from the flow after receiving the bug description.

## Acceptance Criteria

- [x] After user describes bug, agent presents interpretation in exact format from Phase 1 and waits for confirmation
- [x] Agent proceeds through Phase 2-8 sequentially, stopping at each human gate
- [x] Agent outputs match the templates defined in fix-agent.md

## Root Cause

The fix-agent.md (v3) was written as reference documentation rather than an imperative execution flow. Without a mechanism to track current phase (like TodoWrite), Claude treated the phases as suggestions rather than a strict state machine.

## Solution

Restructured fix-agent.md to v4 with:
1. Added "CRITICAL: Phase Enforcement" section making TodoWrite mandatory
2. Added explicit TodoWrite initialization block (8 phases) when user describes bug
3. Each phase now explicitly states "Mark Phase N in_progress"
4. Gates are more prominent with "STOP - GATE N" headers
5. Phase transitions are explicit: "When complete: Mark Phase X completed, proceed to Phase Y"

## Test Coverage

| Test Type | File | Description |
|-----------|------|-------------|
| Manual | N/A | Run claude-fix, describe bug, verify phase flow |

## Files Changed

- `claude-md/fix-agent.md` - Restructured from v3 to v4 with TodoWrite enforcement
- `claude-fix.ps1` - Added to repo (was untracked)

## Verification

- [x] Automated tests pass (N/A - prompt engineering)
- [x] User manually verified fix works

---

*This bug fix is documented to prevent regression and maintain project knowledge.*
