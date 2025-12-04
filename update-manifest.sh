#!/bin/bash
# Update manifest.json after step completion
# Usage: ./update-manifest.sh <project-path> <step> <status> [epic]
# status: "complete" or "failed"

set -euo pipefail

PROJECT_PATH="${1:-}"
STEP="${2:-}"
STATUS="${3:-complete}"
EPIC="${4:-}"

if [ -z "$PROJECT_PATH" ] || [ -z "$STEP" ]; then
    echo "Usage: ./update-manifest.sh <project-path> <step> [status] [epic]"
    exit 1
fi

MANIFEST_FILE="$PROJECT_PATH/.pipeline/manifest.json"

if [ ! -f "$MANIFEST_FILE" ]; then
    echo "Manifest not found: $MANIFEST_FILE"
    exit 1
fi

TIMESTAMP=$(date -Iseconds)

# Map step to phase (strip -feature suffix)
PHASE="${STEP%-feature}"

# Update phase status
jq --arg phase "$PHASE" \
   --arg status "$STATUS" \
   --arg timestamp "$TIMESTAMP" \
   '.phases[$phase].status = $status | .phases[$phase].completedAt = $timestamp' \
   "$MANIFEST_FILE" > "$MANIFEST_FILE.tmp" && mv "$MANIFEST_FILE.tmp" "$MANIFEST_FILE"

# Determine next phase
case "$PHASE" in
    "0b") NEXT_PHASE="1" ;;
    "1")  NEXT_PHASE="2" ;;
    "2")  NEXT_PHASE="3" ;;  # Will be overridden if more epics remain
    "3")  NEXT_PHASE="complete" ;;
    *)    NEXT_PHASE="" ;;
esac

# Handle phase 2 epic progression
if [ "$PHASE" = "2" ] && [ "$STATUS" = "complete" ]; then
    if [ -n "$EPIC" ]; then
        # Mark current epic as complete
        jq --arg epic "$EPIC" \
           '.epics = [.epics[] | if .id == ($epic | tonumber) then .status = "complete" else . end]' \
           "$MANIFEST_FILE" > "$MANIFEST_FILE.tmp" && mv "$MANIFEST_FILE.tmp" "$MANIFEST_FILE"

        # Check if more epics remain
        INCOMPLETE_EPICS=$(jq '[.epics[] | select(.status != "complete")] | length' "$MANIFEST_FILE")

        if [ "$INCOMPLETE_EPICS" -gt 0 ]; then
            # Get next epic ID
            NEXT_EPIC=$(jq '[.epics[] | select(.status != "complete")][0].id' "$MANIFEST_FILE")
            jq --arg epic "$NEXT_EPIC" '.currentEpic = ($epic | tonumber)' \
               "$MANIFEST_FILE" > "$MANIFEST_FILE.tmp" && mv "$MANIFEST_FILE.tmp" "$MANIFEST_FILE"
            NEXT_PHASE="2"  # Stay in phase 2
        fi
    fi
fi

# Update currentPhase
if [ -n "$NEXT_PHASE" ]; then
    if [ "$NEXT_PHASE" = "complete" ]; then
        jq --arg timestamp "$TIMESTAMP" \
           '.status = "complete" | .completedAt = $timestamp | .currentPhase = "complete"' \
           "$MANIFEST_FILE" > "$MANIFEST_FILE.tmp" && mv "$MANIFEST_FILE.tmp" "$MANIFEST_FILE"
    else
        jq --arg phase "$NEXT_PHASE" '.currentPhase = $phase | .phases[$phase].status = "in-progress"' \
           "$MANIFEST_FILE" > "$MANIFEST_FILE.tmp" && mv "$MANIFEST_FILE.tmp" "$MANIFEST_FILE"
    fi
fi

# Try to extract test counts from cypress output in transcript
# (This is best-effort - may not always work)
TRANSCRIPT_PATTERN="$PROJECT_PATH/.pipeline/runs/*/$(basename "$STEP")*transcript.md"
LATEST_TRANSCRIPT=$(ls -t $TRANSCRIPT_PATTERN 2>/dev/null | head -1 || true)

if [ -n "$LATEST_TRANSCRIPT" ] && [ -f "$LATEST_TRANSCRIPT" ]; then
    # Look for cypress test results
    # Format: "X passing" or "X passing (Xs)" or "Tests: X" or "✓ X tests"
    PASSING=$(grep -oP '(\d+)\s+passing' "$LATEST_TRANSCRIPT" | tail -1 | grep -oP '\d+' || true)
    FAILING=$(grep -oP '(\d+)\s+failing' "$LATEST_TRANSCRIPT" | tail -1 | grep -oP '\d+' || true)

    if [ -n "$PASSING" ]; then
        FAILING="${FAILING:-0}"
        TOTAL=$((PASSING + FAILING))
        jq --arg passing "$PASSING" \
           --arg failing "$FAILING" \
           --arg total "$TOTAL" \
           '.tests.passing = ($passing | tonumber) | .tests.failing = ($failing | tonumber)' \
           "$MANIFEST_FILE" > "$MANIFEST_FILE.tmp" && mv "$MANIFEST_FILE.tmp" "$MANIFEST_FILE"
    fi
fi

echo "Manifest updated: $MANIFEST_FILE"
echo "  Phase: $PHASE → $STATUS"
echo "  Next: $NEXT_PHASE"

# Show current state
CURRENT_EPIC=$(jq -r '.currentEpic' "$MANIFEST_FILE")
TOTAL_EPICS=$(jq '.epics | length' "$MANIFEST_FILE")
COMPLETED_EPICS=$(jq '[.epics[] | select(.status == "complete")] | length' "$MANIFEST_FILE")
TESTS_PASSING=$(jq -r '.tests.passing' "$MANIFEST_FILE")
TESTS_TOTAL=$(jq -r '.tests.total' "$MANIFEST_FILE")

echo "  Epic: $CURRENT_EPIC/$TOTAL_EPICS ($COMPLETED_EPICS complete)"
echo "  Tests: $TESTS_PASSING/$TESTS_TOTAL passing"
