# Pipeline v9.0 Issues Analysis

**Date:** 2025-01-05
**Source:** Monitoring test-fred-3 pipeline (Phase 2 → Phase 4 Epic 2)
**Status:** Under Review

---

## Issue 1: Missing BaseRules Parameter

**Category:** Orchestrator
**Severity:** Medium
**Status:** ✅ RESOLVED

**Observation:**
The orchestrator logs "No BaseRules parameter" and spawns worker without it. The worker should be receiving base rules but isn't.

**Evidence:**
```
orchestrator: No BaseRules parameter. Let me spawn without it:
```

**Root Cause:**
Version mismatch between orchestrator-desktop-v9.0.md (which documented BaseRules parameter injection) and spawn-worker.ps1 (which had been updated to v10.0 approach using phase-specific CLAUDE.md files).

**Resolution:**
Updated orchestrator-desktop-v9.0.md to match spawn-worker.ps1:
- Removed all `-BaseRules` parameter references from spawn commands
- Updated documentation to explain the new approach: spawn-worker.ps1 copies `Pipeline-Office/claude-md/phase-N.md` to project's `.claude/CLAUDE.md`
- Rules are now loaded via system prompt, not CLI injection
- Verified phase-specific files exist: phase-1.md through phase-5.md

---

## Issue 2: No Visual Deliverable in Phase 1

**Category:** Phase 1 Output
**Severity:** Low
**Status:** ✅ RESOLVED

**Observation:**
Phase 1 produces user stories but no visual presentation. There's nothing to show stakeholders or use for quick app communication.

**Impact:**
- Harder to communicate app vision to stakeholders
- No quick reference for what the app does
- Missing artifact for demo/testing sessions

**Resolution:**
Added **App Presentation** feature to Phase 1 (NOT a pitch deck - explaining, not convincing):

**1. Presentation Content Capture (Steps 1-7):**
- Each step now captures presentation-relevant content
- `🎬 Presentation Capture:` notes added to checkpoints

**2. Step 17b: Review App Presentation Outline (INTERACTIVE):**
- Present outline to user showing all frames
- Ask for approval before generating
- Ask about French translation preference (auto/review now/skip)
- Save approved outline to `docs/app-presentation-outline.md`

**3. Step 18: Generate App Presentation Animation:**
- Bilingual format with `en`/`fr` keys per frame
- Language toggle with 'L' key in animation player
- Frame types: Title, Audience, Main Interface, Features, Key Concepts, Scope, Implementation
- Quality criteria enforced by Haiku 4.5 subagent

**4. Visual Quality Subagent (Haiku 4.5):**
- Polishes VISUAL QUALITY only (not content)
- Content already approved in Step 17b
- Scores visuals (must reach 95% threshold)
- Enhances ASCII art, box-drawing, mockup detail

**Output:** `docs/app-presentation.json` - bilingual, visually rich, replayable anytime

---

## Issue 3: Worker Phase 2 Skipped Tasks (2 → 14)

**Category:** Task Execution
**Severity:** High
**Status:** ✅ RESOLVED

**Observation:**
Worker jumped from task 2 directly to task 14, skipping everything in between. Tasks were not executed sequentially.

**Impact:**
- Steps may be missed entirely
- Incomplete deliverables
- Unpredictable output quality

**Resolution:**
Implemented two-part solution:

**1. Sequential Enforcement Rule (worker-base-desktop-v9.0.md):**
- Added `⛔ SEQUENTIAL EXECUTION (MANDATORY)` section
- Task N cannot start until Task N-1 is completed
- No task can be skipped, even if it seems unnecessary
- No parallel task execution - one task at a time
- No jumping ahead - even if worker "knows" what's coming
- If a task seems unnecessary, complete it anyway and report in analysis

