# Phase 3: Test Architect Agent

**Version:** v11 (In Progress)
**Created:** 2026-01-09
**Status:** Under Review

---

## Overview

Phase 3 transforms user stories into E2E test specifications (test-first approach).

```
┌─────────────────────┐    ┌─────────────────────┐         ┌─────────────────────┐
│  brainstorm-notes   │    │    user-stories     │ ──────▶ │     test-specs      │
│        .md          │    │        .md          │         │        .md          │
└─────────────────────┘    └─────────────────────┘         └─────────────────────┘
         │                              │
         └──────────────┬───────────────┘
                        │
                  Test Architect
                   (Autonomous)
```

**Input:** `docs/brainstorm-notes.md`, `docs/user-stories.md`
**Output:** `docs/test-specs.md`
**Mode:** Autonomous (no user interaction)

**References:** [14-mandatory-standards.md](./14-mandatory-standards.md)

---

## Agent Skills (Invoke with Skill tool)

**CRITICAL: Skills are NOT auto-triggered in autonomous mode. You MUST explicitly invoke them.**

Phase 3 creates test specifications. These skills help write accurate, implementable tests.

| Skill Name | Invoke When | What It Provides |
|------------|-------------|------------------|
| `tauri` | **Todo 1** (After reading stories) | Tauri v2 E2E testing patterns, WebdriverIO integration |
| `test-driven-development` | **Todo 3** (When defining test specs) | TDD principles, test-first patterns, assertion strategies |
| `integration-test-setup` | **Todo 6** (When defining test data) | Test infrastructure patterns, fixture strategies |

### How to Invoke

```
Skill tool → tauri                    (invoke after reading stories)
Skill tool → test-driven-development  (invoke before writing test specs)
Skill tool → integration-test-setup   (invoke when defining test data requirements)
```

### Why Manual Invocation is Required

Skills trigger on **user messages only**. In autonomous phases, the worker receives ONE user message (the phase command) then works alone. Without explicit invocation, skills are never loaded.

---

## Mandatory Standards Enforcement

The Test Architect automatically adds test requirements for mandatory standards:

| Standard | Test Requirements |
|----------|-------------------|
| **Keyboard Navigation** | E2E test: navigate entire app using only Tab/Enter/Space |
| **Focus Indicators** | E2E test: verify visible focus on all interactive elements |
| **Edge Cases** | Each test MUST include 2+ edge cases from the matrix |
| **No Synthetic Events** | All tests use real WebdriverIO actions, no dispatchEvent |

---

## Core Principle: 1 Story = 1 E2E Test

Every user story has exactly one E2E test specification.

- Story too big for 1 test → Should have been split in Phase 2
- Story too small for 1 test → Should have been merged in Phase 2
- Story complete = Test passes

**Why this works for AI:**
- Clear verification: test passes = story done
- No ambiguity: exactly one test per story
- Test-first: specs written before implementation

---

## Built-in Capabilities

These are capabilities the agent uses within todos (not external Agent Skills):

| Capability | Description | When to Use |
|------------|-------------|-------------|
| **Risk Assessment** | Prioritize by impact (P0/P1/P2) | When analyzing epics for risk |
| **E2E Spec Writing** | Create detailed test specifications | When defining tests per story |
| **Edge Case Identification** | Find what could go wrong | When enhancing tests |

---

## Todos

### Todo 1: Read user-stories.md

| Aspect | Detail |
|--------|--------|
| **Purpose** | Understand what needs testing |
| **What agent does** | Reads user-stories.md, extracts all stories and acceptance criteria |
| **Output** | Mental model of test requirements |
| **Capabilities** | None |
| **Agent Skills** | `Skill tool → tauri` (invoke after reading, for E2E patterns) |
| **Effort** | 5% |

---

### Todo 2: Risk assessment per epic

| Aspect | Detail |
|--------|--------|
| **Purpose** | Prioritize testing effort based on risk |
| **What agent does** | Assigns risk level to each epic: P0 (critical), P1 (important), P2 (nice-to-have) |
| **Criteria** | P0 = core functionality, data loss risk, security. P1 = main features. P2 = edge cases, polish. |
| **Output** | Risk matrix by epic |
| **Capabilities** | Risk Assessment |
| **Agent Skills** | - |
| **Effort** | 10% |

