# Phase 4: Developer Agent

**Version:** v11 (In Progress)
**Created:** 2026-01-09
**Status:** Under Review

---

## Overview

Phase 4 implements the application using Test-Driven Development (TDD) with a **three-part structure**:

1. **Fixed Start** - Setup and preparation (prescribed steps)
2. **Free Zone** - Autonomous implementation loop (Ralph-style)
3. **Fixed End** - Verification and commit (prescribed steps)

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│  brainstorm-notes   │    │    user-stories     │    │     test-specs      │
│        .md          │    │        .md          │    │        .md          │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
         │                          │                          │
         └──────────────────────────┼──────────────────────────┘
                                    │
                                    ▼
                            ┌───────────────┐
                            │   Developer   │
                            │  (Autonomous) │
                            └───────────────┘
                                    │
                                    ▼
                         Working Implementation
                         (All E2E tests GREEN)
```

**Input:** `docs/brainstorm-notes.md`, `docs/user-stories.md`, `docs/test-specs.md`
**Output:** Working implementation with all E2E tests passing
**Mode:** Autonomous (three-part structure with Ralph loop)

**References:** [14-mandatory-standards.md](./14-mandatory-standards.md)

---

## Agent Skills (Invoke with Skill tool)

**CRITICAL: Skills are NOT auto-triggered in autonomous mode. You MUST explicitly invoke them.**

Phase 4 is the implementation phase with many applicable skills. Invoke them at the specified points.

| Skill Name | Invoke When | What It Provides |
|------------|-------------|------------------|
| `tauri` | **Todo 1** (After reading docs) | Tauri v2 APIs, invoke patterns, plugin usage |
| `test-driven-development` | **Todo 3** (Before writing E2E test) | TDD cycle, RED-GREEN-REFACTOR discipline |
| `systematic-debugging` | **Todo 4** (When stuck for 3+ iterations) | Root cause analysis, debugging strategies |
| `e2e-rapid-fix` | **Todo 4** (When E2E test keeps failing) | E2E failure patterns, WebdriverIO fixes |
| `react-component-generator` | **Todo 4** (When creating React components) | React patterns, component structure |
| `tailwind-class-optimizer` | **Todo 4** (When styling components) | Tailwind best practices, responsive design |
| `verification-before-completion` | **Todo 8** (Before running detection commands) | Pre-commit quality checks |

### How to Invoke

```
Skill tool → tauri                      (invoke after reading docs)
Skill tool → test-driven-development    (invoke before writing first test)
Skill tool → systematic-debugging       (invoke when stuck in Free Zone)
Skill tool → e2e-rapid-fix             (invoke when E2E tests fail repeatedly)
Skill tool → react-component-generator  (invoke when building components)
Skill tool → tailwind-class-optimizer   (invoke when styling)
Skill tool → verification-before-completion (invoke before detection commands)
```

### Why Manual Invocation is Required

Skills trigger on **user messages only**. In autonomous phases, the worker receives ONE user message (the phase command) then works alone. Without explicit invocation, skills are never loaded.

### Free Zone Skills

During the **IMPLEMENTATION LOOP (Todo 4)**, invoke skills as needed:
- **Stuck for 3+ iterations?** → `Skill tool → systematic-debugging`
- **E2E test keeps failing?** → `Skill tool → e2e-rapid-fix`
- **Building React components?** → `Skill tool → react-component-generator`
- **Styling with Tailwind?** → `Skill tool → tailwind-class-optimizer`

---

## Three-Part Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FIXED START (Todos 1-2)                           │
│  Prescribed steps that set up the environment                               │
│  - Read planning docs                                                       │
│  - Setup project skeleton                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FREE ZONE - Per Story Loop                           │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Todo 3: Write E2E test (RED) - Fixed                                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Todo 4: IMPLEMENTATION LOOP (Ralph-style)                            │  │
│  │                                                                       │  │
│  │    ┌──────────────────────────────────────────────────────────────┐   │  │
│  │    │  Agent works AUTONOMOUSLY until test passes                  │   │  │
│  │    │  - No prescribed steps                                       │   │  │
│  │    │  - Iterate, debug, refactor as needed                        │   │  │
│  │    │  - Completion = E2E test GREEN                               │   │  │
│  │    │  - Max iterations: 20 per story                              │   │  │
│  │    └──────────────────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Todo 5: VERIFY story (Review Loop) - Fixed                           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                          Repeat for each story                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FIXED END (Todos 6-10)                            │
│  Prescribed steps for verification and commit                               │
│  - VERIFY: Epic complete                                                    │
│  - Run detection commands                                                   │
│  - Commit epic                                                              │
│  - Repeat for remaining epics                                               │
│  - VERIFY: All complete                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Mandatory Standards Enforcement

The Developer Agent runs detection commands before every commit:

```bash
# Empty handlers (FORBIDDEN)
grep -rn "onClick={() => {}}" src --include="*.tsx"
grep -rn "onChange={() => {}}" src --include="*.tsx"