**2. Analysis Worker Enhancement (analyze-worker-transcript.cjs):**
- Added `detectSequencingViolations()` function that detects:
  - Skip violations: Task N started before Task N-1 completed
  - Jump violations: Worker jumped from Task X to Task Y (skipping X+1)
  - Out-of-order violations: Tasks completed in wrong order
- Added sequencing violations section to markdown report
- Added sequencing data to manifest for dashboard display

---

## Issue 4: Tasks Should Always Be Done One at a Time

**Category:** Task Design
**Severity:** High
**Status:** ✅ RESOLVED (with Issue 3)

**Observation:**
If tasks can be skipped or done out of order, they are badly designed. Sequential execution should be enforced.

**Impact:**
- Non-deterministic pipeline behavior
- Difficulty debugging when things go wrong
- Tasks may have hidden dependencies that break when skipped

**Resolution:**
Resolved together with Issue 3. The sequential enforcement rule ensures:
- One task in_progress at a time
- Strict ordering enforced
- Analysis worker detects violations and reports them

---

## Issue 5: Orchestrator Checks for Obsolete File

**Category:** Orchestrator
**Severity:** Low
**Status:** ✅ RESOLVED

**Observation:**
Orchestrator checks for `docs/test-specs.md` which may no longer be required in v9.0 (functionality-specs.md replaced it).

**Evidence:**
```
FAIL: docs/test-specs.md not found
```

**Impact:**
- Confusing logs
- May block pipeline advancement incorrectly

**Resolution:**
Updated two files to reference `functionality-specs.md` instead of `test-specs.md`:

1. **orchestrator-desktop-v9.0.md** (line ~697):
   - Phase 2 deliverable check now checks for `docs/functionality-specs.md`

2. **worker-base-desktop-v9.0.md** (lines ~459 and ~499):
   - References to protected files updated to `functionality-specs.md`

---

## Issue 6: Worker Phase 3 Task Order Chaos

**Category:** Task Execution
**Severity:** High
**Status:** ✅ RESOLVED (with Issue 3)

**Observation:**
Worker jumped to task 9 without completing step 7, then went back to step 8. Execution order is unpredictable.

**Impact:**
- Same as Issue 3/4
- Indicates systemic problem with task enforcement

**Resolution:**
Resolved together with Issue 3. The sequential enforcement rule and analysis worker now:
- Enforce strict task ordering (Task N cannot start until Task N-1 complete)
- Detect and report out-of-order completions
- Generate suggestions when task chaos is detected

---

## Issue 7: Need Step Mode (Interactive) vs Auto Mode

**Category:** Feature Request
**Severity:** Medium
**Status:** ✅ RESOLVED

**Observation:**
Currently only auto mode exists. Request for a step mode where:
- AI presents work to user after each phase/epic
- Demo app available for testing current functionality
- Pitch deck or summary for easier evaluation

**Impact:**
- Currently no way to checkpoint and review progress
- User must wait until end or interrupt manually
- No structured demo moments

**Resolution:**
Implemented comprehensive **Step Mode** with iteration branching:

**1. Manifest Schema Updates (orchestrator-desktop-v9.0.md):**
- Added `stepMode` boolean flag
- Added `currentIteration` counter
- Added `iterations[]` array tracking: id, branch, startedAt, endedAt, endReason, feedback, checkpoint, cost, snapshotPath

**2. Startup Question (orchestrator-desktop-v9.0.md Question 3):**
- User selects AUTO mode (continuous) or STEP mode (checkpoint after each phase/epic)

**3. Checkpoint Logic (orchestrator-desktop-v9.0.md sections 8.5-8.8):**
- After Phase 3+ completion in step mode: auto-launches app (`npm run tauri dev`)
- Generates test report (what to test based on current epic/phase)
- Sets status to "checkpoint" and waits for user review
- User commands: `continue`, `feedback "text"`, `add "feature"`, `back N`

**4. Cascade Analyzer (analyze-feedback-impact.js):**
- Analyzes user feedback to determine impact level (MAJOR/MODERATE/MINOR/MINIMAL)
- Uses keyword matching for phase1-4 impact detection
- Updates manifest with `cascadeRestartPhase` and `cascadeAnalysis`

