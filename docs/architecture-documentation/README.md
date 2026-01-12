# Architecture Documentation

**Created:** 2026-01-08
**Updated:** 2026-01-12 (Added Phase 1 Redesign 25-26, Analyzer v2 redesign 15-17)
**Version:** v11

Reference specifications for Pipeline v11 architecture.

---

## Documents

### Infrastructure (01-07)

| # | File | Description |
|---|------|-------------|
| 01 | [pipeline-execution-flow.md](./01-pipeline-execution-flow.md) | How pipeline starts and executes |
| 02 | [orchestrator-todos.md](./02-orchestrator-todos.md) | Orchestrator responsibilities |
| 03 | [dashboard-features.md](./03-dashboard-features.md) | Dashboard display, key bindings |
| 04 | [file-locations.md](./04-file-locations.md) | Where files are loaded from |
| 05 | [worker-startup.md](./05-worker-startup.md) | How workers initialize |
| 06 | [worker-rules.md](./06-worker-rules.md) | Base rules for all workers |
| 07 | [supervisor-behavior.md](./07-supervisor-behavior.md) | Haiku review loop behavior |

### v11 Overview (08)

| # | File | Description |
|---|------|-------------|
| 08 | [new-pipeline-structure.md](./08-new-pipeline-structure.md) | Overview of v11 architecture |

### Phases (09-13)

| # | File | Description | Mode |
|---|------|-------------|------|
| 09 | [phase-1-discovery-planning.md](./09-phase-1-discovery-planning.md) | Phase 1: Brainstorm Facilitator | Interactive |
| 10 | [phase-2-pm-agent.md](./10-phase-2-pm-agent.md) | Phase 2: PM Agent - User stories | Autonomous |
| 11 | [phase-3-test-architect.md](./11-phase-3-test-architect.md) | Phase 3: Test Architect - Test specs | Autonomous |
| 12 | [phase-4-developer.md](./12-phase-4-developer.md) | Phase 4: Developer - Implementation | Autonomous (Free Zone) |
| 13 | [phase-5-quality.md](./13-phase-5-quality.md) | Phase 5: Quality - Polish & deploy | Autonomous |

### Standards (14)

| # | File | Description |
|---|------|-------------|
| 14 | [mandatory-standards.md](./14-mandatory-standards.md) | A11y, completeness pairs, skills usage, detection commands |

### Analyzer System (15-17)

| # | File | Description |
|---|------|-------------|
| 15 | [analyzer-v2-design.md](./15-analyzer-v2-design.md) | Outcome-based learning system architecture |
| 16 | [outcome-correlation-spec.md](./16-outcome-correlation-spec.md) | Likert ratings, feature extraction, correlation methods |
| 17 | [analyzer-skills-spec.md](./17-analyzer-skills-spec.md) | Data collection, analysis, and utility skills |

### Step Mode (18)

| # | File | Description |
|---|------|-------------|
| 18 | [step-mode-spec.md](./18-step-mode-spec.md) | Human-in-the-loop checkpoints, iteration management |

### Unity Pipeline (19-21)

| # | File | Description |
|---|------|-------------|
| 19 | [unity-pipeline-overview.md](./19-unity-pipeline-overview.md) | Unity + Meta XR SDK pipeline overview |
| 20 | [unity-mcp-setup.md](./20-unity-mcp-setup.md) | Unity MCP server installation and configuration |
| 21 | [meta-xr-mcp-setup.md](./21-meta-xr-mcp-setup.md) | Meta Quest Developer Hub MCP setup |

### Android Pipeline (22-24)

| # | File | Description |
|---|------|-------------|
| 22 | [android-pipeline-overview.md](./22-android-pipeline-overview.md) | Tauri 2.0 mobile architecture for Android |
| 23 | [android-environment-setup.md](./23-android-environment-setup.md) | Android SDK/NDK installation and configuration |
| 24 | [android-testing-setup.md](./24-android-testing-setup.md) | WebdriverIO + Appium 2 for mobile E2E testing |

