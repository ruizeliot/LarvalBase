# Analyzer v2: Multi-Level Analysis with Skill Gap Detection

**Version:** v11
**Created:** 2026-01-12
**Status:** Design Draft

---

## Overview

The Analyzer v2 provides intelligent post-execution analysis of worker behavior, detecting skill gaps and recommending improvements at multiple levels.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ANALYZER V2 ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────────────┘

        ┌─────────────────────────────────────────────────────────────┐
        │                    TRANSCRIPT INPUT                          │
        │   (.jsonl files with tool_call and tool_result events)      │
        └─────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────────────┐
        │                   MULTI-LEVEL ANALYSIS                       │
        │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
        │  │  Todo Level │─▶│ Phase Level │─▶│Pipeline Level│          │
        │  │  (Granular) │  │ (Aggregate) │  │  (Holistic)  │          │
        │  └─────────────┘  └─────────────┘  └─────────────┘          │
        └─────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────────────┐
        │                   SKILL GAP DETECTION                        │
        │  ┌───────────────┐  ┌────────────────┐  ┌────────────────┐  │
        │  │Pattern Matcher│─▶│Skill Recommender│─▶│Skill Researcher│  │
        │  │ (What failed) │  │(Which skill?)   │  │ (WebSearch)    │  │
        │  └───────────────┘  └────────────────┘  └────────────────┘  │
        └─────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────────────┐
        │                        OUTPUT                                │
        │  • Markdown Analysis Report                                  │
        │  • Manifest Updates (phaseAnalysis)                         │
        │  • Skill Recommendations                                     │
        │  • Phase Design Improvements                                 │
        └─────────────────────────────────────────────────────────────┘