**5. Cascade Execution (orchestrator-desktop-v9.0.md section 8.7):**
- Re-runs affected phases based on cascade analysis
- Creates new iteration with snapshot of current state
- Preserves iteration history for potential rollback

**6. Iteration Snapshots (orchestrator-desktop-v9.0.md section 8.8):**
- Save: Copies `docs/` folder to `.pipeline/snapshots/iteration-N/`
- Restore: User can `back N` to restore previous iteration state

**7. Dashboard Updates (dashboard-v3.cjs):**
- Step mode indicator in header: ⏸ STEP (magenta) or AUTO (dim)
- Iteration display: 🔄 v1/3 (current/total)
- CHECKPOINT status badge when paused at review point
- Iteration history section showing last 3 iterations with status and cost
- Heartbeat paused during checkpoint (no pings while user reviews)

---

## Issue 8: Worker Skills Need Review

**Category:** Worker Configuration
**Severity:** Medium
**Status:** ✅ RESOLVED

**Observation:**
The skills assigned to workers may be outdated, incomplete, or not well-suited for current pipeline requirements.

**Impact:**
- Workers may lack capabilities they need
- Skills may conflict or overlap
- No clear inventory of what workers can do

**Resolution:**
Comprehensive skills audit and installation completed:

**1. Skills Audit:**
- Audited 75 existing skills across ~/.claude/skills/
- Identified overlapping/duplicate skills
- Found problematic skills for workers (manager-pipeline, brainstorming)

**2. New Skills Installed (from jeremylongshore/claude-code-plugins-plus-skills):**
- **Testing:** jest-test-generator, flaky-test-detector, test-parallelizer, integration-test-setup
- **Performance:** bottleneck-identifier, response-time-analyzer
- **Frontend:** react-component-generator, react-hook-creator, tailwind-class-optimizer
- **DevOps:** pre-commit-hook-setup, commit-message-formatter, changelog-creator
- **Security:** secret-scanner, dependency-vulnerability-checker, env-secret-detector
- **Testing Plugins:** Full testing-plugins folder with 25 specialized skills

**3. Tauri Skill Installed (from @delorenj/skills/tauri):**
- Complete Tauri development skill with 9 reference files
- Covers: core concepts, development, distribution, getting started, plugins, reference, security, tutorials

**4. Skill Isolation Rules (worker-base-desktop-v9.0.md Section 14):**
- Added "Skill Usage Rules" section
- RECOMMENDED skills table by category
- FORBIDDEN skills table (orchestrator-only)
- Phase-specific skill selection guide
- Skill activation documentation

---

## Issue 9: E2E Test Parallelism Unknown

**Category:** Test Infrastructure
**Severity:** Medium
**Status:** ✅ RESOLVED

**Observation:**
Unclear how E2E tests are configured:
- How many parallel workers?
- What's the test runner setup?
- How does this affect performance?

**Impact:**
- Can't optimize test execution time
- May be running slower than necessary
- May be causing resource contention

**Resolution:**
Comprehensive audit completed across 4 projects:

**1. Key Finding: Parallelism NOT possible for Tauri**
- All configs correctly use `maxInstances: 1`
- Tauri apps share single tauri-driver instance
- Only one desktop app can be automated at a time
- This is a fundamental constraint, not misconfiguration

**2. Timeout Inconsistency Identified:**
| Project | Test Timeout | Wait Timeout | Connection Timeout |
|---------|-------------|--------------|-------------------|
| pipeline-monitor-desktop | 60s | 10s | 120s |
| Pod Definition desktop | 60s | N/A | N/A |
| test fred 3 | **15s** | **5s** | **30s** |
| test iomega | 60s | 10s | 120s |

