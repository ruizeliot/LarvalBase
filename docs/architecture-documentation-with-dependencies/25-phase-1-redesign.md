# Phase 1 Redesign: Pre-Pipeline Interactive Session

**Created:** 2026-01-12
**Status:** Design Complete, Implementation Pending
**Branch:** `feature/phase-1-redesign`

---

## 1. Problem Statement

### 1.1 Current Architecture Conflict

The pipeline is designed to be **autonomous** - agents execute phases 2-5 without user interaction. However, Phase 1 (Discovery/Brainstorm) is inherently **interactive**:

| Pipeline Principle | Phase 1 Reality |
|-------------------|-----------------|
| Autonomous execution | Requires constant user input |
| No user interaction needed | Back-and-forth dialogue essential |
| Agent has all context needed | Must extract ideas from user's head |
| Predictable duration | Variable (5 min to 2 hours) |

**Conclusion:** Phase 1 does not belong IN the pipeline. It is a **pre-pipeline activity**.

### 1.2 Content Persistence Problem

When users linger on a single todo discussing many ideas, the agent:
1. Accumulates content in context window
2. Continues the conversation
3. **Forgets to write ideas to file**
4. Eventually loses content when context fills or session ends

**Root cause:** Writing is tied to todo completion, not to idea generation.

---

## 2. New Architecture

### 2.1 Pipeline Restructure

```
BEFORE (v10):
┌─────────────────────────────────────────────────────────┐
│                      PIPELINE                            │
├─────────┬─────────┬─────────┬─────────┬─────────────────┤
│ Phase 1 │ Phase 2 │ Phase 3 │ Phase 4 │ Phase 5         │
│(Interact│(Auto)   │(Auto)   │(Auto)   │(Auto)           │
└─────────┴─────────┴─────────┴─────────┴─────────────────┘

AFTER (v11):
┌───────────────────┐     ┌─────────────────────────────────────────┐
│  PRE-PIPELINE     │     │              PIPELINE                    │
│  (Interactive)    │     │           (Autonomous)                   │
├───────────────────┤     ├─────────┬─────────┬─────────┬───────────┤
│ Brainstorm        │ ──► │ Phase 2 │ Phase 3 │ Phase 4 │ Phase 5   │
│ Session           │     │(Stories)│(Tests)  │(Impl)   │(Polish)   │
└───────────────────┘     └─────────┴─────────┴─────────┴───────────┘
       ▲                           │
       │                           ▼
       │                    ┌─────────────┐
       └────────────────────┤  Feedback   │
         (if major issues)  │  Loop       │
                            └─────────────┘
```

### 2.2 Brainstorm Session Characteristics

| Aspect | Description |
|--------|-------------|
| **Trigger** | User runs `/brainstorm` skill (not orchestrator) |
| **Mode** | Fully interactive (AskUserQuestion allowed) |
| **Duration** | Variable (user-controlled) |
| **Output** | `docs/brainstorm-notes.md`, `docs/user-stories.md` |
| **Visualization** | Live Canvas (optional, see doc 26) |
| **Pipeline entry** | User manually starts orchestrator after approval |

### 2.3 Pipeline Entry Requirements

The pipeline (Phases 2-5) requires these files to exist before starting:

| File | Required | Created By |
|------|----------|------------|
| `docs/brainstorm-notes.md` | Yes | Brainstorm session |
| `docs/user-stories.md` | Yes | Brainstorm session |
| `.pipeline/manifest.json` | Auto-created | Orchestrator |

**Orchestrator startup check:**
```javascript
// Orchestrator validates before starting
const requiredFiles = [
  'docs/brainstorm-notes.md',
  'docs/user-stories.md'
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(projectPath, file))) {
    console.error(`Missing required file: ${file}`);
    console.error('Run /brainstorm first to create design documents.');
    process.exit(1);
  }
}
```

---

## 3. "Write Immediately" Rule

### 3.1 The Problem

```
User: "I want a task manager"
Agent: "What kind of tasks?" (doesn't write)
User: "With kanban boards and due dates"
Agent: "Any integrations?" (doesn't write)
User: "Google Calendar sync"
Agent: "What about..." (doesn't write)
...
[30 minutes later, agent has 50 ideas in context, 0 in file]
[Context fills up, summary loses details]
```

### 3.2 The Solution

**Rule: Write EVERY idea to file IMMEDIATELY after it's discussed.**

```
User: "I want a task manager"
Agent:
  1. WRITE to file: "## Core Concept\n- Task manager application"
  2. THEN ask: "What kind of tasks?"

User: "With kanban boards and due dates"
Agent:
  1. WRITE to file: "- Kanban board interface\n- Due date support"
  2. THEN ask: "Any integrations?"

User: "Google Calendar sync"
Agent:
  1. WRITE to file: "- Google Calendar integration"
  2. THEN continue...
```

