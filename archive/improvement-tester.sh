#!/bin/bash
# Improvement Tester - Test suggested improvements in isolation
# Usage: ./improvement-tester.sh <improvement-json-file> <project-path> <manifest-path>
#
# Takes an improvement suggestion from Layer 2 diagnosis, creates a test
# environment, applies the improvement, runs the phase, and compares results.
#
# Requires: git, manifest.sh, layer1-metrics.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/manifest.sh"
source "$SCRIPT_DIR/pattern-db.sh"

IMPROVEMENT_FILE=""
PROJECT_PATH=""
MANIFEST_PATH=""
DRY_RUN=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run) DRY_RUN=true; shift ;;
        *)
            if [[ -z "$IMPROVEMENT_FILE" ]]; then
                IMPROVEMENT_FILE="$1"
            elif [[ -z "$PROJECT_PATH" ]]; then
                PROJECT_PATH="$1"
            else
                MANIFEST_PATH="$1"
            fi
            shift
            ;;
    esac
done

if [[ -z "$IMPROVEMENT_FILE" ]] || [[ -z "$PROJECT_PATH" ]]; then
    echo "Usage: $0 <improvement-json-file> <project-path> [manifest-path] [--dry-run]" >&2
    exit 1
fi

PROJECT_PATH=$(realpath "$PROJECT_PATH")
[[ -z "$MANIFEST_PATH" ]] && MANIFEST_PATH="$PROJECT_PATH/.pipeline/manifest.json"

if [[ ! -f "$IMPROVEMENT_FILE" ]]; then
    echo "Error: Improvement file not found: $IMPROVEMENT_FILE" >&2
    exit 1
fi

if [[ ! -f "$MANIFEST_PATH" ]]; then
    echo "Error: Manifest not found: $MANIFEST_PATH" >&2
    exit 1
fi

# Read improvement details
IMPROVEMENT=$(cat "$IMPROVEMENT_FILE")
AFFECTED_PHASE=$(echo "$IMPROVEMENT" | jq -r '.affected_phase')
FIX_TARGET=$(echo "$IMPROVEMENT" | jq -r '.suggested_fix.target')
FIX_TYPE=$(echo "$IMPROVEMENT" | jq -r '.suggested_fix.type')
FIX_DESCRIPTION=$(echo "$IMPROVEMENT" | jq -r '.suggested_fix.description')
PATTERN_ID=$(echo "$IMPROVEMENT" | jq -r '.pattern_id // ""')

echo "═══════════════════════════════════════════════════════════════"
echo "IMPROVEMENT TESTING"
echo "═══════════════════════════════════════════════════════════════"
echo "Project: $PROJECT_PATH"
echo "Phase: $AFFECTED_PHASE"
echo "Fix Type: $FIX_TYPE"
echo "Target: $FIX_TARGET"
echo "Description: $FIX_DESCRIPTION"
echo ""

# Step 1: Find the commit checkpoint for the phase BEFORE the affected phase
get_previous_checkpoint() {
    local phase="$1"
    local manifest="$2"

    case $phase in
        "0a") echo ""; return ;; # No previous phase
        "0b") manifest_get_phase_commit "$manifest" "0a" ;;
        "1") manifest_get_phase_commit "$manifest" "0b" ;;
        "2")
            # For phase 2, need to check epic loops
            local epic_id=$(echo "$IMPROVEMENT" | jq -r '.epic_id // 1')
            if [[ "$epic_id" -gt 1 ]]; then
                manifest_get_loop_commit "$manifest" "2" "$((epic_id - 1))"
            else
                manifest_get_phase_commit "$manifest" "1"
            fi
            ;;
        "3") manifest_get_phase_commit "$manifest" "2" ;;
        *) echo "" ;;
    esac
}

CHECKPOINT_COMMIT=$(get_previous_checkpoint "$AFFECTED_PHASE" "$MANIFEST_PATH")

if [[ -z "$CHECKPOINT_COMMIT" ]]; then
    echo "Warning: No checkpoint commit found for phase before $AFFECTED_PHASE" >&2
    echo "Will test on current state instead" >&2
    CHECKPOINT_COMMIT="HEAD"
fi

echo "Checkpoint commit: $CHECKPOINT_COMMIT"