**3. Standardized Template Created:**
`Pipeline-Office/lib/templates/wdio.conf.template.ts`
- Optimized timeouts (15s test, 5s wait, 30s connection)
- Clear documentation explaining why maxInstances=1
- Screenshot-on-failure hook
- TypeScript with proper ES module support

**4. Real Bottleneck Identified:**
- NOT parallelism (impossible for Tauri)
- Slow-down comes from: long timeouts, driver startup (2-3s), rebuild cycles
- This connects to Issue 11 (Testing/Fixing Bottleneck) and Issue 14 (Test Timeouts)

---

## Issue 10: Worker Fixes Test Instead of Implementation

**Category:** Worker Behavior
**Severity:** Critical
**Status:** ✅ RESOLVED

**Observation:**
When a test failed in Phase 4 Epic 1, worker sometimes corrected the test code instead of first checking if the implementation was wrong.

**Impact:**
- Bugs get hidden, not fixed
- Tests lose their value as verification
- App will fail in real use despite passing tests

**Resolution:**
Added Section 11 "Test Failure Investigation Order" to worker-base-desktop-v9.0.md:

```
When test fails, ALWAYS investigate in this order:
1. FIRST → Check implementation code (is the code wrong?)
2. ONLY THEN → Check test code (is the test wrong?)

NEVER fix a test without first verifying the implementation is correct.
```

This rule ensures workers always check implementation before modifying tests.

---

## Issue 11: Testing/Fixing is Major Bottleneck

**Category:** Performance
**Severity:** Critical
**Status:** ✅ RESOLVED

**Observation:**
Test cycles take too long. This is the biggest time sink in the pipeline. The loop of:
1. Run tests
2. See failure
3. Investigate
4. Fix
5. Rebuild
6. Re-run tests

...consumes disproportionate time. Better skills, preparation, or approach needed.

**Impact:**
- Pipeline takes much longer than necessary
- Most time spent in test-fix cycles, not implementation
- Cost increases significantly

**Resolution:**
Comprehensive audit identified root causes and implemented fixes:

**1. Root Cause Analysis:**
| Factor | Time Cost | Status |
|--------|-----------|--------|
| Release build per cycle | 40s | ✅ Fixed |
| Running ALL tests | +50% time | ✅ Fixed |
| Step 18 redundancy | +1 full cycle | Pending |
| Poor failure feedback | Investigation time | Pending |

**2. Solution 1: Dev Build for E2E (Saves ~18s per cycle)**
- Created `wdio.conf.dev.ts` template using `target/debug/`
- Added `test:e2e:dev` npm script
- Updated Phase 3 to create both configs
- Dev build: 22s vs Release build: 40s

**3. Solution 2: Targeted Testing (Saves ~50% test time)**
- Updated Phase 4 Step 14 with targeted test commands
- `npm run test:e2e:dev -- --spec "./e2e/specs/epic-N*.e2e.ts"`
- Workers now run only current epic's tests during iteration
- Full suite only before commit

**Files Modified:**
- `Pipeline-Office/lib/templates/wdio.conf.dev.template.ts` (new)
- `~/.claude/commands/3-new-pipeline-desktop-v9.0.md` (dev config)
- `~/.claude/commands/4-new-pipeline-desktop-v9.0.md` (targeted testing)

**Remaining:** None - Issue 12 (Step 18 redundancy) also resolved via step reordering.

---

## Issue 12: Regression Tests in Epic 1 + Step 4/18 Redundancy

**Category:** Phase 4 Design
**Severity:** Medium
**Status:** ✅ RESOLVED

**Observation:**
Two problems:
1. Running regression tests in Epic 1 makes no sense (nothing to regress against)
2. Step 4 and Step 18 in Phase 4 appear to do the same thing (run all tests)

**Evidence:**
- Step 4: "Check for bugs from previous epics" (runs all tests)
- Step 18: "Regression Check" (runs all tests)

**Impact:**
- Wasted time in Epic 1
- Redundant test runs in every epic
- Unclear purpose of duplicate steps