### 3.3 Implementation

The brainstorm skill enforces this via MCP tool calls:

```typescript
// Skill rule (enforced by skill instructions)
// After EVERY user message that contains an idea:
// 1. Extract idea(s)
// 2. Call append_notes() MCP tool
// 3. Only THEN respond to user

// MCP Tool: append_notes
interface AppendNotesInput {
  section: string;      // e.g., "Core Concept", "Features", "Integrations"
  content: string;      // Markdown content to append
  file?: string;        // Default: "docs/brainstorm-notes.md"
}

// Example call
mcp.call('append_notes', {
  section: 'Integrations',
  content: '- Google Calendar sync for due dates'
});
```

### 3.4 File Structure

`docs/brainstorm-notes.md` grows incrementally:

```markdown
# Brainstorm Notes: [App Name]

**Session Started:** 2026-01-12 14:30
**Last Updated:** 2026-01-12 15:45

---

## Core Concept
- Task manager application
- Personal productivity focus

## Features
- Kanban board interface
- Due date support
- Priority levels (high/medium/low)

## Integrations
- Google Calendar sync for due dates

## UI Ideas
- Dark mode by default
- Minimalist design
- Drag-and-drop cards

## Technical Notes
- Tauri desktop app
- Local SQLite database
- Optional cloud sync later

---

*This document is updated live during brainstorming.*
```

---

## 4. Skill: `/brainstorm`

### 4.1 Skill Overview

| Property | Value |
|----------|-------|
| **Name** | `brainstorm` |
| **Type** | Interactive |
| **MCP Required** | `live-canvas-mcp` (optional) |
| **Output** | `docs/brainstorm-notes.md`, `docs/user-stories.md` |

