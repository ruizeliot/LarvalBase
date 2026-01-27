---
status: resolved
trigger: "When running `claude-brainstorm`, the spawned agent loads orchestrator instructions instead of brainstorming instructions"
created: 2026-01-27T00:00:00Z
updated: 2026-01-27T00:10:00Z
---

## Current Focus

hypothesis: CONFIRMED - spawn-orchestrator-wt.ps1 always copies orchestrator-v11.md, ignoring Phase 1 instructions
test: Reviewed claude-brainstorm.ps1 and spawn-orchestrator-wt.ps1
expecting: N/A - root cause found and fixed
next_action: Verify fix by running claude-brainstorm

## Symptoms

expected: Agent should act as Phase 1 brainstorming agent (interactive user story creation using AskUserQuestion, Live Canvas, etc.)
actual: Agent says "Starting Pipeline Orchestrator v11.0" and tries to check manifest status, tells user to run /brainstorm
errors: None - it's loading wrong instructions
reproduction: Run `claude-brainstorm` from PowerShell in a project directory
started: Current behavior

## Eliminated

(none - root cause found on first hypothesis)

## Evidence

- timestamp: 2026-01-27T00:00:00Z
  checked: PowerShell output during spawn
  found: Message says "Created orchestrator CLAUDE.md with project context and literal paths"
  implication: The script is explicitly creating an "orchestrator" CLAUDE.md when it should create a "brainstorm" one

- timestamp: 2026-01-27T00:01:00Z
  checked: claude-brainstorm.ps1 line 22 and 54
  found: Script copies phase-1.md to $ProjectPath/.claude/CLAUDE.md correctly
  implication: The Phase 1 source is correct, but it's copied to the wrong location

- timestamp: 2026-01-27T00:02:00Z
  checked: claude-brainstorm.ps1 line 102-103
  found: Calls spawn-orchestrator-wt.ps1 which creates isolated directory
  implication: The spawn script runs Claude in .pipeline/orchestrator/, not project root

- timestamp: 2026-01-27T00:03:00Z
  checked: spawn-orchestrator-wt.ps1 lines 37-39
  found: Always uses orchestrator-v11.md template regardless of caller
  implication: This is the BUG - the spawn script ignores what the caller wants

- timestamp: 2026-01-27T00:04:00Z
  checked: spawn-orchestrator-wt.ps1 line 160
  found: Sets location to $orchestratorDir (.pipeline/orchestrator/)
  implication: Claude reads CLAUDE.md from isolated directory, which has orchestrator instructions

- timestamp: 2026-01-27T00:10:00Z
  checked: phase-1.md template exists
  found: File exists and contains "# Phase 1: Brainstorm Facilitator (CLAUDE.md)"
  implication: Template is correct and ready to use

## Resolution

root_cause: spawn-orchestrator-wt.ps1 line 38 hardcodes orchestrator-v11.md template. claude-brainstorm.ps1 copies phase-1.md to project/.claude/CLAUDE.md, but the spawn script creates a SEPARATE isolated directory (.pipeline/orchestrator/) with the WRONG template. Claude runs in the isolated directory, so it reads the wrong CLAUDE.md.

fix: Added -Template parameter to spawn-orchestrator-wt.ps1 (defaults to orchestrator-v11.md for backward compatibility). Updated claude-brainstorm.ps1 to pass -Template "phase-1.md".

verification: Template file exists and contains correct Phase 1 content. Full verification requires running claude-brainstorm (manual test by user).

files_changed:
  - lib/spawn-orchestrator-wt.ps1: Added -Template parameter (line 8-9), changed template path to use parameter (line 41)
  - claude-brainstorm.ps1: Added -Template "phase-1.md" to spawn script call (line 103)
