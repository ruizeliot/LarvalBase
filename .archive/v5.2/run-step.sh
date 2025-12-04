#!/bin/bash
# Pipeline step runner with todo monitoring
# Usage: ./run-step.sh <step> [project-path]
#
# Uses tmux + todo monitor to:
# - Run Claude in a monitored session
# - Nudge if stalled with remaining todos
# - Detect PIPELINE:COMPLETE for step completion

set -euo pipefail

STEP="${1:-}"
PROJECT_PATH="${2:-$(pwd)}"

if [ -z "$STEP" ]; then
    echo "Usage: ./run-step.sh <step> [project-path]"
    echo "Steps: 0a, 0b, 1, 2, 3, 0a-feature, 0b-feature, 1-feature, 2-feature, 3-feature"
    exit 1
fi

# Setup paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/todo-monitor.sh"
source "$SCRIPT_DIR/lib/module-health.sh" 2>/dev/null || true

# Get pipeline version for command naming
PIPELINE_VER=$(cat "$SCRIPT_DIR/VERSION" 2>/dev/null | tr -d '\n' || echo "5.2")

# Map step to command base name
case "$STEP" in
    "test")         CMD_BASE="test-pipeline-simple" ;;
    "0a")           CMD_BASE="0a-pipeline-brainstorm" ;;
    "0a-feature")   CMD_BASE="0a-pipeline-brainstorm-feature" ;;
    "0b")           CMD_BASE="0b-pipeline-technical" ;;
    "0b-feature")   CMD_BASE="0b-pipeline-technical-feature" ;;
    "1")            CMD_BASE="1-pipeline-bootstrap" ;;
    "1-feature")    CMD_BASE="1-pipeline-bootstrap-feature" ;;
    "2")            CMD_BASE="2-pipeline-implementEpic" ;;
    "2-feature")    CMD_BASE="2-pipeline-implementEpic-feature" ;;
    "3")            CMD_BASE="3-pipeline-finalize" ;;
    "3-feature")    CMD_BASE="3-pipeline-finalize-feature" ;;
    *)              echo "Unknown step: $STEP"; exit 1 ;;
esac

# Try versioned command first, fall back to v4, then non-versioned
CMD_DIR="/home/claude/.claude/commands"
if [[ -f "$CMD_DIR/${CMD_BASE}-v${PIPELINE_VER}.md" ]]; then
    CMD_FILE="${CMD_BASE}-v${PIPELINE_VER}.md"
elif [[ -f "$CMD_DIR/${CMD_BASE}-v4.md" ]]; then
    CMD_FILE="${CMD_BASE}-v4.md"
    echo "Warning: Using v4 command (v${PIPELINE_VER} not found)"
elif [[ -f "$CMD_DIR/${CMD_BASE}.md" ]]; then
    CMD_FILE="${CMD_BASE}.md"
    echo "Using non-versioned command: ${CMD_BASE}.md"
else
    echo "Command not found: ${CMD_BASE}-v${PIPELINE_VER}.md, ${CMD_BASE}-v4.md, or ${CMD_BASE}.md"
    exit 1
fi

CMD_PATH="$CMD_DIR/$CMD_FILE"
SLASH_CMD=$(basename "$CMD_FILE" .md)

# Resolve project path
PROJECT_PATH=$(realpath "$PROJECT_PATH")
PROJECT_NAME=$(basename "$PROJECT_PATH")

# Setup directories
mkdir -p "$PROJECT_PATH/docs/metrics" "$PROJECT_PATH/.pipeline"

# Timestamps and session naming
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SESSION_NAME="pipeline-${PROJECT_NAME}-${STEP}"
OUTPUT_FILE="/tmp/${SESSION_NAME}-${TIMESTAMP}.log"
TRANSCRIPT="$PROJECT_PATH/docs/metrics/${STEP}-${TIMESTAMP}-transcript.md"

START_TIME=$(date +%s)
START_ISO=$(date -Iseconds)

# ═══════════════════════════════════════════════════════════════
# HEADER
# ═══════════════════════════════════════════════════════════════

echo "════════════════════════════════════════════════════════════════"
echo "Step: $STEP"
echo "════════════════════════════════════════════════════════════════"
echo "Project: $PROJECT_PATH"
echo "Session: $SESSION_NAME"
echo "Output:  $OUTPUT_FILE"
echo "Started: $(date)"
echo "════════════════════════════════════════════════════════════════"
echo ""

