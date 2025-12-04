#!/bin/bash
# Initialize manifest.json from docs files
# Usage: ./init-manifest.sh <project-path> <run-id> <mode>
# mode: "new-project" or "new-feature"

set -euo pipefail

PROJECT_PATH="${1:-}"
RUN_ID="${2:-}"
MODE="${3:-new-project}"

if [ -z "$PROJECT_PATH" ] || [ -z "$RUN_ID" ]; then
    echo "Usage: ./init-manifest.sh <project-path> <run-id> [mode]"
    exit 1
fi

MANIFEST_FILE="$PROJECT_PATH/.pipeline/manifest.json"
USER_STORIES="$PROJECT_PATH/docs/user-stories.md"
E2E_SPECS="$PROJECT_PATH/docs/e2e-test-specs.md"

# Extract project name from path
PROJECT_NAME=$(basename "$PROJECT_PATH")

# Initialize empty arrays
EPICS_JSON="[]"
TOTAL_STORIES=0
TOTAL_TESTS=0
TOTAL_EPICS=0

# Parse user-stories.md if it exists
if [ -f "$USER_STORIES" ]; then
    # Extract totals from header (handle **bold** markers)
    TOTAL_STORIES=$(grep -oP 'Total Stories:\*?\*?\s*\K\d+' "$USER_STORIES" || echo "0")
    TOTAL_EPICS=$(grep -oP 'Total Epics:\*?\*?\s*\K\d+' "$USER_STORIES" || echo "0")

    # Extract epic names and their stories
    EPICS_JSON=$(awk '
        BEGIN {
            epic_id = 0
            in_epic = 0
            epic_name = ""
            stories = ""
            first_epic = 1
            printf "["
        }
        /^## Epic [0-9]+:/ {
            if (in_epic && epic_name != "") {
                # Close previous epic
                if (!first_epic) printf ","
                first_epic = 0
                gsub(/,$/, "", stories)
                printf "{\"id\":%d,\"name\":\"%s\",\"status\":\"pending\",\"stories\":[%s]}", epic_id, epic_name, stories
            }
            epic_id++
            in_epic = 1
            # Extract epic name after "Epic N: "
            match($0, /## Epic [0-9]+: (.+)/, arr)
            epic_name = arr[1]
            stories = ""
        }
        /^### US-[0-9]+:/ {
            if (in_epic) {
                # Extract story ID
                match($0, /US-([0-9]+)/, arr)
                story_id = "US-" sprintf("%03d", arr[1])
                if (stories != "") stories = stories ","
                stories = stories "\"" story_id "\""
            }
        }
        END {
            if (in_epic && epic_name != "") {
                if (!first_epic) printf ","
                gsub(/,$/, "", stories)
                printf "{\"id\":%d,\"name\":\"%s\",\"status\":\"pending\",\"stories\":[%s]}", epic_id, epic_name, stories
            }
            printf "]"
        }
    ' "$USER_STORIES")
fi

# Parse e2e-test-specs.md if it exists
if [ -f "$E2E_SPECS" ]; then
    # Extract total tests count (main + edge cases)
    MAIN_TESTS=$(grep -oP '\d+(?=\s*main tests)' "$E2E_SPECS" || echo "0")
    EDGE_TESTS=$(grep -oP '\d+(?=\s*edge cases)' "$E2E_SPECS" || echo "0")

    if [ "$MAIN_TESTS" = "0" ]; then
        # Try alternate format "Total Tests: N"
        TOTAL_TESTS=$(grep -oP 'Total Tests:\s*\K\d+' "$E2E_SPECS" || echo "0")
    else
        TOTAL_TESTS=$((MAIN_TESTS + EDGE_TESTS))
    fi
fi

# Create manifest
cat > "$MANIFEST_FILE" << EOF
{
  "version": "5.0.3",
  "runId": "$RUN_ID",
  "project": {
    "name": "$PROJECT_NAME",
    "path": "$PROJECT_PATH"
  },
  "mode": "$MODE",
  "status": "in-progress",
  "startedAt": "$(date -Iseconds)",
  "completedAt": null,
  "currentPhase": "0a",
  "currentEpic": 1,
  "currentBatch": 1,
  "epics": $EPICS_JSON,
  "tests": {
    "total": $TOTAL_TESTS,
    "passing": 0,
    "failing": 0
  },
  "phases": {
    "0a": {"status": "pending"},
    "0b": {"status": "pending"},
    "1": {"status": "pending"},
    "2": {"status": "pending"},
    "3": {"status": "pending"}
  }
}
EOF

echo "Manifest initialized: $MANIFEST_FILE"
echo "  Project: $PROJECT_NAME"
echo "  Epics: $TOTAL_EPICS"
echo "  Stories: $TOTAL_STORIES"
echo "  Tests: $TOTAL_TESTS"
