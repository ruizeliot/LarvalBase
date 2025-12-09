#!/bin/bash
# Initialize analysis manifest for a pipeline run
# Usage: ./init-analysis-manifest.sh <project-path> <run-id>
#
# Creates analysis-manifest.json in the run's analysis directory

set -euo pipefail

PROJECT_PATH="${1:-}"
RUN_ID="${2:-}"

if [[ -z "$PROJECT_PATH" ]] || [[ -z "$RUN_ID" ]]; then
    echo "Usage: $0 <project-path> <run-id>"
    exit 1
fi

PROJECT_PATH=$(realpath "$PROJECT_PATH")
PROJECT_NAME=$(basename "$PROJECT_PATH")

# Find the run directory
RUN_DIR="$PROJECT_PATH/.pipeline/runs/$RUN_ID"
if [[ ! -d "$RUN_DIR" ]]; then
    echo "Error: Run directory not found: $RUN_DIR"
    exit 1
fi

# Read pipeline run metadata
METADATA_FILE="$RUN_DIR/metadata.json"
if [[ ! -f "$METADATA_FILE" ]]; then
    echo "Error: Pipeline metadata not found: $METADATA_FILE"
    exit 1
fi

PIPELINE_TYPE=$(jq -r '.type // "unknown"' "$METADATA_FILE")
PIPELINE_STARTED=$(jq -r '.startedAt // ""' "$METADATA_FILE")
PIPELINE_COMPLETED=$(jq -r '.completedAt // ""' "$METADATA_FILE")

# Get steps from the pipeline run
mapfile -t STEPS < <(jq -r '.steps[]? // empty' "$METADATA_FILE")

# Create analysis directory
ANALYSIS_DIR="$RUN_DIR/analysis"
mkdir -p "$ANALYSIS_DIR"

ANALYSIS_ID="analysis-$(date +%Y%m%d-%H%M%S)"
ANALYSIS_MANIFEST="$ANALYSIS_DIR/analysis-manifest.json"

# Create analysis manifest
cat > "$ANALYSIS_MANIFEST" << EOF
{
  "version": "1.0.0",
  "type": "analysis-pipeline",
  "analysisId": "$ANALYSIS_ID",
  "target": {
    "project": "$PROJECT_NAME",
    "projectPath": "$PROJECT_PATH",
    "runId": "$RUN_ID",
    "pipelineType": "$PIPELINE_TYPE",
    "pipelineStarted": "$PIPELINE_STARTED",
    "pipelineCompleted": "$PIPELINE_COMPLETED",
    "steps": $(printf '%s\n' "${STEPS[@]}" | jq -R . | jq -s .)
  },
  "status": "in-progress",
  "startedAt": "$(date -Iseconds)",
  "completedAt": null,
  "currentPhase": "A",
  "phases": {
    "A": {
      "name": "Initial Analysis",
      "status": "pending",
      "startedAt": null,
      "completedAt": null,
      "outputs": {
        "stepMetrics": {},
        "todoSpans": [],
        "issues": [],
        "patterns": []
      }
    },
    "B": {
      "name": "Improvement Testing",
      "status": "pending",
      "startedAt": null,
      "completedAt": null,
      "currentTest": 0,
      "tests": []
    },
    "C": {
      "name": "Validation & Apply",
      "status": "pending",
      "startedAt": null,
      "completedAt": null,
      "outputs": {
        "validated": [],
        "rejected": [],
        "applied": []
      }
    }
  },
  "pendingTests": [],
  "testResults": [],
  "improvements": {
    "queued": [],
    "applied": [],
    "rejected": []
  },
  "versionBefore": null,
  "versionAfter": null
}
EOF

# Format the JSON
jq . "$ANALYSIS_MANIFEST" > "${ANALYSIS_MANIFEST}.tmp" && mv "${ANALYSIS_MANIFEST}.tmp" "$ANALYSIS_MANIFEST"

echo "Analysis manifest initialized: $ANALYSIS_MANIFEST"
echo "  Analysis ID: $ANALYSIS_ID"
echo "  Target Run: $RUN_ID"
echo "  Pipeline Steps: ${#STEPS[@]}"
