#!/bin/bash
# Pipeline Step Runner v2 - Simplified & Robust
# Usage: ./run-step-v2.sh <step> <project-path>
#
# Key improvements over v1:
# 1. Monitor runs in main process (not background) for reliability
# 2. Simpler JSONL detection (checks file periodically)
# 3. Clear phase transition logic
# 4. Better debugging output

set -euo pipefail

# ═══════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════

STEP="${1:-}"
PROJECT_PATH="${2:-$(pwd)}"

if [ -z "$STEP" ]; then
    echo "Usage: ./run-step-v2.sh <step> <project-path>"
    echo "Steps: 0a, 0b, 1, 2, 3"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIPELINE_VER=$(cat "$SCRIPT_DIR/VERSION" 2>/dev/null | tr -d '\n' || echo "5.2")

# Resolve paths
PROJECT_PATH=$(realpath "$PROJECT_PATH")
PROJECT_NAME=$(basename "$PROJECT_PATH")

# ═══════════════════════════════════════════════════════════════
# COMMAND MAPPING
# ═══════════════════════════════════════════════════════════════

case "$STEP" in
    "test")   CMD_BASE="test-pipeline-simple" ;;
    "0a")     CMD_BASE="0a-pipeline-brainstorm" ;;
    "0b")     CMD_BASE="0b-pipeline-technical" ;;
    "1")      CMD_BASE="1-pipeline-bootstrap" ;;
    "2")      CMD_BASE="2-pipeline-implementEpic" ;;
    "3")      CMD_BASE="3-pipeline-finalize" ;;
    *)        echo "Unknown step: $STEP"; exit 1 ;;
esac

# Find command file (versioned first, then fallback)
CMD_DIR="/home/claude/.claude/commands"
if [[ -f "$CMD_DIR/${CMD_BASE}-v${PIPELINE_VER}.md" ]]; then
    SLASH_CMD="${CMD_BASE}-v${PIPELINE_VER}"
elif [[ -f "$CMD_DIR/${CMD_BASE}-v4.md" ]]; then
    SLASH_CMD="${CMD_BASE}-v4"
    echo "Warning: Using v4 command (v${PIPELINE_VER} not found)"
elif [[ -f "$CMD_DIR/${CMD_BASE}.md" ]]; then
    SLASH_CMD="${CMD_BASE}"
else
    echo "Error: Command not found: ${CMD_BASE}"
    exit 1
fi

# ═══════════════════════════════════════════════════════════════
# SETUP
# ═══════════════════════════════════════════════════════════════

mkdir -p "$PROJECT_PATH/docs/metrics" "$PROJECT_PATH/.pipeline"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
TMUX_SESSION="pipeline-${PROJECT_NAME}-${STEP}"
LOG_DIR="/tmp/pipeline-${PROJECT_NAME}"
mkdir -p "$LOG_DIR"

# JSONL directory (Claude's format: -home-claude-IMT-project)
PROJECT_ENCODED=$(echo "$PROJECT_PATH" | sed 's/^\//-/; s/\//-/g')
JSONL_DIR="$HOME/.claude/projects/$PROJECT_ENCODED"

# We'll find the actual JSONL file after Claude starts
# (Claude creates its own UUID, doesn't use --session-id for filename)
JSONL_FILE=""

# ═══════════════════════════════════════════════════════════════
# HEADER
# ═══════════════════════════════════════════════════════════════

echo "════════════════════════════════════════════════════════════════"
echo "PIPELINE STEP RUNNER v2"
echo "════════════════════════════════════════════════════════════════"
echo "Step:     $STEP"
echo "Project:  $PROJECT_PATH"
echo "Command:  /$SLASH_CMD"
echo "JSONL:    $JSONL_DIR/<auto>"
echo "Tmux:     $TMUX_SESSION"
echo "Started:  $(date)"
echo "════════════════════════════════════════════════════════════════"
echo ""

# ═══════════════════════════════════════════════════════════════
# KILL EXISTING SESSION
# ═══════════════════════════════════════════════════════════════

tmux kill-session -t "$TMUX_SESSION" 2>/dev/null || true

# ═══════════════════════════════════════════════════════════════
# CREATE TMUX SESSION AND START CLAUDE
# ═══════════════════════════════════════════════════════════════

echo "Creating tmux session..."
tmux new-session -d -s "$TMUX_SESSION" -c "$PROJECT_PATH"

# Create marker file to identify JSONL files created after this point
touch "$LOG_DIR/.claude_start_marker"

