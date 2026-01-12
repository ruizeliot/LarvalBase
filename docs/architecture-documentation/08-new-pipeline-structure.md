# New Pipeline Structure (v11)

**Created:** 2026-01-09
**Inspired by:** BMAD Method
**Key principle:** 1 User Story = 1 E2E Test

---

## Overview

Pipeline v11 adopts BMAD-style agent separation with focused responsibilities per agent.

### Phases

| Phase | Name | Agents | Mode |
|-------|------|--------|------|
| 1 | Discovery & Planning | Analyst, UX Designer, PM, Architect, Test Architect | Interactive or Autonomous |
| 2 | Implementation | Developer | Autonomous (per epic) |
| 3 | Quality | QA, Tech Writer | Autonomous |

### User Experience Modes

| Mode | Target User | Planning Style | User Interaction |
|------|-------------|----------------|------------------|
| **User Mode** | Non-developers | Autonomous | Final approval only |
| **Dev Mode** | Developers | Collaborative | Each major decision |

---

## Core Principle: 1 Story = 1 E2E Test

Every user story MUST have exactly 1 E2E test.

- Story too big for 1 test → Split the story
- Story too small for 1 test → Merge with related story
- Story complete = Test passes

**Why this works for AI:**
- AI doesn't tire from writing E2E tests
- AI can retry failures without frustration
- Clear verification: test passes = story done
- No hallucination: AI can't claim completion without proof

---

## File Structure

```
claude-md/
├── agents/
│   ├── analyst.md          # Research, project brief
│   ├── ux-designer.md      # Mockups, design system
│   ├── pm.md               # Epics, user stories
│   ├── architect.md        # Tech stack, architecture
│   ├── test-architect.md   # Test strategy, E2E specs
│   ├── developer.md        # Implementation
│   ├── qa.md               # Quality review
│   └── tech-writer.md      # Documentation
├── shared/
│   └── rules.md            # Universal rules
└── workflows/
    ├── user-mode.md        # Autonomous planning
    └── dev-mode.md         # Collaborative planning
```

---

## Phase 1: Discovery & Planning

### Agents

| Agent | Persona | Input | Output |
|-------|---------|-------|--------|
| Analyst | Mary | Project idea | project-brief.md |
| UX Designer | Sally | project-brief.md | brainstorm-notes.md |
| PM | John | All above | user-stories.md |
| Architect | Winston | All above | architecture.md |
| Test Architect | Murat | All above | test-specs.md |

### Document Flow

```
Analyst creates: project-brief.md
    ↓
UX Designer reads project-brief.md, creates: brainstorm-notes.md
    ↓
PM reads all above, creates: user-stories.md
    ↓
Architect reads all above, creates: architecture.md
    ↓
Test Architect reads all above, creates: test-specs.md
```

---

## Phase 2: Implementation

### Agent

| Agent | Input | Output |
|-------|-------|--------|
| Developer | All Phase 1 docs + RED tests | GREEN tests |

### Process (per epic)

1. Read architecture and test specs
2. Write E2E test (RED)
3. Implement until test passes (GREEN)
4. Repeat for each story in epic
5. Commit epic

---

## Phase 3: Quality

### Agents

| Agent | Input | Output |
|-------|-------|--------|
| QA | Implemented code | Quality report |
| Tech Writer | All docs + code | README, deploy artifacts |

---

## Mode Comparison

### User Mode (Non-developer)

- AI makes all technical decisions
- User only approves final output
- Faster, less interaction
- Best for: quick prototypes, non-technical users

### Dev Mode (Developer)

- User co-designs with AI
- Discuss trade-offs at each step
- Slower, more control
- Best for: experienced devs, specific requirements

---

## Key Differences from v10

| Aspect | v10 | v11 |
|--------|-----|-----|
| Phase 1 structure | 1 agent, 18 todos | 5 agents, focused todos each |
| Agent files | phase-N.md (monolithic) | agents/*.md (focused) |
| Planning rigor | Weak | Strong (BMAD-inspired) |
| User modes | None | User Mode / Dev Mode |
| Document flow | Implicit | Explicit dependencies |

---

## Next Steps

1. Detail Phase 1 agents and todos
2. Detail Phase 2 agents and todos
3. Detail Phase 3 agents and todos
4. Create agent files in claude-md/agents/
5. Create workflow files