**Resolution:**
Two changes made:

**1. Removed Step 4 entirely:**
- Step 4 "Check for Bugs from Previous Epics" was redundant
- Logic: Step 17 (regression) at END of Epic N ensures all tests pass
- When Epic N+1 starts, no code has changed since Step 17 passed
- Therefore re-running tests at start of new epic is pointless
- **Total steps reduced from 19 to 18**

**2. Reordered Steps 13-17 (previously 14-18):**

**Old order:** 14 (E2E) → 15 (smoke) → 16 (visual) → 17 (a11y) → 18 (all tests)
**New order:** 13 (smoke) → 14 (visual) → 15 (a11y) → 16 (targeted E2E) → 17 (E2E regression)

**Key changes:**
1. Visual and a11y tests now run BEFORE E2E (Steps 14-15)
2. Targeted E2E (Step 16) catches regressions from visual/a11y fixes
3. Step 17 now runs ONLY E2E regression (not all tests)
4. Unit/integration tests verified in Steps 5/7 - no need to re-run

**Updated TodoWrite initialization:** 18 steps instead of 19

---

## Issue 13: Need Verification Agent Between Epics

**Category:** Feature Request
**Severity:** Medium
**Status:** ✅ RESOLVED

**Observation:**
Suggestion: Launch independent Haiku 4.5 agent between epics to:
- Compare code against functionality spec
- Compare code against E2E test expectations
- Detect if worker "cheated" to pass tests (e.g., mocking, hardcoding)

**Impact:**
- Currently no verification that implementation matches spec
- Worker could game the tests without implementing real functionality
- Issues only caught late (or never)

**Resolution:**
Added section 8.1d "EPIC VERIFICATION: Anti-Cheat Check" to orchestrator-desktop-v9.0.md (v9.1):

**5 Verification Checks:**
1. Hardcoded returns - Grep for `return` with `// test/mock/fake` comments
2. Skipped tests - Grep for `.skip` without `// REASON:` annotation
3. Mocks in production - Grep for jest/vitest mock functions in `src/`
4. Empty catch blocks - Grep for `catch {}` that swallow errors
5. Incomplete markers - Count TODO/FIXME in implementation

**Behavior:**
- Runs after each epic completes in Phase 4
- If issues found: respawns worker with fix instructions (max 2 retries)
- After 3 failures: escalates to user but continues (flagged for review)
- Results stored in `manifest.epics[].verification`

---

## Issue 14: Test Timeouts Too Long

**Category:** Test Infrastructure
**Severity:** Medium
**Status:** ✅ RESOLVED

**Observation:**
When something breaks, the system waits through long timeouts before failing. Too much dead time where nothing happens.

**Impact:**
- Slow feedback loops
- Wasted time waiting for inevitable failure
- Hard to tell if test is slow or stuck

**Resolution:**
Implemented tiered timeout system in v9.1:

**1. Updated wdio.conf.dev.template.ts:**
- `bail: 1` - Stop on first failure (was 0)
- `connectionRetryTimeout: 15000` - 15s (was 30s)
- `connectionRetryCount: 1` - 1 retry (was 2)
- Max connection wait: 30s (was 60s)

**2. Created wdio.conf.smoke.template.ts:**
- `waitforTimeout: 3000` - 3s (vs 5s dev)
- `connectionRetryTimeout: 10000` - 10s
- `mochaOpts.timeout: 5000` - 5s per test (vs 15s dev)
- `bail: 1` - Fail fast

**Tiered Config System:**
| Config | Test Timeout | Connection | Use Case |
|--------|--------------|------------|----------|
| smoke | 5s | 10s | Quick sanity check |
| dev | 15s | 15s | Development iteration |
| release | 30s | 30s | Final validation |

**Time saved:** Up to 60s on connection failures, minutes on broken builds

---

## Issue 15: Manifest File Conflict

