#!/bin/bash
# Run analysis in tmux session with monitoring (CONTROLLER MODE)
# Usage: ./run-analyze.sh <project-path> [run-id]
#
# Creates tmux session: pipeline-<project>-analyze
# Runs Claude CLI with /analyze-pipeline-v5.2 slash command
# Monitor log: /tmp/pipeline-<project>-analyze-monitor.log
# Completion signal: ANALYSIS:COMPLETE in output
#
# CONTROLLER MODE: Never attaches to tmux - use ./pipeline watch

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

# Parse arguments
PROJECT_PATH=""
RUN_ID=""

while [[ $# -gt 0 ]]; do
    case $1 in
        *)
            if [[ -z "$PROJECT_PATH" ]]; then
                PROJECT_PATH="$1"
            else
                RUN_ID="$1"
            fi
            shift
            ;;
    esac
done

[[ -z "$PROJECT_PATH" ]] && die "Usage: $0 <project-path> [run-id]"

PROJECT_PATH=$(realpath "$PROJECT_PATH")
PROJECT_NAME=$(basename "$PROJECT_PATH")
TMUX_SESSION="pipeline-${PROJECT_NAME}-analyze"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Check if session already exists
if tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
    echo "Analysis session already running: $TMUX_SESSION"
    echo "Use: ./pipeline watch $PROJECT_PATH"
    echo "Or:  tmux attach -t $TMUX_SESSION"
    exit 0
fi

# Generate new session ID (valid UUID required)
SESSION_ID=$(uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid)

# Find JSONL file path (Claude stores sessions here)
PROJECT_ENCODED=$(echo "$PROJECT_PATH" | sed 's/^\//-/; s/\//-/g')
JSONL_DIR="$HOME/.claude/projects/$PROJECT_ENCODED"
JSONL_FILE="$JSONL_DIR/$SESSION_ID.jsonl"

# Monitor log
MONITOR_LOG="/tmp/${TMUX_SESSION}-monitor.log"
COMPLETION_SIGNAL="/tmp/${TMUX_SESSION}-complete"

# Build slash command arguments
SLASH_CMD_ARGS="$PROJECT_PATH"
[[ -n "$RUN_ID" ]] && SLASH_CMD_ARGS="$SLASH_CMD_ARGS $RUN_ID"

START_TIME=$(date +%s)

print_header "STARTING ANALYSIS (Intelligence System)"
echo "Project: $PROJECT_PATH"
[[ -n "$RUN_ID" ]] && echo "Run ID: $RUN_ID" || echo "Run ID: (latest)"
echo "Session: $TMUX_SESSION"
echo "Claude Session: $SESSION_ID"
echo "Monitor: $MONITOR_LOG"
print_header ""

# Kill any existing tmux session
tmux kill-session -t "$TMUX_SESSION" 2>/dev/null || true

# Create tmux session in project directory
tmux new-session -d -s "$TMUX_SESSION" -c "$PROJECT_PATH" -x 200 -y 50

# Enable mouse mode and scrollback for ./pipeline watch
# Set both session-specific and global mouse for maximum compatibility
tmux set-option -g mouse on 2>/dev/null || true
tmux set-option -t "$TMUX_SESSION" mouse on
tmux set-option -t "$TMUX_SESSION" history-limit 50000

# ═══════════════════════════════════════════════════════════════
# START BACKGROUND MONITOR (reads JSONL for ANALYSIS:COMPLETE)
# ═══════════════════════════════════════════════════════════════

(
    # Disable errexit in monitor subshell
    set +e

    echo "[Monitor] Starting JSONL-based monitor (Analysis)"
    echo "[Monitor] Session: $SESSION_ID"
    echo "[Monitor] JSONL: $JSONL_FILE"
    echo "[Monitor] Completion signal: ANALYSIS:COMPLETE"
    echo "[Monitor] ════════════════════════════════════════"

    START_TIME=$(date +%s)
    LAST_JSONL_SIZE=0
    LAST_CHANGE_TIME=$START_TIME

    while true; do
        sleep 10  # Check every 10s

        NOW=$(date +%s)
        ELAPSED=$((NOW - START_TIME))

        # Check if JSONL file exists
        if [[ -f "$JSONL_FILE" ]]; then
            CURRENT_SIZE=$(stat -c %s "$JSONL_FILE" 2>/dev/null || echo 0)

            # Track activity
            if [[ $CURRENT_SIZE -gt $LAST_JSONL_SIZE ]]; then
                LAST_CHANGE_TIME=$NOW
                LAST_JSONL_SIZE=$CURRENT_SIZE
            fi

            IDLE_TIME=$((NOW - LAST_CHANGE_TIME))

            # Check for ANALYSIS:COMPLETE signal in assistant text blocks
            if tail -100 "$JSONL_FILE" 2>/dev/null | grep '"type":"assistant"' | grep '"type":"text"' | grep -q "ANALYSIS:COMPLETE"; then
                echo "[Monitor] ════════════════════════════════════════"
                echo "[Monitor] ANALYSIS:COMPLETE detected!"
                echo "[Monitor] Duration: ${ELAPSED}s"
                echo "[Monitor] ════════════════════════════════════════"

                # Write completion signal
                echo "complete" > "$COMPLETION_SIGNAL"

                # Kill tmux session (unblocks main script)
                sleep 3
                tmux kill-session -t "$TMUX_SESSION" 2>/dev/null
                exit 0
            fi

            echo "[Monitor] Elapsed: ${ELAPSED}s | Idle: ${IDLE_TIME}s | Session: running"
        else
            echo "[Monitor] Elapsed: ${ELAPSED}s | Waiting for JSONL..."
        fi

        # Check if tmux session still exists
        if ! tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
            echo "[Monitor] Session ended"
            exit 1
        fi
    done
) > "$MONITOR_LOG" 2>&1 &
MONITOR_PID=$!

echo "Monitor: $MONITOR_LOG (PID: $MONITOR_PID)"

# ═══════════════════════════════════════════════════════════════
# START CLAUDE AND SEND COMMAND AUTOMATICALLY
# ═══════════════════════════════════════════════════════════════

# Build Claude command
CLAUDE_CMD="claude --session-id $SESSION_ID --dangerously-skip-permissions"

# Start Claude in tmux
echo "Starting Claude..."
tmux send-keys -t "$TMUX_SESSION" "$CLAUDE_CMD" Enter

# Wait for Claude to initialize
sleep 10

# Send the slash command
echo "Sending: /analyze-pipeline-v5.2 $SLASH_CMD_ARGS"
tmux send-keys -t "$TMUX_SESSION" "/analyze-pipeline-v5.2 $SLASH_CMD_ARGS"
sleep 2  # Wait for autocomplete menu
tmux send-keys -t "$TMUX_SESSION" Enter  # Select from autocomplete

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "Analysis controller running (use watch to view)"
echo "Monitor PID: $MONITOR_PID"
echo ""
echo "Commands:"
echo "  Watch:  ./pipeline watch $PROJECT_PATH"
echo "  Attach: tmux attach -t $TMUX_SESSION"
echo "  Log:    tail -f $MONITOR_LOG"
echo ""
echo "Waiting for ANALYSIS:COMPLETE signal..."
echo "════════════════════════════════════════════════════════════════"

# Poll for completion (monitor will kill tmux and write signal file)
while true; do
    # Check if completion signal was written
    if [[ -f "$COMPLETION_SIGNAL" ]]; then
        RESULT=$(cat "$COMPLETION_SIGNAL")
        rm -f "$COMPLETION_SIGNAL"
        if [[ "$RESULT" == "complete" ]]; then
            echo ""
            echo "✓ Analysis completed successfully"
        else
            echo ""
            echo "✗ Analysis failed"
        fi
        break
    fi

    # Check if tmux session still exists
    if ! tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
        echo ""
        echo "✓ Analysis session ended"
        break
    fi

    # Check if monitor is still running
    if ! kill -0 $MONITOR_PID 2>/dev/null; then
        echo ""
        echo "Monitor stopped, checking result..."
        break
    fi

    sleep 2
done

# ═══════════════════════════════════════════════════════════════
# CLEANUP
# ═══════════════════════════════════════════════════════════════

# Kill monitor
kill $MONITOR_PID 2>/dev/null || true

# Calculate duration
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Show results
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "Analysis Complete"
echo "Duration: ${DURATION}s ($(( DURATION / 60 ))m $(( DURATION % 60 ))s)"
echo "JSONL: $JSONL_FILE"
echo "Monitor: $MONITOR_LOG"
echo "════════════════════════════════════════════════════════════════"

# Show results location
RUNS_DIR="$PROJECT_PATH/.pipeline/runs"
if [[ -d "$RUNS_DIR" ]]; then
    LATEST_RUN=$(ls -1 "$RUNS_DIR" 2>/dev/null | sort -r | head -1)
    if [[ -n "$LATEST_RUN" ]] && [[ -d "$RUNS_DIR/$LATEST_RUN/analysis" ]]; then
        echo ""
        echo "Results:"
        echo "  Analysis: $RUNS_DIR/$LATEST_RUN/analysis/"
        ls "$RUNS_DIR/$LATEST_RUN/analysis/"*.json 2>/dev/null | head -5 | sed 's/^/    /'
    fi
fi