```

---

## Known Limitation: Transcript Content

**CRITICAL:** The analyzer only receives `tool_call` and `tool_result` events from transcripts. It does NOT receive:

- Assistant thinking/reasoning between tool calls
- The actual text of assistant messages
- Error messages in assistant reasoning

This is the same limitation as the supervisor. The analyzer must infer worker struggles from:
- Tool retry patterns (same tool, same file, multiple times)
- Error keywords in tool results
- Time gaps between tool calls
- Todo status progression patterns

---

## 1. Multi-Level Analysis Strategy

### Level 1: Todo Analysis

Each todo is analyzed individually for micro-patterns.

| Metric | What It Detects | Threshold |
|--------|-----------------|-----------|
| **Duration** | How long todo took | > 10 min = slow |
| **Retry Count** | Same tool on same target | > 2 = struggling |
| **Error Rate** | Tool results with errors | > 30% = problem |
| **Tool Diversity** | Different tools used | Low = stuck pattern |
| **Edit Density** | Edits per minute | High = churn |

**Pattern Detection (Todo Level):**

```javascript
const todoPatterns = {
  // Repeated file edits suggest struggle
  editChurn: {
    detect: (span) => span.toolCounts.Edit > 5 && span.duration < 300000,
    severity: 'minor',
    skillHint: 'systematic-debugging'
  },

  // Same search pattern repeated
  searchLoop: {
    detect: (span) => countRepeatedGrepPatterns(span) > 3,
    severity: 'minor',
    skillHint: 'root-cause-tracing'
  },

  // WebSearch absence during errors
  noResearch: {
    detect: (span) => span.errors.length > 2 && span.toolCounts.WebSearch === 0,
    severity: 'major',
    skillHint: 'systematic-debugging'  // Rule: WebSearch before claiming limitation
  },

  // E2E test failures
  e2eStruggle: {
    detect: (span) => hasE2EFailures(span) && span.toolCounts.Bash > 10,
    severity: 'major',
    skillHint: 'e2e-rapid-fix'
  }
};
```

### Level 2: Phase Analysis

Aggregate todo metrics into phase-level insights.

| Metric | What It Detects | Threshold |
|--------|-----------------|-----------|
| **Total Duration** | Phase completion time | vs. expected (effort%) |
| **Stuck Todos** | Todos that took disproportionate time | > 40% of phase time |
| **Pattern Frequency** | How often patterns repeat | > 3 across todos |
| **Skill Invocations** | Were required skills invoked? | Check against phase doc |
| **Regression Count** | Tests that broke after passing | > 0 = concern |

**Phase-Level Patterns:**

```javascript
const phasePatterns = {
  // No skill invocations detected
  skillsNotInvoked: {
    detect: (phase) => {
      const expectedSkills = getExpectedSkills(phase.number);
      const invokedSkills = getInvokedSkills(phase.transcript);
      return expectedSkills.filter(s => !invokedSkills.includes(s));
    },
    severity: 'major',
    recommendation: 'Phase docs specify required skills - ensure worker invokes them'
  },

  // Test-related todos took most time
  testingBottleneck: {
    detect: (phase) => {
      const testTodos = phase.todos.filter(t => t.content.includes('test'));
      const testTime = sum(testTodos.map(t => t.duration));
      return testTime > phase.totalDuration * 0.6;
    },
    severity: 'moderate',
    skillHint: 'test-driven-development'
  },

  // Phase required restart
  phaseRestart: {
    detect: (phase) => phase.attempts > 1,
    severity: 'major',
    recommendation: 'Analyze what caused restart - improve phase design'
  }
};
```

### Level 3: Pipeline Analysis

Cross-phase patterns and holistic view.

| Metric | What It Detects | Threshold |
|--------|-----------------|-----------|
| **Cross-Phase Patterns** | Same struggle in multiple phases | > 2 phases |
| **Skill Gaps** | Missing skills across pipeline | Consistent absence |
| **Cost Distribution** | Which phase used most tokens | vs. expected |
| **Cascade Points** | Where issues propagated | Phase N -> N+1 |
| **Success Rate** | Phases completed without restart | < 80% = concern |

**Pipeline-Level Patterns:**

```javascript
const pipelinePatterns = {
  // Same skill gap across phases
  persistentSkillGap: {
    detect: (pipeline) => {
      const gaps = pipeline.phases.map(p => p.missingSkills);
      return findCommonElements(gaps);
    },
    severity: 'critical',
    recommendation: 'Worker consistently missing skill - add to CLAUDE.md or training'
  },

  // Phase 4 consumes most budget
  implementationHeavy: {
    detect: (pipeline) => pipeline.phases[3].cost > pipeline.totalCost * 0.6,
    severity: 'moderate',
    recommendation: 'Consider: Phase 2/3 specs may be insufficient'
  },

  // Stories changed during implementation
  specDrift: {
    detect: (pipeline) => {
      return pipeline.phases[3].todoLogs.some(t =>
        t.toolCalls.find(c => c.tool === 'Edit' && c.path.includes('user-stories.md'))
      );
    },
    severity: 'critical',
    recommendation: 'VIOLATION: Worker modified specs during Phase 4'
  }
};
```

---

## 2. Skill Gap Detection Mechanism

### Pattern-to-Skill Mapping

When the analyzer detects struggle patterns, it maps them to skills that could help.

```javascript
const patternToSkillMapping = {
  // Debugging patterns
  'repeated_same_error': ['systematic-debugging', 'root-cause-tracing'],
  'no_websearch_during_error': ['systematic-debugging'],  // Rule 1 violation
  'multiple_fix_attempts': ['systematic-debugging'],      // Phase 4 rule

  // Testing patterns
  'e2e_test_failures': ['e2e-rapid-fix', 'running-e2e-tests'],
  'flaky_test_detected': ['flaky-test-detector'],
  'test_timeout': ['condition-based-waiting'],

  // Implementation patterns
  'tauri_api_errors': ['tauri'],
  'react_component_issues': ['react-component-generator'],
  'styling_churn': ['tailwind-class-optimizer'],

  // Quality patterns
  'empty_handler_detected': ['verification-before-completion'],
  'mock_usage_detected': ['test-driven-development'],  // No-mock rule

  // Performance patterns
  'slow_operation': ['bottleneck-identifier'],
  'memory_issues': ['response-time-analyzer']
};
```

### Detection Heuristics

```javascript
function detectSkillGap(todoSpan) {
  const gaps = [];

  // Heuristic 1: Error keywords in tool results
  const errorKeywords = extractErrorKeywords(todoSpan.toolResults);
  if (errorKeywords.includes('WebdriverIO') || errorKeywords.includes('wdio')) {
    gaps.push({ skill: 'e2e-rapid-fix', confidence: 0.9 });
  }
  if (errorKeywords.includes('invoke') || errorKeywords.includes('tauri')) {
    gaps.push({ skill: 'tauri', confidence: 0.85 });
  }

  // Heuristic 2: Repeated tool patterns
  const editPattern = findRepeatedEdits(todoSpan);
  if (editPattern.count > 5 && editPattern.sameFile) {
    gaps.push({ skill: 'systematic-debugging', confidence: 0.8 });
  }

  // Heuristic 3: Missing expected actions
  if (todoSpan.errors.length > 0 && !todoSpan.hasWebSearch) {
    gaps.push({
      skill: 'systematic-debugging',
      confidence: 0.95,
      reason: 'No WebSearch during errors (Rule 1 violation)'
    });
  }

  // Heuristic 4: Time anomaly
  const expectedDuration = todoSpan.effort * phaseExpectedTime;
  if (todoSpan.duration > expectedDuration * 2) {
    gaps.push({ skill: 'unknown', confidence: 0.5, needsResearch: true });
  }

  return gaps;
}
```

---

## 3. Skill Research Capability

When the analyzer detects a gap but can't map it to a known skill, it can research.

### Research Triggers

```javascript
const researchTriggers = [
  // Unknown error patterns
  { condition: 'error_not_in_mapping', action: 'search_error_message' },

  // New technology mentioned
  { condition: 'unfamiliar_api_in_errors', action: 'search_api_documentation' },

  // Persistent struggle with no skill match
  { condition: 'high_confidence_gap_no_match', action: 'search_for_skill' }
];
```

### Research Queries

```javascript
function generateResearchQueries(gap) {
  const queries = [];

  if (gap.errorMessage) {
    // Exact error search
    queries.push(`"${gap.errorMessage.substring(0, 100)}"`);
  }

  if (gap.technology) {
    // Best practices search
    queries.push(`${gap.technology} best practices 2025`);
    queries.push(`${gap.technology} common mistakes debugging`);
  }

  if (gap.taskType) {
    // Skill search
    queries.push(`Claude Code skill ${gap.taskType}`);
    queries.push(`AI coding assistant ${gap.taskType} technique`);
  }

  return queries;
}
```

---

## 4. Analyzer's Own Skills

The analyzer should have access to specific skills to help with analysis.

### Required Analyzer Skills

| Skill | Purpose | When Used |
|-------|---------|-----------|
| **transcript-analysis** | Parse and understand JSONL transcripts | Always |
| **pattern-detection** | Identify behavioral patterns | Phase/Pipeline level |
| **skill-recommendation** | Map patterns to skills | After pattern detection |
| **cost-analysis** | Token usage and cost optimization | Pipeline level |
| **phase-design-feedback** | Suggest phase document improvements | After analysis |

### Analyzer Skill: transcript-analysis

```markdown
---
name: transcript-analysis
description: Parse worker transcripts and extract meaningful patterns
---

