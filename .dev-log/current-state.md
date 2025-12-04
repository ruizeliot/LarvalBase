# Pipeline-Office Current State

**Updated:** 2025-11-21
**Status:** In Progress

---

## Current Work

Paused mid-improvement of pipeline v2 system. Need to continue:

### Pending Tasks

1. **Subagent prompt strategy** - Decide: full templates in commands vs reference to spec
   - User preference: Keep commands simple, spec has full details
   - Need to revert 3a expansion and add simple reference pattern

2. **Test-to-user-story mapping** - Added to spec, need to update 3b command to enforce

3. **Token tracking** - Added format to spec, need to add to step commands

4. **Phase 0 → Phase 3 integration** - Ensure E2E tests trace back to user stories

---

## Recent Decisions

- **Single source of truth:** `.pipeline/v2-pipeline-specification.md`
- **Self-improvement loop:** Steps suggest review, review suggests spec updates
- **User Story mapping:** Table format showing criteria → E2E test coverage

---

## Context from Previous Session

The user (CEO) and I established:

1. **Terminology:** Phase (0,1,2,3) vs Step (0,1a,1b,etc.)
2. **Hierarchy:** Pipeline Officer → Pipeline Manager → Agent → Subagent
3. **Key pain points from test-pipeline-v3:**
   - Multiplayer tests were catastrophic
   - E2E tests didn't cover all user stories
   - Errors in early phases only surfaced in Phase 3
   - Skipped tests by agents
   - No cross-verification after parallel execution

---

## Next Steps

1. Clarify subagent prompt strategy with CEO
2. Complete the 4 pending improvements
3. Test pipeline with a real execution

---

## Files Modified This Session

- Created: `.pipeline/v2-pipeline-specification.md`
- Updated: `docs/brainstorm-notes.md` (v2 solid version)
- Renamed: `pipeline-review-phase.md` → `pipeline-step-review.md`
- Updated: All 13 v2 step commands (spec references, post-step actions)
