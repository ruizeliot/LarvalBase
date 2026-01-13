# Phase 2: PM Agent

**Version:** v11 (In Progress)
**Created:** 2026-01-09
**Status:** Under Review

---

## Overview

Phase 2 transforms the brainstorm output into actionable user stories.

```
┌─────────────────────┐         ┌─────────────────────┐
│  brainstorm-notes   │ ──────▶ │    user-stories     │
│        .md          │         │        .md          │
└─────────────────────┘         └─────────────────────┘
                    PM Agent
                  (Autonomous)
```

**Input:** `docs/brainstorm-notes.md`
**Output:** `docs/user-stories.md`
**Mode:** Autonomous (no user interaction)

**References:** [14-mandatory-standards.md](./14-mandatory-standards.md)

---

## Agent Skills (Invoke with Skill tool)

**CRITICAL: Skills are NOT auto-triggered in autonomous mode. You MUST explicitly invoke them.**

Phase 2 has limited Agent Skills because it's primarily writing/structuring work. However, understanding the target platform helps write accurate stories.

| Skill Name | Invoke When | What It Provides |
|------------|-------------|------------------|
| `tauri` | **Todo 1** (After reading brainstorm-notes.md) | Desktop app capabilities, Tauri v2 features, platform constraints |

### How to Invoke

```
Skill tool → tauri    (invoke after reading brainstorm, before defining epics)
```

### Why Manual Invocation is Required

Skills trigger on **user messages only**. In autonomous phases, the worker receives ONE user message (the phase command) then works alone. Without explicit invocation, skills are never loaded.

---

## Mandatory Standards Enforcement

The PM Agent automatically adds stories for mandatory standards even if not mentioned in brainstorm:

| Standard | Mandatory Stories Added |
|----------|------------------------|
| **Keyboard Navigation** | "User can navigate all interactive elements using Tab/Enter/Space" |
| **Focus Indicators** | "User can see which element is focused" |
| **Screen Reader** | "User can use app with screen reader" |
| **Completeness Pairs** | Both halves of every action (Add/Delete, Open/Close, etc.) |

These are added automatically in Todo 9 (Add mandatory standard stories).

---

## Built-in Capabilities

These are capabilities the agent uses within todos (not external Agent Skills):

| Capability | Description | When to Use |
|------------|-------------|-------------|
| **Dependency Ordering** | Arrange items so prerequisites come first | When defining epics, ordering stories |
| **Acceptance Criteria Writing** | Create specific, testable criteria | When generating stories |
| **Story Splitting** | Break large stories into 1:1 E2E-testable units | When stories are too big or too small |

---

## Todos

### Todo 1: Read brainstorm-notes.md

| Aspect | Detail |
|--------|--------|
| **Purpose** | Understand the design decisions from brainstorming |
| **What agent does** | Reads the entire brainstorm-notes.md, extracts: concept, mockups, user journey, scope |
| **Output** | Mental model of what to build |
| **Capabilities** | None |
| **Agent Skills** | `Skill tool → tauri` (invoke after reading, before next todo) |
| **Effort** | 5% |

---

### Todo 2: Define epics from user journey

| Aspect | Detail |
|--------|--------|
| **Purpose** | Group related functionality into independent epics |
| **What agent does** | Analyzes user journey, identifies natural groupings, creates 3-7 epics |
| **Rules** | Each epic must be independently testable. No "App Shell" or "Setup" epics. |
| **Output** | Epic list with names and brief descriptions |
| **Capabilities** | Dependency Ordering |
| **Agent Skills** | - |
| **Effort** | 10% |

---

### Todo 3: Generate user stories per epic

| Aspect | Detail |
|--------|--------|
| **Purpose** | Create actionable user stories with acceptance criteria |
| **What agent does** | For each epic, writes stories in format: "As a [user], I want [action], so that [benefit]" |
| **Rules** | Each story has 2-5 acceptance criteria. Criteria are specific and testable. |
| **Output** | Draft stories grouped by epic |
| **Capabilities** | Acceptance Criteria Writing |
| **Agent Skills** | - |
| **Effort** | 15% |

---

### Todo 4: Split/merge stories for 1:1 E2E mapping

| Aspect | Detail |
|--------|--------|
| **Purpose** | Ensure each story maps to exactly one E2E test |
| **What agent does** | Reviews each story. Splits stories that require multiple tests. Merges stories too small for one test. |
| **Rules** | Story too big = split it. Story too small = merge it. Target: 3-10 stories per epic. |
| **Output** | Refined story list |
| **Capabilities** | Story Splitting |
| **Agent Skills** | - |
| **Effort** | 10% |

---

### Todo 5: VERIFY: Story granularity

| Aspect | Detail |
|--------|--------|
| **Purpose** | Independent verification that stories are correctly sized |
| **What agent does** | Spawns Haiku reviewer with checklist |
| **Haiku checks** | Each story = 1 testable action? No "App Shell" epics? 3-10 stories per epic? |
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

### Todo 6: Order stories by dependency

| Aspect | Detail |
|--------|--------|
| **Purpose** | Ensure logical implementation order |
| **What agent does** | Reorders stories so dependencies come first (e.g., "create" before "edit", "setup" before "use") |
| **Rules** | No story should depend on a later story. First stories should be foundational. |
| **Output** | Ordered story list |
| **Capabilities** | Dependency Ordering |
| **Agent Skills** | - |
| **Effort** | 5% |

---

### Todo 7: Check completeness pairs

