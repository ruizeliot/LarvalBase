#!/bin/bash
# Pipeline v6 - Unified runner with separate Claude sessions per phase
# Usage: ./run-pipeline.sh <project-path> [--feature] [--from <phase>]
#
# Creates ONE tmux session, runs SEPARATE Claude instances per phase:
#   0a (brainstorm) → 0b (technical) → 1 (bootstrap) → 2 (implement) → 3 (finalize)

set -euo pipefail

# Parse arguments
PROJECT_PATH=""
FEATURE_MODE=""
FROM_PHASE=""
SESSION_PREFIX="pipeline"
NO_NUDGE=""
FOREGROUND_MODE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --feature|-f)
            FEATURE_MODE="--feature"
            shift
            ;;
        --from)
            FROM_PHASE="$2"
            shift 2
            ;;
        --session-prefix)
            SESSION_PREFIX="$2"
            shift 2
            ;;
        --no-nudge)
            NO_NUDGE="true"
            shift
            ;;
        --foreground|--fg)
            FOREGROUND_MODE="true"
            shift
            ;;
        -*)
            echo "Unknown option: $1"
            exit 1
            ;;
        *)
            if [ -z "$PROJECT_PATH" ]; then
                PROJECT_PATH="$1"
            fi
            shift
            ;;
    esac
done

# Auto-detect Windows (no tmux) and enable foreground mode
detect_platform() {
    if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ -n "${WINDIR:-}" ]]; then
        echo "windows"
    elif ! command -v tmux &>/dev/null; then
        echo "no-tmux"
    else
        echo "linux"
    fi
}

PLATFORM=$(detect_platform)
if [[ "$PLATFORM" == "windows" ]] || [[ "$PLATFORM" == "no-tmux" ]]; then
    if [[ -z "$FOREGROUND_MODE" ]]; then
        echo "⚠️  tmux not available. Running in foreground mode."
        echo "   (Use --foreground explicitly to suppress this message)"
        echo ""
        FOREGROUND_MODE="true"
    fi
fi

if [ -z "$PROJECT_PATH" ]; then
    echo "Usage: ./run-pipeline.sh <project-path> [--feature] [--from <phase>]"
    exit 1
fi

# Setup paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIPELINE_VER=$(cat "$SCRIPT_DIR/VERSION" 2>/dev/null | tr -d '\n' || echo "5.2")

# Resolve project path
PROJECT_PATH=$(realpath "$PROJECT_PATH")
PROJECT_NAME=$(basename "$PROJECT_PATH")

# Setup directories
mkdir -p "$PROJECT_PATH/docs/metrics" "$PROJECT_PATH/.pipeline"

# Tmux session (one for entire pipeline)
TMUX_SESSION="${SESSION_PREFIX}-${PROJECT_NAME}"

# JSONL monitoring setup
PROJECT_ENCODED=$(echo "$PROJECT_PATH" | sed 's/^\//-/; s/\//-/g')
JSONL_DIR="$HOME/.claude/projects/$PROJECT_ENCODED"

# ═══════════════════════════════════════════════════════════════
# PHASE DEFINITIONS
# ═══════════════════════════════════════════════════════════════

if [ "$FEATURE_MODE" = "--feature" ]; then
    PHASES=("0a-feature" "0b-feature" "1-feature" "2-feature" "3-feature")
else
    PHASES=("0a" "0b" "1" "2" "3")
fi

# ═══════════════════════════════════════════════════════════════
# AUTO-DETECT RESUME POINT (or use --from override)
# ═══════════════════════════════════════════════════════════════

MANIFEST="$PROJECT_PATH/.pipeline/manifest.json"
START_PHASE=""

# If --from was specified, use that
if [[ -n "$FROM_PHASE" ]]; then
    # Add -feature suffix if in feature mode
    if [[ "$FEATURE_MODE" == "--feature" && "$FROM_PHASE" != *-feature ]]; then
        START_PHASE="${FROM_PHASE}-feature"
    else
        START_PHASE="$FROM_PHASE"
    fi