### 4.2 Skill Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     /brainstorm SKILL                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ 1. UNDERSTAND   │
                    │    (Text only)  │
                    └────────┬────────┘
                              │ Write immediately
                              ▼
                    ┌─────────────────┐
                    │ 2. RESEARCH     │
                    │    (WebSearch)  │
                    └────────┬────────┘
                              │ Write findings
                              ▼
                    ┌─────────────────┐
                    │ 3. SKETCH       │
                    │    (ASCII/Canvas│
                    └────────┬────────┘
                              │ Write chosen layout
                              ▼
                    ┌─────────────────┐
                    │ 4. REFINE       │
                    │    (Details)    │
                    └────────┬────────┘
                              │ Write refinements
                              ▼
                    ┌─────────────────┐
                    │ 5. STORYBOARD   │
                    │    (User flow)  │
                    └────────┬────────┘
                              │ Write flow
                              ▼
                    ┌─────────────────┐
                    │ 6. STYLE        │
                    │    (Design sys) │
                    └────────┬────────┘
                              │ Write design system
                              ▼
                    ┌─────────────────┐
                    │ 7. STORIES      │
                    │    (Generate)   │
                    └────────┬────────┘
                              │ Write user-stories.md
                              ▼
                    ┌─────────────────┐
                    │ 8. APPROVE      │
                    │    (User signs) │
                    └─────────────────┘
                              │
                              ▼
                    Ready for Pipeline
                    (User runs /orchestrator)
```

### 4.3 Key Differences from Current Phase 1

| Aspect | Current Phase 1 | New /brainstorm Skill |
|--------|-----------------|----------------------|
| **Location** | Inside pipeline | Separate from pipeline |
| **Orchestrator** | Orchestrator spawns worker | User runs skill directly |
| **Todo tracking** | Yes (orchestrator monitors) | No (skill manages itself) |
| **Write timing** | At todo completion | After EVERY idea |
| **Canvas support** | No | Yes (optional MCP) |
| **Resumable** | No | Yes (reads existing notes) |

### 4.4 Resumability

If session is interrupted, user can resume:

```
User: /brainstorm

Agent: [Reads docs/brainstorm-notes.md]

       "I see we have an existing brainstorm session for 'TaskFlow'.

       Current progress:
       - Core concept: Defined ✓
       - Features: 8 items ✓
       - UI Ideas: 3 items ✓
       - User stories: Not started

       Should we continue from where we left off?"
```

---

## 5. Orchestrator Changes

### 5.1 Removed Responsibilities

| Removed | Reason |
|---------|--------|
| Spawning Phase 1 worker | Brainstorm is pre-pipeline |
| Phase 1 todo monitoring | Skill manages itself |
| Phase 1 completion detection | User triggers pipeline manually |

### 5.2 New Startup Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    /orchestrator-desktop-v11                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Check required  │
                    │ files exist     │
                    └────────┬────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
         Files exist                    Files missing
              │                               │
              ▼                               ▼
    ┌─────────────────┐             ┌─────────────────┐
    │ Ask: Stack?     │             │ ERROR:          │
    │ Ask: Mode?      │             │ "Run /brainstorm│
    │ Ask: Step mode? │             │  first"         │
    └────────┬────────┘             └─────────────────┘
              │
              ▼
    ┌─────────────────┐
    │ Display summary │
    │ of brainstorm   │
    │ notes           │
    └────────┬────────┘
              │
              ▼
    ┌─────────────────┐
    │ Ask: Proceed?   │
    └────────┬────────┘
              │
              ▼
    ┌─────────────────┐
    │ Start Phase 2   │
    │ (First pipeline │
    │  phase)         │
    └─────────────────┘
```

### 5.3 Manifest Schema Update

```json
{
  "version": "11.0.0",
  "project": { "name": "TaskFlow", "path": "/path/to/project" },
  "stack": "desktop",
  "mode": "new",
  "status": "running",
  "brainstorm": {
    "completed": true,
    "completedAt": "2026-01-12T15:45:00Z",
    "notesFile": "docs/brainstorm-notes.md",
    "storiesFile": "docs/user-stories.md",
    "epicCount": 5,
    "storyCount": 23
  },
  "currentPhase": "2",
  "phases": {
    "2": { "status": "running" },
    "3": { "status": "pending" },
    "4": { "status": "pending" },
    "5": { "status": "pending" }
  }
}
```

Note: No `"1"` in phases - brainstorm is tracked separately.

---

## 6. Migration Path

### 6.1 For Existing Projects

Projects started with v10 (Phase 1 in pipeline):

1. If Phase 1 complete → No changes needed, pipeline continues
2. If Phase 1 in progress → Complete current session, then migrate
3. New projects → Use new `/brainstorm` skill

### 6.2 Command Changes

| v10 Command | v11 Command | Notes |
|-------------|-------------|-------|
| `/orchestrator-desktop-v10.0` | `/orchestrator-desktop-v11.0` | Skips Phase 1 |
| `/1-new-pipeline-desktop-v9.0` | `/brainstorm` | Separate skill |
| (none) | `/brainstorm --resume` | Resume interrupted session |

### 6.3 File Changes

| File | Change |
|------|--------|
| `commands/orchestrator-desktop-v11.0.md` | New orchestrator without Phase 1 |
| `commands/1-new-pipeline-desktop-*.md` | Deprecated (replaced by skill) |
| `.claude/skills/brainstorm.md` | New skill file |

---

## 7. Benefits

### 7.1 Architectural Clarity

- Pipeline is purely autonomous (Phases 2-5)
- Interactive work is explicitly separate
- Clear handoff point (user approves, then starts pipeline)

### 7.2 Better Content Persistence

- Ideas written immediately, not at todo completion
- No content loss from context overflow
- Resumable sessions

### 7.3 Flexibility

- Brainstorm can use Live Canvas (optional)
- Session duration is user-controlled
- Can iterate on design before committing to pipeline

### 7.4 Simpler Orchestrator

- Orchestrator only manages autonomous phases
- No special handling for interactive phase
- Cleaner state machine

---

## 8. Implementation Tasks

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 1 | Create `/brainstorm` skill with write-immediately rule | High | Medium |
| 2 | Update orchestrator to require brainstorm files | High | Low |
| 3 | Remove Phase 1 from orchestrator spawn logic | High | Low |
| 4 | Update manifest schema (remove phase 1, add brainstorm) | Medium | Low |
| 5 | Create `append_notes` MCP tool (or use obsidian-mcp) | Medium | Medium |
| 6 | Add session resumability to brainstorm skill | Medium | Medium |
| 7 | Integrate Live Canvas MCP (optional) | Low | High |
| 8 | Update documentation (phase docs, README) | Low | Low |

---

## 9. Related Documents

- [26-live-canvas-spec.md](./26-live-canvas-spec.md) - Live visualization during brainstorming
- [09-phase-1-discovery-planning.md](./09-phase-1-discovery-planning.md) - Legacy Phase 1 (deprecated)
- [08-new-pipeline-structure.md](./08-new-pipeline-structure.md) - Pipeline overview (needs update)

---

## 10. Open Questions

1. **Should brainstorm notes be versioned?** (git commits during session)
2. **Should there be a "quick start" mode?** (skip brainstorm for simple apps)
3. **How to handle multiple brainstorm sessions?** (iterating on design)
4. **Should Live Canvas be required or optional?** (current: optional)
