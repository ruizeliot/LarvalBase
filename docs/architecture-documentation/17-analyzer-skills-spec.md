# Analyzer Skills Specification

**Version:** v11
**Created:** 2026-01-12
**Status:** Design Draft
**Related:** [15-analyzer-v2-design.md](./15-analyzer-v2-design.md), [16-skill-gap-detection-spec.md](./16-skill-gap-detection-spec.md)

---

## Overview

The Analyzer needs specific skills to effectively analyze worker transcripts and recommend improvements. These skills enable the analyzer to operate as an AI agent with specialized capabilities.

---

## Skill Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ANALYZER AGENT                                   │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                    CORE SKILLS (Always Loaded)                   │   │
│   │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │   │
│   │  │transcript-parser│  │pattern-detector │  │skill-recommender│  │   │
│   │  └─────────────────┘  └─────────────────┘  └─────────────────┘  │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                    OPTIONAL SKILLS (On Demand)                   │   │
│   │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │   │
│   │  │ cost-analyzer   │  │phase-comparator │  │skill-researcher │  │   │
│   │  └─────────────────┘  └─────────────────┘  └─────────────────┘  │   │
│   └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Skill 1: transcript-parser

**Purpose:** Parse JSONL transcripts and build structured representations

```markdown
---
name: transcript-parser
description: Parse worker JSONL transcripts into structured data for analysis. Use when starting any transcript analysis.
allowed-tools: Read, Bash, Grep
version: 1.0.0
---

# Transcript Parser Skill

## Purpose

Transform raw JSONL transcript files into structured data suitable for pattern analysis.

## Known Limitations

**CRITICAL:** Transcripts only contain:
- `tool_call` events (tool name, parameters)
- `tool_result` events (output, errors)

**NOT available:**
- Assistant reasoning/thinking
- Text between tool calls
- Why decisions were made

You must INFER worker state from observable patterns only.

## Parsing Process

### Step 1: Load Transcript

```javascript
const lines = fs.readFileSync(transcriptPath, 'utf8')
  .split('\n')
  .filter(l => l.trim());

const events = lines.map(line => JSON.parse(line));
```

### Step 2: Extract Tool Events

```javascript
const toolEvents = events.filter(e =>
  e.type === 'tool_call' || e.type === 'tool_result'
);
```

### Step 3: Build Timeline

```javascript
const timeline = toolEvents.map(e => ({
  timestamp: e.timestamp,
  type: e.type,
  tool: e.type === 'tool_call' ? e.tool : null,
  input: e.type === 'tool_call' ? e.input : null,
  result: e.type === 'tool_result' ? e.result : null,
  hasError: e.type === 'tool_result' ? containsError(e.result) : false
}));
```

### Step 4: Identify Todo Spans

```javascript
function buildTodoSpans(timeline) {
  const spans = [];
  let currentTodo = null;
  let currentEvents = [];

  for (const event of timeline) {
    if (isTodoWriteCall(event)) {
      if (currentTodo) {
        spans.push({
          todo: currentTodo,
          events: currentEvents,
          startTime: currentEvents[0]?.timestamp,
          endTime: event.timestamp
        });
      }
      currentTodo = extractInProgressTodo(event);
      currentEvents = [];
    } else {
      currentEvents.push(event);
    }
  }

  return spans;
}
```

## Output Schema

```typescript
interface ParsedTranscript {
  sessionId: string;
  startTime: string;
  endTime: string;
  totalEvents: number;

  timeline: TimelineEvent[];
  todoSpans: TodoSpan[];

  summary: {
    toolCounts: Record<string, number>;
    errorCount: number;
    todoCount: number;
  };
}

interface TimelineEvent {
  timestamp: string;
  type: 'tool_call' | 'tool_result';
  tool?: string;
  input?: any;
  result?: string;
  hasError: boolean;
}

interface TodoSpan {
  todoId: string;
  content: string;
  status: string;
  events: TimelineEvent[];
  startTime: string;
  endTime: string;
  duration: number;
}
```

## Error Detection Patterns

```javascript
function containsError(result) {
  const errorIndicators = [
    'error', 'Error', 'ERROR',
    'failed', 'Failed', 'FAILED',
    'exception', 'Exception',
    'cannot', 'Cannot',
    'undefined', 'null',
    'ENOENT', 'EACCES', 'ETIMEDOUT'
  ];

  return errorIndicators.some(i => result?.includes(i));
}
```

## Usage

```javascript
// In analyzer
const parser = await invokeSkill('transcript-parser');
const parsed = parser.parse(transcriptPath);