# Console.log placeholders (FORBIDDEN)
grep -rn "onClick={() => console" src --include="*.tsx"

# Buttons without handlers (FORBIDDEN)
grep -rn "<button[^>]*>[^<]*</button>" src --include="*.tsx" | grep -v "onClick"

# Icon buttons without aria-label (FORBIDDEN)
grep -rn "<button[^>]*>[[:space:]]*<.*Icon" src --include="*.tsx" | grep -v "aria-label"

# Mocking Tauri APIs (FORBIDDEN)
grep -rn "jest.mock.*tauri\|vi.mock.*tauri" src --include="*.ts" --include="*.tsx"
```

**If any detection command returns results → FIX before committing.**

---

## Built-in Capabilities

These are capabilities the agent uses within todos (not external Agent Skills):

| Capability | Description | When to Use |
|------------|-------------|-------------|
| **Project Setup** | Initialize Tauri + React + testing infrastructure | Todo 2 |
| **E2E Test Writing** | Create WebdriverIO tests from specs | Todo 3 |
| **Implementation** | Write React components, Tauri commands, Rust backend | Todo 4 (Free Zone) |
| **WebSearch** | Find current docs, patterns, solutions | Todos 2, 4 (when stuck) |

---

## Todos

---

# FIXED START

### Todo 1: Read all planning docs

| Aspect | Detail |
|--------|--------|
| **Purpose** | Understand what to build and how to test it |
| **What agent does** | Reads brainstorm-notes.md (design), user-stories.md (requirements), test-specs.md (verification) |
| **Output** | Mental model of the complete application |
| **Capabilities** | None |
| **Agent Skills** | `Skill tool → tauri` (invoke after reading docs) |
| **Effort** | 5% |

---

### Todo 2: Set up project skeleton

| Aspect | Detail |
|--------|--------|
| **Purpose** | Create the base project structure |
| **What agent does** | Initializes Tauri v2 + React + TypeScript + Tailwind. Sets up test infrastructure (Vitest, WebdriverIO). |
| **Rules** | Use stack constraints from Phase 1. Follow Tauri v2 best practices. WebSearch for current setup guides. |
| **Output** | Working skeleton that builds and runs (empty app) |
| **Capabilities** | Project Setup, WebSearch |
| **Agent Skills** | - |
| **Effort** | 10% |

**Stack (from constraints):**
| Component | Technology |
|-----------|------------|
| Platform | Desktop (Windows, macOS, Linux) |
| Framework | Tauri v2 |
| Frontend | React + TypeScript |
| Backend | Rust |
| Styling | Tailwind CSS |
| Testing | Vitest (unit), WebdriverIO (E2E) |

---

# FREE ZONE (Per Story)

### Todo 3: Write E2E test for current story (RED)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Test-first: create failing test before implementation |
| **What agent does** | Takes next story from test-specs.md, writes E2E test using WebdriverIO. Test must fail (RED state). |
| **Rules** | Use real user actions (click, type, drag). No synthetic events. Test ID matches story ID. |
| **Output** | Failing E2E test file |
| **Capabilities** | E2E Test Writing |
| **Agent Skills** | `Skill tool → test-driven-development` (invoke before writing test) |
| **Effort** | 10% |

**E2E Test Rules:**
```
ALLOWED:
  $('selector').click()
  $('selector').setValue('text')
  $('source').dragAndDrop($('target'))
  browser.keys(['Enter'])

FORBIDDEN:
  browser.execute(() => el.dispatchEvent(...))  // Synthetic events
  browser.execute(() => store.dispatch(...))    // Direct store access
  jest.mock('@tauri-apps/...')                  // Mocking system APIs
