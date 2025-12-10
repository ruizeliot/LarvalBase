# Desktop Pipeline Gap Analysis

**Created:** 2025-12-08
**Purpose:** Identify gaps in desktop pipeline commands compared to ATDD standards and AI research findings
**Reference:** `docs/terminal-pipeline-v7-implementation-plan.md`, `docs/ai-development-research.md`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Files Analyzed](#2-files-analyzed)
3. [Gap Categories](#3-gap-categories)
4. [Detailed Gap Analysis by File](#4-detailed-gap-analysis-by-file)
5. [Critical Missing Elements](#5-critical-missing-elements)
6. [Prioritized Implementation Plan](#6-prioritized-implementation-plan)
7. [Effort Estimation](#7-effort-estimation)

---

## 1. Executive Summary

### Overall Assessment: **SIGNIFICANT GAPS**

The desktop pipeline commands are missing critical elements that were added to the terminal pipeline v7:

| Category | Terminal v7 | Desktop v6 | Gap Level |
|----------|-------------|------------|-----------|
| MANDATORY BEHAVIORS section | ✅ Present | ❌ **MISSING** | **CRITICAL** |
| Context Management section | ✅ Present | ❌ **MISSING** | **HIGH** |
| Multi-layer test support | ✅ Unit/Integration/E2E | ❌ **E2E ONLY** | **CRITICAL** |
| Test layer decision tree | ✅ Present | ❌ **MISSING** | **HIGH** |
| Test layer tags in acceptance criteria | ✅ `[UNIT]`, `[INTEGRATION]`, `[E2E]` | ❌ **MISSING** | **HIGH** |
| Evidence before assertions | ✅ Explicit | ❌ **MISSING** | **CRITICAL** |
| docs/test-specs.md (multi-layer) | ✅ Replaces e2e-test-specs.md | ❌ Still uses `e2e-test-specs.md` | **MEDIUM** |
| Test pyramid order | ✅ Unit → Integration → E2E | ❌ **E2E ONLY** | **HIGH** |
| Fast regression (test:fast) | ✅ `npm run test:fast` | ❌ **MISSING** | **MEDIUM** |

### Key Findings

1. **Desktop pipeline is E2E-only** - No unit or integration test support
2. **No AI reliability prompting** - Missing MANDATORY BEHAVIORS section in all 9 files
3. **No context rot prevention** - Missing Context Management section in autonomous phases
4. **No test layer planning** - Phase 1 doesn't guide users to tag criteria with test layers
5. **Fix pipeline lacks decision tree** - No guidance on choosing test layer for bug fixes

---

## 2. Files Analyzed

### Desktop Pipeline Commands (9 files)

| File | Purpose | Gap Level |
|------|---------|-----------|
| `1-new-pipeline-desktop-v6.0.md` | Phase 1: Brainstorm | **HIGH** |
| `2-new-pipeline-desktop-v6.0.md` | Phase 2: Test specs | **CRITICAL** |
| `3-new-pipeline-desktop-v6.0.md` | Phase 3: Bootstrap | **CRITICAL** |
| `4-new-pipeline-desktop-v6.0.md` | Phase 4: Implement | **HIGH** |
| `5-new-pipeline-desktop-v6.0.md` | Phase 5: Finalize | **MEDIUM** |
| `1-feature-pipeline-desktop-v6.0.md` | Feature: Scope | **HIGH** |
| `2-feature-pipeline-desktop-v6.0.md` | Feature: Test specs | **CRITICAL** |
| `3-feature-pipeline-desktop-v6.0.md` | Feature: Implement | **HIGH** |
| `1-fix-pipeline-desktop-v6.0.md` | Fix: Bug fix | **HIGH** |

---

## 3. Gap Categories

### 3.1 AI Reliability Gaps (CRITICAL)

These gaps cause false completion and lazy AI behavior:

| Gap | Impact | Source |
|-----|--------|--------|
| No MANDATORY BEHAVIORS section | AI claims completion without evidence | Anthropic research |
| No "Evidence Before Assertions" rule | AI says "tests pass" without showing output | AI best practices |
| No "3 approaches before giving up" rule | AI gives up too easily | AI prompting research |
| No "Complete ALL items" rule | AI skips items it deems redundant | Anti-lazy prompting |

### 3.2 Testing Strategy Gaps (CRITICAL)

| Gap | Impact | Source |
|-----|--------|--------|
| E2E-only testing | Slow feedback loop, hard to debug | Testing Pyramid (Fowler) |
| No unit test infrastructure | Cannot test pure logic in isolation | TDD best practices |
| No integration test infrastructure | Cannot test service interactions | Testing Trophy (Dodds) |
| No test layer tags on criteria | Cannot plan test distribution | ATDD methodology |

### 3.3 Context Management Gaps (HIGH)

| Gap | Impact | Source |
|-----|--------|--------|
| No Context Management section | AI forgets critical info in long conversations | Stanford research |
| No checkpoint summaries guidance | Context degrades without anchors | Context rot prevention |
| No "/clear between tasks" guidance | Token waste on stale context | AI efficiency |

### 3.4 Documentation Gaps (MEDIUM)

| Gap | Impact | Source |
|-----|--------|--------|
| Still references `docs/e2e-test-specs.md` | Should be `docs/test-specs.md` (multi-layer) | Terminal v7 update |
| No coverage matrix guidance | Cannot verify test distribution | ATDD quality |
| No test distribution targets | No pyramid balance enforcement | Testing Pyramid |

---

## 4. Detailed Gap Analysis by File

### 4.1 `1-new-pipeline-desktop-v6.0.md` (Phase 1: Brainstorm)

**Current State:** Interactive brainstorming with user story creation

**Missing Elements:**

| Element | Terminal v7 Has | Desktop v6 Has | Status |
|---------|-----------------|----------------|--------|
| MANDATORY BEHAVIORS section | ✅ | ❌ | **MISSING** |
| Test Layer Planning section | ✅ | ❌ | **MISSING** |
| Test layer tags `[UNIT]`, `[INTEGRATION]`, `[E2E]` | ✅ | ❌ | **MISSING** |
| "Test Layers: Unit: X, Integration: X, E2E: X" per story | ✅ | ❌ | **MISSING** |
| Verification todo for test layer tags | ✅ | ❌ | **MISSING** |

**Specific Missing Sections:**

1. **Test Layer Decision Matrix** - No guidance on which criteria need which test layer
2. **Per-Story Test Planning** - Acceptance criteria lack `[UNIT]`, `[INTEGRATION]`, `[E2E]` annotations
3. **"You Must" update** - Missing rule to tag criteria with test layers

---

### 4.2 `2-new-pipeline-desktop-v6.0.md` (Phase 2: Test Specs)

**Current State:** E2E test spec generation only

**Missing Elements:**

| Element | Terminal v7 Has | Desktop v6 Has | Status |
|---------|-----------------|----------------|--------|
| MANDATORY BEHAVIORS section | ✅ | ❌ | **MISSING** |
| Context Management section | ✅ | ❌ | **MISSING** |
| Unit test spec generation | ✅ | ❌ | **MISSING** |
| Integration test spec generation | ✅ | ❌ | **MISSING** |
| Testing Strategy section | ✅ | ❌ | **MISSING** |
| Coverage Matrix | ✅ | ❌ | **MISSING** |
| Test Distribution targets | ✅ | ❌ | **MISSING** |
| Multi-layer TODO list | ✅ | ❌ | **MISSING** |
| Output file: `docs/test-specs.md` | ✅ | ❌ (uses `e2e-test-specs.md`) | **OUTDATED** |

**Critical Gaps:**

1. **Only generates E2E specs** - No unit or integration specs
2. **No pyramid visualization** - Workers don't understand test distribution
3. **No framework stack documentation** - Workers don't know what frameworks to use for each layer

**Note:** Desktop apps may not need the same 30/40/30 distribution as terminal apps due to Tauri-specific considerations. Suggested desktop distribution:
- Unit: 10-20% (less pure logic in desktop apps)
- Integration: 20-30% (Tauri commands, store operations)
- E2E: 50-70% (UI-heavy, desktop interaction focus)

---

### 4.3 `3-new-pipeline-desktop-v6.0.md` (Phase 3: Bootstrap)

**Current State:** Creates Tauri project with E2E test infrastructure only

**Missing Elements:**

| Element | Terminal v7 Has | Desktop v6 Has | Status |
|---------|-----------------|----------------|--------|
| MANDATORY BEHAVIORS section | ✅ | ❌ | **MISSING** |
| Context Management section | ✅ | ❌ | **MISSING** |
| `tests/unit/` folder structure | ✅ | ❌ | **MISSING** |
| `tests/integration/` folder structure | ✅ | ❌ | **MISSING** |
| `src/utils/` folder (pure functions) | ✅ | ❌ | **MISSING** |
| Unit test setup file | ✅ | ❌ | **MISSING** |
| Integration test setup file | ✅ | ❌ | **MISSING** |
| `vitest.config.ts` with multi-layer | ✅ | ❌ | **MISSING** |
| `npm run test:unit` script | ✅ | ❌ | **MISSING** |
| `npm run test:integration` script | ✅ | ❌ | **MISSING** |
| `npm run test:fast` script | ✅ | ❌ | **MISSING** |
| RED check for all layers | ✅ | ❌ | **MISSING** |
| Coverage verification for all layers | ✅ | ❌ | **MISSING** |

**Critical Gaps:**

1. **Project structure lacks test hierarchy** - Only has `e2e/` folder
2. **No Vitest configuration for unit/integration** - Only WebdriverIO for E2E
3. **TODO list only covers E2E** - No unit/integration test tasks

**Desktop-Specific Consideration:**
- Desktop apps need Vitest for unit/integration tests (same as terminal)
- WebdriverIO + tauri-driver for E2E (already present)
- Tauri commands should be tested at integration level

---

### 4.4 `4-new-pipeline-desktop-v6.0.md` (Phase 4: Implement)

**Current State:** Implements features until E2E tests pass

**Missing Elements:**

| Element | Terminal v7 Has | Desktop v6 Has | Status |
|---------|-----------------|----------------|--------|
| MANDATORY BEHAVIORS section | ✅ | ❌ | **MISSING** |
| Context Management section | ✅ | ❌ | **MISSING** |
| Pyramid test order (unit → int → E2E) | ✅ | ❌ | **MISSING** |
| Layer-aware debugging strategy | ✅ | ❌ | **MISSING** |
| Fast regression (`npm run test:fast`) | ✅ | ❌ | **MISSING** |
| Implementation order (pure functions → services → UI) | ✅ | ❌ | **PARTIAL** |
| Multi-layer TODO list | ✅ | ❌ | **MISSING** |

**What's Good:**
- Has "Read Existing Code Patterns" section (Step 1.5) ✅
- Has Progressive Debugging Strategy ✅
- Has Active Test Monitoring Pattern ✅

**Critical Gaps:**

1. **Runs only E2E tests** - Misses opportunity for fast unit/integration feedback
2. **Fix loop doesn't consider layers** - Debugging table should show unit → integration → E2E path
3. **Regression check is E2E-only** - Should run `test:fast` first for speed

---

### 4.5 `5-new-pipeline-desktop-v6.0.md` (Phase 5: Finalize)

**Current State:** Polish, security checks, final E2E run

**Missing Elements:**

| Element | Terminal v7 Has | Desktop v6 Has | Status |
|---------|-----------------|----------------|--------|
| MANDATORY BEHAVIORS section | ✅ | ❌ | **MISSING** |
| Context Management section | ✅ | ❌ | **MISSING** |
| Multi-layer final test run | ✅ | ❌ | **MISSING** |
| Test distribution verification | ✅ | ❌ | **MISSING** |
| Static analysis (typecheck, lint) | ✅ | ✅ (implicit) | **PARTIAL** |

**What's Good:**
- Has comprehensive security audit ✅
- Has README verification ✅
- Has COST OPTIMIZATION section ✅

**Gaps:**

1. **Only verifies E2E pass** - Should verify all layers
2. **No test distribution check** - Should report pyramid balance
3. **No multi-layer coverage verification** - Only counts E2E specs

---

### 4.6 `1-feature-pipeline-desktop-v6.0.md` (Feature: Scope)

**Current State:** Interactive feature scoping, no test layer planning

**Missing Elements:**

| Element | Terminal v7 Has | Desktop v6 Has | Status |
|---------|-----------------|----------------|--------|
| MANDATORY BEHAVIORS section | ✅ | ❌ | **MISSING** |
| Test Layer Decision Matrix | ✅ | ❌ | **MISSING** |
| Test layer tags on criteria | ✅ | ❌ | **MISSING** |
| Verification todo for layers | ✅ | ❌ | **MISSING** |

**Same gaps as Phase 1 new pipeline.**

---

### 4.7 `2-feature-pipeline-desktop-v6.0.md` (Feature: Test Specs)

**Current State:** E2E test spec generation only

**Missing Elements:**

| Element | Terminal v7 Has | Desktop v6 Has | Status |
|---------|-----------------|----------------|--------|
| MANDATORY BEHAVIORS section | ✅ | ❌ | **MISSING** |
| Context Management section | ✅ | ❌ | **MISSING** |
| Unit test spec generation | ✅ | ❌ | **MISSING** |
| Integration test spec generation | ✅ | ❌ | **MISSING** |
| Multi-layer RED check | ✅ | ❌ | **MISSING** |
| Multi-layer TODO list | ✅ | ❌ | **MISSING** |

**Same gaps as Phase 2 new pipeline.**

---

### 4.8 `3-feature-pipeline-desktop-v6.0.md` (Feature: Implement)

**Current State:** Implements feature until E2E tests pass

**Missing Elements:**

| Element | Terminal v7 Has | Desktop v6 Has | Status |
|---------|-----------------|----------------|--------|
| MANDATORY BEHAVIORS section | ✅ | ❌ | **MISSING** |
| Context Management section | ✅ | ❌ | **MISSING** |
| Pyramid test order | ✅ | ❌ | **MISSING** |
| Layer-aware debugging | ✅ | ❌ | **MISSING** |
| Fast regression | ✅ | ❌ | **MISSING** |
| Multi-layer TODO list | ✅ | ❌ | **MISSING** |
| Test coverage verification | ✅ | ❌ | **MISSING** |

**Additional Issue:**
- Header says "Phase 2-feature" but file is `3-feature-pipeline` - **NAMING BUG**

---

### 4.9 `1-fix-pipeline-desktop-v6.0.md` (Fix: Bug Fix)

**Current State:** Single-worker bug fix with E2E regression test only

**Missing Elements:**

| Element | Terminal v7 Has | Desktop v6 Has | Status |
|---------|-----------------|----------------|--------|
| MANDATORY BEHAVIORS section | ✅ | ❌ | **MISSING** |
| Test Layer Decision Tree | ✅ | ❌ | **MISSING** |
| "DECIDE: Which test layer?" todo | ✅ | ❌ | **MISSING** |
| Layer examples table | ✅ | ❌ | **MISSING** |
| "Why Lowest Layer?" rationale | ✅ | ❌ | **MISSING** |
| Fix document with layer info | ✅ | ❌ | **MISSING** |
| Git commit with layer info | ✅ | ❌ | **MISSING** |

**Critical Gap:**

The fix pipeline always adds E2E tests, even for pure logic bugs. This wastes time:

| Bug Type | Current Approach | Optimal Approach |
|----------|------------------|------------------|
| Validation fails | E2E test (5s) | Unit test (10ms) |
| Calculation wrong | E2E test (5s) | Unit test (10ms) |
| Service issue | E2E test (5s) | Integration test (100ms) |
| UI bug | E2E test (5s) | E2E test (5s) ✅ |

---

## 5. Critical Missing Elements

### 5.1 MANDATORY BEHAVIORS Section (ALL 9 FILES)

**Must add to all files immediately after TODO LIST RULES:**

```markdown
---

## MANDATORY BEHAVIORS (AI Reliability)

**CRITICAL - These rules prevent false completion and lazy defaults:**

### You MUST:
- **Run tests, not claim to have run them** - Show actual output
- **Complete ALL items**, not "most" items
- **Show actual test output** in your response, not summaries
- **Try 3 approaches** before saying "not possible"
- **Break down large tasks** instead of saying "too much work"

### You MUST NOT:
- Declare completion without running verification commands
- Summarize test results instead of showing them
- Skip items because they seem redundant
- Give up after one failed approach

### Evidence Before Assertions
```
❌ WRONG: "All tests pass"
✅ RIGHT: "Test output: 12 passed, 0 failed (showing actual output)"
```

---
```

### 5.2 Context Management Section (AUTONOMOUS PHASES ONLY)

**Must add to files: 2-new, 3-new, 4-new, 5-new, 2-feature, 3-feature**

```markdown
---

## Context Management (Prevent Context Rot)

**Long conversations degrade AI recall. Mitigate with:**

1. **Critical info placement:** Key instructions are at START and END of this prompt
2. **Fresh context:** Use `/clear` between major tasks if context grows large
3. **Re-read before acting:** If unsure, re-read the "You Must" section before proceeding
4. **Checkpoint summaries:** After each major step, briefly summarize what was done

---
```

### 5.3 Multi-Layer Testing Stack (Phase 2, 3)

**Desktop apps should use:**

| Layer | Framework | Location | Purpose |
|-------|-----------|----------|---------|
| Unit | Vitest | `tests/unit/` | Pure logic (validators, formatters) |
| Integration | Vitest | `tests/integration/` | Tauri commands, store operations |
| E2E | WebdriverIO + tauri-driver | `e2e/specs/` | Full desktop app testing |

### 5.4 Test Layer Decision Tree (Fix Pipeline)

```markdown
## Test Layer Decision Tree (CRITICAL)

**Add regression test at the LOWEST layer that can catch the bug:**

```
Is the bug in pure logic (validation, calculation, formatting)?
├── YES → Add UNIT test in tests/unit/
│         Run: npm run test:unit
└── NO → Does the bug involve Tauri commands, store, or backend logic?
         ├── YES → Add INTEGRATION test in tests/integration/
         │         Run: npm run test:integration
         └── NO → Bug is in UI/desktop interaction
                  → Add E2E test in e2e/specs/
                    Run: npm run test:e2e
```

### Why Lowest Layer?

| Layer | Debug Time | Fix Iteration | Token Cost |
|-------|------------|---------------|------------|
| Unit | Instant | <1 second | Low |
| Integration | Fast | <5 seconds | Medium |
| E2E | Slow | 30+ seconds | High |
```

---

## 6. Prioritized Implementation Plan

### Phase 1: Global Changes (Do First) - All 9 Files

| Priority | Task | Files | Effort |
|----------|------|-------|--------|
| **P0** | Add MANDATORY BEHAVIORS section | All 9 | 1 hour |
| **P0** | Add Context Management section | 6 autonomous files | 30 min |

### Phase 2: Fix Pipeline (Quick Win)

| Priority | Task | File | Effort |
|----------|------|------|--------|
| **P1** | Add Test Layer Decision Tree | `1-fix-pipeline-desktop-v6.0.md` | 30 min |
| **P1** | Update TODO list with DECIDE step | `1-fix-pipeline-desktop-v6.0.md` | 15 min |
| **P1** | Add fix document template with layer | `1-fix-pipeline-desktop-v6.0.md` | 15 min |

### Phase 3: Phase 1 Files (Interactive)

| Priority | Task | Files | Effort |
|----------|------|-------|--------|
| **P1** | Add Test Layer Planning section | `1-new-pipeline-desktop-v6.0.md`, `1-feature-pipeline-desktop-v6.0.md` | 1 hour |
| **P1** | Update acceptance criteria format | Same 2 files | 30 min |
| **P1** | Add verification todo | Same 2 files | 15 min |

### Phase 4: Phase 2 Files (Major - Test Specs)

| Priority | Task | Files | Effort |
|----------|------|-------|--------|
| **P1** | Add Testing Strategy section | `2-new-pipeline-desktop-v6.0.md`, `2-feature-pipeline-desktop-v6.0.md` | 1 hour |
| **P1** | Add unit/integration spec generation | Same 2 files | 2 hours |
| **P1** | Update TODO list for multi-layer | Same 2 files | 30 min |
| **P2** | Change output to `docs/test-specs.md` | Same 2 files | 15 min |

### Phase 5: Phase 3 File (Major - Bootstrap)

| Priority | Task | File | Effort |
|----------|------|------|--------|
| **P1** | Add test folder structure | `3-new-pipeline-desktop-v6.0.md` | 30 min |
| **P1** | Add Vitest configuration | `3-new-pipeline-desktop-v6.0.md` | 1 hour |
| **P1** | Add unit/integration setup files | `3-new-pipeline-desktop-v6.0.md` | 1 hour |
| **P1** | Update package.json scripts | `3-new-pipeline-desktop-v6.0.md` | 30 min |
| **P1** | Update TODO list for multi-layer | `3-new-pipeline-desktop-v6.0.md` | 30 min |

### Phase 6: Phase 4 & 5 Files (Implementation & Finalize)

| Priority | Task | Files | Effort |
|----------|------|-------|--------|
| **P1** | Add pyramid test order | `4-new-pipeline-desktop-v6.0.md`, `3-feature-pipeline-desktop-v6.0.md` | 1 hour |
| **P1** | Add layer-aware debugging table | Same 2 files | 30 min |
| **P1** | Add fast regression step | Same 2 files | 30 min |
| **P2** | Add test distribution verification | `5-new-pipeline-desktop-v6.0.md` | 30 min |
| **P2** | Update TODO lists | All Phase 4/5 files | 1 hour |

### Phase 7: Bug Fixes

| Priority | Task | File | Effort |
|----------|------|------|--------|
| **P2** | Fix header naming bug | `3-feature-pipeline-desktop-v6.0.md` | 5 min |

---

## 7. Effort Estimation

### Summary

| Phase | Files | Estimated Effort |
|-------|-------|------------------|
| Phase 1: Global Changes | 9 | 1.5 hours |
| Phase 2: Fix Pipeline | 1 | 1 hour |
| Phase 3: Phase 1 Files | 2 | 1.5 hours |
| Phase 4: Phase 2 Files | 2 | 3.5 hours |
| Phase 5: Phase 3 File | 1 | 3.5 hours |
| Phase 6: Phase 4 & 5 Files | 4 | 3.5 hours |
| Phase 7: Bug Fixes | 1 | 5 min |
| **TOTAL** | **9** | **~15 hours** |

### Comparison with Terminal Pipeline Update

| Metric | Terminal v7 Update | Desktop v7 Update (Estimated) |
|--------|-------------------|-------------------------------|
| Files to modify | 9 | 9 |
| Major rewrites | 3 | 3 |
| Medium changes | 6 | 6 |
| New sections | ~15 | ~15 |
| Complexity | High | High (Tauri-specific considerations) |

---

## Appendix: Desktop-Specific Considerations

### A.1 Why Desktop Differs from Terminal

| Aspect | Terminal (Ink) | Desktop (Tauri) |
|--------|---------------|-----------------|
| UI Framework | React + Ink | React + Vite |
| Backend | Node.js | Rust |
| Test Framework (E2E) | CLET + node-pty | WebdriverIO + tauri-driver |
| Build Step | `npm run build` | `npm run tauri build` |
| Distribution | npm package | .exe/.msi installer |

### A.2 Tauri-Specific Testing Considerations

| Test Layer | What to Test | Framework |
|------------|--------------|-----------|
| Unit | Frontend validators, formatters | Vitest |
| Unit | Rust pure functions | Rust's `#[test]` or cargo test |
| Integration | Tauri commands (invoke) | Vitest + mock invoke |
| Integration | tauri-plugin-store | Vitest + temp directory |
| E2E | Full app with real .exe | WebdriverIO + tauri-driver |

### A.3 Recommended Test Distribution for Desktop

```
Desktop App Test Pyramid:

     ┌─────────────────────┐
     │    E2E (50-70%)     │  ← UI-heavy, desktop interactions
     │  WebdriverIO + TD   │
     ├─────────────────────┤
     │ Integration (20-30%)│  ← Tauri commands, store
     │      Vitest         │
     ├─────────────────────┤
     │   Unit (10-20%)     │  ← Pure logic (less common in desktop)
     │      Vitest         │
     └─────────────────────┘
```

**Note:** Desktop apps are more UI-centric than terminal apps, so E2E percentage is higher.

---

## Appendix: Verification Checklist

After implementation, verify:

- [ ] All 9 files have "MANDATORY BEHAVIORS" section
- [ ] 6 autonomous phases have "Context Management" section
- [ ] Phase 1 files have Test Layer Planning guidance
- [ ] Phase 2 files generate specs for ALL test layers
- [ ] Phase 3 creates tests/unit/ and tests/integration/ folders
- [ ] Phase 4 runs tests in pyramid order (unit → integration → E2E)
- [ ] Phase 5 verifies all layers pass
- [ ] Fix pipeline has Test Layer Decision Tree
- [ ] All TODO lists updated with layer-specific tasks
- [ ] package.json template has test:unit, test:integration, test:e2e, test:fast scripts
- [ ] 3-feature-pipeline header naming bug is fixed
- [ ] References to `docs/e2e-test-specs.md` changed to `docs/test-specs.md`

---

**End of Gap Analysis**
