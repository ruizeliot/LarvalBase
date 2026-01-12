# Skill Gap Detection Specification

**Version:** v11
**Created:** 2026-01-12
**Status:** Design Draft
**Related:** [15-analyzer-v2-design.md](./15-analyzer-v2-design.md)

---

## Overview

Skill Gap Detection identifies when workers struggle and recommends specific skills that could help. This document specifies the concrete patterns to detect and their skill mappings.

---

## 1. Pattern Categories

### Category A: Debugging Patterns

These patterns indicate the worker is struggling to fix something.

| Pattern ID | Name | Detection Logic | Skill Mapping |
|------------|------|-----------------|---------------|
| A1 | repeated_edit_same_file | Edit tool called > 5 times on same file within 5 minutes | `systematic-debugging` |
| A2 | error_no_search | tool_result contains error AND no WebSearch in next 3 calls | `systematic-debugging` |
| A3 | fix_retry_loop | Same sequence of tools repeated > 2 times | `root-cause-tracing` |
| A4 | bash_spam | Bash called > 10 times in 2 minutes with errors | `systematic-debugging` |
| A5 | grep_loop | Grep called > 5 times with similar patterns | `root-cause-tracing` |

**Detection Implementation:**

```javascript
// A1: Repeated edits on same file
function detectRepeatedEditSameFile(events, windowMs = 300000) {
  const editsByFile = {};

  for (const event of events) {
    if (event.type === 'tool_call' && event.tool === 'Edit') {
      const file = event.input?.file_path;
      const ts = new Date(event.timestamp).getTime();

      if (!editsByFile[file]) {
        editsByFile[file] = [];
      }

      // Only count edits within the time window
      editsByFile[file] = editsByFile[file].filter(t => ts - t < windowMs);
      editsByFile[file].push(ts);

      if (editsByFile[file].length > 5) {
        return {
          pattern: 'repeated_edit_same_file',
          file: file,
          count: editsByFile[file].length,
          skill: 'systematic-debugging',
          confidence: 0.85
        };
      }
    }
  }
  return null;
}

// A2: Error without search
function detectErrorNoSearch(events) {
  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    if (event.type === 'tool_result' && containsError(event.result)) {
      // Check next 3 tool calls for WebSearch
      const nextCalls = events.slice(i + 1, i + 7)
        .filter(e => e.type === 'tool_call');

      const hasSearch = nextCalls.some(c =>
        c.tool === 'WebSearch' || c.tool === 'WebFetch'
      );

      if (!hasSearch && nextCalls.length >= 3) {
        return {
          pattern: 'error_no_search',
          errorSnippet: extractErrorSnippet(event.result),
          skill: 'systematic-debugging',
          confidence: 0.9,
          reason: 'Rule 1 violation: WebSearch required before claiming limitation'
        };
      }
    }
  }
  return null;
}

// A3: Fix retry loop
function detectFixRetryLoop(events) {
  const sequences = [];
  let currentSeq = [];

  for (const event of events) {
    if (event.type === 'tool_call') {
      currentSeq.push(event.tool);

      // Check if current sequence matches a previous one
      const seqKey = currentSeq.slice(-5).join(',');
      const matchCount = sequences.filter(s => s === seqKey).length;

      if (matchCount >= 2) {
        return {
          pattern: 'fix_retry_loop',
          sequence: currentSeq.slice(-5),
          repetitions: matchCount + 1,
          skill: 'root-cause-tracing',
          confidence: 0.8
        };
      }

      if (currentSeq.length >= 5) {
        sequences.push(seqKey);
      }
    }
  }
  return null;
}
```

### Category B: Testing Patterns

These patterns indicate testing-related struggles.

| Pattern ID | Name | Detection Logic | Skill Mapping |
|------------|------|-----------------|---------------|
| B1 | e2e_test_failures | Bash result contains "wdio" or "webdriver" error | `e2e-rapid-fix` |
| B2 | test_timeout | Bash result contains "timeout" or "ETIMEDOUT" | `condition-based-waiting` |
| B3 | flaky_test | Same test passes then fails (or vice versa) | `flaky-test-detector` |
| B4 | mock_detected | Code contains jest.mock or vi.mock | `test-driven-development` |
| B5 | test_modification | Edit on test file after test passed | `testing-anti-patterns` |

