# Parallel Analysis Worker Design

**Date:** 2025-12-13
**Status:** Draft
**Author:** Brainstorming session

---

## Overview

Add a parallel analysis worker that spawns alongside cost analysis when a phase or epic completes. The analysis worker reads the worker transcript line-by-line to identify execution patterns (retries, struggles, clean wins) and produces a markdown report with per-todo breakdowns.

Additionally, redesign the dashboard navigation from key-based expansion (1-5, A-I) to arrow-key navigation with Enter to expand/collapse, enabling deeper nesting for analysis summaries.

---

## Part 1: Analysis Worker

### Trigger
- Phase or epic status changes to `'complete'` in manifest
- Detected by existing manifest watch in dashboard-v2.cjs

### Spawn
- Uses `spawn-worker.ps1` with analysis-specific command
- **Visible window** for now (debugging/verification)
- Runs parallel to existing cost analysis
- Does NOT block pipeline progression

### Model
- Same model as pipeline configuration (Opus/Sonnet)

### Input
- Worker transcript path: `~/.claude/projects/<encoded-path>/<sessionId>.jsonl`
- Phase/epic number and metadata from manifest

### Process
1. Read transcript JSONL line by line
2. Track tool calls per todo (using TodoWrite timestamps as boundaries)
3. Identify patterns:
   - **Retries** - Same tool called multiple times on same file
   - **Errors** - Tool call failures, error messages
   - **Loops** - Repeated sequences of actions
   - **Clean executions** - One-shot successes
   - **Backtracking** - Undoing or reverting changes
4. Calculate metrics per todo:
   - Tool call count
   - Retry count
   - Error count
   - Recovery time
5. Generate summary sentences for each todo

### Output
- Markdown file: `.pipeline/analysis/phase-N-analysis.md` or `epic-N-analysis.md`
- Manifest update with structured summary data

---

## Part 2: Markdown Report Structure

**File location:** `.pipeline/analysis/phase-N-analysis.md`

```markdown
# Phase N: [Name] - Execution Analysis

## Summary
| Metric | Value |
|--------|-------|
| Total tool calls | 23 |
| Retries | 6 (26%) |
| Errors encountered | 3 |
| Clean tasks | 1/3 |
| Struggled tasks | 1/3 |

## Todo Breakdown

### 1. [Todo content]
**Health:** ✓ Clean | ⚠ Minor friction | ✗ Struggled
**Tool calls:** N | **Retries:** N | **Duration:** Xm Ys

> [1-2 sentence summary for dashboard display]

[Detailed tool call sequence and observations...]

---

### 2. [Todo content]
...
```

### Health Classification
- **✓ Clean** - No retries, no errors, smooth execution
- **⚠ Minor friction** - 1-2 retries, quickly resolved
- **✗ Struggled** - 3+ retries, loops, significant time spent recovering

---

## Part 3: Dashboard Navigation Redesign

### Current (to be replaced)
- Press 1-5 to expand phases
- Press A-I to expand epics
- No deeper nesting possible

### New Navigation
| Key | Action |
|-----|--------|
| ↑ | Move cursor up |
| ↓ | Move cursor down |
| Enter | Toggle expand/collapse |
| Q | Quit |
| P | Toggle pricing mode |

### Visual Design

```
PHASES
    > ✓ 1. Brainstorm                    5m 12s   0.6M   $1.10
      ✓ 2. Technical                     8m 45s   1.1M   $2.34
    ▼ ✓ 3. Bootstrap                    10m 32s   1.2M   $2.45
          ▶ Set up project structure     2m 15s   0.3M   $0.52
          ▼ Create React components      4m 20s   0.5M   $1.10
              Minor friction. 2 Edit retries on App.tsx fixing
              TypeScript errors. Resolved quickly.
          ▶ Configure Tauri backend      3m 57s   0.4M   $0.83
      ○ 4. Implement                        --      --      --
      ○ 5. Finalize                         --      --      --

EPICS
    > ▶ A. Core UI                          --      --      --
      ○ B. Data Layer                       --      --      --

TOTALS
      ▶ Workers                         24m 39s   2.9M   $5.89
      ▶ Supervisor                       3m 12s   0.4M   $0.95
```

