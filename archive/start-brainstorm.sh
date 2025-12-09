#!/bin/bash
# Backwards-compatible wrapper for ./pipeline brainstorm
# Usage: ./start-brainstorm.sh <project-path> [mode]
# mode: "new" (default) or "feature"
#
# DEPRECATED: Use ./pipeline brainstorm instead
#   ./pipeline brainstorm <project>           # new project
#   ./pipeline brainstorm <project> --feature # new feature

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

PROJECT_PATH="${1:-}"
MODE="${2:-new}"

if [ -z "$PROJECT_PATH" ]; then
    echo "Usage: ./start-brainstorm.sh <project-path> [mode]"
    echo "  mode: 'new' (default) or 'feature'"
    echo ""
    echo "DEPRECATED: Use ./pipeline brainstorm instead"
    exit 1
fi

if [ "$MODE" = "feature" ]; then
    exec "$SCRIPT_DIR/pipeline" brainstorm "$PROJECT_PATH" --feature
else
    exec "$SCRIPT_DIR/pipeline" brainstorm "$PROJECT_PATH"
fi