**Detection Implementation:**

```javascript
// B1: E2E test failures
function detectE2EFailures(events) {
  const e2eKeywords = [
    'wdio', 'webdriver', 'selenium', 'playwright',
    'e2e', 'browser.', '$$(', '$(', 'dragAndDrop'
  ];

  for (const event of events) {
    if (event.type === 'tool_result' && containsError(event.result)) {
      const resultLower = event.result.toLowerCase();

      if (e2eKeywords.some(kw => resultLower.includes(kw.toLowerCase()))) {
        return {
          pattern: 'e2e_test_failures',
          errorType: extractE2EErrorType(event.result),
          skill: 'e2e-rapid-fix',
          confidence: 0.9
        };
      }
    }
  }
  return null;
}

// B4: Mock detected
function detectMockUsage(events) {
  const mockPatterns = [
    'jest.mock',
    'vi.mock',
    'jest.spyOn',
    'mockImplementation',
    'mockReturnValue'
  ];

  for (const event of events) {
    if (event.type === 'tool_call' && event.tool === 'Edit') {
      const newString = event.input?.new_string || '';

      for (const pattern of mockPatterns) {
        if (newString.includes(pattern)) {
          return {
            pattern: 'mock_detected',
            mockType: pattern,
            file: event.input?.file_path,
            skill: 'test-driven-development',
            confidence: 0.95,
            severity: 'critical',
            reason: 'NO MOCKING POLICY violation'
          };
        }
      }
    }
  }
  return null;
}
```

### Category C: Technology-Specific Patterns

These patterns indicate struggles with specific technologies.

| Pattern ID | Name | Detection Logic | Skill Mapping |
|------------|------|-----------------|---------------|
| C1 | tauri_api_error | Error contains "invoke" or "@tauri-apps" | `tauri` |
| C2 | rust_compile_error | Error contains "error[E" (Rust error code) | `tauri` |
| C3 | react_error | Error contains "React" or "hook" or "component" | `react-component-generator` |
| C4 | tailwind_churn | Multiple edits to className in short time | `tailwind-class-optimizer` |
| C5 | typescript_error | Error contains "TS" followed by number | General |

**Detection Implementation:**

```javascript
// C1: Tauri API errors
function detectTauriErrors(events) {
  const tauriKeywords = [
    '@tauri-apps', 'invoke', 'tauri::', 'Tauri',
    'window.__TAURI__', 'tauriConf', 'src-tauri'
  ];

  for (const event of events) {
    if (event.type === 'tool_result' && containsError(event.result)) {
      if (tauriKeywords.some(kw => event.result.includes(kw))) {
        return {
          pattern: 'tauri_api_error',
          errorSnippet: extractErrorSnippet(event.result),
          skill: 'tauri',
          confidence: 0.9
        };
      }
    }
  }
  return null;
}

// C4: Tailwind churn
function detectTailwindChurn(events, windowMs = 180000) {
  const classNameEdits = [];

  for (const event of events) {
    if (event.type === 'tool_call' && event.tool === 'Edit') {
      const content = event.input?.new_string || '';
      const ts = new Date(event.timestamp).getTime();

      if (content.includes('className') || content.includes('class=')) {
        classNameEdits.push(ts);

        // Filter to window
        const recentEdits = classNameEdits.filter(t => ts - t < windowMs);

        if (recentEdits.length > 4) {
          return {
            pattern: 'tailwind_churn',
            editCount: recentEdits.length,
            skill: 'tailwind-class-optimizer',
            confidence: 0.75
          };
        }
      }
    }
  }
  return null;
}
```

### Category D: Process Patterns

These patterns indicate process violations or inefficiencies.

| Pattern ID | Name | Detection Logic | Skill Mapping |
|------------|------|-----------------|---------------|
| D1 | skill_not_invoked | Expected skill not called via Skill tool | Phase-specific |
| D2 | spec_modification | Edit on user-stories.md or test-specs.md in Phase 4/5 | `verification-before-completion` |
| D3 | empty_handler | Code contains `onClick={() => {}}` pattern | `verification-before-completion` |
| D4 | no_test_first | Implementation before test (TDD violation) | `test-driven-development` |
| D5 | commit_without_test | Git commit without test run | `verification-before-completion` |