**Category:** Infrastructure Bug
**Severity:** High
**Status:** ✅ RESOLVED

**Observation:**
Dashboard and worker both edit `.pipeline/manifest.json`. Worker gets "file unexpectedly modified" errors because dashboard is also writing to it.

**Impact:**
- Worker operations fail
- Potential data corruption
- Race conditions between components

**Resolution:**
Separated file ownership:

| File | Owner | Contents |
|------|-------|----------|
| `manifest.json` | Orchestrator | Phase/epic status, gates, PIDs |
| `dashboard-state.json` | Dashboard | Timer (activeMs), heartbeat count |

**Changes to dashboard-v3.cjs:**
1. Added `DASHBOARD_STATE_PATH` constant
2. Modified `saveActiveMs()` to write to `dashboard-state.json`
3. Updated initialization to read timer from `dashboard-state.json`

**Result:** Dashboard no longer writes to manifest.json every 5 seconds. Only event-driven writes remain (phase complete, metrics) which rarely conflict with orchestrator.

---

## Issue 16: CLAUDE.md Size Limit vs Detail Needed

**Category:** Architecture
**Severity:** Medium
**Status:** ✅ RESOLVED (Non-Issue)

**Observation:**
Standard practice says CLAUDE.md should be under 40k characters. But orchestrator and workers need detailed instructions that exceed this limit.

**Impact:**
- Either instructions are truncated/incomplete
- Or CLAUDE.md becomes too large and causes issues
- Need architectural solution

**Resolution:**
Analyzed and determined current architecture already solves this:

**File Sizes:**
| File | Size | Type |
|------|------|------|
| orchestrator-desktop-v9.0.md | 65KB | Slash command (not CLAUDE.md) |
| worker-base-desktop-v9.0.md | 20KB | Appended at spawn |
| phase-N.md | 9-20KB | Copied to CLAUDE.md |
| **Worker CLAUDE.md total** | ~31KB | Under 40k limit |

**Why it's not an issue:**
1. Slash commands load on invocation, NOT via CLAUDE.md
2. Worker CLAUDE.md = phase-specific (11KB) + worker-base (20KB) = ~31KB
3. 31KB < 40KB guideline
4. Orchestrator runs as slash command, not CLAUDE.md

**Architecture documented:** spawn-worker.ps1 copies phase-N.md + appends worker-base to keep CLAUDE.md under limit while slash commands can be larger.

---

## Issue 17: TUI Scrolling Broken During Output