```

---

### Todo 4: IMPLEMENTATION LOOP (Ralph-Style Free Zone)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Autonomously implement until test passes |
| **What agent does** | Works freely to make the E2E test pass. Implements React components, Tauri commands, styling. Iterates, debugs, refactors as needed. |
| **Mode** | **FREE ZONE** - No prescribed steps. Agent decides what to do. |
| **Completion Criteria** | E2E test passes (GREEN) |
| **Max Iterations** | 20 per story (safety limit) |
| **On max iterations** | STOP and escalate to human with progress summary |
| **Capabilities** | Implementation, WebSearch |
| **Agent Skills** | `systematic-debugging`, `e2e-rapid-fix`, `react-component-generator`, `tailwind-class-optimizer` (invoke as needed) |
| **Effort** | 40% |

**How the Free Zone Works:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        IMPLEMENTATION LOOP                                  │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         Agent works freely                          │   │
│   │                                                                     │   │
│   │   - Writes code (React, Rust, CSS)                                  │   │
│   │   - Runs test to check progress                                     │   │
│   │   - Reads error messages                                            │   │
│   │   - Debugs and fixes                                                │   │
│   │   - WebSearch when stuck                                            │   │
│   │   - Refactors if needed                                             │   │
│   │   - Tries different approaches                                      │   │
│   │                                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│                   ┌─────────────────────┐                                   │
│                   │   Run E2E test      │                                   │
│                   └─────────────────────┘                                   │
│                              │                                              │
│                    ┌─────────┴─────────┐                                    │
│                    │                   │                                    │
│                 PASSES              FAILS                                   │
│                    │                   │                                    │
│                    ▼                   ▼                                    │
│            ┌──────────────┐   ┌──────────────────┐                          │
│            │ EXIT LOOP    │   │ Iteration++      │                          │
│            │ → Todo 5     │   │ Continue working │                          │
│            └──────────────┘   └──────────────────┘                          │
│                                        │                                    │
│                    ┌───────────────────┘                                    │
│                    ▼                                                        │
│          ┌──────────────────┐                                               │
│          │ Iterations > 20? │                                               │
│          └──────────────────┘                                               │
│                    │                                                        │
│          ┌─────────┴─────────┐                                              │
│          │                   │                                              │
│         NO                  YES                                             │
│          │                   │                                              │
│          ▼                   ▼                                              │
│   ┌────────────┐     ┌────────────────┐                                     │
│   │ Keep       │     │ ESCALATE       │                                     │
│   │ working    │     │ to human       │                                     │
│   └────────────┘     └────────────────┘                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Progress Tracking (during Free Zone):**

The agent maintains a progress file `.pipeline/implementation-progress.json`:

```json
{
  "currentStory": "US-E1-001",
  "iteration": 5,
  "maxIterations": 20,
  "testStatus": "failing",
  "lastError": "Element not found: [data-testid='submit-button']",
  "attemptsSummary": [
    "Iteration 1: Created basic component structure",
    "Iteration 2: Added click handler",
    "Iteration 3: Fixed import paths",
    "Iteration 4: Added missing data-testid",
    "Iteration 5: Debugging element visibility..."
  ]
}
```

**Forbidden Patterns (still enforced in Free Zone):**
```tsx
// FORBIDDEN - Empty handlers
onClick={() => {}}
onClick={() => console.log('TODO')}

// FORBIDDEN - Mocking
jest.mock('@tauri-apps/plugin-fs')
vi.mock('@tauri-apps/api')

// FORBIDDEN - Test-only code paths
if (process.env.NODE_ENV === 'test') { ... }