**Detection Implementation:**

```javascript
// D1: Skill not invoked
function detectMissingSkills(events, phaseNumber) {
  const expectedSkills = getExpectedSkillsForPhase(phaseNumber);
  const invokedSkills = new Set();

  for (const event of events) {
    if (event.type === 'tool_call' && event.tool === 'Skill') {
      invokedSkills.add(event.input?.skill);
    }
  }

  const missing = expectedSkills.filter(s => !invokedSkills.has(s));

  if (missing.length > 0) {
    return {
      pattern: 'skill_not_invoked',
      expectedSkills,
      invokedSkills: Array.from(invokedSkills),
      missingSkills: missing,
      confidence: 1.0,  // Definitive - we can see all Skill tool calls
      severity: 'major'
    };
  }
  return null;
}

// D2: Spec modification in wrong phase
function detectSpecModification(events, phaseNumber) {
  if (phaseNumber < 4) return null;  // Only check Phase 4/5

  const specFiles = ['user-stories.md', 'test-specs.md', 'brainstorm-notes.md'];

  for (const event of events) {
    if (event.type === 'tool_call' && event.tool === 'Edit') {
      const file = event.input?.file_path || '';

      if (specFiles.some(sf => file.includes(sf))) {
        return {
          pattern: 'spec_modification',
          file: file,
          phase: phaseNumber,
          skill: 'verification-before-completion',
          confidence: 1.0,
          severity: 'critical',
          reason: 'Gate 2 violation: Cannot modify specs in Phase 4/5'
        };
      }
    }
  }
  return null;
}

// D3: Empty handler
function detectEmptyHandler(events) {
  const emptyPatterns = [
    'onClick={() => {}}',
    'onChange={() => {}}',
    'onDragStart={() => {}}',
    'onClick={() => console.log',
    'onClick={() => alert('
  ];

  for (const event of events) {
    if (event.type === 'tool_call' && event.tool === 'Edit') {
      const content = event.input?.new_string || '';

      for (const pattern of emptyPatterns) {
        if (content.includes(pattern)) {
          return {
            pattern: 'empty_handler',
            handlerType: pattern.split('(')[0],
            file: event.input?.file_path,
            skill: 'verification-before-completion',
            confidence: 1.0,
            severity: 'critical',
            reason: 'NO PLACEHOLDER RULE violation'
          };
        }
      }
    }
  }
  return null;
}
```

---

## 2. Skill Mapping Reference

### Complete Mapping Table

| Skill | Patterns That Trigger It | Phase Relevance |
|-------|-------------------------|-----------------|
| `systematic-debugging` | A1, A2, A3, A4 | 3, 4, 5 |
| `root-cause-tracing` | A3, A5 | 3, 4 |
| `e2e-rapid-fix` | B1 | 3, 4 |
| `condition-based-waiting` | B2 | 3, 4 |
| `flaky-test-detector` | B3 | 3, 4, 5 |
| `test-driven-development` | B4, D4 | 2, 3, 4 |
| `testing-anti-patterns` | B5 | 3, 4 |
| `tauri` | C1, C2 | 1, 2, 3, 4, 5 |
| `react-component-generator` | C3 | 3, 4 |
| `tailwind-class-optimizer` | C4 | 3, 4 |
| `verification-before-completion` | D2, D3, D5 | 4, 5 |

### Expected Skills by Phase

```javascript
const EXPECTED_SKILLS_BY_PHASE = {
  1: ['brainstorming', 'tauri'],
  2: ['tauri'],
  3: ['tauri', 'test-driven-development', 'integration-test-setup'],
  4: [
    'tauri',
    'test-driven-development',
    'systematic-debugging',
    'e2e-rapid-fix',
    'react-component-generator',
    'tailwind-class-optimizer',
    'verification-before-completion'
  ],
  5: [
    'tauri',
    'verification-before-completion',
    'bottleneck-identifier',
    'secret-scanner'
  ]
};
```

---

## 3. Confidence Scoring

### Confidence Levels

