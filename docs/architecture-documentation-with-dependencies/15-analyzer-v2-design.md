# Analyzer v2: Outcome-Based Learning System

**Version:** v11
**Created:** 2026-01-12
**Status:** Design Draft

---

## Overview

The Analyzer v2 is a **reinforcement learning system** that correlates pipeline execution patterns with user-rated outcomes. Instead of analyzing after each phase, it analyzes once the **entire pipeline is complete**, using user feedback as ground truth to learn what patterns lead to good or bad results.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ANALYZER V2: OUTCOME-BASED LEARNING                   │
└─────────────────────────────────────────────────────────────────────────┘

     PIPELINE EXECUTION                    USER FEEDBACK
     ┌─────────────────┐                   ┌─────────────────┐
     │ Phase 1         │                   │ Likert Ratings  │
     │ Phase 2         │                   │ ┌─────────────┐ │
     │ Phase 3         │                   │ │Overall:  4  │ │
     │ Phase 4         │                   │ │UI:       5  │ │
     │ Phase 5         │                   │ │Nav:      2  │ │
     │                 │                   │ │Perf:     3  │ │
     └────────┬────────┘                   └───────┬───────┘
              │                                    │
              │         FULL CONTEXT               │
              └────────────────┬───────────────────┘
                               │
                               ▼
              ┌─────────────────────────────────┐
              │     END-OF-PIPELINE ANALYSIS     │
              │                                  │
              │  • Extract execution patterns    │
              │  • Correlate with ratings        │
              │  • Identify what worked/failed   │
              │  • Update learning dataset       │
              └─────────────────────────────────┘
                               │
                               ▼
              ┌─────────────────────────────────┐
              │      ACCUMULATED KNOWLEDGE       │
              │                                  │
              │  Pattern X → Good outcomes       │
              │  Pattern Y → Bad outcomes        │
              │                                  │
              │  Used to improve future runs     │
              └─────────────────────────────────┘
```

---

## Why End-of-Pipeline Analysis?

### Previous Approach (Per-Phase)
```
Phase 1 → Analyze → Phase 2 → Analyze → Phase 3 → Analyze → ...
         ↑                    ↑                    ↑
    Partial context     Partial context      Partial context
    No outcome data     No outcome data      No outcome data
```

**Problems:**
- No ground truth (don't know if app will be good)
- Analyzing "struggles" subjectively
- Can't see how early decisions affect final quality
- No learning across pipelines

### New Approach (End-of-Pipeline)
```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → USER RATING → ANALYZE
                                                       ↑            ↑
                                                 Ground truth   Full context