### Phase 1 Redesign (25-26)

| # | File | Description |
|---|------|-------------|
| 25 | [phase-1-redesign.md](./25-phase-1-redesign.md) | Remove Phase 1 from pipeline, make pre-pipeline activity |
| 26 | [live-canvas-spec.md](./26-live-canvas-spec.md) | Real-time visualization MCP server + skill |

---

## Key Principles (v11)

1. **1 Story = 1 E2E Test** - Every user story maps to exactly one E2E test
2. **Three-Part Structure** - Fixed Start → Free Zone → Fixed End (Phase 4)
3. **Haiku Review Loops** - Independent verification at milestones (score >= 95)
4. **Mandatory Standards** - A11y, completeness pairs enforced automatically
5. **Ralph-Style Implementation** - Autonomous loop until test passes (max 20 iterations)
6. **Progress Tracking** - `.pipeline/implementation-progress.json` for long-running work
7. **Outcome-Based Learning** - User Likert ratings as ground truth for correlation analysis
8. **Write Immediately** - During brainstorming, save ideas to file after EVERY discussion (not at todo completion)

---

## Phase Flow

```
PRE-PIPELINE (Interactive)          PIPELINE (Autonomous)
┌───────────────────────┐           ┌─────────────────────────────────┐
│    /brainstorm        │           │     Phases 2-5                  │
│    (skill)            │           │     (orchestrator)              │
├───────────────────────┤           ├─────────────────────────────────┤
│                       │           │                                 │
│  ┌─────────────────┐  │           │  ┌───────┐ ┌───────┐ ┌───────┐ │
│  │ Discuss ideas   │  │           │  │Phase 2│→│Phase 3│→│Phase 4│ │
│  │ with Live Canvas│  │  ──────►  │  │Stories│ │ Tests │ │ Impl  │ │
│  └────────┬────────┘  │           │  └───────┘ └───────┘ └───┬───┘ │
│           │           │           │                          │     │
│           ▼           │           │                          ▼     │
│  ┌─────────────────┐  │           │                    ┌───────┐   │
│  │ Write ideas     │  │           │                    │Phase 5│   │
│  │ IMMEDIATELY     │  │           │                    │Polish │   │
│  └────────┬────────┘  │           │                    └───────┘   │
│           │           │           │                                 │
│           ▼           │           └─────────────────────────────────┘
│  docs/brainstorm-     │
│  notes.md             │
│  docs/user-stories.md │
└───────────────────────┘
```

**Key change in v11:** Brainstorming is a **separate pre-pipeline skill**, not Phase 1.
The pipeline (Phases 2-5) is fully autonomous. See [25-phase-1-redesign.md](./25-phase-1-redesign.md).

---

## v11 TODO

### Feature Mode (Not Yet Implemented)

**Status:** Needs design and implementation

Current phase documents (09-13) are for **New Mode** only (creating apps from scratch).

**Feature Mode** is for adding features to existing projects and requires:

| Aspect | Difference from New Mode |
|--------|--------------------------|
| **Starting point** | Existing codebase with patterns, architecture, tests |
| **Phase 1** | Scope feature within existing app (not brainstorm from scratch) |
| **Phase 2** | Add stories for new feature only (read existing stories first) |
| **Phase 3** | Extend existing test specs (not create new skeleton) |
| **Phase 4** | Implement without breaking existing tests |
| **Phase 5** | Feature-specific polish (not full app polish) |

**Files needed:**
- `25-feature-mode-overview.md` - How feature mode differs
- `26-phase-1-feature.md` through `30-phase-5-feature.md` - Feature mode phases

**Key considerations:**
- Must read and understand existing codebase first
- Must follow existing patterns (styling, state management, etc.)
- Must not break existing tests
- Must integrate with existing user-stories.md and test-specs.md

