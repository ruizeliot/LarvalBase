# Analysis System v6 Design

**Date:** 2025-11-27
**Status:** Draft
**Authors:** CEO + Claude

---

## Overview

Redesign of the pipeline analysis system focusing on two core metrics: **Quality** and **Speed**. The system uses a two-layer approach with automatic metrics extraction and intelligent AI review, plus improvement testing in isolation before applying changes.

---

## Core Principles

1. **Quality + Speed** - Only two metrics matter (cost removed)
2. **Todo-level granularity** - Analyze at the atomic task level
3. **Cross-run patterns** - Build confidence from multiple runs
4. **Test before apply** - Validate improvements in isolation
5. **Phase isolation** - Changes stay confined to their phase, outputs stay stable

---

## Architecture

### Layer 1: Automatic Metrics (Fast, No AI)

Extracts quantitative data from JSONL transcripts using TodoWrite events as span boundaries.

**Per-Todo Metrics:**

| Metric | Source | Purpose |
|--------|--------|---------|
| `duration_seconds` | Timestamps between in_progress → completed | Speed |
| `retry_count` | Status changes back to in_progress | Struggles |
| `tool_calls` | Count of tool invocations | Efficiency |
| `tools_used` | Breakdown by tool type | Pattern detection |
| `errors` | Failed tool calls | Quality issues |
| `stall_events` | Nudges sent by monitor | Comprehension issues |

**Per-Phase Metrics:**

| Metric | Calculation |
|--------|-------------|
| `total_duration` | Sum of all todo durations |
| `quality_score` | From step-metrics.json weights |
| `bottleneck_todo` | Todo with highest duration % |
| `retry_total` | Sum of all retries |

### Layer 2: AI Review (Intelligent Diagnosis)

Takes Layer 1 data and reasons about patterns, root causes, and improvements.

**Output Structure:**

```json
{
  "phase": "2",
  "diagnosis": [
    {
      "issue": "Fix failing tests took 50% of time with 8 retries",
      "root_cause": "AI attempted fixes without analyzing error patterns first",
      "impact": "high",
      "suggested_fix": {
        "target": "2-pipeline-implementEpic-v5.2.md",
        "change": "Add 'Analyze error output before attempting fix' to test-fix loop",
        "diff": "..."
      },
      "confidence": "high",
      "confidence_reason": "Pattern seen in 3+ runs, clear correlation"
    }
  ]
}
```

**Confidence Levels:**

| Level | Criteria | Action |
|-------|----------|--------|
| High | 3+ runs, clear cause, validated | Auto-apply candidate |
| Medium | 2 runs, probable cause | Human review |
| Low | Single occurrence, unclear | Log only, watch |

---

## Todo Span Extraction

Uses TodoWrite events as boundaries to attribute activity to specific todos.

**Algorithm:**

1. Parse all TodoWrite calls from JSONL
2. Diff consecutive states to detect status changes
3. Create spans:
   - `start_time` = when todo became `in_progress`
   - `end_time` = when todo became `completed`
4. Attribute tool calls by timestamp falling within span

**Edge Cases:**

| Situation | Handling |
|-----------|----------|
| Activity before first todo | "setup" category |
| Activity after last todo | "cleanup" category |
| Multiple todos in_progress | Split by proportion or assign to first |
| TodoWrite not used | Fall back to phase-level metrics only |

**Output:**

```json
{
  "phase": "2",
  "todos": [
    {
      "content": "Implement user authentication API",
      "span": {
        "start": "2025-11-27T10:00:00Z",
        "end": "2025-11-27T10:12:30Z",
        "duration_seconds": 750
      },
      "activity": {
        "tool_calls": 23,
        "tools_used": {"Edit": 8, "Read": 6, "Bash": 9},
        "retries": 2,
        "errors": 1
      },
      "status": "completed"
    }
  ]
}
```

---

## Global Pattern Database

Cross-run pattern detection stored globally (not per-project).

**Location:** `~/.pipeline/analysis-archive/`

**Structure:**

```
~/.pipeline/analysis-archive/
├── runs/
│   ├── 2025-11-25-project-a-run-001.json
│   ├── 2025-11-26-project-a-run-002.json
│   └── 2025-11-27-project-b-run-001.json
└── patterns/
    ├── issue-test-fix-loop-slow.json
    ├── issue-deploy-retry.json
    └── issue-auth-implementation.json
```

**Pattern File:**

```json
{
  "pattern_id": "test-fix-loop-slow",
  "description": "AI spends >40% time in test fix loop",
  "occurrences": [
    {"run": "2025-11-25-project-a", "phase": "2", "duration_pct": 52},
    {"run": "2025-11-26-project-a", "phase": "2", "duration_pct": 48},
    {"run": "2025-11-27-project-b", "phase": "2", "duration_pct": 45}
  ],
  "frequency": 3,
  "suggested_fix": "Add error analysis step before fix attempts",
  "confidence": "high",
  "status": "pending_validation"
}
```

---

## Manifest Enhancement