elif [[ -f "$MANIFEST" ]]; then
    # Auto-detect: Check each phase in order, find first incomplete
    for phase in "${PHASES[@]}"; do
        # Normalize phase name for manifest lookup (remove -feature suffix)
        local_phase="${phase%-feature}"
        phase_status=$(jq -r ".phases[\"$local_phase\"].status // \"pending\"" "$MANIFEST" 2>/dev/null)
        if [[ "$phase_status" != "complete" ]]; then
            START_PHASE="$phase"
            break
        fi
    done
fi

# Default to first phase if nothing detected
START_PHASE="${START_PHASE:-${PHASES[0]}}"

# Map phase to slash command
get_slash_cmd() {
    local phase="$1"
    local cmd_base=""

    # Test mode for mock-test project
    if [[ "$PROJECT_NAME" == "mock-test" ]]; then
        case "$phase" in
            "0a"|"0a-feature") echo "test-0a"; return 0 ;;
            "0b"|"0b-feature") echo "test-0b"; return 0 ;;
            "1"|"1-feature")   echo "test-1"; return 0 ;;
            "2"|"2-feature")   echo "test-2"; return 0 ;;
            "3"|"3-feature")   echo "test-3"; return 0 ;;
            *)                 echo ""; return 1 ;;
        esac
    fi

    case "$phase" in
        "0a")           cmd_base="0a-pipeline-brainstorm" ;;
        "0a-feature")   cmd_base="0a-pipeline-brainstorm-feature" ;;
        "0b")           cmd_base="0b-pipeline-technical" ;;
        "0b-feature")   cmd_base="0b-pipeline-technical-feature" ;;
        "1")            cmd_base="1-pipeline-bootstrap" ;;
        "1-feature")    cmd_base="1-pipeline-bootstrap-feature" ;;
        "2")            cmd_base="2-pipeline-implementEpic" ;;
        "2-feature")    cmd_base="2-pipeline-implementEpic-feature" ;;
        "3")            cmd_base="3-pipeline-finalize" ;;
        "3-feature")    cmd_base="3-pipeline-finalize-feature" ;;
        *)              echo ""; return 1 ;;
    esac

    # Try versioned command first - detect platform for correct path
    local cmd_dir=""
    if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ -n "${WINDIR:-}" ]]; then
        cmd_dir="$USERPROFILE/.claude/commands"
        # Also try Git Bash path format
        [[ ! -d "$cmd_dir" ]] && cmd_dir="/c/Users/$USER/.claude/commands"
    else
        cmd_dir="$HOME/.claude/commands"
        [[ ! -d "$cmd_dir" ]] && cmd_dir="/home/claude/.claude/commands"
    fi

    if [[ -f "$cmd_dir/${cmd_base}-v${PIPELINE_VER}.md" ]]; then
        echo "${cmd_base}-v${PIPELINE_VER}"
    elif [[ -f "$cmd_dir/${cmd_base}-v5.2.md" ]]; then
        echo "${cmd_base}-v5.2"
    elif [[ -f "$cmd_dir/${cmd_base}-v4.md" ]]; then
        echo "${cmd_base}-v4"
    else
        echo "$cmd_base"
    fi
}

get_phase_name() {
    case "$1" in
        "0a"|"0a-feature") echo "Brainstorm & User Stories" ;;
        "0b"|"0b-feature") echo "Technical Specification" ;;
        "1"|"1-feature")   echo "Bootstrap (skeleton + failing tests)" ;;
        "2"|"2-feature")   echo "Implementation" ;;
        "3"|"3-feature")   echo "Finalize & Deploy" ;;
        *)                 echo "Unknown" ;;
    esac
}

# ═══════════════════════════════════════════════════════════════
# HEADER
# ═══════════════════════════════════════════════════════════════

echo "════════════════════════════════════════════════════════════════"
echo "PIPELINE v6"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Project: $PROJECT_PATH"
echo "Session: $TMUX_SESSION"
echo "Mode:    $([ "$FEATURE_MODE" = "--feature" ] && echo "Feature" || echo "New Project")"
echo "Platform: $PLATFORM"
if [[ "$FOREGROUND_MODE" == "true" ]]; then
    echo "Run Mode: Foreground (no tmux)"