# ═══════════════════════════════════════════════════════════════
# INTELLIGENCE CONTEXT
# ═══════════════════════════════════════════════════════════════

INTEL_FILE="$PROJECT_PATH/.pipeline/intelligence-context.md"
echo "Analyzing project for relevant modules and patterns..."

if type export_intelligence_context &>/dev/null; then
    INTEL_CONTEXT=$(export_intelligence_context "$PROJECT_PATH" 2>/dev/null || true)
    if [[ -n "$INTEL_CONTEXT" ]]; then
        echo "$INTEL_CONTEXT" > "$INTEL_FILE"
        echo "✓ Intelligence context generated ($(wc -l < "$INTEL_FILE") lines)"
    else
        echo "  (No relevant modules found)"
        echo "# No intelligence context for this step" > "$INTEL_FILE"
    fi
else
    echo "  (Intelligence system not available)"
    echo "# Intelligence system not available" > "$INTEL_FILE"
fi
echo ""

# ═══════════════════════════════════════════════════════════════
# TMUX SESSION SETUP (for automation, NO pipe-pane)
# ═══════════════════════════════════════════════════════════════

# Get pipeline info from manifest (for generic session naming)
MANIFEST="$PROJECT_PATH/.pipeline/manifest.json"
if [[ -f "$MANIFEST" ]]; then
    PIPELINE_TYPE=$(jq -r '.pipeline.type // "generic"' "$MANIFEST" 2>/dev/null)
    PIPELINE_VERSION=$(jq -r '.pipeline.version // "1.0"' "$MANIFEST" 2>/dev/null)
else
    PIPELINE_TYPE="generic"
    PIPELINE_VERSION="1.0"
fi

# Session management with pipeline type/version
SESSION_ID_FILE="$PROJECT_PATH/.pipeline/session-${PIPELINE_TYPE}-${STEP}.id"
TMUX_SESSION="pipeline-${PROJECT_NAME}-${STEP}"

# Kill any existing tmux session
tmux kill-session -t "$TMUX_SESSION" 2>/dev/null || true

if [[ -f "$SESSION_ID_FILE" ]]; then
    SESSION_ID=$(cat "$SESSION_ID_FILE")
    echo "Resuming Claude session: $SESSION_ID"
    RESUME_MODE=true
else
    SESSION_ID=$(uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid)
    echo "$SESSION_ID" > "$SESSION_ID_FILE"
    echo "New Claude session: $SESSION_ID"
    RESUME_MODE=false
fi

# Find JSONL file path (Claude stores sessions here)
# Claude uses - as path separator, not %2F encoding
PROJECT_ENCODED=$(echo "$PROJECT_PATH" | sed 's/^\//-/; s/\//-/g')
JSONL_DIR="$HOME/.claude/projects/$PROJECT_ENCODED"
JSONL_FILE="$JSONL_DIR/$SESSION_ID.jsonl"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "Starting automated Claude session"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Create tmux session in project directory
tmux new-session -d -s "$TMUX_SESSION" -c "$PROJECT_PATH"

# ═══════════════════════════════════════════════════════════════
# START BACKGROUND MONITOR (reads JSONL, not terminal)
# ═══════════════════════════════════════════════════════════════

MONITOR_LOG="/tmp/${TMUX_SESSION}-monitor.log"