```

**Benefits:**
- User rating provides objective ground truth
- Full context: see entire execution history
- Can correlate early patterns with final outcomes
- Build dataset over time for learning

---

## Core Concept: Supervised Learning Loop

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRAINING DATA COLLECTION                      │
│                                                                  │
│   Pipeline Run N:                                                │
│   ┌────────────────────┐     ┌────────────────────┐             │
│   │ Features (X)       │     │ Labels (Y)         │             │
│   │ • Tool sequences   │     │ • Overall: 4       │             │
│   │ • Edit patterns    │     │ • UI Design: 5     │             │
│   │ • Error counts     │     │ • Navigation: 2    │             │
│   │ • Time per phase   │     │ • Performance: 3   │             │
│   │ • Skill invocations│     │ • Code Quality: 4  │             │
│   │ • Iteration counts │     │                    │             │
│   └────────────────────┘     └────────────────────┘             │
│                                                                  │
│   Stored in: .pipeline/learning-dataset.jsonl                   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PATTERN CORRELATION                           │
│                                                                  │
│   After N pipelines, analyze correlations:                      │
│                                                                  │
│   "When Phase 4 has >5 iterations on same file,                 │
│    Navigation rating drops by 1.2 points on average"            │
│                                                                  │
│   "When Tauri skill invoked in Phase 3,                         │
│    Code Quality rating increases by 0.8 points"                 │
│                                                                  │
│   "When E2E tests fail >3 times before passing,                 │
│    Overall rating is 0.5 points lower"                          │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FUTURE PREDICTIONS                            │
│                                                                  │
│   During Pipeline Run N+1:                                      │
│                                                                  │
│   "Detected pattern X in Phase 3 transcript"                    │
│   "Historical data shows Pattern X correlates with -1.5 Nav"    │
│   "RECOMMENDATION: Consider intervention"                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## User Feedback: Likert Scale

### Rating Categories

After pipeline completion, user provides ratings on 1-5 scale:

| Category | What It Measures | Example Good (5) | Example Bad (1) |
|----------|------------------|------------------|-----------------|
| **Overall** | General satisfaction | "Exactly what I wanted" | "Unusable" |
| **UI/Design** | Visual quality, aesthetics | "Beautiful, polished" | "Ugly, inconsistent" |
| **Navigation** | Flow, intuitiveness | "Easy to find everything" | "Confusing, lost often" |
| **Performance** | Speed, responsiveness | "Instant, smooth" | "Laggy, freezing" |
| **Code Quality** | Maintainability, structure | "Clean, well-organized" | "Spaghetti code" |
| **Test Coverage** | Confidence in tests | "Thorough, catches bugs" | "Tests are meaningless" |
| **Functionality** | Features work as expected | "Everything works" | "Broken features" |

### Component-Level Feedback

User can also rate specific components:

```json
{
  "overallRating": 4,
  "categoryRatings": {
    "ui_design": 5,
    "navigation": 2,
    "performance": 3,
    "code_quality": 4,
    "test_coverage": 4,
    "functionality": 4
  },
  "componentRatings": {
    "sidebar": { "rating": 5, "notes": "Love the design" },
    "drag_drop": { "rating": 2, "notes": "Feels janky" },
    "settings_page": { "rating": 4, "notes": "Works well" }
  },
  "freeformFeedback": "Great app overall but navigation between screens is confusing"
}
```

### Feedback Collection Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     PIPELINE COMPLETE                            │
│                                                                  │
│   Dashboard shows: "Pipeline Complete! Please rate the app"     │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     USER TESTING                                 │
│                                                                  │
│   User tests the built app (APK, executable, etc.)              │
│   Takes time to evaluate all aspects                            │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     RATING INTERFACE                             │
│                                                                  │
│   Orchestrator prompts (or dedicated UI):                       │
│                                                                  │
│   "How would you rate the overall app? (1-5)"                   │
│   "How would you rate the UI/Design? (1-5)"                     │
│   "How would you rate the Navigation? (1-5)"                    │
│   ...                                                            │
│   "Any specific components that were good or bad?"              │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ANALYSIS TRIGGERED                           │
│                                                                  │
│   Analyzer runs with:                                           │
│   • Full transcript (all phases)                                │
│   • User ratings (ground truth)                                 │
│   • Component-level feedback                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Feature Extraction from Transcripts

### What We Extract (Features/X)

```typescript
interface PipelineFeatures {
  // Phase-level metrics
  phases: {
    [phase: number]: {
      duration: number;           // Time taken
      cost: number;               // Token cost
      todoCount: number;          // Number of todos
      iterationCount: number;     // Retries/loops
      errorCount: number;         // Errors encountered
      skillsInvoked: string[];    // Which skills used
      toolDistribution: Record<string, number>;  // Tool usage
    }
  };

  // Aggregate patterns
  patterns: {
    totalEditChurn: number;       // Total repeated edits
    totalSearches: number;        // WebSearch calls
    e2eFailures: number;          // E2E test failures before pass
    maxIterationsOnFile: number;  // Highest edit count on single file
    phaseRestarts: number;        // How many phases needed restart
    specModifications: number;    // Edits to spec files (violations)
    emptyHandlers: number;        // Placeholder violations
    mockUsage: number;            // Mock violations
  };

  // Derived metrics
  derived: {
    avgTimePerTodo: number;
    errorRate: number;            // errors / total tool calls
    searchRate: number;           // searches / errors (Rule 1)
    skillCoverage: number;        // invoked / expected skills
  };
}
```

### Feature Extraction Process

```javascript
async function extractFeatures(transcriptPaths, manifest) {
  const features = {
    phases: {},
    patterns: {
      totalEditChurn: 0,
      totalSearches: 0,
      e2eFailures: 0,
      maxIterationsOnFile: 0,
      phaseRestarts: 0,
      specModifications: 0,
      emptyHandlers: 0,
      mockUsage: 0
    },
    derived: {}
  };

  for (const [phase, path] of Object.entries(transcriptPaths)) {
    const events = await parseTranscript(path);

    features.phases[phase] = {
      duration: calculateDuration(events),
      cost: manifest.phases[phase].cost,
      todoCount: countTodos(events),
      iterationCount: countIterations(events),
      errorCount: countErrors(events),
      skillsInvoked: extractSkillInvocations(events),
      toolDistribution: countTools(events)
    };

    // Accumulate patterns
    features.patterns.totalEditChurn += countEditChurn(events);
    features.patterns.e2eFailures += countE2EFailures(events);
    features.patterns.maxIterationsOnFile = Math.max(
      features.patterns.maxIterationsOnFile,
      findMaxEditsOnFile(events)
    );
    // ... more pattern extraction
  }

  // Calculate derived metrics
  features.derived = calculateDerivedMetrics(features);

  return features;
}
```

---

## Dataset Structure

### Learning Dataset File

All pipeline runs are stored in `.pipeline/learning-dataset.jsonl`:

```jsonl
{"id":"run-001","timestamp":"2026-01-12T10:00:00Z","project":"counter-app","features":{...},"ratings":{...}}
{"id":"run-002","timestamp":"2026-01-13T14:30:00Z","project":"todo-app","features":{...},"ratings":{...}}
{"id":"run-003","timestamp":"2026-01-14T09:15:00Z","project":"counter-app","features":{...},"ratings":{...}}
```

### Single Entry Schema

```typescript
interface DatasetEntry {
  id: string;                    // Unique run ID
  timestamp: string;             // When pipeline completed
  project: string;               // Project name
  mode: 'new' | 'feature';       // Pipeline mode
  stack: 'desktop' | 'unity' | 'android';  // Tech stack