else
    echo "Run Mode: tmux"
fi
echo ""

# Show resume info
if [[ -n "$FROM_PHASE" ]]; then
    echo "Starting from: Phase ${START_PHASE%-feature} (--from override)"
elif [[ "$START_PHASE" != "${PHASES[0]}" ]]; then
    echo "Resuming from: Phase ${START_PHASE%-feature} (auto-detected)"
else
    echo "Starting from: Phase ${START_PHASE%-feature}"
fi
echo ""

echo "Phases:"
for phase in "${PHASES[@]}"; do
    local_phase="${phase%-feature}"
    if [[ "$phase" == "$START_PHASE" ]]; then
        echo "  → $phase: $(get_phase_name "$phase") [START]"
    elif [[ -f "$MANIFEST" ]]; then
        status=$(jq -r ".phases[\"$local_phase\"].status // \"pending\"" "$MANIFEST" 2>/dev/null)
        if [[ "$status" == "complete" ]]; then
            echo "  ✓ $phase: $(get_phase_name "$phase") [complete]"
        else
            echo "  - $phase: $(get_phase_name "$phase")"
        fi
    else
        echo "  - $phase: $(get_phase_name "$phase")"
    fi
done
echo ""
echo "Controls:"
if [[ "$FOREGROUND_MODE" == "true" ]]; then
    echo "  Ctrl+C                Stop pipeline"
    echo "  ./pipeline watch      Tail log file"
    echo "  ./pipeline send       Send message (file-based)"
else
    echo "  Ctrl+B D              Detach (pipeline keeps running)"
    echo "  ./pipeline watch      Reattach to session"
    echo "  ./pipeline send       Send message to session"
    echo "  ./pipeline stop       Stop gracefully"
fi
echo ""
echo "════════════════════════════════════════════════════════════════"

# ═══════════════════════════════════════════════════════════════
# FOREGROUND MODE (Windows / no-tmux)
# ═══════════════════════════════════════════════════════════════

