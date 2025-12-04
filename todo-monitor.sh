#!/bin/bash
# Todo Monitor - Watches Claude session and transitions phases based on todo completion
# Usage: source this file, then call start_monitor
#
# Phase transitions based on todo completion:
# - Todos remaining + stalled → Send nudge message
# - All todos complete (0 pending) → Phase complete, move to next

# Configuration
MONITOR_INTERVAL=30        # Check every 30 seconds
STALL_THRESHOLD=90         # Consider stalled after 90s of no output
NUDGE_COOLDOWN=120         # Don't nudge more than once per 2 minutes
COMPLETION_CONFIRM=2       # Require N consecutive checks with 0 todos to confirm

# State
LAST_OUTPUT_TIME=$(date +%s)
LAST_NUDGE_TIME=0
LAST_LINE_COUNT=0
ZERO_TODO_COUNT=0          # Track consecutive checks with 0 pending todos

# ═══════════════════════════════════════════════════════════════
# CORE MONITORING FUNCTIONS
# ═══════════════════════════════════════════════════════════════

# Parse todo counts from tmux output
# Returns: "completed/total" or "0/0" if no todos found
get_todo_counts() {
    local session_name="$1"
    local output_file="$2"

    # Capture current screen from tmux (most accurate for current state)
    local screen_content
    screen_content=$(tmux capture-pane -t "$session_name" -p 2>/dev/null)

    if [[ -z "$screen_content" ]]; then
        echo "0/0"
        return
    fi

    # Claude's todo list uses specific characters:
    # ☐ = pending (empty checkbox)
    # ☒ = completed (checked checkbox with X)
    # Note: First item may have box-drawing char (⎿) so we can't rely on ^whitespace

    # Count checkbox characters anywhere on the line (each line has at most one)
    local pending completed
    pending=$(echo "$screen_content" | grep -c '☐' 2>/dev/null) || pending=0
    completed=$(echo "$screen_content" | grep -c '☒' 2>/dev/null) || completed=0

    local total=$((pending + completed))
    echo "$completed/$total"
}

# Check if output is still flowing
check_output_activity() {
    local output_file="$1"

    if [[ ! -f "$output_file" ]]; then
        return 1
    fi

    local current_lines=$(wc -l < "$output_file" 2>/dev/null || echo 0)
    local current_size=$(stat -c %s "$output_file" 2>/dev/null || echo 0)

    if [[ $current_lines -gt $LAST_LINE_COUNT || $current_size -gt ${LAST_SIZE:-0} ]]; then
        LAST_OUTPUT_TIME=$(date +%s)
        LAST_LINE_COUNT=$current_lines
        LAST_SIZE=$current_size
        return 0  # Active
    fi

    return 1  # No new output
}

# Check if all todos are complete (todo-based completion)
# Returns 0 if complete, 1 if not
check_todos_complete() {
    local session_name="$1"
    local output_file="$2"

    local todo_counts=$(get_todo_counts "$session_name" "$output_file")
    local completed="${todo_counts%/*}"
    local total="${todo_counts#*/}"
    local pending=$((total - completed))

    # Need todos to exist AND all be complete
    if [[ $total -gt 0 && $pending -eq 0 ]]; then
        return 0  # All complete
    fi

    return 1  # Not complete or no todos
}

# Send nudge message to Claude session
send_nudge() {
    local session_name="$1"
    local pending_count="$2"
    local message="$3"

    local now=$(date +%s)
    local since_last_nudge=$((now - LAST_NUDGE_TIME))

    # Respect cooldown
    if [[ $since_last_nudge -lt $NUDGE_COOLDOWN ]]; then
        echo "[Monitor] Nudge skipped (cooldown: ${since_last_nudge}s < ${NUDGE_COOLDOWN}s)"
        return 1
    fi

    # Default message
    if [[ -z "$message" ]]; then
        message="[AUTOMATIC MESSAGE] You appear to have stalled. You have $pending_count todos remaining. Please continue working through your checklist."
    fi

    echo "[Monitor] Sending nudge: $message"

    # Send to tmux session
    tmux send-keys -t "$session_name" "$message" Enter 2>/dev/null

    LAST_NUDGE_TIME=$now
    return 0
}

# ═══════════════════════════════════════════════════════════════
# MAIN MONITOR LOOP
# ═══════════════════════════════════════════════════════════════