## Development Branching Strategy

**All new pipeline implementations MUST be developed in separate Git branches.**

| Feature | Branch Name | Base Branch |
|---------|-------------|-------------|
| Phase 1 Redesign | `feature/phase-1-redesign` | `master` |
| Live Canvas | `feature/live-canvas` | `master` |
| Step Mode | `feature/step-mode` | `master` |
| Unity Pipeline | `feature/unity-pipeline` | `master` |
| Android Pipeline | `feature/android-pipeline` | `master` |
| Analyzer v2 | `feature/analyzer-v2` | `master` |
| Feature Mode | `feature/feature-mode` | `master` |

**Workflow:**
```bash
# Create feature branch
git checkout -b feature/android-pipeline

# Develop and commit
git add .
git commit -m "feat(android): add phase commands"

# When complete, merge to master
git checkout master
git merge feature/android-pipeline
```

**Why branches:**
- Keeps `master` stable with working desktop pipeline
- Allows parallel development of multiple features
- Enables proper code review before merge
- Easy rollback if implementation has issues

---

### Step Mode Implementation (Pending)

**Status:** Design complete ([18-step-mode-spec.md](./18-step-mode-spec.md)), implementation pending

Step mode provides human-in-the-loop checkpoints. Partial implementation exists:
- ✅ Dashboard display (stepMode indicator, iteration history)
- ✅ Cascade analyzer (`lib/analyze-feedback-impact.js`)
- ❌ Orchestrator startup question (Question 4: Execution Mode)
- ❌ Checkpoint logic (sections 8.5-8.8)
- ❌ User commands (`continue`, `feedback`, `add`, `back`)
- ❌ Test report generation (`lib/generate-test-report.js`)

**Implementation tasks:**
1. Add Question 4 to orchestrator startup
2. Add sections 8.5-8.8 to orchestrator
3. Create `lib/generate-test-report.js`
4. Add step mode user commands to orchestrator

### Unity Pipeline Implementation (Pending)

**Status:** Design complete ([19-21](./19-unity-pipeline-overview.md)), MCP configuration fixed

Unity pipeline enables VR/AR/XR development with Meta Quest devices.

**Current status:**
- ✅ Unity MCP configuration fixed (`claude_desktop_config.json`)
- ✅ Architecture documentation (19-21)
- ❌ Meta MQDH MCP (needs MQDH 6.2.1+ installation)
- ❌ Unity phase commands (1-5)
- ❌ Unity worker base rules
- ❌ Unity test framework templates

**Implementation tasks:**
1. Install Meta Quest Developer Hub 6.2.1+
2. Configure Meta MQDH MCP in Claude
3. Create Unity-specific phase commands
4. Create Unity worker base rules
5. Test end-to-end with sample Unity XR project

### Android Pipeline Implementation (Pending)

**Status:** Design complete ([22-24](./22-android-pipeline-overview.md))

Android pipeline enables mobile app development using Tauri 2.0 (same codebase as desktop).

**Current status:**
- ✅ Architecture documentation (22-24)
- ❌ Android SDK/NDK environment setup
- ❌ Appium 2 testing setup
- ❌ Android phase commands (if different from desktop)
- ❌ Mobile worker base rules

**Implementation tasks:**
1. Install Android Studio and SDK components
2. Set environment variables (JAVA_HOME, ANDROID_HOME, NDK_HOME)
3. Add Rust Android targets
4. Test `tauri android dev` with sample project
5. Set up Appium 2 + WebdriverIO for mobile E2E
6. Determine if separate phase commands are needed

### Analyzer v2 Implementation (Pending)

**Status:** Design complete ([15-17](./15-analyzer-v2-design.md)), implementation pending

The analyzer system has been redesigned as an **outcome-based learning system**:

