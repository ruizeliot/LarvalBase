# Analysis Pipeline Documentation

**Version:** 1.0
**Date:** 2025-11-27
**Status:** Tested and Working

---

## Overview

The Analysis Pipeline is a 3-phase system that analyzes completed pipeline runs, identifies improvement opportunities, validates them, and applies validated improvements to pipeline commands.

```
Phase A: Extract & Diagnose
        ↓
Phase B: Test Improvements
        ↓
Phase C: Validate & Apply
```

---

## Quick Start

### Run Full Analysis
```bash
# Analyze latest run
./run-analyze-pipeline.sh /path/to/project

# Analyze specific run
./run-analyze-pipeline.sh /path/to/project 20251124-092509

# Run single phase only
./run-analyze-pipeline.sh /path/to/project --phase A --verbose
```

### Using the Unified CLI
```bash
# Start analysis (runs Phase A)
./pipeline analyze /path/to/project

# Check status
./pipeline status /path/to/project
```

---

## Architecture

### Components

| Component | Purpose |
|-----------|---------|
| `run-analyze-pipeline.sh` | Main runner, orchestrates A→B→C phases |
| `lib/init-analysis-manifest.sh` | Creates analysis manifest |
| `lib/analyze-run.sh` | Core analysis logic |
| `~/.claude/commands/analyze-phase-*.md` | Slash commands for each phase |

### Signal-Based Completion

Each phase signals completion via touch file:

```bash
touch "$PROJECT_PATH/.pipeline/.signal-analysis-{A|B|C}-complete"
```

The runner monitors for these files to detect phase completion.

### tmux Session Management

Each phase runs in a dedicated tmux session:
- `analysis-<project>-A` for Phase A
- `analysis-<project>-B` for Phase B
- `analysis-<project>-C` for Phase C

---

## Phase Details

### Phase A: Initial Analysis

**Purpose:** Extract metrics, diagnose issues, queue improvement tests

**Steps:**
1. Find JSONL session files using `lib/find-session.sh`
2. Extract TodoWrite events from JSONL
3. Calculate per-todo metrics (duration, retries, errors)
4. Calculate per-phase aggregates
5. Load global patterns from `~/.pipeline/analysis-archive/patterns.json`
6. AI diagnosis to identify bottlenecks, quality issues, anti-patterns
7. Queue improvement tests
8. Generate Phase A report
9. Signal completion

**Outputs:**
- `$RUN_DIR/analysis/phase-a-report.md`
- `$RUN_DIR/analysis/pending-tests.json`
- Updated analysis manifest

**Signal:** `touch "$PROJECT_PATH/.pipeline/.signal-analysis-A-complete"`

### Phase B: Improvement Testing

**Purpose:** Run queued improvement tests in isolation

**Steps:**
1. Load pending tests from Phase A
2. For each test:
   - Create test branch
   - Apply improvement diff
   - Run target phase
   - Extract test metrics
   - Record results
   - Cleanup branch
3. Update manifest with test results
4. Signal completion

**Outputs:**
- `$RUN_DIR/analysis/test-results/<test_id>.json`
- Updated manifest with `testResults[]`

**Signal:** `touch "$PROJECT_PATH/.pipeline/.signal-analysis-B-complete"`

### Phase C: Validation & Apply

**Purpose:** Validate improvements, apply to pipeline, version bump

**Steps:**
1. Load original metrics from Phase A
2. Load test results from Phase B
3. Compare and validate (VALIDATED, REJECTED, INCONCLUSIVE)
4. Update global patterns database
5. Apply validated improvements (confidence >= 0.7)
6. Run pipeline tests (`./tests/run-tests.sh`)
7. Bump version if changes applied
8. Generate final report
9. Commit changes
10. Signal completion

**Outputs:**
- `$RUN_DIR/analysis/final-report.md`
- Updated pattern files in `~/.pipeline/analysis-archive/patterns/`
- Modified command files
- Version bump

**Signal:** `touch "$PROJECT_PATH/.pipeline/.signal-analysis-C-complete"`

---

## File Locations

### Analysis Manifest
```
$PROJECT_PATH/.pipeline/runs/<run_id>/analysis/analysis-manifest.json
```

**Schema:**
```json
{
  "analysisId": "analysis-20251127-145710",
  "projectPath": "/path/to/project",
  "runId": "20251124-092509",
  "status": "pending|running|complete",
  "currentPhase": "A|B|C",
  "phases": {
    "A": { "status": "pending|running|complete", "startedAt": "", "completedAt": "" },
    "B": { "status": "pending|running|complete", "startedAt": "", "completedAt": "" },
    "C": { "status": "pending|running|complete", "startedAt": "", "completedAt": "" }
  },
  "pendingTests": [],
  "testResults": []
}
```