# Transcript Analysis Skill

## Capabilities

1. **Parse JSONL transcripts**
   - Extract tool_call events
   - Extract tool_result events
   - Build timeline of actions

2. **Build Todo Spans**
   - Group events by todo (using TodoWrite markers)
   - Calculate durations per todo
   - Track status transitions

3. **Extract Metrics**
   - Tool usage counts
   - Error frequencies
   - Retry patterns
   - Time distribution

## Limitation Awareness

Remember: Transcripts only contain tool calls/results.
You CANNOT see:
- Assistant reasoning between tools
- Text explanations
- Thinking process

Infer worker state from observable patterns only.
```

### Analyzer Skill: skill-recommendation

```markdown
---
name: skill-recommendation
description: Recommend skills based on detected patterns
---

# Skill Recommendation Skill

## Pattern-to-Skill Mapping

[Include the full mapping from Section 2]

## Recommendation Process

1. **Detect patterns** in todo/phase/pipeline
2. **Map to skills** using the mapping table
3. **Rank by confidence** (0.0 - 1.0)
4. **Filter by relevance** (only skills that exist)
5. **Generate recommendation** with rationale

## Output Format

```json
{
  "recommendations": [
    {
      "skill": "systematic-debugging",
      "confidence": 0.9,
      "reason": "Worker retried same fix 4 times without WebSearch",
      "evidence": ["Edit at line X repeated", "No WebSearch detected"],
      "whenToInvoke": "Before next debugging attempt"
    }
  ]
}
```
```

---

## 5. Analysis Output Format

### Per-Todo Analysis

```json
{
  "todoId": "Todo-3",
  "content": "Implement drag-and-drop",
  "metrics": {
    "duration": 1234567,
    "retryCount": 4,
    "errorRate": 0.35,
    "toolCounts": { "Edit": 12, "Bash": 8, "Read": 5 }
  },
  "patterns": [
    { "type": "editChurn", "severity": "minor" },
    { "type": "noResearch", "severity": "major" }
  ],
  "skillGaps": [
    { "skill": "e2e-rapid-fix", "confidence": 0.85 }
  ],
  "health": "struggled"
}
```

### Per-Phase Analysis

```json
{
  "phase": 4,
  "metrics": {
    "totalDuration": 7200000,
    "totalCost": 4.56,
    "todoCount": 12,
    "completedCount": 12,
    "restartCount": 0
  },
  "patterns": [
    { "type": "testingBottleneck", "severity": "moderate" }
  ],
  "skillsExpected": ["tauri", "test-driven-development", "e2e-rapid-fix"],
  "skillsInvoked": ["tauri"],
  "skillsMissing": ["test-driven-development", "e2e-rapid-fix"],
  "recommendations": [
    "Ensure worker invokes e2e-rapid-fix when E2E tests fail"
  ]
}
```

### Pipeline Analysis

```json
{
  "pipeline": "counter-desktop",
  "metrics": {
    "totalDuration": 14400000,
    "totalCost": 12.34,
    "phaseCount": 5,
    "successRate": 0.8
  },
  "crossPhasePatterns": [
    {
      "pattern": "persistentSkillGap",
      "skill": "systematic-debugging",
      "phases": [3, 4, 5],
      "recommendation": "Add systematic-debugging to mandatory skills"
    }
  ],
  "designSuggestions": [
    {
      "phase": 3,
      "suggestion": "Add explicit skill invocation for e2e-rapid-fix in Todo 6"
    }
  ]
}
```

---

## 6. Integration with Pipeline

### Analyzer Invocation Points

```
Pipeline Timeline:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase 1 ─────────────────▶ │ ANALYZE │
Phase 2 ─────────────────▶ │ ANALYZE │
Phase 3 ─────────────────▶ │ ANALYZE │
Phase 4 ─────────────────▶ │ ANALYZE │
Phase 5 ─────────────────▶ │ ANALYZE │
                           │         │
                           └─────────┘
                                │
                                ▼
                        ┌─────────────┐
                        │  PIPELINE   │
                        │  ANALYSIS   │
                        └─────────────┘