**Key Changes from v1:**
- **End-of-pipeline analysis** - Analyze once at pipeline completion (full context), not after each phase
- **User Likert ratings** - 1-5 scale feedback as ground truth (Overall, UI/Design, Navigation, Performance, Code Quality, Test Coverage, Functionality)
- **Feature extraction** - Extract metrics from transcripts (phase durations, pattern counts, violation flags)
- **Correlation learning** - Build dataset over time to learn which execution patterns lead to good/bad outcomes
- **Predictive insights** - After sufficient data (~50 runs), predict quality issues before they happen

**Learning Architecture:**
```
Pipeline Execution → Feature Extraction → Dataset Entry
                                               ↓
User Ratings → Rating Collection → Dataset Entry
                                               ↓
                              Learning Dataset (.jsonl)
                                               ↓
                              Correlation Analysis
                                               ↓
                              Predictive Insights
```

**New Skills:**
- Data Collection: `transcript-parser`, `feature-extractor`, `rating-collector`
- Analysis: `correlator`, `predictor`, `report-generator`
- Utility: `dataset-manager`, `insight-generator`

**Implementation tasks:**
1. Create `lib/analyzer/feature-extractor.cjs` - Extract metrics from transcripts
2. Create `lib/analyzer/rating-collector.cjs` - CLI interface for Likert ratings
3. Create `lib/analyzer/correlator.cjs` - Pearson/point-biserial correlation
4. Create `lib/analyzer/predictor.cjs` - Regression-based predictions
5. Create `.pipeline/learning-dataset.jsonl` schema and management
6. Integrate with orchestrator for end-of-pipeline analysis trigger
7. Create analyzer skills in `.claude/skills/analyzer/`

**Cold Start Requirements:**
- Minimum 10 pipeline runs for basic pattern detection
- 50+ runs for high-confidence correlations
- 100+ runs for reliable predictions

### Phase 1 Redesign Implementation (Pending)

**Status:** Design complete ([25-26](./25-phase-1-redesign.md)), implementation pending

Phase 1 (brainstorming) is being **removed from the pipeline** and made a **pre-pipeline skill**.

**Key Changes:**
- **Brainstorming is separate** - Not managed by orchestrator
- **Write immediately rule** - Ideas saved after EVERY discussion, not at todo completion
- **Live Canvas (experimental)** - Real-time visualization during brainstorming
- **Pipeline requires files** - Must have `docs/brainstorm-notes.md` and `docs/user-stories.md` to start

**Architecture:**
```
User runs /brainstorm skill → Interactive session with Live Canvas
                                    ↓
                            docs/brainstorm-notes.md
                            docs/user-stories.md
                                    ↓
User runs /orchestrator → Validates files exist → Starts Phase 2
```

**Implementation tasks:**
1. Create `/brainstorm` skill with write-immediately rule
2. Update orchestrator to require brainstorm files (skip Phase 1)
3. Configure MCP servers: `claude-mermaid` + `mcp-obsidian` (or custom `live-canvas-mcp`)
4. Create Live Viewer web app (optional, for full Live Canvas)
5. Update documentation (deprecate Phase 1 commands)

**MCP Options (use existing or build custom):**
| Function | Existing MCP | Custom |
|----------|-------------|--------|
| Notes | `mcp-obsidian` | `live-canvas-mcp` |
| Diagrams | `claude-mermaid` | integrated |
| Canvas | `mcp_excalidraw` | integrated |

### Known Issues

| Issue | Location | Description |
|-------|----------|-------------|
| Incomplete transcript data | [07-supervisor-behavior.md](./07-supervisor-behavior.md), [15-analyzer-v2-design.md](./15-analyzer-v2-design.md) | Supervisor and analyzer don't receive worker's reasoning between tool calls - only tool_call and tool_result events |
| Skills not auto-triggered | [14-mandatory-standards.md](./14-mandatory-standards.md) | Skills trigger on USER MESSAGES only; autonomous workers must explicitly invoke skills |
