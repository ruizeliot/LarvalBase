#!/bin/bash
# Backwards-compatible wrapper for ./pipeline run --feature
# Usage: ./newFeature-pipeline.sh <project-path> [start-step]
#
# DEPRECATED: Use ./pipeline run --feature instead
#   ./pipeline run <project> --feature              # start from 0b
#   ./pipeline run <project> --feature --from 2     # start from step 2

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

PROJECT_PATH="${1:-}"
START_STEP="${2:-0b}"

if [ -z "$PROJECT_PATH" ]; then
    echo "Usage: ./newFeature-pipeline.sh <project-path> [start-step]"
    echo "  Steps: 0b, 1, 2, 3"
    echo "  Default start: 0b"
    echo ""
    echo "DEPRECATED: Use ./pipeline run --feature instead"
    exit 1
fi

exec "$SCRIPT_DIR/pipeline" run "$PROJECT_PATH" --feature --from "$START_STEP"