if [[ "$FOREGROUND_MODE" == "true" ]]; then
    LOG_FILE="$PROJECT_PATH/.pipeline/pipeline.log"
    MSG_FILE="$PROJECT_PATH/.pipeline/user-message.txt"

    echo "Running in FOREGROUND mode (no tmux)"
    echo "Log file: $LOG_FILE"
    echo ""
    echo "To send messages: ./pipeline send $PROJECT_PATH \"your message\""
    echo "To view logs:     ./pipeline watch $PROJECT_PATH"
    echo ""

    # Foreground phase runner
    run_phase_foreground() {
        local phase="$1"
        local slash_cmd=$(get_slash_cmd "$phase")
        local phase_name=$(get_phase_name "$phase")

        echo ""
        echo "════════════════════════════════════════════════════════════════"
        echo "Phase $phase: $phase_name"
        echo "════════════════════════════════════════════════════════════════"
        echo "Command: /$slash_cmd"
        echo ""

        # Generate session ID
        local session_id=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || date +%s%N)
        echo "$session_id" > "$PROJECT_PATH/.pipeline/session-${phase}.id"

        # Clear message file
        rm -f "$MSG_FILE"

        # Run Claude directly with output to log
        echo "[$(date +%H:%M:%S)] Starting Claude for phase $phase..."
        echo "============================================" >> "$LOG_FILE"
        echo "Phase $phase started at $(date)" >> "$LOG_FILE"
        echo "============================================" >> "$LOG_FILE"

        # Create input FIFO for sending messages
        local fifo_file="$PROJECT_PATH/.pipeline/claude-input.fifo"
        rm -f "$fifo_file"
        mkfifo "$fifo_file" 2>/dev/null || true

        # Start Claude in background, reading from FIFO
        (
            cd "$PROJECT_PATH"

            # Send initial command then keep FIFO open
            {
                echo "/$slash_cmd"
                # Keep reading from message file for user messages
                while true; do
                    if [[ -f "$MSG_FILE" ]]; then
                        cat "$MSG_FILE"
                        rm -f "$MSG_FILE"
                    fi
                    sleep 2

                    # Check if phase complete (signal file)
                    if [[ -f "$PROJECT_PATH/.pipeline/.signal-${phase}-complete" ]]; then
                        echo "/exit"
                        break
                    fi
                done
            } | claude --dangerously-skip-permissions 2>&1 | tee -a "$LOG_FILE"
        ) &
        local claude_pid=$!

        echo "Claude PID: $claude_pid"

        # Monitor for completion
        local check_interval=5
        while true; do
            sleep $check_interval

            # Check if Claude still running
            if ! kill -0 "$claude_pid" 2>/dev/null; then
                echo "[$(date +%H:%M:%S)] Claude process ended"
                break
            fi

            # Check for signal file
            local signal_file="$PROJECT_PATH/.pipeline/.signal-${phase}-complete"
            if [[ -f "$signal_file" ]]; then
                echo ""
                echo "════════════════════════════════════════════════════════════════"
                echo "✓ Phase $phase COMPLETE (signal file)"
                echo "════════════════════════════════════════════════════════════════"

                rm -f "$signal_file"

                # Give Claude time to exit
                sleep 3
                kill "$claude_pid" 2>/dev/null || true
                wait "$claude_pid" 2>/dev/null || true

                rm -f "$fifo_file"
                return 0
            fi

            # Show activity
            if [[ -f "$LOG_FILE" ]]; then
                local log_size=$(stat -c %s "$LOG_FILE" 2>/dev/null || wc -c < "$LOG_FILE" 2>/dev/null || echo 0)
                echo "[$(date +%H:%M:%S)] Phase $phase running... (log: ${log_size} bytes)"
            fi
        done

        rm -f "$fifo_file"
        return 0
    }

    # Run all phases in foreground
    STARTED=false
    for phase in "${PHASES[@]}"; do
        if [[ "$STARTED" != "true" ]]; then
            if [[ "$phase" == "$START_PHASE" ]]; then
                STARTED=true
            else
                echo "Skipping completed phase: $phase"
                continue
            fi
        fi

        run_phase_foreground "$phase" || break
    done

    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "PIPELINE COMPLETE (foreground mode)"
    echo "════════════════════════════════════════════════════════════════"
    exit 0
fi

# ═══════════════════════════════════════════════════════════════
# SETUP TMUX SESSION (standard mode)
# ═══════════════════════════════════════════════════════════════

# Kill any existing session
tmux kill-session -t "$TMUX_SESSION" 2>/dev/null || true

# Create new session
tmux new-session -d -s "$TMUX_SESSION" -c "$PROJECT_PATH"

# ═══════════════════════════════════════════════════════════════
# RUN PHASE FUNCTION
# ═══════════════════════════════════════════════════════════════

