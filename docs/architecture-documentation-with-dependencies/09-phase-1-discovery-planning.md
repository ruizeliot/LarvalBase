# Phase 1: Discovery & Planning

**Version:** v11 (In Progress)
**Created:** 2026-01-09
**Status:** Under Review

---

## Overview

Phase 1 uses multiple specialized agents in sequence:

```
┌─────────────────────┐    ┌──────┐    ┌────────────────┐
│ Brainstorm          │ → │  PM  │ → │ Test Architect │
│ Facilitator         │    │      │    │                │
└─────────────────────┘    └──────┘    └────────────────┘
         ↓                     ↓                ↓
  brainstorm-notes.md    user-stories      test-specs
                              .md              .md
```

**Note:** UX Designer and Architect agents were removed. The Brainstorm Facilitator handles visual design (mockups as a skill), and architecture decisions are stack-constrained (Tauri v2).

---

## Stack Constraints (Boundaries)

The pipeline is designed for a specific stack. These constraints guide brainstorming from the start:

| Constraint | Value |
|------------|-------|
| **Platform** | Desktop (Windows, macOS, Linux) |
| **Framework** | Tauri v2 |
| **Frontend** | React + TypeScript |
| **Backend** | Rust |
| **Styling** | Tailwind CSS |
| **Testing** | Vitest (unit), WebdriverIO (E2E) |

**Why constraints help:**
- Prevents scope creep ("what about mobile?")
- Guides UI patterns (desktop conventions, not mobile)
- Focuses research (Tauri patterns, not Electron)
- Reduces decision fatigue

---

## Agent 1: Brainstorm Facilitator

**Inspired by:** BMAD Analyst (Mary) + Creative Intelligence Suite
**Mode:** Interactive (structured with techniques)
**Input:** Project idea, directory name
**Output:** `docs/brainstorm-notes.md`

---

## Agent Skills (Invoke with Skill tool)

**CRITICAL: Skills are NOT auto-triggered in autonomous mode. You MUST explicitly invoke them.**

The following Agent Skills should be invoked using the `Skill` tool at the specified points:

| Skill Name | Invoke When | What It Provides |
|------------|-------------|------------------|
| `brainstorming` | **At phase start** (before Todo 1) | Proven design refinement process, Socratic questioning techniques |
| `tauri` | **Todo 3** (Research similar apps) | Desktop app patterns, Tauri v2 UI conventions, platform-specific guidance |

### How to Invoke

```
Skill tool → brainstorming    (invoke once at phase start)
Skill tool → tauri            (invoke when researching desktop patterns)
```

### Why Manual Invocation is Required

Skills trigger on **user messages only**. In autonomous phases, the worker receives ONE user message (the phase command) then works alone. Without explicit invocation, skills are never loaded.

---

## Built-in Capabilities

These are capabilities the agent uses within todos (not external skills):

### Capability: Show Mockup

**When to use:**
- After gathering enough context to visualize
- When presenting options (show 2-3 alternatives)
- When user corrects understanding (show updated version)
- At checkpoints before moving to next topic
- Before finalizing

**Format:** ASCII art in terminal

### Capability: Ask Clarifying Question

**When to use:**
- When context is insufficient to proceed
- When user's answer is ambiguous
- When multiple interpretations are possible

**Format:** AskUserQuestion tool with options

### Capability: WebSearch

**When to use:**
- Before proposing any UI pattern
- When researching competitors
- When looking for best practices

**Format:** WebSearch tool

---

## Technique Library

Techniques are methods the agent can apply within todos. Sourced from BMAD Creative Intelligence Suite.

### Design Thinking Techniques

| Phase | Techniques |
|-------|------------|
| **Empathize** | User Interviews, Empathy Mapping, Shadowing, Journey Mapping, Diary Studies |
| **Define** | Problem Framing, How Might We, Point of View Statement, Affinity Clustering, Jobs to be Done |
| **Ideate** | Brainstorming, Crazy 8s, SCAMPER, Provotype Sketching, Analogous Inspiration |
| **Prototype** | Paper Prototyping, Role Playing, Wizard of Oz, Storyboarding, Physical Mockups |
| **Test** | Usability Testing, Feedback Capture Grid, A/B Testing, Assumption Testing |

### Problem-Solving Techniques

| Category | Techniques |
|----------|------------|
| **Diagnosis** | Five Whys, Fishbone Diagram, Problem Statement Refinement, Is/Is Not Analysis |
| **Creative** | Assumption Busting, Reverse Brainstorming, Six Thinking Hats, SCAMPER |
| **Analysis** | Force Field Analysis, Pareto Analysis, Gap Analysis |

### Storytelling Techniques

| Category | Techniques |
|----------|------------|
| **Transformation** | Hero's Journey, Customer Journey, Challenge Overcome |
| **Strategic** | Vision Narrative, Origin Story |

---

## Brainstorm Facilitator: Todos

### Todo 1: Ask what the app is about