**Risk Level Definitions:**

| Level | Description | Examples |
|-------|-------------|----------|
| **P0** | Critical - Core functionality, data integrity, security | Save/load data, authentication, main workflow |
| **P1** | Important - Main features users expect | Search, filter, sort, edit operations |
| **P2** | Nice-to-have - Polish, edge cases | Animations, keyboard shortcuts, rare scenarios |

---

### Todo 3: Define E2E test spec per story

| Aspect | Detail |
|--------|--------|
| **Purpose** | Create exactly one E2E test specification per user story |
| **What agent does** | For each story, writes: test name, preconditions, steps, expected result |
| **Rules** | Test must verify all acceptance criteria. Test must use real user actions (click, type, drag). |
| **Format** | Test ID matches story ID (e.g., US-EPIC-001 → TEST-EPIC-001) |
| **Output** | Draft test specs |
| **Capabilities** | E2E Spec Writing |
| **Agent Skills** | `Skill tool → test-driven-development` (invoke before writing specs) |
| **Effort** | 25% |

**Test Spec Format:**

```markdown
### TEST-EPIC-001: [Test Name]

**Story:** US-EPIC-001
**Priority:** P0/P1/P2

**Preconditions:**
- [What must be true before test runs]

**Steps:**
1. [User action using real interactions]
2. [Next action]
3. [Continue...]

**Expected Result:**
- [What should happen]
- [Verifies acceptance criterion 1]
- [Verifies acceptance criterion 2]
```

---

### Todo 4: VERIFY: 1:1 mapping

| Aspect | Detail |
|--------|--------|
| **Purpose** | Independent verification that every story has exactly one test |
| **What agent does** | Spawns Haiku reviewer with checklist |
| **Haiku checks** | Every story has a test? No story has multiple tests? No test covers multiple stories? |
| **Pass threshold** | Score >= 95 |
| **On fail** | Fix issues and retry (max 3 attempts), then escalate |
| **Capabilities** | Review Loop |
| **Agent Skills** | - |
| **Effort** | 5% |

**Review Loop Protocol:**
```
Worker completes task
       |
Spawns Haiku reviewer with checklist
       |
Reviewer scores (0-100)
       |
Score >= 95?
    YES -> Proceed to next todo
    NO  -> Fix issues, retry (max 3 attempts)
           -> If 3 failures -> ESCALATE to human
```

---

### Todo 5: Add edge cases per test (MANDATORY)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Identify what could go wrong for each test |
| **What agent does** | For each test, adds 2+ edge cases from the matrix below |
| **Rules** | MINIMUM 2 edge cases per test. Edge cases are additional assertions within the same test. |
| **Output** | Enhanced test specs with edge cases |
| **Capabilities** | Edge Case Identification |
| **Agent Skills** | - |
| **Effort** | 15% |

**Edge Case Matrix (MANDATORY - pick 2+ per test):**

| Category | Edge Cases | Example Test Assertion |
|----------|------------|------------------------|
| **Empty state** | No items, first item, single item | "When list is empty, show placeholder" |
| **Boundaries** | Min value, max value, at limit | "Cannot add more than 100 items" |
| **Invalid input** | Empty string, special chars, too long | "Reject input with < > characters" |
| **Rapid actions** | Double-click, spam clicks, drag cancel | "Double-click doesn't duplicate action" |
| **Interruption** | Action during loading, mid-drag escape | "Pressing Escape cancels drag" |
| **State conflicts** | Delete while editing, move while drag | "Cannot delete item being edited" |

---

### Todo 6: Define test data requirements

| Aspect | Detail |
|--------|--------|
| **Purpose** | Specify what data each test needs |
| **What agent does** | For each test, lists: fixtures needed, mock data (if any), setup steps |
| **Rules** | Prefer real data flows over mocks. Only mock external APIs if unavoidable. |
| **Output** | Test data section per test |
| **Capabilities** | None |
| **Agent Skills** | `Skill tool → integration-test-setup` (invoke for test infrastructure) |
| **Effort** | 10% |

