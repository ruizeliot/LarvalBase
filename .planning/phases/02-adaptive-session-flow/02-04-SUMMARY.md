---
phase: 02-adaptive-session-flow
plan: 04
subsystem: claude-integration
tags: [claude.md, behavioral-instructions, mcp-integration, gap-closure]
status: complete
completed: 2026-01-27

requires:
  - 02-01 (session state)
  - 02-02 (engagement detection)
  - 02-03 (edit detection)
provides:
  - Claude behavioral instructions for Phase 2 infrastructure
affects:
  - Phase 1 brainstorming workflow now uses Live Canvas MCP
  - Future phases may reference these patterns

tech-stack:
  added: []
  patterns:
    - "Behavioral instructions in CLAUDE.md"
    - "Mode-based behavioral switching"
    - "Tool-agnostic session awareness"

key-files:
  created: []
  modified:
    - ".claude/CLAUDE.md"

decisions:
  - id: 02-04-01
    decision: "Insert Live Canvas MCP section before Phase 1 workflow section"
    reason: "Applies to brainstorming so should be read before Phase 1 instructions"
  - id: 02-04-02
    decision: "Explicit mode-checking instructions (check mode field from get_session_phase)"
    reason: "Closes 'Claude not integrated' gap - provides actionable rules"

metrics:
  duration: 2 min
  tasks: 4/4
  commits: 1
---

# Phase 2 Plan 04: Add Live Canvas MCP Behavioral Instructions

## One-liner

Added comprehensive Live Canvas MCP behavioral instructions to CLAUDE.md, closing infrastructure-behavior gap

## What Was Done

Added a new major section "Live Canvas MCP Integration" to `.claude/CLAUDE.md` containing:

1. **MCP Tools Overview** - When to use each drawing tool:
   - `create_mindmap`: Exploring related concepts
   - `create_matrix`: Comparing options, prioritizing
   - `create_affinity_diagram`: Grouping 5+ scattered ideas
   - `create_flow`: Describing processes, user journeys

2. **Session Phase Awareness** - Explicit instructions to:
   - Call `get_session_phase` at session start and every 3-5 turns
   - Read the `mode` field to determine approach
   - Follow "When mode == diverge" vs "When mode == converge" behavioral rules

3. **Notes Discipline** - Pattern for continuous updates:
   - Call `append_notes` after capturing user ideas
   - Use standard section names (Core Concept, Key Features, etc.)

4. **Engagement Response** - Adaptation patterns:
   - Terse: Probe deeper with specific questions
   - Verbose: Match depth, build on detail
   - Confused: Ask what's unclear, provide examples
   - Excited: Match enthusiasm, expand ideas

5. **Technique Switching** - How to pivot when stagnating:
   - Check `currentTechnique` from get_session_phase
   - Follow diverge/converge technique order
   - Acknowledge and pivot gracefully

## Gap Closure

This plan closes gaps 1-4 and 6 from the Phase 2 verification report:

| Gap | Status | Evidence |
|-----|--------|----------|
| Gap 1: Session phase awareness | CLOSED | Explicit mode-checking instructions added |
| Gap 2: Continuous notes updates | CLOSED | append_notes discipline documented |
| Gap 3: Engagement-based adaptation | CLOSED | Engagement signal response patterns added |
| Gap 4: Technique switching notification | CLOSED | Technique switching instructions added |
| Gap 6: CLAUDE.md behavioral integration | CLOSED | Comprehensive Live Canvas MCP section added |

Gap 5 (user edit incorporation) remains open - requires wiring getPendingEdits into the message flow.

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash | Message | Files |
|------|---------|-------|
| 607516f | feat(02): add Live Canvas MCP behavioral instructions to CLAUDE.md | .claude/CLAUDE.md |

## Verification

- [x] CLAUDE.md contains "# Live Canvas MCP Integration" section
- [x] `get_session_phase` appears 4 times (tool name + usage instructions)
- [x] `mode == "diverge"` explicit behavioral rule present
- [x] `mode == "converge"` explicit behavioral rule present
- [x] `append_notes` appears 3 times
- [x] Engagement signal response table present
- [x] Technique Switching section present
- [x] File is valid markdown
- [x] Changes committed

## Actionability Check

Claude can now determine behavior by:
1. Calling `get_session_phase` tool
2. Reading the `mode` field from response
3. Following explicit rules:
   - `mode == "diverge"`: Open questions, no filtering, mindmaps/affinity
   - `mode == "converge"`: Prioritize, synthesize, matrices/flow

## Next Steps

1. Gap 5 (user edit incorporation) needs separate plan
2. Phase 2 re-verification to confirm gaps closed
3. Phase 3 integration planning