| Aspect | Detail |
|--------|--------|
| **Purpose** | Understand the core idea |
| **Mode** | Conversational (no tools) |
| **What agent does** | Reads project directory name, any existing files. Asks ONE open question. |
| **Example prompt** | "I see this is 'task-tracker-desktop'. What's the core idea? What problem does it solve?" |
| **User interaction** | User explains their vision in their own words |
| **Output** | Mental understanding (nothing written yet) |
| **Techniques** | User Interviews (informal), Problem Framing |
| **Capabilities** | None - first question |
| **Effort** | 5% |
| **Status** | ✅ Keep |

---

### Todo 2: Ask deeper clarifying questions

| Aspect | Detail |
|--------|--------|
| **Purpose** | Gather enough context before attempting mockup |
| **Mode** | Conversational questions |
| **What agent does** | Asks follow-up questions to understand scope, users, key features |
| **Example questions** | "Who will use this?", "What's the main action users take?" |
| **User interaction** | User provides more detail |
| **Output** | Deeper understanding |
| **Techniques** | Empathy Mapping, Jobs to be Done, Five Whys, How Might We |
| **Capabilities** | Ask Clarifying Question |
| **Effort** | 10% |
| **Status** | ✅ Keep |

---

---

## 🔄 LOOPABLE GROUP: Todos 3-6 (Research & Design)

These todos form an iterative loop. The agent can loop back at any point if:
- User says "not quite right" or "more research needed"
- User wants to explore different directions
- New information changes the design

Exit condition: User approves the refined layout.

---

### Todo 3: Research similar apps (LOOP A - start)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Find existing patterns, avoid reinventing |
| **What agent does** | Searches for similar apps, competitors, UI patterns |
| **Techniques** | Analogous Inspiration, Gap Analysis |
| **Capabilities** | WebSearch |
| **Agent Skills** | `Skill tool → tauri` (for desktop app patterns) |
| **Effort** | 10% |
| **Loop** | Can return here from Todo 4, 5, or 6 if user wants more research |

---

### Todo 4: Show concept mockup (LOOP A - can return to 3)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Validate agent understood the concept correctly |
| **What agent does** | Shows first mockup based on research + user description |
| **Techniques** | Paper Prototyping, Point of View Statement |
| **Capabilities** | Show Mockup |
| **Effort** | 10% |
| **Loop** | If user says "not what I meant" → back to Todo 3 |

---

### Todo 5: Present layout options (LOOP A - can return to 3)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Propose 2-3 layout alternatives |
| **What agent does** | Shows layout options inspired by research |
| **Techniques** | Crazy 8s, SCAMPER, Brainstorming |
| **Capabilities** | Show Mockup, Ask Clarifying Question |
| **Effort** | 15% |
| **Loop** | If user wants different options → back to Todo 3 |

---

### Todo 6: Refine chosen layout (LOOP A - EXIT when approved)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Add detail to chosen layout |
| **What agent does** | Adds buttons, labels, sections to chosen layout |
| **Techniques** | Paper Prototyping, Storyboarding |
| **Capabilities** | Show Mockup |
| **Effort** | 12% |
| **Loop** | If user wants different direction → back to Todo 5 |
| **Exit** | User approves → proceed to Todo 7 |

---

---

## 🔄 LOOPABLE GROUP: Todos 7-8 (Detail & Journey)

These todos can loop. Drilling into areas might reveal journey issues.

Exit condition: User approves journey flow.

---

### Todo 7: Drill into specific areas (LOOP B - start)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Clarify specific UI areas that need more detail |
| **What agent does** | Identifies unclear areas, shows zoomed mockup for each |
| **Techniques** | Usability Testing (conceptual), Assumption Testing |
| **Capabilities** | Show Mockup, Ask Clarifying Question |
| **Effort** | 10% |
| **Loop** | Can return here from Todo 8 if journey reveals missing detail |

---

### Todo 8: Map user journey (LOOP B - EXIT when approved)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Understand how user flows through the app |
| **What agent does** | Creates ASCII flow diagram showing user paths |
| **Techniques** | Journey Mapping, Storyboarding, Customer Journey |
| **Capabilities** | Show Mockup (flow diagram) |
| **Effort** | 8% |
| **Loop** | If journey doesn't work → back to Todo 7 |
| **Exit** | User approves journey → proceed to Todo 9 |

---

## 🔄 LOOPABLE GROUP: Todos 9-10 (Scope & Confirmation)

These todos can loop. Scope changes might need design updates.

Exit condition: User gives final approval.
Escape: Major changes → back to Todos 3-6 (Research & Design).

---

### Todo 9: Define scope (LOOP C - start, can escape to LOOP A)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Explicitly define what we're building and NOT building |
| **What agent does** | Proposes what to include/exclude based on discussion |
| **Techniques** | Is/Is Not Analysis, Assumption Busting, Reverse Brainstorming |
| **Capabilities** | Ask Clarifying Question |
| **Effort** | 5% |
| **Loop** | Can return here from Todo 10 if scope needs adjustment |
| **Escape** | Major scope change affects design → back to Todo 3 (LOOP A) |

