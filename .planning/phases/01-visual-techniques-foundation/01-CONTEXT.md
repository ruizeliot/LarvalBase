# Phase 1: Visual Techniques Foundation - Context

**Gathered:** 2026-01-26
**Status:** Ready for planning

<domain>
## Phase Boundary

AI can draw the four core visual techniques (mind maps, matrices, affinity diagrams, flows) with real-time canvas updates. This phase delivers the drawing capabilities - session flow and collaboration guardrails are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Triggering Behavior
- **Mind maps:** Draw when user mentions a central topic - immediate branching from the concept
- **Matrices, affinity diagrams, flows:** AI discretion - AI decides when each technique would help based on conversation context
- Triggers are not keyword-based; AI uses semantic understanding of when visualization would aid thinking

### Progressive Detail
- AI has full discretion on:
  - Initial diagram size (minimal seed vs full structure)
  - Complexity handling (collapse, replace, or grow)
  - Diagram lifecycle (replace vs layer when topics shift)
- **User preferences system:** Build a parameters/settings mechanism so users can configure:
  - How proactive AI should be with drawing
  - Preferred complexity handling
  - Animation preferences
  - Default diagram behaviors
- Defaults before user customizes: AI discretion (balanced approach)

### Canvas Update Timing
- AI has discretion on:
  - Update speed (real-time streaming vs batch per message)
  - Animation style (smooth vs instant)
  - Interruption handling (complete draw vs adapt mid-stream)
  - Latency tradeoffs (quality vs speed)
- No hard latency requirements - AI balances responsiveness with quality

### Claude's Discretion
AI has broad discretion across all areas with these guiding principles:
- When in doubt, visualize (better to over-draw than under-draw)
- Match pacing to user's communication style
- Adapt technique choice to conversation flow
- Use preferences system to learn user's preferred behaviors over time

</decisions>

<specifics>
## Specific Ideas

- "A parameters section would be good for the user to select preferences" - Build a settings/preferences mechanism that lets users tune AI behavior rather than hardcoding defaults
- Trust AI judgment as the baseline; let users override via preferences

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope

</deferred>

---

*Phase: 01-visual-techniques-foundation*
*Context gathered: 2026-01-26*
