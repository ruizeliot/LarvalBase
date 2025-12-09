#!/bin/bash
# Layer 2 AI Diagnosis - Intelligent analysis of Layer 1 metrics
# Usage: ./layer2-diagnosis.sh <layer1-metrics-file> [--project <name>] [--run-id <id>]
#
# Takes Layer 1 metrics JSON and produces AI-powered diagnosis with
# improvement suggestions and confidence levels.
#
# Requires: claude CLI, pattern-db.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/pattern-db.sh"

METRICS_FILE=""
PROJECT=""
RUN_ID=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --project|-p) PROJECT="$2"; shift 2 ;;
        --run-id|-r) RUN_ID="$2"; shift 2 ;;
        *) METRICS_FILE="$1"; shift ;;
    esac
done

if [[ -z "$METRICS_FILE" ]] || [[ ! -f "$METRICS_FILE" ]]; then
    echo "Usage: $0 <layer1-metrics-file> [--project <name>] [--run-id <id>]" >&2
    exit 1
fi

# Read Layer 1 metrics
LAYER1_METRICS=$(cat "$METRICS_FILE")

# Extract project/run from metrics if not provided
if [[ -z "$PROJECT" ]]; then
    PROJECT=$(echo "$LAYER1_METRICS" | jq -r '.project // "unknown"')
fi
if [[ -z "$RUN_ID" ]]; then
    RUN_ID=$(echo "$LAYER1_METRICS" | jq -r '.run_id // "unknown"')
fi

# Initialize pattern database
pattern_db_init > /dev/null

# Get existing patterns (high and medium confidence)
EXISTING_PATTERNS=$(pattern_db_list_patterns --min-freq 2 2>/dev/null || echo "[]")

# Match current issues to patterns
ISSUES=$(echo "$LAYER1_METRICS" | jq -c '.issues // []')
PATTERN_MATCHES=$(echo "$ISSUES" | pattern_db_match_issues 2>/dev/null || echo "[]")

# Read the prompt template
PROMPT_TEMPLATE=$(cat "$SCRIPT_DIR/layer2-diagnosis-prompt.md")

# Build the full prompt with data
FULL_PROMPT=$(echo "$PROMPT_TEMPLATE" | \
    sed "s|{{LAYER1_METRICS}}|$(echo "$LAYER1_METRICS" | jq -c '.')|g" | \
    sed "s|{{EXISTING_PATTERNS}}|$(echo "$EXISTING_PATTERNS" | jq -c '.')|g" | \
    sed "s|{{PATTERN_MATCHES}}|$(echo "$PATTERN_MATCHES" | jq -c '.')|g")

# Call Claude for diagnosis
echo "Running Layer 2 AI diagnosis..." >&2
echo "Project: $PROJECT, Run: $RUN_ID" >&2
echo "Issues to analyze: $(echo "$ISSUES" | jq 'length')" >&2
echo "Existing patterns: $(echo "$EXISTING_PATTERNS" | jq 'length')" >&2
echo "" >&2

# Use Claude CLI to get diagnosis
DIAGNOSIS=$(claude --model sonnet --print -p "$FULL_PROMPT

Analyze the data above and return ONLY the JSON diagnosis object. No markdown, no explanation, just valid JSON." 2>/dev/null || echo '{"error": "Claude CLI failed"}')

# Validate JSON output
if ! echo "$DIAGNOSIS" | jq empty 2>/dev/null; then
    # Try to extract JSON from response
    DIAGNOSIS=$(echo "$DIAGNOSIS" | grep -o '{.*}' | head -1 || echo '{"error": "Invalid JSON response"}')
fi

# Add metadata
echo "$DIAGNOSIS" | jq --arg project "$PROJECT" \
                       --arg run_id "$RUN_ID" \
                       --arg ts "$(date -Iseconds)" \
                       '. + {
                         metadata: {
                           project: $project,
                           run_id: $run_id,
                           analyzed_at: $ts,
                           layer2_version: "1.0"
                         }
                       }'