// FORBIDDEN - Placeholder data
const mockData = { nodes: [], edges: [] };
```

---

### Todo 5: VERIFY: Story complete

| Aspect | Detail |
|--------|--------|
| **Purpose** | Independent verification that story is fully implemented |
| **What agent does** | Spawns Haiku reviewer with checklist |
| **Haiku checks** | E2E test passes? No mocks? No empty handlers? Completeness pairs done? Edge cases handled? |
| **Pass threshold** | Score >= 95 |
| **On fail** | Fix issues and retry (max 3 attempts), then escalate |
| **Capabilities** | Review Loop |
| **Agent Skills** | - |
| **Effort** | 5% |

**Completeness Pairs Check:**
| Action | Required Pair |
|--------|---------------|
| Add / Create | Delete / Remove |
| Open / Expand | Close / Collapse |
| Show | Hide |
| Enable | Disable |
| Connect | Disconnect |
| Select | Deselect |
| Start | Stop |

---

### Todo 6: Repeat todos 3-5 for remaining stories in epic

| Aspect | Detail |
|--------|--------|
| **Purpose** | Complete all stories in the current epic |
| **What agent does** | Loops back to Todo 3 for next story. Continues until all stories in epic are done. |
| **Rules** | Process stories in dependency order. Run all tests after each story to catch regressions. |
| **Exit condition** | All stories in current epic have passing tests |
| **Capabilities** | None |
| **Agent Skills** | - |
| **Effort** | (included in todos 3-5) |

---

# FIXED END (Per Epic)

### Todo 7: VERIFY: Epic complete

| Aspect | Detail |
|--------|--------|
| **Purpose** | Independent verification that entire epic is done |
| **What agent does** | Spawns Haiku reviewer with checklist |
| **Haiku checks** | All stories implemented? All E2E tests pass? No mocks anywhere? Completeness pairs done? |
| **Pass threshold** | Score >= 95 |
| **On fail** | Fix issues and retry (max 3 attempts), then escalate |
| **Capabilities** | Review Loop |
| **Agent Skills** | - |
| **Effort** | 5% |

---

### Todo 8: Run detection commands

| Aspect | Detail |
|--------|--------|
| **Purpose** | Verify no forbidden patterns exist before commit |
| **What agent does** | Runs all detection commands from Mandatory Standards Enforcement section |
| **Rules** | If ANY command returns results, FIX the issues before proceeding |
| **Output** | All detection commands return empty (no violations) |
| **Capabilities** | None |
| **Agent Skills** | `Skill tool → verification-before-completion` (invoke before commands) |
| **Effort** | 3% |

---

### Todo 9: Commit epic

| Aspect | Detail |
|--------|--------|
| **Purpose** | Save progress with proper git commit |
| **What agent does** | Creates conventional commit with epic summary, test counts, Co-Authored-By |
| **Format** | `feat(epic-N): implement [Epic Name]` with body listing stories completed |
| **Rules** | All tests must pass. All detection commands clean. Never commit with violations. |
| **Output** | Git commit |
| **Capabilities** | None |
| **Agent Skills** | - |
| **Effort** | 2% |

**Commit Format:**
```
feat(epic-1): implement [Epic Name]

Stories completed:
- US-E1-001: [Story name]
- US-E1-002: [Story name]
- US-E1-003: [Story name]

Tests: 3 E2E passing

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

### Todo 10: Repeat todos 3-9 for remaining epics

| Aspect | Detail |
|--------|--------|
| **Purpose** | Complete all epics in the project |
| **What agent does** | Loops back to Todo 3 for next epic. Continues until all epics are done. |
| **Rules** | Process epics in dependency order. Run full test suite after each epic. |
| **Exit condition** | All epics have passing tests and are committed |
| **Capabilities** | None |
| **Agent Skills** | - |
| **Effort** | (included in todos 3-9) |

---

### Todo 11: VERIFY: All implementation complete

| Aspect | Detail |
|--------|--------|
| **Purpose** | Final verification that entire implementation is done |
| **What agent does** | Spawns Haiku reviewer with checklist |
| **Haiku checks** | All epics done? All E2E tests pass? Full test suite green? No TODO comments left? Build succeeds? |
| **Pass threshold** | Score >= 95 |
| **On fail** | Fix issues and retry (max 3 attempts), then escalate |
| **Capabilities** | Review Loop |
| **Agent Skills** | - |
| **Effort** | 5% |

---

## Summary Table