### Symbols
- `>` - Cursor position
- `▶` - Collapsed (has children)
- `▼` - Expanded
- `✓` - Complete
- `○` - Pending
- `▶` - Running (yellow)

### Expand Hierarchy
1. **Phase/Epic** → Shows todos
2. **Todo** → Shows analysis summary (1-2 sentences from markdown)
3. **Totals section** → Shows per-run breakdown

### Navigation Scope
Applies to ALL sections:
- Phases
- Epics
- Worker Progress
- Totals

---

## Part 4: Integration Flow

### On Phase/Epic Completion

```
1. Dashboard detects status → 'complete' (existing watcher)

2. Cost analysis (existing):
   - analyzeTranscript() extracts tokens/cost
   - Store in manifest.phases[N]

3. Spawn analysis worker (NEW):
   - spawn-worker.ps1 with /analyze-worker-transcript command
   - Pass: sessionId, phase number, transcript path
   - Visible window for debugging

4. Analysis worker executes:
   - Reads transcript JSONL
   - Processes tool calls per todo
   - Writes .pipeline/analysis/phase-N-analysis.md
   - Updates manifest:
     manifest.phases[N].analysis = {
       status: 'complete',
       file: '.pipeline/analysis/phase-N-analysis.md',
       summary: { clean: 1, struggled: 1, retries: 6 },
       todoSummaries: [
         { content: "Set up project...", summary: "Clean execution. 3 tool calls, no retries." },
         { content: "Create React...", summary: "Minor friction. 2 Edit retries on App.tsx." }
       ]
     }

5. Dashboard renders analysis when available:
   - On next refresh, picks up analysis data from manifest
   - Shows todoSummaries when user expands a todo

6. Pipeline continues independently (no blocking)
```

### Analysis Indicators
- While analysis running: `◌` spinner next to phase
- Analysis complete: Data available on expand (no special indicator)
- Analysis failed: `?` indicator

### New Slash Command
`/analyze-worker-transcript`
- Input: sessionId, phase/epic number
- Reads transcript from standard location
- Outputs markdown report
- Updates manifest with summary

---

## Implementation Tasks

### Phase A: Analysis Worker
1. Create `/analyze-worker-transcript` slash command
2. Implement transcript parsing logic (identify tool calls per todo)
3. Implement pattern detection (retries, errors, loops)
4. Generate markdown report
5. Update manifest with analysis summary

### Phase B: Dashboard Spawn Integration
1. Add analysis worker spawn on phase/epic completion
2. Position analysis window (bottom-right, smaller)
3. Add analysis status indicator while running

### Phase C: Dashboard Navigation Redesign
1. Replace key-based expansion with cursor navigation
2. Implement arrow key handlers
3. Implement Enter toggle
4. Track cursor position across sections
5. Implement nested expansion (phase → todo → analysis)
6. Render analysis summaries from manifest.todoSummaries

### Phase D: Polish
1. Add `--background` option for analysis worker
2. Handle edge cases (missing transcript, failed analysis)
3. Test with various transcript sizes

---

## Future Enhancements

- **Background mode** - Hide analysis worker window once proven reliable
- **Pattern database** - Aggregate patterns across runs to identify recurring issues
- **Suggestions** - Use analysis to suggest improvements for next phases
- **Cost optimization** - Analyze token usage patterns to reduce costs

---

## Files Affected

| File | Changes |
|------|---------|
| `~/.claude/commands/analyze-worker-transcript.md` | New slash command |
| `lib/dashboard-v2.cjs` | Navigation redesign, analysis spawn, manifest reading |
| `lib/spawn-worker.ps1` | May need analysis-specific positioning |
| `.pipeline/manifest.json` | New `analysis` field per phase/epic |
| `.pipeline/analysis/*.md` | New analysis reports |
