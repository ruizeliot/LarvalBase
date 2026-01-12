# Outcome Correlation Specification

**Version:** v11
**Created:** 2026-01-12
**Status:** Design Draft
**Related:** [15-analyzer-v2-design.md](./15-analyzer-v2-design.md)

---

## Overview

This document specifies how pipeline execution patterns are correlated with user-rated outcomes. The goal is to learn which patterns lead to good or bad results, enabling predictions and interventions in future pipelines.

---

## 1. Likert Scale Definition

### Rating Scale

All ratings use a 1-5 Likert scale:

| Score | Label | Meaning |
|-------|-------|---------|
| 1 | Very Poor | Fundamentally broken, unusable |
| 2 | Poor | Major issues, barely functional |
| 3 | Acceptable | Works but has noticeable problems |
| 4 | Good | Works well, minor issues only |
| 5 | Excellent | Exceptional quality, no complaints |

### Rating Categories

| Category | ID | What It Measures |
|----------|-----|------------------|
| **Overall** | `overall` | General satisfaction with the entire app |
| **UI/Design** | `ui_design` | Visual aesthetics, polish, consistency |
| **Navigation** | `navigation` | User flow, intuitiveness, findability |
| **Performance** | `performance` | Speed, responsiveness, smoothness |
| **Code Quality** | `code_quality` | Maintainability, structure, readability |
| **Test Coverage** | `test_coverage` | Test thoroughness, confidence level |
| **Functionality** | `functionality` | Features work as expected |

### Component-Level Ratings

Users can optionally rate specific app components:

```typescript
interface ComponentRating {
  componentId: string;    // e.g., "sidebar", "drag_drop", "settings"
  rating: number;         // 1-5
  notes?: string;         // Optional explanation
}
```

---

## 2. Feature Categories

Features extracted from transcripts are organized into categories:

### Category A: Phase Metrics

Per-phase quantitative data:

| Feature | Type | Description |
|---------|------|-------------|
| `phase.N.duration` | number | Time in milliseconds |
| `phase.N.cost` | number | Token cost in $ |
| `phase.N.todoCount` | number | Total todos in phase |
| `phase.N.errorCount` | number | Tool results with errors |
| `phase.N.iterationCount` | number | Retries/loops detected |
| `phase.N.skillCount` | number | Skills invoked |

### Category B: Pattern Counts

Aggregate patterns across all phases:

| Feature | Type | Description | Detection |
|---------|------|-------------|-----------|
| `patterns.editChurn` | number | Repeated edits on same file | >3 edits on same file in 5 min |
| `patterns.e2eFailures` | number | E2E test failures | "wdio"/"webdriver" in error |
| `patterns.searchAfterError` | number | WebSearch following errors | WebSearch within 3 calls of error |
| `patterns.maxFileIterations` | number | Max edits on single file | Peak edit count on any file |
| `patterns.phaseRestarts` | number | Phases that needed restart | Phase attempts > 1 |
| `patterns.specModifications` | number | Edits to spec files | Edit on user-stories.md/test-specs.md |
| `patterns.emptyHandlers` | number | Placeholder handlers | `onClick={() => {}}` in Edit |
| `patterns.mockUsage` | number | Mock/stub usage | `jest.mock`/`vi.mock` in Edit |
| `patterns.skillInvocations` | number | Total skill invocations | Skill tool calls |

### Category C: Derived Metrics

Calculated from raw data:

| Feature | Formula | Meaning |
|---------|---------|---------|
| `derived.avgTimePerTodo` | totalDuration / todoCount | Efficiency indicator |
| `derived.errorRate` | errorCount / totalToolCalls | Struggle indicator |
| `derived.searchRate` | searchCount / errorCount | Rule 1 compliance |
| `derived.skillCoverage` | invokedSkills / expectedSkills | Skill usage rate |
| `derived.churnRate` | editChurn / totalEdits | Code stability |
| `derived.retryRate` | retries / attempts | Success rate |

### Category D: Violation Flags

Binary indicators of rule violations:

| Feature | Type | Trigger |
|---------|------|---------|
| `violations.hasEmptyHandlers` | boolean | emptyHandlers > 0 |
| `violations.hasMocks` | boolean | mockUsage > 0 |
| `violations.hasSpecModifications` | boolean | specModifications > 0 in Phase 4/5 |
| `violations.hasSkillGaps` | boolean | skillCoverage < 0.5 |

---

## 3. Feature Extraction Implementation

### Phase Metrics Extraction