# Generate fresh session ID to prevent auto-resume
SESSION_ID=$(uuidgen)
SESSION_ID_FILE="$PROJECT_PATH/.pipeline/session-${STEP}.id"
echo "$SESSION_ID" > "$SESSION_ID_FILE"

echo "Starting Claude..."
echo "Session ID: $SESSION_ID"
tmux send-keys -t "$TMUX_SESSION" "claude --session-id $SESSION_ID --dangerously-skip-permissions" Enter

# Wait for Claude to initialize
echo "Waiting for Claude to initialize (10s)..."
sleep 10

# Send the slash command
# Claude CLI shows autocomplete menu when typing slash commands
# We need to: 1) Type command, 2) Wait for menu, 3) Send Enter to select
echo "Sending command: /$SLASH_CMD"
tmux send-keys -t "$TMUX_SESSION" "/$SLASH_CMD"
sleep 2  # Wait for autocomplete menu to appear
tmux send-keys -t "$TMUX_SESSION" Enter  # Select from autocomplete

# ═══════════════════════════════════════════════════════════════
# MONITORING FUNCTIONS
# ═══════════════════════════════════════════════════════════════

# Find the most recently modified JSONL file (not agent-* files)
find_latest_jsonl() {
    if [[ -d "$JSONL_DIR" ]]; then
        # Find newest JSONL that's not an agent file and was modified after Claude started
        find "$JSONL_DIR" -maxdepth 1 -name "*.jsonl" -newer "$LOG_DIR/.claude_start_marker" 2>/dev/null | \
            grep -v "agent-" | \
            xargs -r ls -t 2>/dev/null | \
            head -1
    fi
}

check_completion() {
    # Find latest JSONL if not already found
    if [[ -z "$JSONL_FILE" ]] || [[ ! -f "$JSONL_FILE" ]]; then
        JSONL_FILE=$(find_latest_jsonl)
    fi

    # Check if JSONL file exists and has PIPELINE:COMPLETE
    if [[ -n "$JSONL_FILE" ]] && [[ -f "$JSONL_FILE" ]]; then
        if grep -q "PIPELINE:COMPLETE" "$JSONL_FILE" 2>/dev/null; then
            return 0  # Complete
        fi
    fi
    return 1  # Not complete
}

check_session_alive() {
    tmux has-session -t "$TMUX_SESSION" 2>/dev/null
}

get_jsonl_size() {
    if [[ -n "$JSONL_FILE" ]] && [[ -f "$JSONL_FILE" ]]; then
        stat -c %s "$JSONL_FILE" 2>/dev/null || echo 0
    else
        echo 0
    fi
}

# ═══════════════════════════════════════════════════════════════
# MAIN MONITORING LOOP
# ═══════════════════════════════════════════════════════════════

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "MONITORING"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "To watch Claude: tmux attach -t $TMUX_SESSION"
echo "To detach:       Ctrl+B then D"
echo ""
echo "Waiting for PIPELINE:COMPLETE..."
echo ""

MONITOR_START=$(date +%s)
LAST_SIZE=0
LAST_ACTIVITY=$(date +%s)
CHECK_INTERVAL=10  # Check every 10 seconds

COMPLETED=false

while true; do
    sleep $CHECK_INTERVAL

    NOW=$(date +%s)
    ELAPSED=$((NOW - MONITOR_START))

    # Check if session still exists
    if ! check_session_alive; then
        echo ""
        echo "[Monitor] Tmux session ended (elapsed: ${ELAPSED}s)"
        break
    fi

    # Check JSONL file
    CURRENT_SIZE=$(get_jsonl_size)

    if [[ $CURRENT_SIZE -gt $LAST_SIZE ]]; then
        LAST_ACTIVITY=$NOW
        LAST_SIZE=$CURRENT_SIZE
    fi

    IDLE=$((NOW - LAST_ACTIVITY))

    # Status line
    echo -ne "\r[Monitor] Time: ${ELAPSED}s | JSONL: ${CURRENT_SIZE} bytes | Idle: ${IDLE}s    "

    # Check for completion
    if check_completion; then
        COMPLETED=true
        echo ""
        echo ""
        echo "════════════════════════════════════════════════════════════════"
        echo "✓ PIPELINE:COMPLETE detected!"
        echo "════════════════════════════════════════════════════════════════"

        # Kill tmux session
        tmux kill-session -t "$TMUX_SESSION" 2>/dev/null || true
        break
    fi

    # Check for stall (2 minutes of no activity)
    if [[ $IDLE -gt 120 ]] && [[ $CURRENT_SIZE -gt 0 ]]; then
        echo ""
        echo "[Monitor] Warning: No activity for ${IDLE}s"
        # Could add nudge here if needed
    fi