```

### Manifest Updates

The analyzer updates the manifest with analysis results:

```json
{
  "phaseAnalysis": {
    "1": { "health": "clean", "skillGaps": [], "duration": 1200000 },
    "2": { "health": "minor_friction", "skillGaps": ["tauri"], "duration": 1800000 },
    "3": { "health": "struggled", "skillGaps": ["e2e-rapid-fix"], "duration": 3600000 }
  },
  "pipelineAnalysis": {
    "totalCost": 12.34,
    "persistentGaps": ["systematic-debugging"],
    "recommendations": [...]
  }
}
```

---

## 7. Implementation Plan

### Phase 1: Enhance Current Analyzer

1. Add skill gap detection to `analyze-worker-transcript.cjs`
2. Implement pattern-to-skill mapping
3. Add skill invocation detection (search for Skill tool calls)

### Phase 2: Multi-Level Analysis

1. Create `analyze-phase-v2.cjs` with aggregation logic
2. Create `analyze-pipeline.cjs` for cross-phase analysis
3. Integrate with orchestrator for automatic analysis

### Phase 3: Skill Research

1. Add WebSearch capability to analyzer
2. Implement research triggers
3. Create skill suggestion mechanism

### Phase 4: Analyzer Skills

1. Create `transcript-analysis` skill
2. Create `skill-recommendation` skill
3. Create analyzer command for on-demand analysis

---

## Status

Design Draft - Ready for review and implementation