```javascript
function extractPhaseMetrics(events, phaseNumber) {
  const startTime = new Date(events[0].timestamp).getTime();
  const endTime = new Date(events[events.length - 1].timestamp).getTime();

  return {
    duration: endTime - startTime,
    todoCount: countTodoTransitions(events),
    errorCount: events.filter(e =>
      e.type === 'tool_result' && containsError(e.result)
    ).length,
    iterationCount: detectIterationLoops(events),
    skillCount: events.filter(e =>
      e.type === 'tool_call' && e.tool === 'Skill'
    ).length
  };
}
```

### Pattern Detection

```javascript
function extractPatterns(allEvents) {
  const patterns = {
    editChurn: 0,
    e2eFailures: 0,
    searchAfterError: 0,
    maxFileIterations: 0,
    phaseRestarts: 0,
    specModifications: 0,
    emptyHandlers: 0,
    mockUsage: 0,
    skillInvocations: 0
  };

  // Edit churn detection
  const editsByFile = {};
  for (const event of allEvents) {
    if (event.type === 'tool_call' && event.tool === 'Edit') {
      const file = event.input?.file_path;
      editsByFile[file] = (editsByFile[file] || 0) + 1;
    }
  }
  patterns.editChurn = Object.values(editsByFile)
    .filter(count => count > 3).length;
  patterns.maxFileIterations = Math.max(...Object.values(editsByFile), 0);

  // E2E failures
  const e2eKeywords = ['wdio', 'webdriver', 'e2e', 'selenium'];
  for (const event of allEvents) {
    if (event.type === 'tool_result' && containsError(event.result)) {
      if (e2eKeywords.some(kw => event.result.toLowerCase().includes(kw))) {
        patterns.e2eFailures++;
      }
    }
  }

  // Empty handlers
  const emptyPatterns = ['onClick={() => {}}', 'onChange={() => {}}'];
  for (const event of allEvents) {
    if (event.type === 'tool_call' && event.tool === 'Edit') {
      const content = event.input?.new_string || '';
      if (emptyPatterns.some(p => content.includes(p))) {
        patterns.emptyHandlers++;
      }
    }
  }

  // Mock usage
  const mockPatterns = ['jest.mock', 'vi.mock', 'mockImplementation'];
  for (const event of allEvents) {
    if (event.type === 'tool_call' && event.tool === 'Edit') {
      const content = event.input?.new_string || '';
      if (mockPatterns.some(p => content.includes(p))) {
        patterns.mockUsage++;
      }
    }
  }

  // Skill invocations
  patterns.skillInvocations = allEvents.filter(e =>
    e.type === 'tool_call' && e.tool === 'Skill'
  ).length;

  return patterns;
}
```

### Derived Metrics Calculation

```javascript
function calculateDerivedMetrics(phaseMetrics, patterns, toolCounts) {
  const totalDuration = Object.values(phaseMetrics)
    .reduce((sum, p) => sum + p.duration, 0);
  const totalTodos = Object.values(phaseMetrics)
    .reduce((sum, p) => sum + p.todoCount, 0);
  const totalErrors = Object.values(phaseMetrics)
    .reduce((sum, p) => sum + p.errorCount, 0);
  const totalToolCalls = Object.values(toolCounts)
    .reduce((sum, c) => sum + c, 0);
  const totalEdits = toolCounts.Edit || 0;

  return {
    avgTimePerTodo: totalTodos > 0 ? totalDuration / totalTodos : 0,
    errorRate: totalToolCalls > 0 ? totalErrors / totalToolCalls : 0,
    searchRate: totalErrors > 0 ? patterns.searchAfterError / totalErrors : 1,
    skillCoverage: calculateSkillCoverage(phaseMetrics),
    churnRate: totalEdits > 0 ? patterns.editChurn / totalEdits : 0,
    retryRate: calculateRetryRate(phaseMetrics)
  };
}
```

---

## 4. Correlation Methods

### Pearson Correlation

For continuous features vs ratings:

```javascript
function pearsonCorrelation(x, y) {
  const n = x.length;
  if (n !== y.length || n < 3) return 0;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
  );

  return denominator === 0 ? 0 : numerator / denominator;
}
```

### Point-Biserial Correlation

For binary features (violations) vs ratings:

```javascript
function pointBiserialCorrelation(binary, continuous) {
  const group1 = continuous.filter((_, i) => binary[i]);
  const group0 = continuous.filter((_, i) => !binary[i]);

  if (group1.length === 0 || group0.length === 0) return 0;

  const mean1 = group1.reduce((a, b) => a + b, 0) / group1.length;
  const mean0 = group0.reduce((a, b) => a + b, 0) / group0.length;
  const std = standardDeviation(continuous);
  const p = group1.length / continuous.length;

  return std === 0 ? 0 : (mean1 - mean0) / std * Math.sqrt(p * (1 - p));
}
```

