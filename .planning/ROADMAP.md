# Roadmap: Brainstorm Visual System

## Milestones

- [x] **v1.0 Foundation** - Phases 1-3 (shipped 2026-01-27)
- [ ] **v2.0 Collaborative Multi-User** - Phases 4-8 (in progress)

## Phases

<details>
<summary>v1.0 Foundation (Phases 1-3) - SHIPPED 2026-01-27</summary>

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
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md - Foundation infrastructure + mind map MCP tool
- [x] 01-02-PLAN.md - Matrix and affinity diagram techniques
- [x] 01-03-PLAN.md - Flow diagrams + user preferences system

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
**Plans**: 5 plans

Plans:
- [x] 02-01-PLAN.md - Double Diamond state machine + session store + viewer indicator
- [x] 02-02-PLAN.md - Engagement detection + stagnation detection + technique switching
- [x] 02-03-PLAN.md - Notes file watching + canvas edit detection + edit notifications
- [x] 02-04-PLAN.md - [GAP CLOSURE] CLAUDE.md behavioral integration for Phase 2 tools
- [x] 02-05-PLAN.md - [GAP CLOSURE] Wire user edit detection pipeline end-to-end

### Phase 3: Human-First Collaboration
**Goal**: AI facilitates without dominating - user creativity stays central through structured guardrails
**Depends on**: Phase 2
**Requirements**: COLLAB-01, COLLAB-02, COLLAB-03, COLLAB-04
**Success Criteria** (what must be TRUE):
  1. AI asks for user ideas BEFORE offering any AI suggestions (human-first prompting)
  2. AI presents maximum 3 curated suggestions at once (no idea overload)
  3. AI drives conversation through questions that user answers, then visualizes the answers
  4. AI pacing matches user response style (fast responders get more prompts, slow get more space)
**Plans**: 2 plans

Plans:
- [x] 03-01-PLAN.md - Human-first prompting + max 3 suggestions (COLLAB-01, COLLAB-02)
- [x] 03-02-PLAN.md - Question-driven facilitation + adaptive pacing (COLLAB-03, COLLAB-04)

</details>

## v2.0 Collaborative Multi-User

**Milestone Goal:** Transform the single-user local tool into a multi-user collaborative session with voice input and document sharing.

### Phase 4: Room Infrastructure
**Goal**: Users can host and join collaborative sessions via shareable codes
**Depends on**: v1.0 Foundation (complete)
**Requirements**: SESS-01, SESS-02, SESS-08
**Success Criteria** (what must be TRUE):
  1. Host can start a session and sees a shareable URL with session code
  2. Guest can join via URL and sees the same canvas state as host
  3. Session terminates when host disconnects, with guests notified
**Plans**: 3 plans

Plans:
- [x] 04-01-PLAN.md - Server-side room infrastructure (Socket.IO + room manager)
- [x] 04-02-PLAN.md - Client-side Socket.IO integration + session UI
- [x] 04-03-PLAN.md - Host disconnect handling + integration verification

### Phase 5: Multi-Client Sync
**Goal**: All canvas and message edits sync in real-time across connected users
**Depends on**: Phase 4
**Requirements**: SESS-06, SESS-07
**Success Criteria** (what must be TRUE):
  1. Canvas edits by any user appear on all other users' screens within 500ms
  2. Messages sent by any user appear to all users in the session
  3. Concurrent edits resolve without data loss (no silent overwrites)
**Plans**: TBD

Plans:
- [ ] 05-01: TBD

### Phase 6: User Presence
**Goal**: Users can see who is in the session and where they are working
**Depends on**: Phase 5
**Requirements**: SESS-03, SESS-04, SESS-05
**Success Criteria** (what must be TRUE):
  1. Host sees a list of all connected participants
  2. Guests see the same participant list
  3. Users see other users' cursor positions on the canvas in real-time
  4. Each user has a distinct color/identifier for their cursor
**Plans**: TBD

Plans:
- [ ] 06-01: TBD

### Phase 7: Voice Input
**Goal**: Users can contribute to brainstorming sessions via voice
**Depends on**: Phase 4
**Requirements**: VOICE-01, VOICE-02, VOICE-03, VOICE-04, VOICE-05, VOICE-06, VOICE-07
**Success Criteria** (what must be TRUE):
  1. User can press-and-hold a button to record voice
  2. User sees visual recording indicator and audio level feedback while recording
  3. On release, audio is transcribed via Whisper and appears in message input
  4. Whisper auto-detects EN or FR language per utterance
  5. User sees indicator of which language was detected
**Plans**: TBD

Plans:
- [ ] 07-01: TBD

### Phase 8: Document Gallery
**Goal**: Users can share documents and include them as context for AI
**Depends on**: Phase 5
**Requirements**: DOC-01, DOC-02, DOC-03, DOC-04, DOC-05, DOC-06, DOC-07, DOC-08
**Success Criteria** (what must be TRUE):
  1. User can upload images and documents via drag-drop or file picker
  2. Gallery displays thumbnails of all uploaded files
  3. Gallery contents sync across all connected users
  4. User can drag a file from gallery into message compose area
  5. Dragged file is included as context when message is sent to AI
  6. AI can read and reference content from attached documents
**Plans**: TBD

Plans:
- [ ] 08-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 4 -> 5 -> 6 -> 7 -> 8
Note: Phases 7 (Voice) and 8 (Documents) could technically run in parallel after their dependencies are met.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Visual Techniques | v1.0 | 3/3 | Complete | 2026-01-26 |
| 2. Adaptive Session Flow | v1.0 | 5/5 | Complete | 2026-01-27 |
| 3. Human-First Collaboration | v1.0 | 2/2 | Complete | 2026-01-27 |
| 4. Room Infrastructure | v2.0 | 3/3 | Complete | 2026-01-27 |
| 5. Multi-Client Sync | v2.0 | 0/? | Not started | - |
| 6. User Presence | v2.0 | 0/? | Not started | - |
| 7. Voice Input | v2.0 | 0/? | Not started | - |
| 8. Document Gallery | v2.0 | 0/? | Not started | - |

---
*Roadmap created: 2026-01-26*
*v1.0 shipped: 2026-01-27*
*v2.0 roadmap added: 2026-01-27*