| Level | Range | Meaning |
|-------|-------|---------|
| **High** | 0.9 - 1.0 | Definitive pattern match (e.g., mock detected, spec modified) |
| **Medium** | 0.7 - 0.89 | Strong indicator (e.g., repeated edits, error patterns) |
| **Low** | 0.5 - 0.69 | Possible indicator (e.g., time anomaly, tool diversity) |

### Confidence Adjustment Rules

```javascript
function adjustConfidence(baseConfidence, context) {
  let confidence = baseConfidence;

  // Increase if multiple patterns point to same skill
  if (context.otherPatternsForSameSkill > 0) {
    confidence += 0.05 * context.otherPatternsForSameSkill;
  }

  // Increase if pattern persists across todos
  if (context.patternsAcrossTodos > 2) {
    confidence += 0.1;
  }

  // Decrease if skill was invoked but still struggling
  if (context.skillWasInvoked) {
    confidence -= 0.2;  // Skill may not be the issue
  }

  return Math.min(1.0, Math.max(0.0, confidence));
}
```

---

## 4. Severity Classification

### Severity Levels

| Level | Impact | Action |
|-------|--------|--------|
| **Critical** | Rule violation, will fail gate | Immediate flag, stop analysis |
| **Major** | Significant struggle, needs intervention | Include in recommendations |
| **Moderate** | Noticeable inefficiency | Log for phase summary |
| **Minor** | Small friction | Include in detailed report only |

### Severity Assignment

```javascript
function assignSeverity(pattern) {
  // Critical patterns (rule violations)
  const criticalPatterns = [
    'mock_detected',
    'spec_modification',
    'empty_handler'
  ];

  // Major patterns (significant struggles)
  const majorPatterns = [
    'error_no_search',
    'skill_not_invoked',
    'e2e_test_failures'
  ];

  if (criticalPatterns.includes(pattern.pattern)) {
    return 'critical';
  } else if (majorPatterns.includes(pattern.pattern)) {
    return 'major';
  } else if (pattern.confidence >= 0.8) {
    return 'moderate';
  } else {
    return 'minor';
  }
}
```

---

## 5. Output Specification

### Pattern Detection Result

```typescript
interface PatternDetection {
  pattern: string;           // Pattern ID (e.g., 'A1', 'B1')
  patternName: string;       // Human-readable name
  skill: string;             // Recommended skill
  confidence: number;        // 0.0 - 1.0
  severity: 'critical' | 'major' | 'moderate' | 'minor';
  reason?: string;           // Why this matters
  evidence: {
    timestamp: string;
    tool: string;
    snippet?: string;
  }[];
}
```

### Skill Gap Summary

```typescript
interface SkillGapSummary {
  todoId: string;
  detectedPatterns: PatternDetection[];
  recommendedSkills: {
    skill: string;
    confidence: number;
    reasons: string[];
  }[];
  overallHealth: 'clean' | 'minor_friction' | 'struggled';
}
```

---

## 6. Integration Points

### With Analyzer

The skill gap detector is called by the analyzer for each todo span:

```javascript
// In analyze-worker-transcript.cjs
function analyzeTodoSpan(span) {
  const patterns = [];

  // Run all pattern detectors
  patterns.push(detectRepeatedEditSameFile(span.events));
  patterns.push(detectErrorNoSearch(span.events));
  patterns.push(detectFixRetryLoop(span.events));
  patterns.push(detectE2EFailures(span.events));
  // ... more detectors

  // Filter nulls and aggregate
  const detected = patterns.filter(p => p !== null);

  // Aggregate skills
  const skillGaps = aggregateSkillRecommendations(detected);

  return { patterns: detected, skillGaps };
}
```

### With Orchestrator

The orchestrator can query skill gaps for real-time intervention:

```javascript
// In orchestrator
async function checkWorkerHealth() {
  const analysis = await runAnalyzer(currentTranscript);

  if (analysis.criticalPatterns.length > 0) {
    // Alert human immediately
    await sendAlert(`Critical pattern detected: ${analysis.criticalPatterns[0].patternName}`);
  }

  if (analysis.skillGaps.length > 0) {
    // Log recommendation for post-phase review
    manifest.phaseAnalysis[currentPhase].skillGaps = analysis.skillGaps;
  }
}
```

---

## Status

Design Draft - Ready for implementation in analyzer v2