### Correlation Interpretation

| Correlation (r) | Strength | Meaning |
|-----------------|----------|---------|
| 0.7 to 1.0 | Strong positive | Feature increase → rating increase |
| 0.4 to 0.7 | Moderate positive | Some positive relationship |
| 0.1 to 0.4 | Weak positive | Slight tendency |
| -0.1 to 0.1 | None | No relationship |
| -0.4 to -0.1 | Weak negative | Slight inverse tendency |
| -0.7 to -0.4 | Moderate negative | Some inverse relationship |
| -1.0 to -0.7 | Strong negative | Feature increase → rating decrease |

---

## 5. Analysis Pipeline

### Step 1: Collect Data Entry

```javascript
async function createDataEntry(pipelineId, transcriptPaths, manifest, ratings) {
  // Extract features from all phase transcripts
  const allEvents = [];
  const phaseMetrics = {};

  for (const [phase, path] of Object.entries(transcriptPaths)) {
    const events = await parseTranscript(path);
    allEvents.push(...events);
    phaseMetrics[phase] = extractPhaseMetrics(events, phase);
  }

  const patterns = extractPatterns(allEvents);
  const toolCounts = countAllTools(allEvents);
  const derived = calculateDerivedMetrics(phaseMetrics, patterns, toolCounts);

  return {
    id: pipelineId,
    timestamp: new Date().toISOString(),
    project: manifest.project.name,
    mode: manifest.mode,
    stack: manifest.stack,
    features: {
      phases: phaseMetrics,
      patterns,
      derived,
      violations: {
        hasEmptyHandlers: patterns.emptyHandlers > 0,
        hasMocks: patterns.mockUsage > 0,
        hasSpecModifications: patterns.specModifications > 0,
        hasSkillGaps: derived.skillCoverage < 0.5
      }
    },
    ratings
  };
}
```

### Step 2: Store in Dataset

```javascript
async function appendToDataset(entry) {
  const datasetPath = '.pipeline/learning-dataset.jsonl';
  const line = JSON.stringify(entry) + '\n';

  await fs.appendFile(datasetPath, line);

  // Update cached correlations if dataset grew significantly
  const lineCount = await countLines(datasetPath);
  if (lineCount % 10 === 0) {
    await recalculateCorrelations();
  }
}
```

### Step 3: Calculate Correlations

```javascript
async function calculateAllCorrelations() {
  const dataset = await loadDataset();
  if (dataset.length < 10) {
    return { status: 'insufficient_data', count: dataset.length };
  }

  const correlations = [];
  const featureNames = flattenFeatureNames(dataset[0].features);
  const ratingNames = ['overall', ...Object.keys(dataset[0].ratings.categories)];

  for (const feature of featureNames) {
    const featureValues = dataset.map(d => getNestedValue(d.features, feature));

    // Skip if all values are the same (no variance)
    if (new Set(featureValues).size < 2) continue;

    for (const rating of ratingNames) {
      const ratingValues = dataset.map(d =>
        rating === 'overall' ? d.ratings.overall : d.ratings.categories[rating]
      );

      const r = typeof featureValues[0] === 'boolean'
        ? pointBiserialCorrelation(featureValues, ratingValues)
        : pearsonCorrelation(featureValues, ratingValues);

      if (Math.abs(r) > 0.3) {
        correlations.push({
          feature,
          rating,
          correlation: r,
          sampleSize: dataset.length,
          confidence: calculateConfidence(r, dataset.length)
        });
      }
    }
  }

  return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
}
```

### Step 4: Generate Insights

```javascript
function generateInsights(correlations, currentEntry) {
  const insights = [];

  for (const corr of correlations) {
    if (Math.abs(corr.correlation) < 0.4) continue;

    const currentValue = getNestedValue(currentEntry.features, corr.feature);
    const currentRating = corr.rating === 'overall'
      ? currentEntry.ratings.overall
      : currentEntry.ratings.categories[corr.rating];

    const direction = corr.correlation > 0 ? 'positive' : 'negative';
    const strength = Math.abs(corr.correlation) > 0.7 ? 'strong' : 'moderate';

    insights.push({
      feature: corr.feature,
      rating: corr.rating,
      currentValue,
      currentRating,
      correlation: corr.correlation,
      insight: `${corr.feature} has ${strength} ${direction} correlation with ${corr.rating} (r=${corr.correlation.toFixed(2)})`,
      recommendation: generateRecommendation(corr, currentValue, currentRating)
    });
  }

  return insights;
}

function generateRecommendation(corr, currentValue, currentRating) {
  if (corr.correlation < -0.5 && currentRating < 3) {
    return `Consider reducing ${corr.feature} in future runs. ` +
           `High values correlate with lower ${corr.rating} ratings.`;
  }
  if (corr.correlation > 0.5 && currentRating >= 4) {
    return `Good! Higher ${corr.feature} correlates with better ${corr.rating} ratings.`;
  }
  return null;
}
```