**No Mocking Policy:**
- NEVER mock system APIs (Tauri, filesystem, dialog)
- NEVER mock internal application code
- ONLY mock external third-party APIs if absolutely necessary
- If test needs mock → implementation is incomplete

---

### Todo 7: VERIFY: Test quality

| Aspect | Detail |
|--------|--------|
| **Purpose** | Independent verification of test completeness and quality |
| **What agent does** | Spawns Haiku reviewer with checklist |
| **Haiku checks** | Edge cases covered? Tests are specific (not vague)? No mocking of system APIs? |
| **Pass threshold** | Score >= 95 |
| **On fail** | Fix issues and retry (max 3 attempts), then escalate |
| **Capabilities** | Review Loop |
| **Agent Skills** | - |
| **Effort** | 5% |

---

### Todo 8: Create test-specs.md

| Aspect | Detail |
|--------|--------|
| **Purpose** | Write the final deliverable document |
| **What agent does** | Creates structured markdown with: test index, risk matrix, specs per epic |
| **Format** | Follows template with test IDs, clear sections, traceability to stories |
| **Output** | `docs/test-specs.md` |
| **Capabilities** | None |
| **Agent Skills** | - |
| **Effort** | 25% |

**Document Structure:**

```markdown
# Test Specifications

## Risk Matrix
| Epic | Risk Level | Rationale |
|------|------------|-----------|

## Test Index
| Test ID | Story ID | Name | Priority |
|---------|----------|------|----------|

## Epic 1: [Name]
### TEST-E1-001: [Test Name]
...

## Epic 2: [Name]
### TEST-E2-001: [Test Name]
...
```

---

## Summary Table

| # | Todo Name | Capabilities | Agent Skills | Effort |
|---|-----------|--------------|--------------|--------|
| 0 | **Phase Start** | - | - | - |
| 1 | Read user-stories.md | None | `Skill tool → tauri` | 5% |
| 2 | Risk assessment per epic | Risk Assessment | - | 10% |
| 3 | Define E2E test spec per story | E2E Spec Writing | `Skill tool → test-driven-development` | 25% |
| 4 | VERIFY: 1:1 mapping | Review Loop | - | 5% |
| 5 | Add edge cases per test | Edge Case Identification | - | 15% |
| 6 | Define test data requirements | None | `Skill tool → integration-test-setup` | 10% |
| 7 | VERIFY: Test quality | Review Loop | - | 5% |
| 8 | Create test-specs.md | None | - | 25% |
| | **Total** | | | **100%** |

---

## Flow Diagram

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                         PHASE 3: TEST ARCHITECT AGENT                         │
└───────────────────────────────────────────────────────────────────────────────┘

  Todo 1          Todo 2          Todo 3
    │               │               │
    ▼               ▼               ▼
┌───────┐      ┌─────────┐    ┌─────────┐
│ Read  │ ──▶  │  Risk   │ ──▶│ Define  │
│stories│      │ assess  │    │ E2E     │
└───────┘      └─────────┘    │ specs   │
                              └────┬────┘
                                   │
                                   ▼
                           ┌─────────────┐
                           │ VERIFY:     │
                           │ 1:1 mapping │◀─── Haiku Review
                           └──────┬──────┘
                                  │
                                  ▼
                           ┌─────────────┐
                           │ Add edge    │
                           │ cases       │
                           └──────┬──────┘
                                  │
                                  ▼
                           ┌─────────────┐
                           │ Define test │
                           │ data        │
                           └──────┬──────┘
                                  │
                                  ▼
                           ┌─────────────┐
                           │ VERIFY:     │
                           │ test quality│◀─── Haiku Review
                           └──────┬──────┘
                                  │
                                  ▼
                           ┌─────────────┐
                           │   Create    │
                           │ test-specs  │
                           │    .md      │
                           └─────────────┘
                               Todo 8
                                  │
                                  ▼
                            test-specs.md
```

---

## Status

Under Review - Ready for implementation as agent CLAUDE.md