done

# ═══════════════════════════════════════════════════════════════
# RESULTS
# ═══════════════════════════════════════════════════════════════

END_TIME=$(date +%s)
DURATION=$((END_TIME - MONITOR_START))

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "STEP COMPLETE"
echo "════════════════════════════════════════════════════════════════"
echo "Duration: ${DURATION}s ($(( DURATION / 60 ))m $(( DURATION % 60 ))s)"
echo "Session:  $SESSION_ID"
echo "JSONL:    $JSONL_FILE"

if [[ "$COMPLETED" == "true" ]]; then
    echo "Status:   SUCCESS (PIPELINE:COMPLETE received)"
    EXIT_CODE=0
else
    echo "Status:   UNKNOWN (session ended without completion signal)"
    EXIT_CODE=1
fi

echo "════════════════════════════════════════════════════════════════"

# ═══════════════════════════════════════════════════════════════
# PHASE TRANSITIONS
# ═══════════════════════════════════════════════════════════════

if [[ "$COMPLETED" == "true" ]]; then
    MANIFEST="$PROJECT_PATH/.pipeline/manifest.json"

    # Check for looping phases (Phase 2)
    if [[ "$STEP" == "2" ]] && [[ -f "$MANIFEST" ]]; then
        IS_LOOPING=$(jq -r '.phases["2"].looping // false' "$MANIFEST" 2>/dev/null)

        if [[ "$IS_LOOPING" == "true" ]]; then
            # Count remaining loops
            TOTAL=$(jq -r '.phases["2"].loops | length' "$MANIFEST" 2>/dev/null)
            COMPLETE=$(jq '[.phases["2"].loops[] | select(.status == "complete")] | length' "$MANIFEST" 2>/dev/null)
            REMAINING=$((TOTAL - COMPLETE))

            # Get current loop name
            CURRENT_LOOP=$(jq -r '.phases["2"].loops[] | select(.status != "complete") | .name' "$MANIFEST" 2>/dev/null | head -1)

            if [[ $REMAINING -gt 0 ]]; then
                echo ""
                echo "════════════════════════════════════════════════════════════════"
                echo "PHASE 2: $COMPLETE/$TOTAL epics complete"
                echo "Next epic: $CURRENT_LOOP"
                echo "Restarting Phase 2 in 5 seconds..."
                echo "════════════════════════════════════════════════════════════════"
                sleep 5

                # Clear session and re-run
                rm -f "$SESSION_ID_FILE"
                exec "$0" "$STEP" "$PROJECT_PATH"
            else
                echo ""
                echo "════════════════════════════════════════════════════════════════"
                echo "ALL EPICS COMPLETE ($TOTAL/$TOTAL)"
                echo "════════════════════════════════════════════════════════════════"
            fi
        fi
    fi

    # Simple phase transitions
    declare -A NEXT_PHASE
    NEXT_PHASE["0b"]="1"
    NEXT_PHASE["1"]="2"
    NEXT_PHASE["2"]="3"

    NEXT="${NEXT_PHASE[$STEP]:-}"

    if [[ -n "$NEXT" ]]; then
        # Don't auto-transition from 2 to 3 if looping is handling it
        if [[ "$STEP" == "2" ]] && [[ -f "$MANIFEST" ]]; then
            IS_LOOPING=$(jq -r '.phases["2"].looping // false' "$MANIFEST" 2>/dev/null)
            if [[ "$IS_LOOPING" == "true" ]]; then
                NEXT=""  # Skip auto-transition, looping handles it
            fi
        fi

        if [[ -n "$NEXT" ]]; then
            echo ""
            echo "════════════════════════════════════════════════════════════════"
            echo "AUTO-TRANSITIONING TO PHASE $NEXT"
            echo "Starting in 5 seconds..."
            echo "════════════════════════════════════════════════════════════════"
            sleep 5

            # Update manifest
            if [[ -f "$MANIFEST" ]]; then
                jq ".phases[\"$STEP\"].status = \"complete\" | .phases[\"$STEP\"].completedAt = \"$(date -Iseconds)\"" \
                    "$MANIFEST" > "${MANIFEST}.tmp" && mv "${MANIFEST}.tmp" "$MANIFEST"
            fi

            # Clear next phase session and start
            rm -f "$PROJECT_PATH/.pipeline/session-${NEXT}.id"
            exec "$0" "$NEXT" "$PROJECT_PATH"
        fi
    fi
fi

exit $EXIT_CODE
