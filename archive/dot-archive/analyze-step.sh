#!/bin/bash
# Analyze step transcript and generate detailed metrics
# Usage: ./analyze-step.sh <transcript-file>

set -euo pipefail

TRANSCRIPT="${1:-}"

if [ -z "$TRANSCRIPT" ] || [ ! -f "$TRANSCRIPT" ]; then
    echo "Usage: ./analyze-step.sh <transcript-file>"
    echo "Example: ./analyze-step.sh docs/metrics/0b-20251123-140000-transcript.md"
    exit 1
fi

# Output files
METRICS_FILE="${TRANSCRIPT%.md}-metrics.json"
CSV_FILE="${TRANSCRIPT%.md}-details.csv"
MD_FILE="${TRANSCRIPT%.md}-report.md"

echo "Analyzing transcript: $TRANSCRIPT"
echo "Output: $METRICS_FILE"
echo ""

# Create the analysis prompt
PROMPT=$(cat << 'EOF'
Analyze this pipeline step transcript and extract metrics in JSON format.

Return ONLY valid JSON with this structure:
{
  "step": "0b",
  "summary": "Brief 1-2 sentence summary of what was accomplished",
  "tokens": {
    "input_estimate": 0,
    "output_estimate": 0,
    "total_estimate": 0
  },
  "tools": {
    "Read": 0,
    "Write": 0,
    "Edit": 0,
    "Bash": 0,
    "Glob": 0,
    "Grep": 0,
    "Task": 0,
    "WebFetch": 0,
    "WebSearch": 0
  },
  "files_created": [],
  "files_modified": [],
  "subagents_spawned": 0,
  "errors": 0,
  "retries": 0,
  "quality_score": null,
  "cost_estimate_usd": 0.00,
  "user_stories": [
    {
      "id": "US-001",
      "title": "Story title",
      "epic": "Epic 1",
      "criteria_count": 3,
      "e2e_tests": ["E2E-001", "E2E-001a"]
    }
  ],
  "e2e_tests": [
    {
      "id": "E2E-001",
      "title": "Test title",
      "type": "main",
      "story_id": "US-001",
      "epic": "Epic 1"
    }
  ]
}

Token estimation rules:
- Count words in transcript, multiply by 1.3 for tokens
- Input tokens ≈ 60% of total, output ≈ 40%

Cost calculation (Opus 4.5):
- Input: $5 per 1M tokens
- Output: $25 per 1M tokens

Tool counting:
- Look for tool invocations in the transcript
- Count each unique file read/written

User stories and E2E tests:
- Extract from transcript if user stories or E2E specs are mentioned
- If step doesn't involve these, leave arrays empty
- "type" can be "main" or "edge"

Extract step name from the transcript header.

TRANSCRIPT:
EOF
)

# Run Claude to analyze
echo "Running analysis with Claude..."
RESULT=$(claude --model opus --print -p "$PROMPT

$(cat "$TRANSCRIPT")" 2>&1)

# Extract JSON from result (in case there's extra text)
JSON=$(echo "$RESULT" | grep -Pzo '\{[\s\S]*\}' | tr -d '\0' || echo "$RESULT")

# Validate JSON
if echo "$JSON" | jq . > /dev/null 2>&1; then
    echo "$JSON" | jq . > "$METRICS_FILE"
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "Analysis Complete"
    echo "═══════════════════════════════════════════════════════════"
    echo ""

    # Display key metrics
    echo "Summary: $(jq -r '.summary' "$METRICS_FILE")"
    echo ""
    echo "Tokens: $(jq -r '.tokens.total_estimate' "$METRICS_FILE") estimated"
    echo "Cost: \$$(jq -r '.cost_estimate_usd' "$METRICS_FILE")"
    echo ""
    echo "Tools used:"
    jq -r '.tools | to_entries | map(select(.value > 0)) | .[] | "  \(.key): \(.value)"' "$METRICS_FILE"
    echo ""
    echo "Files created: $(jq -r '.files_created | length' "$METRICS_FILE")"
    echo "Files modified: $(jq -r '.files_modified | length' "$METRICS_FILE")"
    echo "Subagents: $(jq -r '.subagents_spawned' "$METRICS_FILE")"
    echo "Errors: $(jq -r '.errors' "$METRICS_FILE")"
    echo ""
    echo "Full metrics: $METRICS_FILE"

    # Generate CSV for user stories and E2E tests
    echo ""
    echo "Generating reports..."

    # Create CSV
    {
        echo "Type,ID,Title,Epic,Criteria,E2E Tests"
        jq -r '.user_stories[]? | "User Story,\(.id),\"\(.title)\",\(.epic),\(.criteria_count),\"\(.e2e_tests | join(\", \"))\""' "$METRICS_FILE"
        echo ""
        echo "Type,ID,Title,Test Type,Story ID,Epic"
        jq -r '.e2e_tests[]? | "E2E Test,\(.id),\"\(.title)\",\(.type),\(.story_id),\(.epic)"' "$METRICS_FILE"
    } > "$CSV_FILE"

    # Create Markdown report
    STEP_NAME=$(jq -r '.step' "$METRICS_FILE")
    SUMMARY=$(jq -r '.summary' "$METRICS_FILE")
    TOKENS=$(jq -r '.tokens.total_estimate' "$METRICS_FILE")
    COST=$(jq -r '.cost_estimate_usd' "$METRICS_FILE")

    {
        echo "# Step $STEP_NAME Report"
        echo ""
        echo "## Summary"
        echo "$SUMMARY"
        echo ""
        echo "## Metrics"
        echo "| Metric | Value |"
        echo "|--------|-------|"
        echo "| Tokens | $TOKENS |"
        echo "| Cost | \$$COST |"
        echo "| Subagents | $(jq -r '.subagents_spawned' "$METRICS_FILE") |"
        echo "| Errors | $(jq -r '.errors' "$METRICS_FILE") |"
        echo ""
        echo "## User Stories"
        echo "| ID | Title | Epic | Criteria | E2E Tests |"
        echo "|----|-------|------|----------|-----------|"
        jq -r '.user_stories[]? | "| \(.id) | \(.title) | \(.epic) | \(.criteria_count) | \(.e2e_tests | join(", ")) |"' "$METRICS_FILE"
        echo ""
        echo "## E2E Tests"
        echo "| ID | Title | Type | Story | Epic |"
        echo "|----|-------|------|-------|------|"
        jq -r '.e2e_tests[]? | "| \(.id) | \(.title) | \(.type) | \(.story_id) | \(.epic) |"' "$METRICS_FILE"
        echo ""
        echo "## Tools Used"
        echo "| Tool | Count |"
        echo "|------|-------|"
        jq -r '.tools | to_entries | map(select(.value > 0)) | .[] | "| \(.key) | \(.value) |"' "$METRICS_FILE"
    } > "$MD_FILE"

    echo "CSV report: $CSV_FILE"
    echo "Markdown report: $MD_FILE"
else
    echo "Error: Failed to parse JSON response"
    echo "Raw response:"
    echo "$RESULT"
    exit 1
fi
