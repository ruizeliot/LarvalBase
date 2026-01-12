# Analyzer Skills Specification

**Version:** v11
**Created:** 2026-01-12
**Status:** Design Draft
**Related:** [15-analyzer-v2-design.md](./15-analyzer-v2-design.md), [16-outcome-correlation-spec.md](./16-outcome-correlation-spec.md)

---

## Overview

The Analyzer operates as an AI agent with specialized skills for extracting features, collecting ratings, calculating correlations, and generating reports. These skills enable the outcome-based learning system.

---

## Skill Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ANALYZER AGENT                                   │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                    DATA COLLECTION SKILLS                        │   │
│   │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │   │
│   │  │transcript-parser│  │feature-extractor│  │rating-collector │  │   │
│   │  └─────────────────┘  └─────────────────┘  └─────────────────┘  │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                    ANALYSIS SKILLS                               │   │
│   │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │   │
│   │  │  correlator     │  │   predictor     │  │report-generator │  │   │
│   │  └─────────────────┘  └─────────────────┘  └─────────────────┘  │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                    UTILITY SKILLS                                │   │
│   │  ┌─────────────────┐  ┌─────────────────┐                       │   │
│   │  │ dataset-manager │  │ insight-generator│                       │   │
│   │  └─────────────────┘  └─────────────────┘                       │   │
│   └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Skill 1: transcript-parser

**Purpose:** Parse JSONL transcripts into structured event data

