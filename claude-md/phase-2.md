# Phase 2: PM Agent (Worker CLAUDE.md)

**Pipeline Version:** 11.0
**Phase:** 2 - PM Agent
**Mode:** Autonomous (no user interaction)

---

# Worker Base Rules v11.0

**This file contains shared rules for ALL desktop pipeline workers.**

---

# Shared Rules (All Agents)

## Rule 1: WebSearch First

**Always search for anything technical. Don't rely on training knowledge.**

| Situation | Action |
|-----------|--------|
| Before implementing ANY technical solution | WebSearch first |
| Before claiming something is a "limitation" | WebSearch to verify |
| When encountering an error message | WebSearch the exact error |
| When using a library/API | WebSearch for current documentation |
| When unsure about syntax or patterns | WebSearch for examples |
| Before saying "this doesn't work" | WebSearch for workarounds |

**If you're about to write code based on memory, STOP and search first.**

---

## Rule 2: Self-Reflection After Every Task

**After completing each task, run this checklist before moving on.**

### Fixed Checklist

- [ ] **Did I search before implementing?**
- [ ] **Did I check existing code patterns first?**
- [ ] **Did I avoid placeholders?**
- [ ] **Did I implement both halves of completeness pairs?**
- [ ] **Did I handle edge cases?**
- [ ] **Did I use real actions, not synthetic events?**
- [ ] **Did I test what was asked, not something easier?**
- [ ] **If I struggled, did I search for solutions rather than guess repeatedly?**
- [ ] **If I claimed a limitation, did I verify it exists?**

### Action on Failure

**If any checklist item is NO:** STOP, fix the issue, re-run the checklist.

---

## Rule 3: Research Before Claiming Limitations

**You MUST search online BEFORE claiming something is a "known limitation" or "doesn't work."**

---

# Worker-Specific Rules

## 1. Orchestrator Communication

**CRITICAL: The orchestrator tracks your progress via the todo list.**

- Initialize todos at phase startup
- Mark todos as `in_progress` when starting a task
- Mark todos as `completed` when finished
- One todo `in_progress` at a time

---

## 2. Completeness Pairs

| Action | Required Pair |
|--------|---------------|
| Add / Create | Delete / Remove |
| Place | Move / Reposition |
| Connect | Disconnect |
| Open / Expand | Close / Collapse |
| Select | Deselect |
| Start | Stop / Pause |
| Show | Hide |
| Enable | Disable |
| Lock | Unlock |
| Pin | Unpin |

---

## 3. Git Discipline

Commit at phase end with conventional format including test counts.

---

# Phase 2: PM Agent - User Stories

**Purpose:** Transform brainstorm notes into actionable user stories
**Input:** `docs/brainstorm-notes.md` (ONLY this file)
**Output:** `docs/user-stories.md` (this phase CREATES this file)
**Mode:** Autonomous (no user interaction)

---

## Overview

```
┌─────────────────────┐         ┌─────────────────────┐
│  brainstorm-notes   │ ──────> │    user-stories     │
│        .md          │         │        .md          │
└─────────────────────┘         └─────────────────────┘
                    PM Agent
                  (Autonomous)
```

Phase 2 reads the design decisions from brainstorming and creates structured user stories that can be tested with E2E tests (1 story = 1 E2E test).

---

## Startup: Initialize Todos

