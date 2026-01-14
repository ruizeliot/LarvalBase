# Pipeline Architecture Documentation (Complete)

**Version:** v11 | **Updated:** 2026-01-14 | **Single-file compilation of all architecture docs**

---

# Table of Contents

1. [Overview & Key Principles](#1-overview--key-principles)
2. [Infrastructure (01-07)](#2-infrastructure)
   - [Pipeline Execution Flow](#21-pipeline-execution-flow)
   - [Orchestrator Todos](#22-orchestrator-todos)
   - [Dashboard Features](#23-dashboard-features)
   - [File Locations](#24-file-locations)
   - [Worker Startup](#25-worker-startup)
   - [Worker Rules](#26-worker-rules)
   - [Supervisor Behavior](#27-supervisor-behavior)
3. [v11 Overview & Phases (08-13)](#3-v11-overview--phases)
   - [New Pipeline Structure](#31-new-pipeline-structure)
   - [Phase 1: Discovery & Planning](#32-phase-1-discovery--planning)
   - [Phase 2: PM Agent](#33-phase-2-pm-agent)
   - [Phase 3: Test Architect](#34-phase-3-test-architect)
   - [Phase 4: Developer Agent](#35-phase-4-developer-agent)
   - [Phase 5: Quality Agent](#36-phase-5-quality-agent)
4. [Other Specs (14-26)](#4-other-specs)
   - [Mandatory Standards](#41-mandatory-standards)
   - [Analyzer v2 Design](#42-analyzer-v2-design)
   - [Outcome Correlation Spec](#43-outcome-correlation-spec)
   - [Analyzer Skills Spec](#44-analyzer-skills-spec)
   - [Step Mode Spec](#45-step-mode-spec)
   - [Unity Pipeline Overview](#46-unity-pipeline-overview)
   - [Unity MCP Setup](#47-unity-mcp-setup)
   - [Meta XR MCP Setup](#48-meta-xr-mcp-setup)
   - [Android Pipeline Overview](#49-android-pipeline-overview)
   - [Android Environment Setup](#410-android-environment-setup)
   - [Android Testing Setup](#411-android-testing-setup)
   - [Phase 1 Redesign](#412-phase-1-redesign)
   - [Live Canvas Spec](#413-live-canvas-spec)

---

# 1. Overview & Key Principles

## Key Principles (v11)

| Principle | Description |
|-----------|-------------|
| 1 Story = 1 E2E Test | Every user story maps to one E2E test |
| Three-Part Structure | Fixed Start -> Free Zone -> Fixed End (Phase 4) |
| Haiku Review Loops | Independent verification, score >= 95 |
| Ralph-Style Implementation | Autonomous loop until pass (max 20 iterations) |
| Write Immediately | Save brainstorm ideas after EVERY discussion |
| Outcome-Based Learning | User Likert ratings as ground truth |

## Phase Flow

```
PRE-PIPELINE (Interactive)     PIPELINE (Autonomous)
/brainstorm skill        -->   Phases 2-5 (orchestrator)
  |                              P2: PM Agent (creates user-stories.md)
  v                              P3: Test Architect (creates test-specs.md)
docs/brainstorm-notes.md         P4: Developer (implementation)
                                 P5: QA Agent (polish)
```

**v11 change:** Brainstorming creates ONLY `brainstorm-notes.md`. Phase 2 PM Agent creates `user-stories.md`.

## v11 TODO Status

| Feature | Status | Branch |
|---------|--------|--------|
| Feature Mode | Needs design | `feature/feature-mode` |
| Step Mode | Design complete, impl pending | `feature/step-mode` |
| Unity Pipeline | Design complete, MCP fixed | `feature/unity-pipeline` |
| Android Pipeline | Design complete | `feature/android-pipeline` |
| Analyzer v2 | Design complete | `feature/analyzer-v2` |
| Phase 1 Redesign | Design complete | `feature/phase-1-redesign` |

### Known Issues

- **Incomplete transcript data:** Supervisor/analyzer don't receive worker reasoning between tool calls
- **Skills not auto-triggered:** Autonomous workers must explicitly invoke skills

---

# 2. Infrastructure

## 2.1 Pipeline Execution Flow

### Architecture
Multi-window: Orchestrator coordinates Workers, Supervisors, Dashboard

### Execution Steps

| Step | Action |
|------|--------|
| 1 | User runs `/pipeline-launcher-v10` in project dir |
| 2 | Launcher copies `orchestrator.md` to `.claude/CLAUDE.md`, spawns orchestrator, injects BEGIN |
| 3 | Orchestrator initializes (Tasks 1-7) |
| 4 | Orchestrator monitors (Tasks 8-10 loop) |

### Orchestrator Initialization (Tasks 1-7)

| Task | Action | Output |
|------|--------|--------|
| 1 | Get orchestrator PID | `.pipeline/orchestrator-pid.txt` |
| 2 | Ask calibration (optional) | `calibration.json` |
| 3 | Create manifest | `.pipeline/manifest.json` (v10.0.1, phases 1-5 pending) |
| 4 | Spawn dashboard | New WT window, 100% dashboard |
| 5 | Wait for HEARTBEAT | Dashboard confirms ready |
| 6 | Spawn worker | Right pane 50%, phase CLAUDE.md loaded, command injected |
| 7 | Spawn supervisor | Below worker 50%, Haiku model, reviewer instructions |

### Window Layout Progression
```
Task 4:            Task 6:              Task 7:
+----------+       +-----+------+       +-----+------+
| Dashboard|  ->   |Dash |Worker|  ->   |Dash |Worker|
+----------+       +-----+------+       |     +------+
                                        |     |Super |
                                        +-----+------+
```

### Monitoring Loop (Tasks 8-10)

| Task | Trigger | Action |
|------|---------|--------|
| 8 | HEARTBEAT (5min) | Check worker alive, read console, update progress |
| 9 | Worker exit | Verify deliverables, kill worker+supervisor |
| 10 | Phase complete | Advance phase or complete pipeline |

### Phase Deliverables
- Phase 1: `docs/user-stories.md`
- Phase 2: `docs/test-specs.md`
- Phase 3: `package.json` + `e2e/`
- Phase 5: `README.md`

### Manifest Status
`initializing` | `running` | `checkpoint` | `complete` | `failed`

---

## 2.2 Orchestrator Todos

### Initialization (Todos 1-7)

| Todo | Action | Output |
|------|--------|--------|
| 1 | Get orchestrator PID via `find-shell-pid.ps1` | `.pipeline/orchestrator-pid.txt` |
| 2 | Ask calibration (optional) | `calibration.json` |
| 3 | Create `.pipeline/`, copy `dashboard-v3.cjs`, init manifest | `manifest.json` |
| 4 | Spawn dashboard via `spawn-dashboard-wt.ps1` | New WT window (100% dashboard) |
| 5 | Wait for HEARTBEAT from dashboard | Blocking sync |
| 6 | Spawn worker via `spawn-worker-wt.ps1` | Right pane (50%), inject phase command |
| 7 | Spawn supervisor via `spawn-supervisor-wt.ps1` | Below worker (Haiku model) |

**Window Layout Progression:**
- After Todo 4: Dashboard 100%
- After Todo 6: Dashboard 50% | Worker 50%
- After Todo 7: Dashboard 50% | Worker + Supervisor stacked

### Manifest Initial Schema

```json
{
  "version": "10.0.1",
  "status": "initializing",
  "currentPhase": "1",
  "orchestratorPid": "<pid>",
  "dashboardPid": null,
  "workerPid": null,
  "supervisorPid": null,
  "phases": { "1-5": { "status": "pending" } },
  "paneSizes": { "workerSplit": 0.5, "supervisorSplit": 0.5 }
}
```

### Monitoring Loop (Todos 8-10)

| Todo | Trigger | Action |
|------|---------|--------|
| 8 | HEARTBEAT (5 min) | Check worker alive, read console, update progress |
| 9 | Worker exit | Validate deliverables, kill processes |
| 10 | Deliverables OK | Advance phase or complete pipeline |

**Phase Deliverables:**

| Phase | Required |
|-------|----------|
| 1 | `docs/user-stories.md` |
| 2 | `docs/test-specs.md` |
| 3 | `package.json`, `e2e/` |
| 4 | varies |
| 5 | `README.md` |

**State Transitions:** 1 -> 2 -> 3 -> 4 (per epic) -> 5 -> Complete

### Status Values

| Status | Description |
|--------|-------------|
| `initializing` | Starting up |
| `running` | Worker executing |
| `checkpoint` | Paused for review |
| `complete` | All done |
| `failed` | Error |

### Scripts

| Script | Purpose |
|--------|---------|
| `find-shell-pid.ps1` | Get PID |
| `spawn-dashboard-wt.ps1` | Launch dashboard |
| `spawn-worker-wt.ps1` | Launch worker |
| `spawn-supervisor-wt.ps1` | Launch supervisor |
| `read-console-buffer.ps1` | Read worker output |

---

## 2.3 Dashboard Features

**File:** `lib/dashboard-v3.cjs` | Node.js terminal app for real-time pipeline monitoring

### Key Bindings

| Key | Action |
|-----|--------|
| `Up/Down` | Navigate phases/epics |
| `Tab` | Expand/collapse item |
| `Space` | Toggle API/SUB pricing |
| `Enter` | Manual heartbeat |
| `p` | Pause/resume heartbeat |
| `+/-` | Adjust heartbeat interval |
| `r` | Run analysis |
| `a` | Toggle auto-analysis |
| `q` | Quit |

### Phase Status Icons

| Icon | Status |
|------|--------|
| `o` dim | pending |
| `>` yellow | running |
| `Y` green | complete |
| `X` red | failed |
| `~` cyan | analysis running |
| `#` magenta | analysis complete |
| `!` yellow | no sessionId |

### Pricing Modes

| Mode | Display | Description |
|------|---------|-------------|
| **API** | `tok\|$` | Actual API cost (Opus/Sonnet/Haiku pricing) |
| **SUB** | `tok\|%\|$` | Subscription mode (% of 7-day allowance, $50/week) |

### Heartbeat System

- **Purpose:** Triggers orchestrator to read worker console and update progress
- **Default:** 5 min interval, configurable via +/- keys
- **Pausable:** P key toggle
- **Manual:** Enter key

### Auto-Analysis

- **Trigger:** Phase/epic completion
- **Script:** `spawn-analysis-worker.ps1`
- **Output:** `manifest.phases[N].analysis`
- **Examines:** Struggles, retries, issues, recommendations

### Files Used

| File | Purpose |
|------|---------|
| `.pipeline/manifest.json` | Main state (polled 1s) |
| `.pipeline/dashboard-state.json` | UI state (saved 5s) |
| `.pipeline/session-info.txt` | Worker session ID |

### Manifest Schema (Dashboard Fields)

```json
{
  "project": { "name": "...", "path": "..." },
  "status": "running|complete|failed",
  "mode": "new|feature",
  "currentPhase": "1-5",
  "stepMode": false,
  "phases": {
    "N": {
      "status": "pending|running|complete|failed",
      "duration": 2712000,
      "cost": 2.65,
      "tokens": { "regular": 125000, "cached": 50000 },
      "analysis": { "summary": "...", "issues": [], "recommendations": [] }
    }
  },
  "heartbeat": { "enabled": true, "intervalMs": 300000 }
}
```

---

## 2.4 File Locations

### Single Source of Truth

All CLAUDE.md content lives in `Pipeline-Office/claude-md/`:

| File | Purpose |
|------|---------|
| `orchestrator.md` | Orchestrator instructions |
| `_worker-base.md` | Shared worker rules (all phases) |
| `supervisor.md` | Supervisor instructions |
| `phase-1.md` to `phase-5.md` | Phase-specific instructions |

### Loading Rules

| Component | Source | Notes |
|-----------|--------|-------|
| Orchestrator | `claude-md/orchestrator.md` | Direct copy |
| Worker | `phase-N.md` + `_worker-base.md` | Concatenated |
| Supervisor | `claude-md/supervisor.md` | Direct copy |

**Destination:** `project/.claude/CLAUDE.md`

### Per-Project Files

```
<project>/
├── .pipeline/
│   ├── manifest.json        # Pipeline state
│   ├── dashboard.cjs        # Dashboard (copied)
│   ├── dashboard-state.json # Dashboard UI state
│   ├── orchestrator-pid.txt # Orchestrator PID
│   ├── session-info.txt     # Worker session ID
│   └── snapshots/           # Step mode iterations
├── .claude/CLAUDE.md        # Current instructions
└── docs/
    ├── brainstorm-notes.md  # Phase 1
    ├── user-stories.md      # Phase 1
    ├── test-specs.md        # Phase 2
    └── README.md            # Phase 5
```

### Pipeline-Office Library

| File | Purpose |
|------|---------|
| `lib/dashboard-v3.cjs` | Dashboard app |
| `lib/spawn-*-wt.ps1` | Window/pane spawners |
| `lib/inject-message.ps1` | Message injection |
| `lib/read-console-buffer.ps1` | Read worker output |

### Legacy (NOT Used)

- `Pipeline-Office/.claude/CLAUDE.md` - Should not exist
- `~/.claude/commands/worker-base*.md` - Legacy
- `lib/supervisor-claude.md` - Legacy

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `PIPELINE_OFFICE` | Path to Pipeline-Office repo |
| `PROJECT_PATH` | Current project path |

---

## 2.5 Worker Startup

### Overview
Orchestrator spawns workers with pre-prepared CLAUDE.md; only "BEGIN" trigger needed.

### CLAUDE.md Preparation

| Step | Action |
|------|--------|
| 1 | Copy `phase-N.md` to project `.claude/CLAUDE.md` |
| 2 | Append `_worker-base.md` (shared rules) |

**Result:** Combined file contains phase instructions, todo list, phase rules, shared rules.

### File Structures

**phase-N.md:** Purpose, Input/Output, Mode, Todo initialization, Step-by-step instructions

**_worker-base.md:** WebSearch first, No mocking, Completeness pairs, No placeholders, Todo tracking, Test investigation order

### Startup Injection
Single message: `BEGIN` - triggers worker to execute from CLAUDE.md content.

### Initialization Sequence
1. Claude Code launches with `--dangerously-skip-permissions`
2. CLAUDE.md auto-loaded
3. "BEGIN" received via injection
4. Todos initialized, first task `in_progress`
5. Execution begins

### Spawn Command
```powershell
wt -w "Pipeline-$OrchestratorPid" split-pane -H -s 0.5 --title "Worker" `
    pwsh -NoExit -Command "cd '$ProjectPath'; claude --dangerously-skip-permissions"
```

### Ready Detection
Watch console for prompt indicator, wait 2s stable, then inject BEGIN.

---

## 2.6 Worker Rules

Rules from `claude-md/_worker-base.md`. Mandatory and non-negotiable.

### Rule 1: WebSearch First

| When | Action |
|------|--------|
| Before implementing | WebSearch first |
| Error messages | Search exact error |
| Unfamiliar APIs | Search documentation |
| Claiming limitations | Search to verify, cite source |
| 2 failed attempts | Search alternatives |

### Rule 2: No Mocking

**FORBIDDEN:**
- `jest.mock()` / `vi.mock()` on system APIs
- Hardcoded fake data in production
- Test-only code paths (`if NODE_ENV === 'test'`)

**If test needs mock, FEATURE IS NOT IMPLEMENTED. Fix it.**

### Rule 3: Completeness Pairs

**Must implement both halves:**

| Action | Pair |
|--------|------|
| Add/Create | Delete/Remove |
| Open/Expand | Close/Collapse |
| Connect | Disconnect |
| Show | Hide |
| Enable | Disable |
| Select | Deselect |
| Start | Stop/Pause |
| Zoom in | Zoom out |
| Lock | Unlock |

### Rule 4: No Placeholders

**FORBIDDEN:** Empty handlers, console.log stubs, alert placeholders, handlers without actions

**If it looks interactive, it MUST be interactive.**

### Rule 5: Todo Tracking

| Rule | Description |
|------|-------------|
| Initialize at startup | From phase instructions |
| One `in_progress` | At a time |
| Mark `completed` | Immediately when done |
| Never modify content | Only change `status` |
| Sequential execution | Task N before N+1 |

### Rule 6: Test Investigation Order

1. **FIRST** - Check implementation (is code wrong?)
2. **THEN** - Check test (is test wrong?)

**Never fix test without verifying implementation first.**

### Rule 7: No Test Cheating

**Never change what test verifies to avoid hard implementation.**

Self-check: "Does test still verify ORIGINAL requirement?" If no, revert.

### Rule 8: Edge Case Matrix

Every E2E test must cover 2+ edge cases:

| Category | Examples |
|----------|----------|
| Empty state | No items, first item |
| Boundaries | Min/max values |
| Invalid input | Empty, special chars |
| Rapid actions | Double-click, spam |
| Interruption | Action during loading |
| State conflicts | Delete while editing |

### Rule 9: Code Patterns First

Read existing code before implementing. Reduces edits, prevents inconsistencies.

### Rule 10: Git Discipline

Commit at phase end. Format: `<type>(<scope>): <description>`

| Phase | Type |
|-------|------|
| 1 | `docs` |
| 2 | `test` |
| 3-4 | `feat` |
| 5 | `chore` |

### Rule 11: Autonomous Execution

Phases 2-5: No user interaction. Make decisions, keep trying.
Phase 1: Exception - uses AskUserQuestion.

### Summary

**MUST:** WebSearch first, read existing patterns, implement pairs, handle edge cases, check code before test, update todos, commit at phase end

**MUST NOT:** Mock APIs, fake data, test-only paths, placeholders, one-sided actions, test cheating, modify todo content, ask users (phases 2-5)

---

## 2.7 Supervisor Behavior

### Overview

Haiku-based Claude instance monitoring Workers for rule violations. Runs in split pane, analyzes tool calls/text, writes violations to `.pipeline/violation.json`.

### Architecture

| Component | Role |
|-----------|------|
| Model | Claude Haiku (cost-efficient) |
| Input | Worker transcript snippets |
| Output | `.pipeline/violation.json` |
| Display | Dashboard alerts |

### Violation Codes

| Code | Violation | Triggers |
|------|-----------|----------|
| V1 | No mocking | `jest.mock()`, `vi.mock()` |
| V2 | Limitation without search | "doesn't work" without WebSearch |
| V3 | Synthetic E2E events | `dispatchEvent()`, fake events |
| V4 | Test cheating | Changing test expectations |
| V5 | Empty handlers | `onClick={() => {}}` |
| V6 | AskUserQuestion | Tool call in phases 2-5 |

### Output Format

```json
{
  "code": "V3",
  "description": "Synthetic event in E2E test",
  "evidence": "Worker wrote: dispatchEvent...",
  "timestamp": "2026-01-08T12:34:56Z",
  "workerTask": "Implement drag-drop test",
  "severity": "high"
}
```

### Severity Response

| Severity | Action |
|----------|--------|
| low | Log, continue |
| medium | Alert, continue |
| high | Stop Worker, require fix |

### Known Issue: Incomplete Transcript

**Problem:** Supervisor receives tool calls/results only, NOT assistant messages between tools.

**Impact:** Cannot detect Worker reasoning, plans, or shortcuts before tool execution.

**Solution:** Modify transcript extraction to include assistant messages in:
- `lib/dashboard-v3.cjs`
- `lib/spawn-supervisor.ps1`
- `claude-md/supervisor.md`

---

# 3. v11 Overview & Phases

## 3.1 New Pipeline Structure

**Key Principle:** 1 User Story = 1 E2E Test | BMAD-inspired agent separation

### Phases & Agents

| Phase | Name | Agents | Mode |
|-------|------|--------|------|
| 1 | Discovery & Planning | Analyst, UX Designer, PM, Architect, Test Architect | Interactive/Autonomous |
| 2 | Implementation | Developer | Autonomous (per epic) |
| 3 | Quality | QA, Tech Writer | Autonomous |

### User Modes

| Mode | Target | Interaction | Best For |
|------|--------|-------------|----------|
| **User** | Non-devs | Final approval only | Quick prototypes |
| **Dev** | Developers | Each major decision | Specific requirements |

### Phase 1: Discovery & Planning

| Agent | Output |
|-------|--------|
| Analyst (Mary) | `docs/project-brief.md` |
| UX Designer (Sally) | `docs/brainstorm-notes.md` |
| PM (John) | `docs/user-stories.md` |
| Architect (Winston) | `docs/architecture.md` |
| Test Architect (Murat) | `docs/test-specs.md` |

**Flow:** Analyst → UX Designer → PM → Architect → Test Architect (each reads prior docs)

### Phase 2: Implementation

Per epic: Read specs → Write E2E (RED) → Implement (GREEN) → Commit → Next epic

### Phase 3: Quality

Tasks: Run all tests → Fix issues → Optimize → Document → Deploy artifacts

### File Structure

```
Pipeline-Office/claude-md/
├── agents/          # analyst.md, ux-designer.md, pm.md, architect.md, test-architect.md, developer.md, qa.md, tech-writer.md
├── shared/rules.md  # Universal rules
└── workflows/       # user-mode.md, dev-mode.md
```

### Manifest Schema (Key Fields)

```json
{
  "version": "11.0.0",
  "userMode": "dev|user",
  "currentPhase": "1|2|3",
  "currentAgent": "analyst|ux-designer|pm|architect|test-architect|developer|qa|tech-writer",
  "phases": {
    "1": { "agents": { "<name>": { "status": "pending|running|complete" } } },
    "2": { "currentEpic": 1 },
    "3": { "status": "pending" }
  }
}
```

### v10 vs v11

| Aspect | v10 | v11 |
|--------|-----|-----|
| Phase 1 | 1 agent, 18 todos | 5 agents, focused |
| Agent files | Monolithic | `agents/*.md` |
| Story-test mapping | Loose | Strict 1:1 |
| User modes | None | User/Dev modes |

---

## 3.2 Phase 1: Discovery & Planning

**Version:** v11 | **Status:** Under Review

### Overview

Sequential agent flow: **Brainstorm Facilitator** -> **PM** -> **Test Architect**

| Agent Output | File |
|--------------|------|
| Brainstorm Facilitator | `docs/brainstorm-notes.md` |
| PM | `docs/user-stories.md` |
| Test Architect | `docs/test-specs.md` |

**Stack:** Tauri v2, React+TS, Rust, Tailwind, Vitest, WebdriverIO

### Agent Skills (Manual Invocation Required)

| Skill | When | Purpose |
|-------|------|---------|
| `brainstorming` | Phase start | Design refinement, Socratic questioning |
| `tauri` | Todo 3 | Desktop patterns, Tauri v2 conventions |

### Built-in Capabilities

| Capability | Tool/Format |
|------------|-------------|
| Show Mockup | ASCII art |
| Ask Clarifying Question | AskUserQuestion tool |
| WebSearch | WebSearch tool |

### Technique Library (From BMAD)

| Category | Key Techniques |
|----------|----------------|
| **Empathize** | Empathy Mapping, Journey Mapping, Jobs to be Done |
| **Define** | Problem Framing, How Might We, Affinity Clustering |
| **Ideate** | Brainstorming, Crazy 8s, SCAMPER |
| **Prototype** | Paper Prototyping, Storyboarding |
| **Diagnosis** | Five Whys, Fishbone, Is/Is Not Analysis |

### Todo Summary

| # | Todo | Capabilities | Effort | Loop |
|---|------|--------------|--------|------|
| 1 | Ask what app is about | None | 5% | - |
| 2 | Deeper clarifying questions | Ask Question | 10% | - |
| 3 | Research similar apps | WebSearch + `tauri` skill | 10% | A-start |
| 4 | Show concept mockup | Show Mockup | 10% | A |
| 5 | Present layout options | Show Mockup, Ask | 15% | A |
| 6 | Refine chosen layout | Show Mockup | 12% | A-exit |
| 7 | Drill into specific areas | Show Mockup, Ask | 10% | B-start |
| 8 | Map user journey | Show Mockup | 8% | B-exit |
| 9 | Define scope | Ask Question | 5% | C-start |
| 10 | Final mockup confirmation | Show Mockup | 8% | C-exit |
| 11 | Create brainstorm-notes.md | None | 7% | - |

### Loop Groups

- **Loop A (3-6):** Research & Design - Exit when layout approved
- **Loop B (7-8):** Detail & Journey - Exit when journey approved
- **Loop C (9-10):** Scope & Confirmation - Exit on approval, can escape to A

### Flow

```
Todo 1-2 (Questions)
    |
    v
LOOP A: 3->4->5->6 (Research & Design)
    |
    v
LOOP B: 7<->8 (Detail & Journey)
    |
    v
LOOP C: 9<->10 (Scope & Confirm) --escape--> LOOP A
    |
    v
Todo 11: Write brainstorm-notes.md
```

### Removed

| Todo | Reason |
|------|--------|
| Define visual style | ASCII terminal limitation |
| User picks direction | Merged into Todo 5 |

---

## 3.3 Phase 2: PM Agent

**Version:** v11 | **Status:** Under Review

### Overview

Transforms brainstorm output into user stories. **Autonomous mode.**

- **Input:** `docs/brainstorm-notes.md`
- **Output:** `docs/user-stories.md`

### Agent Skills

| Skill | When | Purpose |
|-------|------|---------|
| `tauri` | Todo 1 (after reading brainstorm) | Desktop capabilities, platform constraints |

**Note:** Skills must be explicitly invoked in autonomous mode.

### Mandatory Standards (Auto-added in Todo 9)

| Standard | Story |
|----------|-------|
| Keyboard Nav | Tab/Enter/Space for all elements |
| Focus Indicators | Visible focus on all focusable elements |
| Screen Reader | aria-labels on buttons/inputs |
| Completeness Pairs | Both halves of every action |

### Completeness Pairs Reference

| Action | Pair |
|--------|------|
| Add/Create | Delete/Remove |
| Open/Expand | Close/Collapse |
| Show | Hide |
| Enable | Disable |
| Connect | Disconnect |
| Select | Deselect |
| Start | Stop |
| Lock | Unlock |
| Pin | Unpin |

### Todos Summary

| # | Todo | Key Rules | Effort |
|---|------|-----------|--------|
| 1 | Read brainstorm-notes.md | Invoke `tauri` skill after | 5% |
| 2 | Define epics | 3-7 epics, no "App Shell" epics, independently testable | 10% |
| 3 | Generate stories | "As a user..." format, 2-5 acceptance criteria each | 15% |
| 4 | Split/merge for 1:1 E2E | 3-10 stories per epic, each = 1 E2E test | 10% |
| 5 | **VERIFY: Granularity** | Haiku review, score ≥95, max 3 retries | 5% |
| 6 | Order by dependency | Prerequisites first | 5% |
| 7 | Check completeness pairs | Add missing halves | 10% |
| 8 | Check UI coverage | Every mockup element needs a story | 10% |
| 9 | Add mandatory a11y stories | US-A11Y-001 to 004 | 5% |
| 10 | **VERIFY: Completeness** | Haiku review, score ≥95, max 3 retries | 5% |
| 11 | Create user-stories.md | Final document with epic index | 20% |

### Mandatory A11Y Stories

| ID | Story | Criteria |
|----|-------|----------|
| US-A11Y-001 | Keyboard navigation | Tab reaches all elements; Enter/Space activates |
| US-A11Y-002 | Focus visibility | Visible focus indicator on all focusable |
| US-A11Y-003 | Escape closes modals | Pressing Escape closes any modal/dialog |
| US-A11Y-004 | Screen reader support | All buttons/inputs have aria-labels |

### Review Loop Protocol

```
Score >= 95? → Proceed
Score < 95?  → Fix & retry (max 3) → Escalate if 3 failures
```

### Flow

```
Read notes → Define epics → Generate stories → Split/merge
    → [VERIFY granularity] → Order → Check pairs → Check UI
    → Add a11y → [VERIFY completeness] → Create user-stories.md
```

---

## 3.4 Phase 3: Test Architect

**Version:** v11 | **Mode:** Autonomous | **Input:** `docs/brainstorm-notes.md`, `docs/user-stories.md` | **Output:** `docs/test-specs.md`

### Core Principle

**1 Story = 1 E2E Test** - Story complete = Test passes. Test ID matches story ID (US-EPIC-001 -> TEST-EPIC-001).

### Agent Skills (Manual Invocation Required)

| Skill | When | Purpose |
|-------|------|---------|
| `tauri` | Todo 1 | Tauri v2 E2E patterns, WebdriverIO |
| `test-driven-development` | Todo 3 | TDD principles, assertions |
| `integration-test-setup` | Todo 6 | Test infrastructure, fixtures |

### Mandatory Standards

| Standard | Requirement |
|----------|-------------|
| Keyboard Navigation | E2E: Tab/Enter/Space full navigation |
| Focus Indicators | Visible focus on all interactive elements |
| Edge Cases | 2+ per test from matrix |
| No Synthetic Events | Real WebdriverIO actions only |

### Todos Summary

| # | Todo | Skills | Effort |
|---|------|--------|--------|
| 1 | Read user-stories.md | `tauri` | 5% |
| 2 | Risk assessment (P0/P1/P2) | - | 10% |
| 3 | Define E2E spec per story | `test-driven-development` | 25% |
| 4 | VERIFY: 1:1 mapping (Haiku, >=95) | - | 5% |
| 5 | Add edge cases (2+ per test) | - | 15% |
| 6 | Define test data requirements | `integration-test-setup` | 10% |
| 7 | VERIFY: Test quality (Haiku, >=95) | - | 5% |
| 8 | Create test-specs.md | - | 25% |

### Risk Levels

| Level | Description | Examples |
|-------|-------------|----------|
| P0 | Critical - data integrity, security | Save/load, auth, main workflow |
| P1 | Important - main features | Search, filter, edit |
| P2 | Nice-to-have - polish | Animations, shortcuts |

### Edge Case Matrix (Pick 2+ per test)

| Category | Edge Cases |
|----------|------------|
| Empty state | No items, first item, single item |
| Boundaries | Min/max value, at limit |
| Invalid input | Empty string, special chars, too long |
| Rapid actions | Double-click, spam, drag cancel |
| Interruption | Action during loading, mid-drag escape |
| State conflicts | Delete while editing, move while drag |

### Test Spec Format

```markdown
### TEST-EPIC-001: [Name]
**Story:** US-EPIC-001 | **Priority:** P0/P1/P2

**Preconditions:** [Setup state]
**Steps:** [Real user actions]
**Expected Result:** [Verifies acceptance criteria]
**Edge Cases:** [2+ from matrix]
**Test Data:** [Fixtures needed]
```

### No Mocking Policy

- NEVER mock: Tauri, filesystem, dialog, system APIs
- ONLY mock: External third-party APIs (if unavoidable)
- If test needs mock -> implementation is incomplete

### Review Loops (Todos 4, 7)

Score >= 95 -> Proceed | Score < 95 -> Fix & retry (max 3) -> Escalate

### Output Document Structure

```markdown
# Test Specifications
## Risk Matrix (Epic | Level | Rationale)
## Test Index (Test ID | Story ID | Name | Priority)
## Epic N: [Name]
### TEST-EN-001: [Spec]
```

---

## 3.5 Phase 4: Developer Agent

**Version:** v11 | **Mode:** Autonomous (TDD with Ralph-style loop)

### Structure Overview

| Zone | Todos | Purpose |
|------|-------|---------|
| **FIXED START** | 1-2 | Read docs, setup skeleton |
| **FREE ZONE** | 3-6 | Per-story TDD loop (autonomous) |
| **FIXED END** | 7-11 | Verify, detect violations, commit |

**Input:** `docs/brainstorm-notes.md`, `docs/user-stories.md`, `docs/test-specs.md`
**Output:** Working implementation (all E2E tests GREEN)

### Agent Skills (Must invoke explicitly)

| Skill | When |
|-------|------|
| `tauri` | Todo 1 (after reading docs) |
| `test-driven-development` | Todo 3 (before E2E test) |
| `systematic-debugging` | Todo 4 (stuck 3+ iterations) |
| `e2e-rapid-fix` | Todo 4 (E2E keeps failing) |
| `react-component-generator` | Todo 4 (React components) |
| `tailwind-class-optimizer` | Todo 4 (styling) |
| `verification-before-completion` | Todo 8 (pre-commit) |

### Todos

#### FIXED START

| # | Todo | Output | Effort |
|---|------|--------|--------|
| 1 | Read planning docs | Mental model | 5% |
| 2 | Setup skeleton (Tauri v2 + React + TypeScript + Tailwind + Vitest + WebdriverIO) | Building empty app | 10% |

#### FREE ZONE (Per Story)

| # | Todo | Description | Effort |
|---|------|-------------|--------|
| 3 | Write E2E test (RED) | Real actions only, no synthetic events | 10% |
| 4 | **IMPLEMENTATION LOOP** | Autonomous until GREEN, max 20 iterations | 40% |
| 5 | VERIFY: Story complete | Haiku review (>= 95), max 3 retries | 5% |
| 6 | Repeat 3-5 | For all stories in epic | - |

#### FIXED END (Per Epic)

| # | Todo | Description | Effort |
|---|------|-------------|--------|
| 7 | VERIFY: Epic complete | Haiku review (>= 95) | 5% |
| 8 | Run detection commands | Fix any violations | 3% |
| 9 | Commit epic | `feat(epic-N): implement [Name]` | 2% |
| 10 | Repeat 3-9 | For all epics | - |
| 11 | VERIFY: All complete | Final Haiku review | 5% |

### Implementation Loop (Todo 4)

```
Agent works freely → Run E2E → PASS? → Exit to Todo 5
                              FAIL? → Iteration++ → Continue
                              20+ iterations? → ESCALATE
```

**Progress file:** `.pipeline/implementation-progress.json`
```json
{ "currentStory": "US-E1-001", "iteration": 5, "maxIterations": 20, "testStatus": "failing", "lastError": "..." }
```

### Detection Commands (Todo 8)

Must return empty before commit:
```bash
grep -rn "onClick={() => {}}" src --include="*.tsx"           # Empty handlers
grep -rn "onClick={() => console" src --include="*.tsx"       # Console placeholders
grep -rn "<button[^>]*>[^<]*</button>" src --include="*.tsx" | grep -v "onClick"  # No handler
grep -rn "jest.mock.*tauri\|vi.mock.*tauri" src --include="*.ts" --include="*.tsx"  # Mocking
```

### Forbidden Patterns

| Pattern | Example |
|---------|---------|
| Empty handlers | `onClick={() => {}}` |
| Console placeholders | `onClick={() => console.log('TODO')}` |
| Mocking Tauri | `jest.mock('@tauri-apps/...')` |
| Test-only paths | `if (NODE_ENV === 'test')` |
| Synthetic events | `browser.execute(() => el.dispatchEvent(...))` |

### Completeness Pairs (Must implement both)

| Action | Pair |
|--------|------|
| Add/Create | Delete/Remove |
| Open/Expand | Close/Collapse |
| Show | Hide |
| Enable | Disable |
| Connect | Disconnect |
| Select | Deselect |

### E2E Test Rules

```
ALLOWED: $('sel').click(), .setValue('text'), .dragAndDrop($('target')), browser.keys([])
FORBIDDEN: browser.execute(), jest.mock(), vi.mock(), store.dispatch()
```

### Commit Format

```
feat(epic-1): implement [Epic Name]

Stories: US-E1-001, US-E1-002, US-E1-003
Tests: 3 E2E passing

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 3.6 Phase 5: Quality Agent

**Version:** v11 | **Mode:** Autonomous | **Input:** Implemented app (tests GREEN) | **Output:** Production-ready app + README

### Agent Skills

| Skill | Invoke At | Purpose |
|-------|-----------|---------|
| `tauri` | Todo 1 | Build config |
| `verification-before-completion` | Todo 3 | Pre-release checklist |
| `bottleneck-identifier` | Todo 7 | Performance/UX analysis |
| `secret-scanner` | Todo 9 | Security scan |

**Note:** Skills require explicit invocation in autonomous mode.

### Standards Verification

| Standard | Method |
|----------|--------|
| Keyboard Navigation | Tab/Enter/Space through entire app |
| Focus Indicators | Visual inspection |
| Screen Reader | axe-core audit |
| Production E2E | WebdriverIO against RELEASE build |

### Todos Summary

| # | Task | Capabilities | Skills | Effort |
|---|------|--------------|--------|--------|
| 1 | Run test suite (PROD BUILD) | - | `tauri` | 5% |
| 2 | VERIFY: No regressions | Review Loop | - | 5% |
| 3 | Smoke test all UI elements | Smoke Testing | `verification-before-completion` | 15% |
| 4 | VERIFY: Smoke coverage | Review Loop | - | 5% |
| 5 | axe-core accessibility audit | - | - | 5% |
| 6 | VERIFY: A11y compliance | Review Loop | - | 5% |
| 7 | Nielsen heuristics check | UX Review | `bottleneck-identifier` | 10% |
| 8 | VERIFY: UX quality | Review Loop | - | 5% |
| 9 | Tauri build | Build | `secret-scanner` | 10% |
| 10 | VERIFY: Build succeeds | Review Loop | - | 5% |
| 11 | Generate README | Documentation | - | 10% |
| 12 | VERIFY: Docs complete | Review Loop | - | 5% |
| 13 | Final commit + tag | - | - | 5% |
| 14 | VERIFY: Deployment ready | Review Loop | - | 5% |

### Key Rules

#### Production E2E Config
```javascript
// wdio.conf.js - use RELEASE build
capabilities: [{ 'tauri:options': { application: '../src-tauri/target/release/app' }}]
```

#### Review Loop Protocol
- Pass threshold: >= 95
- Max 3 attempts before escalate
- Haiku reviewer spawned for each VERIFY step

#### Smoke Test Checklist
- All buttons respond
- All inputs accept text
- All panels open/close
- All menus work
- All drag interactions work
- All keyboard shortcuts work

#### Nielsen's 10 Heuristics
1. System status visibility
2. Real-world match
3. User control (undo/redo)
4. Consistency
5. Error prevention
6. Recognition over recall
7. Flexibility/efficiency
8. Minimalist design
9. Error recovery help
10. Documentation

#### axe-core Checks
- Color contrast (WCAG 2.1 AA)
- Alt text, aria-labels
- Keyboard accessibility
- ARIA validity

#### Final Commit Format
```
chore: finalize v1.0.0

Epics completed:
- Epic 1: [Name] (X stories)
...
Total: X stories, X E2E tests, all passing

Co-Authored-By: Claude <noreply@anthropic.com>
```

```bash
git tag -a v1.0.0 -m "Release v1.0.0"
```

### Flow

```
Tests(RELEASE) → VERIFY → Smoke → VERIFY → axe-core → VERIFY
    → Nielsen → VERIFY → Build → VERIFY → README → VERIFY
    → Commit → VERIFY → Production Ready
```

Each step has Haiku review (>=95 to pass, 3 attempts max).

---

# 4. Other Specs

## 4.1 Mandatory Standards

**v11 | Tauri v2 + React + TypeScript**

AI enforces these standards automatically. Objectively measurable, prevents production failures.

### 1. Accessibility (A11y)

#### Keyboard Navigation
| Requirement | Detection |
|-------------|-----------|
| All elements Tab-focusable | E2E: keyboard-only navigation |
| Logical tab order | Manual verification |
| Visible focus indicators | CSS `:focus` styles exist |
| Enter/Space activates | E2E: activate with Enter |
| Escape closes modals | E2E: open modal, press Esc |
| Arrow keys in lists/menus | E2E: arrow navigation |

#### Screen Reader
- `aria-label` on icon buttons and unlabeled inputs
- Semantic HTML (`button`, `nav`, `main` not clickable `div`)
- Alt text on all images

#### Visual
- 4.5:1 contrast ratio (axe-core check)
- No color-only information
- UI works at 200% zoom
- High contrast mode support

### 2. Completeness Pairs

**Every action requires its inverse:**

| Action | Pair | Action | Pair |
|--------|------|--------|------|
| Add/Create | Delete/Remove | Open/Expand | Close/Collapse |
| Show | Hide | Enable | Disable |
| Connect | Disconnect | Select | Deselect |
| Start | Stop/Pause | Zoom in | Zoom out |
| Lock | Unlock | Pin | Unpin |
| Undo | Redo | Favorite | Unfavorite |

**Enforcement:** Phase 1 (mockups) -> Phase 2 (stories) -> Phase 3 (tests) -> Phase 4 (impl) -> Phase 5 (smoke)

### 3. Edge Case Matrix

| Category | Edge Cases |
|----------|------------|
| Empty state | No items, first item, single item |
| Boundaries | Min/max value, at limit |
| Invalid input | Empty, special chars, too long |
| Rapid actions | Double-click, spam, drag cancel |
| Interruption | Action during loading, mid-drag escape |
| State conflicts | Delete while editing, move while drag |

**Enforcement:** Phase 3 tests include 2+ edge cases each

### 4. No Placeholder Rule

**Forbidden:**
```tsx
onClick={() => {}}              // Empty handler
onClick={() => console.log()}   // Console placeholder
onClick={() => alert('...')}    // Alert placeholder
<button>Edit</button>           // No onClick
aria-haspopup="menu"            // Without actual menu
```

### 5. No Mocking Rule

**Forbidden:**
```tsx
jest.mock('@tauri-apps/...')    // Mocking system APIs
vi.mock('@tauri-apps/api')
if (NODE_ENV === 'test') {...}  // Test-only code paths
const mockData = {...}          // Hardcoded mock data
```

**Rule:** If test needs mock, feature isn't implemented. Fix implementation.

### 6. No Synthetic Events in E2E

**Forbidden:**
```javascript
browser.execute(() => el.dispatchEvent(new MouseEvent(...)))
browser.execute(() => store.addNode(...))
```

**Required:**
```javascript
$('selector').click()
$('source').dragAndDrop($('target'))
$('input').setValue('text')
browser.keys(['Enter'])
```

### 7. Production E2E Testing (Phase 5)

Use release builds, not debug. Configure `tauri:options.application` to point to release binary.

### 8. Test Cheating Detection

**Forbidden:** Changing test to verify something easier than original requirement.

**Self-check:** "Does my test still verify the ORIGINAL requirement?"

### 9. Agent Skills Usage

**Workers MUST explicitly invoke skills** (auto-trigger only works on user messages).

#### Skills by Phase

| Phase | Skills |
|-------|--------|
| 1 | `brainstorming`, `tauri` |
| 2 | `tauri` |
| 3 | `tauri`, `test-driven-development`, `integration-test-setup` |
| 4 | `tauri`, `test-driven-development`, `systematic-debugging`, `e2e-rapid-fix`, `react-component-generator`, `tailwind-class-optimizer`, `verification-before-completion` |
| 5 | `tauri`, `verification-before-completion`, `bottleneck-identifier`, `secret-scanner` |

### Tools

| Tool | Purpose | Phase |
|------|---------|-------|
| axe-core | A11y testing | 4, 5 |
| eslint-plugin-jsx-a11y | A11y linting | 4 |
| grep commands | Violation detection | 4, 5 |
| Release E2E | Production testing | 5 |

---

## 4.2 Analyzer v2 Design

**Version:** v11 | **Status:** Design Draft

### Core Concept

Reinforcement learning system that correlates execution patterns with user-rated outcomes. Analyzes once at **pipeline completion** using user feedback as ground truth.

```
Phases 1-5 → USER RATING → ANALYZE (full context + ground truth)
```

**Why end-of-pipeline:** Previous per-phase analysis had no ground truth, partial context, couldn't see how early decisions affect outcomes.

### User Feedback: Likert Scale (1-5)

| Category | Measures |
|----------|----------|
| Overall | General satisfaction |
| UI/Design | Visual quality, aesthetics |
| Navigation | Flow, intuitiveness |
| Performance | Speed, responsiveness |
| Code Quality | Maintainability, structure |
| Test Coverage | Confidence in tests |
| Functionality | Features work as expected |

Optional: Component-level ratings with notes, freeform feedback.

### Feature Extraction (X)

```typescript
interface PipelineFeatures {
  phases: {
    [phase]: { duration, cost, todoCount, iterationCount, errorCount, skillsInvoked, toolDistribution }
  };
  patterns: {
    totalEditChurn, totalSearches, e2eFailures,
    maxIterationsOnFile, phaseRestarts, specModifications,
    emptyHandlers, mockUsage
  };
  derived: { avgTimePerTodo, errorRate, searchRate, skillCoverage };
}
```

**Note:** Transcripts only contain tool_call/tool_result events - features must be extracted from observable tool patterns.

### Dataset & Correlation

**Storage:** `.pipeline/learning-dataset.jsonl` (one JSON line per run)

**Entry:** `{ id, timestamp, project, mode, stack, features (X), ratings (Y) }`

**Analysis:** After N runs, calculate Pearson correlation between each feature and rating.

| Example Correlation | Meaning |
|---------------------|---------|
| e2eFailures vs Navigation: r=-0.72 | More failures → lower Nav rating |
| totalEditChurn vs Code Quality: r=-0.65 | More churn → lower quality |
| searchRate vs Functionality: r=+0.54 | More research → better function |

**Confidence thresholds:** 10 runs (basic), 30 runs (moderate), 50+ runs (high)

### Using Learned Insights

**During future pipelines:**
1. **Predict outcomes** from current patterns
2. **Trigger interventions** when patterns suggest bad outcome
3. **Recommend actions** based on success patterns

**Example:** If maxIterationsOnFile > historical avg * 1.5, warn "Navigation rating likely lower, consider systematic-debugging skill"

### Architecture Components

| Component | Purpose |
|-----------|---------|
| Feature Extractor | Parse transcripts, extract patterns |
| Rating Collector | Collect user Likert ratings |
| Dataset Manager | Store entries, query history |
| Correlator | Calculate correlations |
| Report Generator | Create analysis, update manifest |

### Files

| File | Purpose |
|------|---------|
| `.pipeline/learning-dataset.jsonl` | Training data |
| `.pipeline/correlations.json` | Cached correlations |
| `.pipeline/analysis/[run-id]-report.md` | Per-run report |
| `lib/analyzer-v2/*.js` | Implementation modules |

### Limitations

- **Transcript content:** Only tool_call/tool_result - no reasoning text
- **Cold start:** Need 30+ runs for reliable correlations
- **Project variability:** Normalize by complexity or analyze within project types

**Implementation Status:** All components not started.

---

## 4.3 Outcome Correlation Spec

**Version:** v11 | **Status:** Design Draft

### Purpose

Correlate pipeline execution patterns with user-rated outcomes to learn which patterns lead to good/bad results.

### 1. Rating System

**1-5 Likert Scale:**

| Score | Meaning |
|-------|---------|
| 1 | Fundamentally broken |
| 2 | Major issues |
| 3 | Works, has problems |
| 4 | Works well, minor issues |
| 5 | Exceptional quality |

**Categories:** `overall`, `ui_design`, `navigation`, `performance`, `code_quality`, `test_coverage`, `functionality`

**Optional:** Component-level ratings (e.g., "sidebar", "drag_drop")

### 2. Feature Categories

#### A: Phase Metrics (per phase)
- `duration`, `cost`, `todoCount`, `errorCount`, `iterationCount`, `skillCount`

#### B: Pattern Counts (aggregate)

| Pattern | Detection |
|---------|-----------|
| `editChurn` | >3 edits on same file in 5 min |
| `e2eFailures` | "wdio"/"webdriver" in error |
| `searchAfterError` | WebSearch within 3 calls of error |
| `maxFileIterations` | Peak edit count on any file |
| `specModifications` | Edit on user-stories.md/test-specs.md |
| `emptyHandlers` | `onClick={() => {}}` detected |
| `mockUsage` | `jest.mock`/`vi.mock` detected |

#### C: Derived Metrics

| Metric | Formula |
|--------|---------|
| `avgTimePerTodo` | totalDuration / todoCount |
| `errorRate` | errorCount / totalToolCalls |
| `searchRate` | searchCount / errorCount |
| `churnRate` | editChurn / totalEdits |

#### D: Violation Flags (boolean)
- `hasEmptyHandlers`, `hasMocks`, `hasSpecModifications`, `hasSkillGaps`

### 3. Correlation Methods

**Pearson:** Continuous features vs ratings
**Point-Biserial:** Binary features vs ratings

| Correlation | Strength |
|-------------|----------|
| 0.7 to 1.0 | Strong positive |
| 0.4 to 0.7 | Moderate positive |
| -0.1 to 0.1 | None |
| -0.7 to -0.4 | Moderate negative |
| -1.0 to -0.7 | Strong negative |

### 4. Analysis Pipeline

1. **Collect:** Extract features from transcripts + user ratings
2. **Store:** Append to `.pipeline/learning-dataset.jsonl`
3. **Correlate:** Calculate correlations (requires 10+ entries)
4. **Insights:** Generate recommendations from correlations

### 5. Prediction Model

Simple weighted average using top 5 correlated features per rating category. Confidence based on sample size (40%) + correlation strength (60%).

### 6. Output Schemas

```typescript
interface CorrelationEntry {
  feature: string;      // e.g., "patterns.editChurn"
  rating: string;       // e.g., "navigation"
  correlation: number;  // -1.0 to 1.0
  confidence: number;   // 0.0 to 1.0
}

interface AnalysisReport {
  ratings: { overall: number; categories: Record<string, number> };
  features: PipelineFeatures;
  correlationInsights: InsightEntry[];
  recommendations: string[];
}
```

### 7. Storage

| File | Purpose |
|------|---------|
| `.pipeline/learning-dataset.jsonl` | All run data |
| `.pipeline/correlations.json` | Cached correlations |
| `.pipeline/analysis/[run-id]-report.md` | Per-run report |

### 8. Integration

- **Orchestrator:** Collects ratings post-pipeline, creates entry, generates report
- **Dashboard:** Displays ratings, predictions, correlations, recommendations

**Implementation Status:** All components: Not started

---

## 4.4 Analyzer Skills Spec

**Version:** v11 | **Status:** Design Draft

### Skill Architecture

| Category | Skills |
|----------|--------|
| Data Collection | `transcript-parser`, `feature-extractor`, `rating-collector` |
| Analysis | `correlator`, `predictor`, `report-generator` |
| Utility | `dataset-manager`, `insight-generator` |

### Skill Summaries

#### 1. transcript-parser
- **Purpose:** Parse JSONL transcripts into structured timeline data
- **Tools:** Read, Bash
- **Limitation:** Only contains `tool_call`/`tool_result` events (no reasoning text)
- **Output:** `ParsedTranscript` with events, todoSpans, summary (counts, duration)

#### 2. feature-extractor
- **Purpose:** Extract quantitative features for correlation analysis
- **Tools:** Read
- **Feature Categories:**
  - Phase Metrics: duration, cost, todoCount, errorCount, iterationCount, skillCount
  - Patterns: editChurn, e2eFailures, searchAfterError, maxFileIterations, specModifications, emptyHandlers, mockUsage
  - Derived: avgTimePerTodo, errorRate, searchRate, skillCoverage, churnRate
  - Violations: hasEmptyHandlers, hasMocks, hasSpecModifications, hasSkillGaps

#### 3. rating-collector
- **Purpose:** Collect user Likert ratings (1-5 scale)
- **Tools:** AskUserQuestion
- **Categories:** overall, ui_design, navigation, performance, code_quality, test_coverage, functionality
- **Optional:** Component ratings, freeform feedback

#### 4. correlator
- **Purpose:** Calculate correlations between features and ratings
- **Tools:** Read
- **Methods:** Pearson (continuous), Point-Biserial (binary)
- **Threshold:** |r| > 0.3, min 10 samples
- **Cache:** Recalculate daily or every 10 entries

#### 5. predictor
- **Purpose:** Predict ratings from current patterns using learned correlations
- **Tools:** Read
- **Method:** Weighted linear prediction using top 5 predictors per rating
- **Output:** Predictions (1-5) + warnings for strong negative correlators

#### 6. report-generator
- **Purpose:** Generate markdown analysis reports
- **Tools:** Write
- **Output:** `.pipeline/analysis/${runId}-report.md`
- **Sections:** Ratings, Features, Patterns, Violations, Insights, Recommendations

#### 7. dataset-manager
- **Purpose:** CRUD operations on learning dataset
- **Tools:** Read, Write, Bash
- **Operations:** addEntry, queryEntries, getStatistics, cleanupDataset
- **Triggers:** Correlation recalc every 10 entries

#### 8. insight-generator
- **Purpose:** Transform correlations into actionable insights
- **Tools:** Read
- **Types:** Pattern impact, Violation warnings, Comparison insights
- **Output:** Prioritized recommendations (critical/high/medium/low)

### Analyzer Agent Process

1. Parse all phase transcripts
2. Extract features
3. Collect user ratings
4. Load/calculate correlations
5. Generate insights
6. Create report
7. Store in dataset
8. Update manifest

**Rules:**
- Read-only (never modify source)
- Validate ratings (1-5)
- Cite evidence for insights
- Min 10 entries for correlation

**Implementation Status:** All 8 skills: Not started

---

## 4.5 Step Mode Spec

**Status:** Design Complete, Implementation Pending

### Overview

Step mode = human-in-the-loop checkpoints. Pipeline pauses after each phase/epic for review.

| Mode | Behavior |
|------|----------|
| **AUTO** | Continuous, no pauses |
| **STEP** | Pause at checkpoints |

### Manifest Schema

```json
{
  "stepMode": true,
  "currentIteration": 1,
  "iterations": [{
    "id": 1, "branch": "main", "startedAt": "ISO", "endedAt": null,
    "endReason": null, "feedback": null, "checkpoint": null,
    "cost": 0, "snapshotPath": null
  }],
  "cascadeRestartPhase": null,
  "cascadeAnalysis": null
}
```

| Field | Description |
|-------|-------------|
| `stepMode` | true = pause at checkpoints |
| `currentIteration` | Current iteration (starts 1) |
| `iterations` | History array |
| `cascadeRestartPhase` | Phase to restart after feedback |
| `endReason` | `"completed"` / `"feedback"` / `"rollback"` |

### Startup Question

**Question 4 (after Mode, Style, Model):**
- "How should the pipeline run?"
- Options: Auto (Recommended) | Step

### Checkpoint Logic

| Phase | Trigger | Action |
|-------|---------|--------|
| 1-2 | Phase complete | Pause for review |
| 3 | Phase complete | Pause + auto-launch app |
| 4 | Each epic complete | Pause + auto-launch app |
| 5 | Phase complete | Final review |

#### Checkpoint Sequence
1. Set `status = "checkpoint"`
2. Save docs snapshot to `.pipeline/snapshots/iteration-N/`
3. Launch app (Phase 3+): `npm run tauri dev`
4. Generate test report

### User Commands (Step Mode)

| Command | Action |
|---------|--------|
| `continue` | Proceed to next phase/epic |
| `feedback "<text>"` | Analyze impact, restart from appropriate phase |
| `add "<feature>"` | Always restart from Phase 1 |
| `back N` | Rollback to iteration N (restore docs snapshot) |

### Cascade Analyzer

Analyzes feedback to determine restart phase.

| Impact Level | Restart | Triggers |
|--------------|---------|----------|
| MAJOR | Phase 1 | "redesign", "new feature", "completely different" |
| MODERATE | Phase 2 | "test should", "validation", "edge case" |
| MINOR | Phase 3 | "layout", "ui", "styling" |
| MINIMAL | Phase 4 | "bug", "fix", "typo" |

Output: `cascadeRestartPhase` + `cascadeAnalysis` in manifest

### Dashboard Integration

Already implemented:
- Header: "STEP" (magenta) or "AUTO" (dim)
- Iteration: "v1/3" display
- Checkpoint badge when `status === "checkpoint"`
- Pauses heartbeat during checkpoint

### File Dependencies

| File | Status |
|------|--------|
| `lib/analyze-feedback-impact.js` | Complete |
| `lib/dashboard-v3.cjs` | Complete |
| `lib/generate-test-report.js` | TO CREATE |
| `orchestrator-desktop-v10.0.md` | TO MODIFY (add Q4, sections 8.5-8.8) |

### Implementation Checklist

- [ ] Add Question 4 to orchestrator startup
- [ ] Add `stepMode` to manifest init
- [ ] Add sections 8.5-8.8 to orchestrator
- [ ] Create `lib/generate-test-report.js`
- [ ] Add step mode user commands
- [ ] Test end-to-end flow

---

## 4.6 Unity Pipeline Overview

**Stack:** Unity 6+ / Meta XR SDK / Quest target

### Stack Comparison

| Aspect | Desktop (Tauri) | Unity (Meta XR) |
|--------|-----------------|-----------------|
| Framework | Tauri v2 | Unity 6+ |
| Backend | Rust | C# |
| Frontend | React/TS | Unity UI |
| Build Target | Win/Mac/Linux | Meta Quest |
| Tests | Jest + WebdriverIO | Unity Test Framework |
| MCP | N/A | unity-mcp + MQDH MCP |
| Packages | npm + cargo | UPM |

### MCP Integration

- **unity-mcp**: Editor control (GameObjects, scripts, prefabs, scenes, tests)
- **Meta MQDH MCP**: XR SDK docs, troubleshooting, 3D assets

### Phase Differences from Desktop

| Phase | Key Differences |
|-------|-----------------|
| **1** | XR interactions (gaze, hand tracking), spatial UI, comfort |
| **2** | Unity Test Framework specs, UPM packages, XR capabilities |
| **3** | Unity project setup, XR rig, EditMode/PlayMode test assemblies |
| **4** | Uses Unity MCP tools (`manage_gameobject`, `manage_script`, `run_tests`) |
| **5** | Quest APK build, 72/90 FPS target, ADB deployment |

### Unity MCP Tools

| Category | Tools |
|----------|-------|
| Scene/GameObject | `manage_gameobject`, `manage_scene`, `execute_menu_item`, `manage_prefabs` |
| Scripts | `manage_script`, `script_apply_edits`, `manage_shader` |
| Assets | `manage_asset`, `resource_tools` |
| Testing | `run_tests`, `read_console`, `manage_editor` |

### Meta XR SDK

**Core Packages:**
- `com.meta.xr.sdk.core` - Core XR
- `com.meta.xr.sdk.interaction` - Hand tracking, controllers
- `com.meta.xr.sdk.platform` - Platform services

**Key Components:**
- `OVRCameraRig`, `OVRManager`, `OVRHand`, `OVRPassthroughLayer`
- Interaction SDK: `HandGrabInteractor`, `PokeInteractor`, `RayInteractor`, `Grabbable`

### Test Structure

```
Assets/Tests/
├── EditMode/    # Script logic (no Play mode)
└── PlayMode/    # Runtime behavior, interactions
```

### Unity Project Structure

```
<project>/
├── Assets/{Scripts, Prefabs, Scenes, Tests, Resources}
├── Packages/manifest.json
├── ProjectSettings/
├── docs/{brainstorm-notes.md, user-stories.md, test-specs.md}
└── .pipeline/manifest.json
```

### Prerequisites

| Software | Version |
|----------|---------|
| Unity | 6.0+ |
| Meta XR SDK | Latest |
| MQDH | 6.2.1+ |
| Android SDK | API 32+ |
| Python | 3.10+ |

### What's Same as Desktop

- 5-phase structure
- Brainstorm process & user story format
- TDD (RED -> GREEN)
- Review loops, manifest tracking, todo orchestration

### Implementation Status

| Component | Status |
|-----------|--------|
| Unity MCP config | Done |
| MQDH MCP | Needs install |
| Phase commands | Not created |
| Worker rules | Not created |

---

## 4.7 Unity MCP Setup

**Server:** CoplayDev/unity-mcp v7.0.0

### Architecture

```
Claude Code ──STDIO──> Unity MCP Server (uv/Python) ──WebSocket──> Unity Editor Plugin
```

### Prerequisites

| Software | Version | Check |
|----------|---------|-------|
| Python | 3.10+ | `python --version` |
| uv | Latest | `uv --version` |
| Unity | 2021.3+ | Unity Hub |

**Install uv:** `powershell -c "irm https://astral.sh/uv/install.ps1 | iex"`

### Installation

1. **Clone:** `git clone https://github.com/CoplayDev/unity-mcp.git` to `C:\Unity\`
2. **Unity Package:** Window > Package Manager > + > Add from git URL: `https://github.com/CoplayDev/unity-mcp.git`
3. **Configure Claude Desktop** (`%APPDATA%\Claude\claude_desktop_config.json`):
   ```json
   {"mcpServers":{"unity":{"command":"C:\\Users\\ahunt\\.local\\bin\\uv.exe","args":["run","--directory","C:\\Unity\\unity-mcp\\Server","server.py"],"env":{"DISABLE_TELEMETRY":"true"}}}}
   ```
4. **Start:** Unity > Tools > MCP Unity > Server Window > Start Server (port 8090)

### Tools Summary

| Category | Tools |
|----------|-------|
| GameObjects | `manage_gameobject`, `select_gameobject`, `update_gameobject` |
| Scenes | `manage_scene`, `execute_menu_item` |
| Scripts | `manage_script`, `script_apply_edits` |
| Assets | `manage_prefabs`, `manage_asset`, `manage_shader` |
| Testing | `run_tests`, `read_console`, `manage_editor` |

### Resources (Read-Only)

`unity://menu-items`, `unity://scenes-hierarchy`, `unity://gameobject/{id}`, `unity://packages`, `unity://assets`, `unity://tests/{testMode}`

### Configuration

| Setting | Default | Notes |
|---------|---------|-------|
| Port | 8090 | WebSocket |
| Timeout | 10s | Connection |
| `DISABLE_TELEMETRY=true` | - | Env var |
| `UNITY_HOST=<ip>` | - | For WSL2 |

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Server won't start | Check uv/Python install, run `uv run server.py` manually |
| Unity not connecting | Start Server in Unity, check port 8090 not in use |
| Play mode disconnects | Disable domain reload: Edit > Project Settings > Editor > Enter Play Mode Settings |
| WSL2 networking | Set `UNITY_HOST` to Windows IP |

### Test Connection

Ask Claude: "List all GameObjects in the current scene"

### Alternatives

- **CoderGamester/mcp-unity** - Node.js-based
- **IvanMurzak/Unity-MCP** - Binary, 50+ tools, works in compiled games

---

## 4.8 Meta XR MCP Setup

**Server:** Meta Quest Developer Hub (MQDH) MCP | **Status:** Pending Installation

### Overview

MQDH MCP enables: XR SDK docs search, debugging tools, 3D asset library access, device debugging via ADB.

### Prerequisites

| Requirement | Details |
|-------------|---------|
| MQDH Version | 6.2.1+ |
| OS | Windows 10/11, macOS |
| Meta Account | Developer account required |
| Quest Device | Optional (for debugging) |

### Installation

1. **Download MQDH** from [Meta Downloads](https://developers.meta.com/horizon/documentation/unity/ts-mqdh-download-tools/)
2. **Enable MCP:** MQDH Settings > AI Tools > Enable MCP Server
3. **Configure Claude:** Use one-click install in MQDH, or manual config:

```json
{
  "mcpServers": {
    "meta-xr": {
      "command": "<MQDH_INSTALL_PATH>/mcp-server.exe",
      "args": []
    }
  }
}
```

### Available Tools

| Category | Tools |
|----------|-------|
| **Docs** | `search_docs`, `get_api_reference`, `get_sample_code` |
| **Debug** | `device_logs`, `performance_metrics`, `troubleshoot` |
| **Assets** | `search_assets`, `download_asset`, `preview_asset` |

### Unity Integration

Both MCPs run simultaneously. Use `unity` for GameObjects/scripts/tests, `meta-xr` for XR docs/debugging/assets.

### Meta XR SDK Packages

| Package | UPM Name |
|---------|----------|
| Core | `com.meta.xr.sdk.core` |
| Interaction | `com.meta.xr.sdk.interaction` |
| Platform | `com.meta.xr.sdk.platform` |
| Audio | `com.meta.xr.sdk.audio` |

**Registry:** `https://npm.developer.oculus.com/` (scope: `com.meta.xr`)

### Troubleshooting

- **Quest not detected:** Enable Developer Mode, authorize USB, check `adb devices`
- **MCP not starting:** Verify MQDH 6.2.1+, check AI Tools enabled, restart MQDH
- **Claude not connecting:** Verify exe path, ensure MQDH running, restart Claude

### Resources

- [MQDH Download](https://developers.meta.com/horizon/documentation/unity/ts-mqdh/)
- [MCP Setup](https://developers.meta.com/horizon/documentation/unity/ts-mqdh-mcp)
- [Unity MCP Extension](https://developers.meta.com/horizon/documentation/unity/unity-mcp-extension/)

---

## 4.9 Android Pipeline Overview

**Stack:** Tauri 2.0 Mobile | **Status:** Design Draft

### Why Tauri 2.0 for Mobile?

| Factor | Tauri 2.0 | Flutter | React Native |
|--------|-----------|---------|--------------|
| Code reuse | 100% (same as desktop) | 0% | ~50% |
| Performance | ~95% native | ~97% | ~85-90% |
| Learning curve | None (if know Tauri) | High | Medium |

**Key:** Single codebase for desktop AND mobile.

### Architecture

```
Tauri 2.0 Project
├── src/ (React) - 100% shared
├── src-tauri/ (Rust) - 95% shared
└── Tests (Jest + WebdriverIO + Appium)
         ↓
    Build: Windows/.exe | macOS/.app | Linux/.AppImage | Android/.apk
```

**Mobile-specific:**
- `src-tauri/gen/android/` - Generated Android Studio project
- `mobile.rs` / `desktop.rs` - Platform-specific code (optional)

### Phase Differences (vs Desktop)

| Phase | Mobile Adaptations |
|-------|-------------------|
| **1** | Ask: screen sizes, offline needs, permissions, min SDK |
| **2** | Add touch/gesture tests, back button, rotation, permission flows |
| **3** | Run `pnpm tauri android init`, configure AndroidManifest.xml, set up Appium |
| **4** | Use `tauri android dev --emulator`, test on device |
| **5** | Build APK/AAB, app signing, Play Store submission |

### Key Commands

| Action | Command |
|--------|---------|
| Init Android | `pnpm tauri android init` |
| Dev (emulator) | `pnpm tauri android dev --emulator` |
| Dev (device) | `pnpm tauri android dev` |
| Build APK | `pnpm tauri android build --apk` |
| Build AAB | `pnpm tauri android build --aab` |

### Configuration

**tauri.conf.json:**
```json
{
  "identifier": "com.example.myapp",
  "bundle": { "android": { "minSdkVersion": 24 } }
}
```

**Capability Mapping:**

| Tauri | Android Permission |
|-------|-------------------|
| `fs:read/write` | `READ/WRITE_EXTERNAL_STORAGE` |
| `http:request` | `INTERNET` |
| `geolocation` | `ACCESS_FINE_LOCATION` |

### Testing

| Layer | Tool |
|-------|------|
| Unit/Integration | Jest (same as desktop) |
| E2E | WebdriverIO + Appium (not tauri-driver) |

**Mobile-specific:** touch gestures, back button, rotation

### Prerequisites

| Software | Version |
|----------|---------|
| Android Studio | Latest |
| Android SDK | API 24+ |
| Android NDK | 25.x |
| Java JDK | 17+ |
| Appium | 2.x |

**Windows env vars:** `JAVA_HOME`, `ANDROID_HOME`, `NDK_HOME`

### Implementation Status

- Tauri 2.0 mobile: **Stable**
- Phase commands, worker rules, Appium setup: **Not created**

### Resources

- [Tauri Android Development](https://deepwiki.com/tauri-apps/tauri/7.3-android-development-and-build)
- [WebdriverIO Appium Setup](https://webdriver.io/docs/appium/)

---

## 4.10 Android Environment Setup

**Platform:** Windows 10/11 | **For:** Tauri 2.0 Android builds

### Prerequisites

| Software | Check | Required |
|----------|-------|----------|
| Node.js 18+ | `node --version` | Yes |
| Rust 1.70+ | `rustc --version` | Yes |
| Tauri CLI | `pnpm tauri --version` | Yes |

### Step 1: Android Studio & SDK

1. Install [Android Studio](https://developer.android.com/studio)
2. **SDK Manager** > SDK Platforms: Android 14.0 (API 34), Android 7.0 (API 24)
3. **SDK Tools**: Build-Tools, Command-line Tools, Platform-Tools, **NDK (Side by side)** - CRITICAL

Default SDK: `%LOCALAPPDATA%\Android\Sdk`

### Step 2: Environment Variables (PowerShell Admin)

```powershell
# JAVA_HOME
[Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Android\Android Studio\jbr", "User")

# ANDROID_HOME
[Environment]::SetEnvironmentVariable("ANDROID_HOME", "$env:LOCALAPPDATA\Android\Sdk", "User")

# NDK_HOME (get version dynamically)
$NDK_VERSION = Get-ChildItem -Name "$env:LOCALAPPDATA\Android\Sdk\ndk" | Select-Object -Last 1
[Environment]::SetEnvironmentVariable("NDK_HOME", "$env:LOCALAPPDATA\Android\Sdk\ndk\$NDK_VERSION", "User")

# PATH additions
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
$additions = @("$env:LOCALAPPDATA\Android\Sdk\cmdline-tools\latest\bin", "$env:LOCALAPPDATA\Android\Sdk\platform-tools")
foreach ($p in $additions) { if ($currentPath -notlike "*$p*") { $currentPath = "$currentPath;$p" } }
[Environment]::SetEnvironmentVariable("Path", $currentPath, "User")
```

**REBOOT REQUIRED** after setting variables.

### Step 3: Rust Android Targets

```bash
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
```

### Step 4: Emulator Setup

1. Android Studio > **Tools > Device Manager** > Create Device
2. Select Pixel 7, API 34, x86_64
3. Verify: `adb devices` (should show `emulator-5554 device`)

### Step 5: Initialize Project

```bash
pnpm tauri android init    # Creates gen/android/ directory
```

### Step 6: Run/Build

| Task | Command |
|------|---------|
| Dev on device/emulator | `pnpm tauri android dev` |
| Force emulator | `pnpm tauri android dev --emulator` |
| Debug APK | `pnpm tauri android build` |
| Release APK | `pnpm tauri android build --apk` |
| AAB (Play Store) | `pnpm tauri android build --aab` |

**First run: 5-10 min** (Gradle + Rust compilation). Subsequent runs faster.

APK output: `src-tauri/gen/android/app/build/outputs/apk/`

### Troubleshooting Quick Fixes

| Error | Fix |
|-------|-----|
| SDK location not found | Check `$env:ANDROID_HOME` is set, reboot |
| NDK not found | Install NDK via SDK Manager, update `NDK_HOME`, reboot |
| No connected devices | `adb devices`, enable USB debugging, try different cable |
| Gradle fails | `cd src-tauri/gen/android && ./gradlew clean` |
| bundletool not found | Install "Android SDK Command-line Tools" |
| Rust Android errors | Re-run `rustup target add` command |

### Environment Reference

| Variable | Value |
|----------|-------|
| JAVA_HOME | `C:\Program Files\Android\Android Studio\jbr` |
| ANDROID_HOME | `%LOCALAPPDATA%\Android\Sdk` |
| NDK_HOME | `%ANDROID_HOME%\ndk\<version>` |

### Resources

- [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/)
- [Android Studio](https://developer.android.com/studio)

---

## 4.11 Android Testing Setup

**Stack:** WebdriverIO + Appium 2 | **Status:** Ready

### Architecture

```
Test Script → WebdriverIO → Appium 2 → Android Device/Emulator (via ADB)
```

| Layer | Desktop | Android |
|-------|---------|---------|
| Unit/Integration | Jest + MSW | Same |
| E2E | WebdriverIO + tauri-driver | WebdriverIO + Appium |

### Setup Steps

#### 1. Install Dependencies

```bash
# Appium + driver
pnpm add -D appium @appium/uiautomator2-driver

# WebdriverIO
pnpm add -D @wdio/cli @wdio/local-runner @wdio/mocha-framework @wdio/spec-reporter @wdio/appium-service webdriverio
```

#### 2. Config (wdio.android.conf.ts)

```typescript
export const config: Options.Testrunner = {
  runner: 'local',
  specs: ['./test/specs/**/*.spec.ts'],
  maxInstances: 1,
  capabilities: [{
    platformName: 'Android',
    'appium:deviceName': 'Android Emulator',
    'appium:platformVersion': '14.0',
    'appium:automationName': 'UiAutomator2',
    'appium:app': path.resolve('./src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk'),
    'appium:autoGrantPermissions': true,
    'appium:newCommandTimeout': 240,
  }],
  services: [['appium', { args: { relaxedSecurity: true } }]],
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: { ui: 'bdd', timeout: 120000 },
};
```

#### 3. Add Test IDs (React)

```tsx
// Hook for cross-platform IDs
export function useTestId(id: string) {
  return { testID: id, 'data-testid': id, accessibilityLabel: id };
}

<button {...useTestId('submit-button')}>Submit</button>
```

#### 4. npm Scripts

```json
{
  "test:e2e:android": "wdio run wdio.android.conf.ts",
  "test:all": "pnpm test:unit && pnpm test:e2e:desktop && pnpm test:e2e:android"
}
```

### Quick Reference

#### Selectors

| Strategy | Syntax |
|----------|--------|
| Accessibility ID | `$('~submit-button')` |
| UIAutomator | `$('android=new UiSelector().text("Submit")')` |
| XPath | `$('//*[@content-desc="submit"]')` |

#### Common Actions

| Action | Code |
|--------|------|
| Tap | `element.click()` |
| Type | `element.setValue('text')` |
| Back | `driver.back()` |
| Swipe | `element.touchAction([{action:'press'}, {action:'moveTo'}, {action:'release'}])` |
| Rotate | `driver.setOrientation('LANDSCAPE')` |
| Wait | `element.waitForDisplayed({ timeout: 5000 })` |

### Directory Structure

```
test/specs/
├── shared/    # Cross-platform tests
├── desktop/   # Desktop-only (keyboard, window)
└── mobile/    # Mobile-only (gestures, rotation, back button)
```

### Troubleshooting

| Issue | Fix |
|-------|-----|
| Appium not found | `pnpm add -D appium` |
| Driver missing | `pnpm exec appium driver install uiautomator2` |
| No device | `adb devices` then start emulator |
| App not found | Build APK: `pnpm tauri android build` |
| Element not found | Add testID, use Appium Inspector, add waitForDisplayed |
| Timeout | Increase `mochaOpts.timeout` |

### CI/CD (GitHub Actions)

```yaml
- uses: reactivecircus/android-emulator-runner@v2
  with:
    api-level: 34
    script: pnpm test:e2e:android
```

### Resources

- [WebdriverIO Appium Docs](https://webdriver.io/docs/appium/)
- [Appium UiAutomator2](https://github.com/appium/appium-uiautomator2-driver)

---

## 4.12 Phase 1 Redesign

**Created:** 2026-01-12 | **Status:** Design Complete

### Problem

| Issue | Description |
|-------|-------------|
| Architecture conflict | Pipeline is autonomous; Phase 1 requires interactive dialogue |
| Content persistence | Ideas accumulate in context but not written to file until todo completion |

**Solution:** Phase 1 becomes pre-pipeline `/brainstorm` skill with "write immediately" rule.

### New Architecture

```
BEFORE: [Phase 1 (Interactive)] → [Phase 2-5 (Auto)]  ← All in pipeline

AFTER:  [/brainstorm] → USER APPROVAL → [Phase 2-5]  ← Brainstorm separate
        (Interactive)                   (Pipeline)
```

#### Pipeline Entry Requirements

| File | Source |
|------|--------|
| `docs/brainstorm-notes.md` | /brainstorm skill (pre-pipeline) |

**Note:** `docs/user-stories.md` is created by Phase 2 PM Agent, NOT by /brainstorm skill.

Orchestrator validates `brainstorm-notes.md` exists before starting.

### "Write Immediately" Rule

**Rule:** Write EVERY idea to file IMMEDIATELY after discussed.

```
User mentions idea → Agent writes to file → THEN responds
```

Enforced via MCP `append_notes` tool with section/content params.

### /brainstorm Skill

| Property | Value |
|----------|-------|
| Type | Interactive (AskUserQuestion allowed) |
| Output | `docs/brainstorm-notes.md` |
| Resumable | Yes (reads existing notes) |

**Note:** Brainstorm does NOT create user-stories.md. That's Phase 2's job.

#### Flow
1. UNDERSTAND (text) → write
2. RESEARCH (WebSearch) → write
3. SKETCH (ASCII/Canvas) → write
4. REFINE → write
5. STORYBOARD → write
6. STYLE (design system) → write
7. APPROVE → ready for pipeline

User stories are generated in Phase 2 by the PM Agent, which reads the brainstorm notes.

### Orchestrator Changes (v11)

| Removed | Added |
|---------|-------|
| Phase 1 spawning | Require brainstorm files |
| Phase 1 monitoring | Display brainstorm summary |
| | Ask "Proceed?" before Phase 2 |

#### Manifest Schema

```json
{
  "version": "11.0.0",
  "brainstorm": { "completed": true, "epicCount": 5, "storyCount": 23 },
  "currentPhase": "2",
  "phases": { "2": {}, "3": {}, "4": {}, "5": {} }
}
```
No Phase 1 in phases - tracked separately in `brainstorm` field.

### Command Changes

| v10 | v11 |
|-----|-----|
| `/orchestrator-desktop-v10.0` | `/orchestrator-desktop-v11.0` (skips Phase 1) |
| `/1-new-pipeline-desktop-v9.0` | `/brainstorm` (separate skill) |

### Benefits

- **Architectural clarity:** Pipeline purely autonomous (2-5)
- **Content persistence:** Write-immediately prevents loss
- **Flexibility:** User-controlled duration, optional Live Canvas
- **Simpler orchestrator:** No interactive phase handling

### Implementation Tasks

| Priority | Task |
|----------|------|
| High | Create `/brainstorm` skill with write-immediately |
| High | Update orchestrator to require brainstorm files |
| High | Remove Phase 1 from orchestrator |
| Medium | Update manifest schema |
| Medium | Add session resumability |
| Low | Live Canvas integration (optional) |

---

## 4.13 Live Canvas Spec

**Status:** Design Complete | **Branch:** `feature/live-canvas`

### Overview

Real-time visualization system for interactive sessions. Updates as agent/user discuss.

| Context | Visualized |
|---------|------------|
| Brainstorming | Ideas, features (markdown) |
| UI Design | Mockups, wireframes (canvas) |
| Architecture | System diagrams (Mermaid/PlantUML) |
| User Flows | Journey maps (flowcharts) |
| Data Models | ER diagrams, schemas |

**Principles:** Progressive output, pluggable, multi-format, persistent, optional fallback

### Architecture

```
Interactive Session → MCP Server (live-canvas-mcp) → File System + WebSocket + HTTP → Live Viewer
```

| Component | Role |
|-----------|------|
| MCP Server | Tool calls, state, broadcasts, persistence |
| WebSocket | Real-time viewer updates |
| Live Viewer | Browser render with auto-refresh |

### MCP Tools

#### Notes Tools
| Tool | Purpose |
|------|---------|
| `append_notes` | Append content to section (creates if missing) |
| `update_section` | Replace entire section |
| `get_notes` | Retrieve notes content |

#### Diagram Tools
| Tool | Purpose |
|------|---------|
| `render_mermaid` | Render Mermaid diagram |
| `render_plantuml` | Render PlantUML diagram |
| `render_ascii` | Render ASCII art diagram |

#### Canvas Tools
| Tool | Purpose |
|------|---------|
| `create_shape` | Create shape (rectangle, ellipse, text, arrow, line, frame) |
| `update_shape` | Update existing shape |
| `connect_shapes` | Create connection between shapes |
| `create_mockup` | High-level UI mockup (window, mobile, component) |

#### Session Tools
| Tool | Purpose |
|------|---------|
| `get_session` | Get session state |
| `clear_canvas` | Clear canvas |
| `export_canvas` | Export as png/svg/json |

### Live Viewer

**Tech Stack:** React/Svelte, react-markdown, mermaid.js, Excalidraw/tldraw, WebSocket, Vite

**Layout:** Split panels (Notes + Diagram/Canvas) with status bar

**Features:** Auto-scroll, resizable panels, theme toggle, full-screen, export, connection indicator, history

#### WebSocket Messages
- `notes_update` - append/replace/full
- `diagram_update` - mermaid/plantuml/ascii
- `canvas_update` - create/update/delete/clear

### Existing MCP Servers

| Function | Server |
|----------|--------|
| Notes | mcp-obsidian |
| Mermaid | claude-mermaid |
| Canvas | mcp_excalidraw |
| PlantUML | plantuml-mcp-server |

**Recommendation:** Start with existing MCPs, add custom viewer later

### Implementation Phases

| Phase | Work | Effort |
|-------|------|--------|
| 1 | Configure existing MCPs + skill | 1-2 days |
| 2 | Custom viewer (notes + Mermaid) | 3-5 days |
| 3 | Canvas support (Excalidraw) | 3-5 days |
| 4 | Polish (session, history, themes) | 2-3 days |

### Configuration

```json
{
  "mcpServers": {
    "live-canvas": {
      "command": "node",
      "args": ["/path/to/live-canvas-mcp/dist/index.js"],
      "env": {
        "CANVAS_PORT": "3456",
        "CANVAS_PROJECT_DIR": ".",
        "CANVAS_AUTO_OPEN": "true"
      }
    }
  }
}
```

| Variable | Default | Description |
|----------|---------|-------------|
| CANVAS_PORT | 3456 | Server port |
| CANVAS_PROJECT_DIR | . | Project directory |
| CANVAS_AUTO_OPEN | true | Auto-open browser |
| CANVAS_THEME | light | Default theme |
| CANVAS_NOTES_FILE | docs/brainstorm-notes.md | Default notes file |

### Open Questions

1. Single vs multiple MCPs?
2. Viewer hosting - embedded or separate?
3. Multi-viewer collaboration support?
4. Offline/file-only mode?
5. Mobile responsive viewer?

---

# End of Document

**Total sections:** 26 compressed documents merged into one
**Last updated:** 2026-01-14
