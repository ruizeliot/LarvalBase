# Roadmap: Brainstorm Visual System

## Overview

Transform the existing live-canvas-mcp infrastructure into an intelligent visual brainstorming facilitator. Phase 1 delivers the core visual techniques (mind maps, matrices, affinity diagrams, flows) with responsive canvas updates. Phase 2 adds the Double Diamond session structure with adaptive technique switching based on user engagement signals. Phase 3 implements human-first collaboration guardrails to prevent user passivity. The result is an AI that proactively draws first, adapts constantly, and produces rich brainstorm-notes.md documents.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Visual Techniques Foundation** - Core drawing capabilities with responsive canvas
- [ ] **Phase 2: Adaptive Session Flow** - Double Diamond phases with engagement-based technique switching
- [ ] **Phase 3: Human-First Collaboration** - Guardrails ensuring user creativity remains central

## Phase Details

### Phase 1: Visual Techniques Foundation
**Goal**: AI can draw the four core visual techniques (mind maps, matrices, affinity diagrams, flows) with real-time canvas updates
**Depends on**: Nothing (first phase)
**Requirements**: VIS-01, VIS-02, VIS-03, VIS-04, CANVAS-01, CANVAS-02
**Success Criteria** (what must be TRUE):
  1. User sees mind map appear on canvas within 2 seconds of mentioning related ideas
  2. User sees 2x2 matrix on canvas when comparing options or asking "which should we do first?"
  3. User sees affinity diagram grouping when 5+ scattered ideas need pattern recognition
  4. User sees flow diagram on canvas when describing a process or journey
  5. Canvas updates continuously during conversation (no "can you draw that?" prompts needed)
**Plans**: 3 plans in 2 waves

Plans:
- [ ] 01-01-PLAN.md — Foundation infrastructure + mind map MCP tool (Wave 1)
- [ ] 01-02-PLAN.md — Matrix and affinity diagram techniques (Wave 2)
- [ ] 01-03-PLAN.md — Flow diagrams + user preferences system (Wave 2)

### Phase 2: Adaptive Session Flow
**Goal**: AI manages session through Double Diamond phases and switches techniques based on user engagement signals
**Depends on**: Phase 1
**Requirements**: FLOW-01, FLOW-02, FLOW-03, FLOW-04, CANVAS-03
**Success Criteria** (what must be TRUE):
  1. User experiences distinct diverge and converge cycles (AI never mixes generation with evaluation)
  2. brainstorm-notes.md reflects conversation progress in real-time (user can see their ideas captured)
  3. AI changes approach when user gives short responses (probes deeper) or verbose responses (simplifies)
  4. AI switches to different visual technique when current approach produces <2 new ideas over 3 turns
  5. AI incorporates user edits to canvas/notes into subsequent responses
**Plans**: TBD

Plans:
- [ ] 02-01: Double Diamond phase management
- [ ] 02-02: Engagement signal detection and technique switching
- [ ] 02-03: User edit detection and notes synchronization

### Phase 3: Human-First Collaboration
**Goal**: AI facilitates without dominating - user creativity stays central through structured guardrails
**Depends on**: Phase 2
**Requirements**: COLLAB-01, COLLAB-02, COLLAB-03, COLLAB-04
**Success Criteria** (what must be TRUE):
  1. AI asks for user ideas BEFORE offering any AI suggestions (human-first prompting)
  2. AI presents maximum 3 curated suggestions at once (no idea overload)
  3. AI drives conversation through questions that user answers, then visualizes the answers
  4. AI pacing matches user response style (fast responders get more prompts, slow get more space)
**Plans**: TBD

Plans:
- [ ] 03-01: Human-first prompting patterns
- [ ] 03-02: Question-driven facilitation with adaptive pacing

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Visual Techniques Foundation | 0/3 | Planned | - |
| 2. Adaptive Session Flow | 0/3 | Not started | - |
| 3. Human-First Collaboration | 0/2 | Not started | - |