  features: PipelineFeatures;    // Extracted features (X)

  ratings: {                     // User ratings (Y)
    overall: number;             // 1-5
    categories: Record<string, number>;
    components: Record<string, { rating: number; notes?: string }>;
    freeform?: string;
  };
}
```

---

## Correlation Analysis

### Statistical Correlation

After collecting N pipeline runs, analyze correlations:

```javascript
async function analyzeCorrelations(dataset) {
  const correlations = [];

  // For each feature, calculate correlation with each rating
  const featureNames = extractFeatureNames(dataset[0].features);
  const ratingNames = ['overall', ...Object.keys(dataset[0].ratings.categories)];

  for (const feature of featureNames) {
    for (const rating of ratingNames) {
      const featureValues = dataset.map(d => getFeatureValue(d.features, feature));
      const ratingValues = dataset.map(d => getRatingValue(d.ratings, rating));

      const correlation = pearsonCorrelation(featureValues, ratingValues);

      if (Math.abs(correlation) > 0.3) {  // Significant correlation
        correlations.push({
          feature,
          rating,
          correlation,
          direction: correlation > 0 ? 'positive' : 'negative',
          interpretation: generateInterpretation(feature, rating, correlation)
        });
      }
    }
  }

  return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
}

function generateInterpretation(feature, rating, correlation) {
  const direction = correlation > 0 ? 'higher' : 'lower';
  const impact = Math.abs(correlation) > 0.7 ? 'strongly' :
                 Math.abs(correlation) > 0.5 ? 'moderately' : 'weakly';

  return `${feature} is ${impact} correlated with ${rating} rating ` +
         `(r=${correlation.toFixed(2)}). More ${feature} → ${direction} ${rating}.`;
}
```

### Example Correlations

After analyzing 50 pipeline runs:

| Feature | Rating | Correlation | Interpretation |
|---------|--------|-------------|----------------|
| `patterns.e2eFailures` | Navigation | -0.72 | More E2E failures → lower Nav rating |
| `patterns.totalEditChurn` | Code Quality | -0.65 | More edit churn → lower quality |
| `phases.4.skillsInvoked.length` | Overall | +0.58 | More skills → higher overall |
| `derived.searchRate` | Functionality | +0.54 | More research → better function |
| `patterns.maxIterationsOnFile` | Performance | -0.48 | File thrashing → lower perf |

---

## Using Learned Insights

### During Future Pipelines

The accumulated knowledge can be used to:

1. **Predict outcomes** - Estimate final ratings based on current patterns
2. **Trigger interventions** - Alert when patterns suggest bad outcome
3. **Recommend actions** - Suggest skills or approaches based on success patterns

```javascript
async function checkCurrentPatterns(currentTranscript, learnedCorrelations) {
  const currentFeatures = extractFeaturesFromPartialTranscript(currentTranscript);
  const warnings = [];

  for (const corr of learnedCorrelations) {
    if (corr.correlation < -0.5) {  // Strong negative correlation
      const currentValue = getFeatureValue(currentFeatures, corr.feature);
      const threshold = getHistoricalAverage(corr.feature) * 1.5;

      if (currentValue > threshold) {
        warnings.push({
          pattern: corr.feature,
          currentValue,
          threshold,
          predictedImpact: `${corr.rating} rating likely to be ${Math.abs(corr.correlation * 2).toFixed(1)} points lower`,
          recommendation: getRecommendation(corr.feature)
        });
      }
    }
  }

  return warnings;
}
```

### Intervention Example

```
┌─────────────────────────────────────────────────────────────────┐
│ ⚠️  PATTERN WARNING (Phase 4)                                    │
│                                                                  │
│ Detected: 8 edits on src/components/DragDrop.tsx in 5 minutes   │
│                                                                  │
│ Historical data shows:                                          │
│ • maxIterationsOnFile > 6 correlates with Navigation -1.2 pts   │
│ • Similar patterns in past runs led to "janky" feedback         │
│                                                                  │
│ Recommendation:                                                  │
│ • Invoke systematic-debugging skill                             │
│ • Step back and research drag-drop patterns                     │
│ • Consider alternative implementation approach                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Analysis Report Format