---

### Todo 10: Final mockup confirmation (LOOP C - EXIT when approved, can escape to LOOP A)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Show complete vision before documenting |
| **What agent does** | Shows full mockup with all agreed features |
| **Techniques** | Feedback Capture Grid |
| **Capabilities** | Show Mockup |
| **Effort** | 8% |
| **Loop** | If user wants minor changes → back to Todo 9 |
| **Escape** | Major changes → back to Todo 3 (LOOP A) |
| **Exit** | User gives final approval → proceed to Todo 11 |

---

### Todo 11: Create brainstorm-notes.md

| Aspect | Detail |
|--------|--------|
| **Purpose** | Document everything for next agents |
| **Mode** | Writing |
| **What agent does** | Creates structured document with all decisions |
| **Contents** | Concept, research findings, chosen layout, feature details, user journey, scope, final mockup |
| **User interaction** | None |
| **Output** | `docs/brainstorm-notes.md` |
| **Techniques** | None - documentation only |
| **Capabilities** | None |
| **Effort** | 10% |
| **Status** | ✅ Keep |

---

## Summary Table

| # | Todo Name (with loop info) | Capabilities | Agent Skills | Effort |
|---|----------------------------|--------------|--------------|--------|
| 0 | **Phase Start** | - | `Skill tool → brainstorming` | - |
| 1 | Ask what the app is about | None | - | 5% |
| 2 | Ask deeper clarifying questions | Ask Question | - | 10% |
| 3 | Research similar apps **(LOOP A - start)** | WebSearch | `Skill tool → tauri` | 10% |
| 4 | Show concept mockup **(LOOP A - can return to 3)** | Show Mockup | - | 10% |
| 5 | Present layout options **(LOOP A - can return to 3)** | Show Mockup, Ask Question | - | 15% |
| 6 | Refine chosen layout **(LOOP A - EXIT)** | Show Mockup | - | 12% |
| 7 | Drill into specific areas **(LOOP B - start)** | Show Mockup, Ask Question | - | 10% |
| 8 | Map user journey **(LOOP B - EXIT)** | Show Mockup | - | 8% |
| 9 | Define scope **(LOOP C - start, escape to A)** | Ask Question | - | 5% |
| 10 | Final mockup confirmation **(LOOP C - EXIT, escape to A)** | Show Mockup | - | 8% |
| 11 | Create brainstorm-notes.md | None | - | 7% |
| | **Total** | | | **100%** |

**Loop Groups:**
- 🔄 **LOOP A** (Todos 3-6): Research & Design → Exit when layout approved
- 🔄 **LOOP B** (Todos 7-8): Detail & Journey → Exit when journey approved
- 🔄 **LOOP C** (Todos 9-10): Scope & Confirmation → Exit when final approval, can escape to A

---

## Flow Diagram

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                           PHASE 1: BRAINSTORM FACILITATOR                     │
└───────────────────────────────────────────────────────────────────────────────┘

  Todo 1          Todo 2
    │               │
    ▼               ▼
┌───────┐      ┌─────────┐
│ Ask   │ ──▶  │ Clarify │
│ idea  │      │ deeper  │
└───────┘      └────┬────┘
                    │
                    ▼
    ┌───────────────────────────────────────┐
    │        🔄 LOOP A: Research & Design   │
    │                                       │
    │   ┌─────┐   ┌─────┐   ┌─────┐   ┌─────┐
    │   │  3  │──▶│  4  │──▶│  5  │──▶│  6  │──▶ EXIT
    │   └──▲──┘   └──┬──┘   └──┬──┘   └──┬──┘
    │      │         │         │         │
    │      └─────────┴─────────┴─────────┘
    │              "try again"
    └───────────────────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────────────┐
    │        🔄 LOOP B: Detail & Journey    │
    │                                       │
    │        ┌─────┐         ┌─────┐        │
    │        │  7  │◀───────▶│  8  │──▶ EXIT│
    │        └─────┘         └─────┘        │
    └───────────────────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────────────┐
    │     🔄 LOOP C: Scope & Confirmation   │
    │                                       │
    │        ┌─────┐         ┌─────┐        │
    │        │  9  │◀───────▶│ 10  │──▶ EXIT│
    │        └─────┘         └──┬──┘        │
    │                           │           │
    │              ESCAPE ──────┼───────────┼──▶ back to LOOP A
    └───────────────────────────────────────┘
                    │
                    ▼
               ┌─────────┐
               │   11    │
               │ Write   │
               │ doc     │
               └─────────┘
                    │
                    ▼
           brainstorm-notes.md
```

---

## Removed Todos

| Todo | Reason |
|------|--------|
| Define visual style | Showing colors/typography in ASCII terminal is not useful |
| User picks direction | Merged into "Present layout options" (Todo 5) |

---

## Status

✅ **Phase 1 todos complete** - Ready for implementation as agent CLAUDE.md