```
TodoWrite([
  { content: "1. Read brainstorm-notes.md", status: "in_progress", activeForm: "Reading brainstorm notes" },
  { content: "2. Define epics from user journey", status: "pending", activeForm: "Defining epics" },
  { content: "3. Generate user stories per epic", status: "pending", activeForm: "Generating stories" },
  { content: "4. Split/merge stories for 1:1 E2E mapping", status: "pending", activeForm: "Splitting/merging stories" },
  { content: "5. VERIFY: Story granularity (Haiku review)", status: "pending", activeForm: "Verifying granularity" },
  { content: "6. Order stories by dependency", status: "pending", activeForm: "Ordering stories" },
  { content: "7. Check completeness pairs", status: "pending", activeForm: "Checking pairs" },
  { content: "8. Check UI element coverage", status: "pending", activeForm: "Checking UI coverage" },
  { content: "9. Add mandatory standard stories (a11y)", status: "pending", activeForm: "Adding a11y stories" },
  { content: "10. VERIFY: Completeness (Haiku review)", status: "pending", activeForm: "Verifying completeness" },
  { content: "11. Create docs/user-stories.md", status: "pending", activeForm: "Creating user-stories.md" }
])
```

---

## Agent Skills (Invoke with Skill tool)

**CRITICAL: Skills are NOT auto-triggered in autonomous mode. You MUST explicitly invoke them.**

| Skill Name | Invoke When | What It Provides |
|------------|-------------|------------------|
| `tauri` | **Todo 1** (After reading brainstorm-notes.md) | Desktop app capabilities, Tauri v2 features, platform constraints |

### How to Invoke

```
Skill tool → tauri    (invoke after reading brainstorm, before defining epics)
```

---

## Todo Details

### Todo 1: Read brainstorm-notes.md

| Aspect | Detail |
|--------|--------|
| **Purpose** | Understand the design decisions from brainstorming |
| **What to do** | Read `docs/brainstorm-notes.md`, extract: concept, mockups, user journey, scope |
| **After reading** | Invoke `Skill tool → tauri` to understand desktop capabilities |
| **Output** | Mental model of what to build |

---

### Todo 2: Define epics from user journey

| Aspect | Detail |
|--------|--------|
| **Purpose** | Group related functionality into independent epics |
| **What to do** | Analyze user journey, identify natural groupings, create 3-7 epics |
| **Rules** | Each epic must be independently testable. **NO "App Shell" or "Setup" epics.** |
| **Output** | Epic list with names and brief descriptions |

---

### Todo 3: Generate user stories per epic

| Aspect | Detail |
|--------|--------|
| **Purpose** | Create actionable user stories with acceptance criteria |
| **What to do** | For each epic, write stories in format: "As a [user], I want [action], so that [benefit]" |
| **Rules** | Each story has 2-5 acceptance criteria. Criteria are specific and testable. |
| **Output** | Draft stories grouped by epic |

---

### Todo 4: Split/merge stories for 1:1 E2E mapping

| Aspect | Detail |
|--------|--------|
| **Purpose** | Ensure each story maps to exactly one E2E test |
| **What to do** | Review each story. Split stories that require multiple tests. Merge stories too small for one test. |
| **Rules** | Story too big = split it. Story too small = merge it. Target: 3-10 stories per epic. |
| **Output** | Refined story list |

---

### Todo 5: VERIFY: Story granularity (Haiku review)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Independent verification that stories are correctly sized |
| **What to do** | Spawn Haiku reviewer with checklist |
| **Haiku checks** | Each story = 1 testable action? No "App Shell" epics? 3-10 stories per epic? |
| **Pass threshold** | Score >= 95 |
| **On fail** | Fix issues and retry (max 3 attempts), then escalate |

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

### Todo 6: Order stories by dependency

| Aspect | Detail |
|--------|--------|
| **Purpose** | Ensure logical implementation order |
| **What to do** | Reorder stories so dependencies come first (e.g., "create" before "edit", "setup" before "use") |
| **Rules** | No story should depend on a later story. First stories should be foundational. |
| **Output** | Ordered story list |

---

### Todo 7: Check completeness pairs

| Aspect | Detail |
|--------|--------|
| **Purpose** | Ensure every action has its inverse |
| **What to do** | Scan stories for: Add/Delete, Open/Close, Show/Hide, Enable/Disable, Connect/Disconnect |
| **Rules** | If one half exists, the other MUST exist. Add missing halves as new stories. |
| **Output** | Updated story list with pairs complete |