# Start monitoring a session
# Usage: start_monitor <session_name> <output_file> [timeout_seconds]
start_monitor() {
    local session_name="$1"
    local output_file="$2"
    local timeout="${3:-7200}"  # Default 2 hour timeout

    local start_time=$(date +%s)
    LAST_OUTPUT_TIME=$start_time
    LAST_LINE_COUNT=0
    LAST_SIZE=0
    LAST_NUDGE_TIME=0
    ZERO_TODO_COUNT=0

    echo "[Monitor] Starting todo monitor for session: $session_name"
    echo "[Monitor] Output file: $output_file"
    echo "[Monitor] Completion: All todos done (confirmed ${COMPLETION_CONFIRM}x)"
    echo "[Monitor] Stall threshold: ${STALL_THRESHOLD}s"
    echo "[Monitor] Nudge cooldown: ${NUDGE_COOLDOWN}s"
    echo ""

    while true; do
        local now=$(date +%s)
        local elapsed=$((now - start_time))

        # Check timeout
        if [[ $elapsed -gt $timeout ]]; then
            echo ""
            echo "[Monitor] Timeout reached (${elapsed}s > ${timeout}s)"
            return 2
        fi

        # Check activity
        check_output_activity "$output_file"
        local seconds_since_output=$((now - LAST_OUTPUT_TIME))

        # Get todo status
        local todo_counts=$(get_todo_counts "$session_name" "$output_file")
        local completed="${todo_counts%/*}"
        local total="${todo_counts#*/}"
        local pending=$((total - completed))

        # Status line
        printf "\r[Monitor] Elapsed: %ds | Todos: %d/%d done | Last output: %ds ago    " \
            "$elapsed" "$completed" "$total" "$seconds_since_output"

        # Check for completion (all todos done)
        if [[ $total -gt 0 && $pending -eq 0 ]]; then
            ZERO_TODO_COUNT=$((ZERO_TODO_COUNT + 1))
            if [[ $ZERO_TODO_COUNT -ge $COMPLETION_CONFIRM ]]; then
                echo ""
                echo "[Monitor] All todos complete! ($completed/$total done, confirmed ${ZERO_TODO_COUNT}x)"
                return 0
            fi
        else
            ZERO_TODO_COUNT=0  # Reset if todos reappear or pending > 0
        fi

        # Check if stalled with pending todos
        if [[ $seconds_since_output -gt $STALL_THRESHOLD && $pending -gt 0 ]]; then
            echo ""
            echo "[Monitor] Stall detected! No output for ${seconds_since_output}s with $pending todos remaining"
            send_nudge "$session_name" "$pending"
        fi

        # Check if session still exists
        if ! tmux has-session -t "$session_name" 2>/dev/null; then
            echo ""
            echo "[Monitor] Session '$session_name' no longer exists"

            # Final completion check
            if check_todos_complete "$session_name" "$output_file"; then
                echo "[Monitor] All todos were complete"
                return 0
            fi

            echo "[Monitor] Session ended with incomplete todos"
            return 1
        fi

        sleep "$MONITOR_INTERVAL"
    done
}

# ═══════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════

# Run a step with monitoring
# Usage: run_step_monitored <session_name> <slash_cmd> <project_path> [timeout]
run_step_monitored() {
    local session_name="$1"
    local slash_cmd="$2"
    local project_path="$3"
    local timeout="${4:-7200}"

    local output_file="/tmp/${session_name}-output.log"

    # Create tmux session if it doesn't exist
    if ! tmux has-session -t "$session_name" 2>/dev/null; then
        echo "[Monitor] Creating tmux session: $session_name"
        tmux new-session -d -s "$session_name" -c "$project_path"
    fi

    # Clear output file
    > "$output_file"

    # Start output logging
    tmux pipe-pane -t "$session_name" "cat >> '$output_file'"

    # Start Claude
    echo "[Monitor] Starting Claude with command: /$slash_cmd"
    tmux send-keys -t "$session_name" "claude --dangerously-skip-permissions" Enter

    # Wait for Claude to start
    sleep 8

    # Send the slash command
    tmux send-keys -t "$session_name" "/$slash_cmd" Enter
    sleep 2
    tmux send-keys -t "$session_name" Enter

    # Start monitoring
    start_monitor "$session_name" "$output_file" "$timeout"
    local result=$?

    # Cleanup - send /exit if session still exists
    if tmux has-session -t "$session_name" 2>/dev/null; then
        echo "[Monitor] Sending /exit to Claude"
        tmux send-keys -t "$session_name" "/exit" Enter
        sleep 2
    fi

    return $result
}

# Quick test of monitor
test_monitor() {
    echo "Testing todo count parsing..."

    # Create test content
    local test_content="
    ☐ Task 1 - pending
    ☑ Task 2 - done
    ☐ Task 3 - pending
    ☑ Task 4 - done
    ☑ Task 5 - done
    "

    echo "$test_content" > /tmp/test-monitor.txt

    local counts=$(get_todo_counts "test" "/tmp/test-monitor.txt")
    echo "Parsed counts: $counts (expected: 3/5)"

    rm -f /tmp/test-monitor.txt
}

# Export functions
export -f get_todo_counts check_output_activity check_todos_complete send_nudge start_monitor run_step_monitored
