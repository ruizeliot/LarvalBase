#!/bin/bash
# Analyze pipeline run - wrapper for lib/analyze-run.sh
# Usage: ./analyze-pipeline.sh <project-path> [run-id]
#
# This script analyzes a completed pipeline run:
# 1. Finds the run (by ID or latest)
# 2. Generates transcripts from JSONL sessions
# 3. Uses Claude to analyze each step
# 4. Aggregates results
# 5. Interactive output

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Delegate to lib/analyze-run.sh
exec "$SCRIPT_DIR/lib/analyze-run.sh" "$@"
