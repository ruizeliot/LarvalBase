---
phase: 03-human-first-collaboration
plan: 02
subsystem: ai-behavioral-guardrails
tags: [prompt-engineering, facilitation, conversation-design]

dependency-graph:
  requires:
    - 03-01 (Human-first prompting rules)
    - 02-02 (Engagement detection)
  provides:
    - Question-driven facilitation cycle (Ask-Visualize-Build)
    - Adaptive pacing rules
    - Integrated self-check
  affects:
    - Phase 1 brainstorm workflow (reads these rules)

tech-stack:
  added: []
  patterns:
    - Ask-Visualize-Build cycle for question-driven facilitation
    - Engagement-signal pacing adaptation
    - Pre-response self-check protocol

file-tracking:
  key-files:
    created: []
    modified:
      - Pipeline-Office/.claude/CLAUDE.md (added Rules 3-4 and Self-Check)

decisions:
  - Question types mapped to Double Diamond phases (diverge vs converge)
  - Pacing rules explicitly reference get_session_phase engagement field
  - Self-check has 5 verification questions, one for each major guardrail

metrics:
  duration: 3 min
  completed: 2026-01-27
---

# Phase 03 Plan 02: Question-Driven Facilitation and Adaptive Pacing Summary

**One-liner:** Ask-Visualize-Build cycle with engagement-adaptive pacing keeps AI as question-driven facilitator

## What Was Done

### Task 1: Add Rule 3 - Question-Driven Facilitation (COLLAB-03)
Added the Ask-Visualize-Build cycle to CLAUDE.md:
1. ASK - Pose open-ended question
2. WAIT - User responds
3. VISUALIZE - Draw their ideas
4. ACKNOWLEDGE - Validate what was captured
5. BUILD - Add connecting question
6. REPEAT

Includes question types table mapped to Double Diamond phases (Discover/Define/Develop/Deliver) with diverge/converge modes.

### Task 2: Add Rule 4 - Adaptive Pacing (COLLAB-04)
Added pacing rules by engagement signal:
- **terse**: ONE specific question, more space
- **verbose**: Match depth, reference specifics
- **confused**: Slow down, concrete examples
- **excited**: Keep up, capture everything
- **normal**: Steady rhythm, 1-2 questions per turn

References `get_session_phase` engagement field from Phase 2.

### Task 3: Add Self-Check and Anti-Patterns
Added integrated self-check with 5 questions:
1. Human-first? (ask before suggesting)
2. Max 3? (curate options)
3. Question or declaration?
4. Pacing match?
5. Visualizing user's ideas?

Added Anti-Patterns table covering 7 common facilitation mistakes.

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Question types by phase | Maps directly to Double Diamond model | Consistent with research-backed framework |
| Explicit engagement field reference | Creates direct link to Phase 2 infrastructure | AI knows exactly which MCP field to check |
| 5 verification questions | One per major guardrail concept | Complete coverage without overload |

## Deviations from Plan

None - plan executed exactly as written. (Note: Rule 2 from plan 03-01 was already present, so no deviation needed.)

## Key Links Verified

| From | To | Via | Verified |
|------|-----|-----|----------|
| Adaptive pacing rules | Phase 2 engagement detection | References get_session_phase engagement field | YES (line 1084) |

## Test Results

N/A - This is purely behavioral/prompt engineering, no code to test.

## Files Changed

| File | Change Type | Lines Added |
|------|-------------|-------------|
| `.claude/CLAUDE.md` | Modified | +123 |

## Next Steps

Phase 3 is now complete. The Human-First Collaboration Guardrails section contains all 4 rules plus self-check and anti-patterns. The AI behavioral instructions are ready for use during brainstorming sessions.

## Commit

- `4c022bf`: docs(03-02): add question-driven facilitation and adaptive pacing