| Aspect | Detail |
|--------|--------|
| **Purpose** | Ensure every action has its inverse |
| **What agent does** | Scans stories for: Add/Delete, Open/Close, Show/Hide, Enable/Disable, Connect/Disconnect |
| **Rules** | If one half exists, the other must exist. Add missing halves as new stories. |
| **Output** | Updated story list with pairs complete |
| **Capabilities** | None |
| **Agent Skills** | - |
| **Effort** | 10% |

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
| **What agent does** | Cross-references mockups from brainstorm-notes.md against stories. Identifies gaps. |
| **Rules** | Every button, input, panel in mockup must have a story. If not, add story or remove from mockup. |
| **Output** | Gap list (if any) and new stories to fill gaps |
| **Capabilities** | None |
| **Agent Skills** | - |
| **Effort** | 10% |

---

### Todo 9: Add mandatory standard stories

| Aspect | Detail |
|--------|--------|
| **Purpose** | Add stories for standards the user didn't explicitly request |
| **What agent does** | Adds mandatory stories for: keyboard navigation, focus indicators, screen reader support |
| **Rules** | These stories are ALWAYS added, regardless of what user requested |
| **Mandatory Stories** | See table below |
| **Output** | Updated story list with mandatory stories added |
| **Capabilities** | None |
| **Agent Skills** | - |
| **Effort** | 5% |

**Mandatory Stories to Add:**

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| US-A11Y-001 | As a user, I want to navigate the app using only keyboard | Tab reaches all interactive elements; Enter/Space activates them |
| US-A11Y-002 | As a user, I want to see which element is focused | Visible focus indicator on all focusable elements |
| US-A11Y-003 | As a user, I want to close modals with Escape key | Pressing Escape closes any open modal/dialog |
| US-A11Y-004 | As a user, I want screen reader to announce elements | All buttons/inputs have aria-labels |

---

### Todo 10: VERIFY: Completeness

| Aspect | Detail |
|--------|--------|
| **Purpose** | Independent verification of pairs, UI coverage, and mandatory standards |
| **What agent does** | Spawns Haiku reviewer with checklist |
| **Haiku checks** | All completeness pairs exist? Every UI element has a story? Mandatory a11y stories included? No orphan stories? |
| **Pass threshold** | Score >= 95 |
| **On fail** | Fix issues and retry (max 3 attempts), then escalate |
| **Capabilities** | Review Loop |
| **Agent Skills** | - |
| **Effort** | 5% |

---

### Todo 11: Create user-stories.md

| Aspect | Detail |
|--------|--------|
| **Purpose** | Write the final deliverable document |
| **What agent does** | Creates structured markdown with: epic index, stories per epic, acceptance criteria |
| **Format** | Follows template with story IDs (US-EPIC-001), clear sections |
| **Output** | `docs/user-stories.md` |
| **Capabilities** | None |
| **Agent Skills** | - |
| **Effort** | 20% |

---

## Summary Table

| # | Todo Name | Capabilities | Agent Skills | Effort |
|---|-----------|--------------|--------------|--------|
| 0 | **Phase Start** | - | - | - |
| 1 | Read brainstorm-notes.md | None | `Skill tool → tauri` | 5% |
| 2 | Define epics from user journey | Dependency Ordering | - | 10% |
| 3 | Generate user stories per epic | Acceptance Criteria Writing | - | 15% |
| 4 | Split/merge stories for 1:1 E2E mapping | Story Splitting | - | 10% |
| 5 | VERIFY: Story granularity | Review Loop | - | 5% |
| 6 | Order stories by dependency | Dependency Ordering | - | 5% |
| 7 | Check completeness pairs | None | - | 10% |
| 8 | Check UI element coverage | None | - | 10% |
| 9 | Add mandatory standard stories | None | - | 5% |
| 10 | VERIFY: Completeness | Review Loop | - | 5% |
| 11 | Create user-stories.md | None | - | 20% |
| | **Total** | | | **100%** |

---

## Flow Diagram

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                              PHASE 2: PM AGENT                                 │
└───────────────────────────────────────────────────────────────────────────────┘

  Todo 1          Todo 2          Todo 3          Todo 4
    │               │               │               │
    ▼               ▼               ▼               ▼
┌───────┐      ┌─────────┐    ┌─────────┐    ┌─────────┐
│ Read  │ ──▶  │ Define  │ ──▶│Generate │ ──▶│ Split/  │
│ notes │      │ epics   │    │ stories │    │ merge   │
└───────┘      └─────────┘    └─────────┘    └────┬────┘
                                                  │
                                                  ▼
                                          ┌─────────────┐
                                          │ 5 VERIFY:   │
                                          │ granularity │◀─── Haiku Review
                                          └──────┬──────┘
                                                 │
    ┌────────────────────────────────────────────┘
    │
    ▼
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────────┐
│ 6 Order │ ──▶│ 7 Check │ ──▶│ 8 Check │ ──▶│ 9 Add   │ ──▶│ 10 VERIFY:  │
│ stories │    │ pairs   │    │ UI      │    │ a11y    │    │ completeness│◀─── Haiku
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └──────┬──────┘
                                                                   │
                                                                   ▼
                                                            ┌─────────────┐
                                                            │ 11 Create   │
                                                            │ user-stories│
                                                            │    .md      │
                                                            └─────────────┘
                                                                   │
                                                                   ▼
                                                           user-stories.md
```

---

## Status

Under Review - Ready for implementation as agent CLAUDE.md
