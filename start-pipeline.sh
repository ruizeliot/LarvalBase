#!/bin/bash
# Backwards-compatible wrapper for ./pipeline run
# Usage: ./start-pipeline.sh <project-path> [start-step]
#
# DEPRECATED: Use ./pipeline run instead
#   ./pipeline run <project>              # start from 0b
#   ./pipeline run <project> --from 2     # start from step 2

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

PROJECT_PATH="${1:-}"
START_STEP="${2:-0b}"

if [ -z "$PROJECT_PATH" ]; then
    echo "Usage: ./start-pipeline.sh <project-path> [start-step]"
    echo "  Steps: 0b, 1, 2, 3"
    echo "  Default start: 0b"
    echo ""
    echo "DEPRECATED: Use ./pipeline run instead"
    exit 1
fi

exec "$SCRIPT_DIR/pipeline" run "$PROJECT_PATH" --from "$START_STEP"