run_phase() {
    local phase="$1"
    local is_first_phase="${2:-false}"
    local slash_cmd=$(get_slash_cmd "$phase")
    local phase_name=$(get_phase_name "$phase")

    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "Phase $phase: $phase_name"
    echo "════════════════════════════════════════════════════════════════"
    echo "Command: /$slash_cmd"
    echo ""

    # Generate new session ID for this phase
    local session_id=$(uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid)
    echo "$session_id" > "$PROJECT_PATH/.pipeline/session-${phase}.id"

    local jsonl_file="$JSONL_DIR/$session_id.jsonl"
    echo "Session ID: $session_id"
    echo "JSONL: $jsonl_file"

    # Terminal reset (only needed after previous Claude session)
    if [ "$is_first_phase" = "true" ]; then
        # First phase - just clear screen
        tmux send-keys -t "$TMUX_SESSION" "clear" Enter
        sleep 1
    else
        # Reset terminal by restarting bash (clears all pending DA responses)
        tmux send-keys -t "$TMUX_SESSION" C-c
        sleep 0.5
        tmux send-keys -t "$TMUX_SESSION" "exec bash" Enter
        sleep 3

        # Navigate back to project
        tmux send-keys -t "$TMUX_SESSION" "cd $PROJECT_PATH" Enter
        sleep 1
        tmux send-keys -t "$TMUX_SESSION" "clear" Enter
        sleep 2
    fi

    # Verify we're at bash prompt before starting Claude
    local pane_content
    pane_content=$(tmux capture-pane -t "$TMUX_SESSION" -p 2>/dev/null)
    if echo "$pane_content" | grep -q "bypass permissions"; then
        echo "WARNING: Old Claude UI still visible, waiting 3s more..."
        sleep 3
    fi

    # Start Claude in tmux
    local claude_cmd="claude --session-id $session_id --dangerously-skip-permissions"
    echo "Starting Claude: $claude_cmd"
    tmux send-keys -t "$TMUX_SESSION" "$claude_cmd" Enter

    # Wait for Claude to initialize - must see "bypass permissions" WITHOUT bash prompt at end
    echo "Waiting for Claude to initialize..."
    local max_wait=45
    local waited=0
    local claude_ready=false
    while [ $waited -lt $max_wait ]; do
        sleep 1
        waited=$((waited + 1))
        pane_content=$(tmux capture-pane -t "$TMUX_SESSION" -p 2>/dev/null)

        # Check for Claude UI
        if echo "$pane_content" | grep -q "bypass permissions"; then
            # Make sure we're NOT at a bash prompt (Claude crashed)
            local last_line=$(echo "$pane_content" | grep -v '^$' | tail -1)
            if echo "$last_line" | grep -qE '\$\s*$'; then
                echo "WARNING: Bash prompt detected, Claude may have crashed (${waited}s)"
                # Try restarting Claude
                if [ $waited -lt 20 ]; then
                    echo "Retrying Claude start..."
                    tmux send-keys -t "$TMUX_SESSION" "$claude_cmd" Enter
                fi
            else
                echo "Claude ready after ${waited}s"
                claude_ready=true
                break
            fi
        fi
    done

    if [ "$claude_ready" != "true" ]; then
        echo "ERROR: Claude failed to start after ${max_wait}s"
        return 1
    fi

    # Wait for Claude to stabilize
    echo "Waiting 2s for Claude to stabilize..."
    sleep 2

    # Final check: verify Claude is still running (not crashed to bash)
    pane_content=$(tmux capture-pane -t "$TMUX_SESSION" -p 2>/dev/null)
    if echo "$pane_content" | tail -3 | grep -qE '\$\s*$'; then
        echo "ERROR: Claude crashed before sending command"
        return 1
    fi

    # Send slash command
    echo "Sending command: /$slash_cmd"
    tmux send-keys -t "$TMUX_SESSION" "/$slash_cmd"

    # Wait for command to appear in pane
    local cmd_wait=0
    while [ $cmd_wait -lt 10 ]; do
        sleep 1
        cmd_wait=$((cmd_wait + 1))
        if tmux capture-pane -t "$TMUX_SESSION" -p 2>/dev/null | grep -q "$slash_cmd"; then
            echo "Command visible after ${cmd_wait}s"
            break
        fi
    done

    sleep 1
    tmux send-keys -t "$TMUX_SESSION" Enter  # Select from autocomplete
    sleep 1
    tmux send-keys -t "$TMUX_SESSION" Enter  # Submit

    echo "Phase started. Monitoring for signal file..."

    # Monitor for completion
    local check_interval=10
    local last_size=0
    local last_activity_time=$(date +%s)
    local last_nudge_time=0
    local STALL_THRESHOLD=90
    local NUDGE_COOLDOWN=120

    while true; do
        sleep $check_interval

        # Check if tmux session still exists
        if ! tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
            echo "Session ended unexpectedly"
            return 1
        fi

        # PRIMARY: Check for signal file (programmatic completion)
        local signal_file="$PROJECT_PATH/.pipeline/.signal-${phase}-complete"
        if [[ -f "$signal_file" ]]; then
            echo ""
            echo "════════════════════════════════════════════════════════════════"
            echo "✓ Phase $phase COMPLETE (signal file)"
            echo "════════════════════════════════════════════════════════════════"

            # Consume signal file
            rm -f "$signal_file"

            # Generous pause before transition
            echo "Waiting 2s before exit..."
            sleep 2

            # Exit Claude gracefully
            tmux send-keys -t "$TMUX_SESSION" C-u
            sleep 0.5
            tmux send-keys -t "$TMUX_SESSION" "/exit"
            sleep 0.5
            tmux send-keys -t "$TMUX_SESSION" Enter

            # Wait for Claude to actually exit (bash prompt appears)
            echo "Waiting for Claude to exit..."
            local exit_wait=0
            local max_exit_wait=30
            while [ $exit_wait -lt $max_exit_wait ]; do
                sleep 1
                exit_wait=$((exit_wait + 1))
                local pane=$(tmux capture-pane -t "$TMUX_SESSION" -p 2>/dev/null)
                # Check for bash prompt at end of pane (Claude exited)
                if echo "$pane" | tail -3 | grep -qE '\$\s*$'; then
                    echo "Claude exited after ${exit_wait}s"
                    break
                fi
                # Also check if "bypass permissions" disappeared (Claude UI gone)
                if ! echo "$pane" | grep -q "bypass permissions"; then
                    echo "Claude UI gone after ${exit_wait}s"
                    break
                fi
            done

            if [ $exit_wait -ge $max_exit_wait ]; then
                echo "WARNING: Claude may not have exited cleanly after ${max_exit_wait}s"
            fi

            # Generous pause after exit before next phase
            echo "Waiting 2s for terminal to settle..."
            sleep 2

            return 0
        fi

        # DEPRECATED: Check JSONL for PIPELINE:COMPLETE text (fallback)
        if [[ -f "$jsonl_file" ]]; then
            if tail -200 "$jsonl_file" 2>/dev/null | \
               jq -r 'select(.type == "assistant") | .message.content[]? | select(.type == "text") | .text' 2>/dev/null | \
               grep -q "PIPELINE:COMPLETE"; then
                echo ""
                echo "════════════════════════════════════════════════════════════════"
                echo "✓ Phase $phase COMPLETE (text - DEPRECATED)"
                echo "════════════════════════════════════════════════════════════════"

                # Pause before transition
                echo "Waiting 2s before exit..."
                sleep 2

                # Exit Claude gracefully
                tmux send-keys -t "$TMUX_SESSION" C-u
                sleep 0.5
                tmux send-keys -t "$TMUX_SESSION" "/exit"
                sleep 0.5
                tmux send-keys -t "$TMUX_SESSION" Enter

                # Wait for Claude to actually exit
                echo "Waiting for Claude to exit..."
                local exit_wait=0
                while [ $exit_wait -lt 30 ]; do
                    sleep 1
                    exit_wait=$((exit_wait + 1))
                    local pane=$(tmux capture-pane -t "$TMUX_SESSION" -p 2>/dev/null)
                    if echo "$pane" | tail -3 | grep -qE '\$\s*$'; then
                        echo "Claude exited after ${exit_wait}s"
                        break
                    fi
                    if ! echo "$pane" | grep -q "bypass permissions"; then
                        echo "Claude UI gone after ${exit_wait}s"
                        break
                    fi
                done

                # Pause after exit
                echo "Waiting 2s for terminal to settle..."
                sleep 2

                return 0
            fi

            # Show progress and track activity
            local current_size=$(stat -c %s "$jsonl_file" 2>/dev/null || echo 0)
            local now=$(date +%s)

            if [ "$current_size" != "$last_size" ]; then
                echo "[$(date +%H:%M:%S)] Phase $phase running... (${current_size} bytes)"
                last_size=$current_size
                last_activity_time=$now
            fi

            # Stall detection with nudge
            local idle_time=$((now - last_activity_time))
            if [ $idle_time -gt $STALL_THRESHOLD ]; then
                # Check if tests are running (don't interrupt)
                if pgrep -f "cypress|jest|vitest|mocha|playwright|npm.test|npx.*test" > /dev/null 2>&1; then
                    echo "[$(date +%H:%M:%S)] Idle ${idle_time}s but tests running - no nudge"
                else
                    # Check nudge cooldown (skip if --no-nudge flag set)
                    if [ -z "$NO_NUDGE" ]; then
                        local since_nudge=$((now - last_nudge_time))
                        if [ $since_nudge -gt $NUDGE_COOLDOWN ]; then
                            echo "[$(date +%H:%M:%S)] Stalled ${idle_time}s! Sending nudge..."
                            tmux send-keys -t "$TMUX_SESSION" C-u  # Clear any phantom input
                            sleep 0.2
                            tmux send-keys -t "$TMUX_SESSION" "Continue working on the current phase tasks."
                            sleep 0.3
                            tmux send-keys -t "$TMUX_SESSION" Enter
                            last_nudge_time=$now
                        fi
                    fi
                fi
            fi
        fi
    done
}