**Category:** UX Bug
**Severity:** Low
**Status:** ✅ RESOLVED (Won't Fix)

**Observation:**
When worker produces output, TUI scrolls to bottom automatically. Cannot scroll up to read earlier conversation while worker is active.

**Impact:**
- Can't review what worker did earlier
- Must wait for worker to pause/stop to read history
- Poor monitoring experience

**Resolution:**
Marked as **Won't Fix** - this is a known Claude Code bug, not pipeline code.

**Research findings:**
- Tracked across multiple GitHub issues: [#826](https://github.com/anthropics/claude-code/issues/826), [#1422](https://github.com/anthropics/claude-code/issues/1422), [#3648](https://github.com/anthropics/claude-code/issues/3648), [#12668](https://github.com/anthropics/claude-code/issues/12668), [#14692](https://github.com/anthropics/claude-code/issues/14692), [#16040](https://github.com/anthropics/claude-code/issues/16040)
- Tagged as `area:tui` bug, confirmed as regression
- No configuration option to disable auto-scroll

**Workarounds:**
1. Use `/compact` command to reduce conversation length
2. Restart Claude Code sessions via `/quit` periodically
3. Use Step Mode (Issue 7) for natural review points
4. Review transcripts after phase completion

---

## Issue 18: Too Many Tests for Too Little Implementation

**Category:** Epic Design
**Severity:** Medium
**Status:** ✅ RESOLVED

**Observation:**
Phase 4 has disproportionate test-to-implementation ratio. Possible cause: Epic 1 "App Core Shell" has most work done in Phase 3 (skeleton), leaving little actual implementation for Phase 4.

**Impact:**
- Phase 4 spends more time running/fixing tests than implementing
- Epic boundaries don't match work distribution
- Inefficient resource allocation

**Resolution:**
Updated Phase 1 command (1-new-pipeline-desktop-v9.0.md) with v9.1 epic scoping rules:

**1. Step 9 - Epic Sizing Rules:**
- Minimum: 3 stories (smaller = merge)
- Maximum: 10 stories (larger = split)
- Target: 5-7 stories

**2. Step 9 - Feature-First Rule:**
- Every epic must answer: "What can the user DO?"
- ✅ Good: "User can create/manage files"
- ❌ Bad: "App window displays correctly"

**3. Step 9 - No "App Shell" Epic:**
- Infrastructure embedded in first feature epic
- Shell gets built AS NEEDED by Epic 1's features

**4. Step 10 - Verification Algorithm:**
```
For each epic E:
  1. Can E's tests run with ONLY E's code?
  2. Does E deliver USER-VISIBLE capability?
  3. Is E sized correctly (3-10 stories)?
```

**5. Added Prohibitions (You Must NOT):**
- Create infrastructure-only epics
- Create epics < 3 or > 10 stories
- Define Epic 1 as non-feature

**6. Updated Example Table:**
- Removed "App Shell" from template
- Shows feature-first epic pattern

---

## Issue 19: Epic 1 Not Metrically Analyzed

**Category:** Monitoring Gap
**Severity:** Low
**Status:** ✅ RESOLVED (Won't Fix)

**Observation:**
Analysis worker was paused, so Epic 1 completion wasn't analyzed. Metrics gap in pipeline history.

**Impact:**
- Missing data for Epic 1 performance
- Can't compare across epics
- Incomplete pipeline metrics

**Resolution:**
Marked as **Won't Fix** - this was a one-time operational gap during a specific test run, not a systemic issue. The analysis system itself works correctly when enabled. No code changes required.

---

## Issue 20: Workers Don't Search Online

**Category:** Worker Behavior
**Severity:** High
**Status:** ✅ RESOLVED

**Observation:**
When workers hit issues they can't solve, they don't use web search to find solutions. They struggle or fail instead of researching.

**Impact:**
- Solvable problems become blockers
- Workers waste time trying same approaches
- Missing critical skill for autonomous operation

**Resolution:**
Added "AUTOMATIC WebSearch Triggers" section to worker-base-desktop-v9.0.md:

| Trigger | Action |
|---------|--------|
| Same error after 2 fix attempts | WebSearch exact error |
| Unfamiliar API/library | WebSearch examples |
| Build fails with unclear error | WebSearch fix |
| Test fails unexpectedly | WebSearch framework + assertion |
| Don't know how to do something | WebSearch tutorial |
| Considering workaround/mock | WebSearch original solution first |

**Key rule:** "If you've tried the same approach twice without success, STOP and WebSearch."

---

## Issue 21: E2E Tests Too Black Box

**Category:** Test Visibility
**Severity:** Medium
**Status:** ✅ RESOLVED

**Observation:**
TUI shows minimal info during E2E runs. Only see things like "expected 1 received 0". Need better visibility or separate interface to understand what's happening.

**Impact:**
- Hard to diagnose failures
- Can't tell which step failed
- Monitoring experience is poor

**Resolution:**
Comprehensive E2E visibility system implemented (v9.1):

**1. Verbose WDIO Config (`wdio.conf.verbose.template.ts`):**
- `logLevel: 'info'` - shows WebDriver commands
- `beforeCommand/afterCommand` hooks log every UI interaction
- Real-time progress written to `.pipeline/e2e-progress.json`
- Spec reporter with `realtimeReporting: true`

**2. Progress Tracking File (`.pipeline/e2e-progress.json`):**
- `status`: running/passed/failed
- `currentSuite`/`currentTest`: what's being tested
- `currentStep`: current WebDriver action (e.g., "findElement: css=.node")
- `testsRun`/`testsPassed`/`testsFailed`: counts
- `recentActions[]`: last 20 WebDriver commands
- `lastError`: detailed failure info (test, message, selector, expected, actual, screenshot)

**3. Dashboard E2E Section (`dashboard-v3.cjs`):**
- New `readE2EProgress()` function reads progress file
- E2E TESTING section appears when tests running
- Shows: status icon, pass/fail counts, current suite/test
- Shows current step (what WebDriver is doing)
- Lists last 3 actions (click, findElement, etc.)
- On failure: shows test name, error message, selector, expected vs actual, screenshot path

**4. Verbose Helpers (`e2e-helpers.template.ts`):**
- `waitForElement()` - logs selector, reports found/timeout with timing
- `clickElement()` - logs target, checks if displayed/enabled
- `typeInto()` - shows what's being typed where
- `expectText()` - shows expected vs actual on mismatch
- `expectVisible()` - detailed visibility assertions
- `expectCount()` - element count assertions
- `checkpoint()` - labeled screenshots at key moments
- `step()` - test step annotations for readability

**Files created/updated:**
- `Pipeline-Office/lib/templates/wdio.conf.verbose.template.ts` (new)
- `Pipeline-Office/lib/templates/e2e-helpers.template.ts` (new)
- `Pipeline-Office/lib/dashboard-v3.cjs` (E2E section + readE2EProgress)

---

## Summary

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | Missing BaseRules Parameter | Medium | ✅ Resolved |
| 2 | No Visual Deliverable in Phase 1 | Low | ✅ Resolved |
| 3 | Worker Phase 2 Skipped Tasks | High | ✅ Resolved |
| 4 | Tasks Should Be Sequential | High | ✅ Resolved |
| 5 | Obsolete File Check | Low | ✅ Resolved |
| 6 | Worker Phase 3 Task Chaos | High | ✅ Resolved |
| 7 | Need Step Mode | Medium | ✅ Resolved |
| 8 | Worker Skills Review | Medium | ✅ Resolved |
| 9 | E2E Parallelism Unknown | Medium | ✅ Resolved |
| 10 | Worker Fixes Test Not Implementation | Critical | ✅ Resolved |
| 11 | Testing/Fixing Bottleneck | Critical | ✅ Resolved |
| 12 | Regression in Epic 1 + Redundancy | Medium | ✅ Resolved |
| 13 | Need Verification Agent | Medium | ✅ Resolved |
| 14 | Test Timeouts Too Long | Medium | ✅ Resolved |
| 15 | Manifest File Conflict | High | ✅ Resolved |
| 16 | CLAUDE.md Size Limit | Medium | ✅ Resolved |
| 17 | TUI Scrolling Issue | Low | ✅ Resolved (Won't Fix) |
| 18 | Test/Implementation Imbalance | Medium | ✅ Resolved |
| 19 | Epic 1 Not Analyzed | Low | ✅ Resolved (Won't Fix) |
| 20 | Workers Don't Search Online | High | ✅ Resolved |
| 21 | E2E Tests Black Box | Medium | ✅ Resolved |

**Resolved:** 21
**Open:** 0

**All issues resolved.**

---

## Next Steps

All 21 issues have been addressed. The pipeline is now at **v9.1**.

**Key v9.1 improvements:**
1. Epic verification agent between Phase 4 epics (anti-cheat)
2. Tiered test timeout system (smoke/dev/release)
3. Feature-first epic scoping rules in Phase 1
4. Enhanced E2E visibility with custom WDIO hooks
5. Step mode with iteration branching
6. Worker web search triggers for autonomous problem-solving

**Recommended next action:** Test pipeline v9.1 on a new project to validate all fixes.