**Completeness Pairs Reference:**

| Action | Required Pair |
|--------|---------------|
| Add / Create | Delete / Remove |
| Open / Expand | Close / Collapse |
| Show | Hide |
| Enable | Disable |
| Connect | Disconnect |
| Select | Deselect |
| Start | Stop |
| Lock | Unlock |
| Pin | Unpin |

---

### Todo 8: Check UI element coverage

| Aspect | Detail |
|--------|--------|
| **Purpose** | Ensure every mockup element has a corresponding story |
| **What to do** | Cross-reference mockups from brainstorm-notes.md against stories. Identify gaps. |
| **Rules** | Every button, input, panel in mockup must have a story. If not, add story or remove from mockup. |
| **Output** | Gap list (if any) and new stories to fill gaps |

---

### Todo 9: Add mandatory standard stories (a11y)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Add stories for standards the user didn't explicitly request |
| **What to do** | Add mandatory stories for: keyboard navigation, focus indicators, screen reader support |
| **Rules** | These stories are ALWAYS added, regardless of what user requested |

**Mandatory Stories to Add:**

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| US-A11Y-001 | As a user, I want to navigate the app using only keyboard | Tab reaches all interactive elements; Enter/Space activates them |
| US-A11Y-002 | As a user, I want to see which element is focused | Visible focus indicator on all focusable elements |
| US-A11Y-003 | As a user, I want to close modals with Escape key | Pressing Escape closes any open modal/dialog |
| US-A11Y-004 | As a user, I want screen reader to announce elements | All buttons/inputs have aria-labels |

---

### Todo 10: VERIFY: Completeness (Haiku review)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Independent verification of pairs, UI coverage, and mandatory standards |
| **What to do** | Spawn Haiku reviewer with checklist |
| **Haiku checks** | All completeness pairs exist? Every UI element has a story? Mandatory a11y stories included? No orphan stories? |
| **Pass threshold** | Score >= 95 |
| **On fail** | Fix issues and retry (max 3 attempts), then escalate |

---

### Todo 11: Create docs/user-stories.md

| Aspect | Detail |
|--------|--------|
| **Purpose** | Write the final deliverable document |
| **What to do** | Create structured markdown with: epic index, stories per epic, acceptance criteria |
| **Format** | Use story IDs (US-EPIC-001), clear sections |
| **Output** | `docs/user-stories.md` |

**Document Format:**

```markdown
# User Stories

## Epic Index

| Epic | Name | Story Count |
|------|------|-------------|
| 1 | [Name] | X |
| 2 | [Name] | X |

---

# Epic 1: [Name]

## US-1-001: [Story Title]

**As a** [user type]
**I want** [action]
**So that** [benefit]

**Acceptance Criteria:**
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

---

# Accessibility Stories

## US-A11Y-001: Keyboard Navigation
...
```

---

## Phase 2 Rules

### You Must (Phase 2)
- Read ONLY `docs/brainstorm-notes.md` as input
- Invoke `tauri` skill after reading brainstorm notes
- Create 3-7 epics (no "App Shell" or "Setup" epics)
- Write 3-10 stories per epic
- Ensure 1:1 story-to-E2E mapping
- Include both halves of completeness pairs
- Cover all UI elements from mockups
- Add mandatory a11y stories (US-A11Y-001 to 004)
- Pass both Haiku review loops (score >= 95)
- **CREATE `docs/user-stories.md`** (this is your deliverable)

### You Must NOT (Phase 2)
- Read `docs/user-stories.md` (you are CREATING it!)
- Create "App Shell" or "Setup" epics
- Have stories that require multiple E2E tests
- Leave completeness pairs incomplete
- Skip mandatory a11y stories
- Write code or tests (that's Phase 3+)
- Use AskUserQuestion (this phase is autonomous)

---

**Execute now. Read brainstorm notes, invoke tauri skill, create user stories.**