---

## 6. Prediction Model

### Simple Linear Prediction

For pipelines with enough data, predict ratings:

```javascript
function predictRating(features, correlations, targetRating) {
  const relevantCorrs = correlations.filter(c => c.rating === targetRating);
  if (relevantCorrs.length === 0) return null;

  // Weighted average based on correlation strength
  let weightedSum = 0;
  let totalWeight = 0;

  for (const corr of relevantCorrs.slice(0, 5)) { // Top 5 predictors
    const featureValue = getNestedValue(features, corr.feature);
    const normalizedValue = normalizeFeature(corr.feature, featureValue);
    const weight = Math.abs(corr.correlation);

    // Predict contribution to rating (3 = neutral baseline)
    const contribution = corr.correlation > 0
      ? 3 + normalizedValue * 2 * weight
      : 3 - normalizedValue * 2 * weight;

    weightedSum += contribution * weight;
    totalWeight += weight;
  }

  const prediction = totalWeight > 0 ? weightedSum / totalWeight : 3;
  return Math.max(1, Math.min(5, prediction));
}
```

### Confidence Scoring

```javascript
function calculateConfidence(correlation, sampleSize) {
  // Based on sample size and correlation strength
  const sizeConfidence = Math.min(1, sampleSize / 50);
  const strengthConfidence = Math.abs(correlation);

  return (sizeConfidence * 0.4 + strengthConfidence * 0.6);
}
```

---

## 7. Output Schemas

### Correlation Entry

```typescript
interface CorrelationEntry {
  feature: string;           // e.g., "patterns.editChurn"
  rating: string;            // e.g., "navigation"
  correlation: number;       // -1.0 to 1.0
  sampleSize: number;        // Number of data points
  confidence: number;        // 0.0 to 1.0
}
```

### Insight Entry

```typescript
interface InsightEntry {
  feature: string;
  rating: string;
  currentValue: number;
  currentRating: number;
  correlation: number;
  insight: string;
  recommendation: string | null;
}
```

### Analysis Report

```typescript
interface AnalysisReport {
  runId: string;
  timestamp: string;
  project: string;

  ratings: {
    overall: number;
    categories: Record<string, number>;
    components?: Record<string, { rating: number; notes?: string }>;
  };

  features: PipelineFeatures;

  correlationInsights: InsightEntry[];

  predictions?: {
    nextRunPredictions: Record<string, number>;
    confidence: number;
  };

  recommendations: string[];

  datasetStats: {
    totalEntries: number;
    projectEntries: number;
    avgOverallRating: number;
  };
}
```

---

## 8. Integration Points

### With Orchestrator

```javascript
// In orchestrator, after pipeline completion
async function onPipelineComplete() {
  // 1. Collect user ratings
  const ratings = await collectUserRatings();

  // 2. Create analysis entry
  const entry = await createDataEntry(
    manifest.runId,
    getTranscriptPaths(),
    manifest,
    ratings
  );

  // 3. Store in dataset
  await appendToDataset(entry);

  // 4. Generate report
  const correlations = await loadCorrelations();
  const insights = generateInsights(correlations, entry);

  // 5. Save report
  await saveAnalysisReport(entry, insights);

  // 6. Update manifest
  manifest.analysis = {
    completed: true,
    reportPath: `.pipeline/analysis/${manifest.runId}-report.md`
  };
}
```

### With Dashboard

Dashboard can display:
- Current run's ratings
- Predicted ratings (if data available)
- Top correlations
- Recommendations

---

## 9. Storage Locations

| File | Purpose |
|------|---------|
| `.pipeline/learning-dataset.jsonl` | All pipeline run data |
| `.pipeline/correlations.json` | Cached correlation analysis |
| `.pipeline/analysis/[run-id]-report.md` | Per-run analysis report |

---

## Implementation Status

| Component | Status |
|-----------|--------|
| Feature extraction | ❌ Not started |
| Correlation calculation | ❌ Not started |
| Prediction model | ❌ Not started |
| Dataset storage | ❌ Not started |
| Report generation | ❌ Not started |

---

## Version History

| Date | Change |
|------|--------|
| 2026-01-12 | Complete redesign: outcome-based correlation (replaces skill-gap-detection) |