// Now ready for pattern detection
const patterns = await invokeSkill('pattern-detector', { transcript: parsed });
```
```

---

## Skill 2: pattern-detector

**Purpose:** Detect behavioral patterns that indicate struggles or violations

```markdown
---
name: pattern-detector
description: Detect behavioral patterns in parsed transcripts that indicate worker struggles, rule violations, or inefficiencies.
allowed-tools: Read, Grep
version: 1.0.0
---

# Pattern Detector Skill

## Purpose

Analyze parsed transcripts to identify patterns that indicate:
- Worker struggles (repeated errors, long durations)
- Rule violations (mocks, empty handlers, spec modifications)
- Inefficiencies (no research, repeated edits)

## Pattern Categories

### Category A: Debugging Patterns (Struggles)

| ID | Pattern | Indicator | Skill Hint |
|----|---------|-----------|------------|
| A1 | repeated_edit_same_file | >5 edits on same file in 5 min | systematic-debugging |
| A2 | error_no_search | Error without WebSearch in next 3 calls | systematic-debugging |
| A3 | fix_retry_loop | Same tool sequence repeated >2x | root-cause-tracing |
| A4 | bash_spam | >10 Bash calls in 2 min with errors | systematic-debugging |

### Category B: Testing Patterns

| ID | Pattern | Indicator | Skill Hint |
|----|---------|-----------|------------|
| B1 | e2e_test_failures | wdio/webdriver in error output | e2e-rapid-fix |
| B2 | test_timeout | timeout/ETIMEDOUT in output | condition-based-waiting |
| B3 | mock_detected | jest.mock/vi.mock in Edit content | test-driven-development |

### Category C: Process Violations (Critical)

| ID | Pattern | Indicator | Skill Hint |
|----|---------|-----------|------------|
| C1 | spec_modification | Edit on user-stories.md in Phase 4/5 | verification-before-completion |
| C2 | empty_handler | onClick={() => {}} in Edit content | verification-before-completion |
| C3 | skill_not_invoked | Expected Skill tool call missing | Phase-specific |

## Detection Functions

### A1: Repeated Edit Same File

```javascript
function detectRepeatedEditSameFile(todoSpan) {
  const WINDOW_MS = 300000; // 5 minutes
  const THRESHOLD = 5;

  const editsByFile = {};

  for (const event of todoSpan.events) {
    if (event.type === 'tool_call' && event.tool === 'Edit') {
      const file = event.input?.file_path;
      const ts = new Date(event.timestamp).getTime();

      if (!editsByFile[file]) editsByFile[file] = [];

      // Keep only recent edits
      editsByFile[file] = editsByFile[file]
        .filter(t => ts - t < WINDOW_MS);
      editsByFile[file].push(ts);

      if (editsByFile[file].length > THRESHOLD) {
        return {
          pattern: 'repeated_edit_same_file',
          file,
          count: editsByFile[file].length,
          skill: 'systematic-debugging',
          confidence: 0.85,
          severity: 'moderate'
        };
      }
    }
  }
  return null;
}
```

### A2: Error Without Search

```javascript
function detectErrorNoSearch(todoSpan) {
  const events = todoSpan.events;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    if (event.type === 'tool_result' && event.hasError) {
      // Check next 3 tool calls for WebSearch
      const nextCalls = events.slice(i + 1, i + 7)
        .filter(e => e.type === 'tool_call');

      const hasSearch = nextCalls.some(c =>
        c.tool === 'WebSearch' || c.tool === 'WebFetch'
      );

      if (!hasSearch && nextCalls.length >= 3) {
        return {
          pattern: 'error_no_search',
          errorSnippet: event.result?.substring(0, 200),
          skill: 'systematic-debugging',
          confidence: 0.9,
          severity: 'major',
          reason: 'Rule 1 violation: WebSearch required after errors'
        };
      }
    }
  }
  return null;
}
```

### C2: Empty Handler Detection

```javascript
function detectEmptyHandler(todoSpan) {
  const FORBIDDEN_PATTERNS = [
    'onClick={() => {}}',
    'onChange={() => {}}',
    'onDragStart={() => {}}',
    'onClick={() => console.log',
    "onClick={() => alert("
  ];

  for (const event of todoSpan.events) {
    if (event.type === 'tool_call' && event.tool === 'Edit') {
      const content = event.input?.new_string || '';

      for (const pattern of FORBIDDEN_PATTERNS) {
        if (content.includes(pattern)) {
          return {
            pattern: 'empty_handler',
            file: event.input?.file_path,
            handlerType: pattern.split('(')[0],
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

## Running All Detectors

```javascript
function detectAllPatterns(todoSpan, context) {
  const detectors = [
    detectRepeatedEditSameFile,
    detectErrorNoSearch,
    detectFixRetryLoop,
    detectBashSpam,
    detectE2EFailures,
    detectMockUsage,
    detectEmptyHandler,
    detectSpecModification,
    detectMissingSkills
  ];

  const patterns = [];

  for (const detector of detectors) {
    const result = detector(todoSpan, context);
    if (result) patterns.push(result);
  }

  return patterns;
}
```

## Output Schema

```typescript
interface PatternResult {
  pattern: string;
  skill: string;
  confidence: number;       // 0.0 - 1.0
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  reason?: string;
  evidence?: {
    file?: string;
    count?: number;
    snippet?: string;
  };
}
```

## Usage

```javascript
// In analyzer
const parsed = await invokeSkill('transcript-parser', { path: transcriptPath });

for (const span of parsed.todoSpans) {
  const patterns = await invokeSkill('pattern-detector', {
    todoSpan: span,
    context: { phase: currentPhase }
  });

  if (patterns.some(p => p.severity === 'critical')) {
    flagForReview(span, patterns);
  }
}
```
```

---

## Skill 3: skill-recommender

**Purpose:** Map detected patterns to skill recommendations

```markdown
---
name: skill-recommender
description: Generate skill recommendations based on detected patterns. Maps struggle patterns to specific skills that could help.
allowed-tools: Read, WebSearch
version: 1.0.0
---

# Skill Recommender Skill

## Purpose

Translate detected patterns into actionable skill recommendations that can help workers avoid similar struggles.

## Pattern-to-Skill Mapping

### Primary Mappings

| Pattern | Primary Skill | Secondary Skills |
|---------|---------------|------------------|
| repeated_edit_same_file | systematic-debugging | root-cause-tracing |
| error_no_search | systematic-debugging | - |
| fix_retry_loop | root-cause-tracing | systematic-debugging |
| e2e_test_failures | e2e-rapid-fix | running-e2e-tests |
| mock_detected | test-driven-development | testing-anti-patterns |
| empty_handler | verification-before-completion | - |
| tauri_api_error | tauri | - |
| tailwind_churn | tailwind-class-optimizer | - |

### Expected Skills by Phase

```javascript
const EXPECTED_SKILLS = {
  1: ['brainstorming', 'tauri'],
  2: ['tauri'],
  3: ['tauri', 'test-driven-development', 'integration-test-setup'],
  4: ['tauri', 'test-driven-development', 'systematic-debugging',
      'e2e-rapid-fix', 'react-component-generator',
      'tailwind-class-optimizer', 'verification-before-completion'],
  5: ['tauri', 'verification-before-completion',
      'bottleneck-identifier', 'secret-scanner']
};
```

## Recommendation Algorithm

### Step 1: Aggregate Pattern Skills

```javascript
function aggregateSkillRecommendations(patterns) {
  const skillScores = {};

  for (const pattern of patterns) {
    const skill = pattern.skill;
    if (!skillScores[skill]) {
      skillScores[skill] = {
        skill,
        confidence: 0,
        reasons: [],
        patterns: []
      };
    }

    // Accumulate confidence (cap at 1.0)
    skillScores[skill].confidence = Math.min(1.0,
      skillScores[skill].confidence + (pattern.confidence * 0.5)
    );

    skillScores[skill].reasons.push(pattern.reason || pattern.pattern);
    skillScores[skill].patterns.push(pattern.pattern);
  }

  return Object.values(skillScores)
    .sort((a, b) => b.confidence - a.confidence);
}
```

### Step 2: Check Expected vs Invoked

```javascript
function checkExpectedSkills(phase, invokedSkills) {
  const expected = EXPECTED_SKILLS[phase] || [];
  const missing = expected.filter(s => !invokedSkills.has(s));

  return missing.map(skill => ({
    skill,
    confidence: 1.0,  // Definitive - we know it wasn't invoked
    severity: 'major',
    reason: `Phase ${phase} requires ${skill} but it was not invoked`
  }));
}
```

### Step 3: Rank Recommendations

```javascript
function rankRecommendations(aggregated, missing) {
  const all = [...aggregated, ...missing];

  // Sort by: severity (critical first), then confidence
  return all.sort((a, b) => {
    const severityOrder = { critical: 0, major: 1, moderate: 2, minor: 3 };
    const aSev = severityOrder[a.severity] ?? 2;
    const bSev = severityOrder[b.severity] ?? 2;

    if (aSev !== bSev) return aSev - bSev;
    return b.confidence - a.confidence;
  });
}
```

## Output Schema

```typescript
interface SkillRecommendation {
  skill: string;
  confidence: number;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  reasons: string[];
  patterns: string[];
  whenToInvoke: string;
  docLink?: string;
}

interface RecommendationReport {
  todoId: string;
  phase: number;
  recommendations: SkillRecommendation[];
  summary: {
    criticalCount: number;
    majorCount: number;
    totalSkills: number;
  };
}
```

## Generating Invocation Guidance

```javascript
function generateInvocationGuidance(skill, phase) {
  const guidance = {
    'systematic-debugging': {
      when: 'When encountering errors or test failures',
      how: 'Skill tool → systematic-debugging',
      before: 'Before attempting any fix'
    },
    'e2e-rapid-fix': {
      when: 'When E2E tests fail',
      how: 'Skill tool → e2e-rapid-fix',
      before: 'Before making random changes to tests'
    },
    'tauri': {
      when: 'When using Tauri APIs',
      how: 'Skill tool → tauri',
      before: 'Before implementing Tauri integration'
    }
  };

  return guidance[skill] || {
    when: 'When relevant to the task',
    how: `Skill tool → ${skill}`,
    before: 'Before starting the related work'
  };
}
```

## Usage

```javascript
// In analyzer
const patterns = await invokeSkill('pattern-detector', { todoSpan, context });
const invokedSkills = extractInvokedSkills(todoSpan);

const recommendations = await invokeSkill('skill-recommender', {
  patterns,
  phase: context.phase,
  invokedSkills
});

// Generate report
console.log(`Recommendations for Todo ${todoSpan.todoId}:`);
for (const rec of recommendations) {
  console.log(`  - ${rec.skill} (${rec.confidence * 100}%)`);
  console.log(`    Reason: ${rec.reasons.join(', ')}`);
  console.log(`    When: ${rec.whenToInvoke}`);
}
```
```

---

## Skill 4: skill-researcher (Optional)

**Purpose:** Research new skills when patterns don't map to known skills

```markdown
---
name: skill-researcher
description: Research potential skills online when detected patterns don't map to known skills. Use WebSearch to find relevant techniques.
allowed-tools: WebSearch, WebFetch, Read
version: 1.0.0
---

# Skill Researcher Skill

## Purpose

When pattern detection identifies struggles that don't map to known skills, research online to find:
1. Existing skills that could help
2. Best practices for the specific problem
3. Potential new skills to create

## Research Triggers

```javascript
const RESEARCH_TRIGGERS = [
  // Unknown technology mentioned in errors
  { condition: 'unknown_tech_in_error', priority: 'high' },

  // Persistent struggle with no skill match
  { condition: 'no_skill_match_high_confidence', priority: 'high' },

  // New API/library not in skill set
  { condition: 'unfamiliar_api', priority: 'medium' }
];
```

## Research Process

### Step 1: Extract Search Context

```javascript
function extractSearchContext(pattern) {
  const context = {
    technology: null,
    errorType: null,
    taskType: null
  };

  // Extract technology from error messages
  if (pattern.evidence?.snippet) {
    const techKeywords = [
      'tauri', 'webdriver', 'react', 'rust', 'typescript',
      'wdio', 'vitest', 'jest', 'playwright'
    ];

    for (const tech of techKeywords) {
      if (pattern.evidence.snippet.toLowerCase().includes(tech)) {
        context.technology = tech;
        break;
      }
    }
  }

  // Extract error type
  if (pattern.pattern.includes('error')) {
    context.errorType = pattern.pattern;
  }

  return context;
}
```

### Step 2: Generate Search Queries

```javascript
function generateQueries(context) {
  const queries = [];

  if (context.technology) {
    queries.push(`${context.technology} best practices 2025`);
    queries.push(`${context.technology} common mistakes debugging`);
    queries.push(`Claude Code skill ${context.technology}`);
  }

  if (context.errorType) {
    queries.push(`${context.errorType} fix solution`);
  }

  // Always search for AI agent skills
  queries.push(`AI coding agent skill ${context.technology || 'debugging'}`);

  return queries;
}
```

### Step 3: Execute Searches

```javascript
async function executeResearch(queries) {
  const results = [];

  for (const query of queries.slice(0, 3)) { // Limit to 3 searches
    const searchResult = await WebSearch({ query });
    results.push({
      query,
      snippets: extractRelevantSnippets(searchResult)
    });
  }

  return results;
}
```

### Step 4: Synthesize Findings

```javascript
function synthesizeFindings(searchResults) {
  return {
    existingSkills: [], // Skills that might exist
    bestPractices: [],  // Techniques to apply
    newSkillIdeas: []   // Potential new skills to create
  };
}
```

## Output Schema

```typescript
interface ResearchResult {
  pattern: string;
  searchContext: {
    technology?: string;
    errorType?: string;
    taskType?: string;
  };
  findings: {
    existingSkills: string[];
    bestPractices: {
      technique: string;
      source: string;
    }[];
    newSkillIdeas: {
      name: string;
      purpose: string;
      basedOn: string;
    }[];
  };
  recommendation: string;
}
```

## Usage

```javascript
// In analyzer, when pattern has no skill match
const patterns = await invokeSkill('pattern-detector', { todoSpan, context });

for (const pattern of patterns) {
  if (pattern.skill === 'unknown' || pattern.needsResearch) {
    const research = await invokeSkill('skill-researcher', { pattern });

    if (research.findings.existingSkills.length > 0) {
      // Found existing skill
      pattern.skill = research.findings.existingSkills[0];
    } else if (research.findings.bestPractices.length > 0) {
      // Suggest technique without skill
      pattern.suggestion = research.findings.bestPractices[0];
    }
  }
}
```
```

---

## Integration: Analyzer Agent CLAUDE.md

When the analyzer runs as an agent, it needs its own CLAUDE.md:

```markdown
# Analyzer Agent

**Purpose:** Analyze worker transcripts and generate improvement recommendations

## Required Skills

You MUST invoke these skills in order:
1. `transcript-parser` - Parse the raw JSONL file
2. `pattern-detector` - Detect behavioral patterns
3. `skill-recommender` - Generate skill recommendations

## Optional Skills

Invoke when needed:
- `skill-researcher` - When patterns don't match known skills

## Analysis Process

1. Read transcript file from `.claude/projects/[project]/[session].jsonl`
2. Parse transcript using transcript-parser skill
3. For each todo span:
   a. Detect patterns using pattern-detector
   b. Generate recommendations using skill-recommender
4. Aggregate to phase level
5. Generate markdown report
6. Update manifest with analysis results

## Output Files

- `.pipeline/analysis/[session]-analysis.md` - Detailed report
- `.pipeline/manifest.json` - Updated with phaseAnalysis

## Rules

- NEVER modify source files - analysis is read-only
- ALWAYS cite specific evidence (timestamps, tool names)
- REPORT critical violations immediately
- RESEARCH when patterns are unknown
```

---

## Status

Design Draft - Ready for implementation

**Sources:**
- [Claude Agent Skills Deep Dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/)
- [Agent Skills Documentation](https://code.claude.com/docs/en/skills)
- [Equipping Agents with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)