# ═══════════════════════════════════════════════════════════════
# MAIN PIPELINE LOOP (tmux mode only - foreground mode exits earlier)
# ═══════════════════════════════════════════════════════════════

# Check if we should attach (interactive mode)
ATTACH_MODE=false
if [[ -t 0 ]] && [[ -t 1 ]]; then
    ATTACH_MODE=true
fi

# Start background pipeline runner
(
    STARTED=false
    FIRST_PHASE_RUN=true
    for phase in "${PHASES[@]}"; do
        # Skip phases before START_PHASE
        if [[ "$STARTED" != "true" ]]; then
            if [[ "$phase" == "$START_PHASE" ]]; then
                STARTED=true
            else
                echo "Skipping completed phase: $phase"
                continue
            fi
        fi
        # Special handling for phase 2 (loops through epics)
        if [[ "$phase" == "2" || "$phase" == "2-feature" ]]; then
            # Check manifest for epics
            MANIFEST="$PROJECT_PATH/.pipeline/manifest.json"
            if [[ -f "$MANIFEST" ]]; then
                TOTAL_EPICS=$(jq '.epics | length' "$MANIFEST" 2>/dev/null || echo 1)
                COMPLETED_EPICS=$(jq '[.epics[] | select(.status == "complete")] | length' "$MANIFEST" 2>/dev/null || echo 0)

                # If no epics defined, run phase 2 once
                if [ "$TOTAL_EPICS" -eq 0 ]; then
                    echo "Phase 2: No epics defined, running once"
                    run_phase "$phase" "$FIRST_PHASE_RUN" || break
                    FIRST_PHASE_RUN=false
                else
                    echo "Phase 2: $COMPLETED_EPICS/$TOTAL_EPICS epics complete"

                    while [ "$COMPLETED_EPICS" -lt "$TOTAL_EPICS" ]; do
                        run_phase "$phase" "$FIRST_PHASE_RUN" || break
                        FIRST_PHASE_RUN=false

                        # Recheck after each epic
                        COMPLETED_EPICS=$(jq '[.epics[] | select(.status == "complete")] | length' "$MANIFEST" 2>/dev/null || echo 0)
                        echo "Epics complete: $COMPLETED_EPICS/$TOTAL_EPICS"
                    done
                fi
            else
                run_phase "$phase" "$FIRST_PHASE_RUN"
                FIRST_PHASE_RUN=false
            fi
        else
            run_phase "$phase" "$FIRST_PHASE_RUN" || break
            FIRST_PHASE_RUN=false
        fi
    done

    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "PIPELINE COMPLETE"
    echo "════════════════════════════════════════════════════════════════"
    echo ""
    echo "Project: $PROJECT_NAME"
    echo ""

    # Kill tmux session
    sleep 2
    tmux kill-session -t "$TMUX_SESSION" 2>/dev/null || true

) &
PIPELINE_PID=$!

echo "Pipeline runner PID: $PIPELINE_PID"
echo ""

# Attach to tmux if interactive
if [ "$ATTACH_MODE" = "true" ]; then
    echo "Attaching to session in 3s..."
    echo "(Ctrl+B D to detach - pipeline continues in background)"
    sleep 3
    tmux attach-session -t "$TMUX_SESSION"
else
    echo "Running in headless mode. Monitor with:"
    echo "  ./pipeline watch $PROJECT_PATH"
    wait $PIPELINE_PID
fi
