#!/bin/bash
# Multi-phase Pipeline Test
# Tests: Phase 1 -> Phase 2 -> Phase 3 auto-transition

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_PATH="/home/claude/IMT/Pipeline-Office/tests/test-project"
LOG_DIR="/tmp/pipeline-multi-phase-test"

echo "════════════════════════════════════════════════════════════════"
echo "MULTI-PHASE PIPELINE TEST"
echo "════════════════════════════════════════════════════════════════"
echo "Testing: Phase 1 -> Phase 2 -> Phase 3"
echo ""

# Create dirs
mkdir -p "$PROJECT_PATH/.pipeline" "$LOG_DIR"

# Create manifest with phase transition config
cat > "$PROJECT_PATH/.pipeline/manifest.json" << 'EOF'
{
  "version": "5.2",
  "project": {
    "name": "test-project",
    "path": "/home/claude/IMT/Pipeline-Office/tests/test-project"
  },
  "pipeline": {
    "type": "test",
    "version": "1.0"
  },
  "currentPhase": "1",
  "phases": {
    "1": {
      "status": "pending"
    },
    "2": {
      "status": "pending"
    },
    "3": {
      "status": "pending"
    }
  }
}
EOF

# JSONL directory (Claude's format: -home-claude-IMT-project)
PROJECT_ENCODED=$(echo "$PROJECT_PATH" | sed 's/^\//-/; s/\//-/g')
JSONL_DIR="$HOME/.claude/projects/$PROJECT_ENCODED"

# Find the most recently modified JSONL file (not agent-* files)
find_latest_jsonl() {
    local MARKER="$1"
    if [[ -d "$JSONL_DIR" ]]; then
        find "$JSONL_DIR" -maxdepth 1 -name "*.jsonl" -newer "$MARKER" 2>/dev/null | \
            grep -v "agent-" | \
            xargs -r ls -t 2>/dev/null | \
            head -1
    fi
}

# Create a modified runner for test phases
run_test_phase() {
    local STEP="$1"
    local SLASH_CMD="test-phase-${STEP}"
    # Session name must match pattern: pipeline-{project-name}-{step}
    # Watch command looks for: pipeline-test-project-*
    local TMUX_SESSION="pipeline-test-project-${STEP}"
    local MARKER_FILE="$LOG_DIR/.phase_${STEP}_marker"
    local JSONL_FILE=""

    echo ""
    echo "────────────────────────────────────────────────────────────────"
    echo "Running Phase $STEP"
    echo "────────────────────────────────────────────────────────────────"
    echo "Command: /$SLASH_CMD"
    echo "JSONL Dir: $JSONL_DIR"

    # Kill any existing session
    tmux kill-session -t "$TMUX_SESSION" 2>/dev/null || true

    # Create tmux session
    tmux new-session -d -s "$TMUX_SESSION" -c "$PROJECT_PATH"

    # Create marker file BEFORE starting Claude
    touch "$MARKER_FILE"
    echo "Marker: $MARKER_FILE"

    # Start Claude with fresh session ID to prevent auto-resume
    # Note: --session-id ensures fresh session, JSONL file uses same ID
    local FRESH_SESSION_ID=$(uuidgen)
    echo "Session ID: $FRESH_SESSION_ID"
    tmux send-keys -t "$TMUX_SESSION" "claude --session-id $FRESH_SESSION_ID --dangerously-skip-permissions" Enter
    sleep 10  # Wait for Claude to initialize

    # Send command
    echo "Sending command..."
    tmux send-keys -t "$TMUX_SESSION" "/$SLASH_CMD"
    sleep 2
    tmux send-keys -t "$TMUX_SESSION" Enter

    # Monitor
    local START=$(date +%s)
    local COMPLETED=false
    local LAST_SIZE=0

    while true; do
        sleep 5

        local NOW=$(date +%s)
        local ELAPSED=$((NOW - START))

        # Check session
        if ! tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
            echo ""
            echo "  Session ended (${ELAPSED}s)"
            break
        fi

        # Find JSONL file if not already found or check for newer one
        if [[ -z "$JSONL_FILE" ]] || [[ ! -f "$JSONL_FILE" ]]; then
            JSONL_FILE=$(find_latest_jsonl "$MARKER_FILE")
            if [[ -n "$JSONL_FILE" ]]; then
                echo ""
                echo "  Found JSONL: $(basename "$JSONL_FILE")"
            fi
        fi

        # Check JSONL
        if [[ -n "$JSONL_FILE" ]] && [[ -f "$JSONL_FILE" ]]; then
            local SIZE=$(stat -c %s "$JSONL_FILE" 2>/dev/null || echo 0)
            echo -ne "\r  Monitoring: ${ELAPSED}s, JSONL: ${SIZE} bytes    "

            if grep -q "PIPELINE:COMPLETE" "$JSONL_FILE" 2>/dev/null; then
                COMPLETED=true
                echo ""
                echo "  ✓ PIPELINE:COMPLETE detected!"
                tmux kill-session -t "$TMUX_SESSION" 2>/dev/null || true
                break
            fi
        else
            echo -ne "\r  Monitoring: ${ELAPSED}s, waiting for JSONL...    "
        fi

        if [[ $ELAPSED -gt 90 ]]; then
            echo ""
            echo "  ⚠ Timeout after 90s"
            # Debug: list JSONL files
            echo "  Debug: JSONL files newer than marker:"
            find "$JSONL_DIR" -maxdepth 1 -name "*.jsonl" -newer "$MARKER_FILE" 2>/dev/null | head -5
            tmux kill-session -t "$TMUX_SESSION" 2>/dev/null || true
            break
        fi
    done

    # Cleanup marker
    rm -f "$MARKER_FILE"

    if [[ "$COMPLETED" == "true" ]]; then
        echo "  Phase $STEP: SUCCESS"
        return 0
    else
        echo "  Phase $STEP: FAILED"
        return 1
    fi
}

# Run all phases
START_TIME=$(date +%s)

if run_test_phase 1; then
    echo ""
    echo "Auto-transitioning to Phase 2 in 3s..."
    sleep 3

    if run_test_phase 2; then
        echo ""
        echo "Auto-transitioning to Phase 3 in 3s..."
        sleep 3

        if run_test_phase 3; then
            echo ""
            echo "════════════════════════════════════════════════════════════════"
            echo "✓ ALL PHASES COMPLETE!"
            echo "════════════════════════════════════════════════════════════════"
        else
            echo "Phase 3 failed!"
            exit 1
        fi
    else
        echo "Phase 2 failed!"
        exit 1
    fi
else
    echo "Phase 1 failed!"
    exit 1
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
echo "Total duration: ${DURATION}s"
