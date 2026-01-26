# Brainstorm Visual System

## What This Is

A visual brainstorming assistant that implements research-backed brainstorming techniques through an Excalidraw canvas interface. The AI acts as a "language extension" — a facilitator that externalizes user thinking into diagrams, wireframes, and visual artifacts they can react to and edit. The deliverable is a rich `brainstorm-notes.md` document.

## Core Value

The AI proactively uses visual techniques to extract rich insights from users during brainstorming sessions — drawing first, adapting constantly, making the invisible visible.

## Requirements

### Validated

- Live Canvas MCP server with notes, diagrams, and canvas tools — existing
- Real-time WebSocket sync between MCP and viewer — existing
- Mermaid/ASCII/PlantUML diagram rendering — existing
- Excalidraw integration in React viewer — existing
- Notes persistence to filesystem — existing

### Active

- [ ] AI aggressively uses canvas without prompting (draws first, asks with diagrams)
- [ ] AI applies varied visual brainstorming techniques (mind maps, storyboards, wireframes, matrices, flows)
- [ ] AI switches techniques based on user responses (adaptive facilitation)
- [ ] AI reads user engagement and adjusts approach (verbose → simplify, terse → probe deeper)
- [ ] Canvas updates are fast and responsive (no noticeable lag)
- [ ] AI consistently updates brainstorm-notes.md as conversation progresses
- [ ] AI can interpret user edits to canvas/notes and incorporate them
- [ ] Rich brainstorm-notes.md document as measurable success outcome

### Out of Scope

- Voice input (Whisper integration) — deferred, separate project
- New canvas tool development — existing MCP tools are sufficient
- Changes to pipeline phases 2-5 — this focuses only on brainstorming (phase 1)

## Context

The live-canvas-mcp infrastructure is production-ready with comprehensive tools:
- `append_notes`, `update_section`, `get_notes` for notes
- `render_mermaid`, `render_ascii`, `render_plantuml` for diagrams
- `create_shape`, `update_shape`, `connect_shapes`, `delete_shape` for canvas

The gap is **agent behavior**, not tooling. The AI has the tools but doesn't use them proactively. Users report:
- AI rarely drew anything (needed prompting)
- Drawings were too simple (basic boxes, not rich diagrams)
- Canvas updates lagged behind conversation

The solution is to make the brainstorming agent embody research-backed techniques and express them visually through the existing canvas system.

## Constraints

- **Tech stack**: Must use existing live-canvas-mcp tools (no new server development)
- **Integration**: Must work within existing pipeline Phase 1 workflow
- **Research-based**: Techniques must come from established brainstorming literature (IDEO, design thinking, etc.)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Focus on agent behavior, not new tools | Canvas infrastructure already works; gap is AI usage patterns | — Pending |
| Research brainstorming techniques first | User wants established methods, not invented approaches | — Pending |
| Measure success by brainstorm-notes.md richness | Concrete deliverable that captures session value | — Pending |

---
*Last updated: 2025-01-26 after initialization*