| Zone | # | Todo Name | Type | Agent Skills | Effort |
|------|---|-----------|------|--------------|--------|
| | 0 | **Phase Start** | - | `Skill tool → tauri` | - |
| **FIXED START** | 1 | Read all planning docs | Prescribed | (tauri invoked at start) | 5% |
| | 2 | Set up project skeleton | Prescribed | - | 10% |
| **FREE ZONE** | 3 | Write E2E test (RED) | Prescribed | `Skill tool → test-driven-development` | 10% |
| | 4 | IMPLEMENTATION LOOP | **Autonomous** | `systematic-debugging`, `e2e-rapid-fix`, `react-component-generator`, `tailwind-class-optimizer` | 40% |
| | 5 | VERIFY: Story complete | Prescribed | - | 5% |
| | 6 | Repeat todos 3-5 for stories | Loop | - | - |
| **FIXED END** | 7 | VERIFY: Epic complete | Prescribed | - | 5% |
| | 8 | Run detection commands | Prescribed | `Skill tool → verification-before-completion` | 3% |
| | 9 | Commit epic | Prescribed | - | 2% |
| | 10 | Repeat todos 3-9 for epics | Loop | - | - |
| | 11 | VERIFY: All complete | Prescribed | - | 5% |
| | | **Total** | | | **100%** |

---

## Flow Diagram

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                          PHASE 4: DEVELOPER AGENT                             │
│                        (Three-Part Structure)                                 │
└───────────────────────────────────────────────────────────────────────────────┘

                    ╔═══════════════════════════════════╗
                    ║         FIXED START               ║
                    ╠═══════════════════════════════════╣
                    ║  Todo 1: Read docs                ║
                    ║           ↓                       ║
                    ║  Todo 2: Setup skeleton           ║
                    ╚═══════════════════════════════════╝
                                   │
                                   ▼
    ╔═══════════════════════════════════════════════════════════════════════╗
    ║                          FREE ZONE                                    ║
    ║                       (Per Story Loop)                                ║
    ╠═══════════════════════════════════════════════════════════════════════╣
    ║                                                                       ║
    ║   ┌─────────────────────────────────────────────────────────────┐     ║
    ║   │  Todo 3: Write E2E test (RED) ─────────────────────┐        │     ║
    ║   │                                                    │        │     ║
    ║   │                       ▼                            │        │     ║
    ║   │  ┌─────────────────────────────────────────────┐   │        │     ║
    ║   │  │  Todo 4: IMPLEMENTATION LOOP                │   │        │     ║
    ║   │  │  ┌─────────────────────────────────────┐    │   │        │     ║
    ║   │  │  │  Agent works AUTONOMOUSLY           │    │   │        │     ║
    ║   │  │  │  - Code, test, debug, iterate       │    │   │        │     ║
    ║   │  │  │  - Until test GREEN or max 20       │    │   │        │     ║
    ║   │  │  └─────────────────────────────────────┘    │   │        │     ║
    ║   │  └─────────────────────────────────────────────┘   │        │     ║
    ║   │                       ▼                            │        │     ║
    ║   │  Todo 5: VERIFY: Story complete ◀── Haiku Review   │        │     ║
    ║   │                       │                            │        │     ║
    ║   │           ◀───────────┴──── Next Story ────────────┘        │     ║
    ║   └─────────────────────────────────────────────────────────────┘     ║
    ║                                                                       ║
    ╚═══════════════════════════════════════════════════════════════════════╝
                                   │
                                   ▼
                    ╔═══════════════════════════════════╗
                    ║          FIXED END                ║
                    ║        (Per Epic)                 ║
                    ╠═══════════════════════════════════╣
                    ║  Todo 7: VERIFY: Epic complete    ║
                    ║           ↓                       ║
                    ║  Todo 8: Run detection commands   ║
                    ║           ↓                       ║
                    ║  Todo 9: Commit epic              ║
                    ╚═══════════════════════════════════╝
                                   │
                          Repeat for each epic
                                   │
                                   ▼
                    ╔═══════════════════════════════════╗
                    ║  Todo 11: VERIFY: All complete    ║
                    ╚═══════════════════════════════════╝
                                   │
                                   ▼
                         All E2E Tests GREEN
```

---

## Key Differences from Previous Version

| Aspect | Previous (v10) | New (v11) |
|--------|----------------|-----------|
| **Todo 4** | Fixed step "Implement until GREEN" | **FREE ZONE** with Ralph-style autonomous loop |
| **Agent freedom** | Must follow prescribed sequence | Free to iterate, debug, try approaches |
| **Progress tracking** | Only todo status | `.pipeline/implementation-progress.json` with iteration count |
| **Max iterations** | None | 20 per story (safety limit) |
| **Escalation** | Only on review failure | Also on max iterations reached |
| **Effort distribution** | 35% to "Implement" | 40% to "IMPLEMENTATION LOOP" |

---

## Status

Under Review - Ready for implementation as agent CLAUDE.md
