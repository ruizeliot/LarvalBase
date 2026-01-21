# Phase 3: Test Architect (Test Specs)

**Pipeline Version:** 11.0
**Phase:** 3 - Test Architect
**Mode:** Autonomous (no user interaction)

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

---

## Startup: Initialize Todos

**IMMEDIATELY call TodoWrite with this EXACT list:**

```
TodoWrite([
  { content: "1. Read user-stories.md", status: "in_progress", activeForm: "Reading user stories" },
  { content: "2. Risk assessment per epic", status: "pending", activeForm: "Assessing risks" },
  { content: "3. Define E2E test spec per story", status: "pending", activeForm: "Defining test specs" },
  { content: "4. VERIFY: 1:1 mapping", status: "pending", activeForm: "Verifying 1:1 mapping" },
  { content: "5. Add edge cases per test (MANDATORY)", status: "pending", activeForm: "Adding edge cases" },
  { content: "6. Define test data requirements", status: "pending", activeForm: "Defining test data" },
  { content: "7. VERIFY: Test quality", status: "pending", activeForm: "Verifying test quality" },
  { content: "8. Create test-specs.md", status: "pending", activeForm: "Creating test-specs.md" },
  { content: "9. Git commit Phase 3", status: "pending", activeForm: "Committing" }
])
```

---

## Agent Skills (Invoke with Skill tool)

**CRITICAL: Skills are NOT auto-triggered in autonomous mode. You MUST explicitly invoke them.**

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

---

## Core Principle: 1 Story = 1 E2E Test

Every user story has exactly one E2E test specification.

- Story too big for 1 test → Should have been split in Phase 2
- Story too small for 1 test → Should have been merged in Phase 2
- Story complete = Test passes

---

## Todos

### Todo 1: Read user-stories.md

| Aspect | Detail |
|--------|--------|
| **Purpose** | Understand what needs testing |
| **What to do** | Read `docs/user-stories.md`, extract all stories and acceptance criteria |
| **Output** | Mental model of test requirements |
| **Agent Skills** | `Skill tool → tauri` (invoke after reading, for E2E patterns) |

---

### Todo 2: Risk assessment per epic

| Aspect | Detail |
|--------|--------|
| **Purpose** | Prioritize testing effort based on risk |
| **What to do** | Assign risk level to each epic: P0 (critical), P1 (important), P2 (nice-to-have) |
| **Output** | Risk matrix by epic |

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
| **Format** | Test ID matches story ID (e.g., US-E1-001 → TEST-E1-001) |
| **Rules** | Test must verify all acceptance criteria. Test must use real user actions. |
| **Agent Skills** | `Skill tool → test-driven-development` (invoke before writing specs) |

**Test Spec Format:**

```markdown
### TEST-E1-001: [Test Name]

**Story:** US-E1-001
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
| **What to do** | Spawn Haiku reviewer with checklist |
| **Haiku checks** | Every story has a test? No story has multiple tests? No test covers multiple stories? |
| **Pass threshold** | Score >= 95 |
| **On fail** | Fix issues and retry (max 3 attempts), then escalate |

---

### Todo 5: Add edge cases per test (MANDATORY)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Identify what could go wrong for each test |
| **Rules** | MINIMUM 2 edge cases per test from different categories |
| **Output** | Enhanced test specs with edge cases |

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
| **What to do** | For each test, list: fixtures needed, mock data (if any), setup steps |
| **Rules** | Prefer real data flows over mocks. Only mock external APIs if unavoidable. |
| **Agent Skills** | `Skill tool → integration-test-setup` (invoke for test infrastructure) |

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
| **What to do** | Spawn Haiku reviewer with checklist |
| **Haiku checks** | Edge cases covered? Tests are specific? No mocking of system APIs? |
| **Pass threshold** | Score >= 95 |
| **On fail** | Fix issues and retry (max 3 attempts), then escalate |

---

### Todo 8: Create test-specs.md

| Aspect | Detail |
|--------|--------|
| **Purpose** | Write the final deliverable document |
| **Format** | Test index, risk matrix, specs per epic |
| **Output** | `docs/test-specs.md` |

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
**Story:** US-E1-001
**Priority:** P0

**Preconditions:**
- ...

**Steps:**
1. ...

**Expected Result:**
- ...

**Edge Cases:**
- [Category]: [Test assertion]
- [Category]: [Test assertion]

**Test Data:**
- ...

---

## Epic 2: [Name]
...
```

---

### Todo 9: Git commit Phase 3

| Aspect | Detail |
|--------|--------|
| **Purpose** | Save progress with proper git commit |
| **Format** | `test(phase-3): create test specifications from user stories` |

**Commit Message:**
```
test(phase-3): create test specifications from user stories

Tests: X specs
Edge cases: Y (min 2 per test)
Risk levels: P0=A, P1=B, P2=C

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Completion Output

```
════════════════════════════════════════════════════════════════
Phase 3 Complete
════════════════════════════════════════════════════════════════

📊 Test Specifications Created:
   Test specs: X
   Edge cases: Y (min 2 per test)

📊 Risk Matrix:
   P0 (Critical): A epics
   P1 (Important): B epics
   P2 (Nice-to-have): C epics

✅ Quality Verified:
   1:1 mapping verified ✓
   Edge cases complete ✓
   No mocking required ✓

✅ Git Commit: CREATED

Ready for Phase 4: Developer
════════════════════════════════════════════════════════════════
```

---

## Phase-Specific Rules

### You Must (Phase 3)
- Read user-stories.md completely before starting
- Invoke skills at specified checkpoints
- Create exactly 1 test per story (1:1 mapping)
- Add minimum 2 edge cases per test from different categories
- Specify test data requirements
- Verify with Haiku reviewer at checkpoints

### You Must NOT (Phase 3)
- Create tests for stories that don't exist
- Have a story without a test
- Skip edge case requirements
- Plan to mock Tauri/system APIs
- Write any code (that's Phase 4)
- Create skeleton or project structure (that's Phase 4)

---

**Execute now. Read user-stories.md, create test specs, verify quality.**
