# Layer 2 Diagnosis Prompt

You are analyzing pipeline run metrics to identify issues and suggest improvements.

## Input Data

### Layer 1 Metrics (Automatic)
{{LAYER1_METRICS}}

### Existing Patterns (from previous runs)
{{EXISTING_PATTERNS}}

### Pattern Matches (current issues matched to known patterns)
{{PATTERN_MATCHES}}

## Your Task

Analyze the metrics and produce a diagnosis with:

1. **Identify Issues**: Look for:
   - Bottlenecks (todos taking >40% of total time)
   - Retries (same todo appearing multiple times)
   - Slow todos (>2x average duration)
   - High tool call counts indicating inefficiency

2. **Match to Patterns**: If an issue matches a known pattern with high confidence, reference it.

3. **Suggest Fixes**: For each issue, provide:
   - A specific fix targeting a file/command
   - Confidence level (high/medium/low) based on:
     - high: Pattern seen 3+ times with consistent fix
     - medium: Pattern seen 2 times or logical fix
     - low: New issue, speculative fix

4. **Overall Assessment**: Health score and top priority

## Output Format

Return ONLY valid JSON (no markdown):

```json
{
  "diagnoses": [
    {
      "issue": "Brief description of the issue",
      "type": "bottleneck|retry|slow_todo|inefficiency",
      "affected_phase": "0a|0b|1|2|3",
      "affected_todo": "The todo content if applicable",
      "pattern_id": "matched pattern ID or null",
      "confidence": "high|medium|low",
      "evidence": {
        "metric_name": "value",
        "threshold": "expected value"
      },
      "suggested_fix": {
        "target": "file path to modify",
        "type": "command_change|prompt_change|workflow_change",
        "description": "What to change",
        "change_preview": "Specific change to make"
      }
    }
  ],
  "overall_assessment": {
    "health": "healthy|degraded|critical",
    "score": 0-100,
    "top_priority": "Most important issue to fix",
    "quick_wins": ["Easy improvements that can be made immediately"]
  }
}
```

## Scoring Guidelines

- **healthy (80-100)**: No bottlenecks >30%, no retries, all todos completing efficiently
- **degraded (50-79)**: Some bottlenecks or retries, but pipeline completing
- **critical (<50)**: Major bottlenecks, many retries, pipeline struggling

## Example Diagnosis

For a bottleneck issue:
```json
{
  "issue": "Test setup taking 45% of phase duration",
  "type": "bottleneck",
  "affected_phase": "1",
  "affected_todo": "Set up Cypress test environment",
  "pattern_id": "bottleneck-set-up-cypress-test-environment",
  "confidence": "high",
  "evidence": {
    "duration_percentage": 45,
    "threshold": 30
  },
  "suggested_fix": {
    "target": "~/.claude/commands/1-pipeline-bootstrap-v5.2.md",
    "type": "command_change",
    "description": "Cache Cypress binary and node_modules between runs",
    "change_preview": "Add step: Check for cached node_modules before npm install"
  }
}
```