### End-of-Pipeline Report

```markdown
# Pipeline Analysis Report

**Project:** counter-desktop
**Run ID:** run-047
**Date:** 2026-01-12

## User Ratings

| Category | Rating | Notes |
|----------|--------|-------|
| Overall | 4/5 | Good app |
| UI/Design | 5/5 | Beautiful |
| Navigation | 2/5 | Confusing flow |
| Performance | 3/5 | Acceptable |
| Code Quality | 4/5 | Clean |

## Pattern Analysis

### Patterns Correlated with LOW Navigation Rating

| Pattern | This Run | Avg (Good Runs) | Correlation |
|---------|----------|-----------------|-------------|
| e2eFailures | 7 | 2.3 | r=-0.72 |
| maxIterationsOnFile | 9 | 4.1 | r=-0.48 |
| Phase 4 duration | 3.2h | 1.8h | r=-0.41 |

### Likely Causes

1. **Excessive E2E failures on navigation tests**
   - 7 failures before passing (avg is 2.3)
   - Most failures on `navigation.spec.ts`
   - Suggests navigation logic was unclear/difficult

2. **High edit churn on Router.tsx**
   - 9 edits in Phase 4
   - Indicates uncertainty about routing approach
   - Should have researched routing patterns first

### Recommendations for Future

1. Invoke `systematic-debugging` when >3 E2E failures
2. WebSearch routing patterns before implementing
3. Consider using established routing library

## Dataset Updated

This run added to learning dataset (now 47 entries).
```

---

## Implementation Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ANALYZER COMPONENTS                           │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │ Feature Extractor│  │Rating Collector  │  │ Correlator     │ │
│  │                  │  │                  │  │                │ │
│  │ Parses transcripts│ │ Collects user   │  │ Calculates     │ │
│  │ Extracts patterns │ │ Likert ratings  │  │ correlations   │ │
│  └────────┬─────────┘  └────────┬─────────┘  └───────┬────────┘ │
│           │                     │                    │          │
│           └──────────┬──────────┘                    │          │
│                      ▼                               │          │
│           ┌──────────────────┐                       │          │
│           │ Dataset Manager  │◄──────────────────────┘          │
│           │                  │                                  │
│           │ Stores entries   │                                  │
│           │ Queries history  │                                  │
│           └────────┬─────────┘                                  │
│                    │                                            │
│                    ▼                                            │
│           ┌──────────────────┐                                  │
│           │ Report Generator │                                  │
│           │                  │                                  │
│           │ Creates analysis │                                  │
│           │ Updates manifest │                                  │
│           └──────────────────┘                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Known Limitations

### Transcript Content

**CRITICAL:** Transcripts only contain `tool_call` and `tool_result` events. NOT available:
- Assistant reasoning between tool calls
- Text explanations
- Why decisions were made

All features must be extracted from observable tool patterns.

### Cold Start Problem

With few pipeline runs, correlations are unreliable. Minimum recommended:
- 10 runs: Basic patterns visible
- 30 runs: Moderate confidence
- 50+ runs: High confidence correlations

### Project Variability

Different projects have different complexity. A "good" pattern count for a simple counter app may be "bad" for a complex dashboard.

**Mitigation:** Normalize features by project complexity or analyze within project types.

---

## Files and Locations

| File | Purpose |
|------|---------|
| `.pipeline/learning-dataset.jsonl` | Accumulated training data |
| `.pipeline/correlations.json` | Cached correlation analysis |
| `.pipeline/analysis/[run-id]-report.md` | Per-run analysis report |
| `lib/analyzer-v2/feature-extractor.js` | Feature extraction logic |
| `lib/analyzer-v2/correlator.js` | Correlation analysis |
| `lib/analyzer-v2/rating-collector.js` | User feedback collection |

---

## Implementation Status

| Component | Status |
|-----------|--------|
| Feature Extractor | ❌ Not started |
| Rating Collector | ❌ Not started |
| Dataset Manager | ❌ Not started |
| Correlator | ❌ Not started |
| Report Generator | ❌ Not started |
| Orchestrator Integration | ❌ Not started |

---

## Version History

| Date | Change |
|------|--------|
| 2026-01-12 | Complete redesign: outcome-based learning approach |