```markdown
---
name: transcript-parser
description: Parse worker JSONL transcripts into structured timeline data. First step in any analysis.
allowed-tools: Read, Bash
version: 2.0.0
---

# Transcript Parser Skill

## Purpose

Transform raw JSONL transcript files into structured timelines for feature extraction.

## Known Limitations

**CRITICAL:** Transcripts only contain:
- `tool_call` events (tool name, parameters)
- `tool_result` events (output, errors)

**NOT available:**
- Assistant reasoning between tool calls
- Text explanations
- Why decisions were made

## Input

```typescript
interface ParserInput {
  transcriptPaths: {
    [phase: string]: string;  // Phase number -> file path
  };
}
```

## Process

### Step 1: Load and Parse Lines

```javascript
async function parseTranscript(path) {
  const content = await fs.readFile(path, 'utf8');
  const lines = content.split('\n').filter(l => l.trim());

  return lines.map(line => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(Boolean);
}
```

### Step 2: Extract Tool Events

```javascript
function extractToolEvents(events) {
  return events.filter(e =>
    e.type === 'tool_call' || e.type === 'tool_result'
  ).map(e => ({
    timestamp: e.timestamp,
    type: e.type,
    tool: e.type === 'tool_call' ? e.tool : null,
    input: e.type === 'tool_call' ? e.input : null,
    result: e.type === 'tool_result' ? e.result : null,
    hasError: e.type === 'tool_result' ? containsError(e.result) : false
  }));
}
```

### Step 3: Build Todo Spans

```javascript
function buildTodoSpans(events) {
  const spans = [];
  let currentTodo = null;
  let spanEvents = [];

  for (const event of events) {
    if (isTodoWriteCall(event)) {
      if (currentTodo && spanEvents.length > 0) {
        spans.push({
          todoId: currentTodo.id,
          content: currentTodo.content,
          events: spanEvents,
          startTime: spanEvents[0].timestamp,
          endTime: event.timestamp
        });
      }
      currentTodo = extractCurrentTodo(event);
      spanEvents = [];
    } else {
      spanEvents.push(event);
    }
  }

  return spans;
}
```

## Output

```typescript
interface ParsedTranscript {
  phase: string;
  path: string;
  events: ToolEvent[];
  todoSpans: TodoSpan[];
  summary: {
    totalEvents: number;
    toolCounts: Record<string, number>;
    errorCount: number;
    duration: number;
  };
}
```

## Usage

```javascript
const parsed = await invokeSkill('transcript-parser', {
  transcriptPaths: {
    '1': '.claude/projects/.../session1.jsonl',
    '2': '.claude/projects/.../session2.jsonl'
  }
});
```
```

---

## Skill 2: feature-extractor

**Purpose:** Extract quantitative features from parsed transcripts

```markdown
---
name: feature-extractor
description: Extract features (patterns, metrics, violations) from parsed transcripts for correlation analysis.
allowed-tools: Read
version: 2.0.0
---

# Feature Extractor Skill

## Purpose

Transform parsed transcript data into quantitative features that can be correlated with user ratings.

## Input

```typescript
interface ExtractorInput {
  parsedTranscripts: ParsedTranscript[];
  manifest: PipelineManifest;
}
```

## Feature Categories

### A: Phase Metrics

```javascript
function extractPhaseMetrics(parsed, manifest) {
  return {
    duration: calculateDuration(parsed.events),
    cost: manifest.phases[parsed.phase]?.cost || 0,
    todoCount: parsed.todoSpans.length,
    errorCount: parsed.summary.errorCount,
    iterationCount: detectIterations(parsed.todoSpans),
    skillCount: countSkillCalls(parsed.events)
  };
}
```

### B: Pattern Counts

```javascript
function extractPatterns(allEvents) {
  return {
    editChurn: detectEditChurn(allEvents),
    e2eFailures: detectE2EFailures(allEvents),
    searchAfterError: detectSearchAfterError(allEvents),
    maxFileIterations: findMaxFileIterations(allEvents),
    phaseRestarts: 0, // From manifest
    specModifications: detectSpecModifications(allEvents),
    emptyHandlers: detectEmptyHandlers(allEvents),
    mockUsage: detectMockUsage(allEvents),
    skillInvocations: countSkillInvocations(allEvents)
  };
}
```

### C: Derived Metrics

```javascript
function calculateDerived(phases, patterns, tools) {
  const totalDuration = sumValues(phases, 'duration');
  const totalTodos = sumValues(phases, 'todoCount');
  const totalErrors = sumValues(phases, 'errorCount');
  const totalTools = sumValues(tools);

  return {
    avgTimePerTodo: totalTodos > 0 ? totalDuration / totalTodos : 0,
    errorRate: totalTools > 0 ? totalErrors / totalTools : 0,
    searchRate: totalErrors > 0 ? patterns.searchAfterError / totalErrors : 1,
    skillCoverage: calculateSkillCoverage(phases),
    churnRate: tools.Edit > 0 ? patterns.editChurn / tools.Edit : 0
  };
}
```

### D: Violation Flags

```javascript
function detectViolations(patterns, derived) {
  return {
    hasEmptyHandlers: patterns.emptyHandlers > 0,
    hasMocks: patterns.mockUsage > 0,
    hasSpecModifications: patterns.specModifications > 0,
    hasSkillGaps: derived.skillCoverage < 0.5
  };
}
```

## Output

```typescript
interface PipelineFeatures {
  phases: Record<string, PhaseMetrics>;
  patterns: PatternCounts;
  derived: DerivedMetrics;
  violations: ViolationFlags;
}
```

## Detection Functions

### Edit Churn

```javascript
function detectEditChurn(events) {
  const editsByFile = {};
  for (const e of events) {
    if (e.type === 'tool_call' && e.tool === 'Edit') {
      const file = e.input?.file_path;
      editsByFile[file] = (editsByFile[file] || 0) + 1;
    }
  }
  return Object.values(editsByFile).filter(c => c > 3).length;
}
```

### E2E Failures

```javascript
function detectE2EFailures(events) {
  const keywords = ['wdio', 'webdriver', 'e2e', 'selenium'];
  let count = 0;

  for (const e of events) {
    if (e.type === 'tool_result' && e.hasError) {
      if (keywords.some(kw => e.result?.toLowerCase().includes(kw))) {
        count++;
      }
    }
  }
  return count;
}
```

### Empty Handlers

```javascript
function detectEmptyHandlers(events) {
  const patterns = ['onClick={() => {}}', 'onChange={() => {}}'];
  let count = 0;

  for (const e of events) {
    if (e.type === 'tool_call' && e.tool === 'Edit') {
      const content = e.input?.new_string || '';
      if (patterns.some(p => content.includes(p))) {
        count++;
      }
    }
  }
  return count;
}
```
```

---

## Skill 3: rating-collector

**Purpose:** Collect and validate user Likert ratings

```markdown
---
name: rating-collector
description: Collect user ratings via prompts and validate the input. Used after pipeline completion.
allowed-tools: AskUserQuestion
version: 2.0.0
---

# Rating Collector Skill

## Purpose

Interactively collect user ratings for the completed pipeline, validating input and gathering optional component-level feedback.

## Rating Categories

| Category | ID | Description |
|----------|-----|-------------|
| Overall | `overall` | General satisfaction |
| UI/Design | `ui_design` | Visual quality |
| Navigation | `navigation` | User flow |
| Performance | `performance` | Speed/responsiveness |
| Code Quality | `code_quality` | Maintainability |
| Test Coverage | `test_coverage` | Test thoroughness |
| Functionality | `functionality` | Features work |

## Collection Process

### Step 1: Overall Rating

```javascript
const overall = await AskUserQuestion({
  questions: [{
    question: "How would you rate the app overall? (1=Very Poor, 5=Excellent)",
    header: "Overall",
    options: [
      { label: "1 - Very Poor", description: "Fundamentally broken" },
      { label: "2 - Poor", description: "Major issues" },
      { label: "3 - Acceptable", description: "Works with problems" },
      { label: "4 - Good", description: "Works well" },
      { label: "5 - Excellent", description: "Exceptional" }
    ],
    multiSelect: false
  }]
});
```

### Step 2: Category Ratings

```javascript
const categories = await AskUserQuestion({
  questions: [
    {
      question: "Rate the UI/Design (1-5)?",
      header: "UI/Design",
      options: ratingOptions,
      multiSelect: false
    },
    {
      question: "Rate the Navigation (1-5)?",
      header: "Navigation",
      options: ratingOptions,
      multiSelect: false
    },
    // ... more categories
  ]
});
```

### Step 3: Component Ratings (Optional)

```javascript
const wantsComponentRatings = await AskUserQuestion({
  questions: [{
    question: "Would you like to rate specific components?",
    header: "Components",
    options: [
      { label: "Yes", description: "Rate individual components" },
      { label: "No", description: "Skip component ratings" }
    ],
    multiSelect: false
  }]
});

if (wantsComponentRatings.answer === 'Yes') {
  // Prompt for component names and ratings
}
```

### Step 4: Freeform Feedback (Optional)

```javascript
const freeform = await AskUserQuestion({
  questions: [{
    question: "Any additional feedback? (or skip)",
    header: "Feedback",
    options: [
      { label: "Add feedback", description: "Type additional notes" },
      { label: "Skip", description: "No additional feedback" }
    ],
    multiSelect: false
  }]
});
```

## Validation

```javascript
function validateRatings(ratings) {
  const errors = [];

  if (!ratings.overall || ratings.overall < 1 || ratings.overall > 5) {
    errors.push('Overall rating must be 1-5');
  }

  for (const [cat, val] of Object.entries(ratings.categories || {})) {
    if (val < 1 || val > 5) {
      errors.push(`${cat} rating must be 1-5`);
    }
  }

  return errors;
}
```

## Output

```typescript
interface UserRatings {
  overall: number;
  categories: {
    ui_design: number;
    navigation: number;
    performance: number;
    code_quality: number;
    test_coverage: number;
    functionality: number;
  };
  components?: Record<string, { rating: number; notes?: string }>;
  freeform?: string;
  collectedAt: string;
}
```
```

---

## Skill 4: correlator

**Purpose:** Calculate correlations between features and ratings

```markdown
---
name: correlator
description: Calculate statistical correlations between extracted features and user ratings across the dataset.
allowed-tools: Read
version: 2.0.0
---

# Correlator Skill

## Purpose

Analyze the learning dataset to find correlations between pipeline execution patterns and user outcomes.

## Input

```typescript
interface CorrelatorInput {
  datasetPath: string;  // Path to learning-dataset.jsonl
  minSampleSize?: number;  // Minimum entries required (default: 10)
}
```

## Correlation Methods

### Pearson Correlation (Continuous Features)

```javascript
function pearsonCorrelation(x, y) {
  const n = x.length;
  if (n !== y.length || n < 3) return 0;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return den === 0 ? 0 : num / den;
}
```

### Point-Biserial (Binary Features)

```javascript
function pointBiserial(binary, continuous) {
  const group1 = continuous.filter((_, i) => binary[i]);
  const group0 = continuous.filter((_, i) => !binary[i]);

  if (group1.length === 0 || group0.length === 0) return 0;

  const mean1 = avg(group1);
  const mean0 = avg(group0);
  const std = standardDev(continuous);
  const p = group1.length / continuous.length;

  return std === 0 ? 0 : (mean1 - mean0) / std * Math.sqrt(p * (1 - p));
}
```

## Process

### Step 1: Load Dataset

```javascript
async function loadDataset(path) {
  const content = await fs.readFile(path, 'utf8');
  return content.split('\n')
    .filter(l => l.trim())
    .map(l => JSON.parse(l));
}
```

### Step 2: Extract Feature/Rating Pairs

```javascript
function extractPairs(dataset, featurePath, ratingName) {
  return dataset.map(entry => ({
    feature: getNestedValue(entry.features, featurePath),
    rating: ratingName === 'overall'
      ? entry.ratings.overall
      : entry.ratings.categories[ratingName]
  })).filter(p => p.feature !== undefined && p.rating !== undefined);
}
```

### Step 3: Calculate All Correlations

```javascript
async function calculateCorrelations(dataset) {
  const featurePaths = flattenPaths(dataset[0].features);
  const ratingNames = ['overall', ...Object.keys(dataset[0].ratings.categories)];

  const correlations = [];

  for (const feature of featurePaths) {
    for (const rating of ratingNames) {
      const pairs = extractPairs(dataset, feature, rating);
      if (pairs.length < 10) continue;

      const features = pairs.map(p => p.feature);
      const ratings = pairs.map(p => p.rating);

      const r = typeof features[0] === 'boolean'
        ? pointBiserial(features, ratings)
        : pearsonCorrelation(features, ratings);

      if (Math.abs(r) > 0.3) {
        correlations.push({
          feature,
          rating,
          correlation: r,
          sampleSize: pairs.length,
          confidence: calculateConfidence(r, pairs.length)
        });
      }
    }
  }

  return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
}
```

## Output

```typescript
interface CorrelationResult {
  correlations: Array<{
    feature: string;
    rating: string;
    correlation: number;
    sampleSize: number;
    confidence: number;
  }>;
  datasetSize: number;
  calculatedAt: string;
}
```

## Caching

```javascript
async function getCorrelations(forceRecalculate = false) {
  const cachePath = '.pipeline/correlations.json';

  if (!forceRecalculate && await fileExists(cachePath)) {
    const cached = await readJson(cachePath);
    if (Date.now() - new Date(cached.calculatedAt).getTime() < 86400000) {
      return cached;
    }
  }

  const dataset = await loadDataset('.pipeline/learning-dataset.jsonl');
  const result = await calculateCorrelations(dataset);

  await writeJson(cachePath, result);
  return result;
}
```
```

---

## Skill 5: predictor

**Purpose:** Predict ratings based on current patterns and historical correlations

```markdown
---
name: predictor
description: Predict future ratings based on current execution patterns and historical correlation data.
allowed-tools: Read
version: 2.0.0
---

# Predictor Skill

## Purpose

Use learned correlations to predict what ratings a pipeline run is likely to receive, enabling early intervention.

## Input

```typescript
interface PredictorInput {
  features: PipelineFeatures;
  correlations: CorrelationResult;
}
```

## Prediction Method

### Linear Prediction

```javascript
function predictRating(features, correlations, targetRating) {
  const relevant = correlations.correlations
    .filter(c => c.rating === targetRating)
    .slice(0, 5);  // Top 5 predictors

  if (relevant.length === 0) return null;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const corr of relevant) {
    const value = getNestedValue(features, corr.feature);
    if (value === undefined) continue;

    const normalized = normalizeValue(corr.feature, value);
    const weight = Math.abs(corr.correlation);

    // 3 is neutral baseline
    const contribution = corr.correlation > 0
      ? 3 + normalized * 2 * weight
      : 3 - normalized * 2 * weight;

    weightedSum += contribution * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return null;

  return Math.max(1, Math.min(5, weightedSum / totalWeight));
}
```

### Normalization

```javascript
function normalizeValue(featurePath, value) {
  // Normalize to 0-1 range based on historical data
  const stats = getFeatureStats(featurePath);
  if (!stats) return 0.5;

  return Math.max(0, Math.min(1,
    (value - stats.min) / (stats.max - stats.min)
  ));
}
```

## Output

```typescript
interface PredictionResult {
  predictions: {
    overall: number;
    ui_design: number;
    navigation: number;
    performance: number;
    code_quality: number;
    test_coverage: number;
    functionality: number;
  };
  confidence: number;
  warnings: Array<{
    feature: string;
    currentValue: number;
    threshold: number;
    impactedRating: string;
    predictedImpact: string;
  }>;
}
```

## Warning Generation

```javascript
function generateWarnings(features, correlations) {
  const warnings = [];

  for (const corr of correlations.correlations) {
    if (corr.correlation > -0.5) continue;  // Only strong negative

    const value = getNestedValue(features, corr.feature);
    const threshold = getThreshold(corr.feature);

    if (value > threshold) {
      warnings.push({
        feature: corr.feature,
        currentValue: value,
        threshold,
        impactedRating: corr.rating,
        predictedImpact: `${corr.rating} likely to be ${Math.abs(corr.correlation * 2).toFixed(1)} points lower`
      });
    }
  }

  return warnings;
}
```
```

---

## Skill 6: report-generator

**Purpose:** Generate markdown analysis reports

```markdown
---
name: report-generator
description: Generate human-readable analysis reports combining features, ratings, correlations, and insights.
allowed-tools: Write
version: 2.0.0
---

# Report Generator Skill

## Purpose

Create comprehensive markdown reports summarizing analysis results.

## Input

```typescript
interface ReportInput {
  runId: string;
  project: string;
  features: PipelineFeatures;
  ratings: UserRatings;
  correlations: CorrelationResult;
  predictions?: PredictionResult;
}
```

## Report Template

```markdown
# Pipeline Analysis Report

**Project:** ${project}
**Run ID:** ${runId}
**Date:** ${date}

## User Ratings

| Category | Rating | Description |
|----------|--------|-------------|
| Overall | ${ratings.overall}/5 | ${getRatingLabel(ratings.overall)} |
${Object.entries(ratings.categories).map(([k, v]) =>
  `| ${formatCategory(k)} | ${v}/5 | ${getRatingLabel(v)} |`
).join('\n')}

## Feature Summary

### Phase Metrics
${Object.entries(features.phases).map(([p, m]) =>
  `- **Phase ${p}:** ${formatDuration(m.duration)}, ${m.errorCount} errors, ${m.skillCount} skills`
).join('\n')}

### Patterns Detected
- Edit churn: ${features.patterns.editChurn} files
- E2E failures: ${features.patterns.e2eFailures}
- Max file iterations: ${features.patterns.maxFileIterations}
- Skill invocations: ${features.patterns.skillInvocations}

### Violations
${Object.entries(features.violations).filter(([_, v]) => v).map(([k]) =>
  `- ⚠️ ${formatViolation(k)}`
).join('\n') || '✅ No violations detected'}

## Correlation Insights

### Strong Correlations Affecting This Run
${generateInsightsSection(features, ratings, correlations)}

## Recommendations
${generateRecommendations(features, ratings, correlations)}

## Dataset Statistics

- Total entries: ${correlations.datasetSize}
- This project: ${countProjectEntries(project)}
- Average overall rating: ${calculateAvgRating()}

---

*Report generated by Analyzer v2*
```

## Output

Writes report to `.pipeline/analysis/${runId}-report.md`
```

---

## Skill 7: dataset-manager

**Purpose:** Manage the learning dataset (add, query, maintain)

```markdown
---
name: dataset-manager
description: Manage the learning dataset - add entries, query history, maintain data quality.
allowed-tools: Read, Write, Bash
version: 2.0.0
---

# Dataset Manager Skill

## Purpose

CRUD operations on the learning dataset with data validation and maintenance.

## Operations

### Add Entry

```javascript
async function addEntry(entry) {
  // Validate entry
  const errors = validateEntry(entry);
  if (errors.length > 0) {
    throw new Error(`Invalid entry: ${errors.join(', ')}`);
  }

  // Append to dataset
  const line = JSON.stringify(entry) + '\n';
  await fs.appendFile('.pipeline/learning-dataset.jsonl', line);

  // Trigger correlation recalculation if needed
  const count = await countEntries();
  if (count % 10 === 0) {
    await recalculateCorrelations();
  }

  return { success: true, totalEntries: count };
}
```

### Query Entries

```javascript
async function queryEntries(filters = {}) {
  const dataset = await loadDataset();

  return dataset.filter(entry => {
    if (filters.project && entry.project !== filters.project) return false;
    if (filters.minRating && entry.ratings.overall < filters.minRating) return false;
    if (filters.maxRating && entry.ratings.overall > filters.maxRating) return false;
    if (filters.after && new Date(entry.timestamp) < new Date(filters.after)) return false;
    return true;
  });
}
```

### Get Statistics

```javascript
async function getStatistics() {
  const dataset = await loadDataset();

  return {
    totalEntries: dataset.length,
    projectCounts: countBy(dataset, 'project'),
    avgOverallRating: avg(dataset.map(d => d.ratings.overall)),
    ratingDistribution: countBy(dataset, d => d.ratings.overall),
    oldestEntry: dataset[0]?.timestamp,
    newestEntry: dataset[dataset.length - 1]?.timestamp
  };
}
```

### Maintenance

```javascript
async function cleanupDataset() {
  const dataset = await loadDataset();

  // Remove invalid entries
  const valid = dataset.filter(entry => {
    const errors = validateEntry(entry);
    return errors.length === 0;
  });

  // Backup and rewrite
  await fs.copyFile(
    '.pipeline/learning-dataset.jsonl',
    `.pipeline/learning-dataset.backup.${Date.now()}.jsonl`
  );

  await fs.writeFile(
    '.pipeline/learning-dataset.jsonl',
    valid.map(e => JSON.stringify(e)).join('\n') + '\n'
  );

  return {
    original: dataset.length,
    cleaned: valid.length,
    removed: dataset.length - valid.length
  };
}
```
```

---

## Skill 8: insight-generator

**Purpose:** Generate human-readable insights from correlations

```markdown
---
name: insight-generator
description: Generate human-readable insights and recommendations from correlation analysis.
allowed-tools: Read
version: 2.0.0
---

# Insight Generator Skill

## Purpose

Transform statistical correlations into actionable insights and recommendations.

## Insight Types

### Pattern Impact Insights

```javascript
function generatePatternInsight(corr, currentValue) {
  const strength = Math.abs(corr.correlation);
  const direction = corr.correlation > 0 ? 'positive' : 'negative';
  const strengthLabel = strength > 0.7 ? 'strongly' : strength > 0.5 ? 'moderately' : 'weakly';

  return {
    type: 'pattern_impact',
    feature: corr.feature,
    rating: corr.rating,
    message: `${formatFeature(corr.feature)} is ${strengthLabel} ${direction}ly ` +
             `correlated with ${corr.rating} (r=${corr.correlation.toFixed(2)}). ` +
             `Current value: ${currentValue}.`,
    actionable: Math.abs(corr.correlation) > 0.5
  };
}
```

### Violation Warnings

```javascript
function generateViolationInsight(violation, correlations) {
  const impacted = correlations.filter(c =>
    c.feature.includes(violation) && c.correlation < -0.3
  );

  return {
    type: 'violation_warning',
    violation,
    message: `⚠️ ${formatViolation(violation)} detected. ` +
             `This typically impacts: ${impacted.map(c => c.rating).join(', ')}.`,
    severity: 'high',
    actionable: true
  };
}
```

### Comparison Insights

```javascript
function generateComparisonInsight(features, avgFeatures) {
  const insights = [];

  for (const [path, value] of Object.entries(flattenFeatures(features))) {
    const avg = avgFeatures[path];
    if (!avg) continue;

    const diff = (value - avg) / avg;
    if (Math.abs(diff) > 0.5) {
      insights.push({
        type: 'comparison',
        feature: path,
        currentValue: value,
        averageValue: avg,
        message: `${formatFeature(path)} is ${Math.abs(diff * 100).toFixed(0)}% ` +
                 `${diff > 0 ? 'higher' : 'lower'} than average.`
      });
    }
  }

  return insights;
}
```

## Recommendation Generation

```javascript
function generateRecommendations(insights) {
  const recommendations = [];

  for (const insight of insights) {
    if (!insight.actionable) continue;

    if (insight.type === 'pattern_impact' && insight.correlation < -0.5) {
      recommendations.push({
        priority: 'high',
        target: insight.feature,
        action: `Reduce ${formatFeature(insight.feature)} in future runs`,
        rationale: `High values correlate with lower ${insight.rating} ratings`
      });
    }

    if (insight.type === 'violation_warning') {
      recommendations.push({
        priority: 'critical',
        target: insight.violation,
        action: `Address ${insight.violation} before shipping`,
        rationale: insight.message
      });
    }
  }

  return recommendations.sort((a, b) =>
    priorityOrder[a.priority] - priorityOrder[b.priority]
  );
}
```
```

---

## Analyzer Agent CLAUDE.md

When the analyzer runs as an agent:

```markdown
# Analyzer Agent

**Purpose:** Analyze completed pipelines and correlate patterns with outcomes

## Required Skills

Invoke in this order:
1. `transcript-parser` - Parse all phase transcripts
2. `feature-extractor` - Extract quantitative features
3. `rating-collector` - Collect user ratings (if not provided)
4. `correlator` - Calculate/load correlations
5. `insight-generator` - Generate insights
6. `report-generator` - Create analysis report
7. `dataset-manager` - Store entry in dataset

## Process

1. Wait for pipeline completion signal
2. Parse all phase transcripts
3. Extract features from parsed data
4. Prompt user for ratings (if not already provided)
5. Load existing correlations (or calculate if dataset large enough)
6. Generate insights by comparing features to correlations
7. Generate recommendations
8. Create markdown report
9. Store entry in learning dataset
10. Update manifest with analysis results

## Rules

- NEVER modify source files - analysis is read-only
- ALWAYS validate user ratings (1-5 range)
- ALWAYS cite specific evidence for insights
- REQUIRE minimum 10 entries for correlation analysis
- CACHE correlations (recalculate daily or every 10 entries)
```

---

## Implementation Status

| Skill | Status |
|-------|--------|
| transcript-parser | ❌ Not started |
| feature-extractor | ❌ Not started |
| rating-collector | ❌ Not started |
| correlator | ❌ Not started |
| predictor | ❌ Not started |
| report-generator | ❌ Not started |
| dataset-manager | ❌ Not started |
| insight-generator | ❌ Not started |

---

## Version History

| Date | Change |
|------|--------|
| 2026-01-12 | Complete redesign for outcome-based learning approach |