Store git commit hash for each phase completion.

```json
{
  "phases": {
    "0a": {"status": "complete", "commit": "abc123"},
    "0b": {"status": "complete", "commit": "def456"},
    "1": {"status": "complete", "commit": "ghi789"},
    "2": {
      "status": "complete",
      "loops": [
        {"epic": 1, "status": "complete", "commit": "jkl012"},
        {"epic": 2, "status": "complete", "commit": "mno345"}
      ]
    },
    "3": {"status": "complete", "commit": "pqr678"}
  }
}
```

**Purpose:** Enables restoration of exact state for improvement testing.

---

## Improvement Testing

Test improvements in isolation before applying to pipeline.

**Flow:**

1. Checkout git commit (state BEFORE target phase)
2. Create test branch
3. Apply improvement to command file
4. Run target phase only
5. Extract metrics (Layer 1)
6. Compare vs original run
7. Validate or reject
8. Cleanup (delete test branch)

**Validation Criteria:**

| Result | Criteria |
|--------|----------|
| VALIDATED | Target todo improved AND phase score stable or better |
| REJECTED | Phase score dropped (regression) |
| INCONCLUSIVE | Mixed results, needs more data |

---

## Full Analysis Flow

### Phase A: Initial Analysis (Immediate)

| Step | Action |
|------|--------|
| 1 | Parse arguments, find run ID |
| 2 | Create analysis directory |
| 3 | Find JSONL sessions for all phases |
| 4 | Convert sessions to transcripts, detect step types |
| 5 | Extract todo spans (TodoWrite parsing) |
| 6 | Calculate per-todo metrics |
| 7 | Calculate per-phase metrics |
| 8 | Load global patterns from archive |
| 9 | Layer 2 AI diagnosis |
| 10 | Queue improvement tests |
| 11 | Update global patterns (observations only) |
| 12 | Generate initial report |

**Output:** `ANALYSIS:PHASE-A-COMPLETE`

### Phase B: Improvement Testing (Queued)

For each pending test:

| Step | Action |
|------|--------|
| B1 | Checkout git commit (state before target phase) |
| B2 | Create test branch |
| B3 | Apply improvement to command file |
| B4 | Run target phase only |
| B5 | Extract todo spans + metrics |
| B6 | Save test run results |
| B7 | Cleanup |

**Output:** `ANALYSIS:PHASE-B-COMPLETE`

### Phase C: Re-Analysis & Validation

| Step | Action |
|------|--------|
| C1 | Load original run metrics |
| C2 | Load all test run metrics |
| C3 | Layer 2 AI comparison (original vs test) |
| C4 | Update global patterns (validated/rejected) |
| C5 | Apply validated improvements |
| C6 | Run pipeline tests, rollback if fails |
| C7 | Bump version, commit changes |
| C8 | Generate final report |

**Output:** `ANALYSIS:COMPLETE`

---

## Output Files

| # | Filename | Description |
|---|----------|-------------|
| 1 | `01-sessions-found.json` | JSONL sessions discovered |
| 2 | `02-todo-spans.json` | All todos with spans and metrics |
| 3 | `03-phase-metrics.json` | Per-phase aggregate metrics |
| 4 | `04-diagnosis.json` | Layer 2 AI analysis |
| 5 | `05-pending-tests.json` | Queued improvement tests |
| 6 | `06-test-results.json` | Results from Phase B |
| 7 | `07-validation.json` | Layer 2 comparison results |
| 8 | `08-patterns-updated.json` | Global pattern changes |
| 9 | `09-improvements-applied.json` | What was applied to pipeline |
| 10 | `10-final-report.md` | Human-readable summary |

---

## Problem Detection

**What Layer 2 identifies:**

| Problem Type | Indicators | Fix Direction |
|--------------|------------|---------------|
| Useless todo | Always fast, no impact | Remove from checklist |
| Slow todo | High duration, good output | Optimize or parallelize |
| Bad quality todo | Fast but poor output | Rewrite instructions |
| AI struggled | High retries, stalls | Improve prompt/context |

---

## Implementation Notes

### Phase Isolation

- Changes stay confined to phase internals
- Phase outputs must remain compatible with next phase inputs
- Output contracts defined in `step-metrics.json`

### Confidence Building

```
confidence = f(frequency, consistency, clarity)

frequency: seen in how many runs?
consistency: same root cause each time?
clarity: is the fix obvious?
```

| Runs | Confidence |
|------|------------|
| 1 | Low |
| 2 | Medium |
| 3+ | High |

### Git Integration

- Each phase completion = git commit
- Manifest stores commit hashes
- Improvement testing uses checkout to restore state
- Test branches cleaned up after validation

---

## Future Considerations

1. **Parallel phase testing** - Test multiple improvements concurrently
2. **A/B staged rollout** - Some runs with improvement, some without
3. **Contract validation** - Formal input/output schemas per phase
4. **Dashboard** - Visual pattern trends over time

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| Draft | 2025-11-27 | Initial design from brainstorming session |