### Signal Files
```
$PROJECT_PATH/.pipeline/.signal-analysis-A-complete
$PROJECT_PATH/.pipeline/.signal-analysis-B-complete
$PROJECT_PATH/.pipeline/.signal-analysis-C-complete
```

### Global Patterns Database
```
~/.pipeline/analysis-archive/patterns.json
~/.pipeline/analysis-archive/patterns/<pattern_id>.json
```

---

## Example Run

### 1. Start Analysis
```bash
./run-analyze-pipeline.sh /home/claude/IMT/PipelineV3WebGUI --verbose
```

### 2. Monitor Progress
```bash
# Check tmux session
tmux attach -t analysis-PipelineV3WebGUI-A

# Or check manifest
jq '.phases' $PROJECT/.pipeline/runs/*/analysis/analysis-manifest.json
```

### 3. Review Results

**Phase A Report:** `$RUN_DIR/analysis/phase-a-report.md`
```markdown
# Phase A Analysis Report

## Overview
- Run ID: 20251124-092509
- Steps Analyzed: 5
- Total Todos: 125

## Metrics Summary
| Phase | Todos | Avg Duration | Bottlenecks |
|-------|-------|--------------|-------------|
| 2     | 45    | 180s         | Auth (900s) |

## Issues Identified
1. [BOTTLENECK] Auth implementation took 15 minutes
2. [QUALITY] Missing tests for WebSocket module

## Improvement Tests Queued
- Test 1: Add auth module template (confidence: 70%)
```

**Final Report:** `$RUN_DIR/analysis/final-report.md`

Shows:
- Improvements tested and validated
- Changes applied to pipeline commands
- Version bump (e.g., 5.2.22 → 5.2.23)
- Test results (57/57 pass)

---

## Validation Logic

### Verdict Criteria

| Verdict | Condition |
|---------|-----------|
| VALIDATED | Improvement meets/exceeds expected benefit |
| REJECTED | No improvement or worse performance |
| INCONCLUSIVE | Mixed results, needs more data |

### Confidence Thresholds

| Confidence | Action |
|------------|--------|
| >= 0.7 | Auto-apply improvement |
| 0.5 - 0.7 | Queue for human review |
| < 0.5 | Don't apply |

---

## Pattern Database Updates

### On VALIDATED:
```bash
jq '.patterns["<id>"].confidence += 0.1 |
    .patterns["<id>"].evidence += ["validated in run <run_id>"]' \
    ~/.pipeline/analysis-archive/patterns.json
```

### On REJECTED:
```bash
jq '.patterns["<id>"].warnings += ["rejected in run <run_id>: <reason>"]' \
    ~/.pipeline/analysis-archive/patterns.json
```

---

## Troubleshooting

### Phase Not Completing

1. Check tmux session:
   ```bash
   tmux attach -t analysis-<project>-<phase>
   ```

2. Check for signal file:
   ```bash
   ls -la $PROJECT/.pipeline/.signal-*
   ```

3. Check manifest status:
   ```bash
   jq '.phases' $PROJECT/.pipeline/runs/*/analysis/analysis-manifest.json
   ```

### Test Failures

If pipeline tests fail after applying improvements:
1. Changes are rolled back
2. Improvements marked as `failed_tests`
3. Phase C continues with next improvement

### Reset Analysis

To restart analysis from scratch:
```bash
rm -rf $PROJECT/.pipeline/runs/<run_id>/analysis/
rm -f $PROJECT/.pipeline/.signal-analysis-*
```

---

## Example Results (PipelineV3WebGUI)

**Analysis ID:** analysis-20251127-145710

### Summary
- **4 improvements tested** (3 APPROVED, 1 CONDITIONAL)
- **4 improvements applied** (3 full, 1 simplified)
- **4 command files updated** (0b, 1, 2, 3)
- **57/57 tests pass**
- **Version:** 5.2.22 → 5.2.23

### Applied Improvements

| ID | Pattern | Confidence | Expected Impact |
|----|---------|------------|-----------------|
| test-001 | Manifest Reading | 85% | 60% duration reduction |
| test-002 | Phase Markers | 100% | 100% detection rate |
| test-003 | TDD Requirement | 90% | 350% test coverage |
| test-004 | Break Down Tasks | 70% | 40-45% duration reduction |

### Total Analysis Time
- Phase A: 8 minutes
- Phase B: 5 minutes
- Phase C: 18 minutes
- **Total: 48 minutes**

---

## Related Documentation

- [Pipeline Specification](./v4-pipeline-specification.md)
- [Phase A Command](~/.claude/commands/analyze-phase-a.md)
- [Phase B Command](~/.claude/commands/analyze-phase-b.md)
- [Phase C Command](~/.claude/commands/analyze-phase-c.md)

---

**Last Updated:** 2025-11-27
