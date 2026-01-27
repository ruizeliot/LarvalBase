# Requirements: Brainstorm Visual System

**Defined:** 2025-01-26
**Core Value:** The AI proactively uses visual techniques to extract rich insights from users during brainstorming sessions

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Visual Techniques

- [x] **VIS-01**: AI draws mind maps to expand and branch user ideas
- [x] **VIS-02**: AI creates 2x2 matrices for comparison and prioritization
- [x] **VIS-03**: AI builds affinity diagrams to group related ideas
- [x] **VIS-04**: AI renders user flow diagrams for journey/process mapping

### Session Flow

- [x] **FLOW-01**: Session follows Double Diamond phases (diverge → converge cycles)
- [x] **FLOW-02**: brainstorm-notes.md updates continuously as conversation progresses
- [x] **FLOW-03**: AI detects user engagement signals (verbose, terse, confused, excited)
- [x] **FLOW-04**: AI switches visual techniques when current approach isn't working

### Human-AI Collaboration

- [x] **COLLAB-01**: AI solicits user ideas BEFORE offering AI suggestions (human-first)
- [x] **COLLAB-02**: AI presents maximum 3 curated suggestions at a time
- [x] **COLLAB-03**: AI uses question-driven prompts (asks → user answers → AI visualizes)
- [x] **COLLAB-04**: AI adapts pacing based on user response style

### Canvas Performance

- [x] **CANVAS-01**: Canvas updates in real-time as conversation progresses (no noticeable lag)
- [x] **CANVAS-02**: Visuals start simple and add detail progressively
- [x] **CANVAS-03**: AI detects and incorporates user edits to canvas/notes

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Techniques

- **VIS-05**: Multi-criteria decision matrices
- **VIS-06**: SWOT analysis visualization
- **VIS-07**: Dot voting simulation
- **VIS-08**: Storyboard sequences

### Enhanced Collaboration

- **COLLAB-05**: Voice input via Whisper integration
- **COLLAB-06**: Multi-page canvas navigation
- **COLLAB-07**: Session history and replay

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Voice input (Whisper) | Separate project, adds complexity |
| New MCP tool development | Existing canvas tools are sufficient |
| Changes to pipeline phases 2-5 | This focuses only on brainstorming |
| AI idea generation | AI visualizes user ideas, doesn't generate them |
| Template library | Start with dynamic generation, templates later |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| VIS-01 | Phase 1 | Complete |
| VIS-02 | Phase 1 | Complete |
| VIS-03 | Phase 1 | Complete |
| VIS-04 | Phase 1 | Complete |
| FLOW-01 | Phase 2 | Complete |
| FLOW-02 | Phase 2 | Complete |
| FLOW-03 | Phase 2 | Complete |
| FLOW-04 | Phase 2 | Complete |
| COLLAB-01 | Phase 3 | Pending |
| COLLAB-02 | Phase 3 | Pending |
| COLLAB-03 | Phase 3 | Pending |
| COLLAB-04 | Phase 3 | Pending |
| CANVAS-01 | Phase 1 | Complete |
| CANVAS-02 | Phase 1 | Complete |
| CANVAS-03 | Phase 2 | Complete |

**Coverage:**
- v1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2025-01-26*
*Last updated: 2026-01-27 after Phase 2 completion*