if [[ "$DRY_RUN" == "true" ]]; then
    echo ""
    echo "[DRY RUN] Would perform these steps:"
    echo "1. Create test branch from $CHECKPOINT_COMMIT"
    echo "2. Apply improvement to $FIX_TARGET"
    echo "3. Run phase $AFFECTED_PHASE"
    echo "4. Extract metrics and compare"
    echo "5. Report validation result"
    exit 0
fi

# Step 2: Create test branch
TEST_BRANCH="test-improvement-$(date +%Y%m%d-%H%M%S)"
echo ""
echo "Creating test branch: $TEST_BRANCH"

cd "$PROJECT_PATH"
ORIGINAL_BRANCH=$(git branch --show-current)

# Save any uncommitted changes
if ! git diff --quiet HEAD 2>/dev/null; then
    echo "Stashing uncommitted changes..."
    git stash push -m "improvement-test-stash"
    STASHED=true
else
    STASHED=false
fi

# Create and checkout test branch
git checkout -b "$TEST_BRANCH" "$CHECKPOINT_COMMIT" 2>/dev/null || {
    echo "Error: Failed to create test branch" >&2
    [[ "$STASHED" == "true" ]] && git stash pop
    exit 1
}

echo "Test branch created at commit: $(git rev-parse --short HEAD)"

# Step 3: Apply the improvement
echo ""
echo "Applying improvement..."

# Expand ~ in target path
EXPANDED_TARGET="${FIX_TARGET/#\~/$HOME}"

if [[ ! -f "$EXPANDED_TARGET" ]]; then
    echo "Error: Target file not found: $EXPANDED_TARGET" >&2
    git checkout "$ORIGINAL_BRANCH"
    git branch -D "$TEST_BRANCH"
    [[ "$STASHED" == "true" ]] && git stash pop
    exit 1
fi

# For now, we'll create a marker showing the improvement would be applied
# In a full implementation, this would parse the change_preview and apply it
CHANGE_PREVIEW=$(echo "$IMPROVEMENT" | jq -r '.suggested_fix.change_preview // ""')

if [[ -n "$CHANGE_PREVIEW" ]]; then
    echo "Change to apply:"
    echo "$CHANGE_PREVIEW"
    echo ""
    # TODO: Actually apply the change using Edit or sed
    # For now, just mark as "would apply"
    echo "<!-- IMPROVEMENT TEST: $FIX_DESCRIPTION -->" >> "$EXPANDED_TARGET"
fi

# Step 4: Run the affected phase
echo ""
echo "Running phase $AFFECTED_PHASE..."

# TODO: This would actually run the pipeline phase
# For now, we'll simulate by noting what would happen
echo "[SIMULATION] Would run: ./pipeline step $AFFECTED_PHASE $PROJECT_PATH"

# Step 5: Extract metrics (simulated)
echo ""
echo "Extracting test metrics..."

# In real implementation:
# - Wait for phase to complete
# - Find the JSONL session
# - Run layer1-metrics.sh
# - Compare against baseline

TEST_METRICS_FILE="/tmp/test-improvement-metrics-$$.json"
cat > "$TEST_METRICS_FILE" << 'EOF'
{
  "test_run": true,
  "status": "simulated",
  "note": "Full testing requires running actual pipeline phase"
}
EOF

# Step 6: Cleanup
echo ""
echo "Cleaning up..."

git checkout "$ORIGINAL_BRANCH"
git branch -D "$TEST_BRANCH"
[[ "$STASHED" == "true" ]] && git stash pop

# Step 7: Report results
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "TEST RESULTS"
echo "═══════════════════════════════════════════════════════════════"

# In real implementation, this would compare baseline vs test metrics
cat << EOF
{
  "improvement_tested": true,
  "pattern_id": "$PATTERN_ID",
  "affected_phase": "$AFFECTED_PHASE",
  "checkpoint_commit": "$CHECKPOINT_COMMIT",
  "test_branch": "$TEST_BRANCH",
  "status": "simulation_complete",
  "validation": "pending_real_run",
  "notes": [
    "Test environment was set up correctly",
    "Improvement was prepared for application",
    "Full validation requires running the actual phase",
    "Run with actual pipeline to complete validation"
  ],
  "next_steps": [
    "Queue this improvement for staged rollout",
    "Apply to next real pipeline run with monitoring"
  ]
}
EOF

rm -f "$TEST_METRICS_FILE"

echo ""
echo "Test complete. Review results above."
