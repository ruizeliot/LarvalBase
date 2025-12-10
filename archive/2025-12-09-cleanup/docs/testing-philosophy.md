# Testing Philosophy: 1:1 User Story to E2E Test Mapping

**Version:** 1.0
**Last Updated:** 2025-12-08

---

## Core Principle

> **At the end of a pipeline, every user story must work guaranteed 100%, no matter time and cost.**

This document establishes the testing philosophy that governs all IMT pipelines.

---

## The Fundamental Rule

### One User Story = One E2E Test

Every user story MUST have exactly one E2E test that guarantees it works from the user's perspective.

```
User Story 1  →  E2E Test 1
User Story 2  →  E2E Test 2
User Story 3  →  E2E Test 3
...
User Story N  →  E2E Test N
```

**This is non-negotiable.** The E2E test count must equal the user story count.

---

## Story Granularity

### The Split Rule

If a user story requires multiple E2E tests to verify it works, **the story is badly designed and must be rewritten**.

**Bad Example:**
```
US-001: As a user, I can manage my account settings
  - Requires E2E test for changing password
  - Requires E2E test for updating email
  - Requires E2E test for profile picture upload
```

This story needs 3 E2E tests → **Split it into 3 stories.**

**Good Example:**
```
US-001: As a user, I can change my password
  - E2E: User changes password and logs in with new password

US-002: As a user, I can update my email address
  - E2E: User changes email and receives confirmation at new address

US-003: As a user, I can upload a profile picture
  - E2E: User uploads image and sees it displayed on profile
```

### Granularity Guidelines

A well-designed user story should be:

1. **Single-flow**: One happy path from start to finish
2. **User-observable**: The outcome is visible to the user
3. **Independently testable**: Can be verified in isolation
4. **Small enough**: Completable in a single user session

**Do not be scared of having many user stories.** Granular, well-defined stories are better than complex, multi-faceted ones.

---

## Test Layer Roles

### E2E Tests: The Guarantee

E2E tests are the **only** way to guarantee a user story works. They:

- Test the complete user flow from start to finish
- Run against the real application (not mocks)
- Verify the user sees the expected outcome
- Prove the acceptance criteria are met

**Every user story MUST have an E2E test. No exceptions.**

### Unit Tests: Debugging Helpers

Unit tests help developers locate bugs faster. They:

- Test individual functions in isolation
- Run fast (milliseconds)
- Pinpoint exactly which function broke
- Are optional per user story

**Unit tests do NOT guarantee user stories work.** A passing unit test suite with failing E2E tests means the feature is broken.

### Integration Tests: Debugging Helpers

Integration tests verify components work together. They:

- Test service interactions
- Verify data flows between modules
- Run faster than E2E but slower than unit
- Are optional per user story

**Integration tests do NOT guarantee user stories work.** They help narrow down where a bug lives.

---

## Test Count Distribution

### Old Model (Pyramid - Deprecated)

```
        /\
       /E2E\       30% - Slow but confident
      /------\
     /  INT   \    40% - Medium speed
    /----------\
   /   UNIT     \  30% - Fast but shallow
  ----------------
```

This model optimized for **speed over guarantee**. It allowed some user stories to have no E2E tests.

### New Model (1:1 Enforcement)

```
E2E Tests  = User Story Count  (MANDATORY)
Unit Tests = Implementation-driven (OPTIONAL)
Int. Tests = Implementation-driven (OPTIONAL)
```

**E2E count is fixed by story count.** Lower layer tests are driven by implementation complexity, not story count.

### Example

Given 10 user stories where:
- 3 stories have complex business logic
- 2 stories involve service integration
- 5 stories are simple UI flows

Test distribution:
```
E2E Tests:         10 (1 per story, mandatory)
Integration Tests:  2 (for the 2 integration-heavy stories)
Unit Tests:         3 (for the 3 logic-heavy stories)
```

**Note:** 5 stories have ONLY E2E tests. That's fine. If the E2E passes, the story works.

---

## Verification Rules

### Phase 2 (Test Specs) Must Verify

1. **E2E count equals user story count**
   ```
   if (e2eTestCount !== userStoryCount) {
     FAIL: "Missing E2E tests for some user stories"
   }
   ```

2. **Every story has exactly one E2E test mapped**
   ```
   for each userStory:
     if (story.e2eTests.length !== 1) {
       FAIL: "Story must have exactly 1 E2E test"
     }
   ```

3. **Stories needing multiple E2E tests must be split**
   - If during test writing you realize a story needs multiple E2E tests
   - STOP and split the story in Phase 1 (brainstorm)
   - Then return to Phase 2

### Phase 4 (Implementation) Must Verify

1. **All E2E tests pass before epic completion**
2. **No E2E tests are skipped**
3. **No stories are marked complete without passing E2E**

### Phase 5 (Finalize) Must Verify

1. **Full E2E suite passes in production conditions**
2. **Story count equals passing E2E test count**

---

## Why This Matters

### Speed vs. Guarantee Trade-off

| Approach | Speed | Guarantee |
|----------|-------|-----------|
| Test Pyramid (30/40/30) | Fast | Partial |
| 1:1 E2E Mapping | Slower | 100% |

**We choose guarantee.** A pipeline that completes fast but ships broken features is worthless.

### The Cost of Broken Features

- User trust is lost
- Bug fixes cost more than prevention
- "It worked on my machine" is not an excuse

### The Value of Granular Stories

- Easier to estimate
- Easier to test
- Easier to review
- Easier to roll back

---

## Implementation in Pipeline Commands

### Phase 1 (Brainstorm)

Add story granularity check:
- Guide users to write single-flow stories
- Warn when a story seems too complex
- Provide split guidance

### Phase 2 (Test Specs)

Enforce 1:1 mapping:
- Count user stories
- Require exactly that many E2E tests
- Block proceeding if counts don't match

### Phase 3-5

Maintain verification:
- E2E tests run and pass
- No story marked done without its E2E passing

---

## Summary

1. **One user story = One E2E test** (mandatory)
2. **If a story needs multiple E2E tests, split the story**
3. **E2E tests guarantee user stories work**
4. **Unit/Integration tests help debug, but don't guarantee**
5. **Lower layer test count is driven by implementation, not story count**
6. **We optimize for guarantee, not speed**

---

## References

- Pipeline Specification: `v4-pipeline-specification.md`
- Terminal Pipeline: `*-new-pipeline-terminal-v6.0.md`
- Desktop Pipeline: `*-new-pipeline-desktop-v6.0.md`