(
    echo "[Monitor] Starting JSONL-based monitor"
    echo "[Monitor] Session: $SESSION_ID"
    echo "[Monitor] JSONL: $JSONL_FILE"
    echo "[Monitor] Stall threshold: 90s"
    echo "[Monitor] Nudge cooldown: 120s"

    ZERO_TODO_COUNT=0
    START_TIME=$(date +%s)
    LAST_JSONL_SIZE=0
    LAST_CHANGE_TIME=$START_TIME
    LAST_NUDGE_TIME=0

    while true; do
        sleep 30

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

            # Parse todos from last assistant message in JSONL
            LAST_MSG=$(tail -50 "$JSONL_FILE" 2>/dev/null | grep '"type":"assistant"' | tail -1)

            # Check for signal file (PRIMARY completion method - programmatic)
            SIGNAL_FILE="$PROJECT_PATH/.pipeline/.signal-${STEP}-complete"
            if [[ -f "$SIGNAL_FILE" ]]; then
                echo "[Monitor] ════════════════════════════════════════"
                echo "[Monitor] Signal file detected: $SIGNAL_FILE"
                echo "[Monitor] Killing tmux session to trigger next phase..."
                echo "[Monitor] ════════════════════════════════════════"

                # Write completion signal
                echo "COMPLETE" > "/tmp/${TMUX_SESSION}-complete"

                # Remove signal file (consumed)
                rm -f "$SIGNAL_FILE"

                # Kill tmux session (unblocks main script)
                tmux kill-session -t "$TMUX_SESSION" 2>/dev/null
                exit 0
            fi

            # DEPRECATED: Text-based PIPELINE:COMPLETE detection (fallback only)
            # Will be removed in future version - use ./pipeline signal instead
            if tail -100 "$JSONL_FILE" 2>/dev/null | grep -q "PIPELINE:COMPLETE"; then
                echo "[Monitor] ════════════════════════════════════════"
                echo "[Monitor] PIPELINE:COMPLETE text detected (DEPRECATED)"
                echo "[Monitor] NOTE: Use './pipeline signal $STEP' instead"
                echo "[Monitor] Killing tmux session to trigger next phase..."
                echo "[Monitor] ════════════════════════════════════════"

                # Write completion signal
                echo "COMPLETE" > "/tmp/${TMUX_SESSION}-complete"

                # Kill tmux session (unblocks main script)
                tmux kill-session -t "$TMUX_SESSION" 2>/dev/null
                exit 0
            fi

            # Check for PIPELINE:BATCH_COMPLETE (partial completion, continue same phase)
            if tail -20 "$JSONL_FILE" 2>/dev/null | grep -q "PIPELINE:BATCH_COMPLETE"; then
                echo "[Monitor] PIPELINE:BATCH_COMPLETE detected - batch done, waiting for next"
                # Reset to avoid re-detecting same signal
                sleep 10
            fi

            # Count checkboxes (secondary completion method)
            PENDING=$(echo "$LAST_MSG" | grep -o '☐' | wc -l)
            COMPLETED=$(echo "$LAST_MSG" | grep -o '☒' | wc -l)
            TOTAL=$((PENDING + COMPLETED))

            echo "[Monitor] Elapsed: ${ELAPSED}s | Todos: $COMPLETED/$TOTAL | Idle: ${IDLE_TIME}s"

            # Check completion via todos (backup method)
            if [[ $TOTAL -gt 0 && $PENDING -eq 0 ]]; then
                ZERO_TODO_COUNT=$((ZERO_TODO_COUNT + 1))
                if [[ $ZERO_TODO_COUNT -ge 3 ]]; then
                    echo "[Monitor] All todos complete (3 consecutive checks)"
                    echo "COMPLETE" > "/tmp/${TMUX_SESSION}-complete"
                    tmux kill-session -t "$TMUX_SESSION" 2>/dev/null
                    exit 0
                fi
            else
                ZERO_TODO_COUNT=0
            fi

            # Stall detection with nudge
            if [[ $IDLE_TIME -gt 90 && $PENDING -gt 0 ]]; then
                # Check if tests are running (don't interrupt)
                # Covers: JS/TS (cypress,jest,vitest,mocha,playwright), Unity (Unity -runTests),
                # .NET (dotnet test,nunit,xunit), Python (pytest), Go, Rust, Java, Ruby, PHP
                if pgrep -f "cypress|jest|vitest|mocha|playwright|Unity.*-runTests|Unity.*-batchmode|dotnet.test|nunit|xunit|pytest|python.*pytest|go.test|cargo.test|mvn.test|gradle.test|rspec|phpunit|npm.test|npx.*test" > /dev/null 2>&1; then
                    echo "[Monitor] Idle but tests running - no nudge"
                else
                    # Check nudge cooldown (120s)
                    SINCE_NUDGE=$((NOW - LAST_NUDGE_TIME))
                    if [[ $SINCE_NUDGE -gt 120 ]]; then
                        echo "[Monitor] Stalled! Sending nudge..."
                        tmux send-keys -t "$TMUX_SESSION" "[AUTO] You appear stalled with $PENDING todos remaining. Please continue." Enter
                        LAST_NUDGE_TIME=$NOW
                    else
                        echo "[Monitor] Stalled but nudge cooldown (${SINCE_NUDGE}s < 120s)"
                    fi
                fi
            fi
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
if [[ "$RESUME_MODE" == "true" ]]; then
    CLAUDE_CMD="claude --resume $SESSION_ID --dangerously-skip-permissions"
else
    CLAUDE_CMD="claude --session-id $SESSION_ID --dangerously-skip-permissions"
fi

# Start Claude in tmux
echo "Starting Claude..."
tmux send-keys -t "$TMUX_SESSION" "$CLAUDE_CMD" Enter

# Wait for Claude to initialize
sleep 10

# Send the slash command
# Wait for autocomplete menu then Enter to select
echo "Sending: /$SLASH_CMD"
tmux send-keys -t "$TMUX_SESSION" "/$SLASH_CMD"
sleep 2  # Wait for autocomplete menu to appear
tmux send-keys -t "$TMUX_SESSION" Enter  # Select from autocomplete

echo ""
echo "════════════════════════════════════════════════════════════════"

# Completion signal file
COMPLETION_SIGNAL="/tmp/${TMUX_SESSION}-complete"

# Check if we have a TTY (interactive mode)
if [[ -t 0 ]] && [[ -t 1 ]]; then
    # INTERACTIVE MODE: Attach to tmux session
    echo "Claude is running. Attaching in 5s..."
    echo "(Ctrl+B D to detach - pipeline will continue in background)"
    echo "════════════════════════════════════════════════════════════════"

    # Wait for terminal queries to settle before attaching
    sleep 5

    # Attach user to watch (use -d to detach other clients first)
    tmux attach-session -t "$TMUX_SESSION"
    CLAUDE_EXIT=$?

    # After attach returns, check if session still exists (user detached vs completed)
    if tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
        # User detached but session still running - wait for completion
        echo ""
        echo "════════════════════════════════════════════════════════════════"
        echo "Session still running. Waiting for PIPELINE:COMPLETE..."
        echo "(Re-attach with: tmux attach -t $TMUX_SESSION)"
        echo "════════════════════════════════════════════════════════════════"

        # Wait for completion signal
        while true; do
            if [[ -f "$COMPLETION_SIGNAL" ]]; then
                echo "✓ Completion signal received"
                CLAUDE_EXIT=0
                break
            fi

            if ! tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
                echo "✓ Tmux session ended"
                CLAUDE_EXIT=0
                break
            fi

            if ! kill -0 $MONITOR_PID 2>/dev/null; then
                echo "Monitor stopped, checking result..."
                CLAUDE_EXIT=0
                break
            fi

            sleep 2
        done
    fi
else
    # HEADLESS MODE: Wait for completion signal from monitor
    echo "Running in headless mode (no TTY detected)"
    echo "Monitor PID: $MONITOR_PID"
    echo "Waiting for PIPELINE:COMPLETE signal..."
    echo "════════════════════════════════════════════════════════════════"

    # Poll for completion (monitor will kill tmux and write signal file)
    while true; do
        # Check if completion signal was written
        if [[ -f "$COMPLETION_SIGNAL" ]]; then
            echo "✓ Completion signal received"
            CLAUDE_EXIT=0
            break
        fi

        # Check if tmux session still exists
        if ! tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
            echo "✓ Tmux session ended"
            CLAUDE_EXIT=0
            break
        fi

        # Check if monitor is still running
        if ! kill -0 $MONITOR_PID 2>/dev/null; then
            echo "Monitor stopped, checking result..."
            CLAUDE_EXIT=0
            break
        fi

        sleep 2
    done
fi

# ═══════════════════════════════════════════════════════════════
# CLEANUP
# ═══════════════════════════════════════════════════════════════

# Kill monitor
kill $MONITOR_PID 2>/dev/null || true

# Check monitor result - signal file, text-based, or todos complete
# (COMPLETION_SIGNAL already defined above)
if [[ -f "$COMPLETION_SIGNAL" ]] || grep -q "Signal file detected" "$MONITOR_LOG" 2>/dev/null; then
    MONITOR_RESULT=0
    echo "✓ Step completed via signal file"
    rm -f "$COMPLETION_SIGNAL"
elif grep -q "PIPELINE:COMPLETE text detected" "$MONITOR_LOG" 2>/dev/null; then
    MONITOR_RESULT=0
    echo "✓ Step completed via PIPELINE:COMPLETE text (deprecated)"
elif grep -q "All todos complete" "$MONITOR_LOG" 2>/dev/null; then
    MONITOR_RESULT=0
    echo "✓ Step completed via todo completion"
else
    MONITOR_RESULT=1
fi

# Calculate duration
END_TIME=$(date +%s)
END_ISO=$(date -Iseconds)
DURATION=$((END_TIME - START_TIME))

# ═══════════════════════════════════════════════════════════════
# GENERATE TRANSCRIPT FROM JSONL
# ═══════════════════════════════════════════════════════════════

echo ""
echo "Generating transcript from JSONL..."

# Use the JSONL transcript generator
if [[ -f "$JSONL_FILE" ]]; then
    "$SCRIPT_DIR/lib/jsonl-to-transcript.sh" "$JSONL_FILE" > "$TRANSCRIPT" 2>/dev/null || {
        # Fallback: basic transcript
        cat > "$TRANSCRIPT" << EOF
# Step Transcript: $STEP

**Started:** $START_ISO
**Ended:** $END_ISO
**Duration:** ${DURATION}s
**Project:** $PROJECT_PATH
**Session:** $SESSION_ID

---

## Note

Transcript generated from JSONL. See: $JSONL_FILE
EOF
    }
    echo "✓ Transcript saved: $TRANSCRIPT"
else
    echo "Warning: JSONL file not found: $JSONL_FILE"
fi

# ═══════════════════════════════════════════════════════════════
# RESULTS
# ═══════════════════════════════════════════════════════════════

echo ""
echo "════════════════════════════════════════════════════════════════"
if [[ $MONITOR_RESULT -eq 0 ]]; then
    echo "Step Complete: SUCCESS (all todos done)"

    # Update phase status in manifest immediately on success
    MANIFEST="$PROJECT_PATH/.pipeline/manifest.json"
    if [[ -f "$MANIFEST" ]]; then
        jq ".phases[\"$STEP\"].status = \"complete\" | .phases[\"$STEP\"].completedAt = \"$(date -Iseconds)\"" \
            "$MANIFEST" > "${MANIFEST}.tmp" && mv "${MANIFEST}.tmp" "$MANIFEST"
        echo "✓ Phase $STEP marked complete in manifest"
    fi
else
    echo "Step Complete: Session ended"
fi
echo "Duration: ${DURATION}s ($(( DURATION / 60 ))m $(( DURATION % 60 ))s)"
echo "Transcript: $TRANSCRIPT"
echo "JSONL: $JSONL_FILE"
echo "Monitor log: $MONITOR_LOG"
echo "════════════════════════════════════════════════════════════════"

# ═══════════════════════════════════════════════════════════════
# LOOPING PHASE HANDLER - Continue until all loops complete
# ═══════════════════════════════════════════════════════════════

MANIFEST="$PROJECT_PATH/.pipeline/manifest.json"

if [[ -f "$MANIFEST" ]]; then
    # Check if current phase is a looping phase
    IS_LOOPING=$(jq -r ".phases[\"$STEP\"].looping // false" "$MANIFEST" 2>/dev/null)

    if [[ "$IS_LOOPING" == "true" ]]; then
        # Get loop type and counts from generic loops array
        LOOP_TYPE=$(jq -r ".phases[\"$STEP\"].loop_type // \"cycle\"" "$MANIFEST" 2>/dev/null)
        LOOPS_TOTAL=$(jq -r ".phases[\"$STEP\"].loops | length" "$MANIFEST" 2>/dev/null)
        LOOPS_COMPLETE=$(jq -r "[.phases[\"$STEP\"].loops[] | select(.status == \"complete\")] | length" "$MANIFEST" 2>/dev/null)
        LOOPS_REMAINING=$((LOOPS_TOTAL - LOOPS_COMPLETE))

        # Find current loop (first non-complete)
        CURRENT_LOOP=$(jq -r ".phases[\"$STEP\"].loops[] | select(.status != \"complete\") | .name" "$MANIFEST" 2>/dev/null | head -1)

        echo ""
        if [[ $LOOPS_REMAINING -gt 0 ]]; then
            echo "════════════════════════════════════════════════════════════════"
            echo "PHASE $STEP: $LOOPS_COMPLETE/$LOOPS_TOTAL ${LOOP_TYPE}s complete"
            echo "Next ${LOOP_TYPE}: $CURRENT_LOOP"
            echo "Continuing in 5 seconds..."
            echo "════════════════════════════════════════════════════════════════"
            sleep 5

            # Clear session ID to start fresh
            rm -f "$SESSION_ID_FILE"

            # Re-execute this script for next loop
            exec "$0" "$STEP" "$PROJECT_PATH"
        else
            echo "════════════════════════════════════════════════════════════════"
            echo "ALL ${LOOP_TYPE^^}S COMPLETE ($LOOPS_TOTAL/$LOOPS_TOTAL)"
            echo "Phase $STEP finished."
            echo "════════════════════════════════════════════════════════════════"

            # AUTO-PHASE 3 TRIGGER: If Phase 2 completes, automatically start Phase 3
            if [[ "$STEP" == "2" ]]; then
                PHASE_3_STATUS=$(jq -r '.phases["3"].status // "pending"' "$MANIFEST" 2>/dev/null)

                if [[ "$PHASE_3_STATUS" == "pending" ]]; then
                    echo ""
                    echo "════════════════════════════════════════════════════════════════"
                    echo "AUTO-TRIGGERING PHASE 3: Finalize"
                    echo "Starting in 5 seconds..."
                    echo "════════════════════════════════════════════════════════════════"
                    sleep 5

                    # Update Phase 2 status to complete
                    jq '.phases["2"].status = "complete"' "$MANIFEST" > "${MANIFEST}.tmp" && \
                        mv "${MANIFEST}.tmp" "$MANIFEST"

                    # Clear session ID for fresh start
                    rm -f "$SESSION_ID_FILE"

                    # Execute Phase 3
                    exec "$0" "3" "$PROJECT_PATH"
                fi
            fi
        fi
    fi
fi

# ═══════════════════════════════════════════════════════════════
# NON-LOOPING PHASE TRANSITIONS (0b→1, 1→2)
# ═══════════════════════════════════════════════════════════════

if [[ -f "$MANIFEST" ]]; then
    # Define phase transitions
    declare -A NEXT_PHASE
    NEXT_PHASE["0b"]="1"
    NEXT_PHASE["1"]="2"
    # Phase 2→3 handled above in looping section

    NEXT="${NEXT_PHASE[$STEP]:-}"

    if [[ -n "$NEXT" ]]; then
        NEXT_STATUS=$(jq -r ".phases[\"$NEXT\"].status // \"pending\"" "$MANIFEST" 2>/dev/null)
        CURRENT_STATUS=$(jq -r ".phases[\"$STEP\"].status // \"pending\"" "$MANIFEST" 2>/dev/null)

        # Only trigger if next phase is pending or in-progress (not complete)
        # Claude may have already set next phase to "in-progress" when updating manifest
        if [[ "$NEXT_STATUS" == "pending" || "$NEXT_STATUS" == "in-progress" ]]; then
            echo ""
            echo "════════════════════════════════════════════════════════════════"
            echo "AUTO-TRIGGERING PHASE $NEXT"
            echo "Starting in 5 seconds..."
            echo "════════════════════════════════════════════════════════════════"
            sleep 5

            # Update current phase status to complete
            jq ".phases[\"$STEP\"].status = \"complete\" | .phases[\"$STEP\"].completedAt = \"$(date -Iseconds)\"" \
                "$MANIFEST" > "${MANIFEST}.tmp" && mv "${MANIFEST}.tmp" "$MANIFEST"

            # Clear session ID for fresh start
            NEXT_SESSION_FILE="$PROJECT_PATH/.pipeline/session-${PIPELINE_TYPE}-${NEXT}.id"
            rm -f "$NEXT_SESSION_FILE"

            # Execute next phase
            exec "$0" "$NEXT" "$PROJECT_PATH"
        fi
    fi
fi

exit $CLAUDE_EXIT
