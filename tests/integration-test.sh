#!/bin/bash
# Pipeline Integration Test Suite v2
# REAL-WORLD tests that simulate actual pipeline behavior
# No mocks - all tests run actual pipeline components
#
# Usage: ./integration-test.sh [test-name]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIPELINE_DIR="$(dirname "$SCRIPT_DIR")"
TEST_PROJECT="/tmp/pipeline-integ-test-$$"
PROJECT_NAME="pipeline-integ-test-$$"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PASSED=0
FAILED=0
SKIPPED=0

log_pass() { echo -e "${GREEN}✓ PASS${NC}: $1"; PASSED=$((PASSED+1)); }
log_fail() { echo -e "${RED}✗ FAIL${NC}: $1"; FAILED=$((FAILED+1)); }
log_skip() { echo -e "${YELLOW}○ SKIP${NC}: $1"; SKIPPED=$((SKIPPED+1)); }
log_info() { echo -e "  ${CYAN}INFO${NC}: $1"; }

cleanup_all() {
    log_info "Cleaning up all test resources..."
    # Kill ALL pipeline test sessions
    tmux ls 2>/dev/null | grep "pipeline-pipeline-integ\|pipeline-integ-real" | cut -d: -f1 | while read s; do
        tmux kill-session -t "$s" 2>/dev/null || true
    done
    # Kill any background processes we started
    pkill -f "run-step.sh.*pipeline-integ-test" 2>/dev/null || true
    pkill -f "run-step.sh.*integ-real" 2>/dev/null || true
    # Remove test project
    rm -rf "$TEST_PROJECT" 2>/dev/null || true
    rm -rf /tmp/integ-real-* 2>/dev/null || true
    rm -f /tmp/pipeline-integ-* 2>/dev/null || true
}

setup_test_project() {
    rm -rf "$TEST_PROJECT" 2>/dev/null || true
    mkdir -p "$TEST_PROJECT/docs/metrics" "$TEST_PROJECT/.pipeline"
    echo "# Integration Test Project" > "$TEST_PROJECT/README.md"
}

wait_for_session() {
    local session_name="$1"
    local timeout="${2:-10}"
    local elapsed=0
    while [[ $elapsed -lt $timeout ]]; do
        if tmux has-session -t "$session_name" 2>/dev/null; then
            return 0
        fi
        sleep 1
        elapsed=$((elapsed + 1))
    done
    return 1
}

wait_for_no_session() {
    local session_name="$1"
    local timeout="${2:-10}"
    local elapsed=0
    while [[ $elapsed -lt $timeout ]]; do
        if ! tmux has-session -t "$session_name" 2>/dev/null; then
            return 0
        fi
        sleep 1
        elapsed=$((elapsed + 1))
    done
    return 1
}

# ═══════════════════════════════════════════════════════════════
# TEST 1: Session is created with correct name
# REAL: Actually starts run-step.sh and verifies tmux session
# ═══════════════════════════════════════════════════════════════
test_session_creation() {
    echo ""
    echo "═══ TEST 1: Session Creation (REAL) ═══"

    setup_test_project
    local session="pipeline-${PROJECT_NAME}-0a"

    # Start REAL pipeline
    log_info "Starting REAL pipeline..."
    "$PIPELINE_DIR/run-step.sh" 0a "$TEST_PROJECT" > /tmp/pipeline-integ-output-1.log 2>&1 &
    local pid=$!

    # Wait for session
    if wait_for_session "$session" 15; then
        log_pass "Session created: $session"
    else
        log_fail "Session NOT created within 15s"
        log_info "Available sessions: $(tmux ls 2>/dev/null || echo 'none')"
        log_info "Pipeline output:"
        cat /tmp/pipeline-integ-output-1.log
        kill $pid 2>/dev/null || true
        return 1
    fi

    # Cleanup
    kill $pid 2>/dev/null || true
    tmux kill-session -t "$session" 2>/dev/null || true
}

# ═══════════════════════════════════════════════════════════════
# TEST 2: Monitor process stays alive during interactive phase
# REAL: Verifies monitor PID remains running (key bug was monitor dying)
# ═══════════════════════════════════════════════════════════════
test_monitor_stays_alive() {
    echo ""
    echo "═══ TEST 2: Monitor Stays Alive (REAL) ═══"

    setup_test_project
    local session="pipeline-${PROJECT_NAME}-0a"
    local monitor_log="/tmp/pipeline-${PROJECT_NAME}-0a-monitor.log"

    # Start REAL pipeline
    log_info "Starting REAL pipeline..."
    "$PIPELINE_DIR/run-step.sh" 0a "$TEST_PROJECT" > /tmp/pipeline-integ-output-2.log 2>&1 &
    local pid=$!

    # Wait for session
    if ! wait_for_session "$session" 15; then
        log_fail "Session not created"
        kill $pid 2>/dev/null || true
        return 1
    fi

    # Extract monitor PID from log
    sleep 5
    local monitor_pid
    monitor_pid=$(grep -oP 'Monitor:.*\(PID: \K\d+' /tmp/pipeline-integ-output-2.log 2>/dev/null || echo "")

    if [[ -z "$monitor_pid" ]]; then
        log_fail "Could not find monitor PID in output"
        cat /tmp/pipeline-integ-output-2.log
        kill $pid 2>/dev/null || true
        tmux kill-session -t "$session" 2>/dev/null || true
        return 1
    fi

    log_info "Monitor PID: $monitor_pid"

    # Check monitor is alive at T+5s
    if kill -0 "$monitor_pid" 2>/dev/null; then
        log_pass "Monitor alive at T+5s"
    else
        log_fail "Monitor DEAD at T+5s (this was the bug!)"
        log_info "Monitor log:"
        cat "$monitor_log" 2>/dev/null || echo "(no log)"
        kill $pid 2>/dev/null || true
        tmux kill-session -t "$session" 2>/dev/null || true
        return 1
    fi

    # Wait for first monitor check cycle (30s)
    log_info "Waiting for first monitor cycle (30s)..."
    sleep 30

    # Check monitor is STILL alive at T+35s
    if kill -0 "$monitor_pid" 2>/dev/null; then
        log_pass "Monitor still alive at T+35s"
    else
        log_fail "Monitor DIED during first cycle!"
        log_info "Monitor log:"
        cat "$monitor_log" 2>/dev/null || echo "(no log)"
        log_info "Pipeline output:"
        tail -30 /tmp/pipeline-integ-output-2.log
        kill $pid 2>/dev/null || true
        tmux kill-session -t "$session" 2>/dev/null || true
        return 1
    fi

    # Cleanup
    kill $pid 2>/dev/null || true
    tmux kill-session -t "$session" 2>/dev/null || true
}

# ═══════════════════════════════════════════════════════════════
# TEST 3: Session survives past 60 seconds (user's bug was 35s completion)
# REAL: Waits 65 seconds to verify no premature completion
# ═══════════════════════════════════════════════════════════════
test_session_survives_60s() {
    echo ""
    echo "═══ TEST 3: Session Survives 60+ Seconds (REAL) ═══"

    setup_test_project
    local session="pipeline-${PROJECT_NAME}-0a"
    local completion_signal="/tmp/pipeline-${PROJECT_NAME}-0a-complete"

    # Start REAL pipeline
    log_info "Starting REAL pipeline..."
    "$PIPELINE_DIR/run-step.sh" 0a "$TEST_PROJECT" > /tmp/pipeline-integ-output-3.log 2>&1 &
    local pid=$!

    # Wait for session
    if ! wait_for_session "$session" 15; then
        log_fail "Session not created"
        kill $pid 2>/dev/null || true
        return 1
    fi

    log_info "Waiting 65 seconds (user saw bug at ~35s)..."

    # Check at multiple intervals
    for checkpoint in 20 40 60; do
        sleep 20

        # Check completion signal doesn't exist
        if [[ -f "$completion_signal" ]]; then
            log_fail "PREMATURE COMPLETION at T+${checkpoint}s!"
            log_info "Completion signal exists (should NOT)"
            log_info "Pipeline output:"
            tail -30 /tmp/pipeline-integ-output-3.log
            kill $pid 2>/dev/null || true
            tmux kill-session -t "$session" 2>/dev/null || true
            return 1
        fi

        # Check session still exists
        if ! tmux has-session -t "$session" 2>/dev/null; then
            log_fail "SESSION ENDED at T+${checkpoint}s!"
            log_info "Pipeline output:"
            tail -30 /tmp/pipeline-integ-output-3.log
            kill $pid 2>/dev/null || true
            return 1
        fi

        log_pass "Session alive at T+${checkpoint}s"
    done

    # Cleanup
    kill $pid 2>/dev/null || true
    tmux kill-session -t "$session" 2>/dev/null || true
}

# ═══════════════════════════════════════════════════════════════
# TEST 4: Main process (run-step.sh) stays running
# REAL: The bug was main process exiting when monitor died
# ═══════════════════════════════════════════════════════════════
test_main_process_stays_running() {
    echo ""
    echo "═══ TEST 4: Main Process Stays Running (REAL) ═══"

    setup_test_project
    local session="pipeline-${PROJECT_NAME}-0a"

    # Start REAL pipeline
    log_info "Starting REAL pipeline..."
    "$PIPELINE_DIR/run-step.sh" 0a "$TEST_PROJECT" > /tmp/pipeline-integ-output-4.log 2>&1 &
    local pid=$!

    # Wait for session
    if ! wait_for_session "$session" 15; then
        log_fail "Session not created"
        kill $pid 2>/dev/null || true
        return 1
    fi

    log_info "Main process PID: $pid"
    log_info "Waiting 45 seconds..."
    sleep 45

    # Check main process is still running
    if kill -0 "$pid" 2>/dev/null; then
        log_pass "Main process still running at T+45s"
    else
        log_fail "Main process EXITED at T+45s!"
        log_info "Pipeline output (may show cause):"
        tail -50 /tmp/pipeline-integ-output-4.log
        tmux kill-session -t "$session" 2>/dev/null || true
        return 1
    fi

    # Cleanup
    kill $pid 2>/dev/null || true
    tmux kill-session -t "$session" 2>/dev/null || true
}

# ═══════════════════════════════════════════════════════════════
# TEST 5: Send command works with active session
# REAL: Uses actual pipeline send command
# ═══════════════════════════════════════════════════════════════
test_send_command() {
    echo ""
    echo "═══ TEST 5: Send Command (REAL) ═══"

    setup_test_project
    local session="pipeline-${PROJECT_NAME}-0a"

    # Start REAL pipeline
    log_info "Starting REAL pipeline..."
    "$PIPELINE_DIR/run-step.sh" 0a "$TEST_PROJECT" > /tmp/pipeline-integ-output-5.log 2>&1 &
    local pid=$!

    # Wait for session
    if ! wait_for_session "$session" 15; then
        log_fail "Session not created"
        kill $pid 2>/dev/null || true
        return 1
    fi
    log_info "Session active: $session"

    # Wait for Claude to initialize
    sleep 12

    # Test REAL send command
    log_info "Sending message via ./pipeline send..."
    local output
    output=$("$PIPELINE_DIR/pipeline" send "$TEST_PROJECT" "Integration test message" 2>&1) || true

    if echo "$output" | grep -qi "sent\|success"; then
        log_pass "Send command succeeded"
    elif echo "$output" | grep -qi "No active"; then
        log_fail "Send command reports no session (but session exists!)"
        log_info "Output: $output"
        log_info "Tmux sessions:"
        tmux ls 2>/dev/null
    else
        log_fail "Send command failed: $output"
    fi

    # Cleanup
    kill $pid 2>/dev/null || true
    tmux kill-session -t "$session" 2>/dev/null || true
}

# ═══════════════════════════════════════════════════════════════
# TEST 6: No false PIPELINE:COMPLETE from instructions
# REAL: Uses actual JSONL file from real session
# ═══════════════════════════════════════════════════════════════
test_no_false_completion() {
    echo ""
    echo "═══ TEST 6: No False PIPELINE:COMPLETE (REAL) ═══"

    setup_test_project
    local session="pipeline-${PROJECT_NAME}-0a"
    local monitor_log="/tmp/pipeline-${PROJECT_NAME}-0a-monitor.log"

    # Start REAL pipeline
    log_info "Starting REAL pipeline..."
    "$PIPELINE_DIR/run-step.sh" 0a "$TEST_PROJECT" > /tmp/pipeline-integ-output-6.log 2>&1 &
    local pid=$!

    # Wait for session and Claude to initialize
    if ! wait_for_session "$session" 15; then
        log_fail "Session not created"
        kill $pid 2>/dev/null || true
        return 1
    fi

    # Wait for slash command to be sent (contains PIPELINE:COMPLETE in instructions)
    log_info "Waiting 40s for slash command processing..."
    sleep 40

    # Check monitor log for false positive
    if [[ -f "$monitor_log" ]]; then
        if grep -q "PIPELINE:COMPLETE detected" "$monitor_log"; then
            log_fail "FALSE POSITIVE: Monitor detected PIPELINE:COMPLETE from instructions!"
            log_info "Monitor log:"
            cat "$monitor_log"
            kill $pid 2>/dev/null || true
            tmux kill-session -t "$session" 2>/dev/null || true
            return 1
        else
            log_pass "No false PIPELINE:COMPLETE detection"
        fi
    else
        log_info "No monitor log yet"
    fi

    # Verify session still alive (would be dead if false positive triggered)
    if tmux has-session -t "$session" 2>/dev/null; then
        log_pass "Session still alive (confirms no false positive)"
    else
        log_fail "Session ended (possible false positive)"
        log_info "Pipeline output:"
        tail -30 /tmp/pipeline-integ-output-6.log
    fi

    # Cleanup
    kill $pid 2>/dev/null || true
    tmux kill-session -t "$session" 2>/dev/null || true
}

# ═══════════════════════════════════════════════════════════════
# TEST 7: Kill/Ctrl+C handling
# REAL: Sends SIGTERM and verifies clean shutdown
# ═══════════════════════════════════════════════════════════════
test_kill_handling() {
    echo ""
    echo "═══ TEST 7: Kill Handling (REAL) ═══"

    setup_test_project
    local session="pipeline-${PROJECT_NAME}-0a"

    # Start REAL pipeline
    log_info "Starting REAL pipeline..."
    "$PIPELINE_DIR/run-step.sh" 0a "$TEST_PROJECT" > /tmp/pipeline-integ-output-7.log 2>&1 &
    local pid=$!

    # Wait for session
    if ! wait_for_session "$session" 15; then
        log_fail "Session not created"
        kill $pid 2>/dev/null || true
        return 1
    fi

    sleep 5
    log_info "Sending SIGTERM (Ctrl+C simulation)..."
    kill $pid 2>/dev/null || true

    sleep 3

    # Process should be gone
    if kill -0 $pid 2>/dev/null; then
        log_fail "Process still running after SIGTERM"
        kill -9 $pid 2>/dev/null || true
        return 1
    else
        log_pass "Process terminated cleanly"
    fi

    # Cleanup
    tmux kill-session -t "$session" 2>/dev/null || true
}

# ═══════════════════════════════════════════════════════════════
# TEST 8: Monitor log shows expected output
# REAL: Verifies actual monitor log format
# ═══════════════════════════════════════════════════════════════
test_monitor_log_format() {
    echo ""
    echo "═══ TEST 8: Monitor Log Format (REAL) ═══"

    setup_test_project
    local session="pipeline-${PROJECT_NAME}-0a"
    local monitor_log="/tmp/pipeline-${PROJECT_NAME}-0a-monitor.log"

    # Start REAL pipeline
    log_info "Starting REAL pipeline..."
    "$PIPELINE_DIR/run-step.sh" 0a "$TEST_PROJECT" > /tmp/pipeline-integ-output-8.log 2>&1 &
    local pid=$!

    # Wait for session
    if ! wait_for_session "$session" 15; then
        log_fail "Session not created"
        kill $pid 2>/dev/null || true
        return 1
    fi

    # Wait for first monitor cycle
    log_info "Waiting for monitor cycle (35s)..."
    sleep 35

    # Check monitor log exists and has expected content
    if [[ ! -f "$monitor_log" ]]; then
        log_fail "Monitor log not created"
        kill $pid 2>/dev/null || true
        tmux kill-session -t "$session" 2>/dev/null || true
        return 1
    fi

    log_pass "Monitor log exists"

    # Check for expected entries
    if grep -q "Starting JSONL-based monitor" "$monitor_log"; then
        log_pass "Monitor startup logged"
    else
        log_fail "Missing startup log"
    fi

    if grep -q "Session:" "$monitor_log"; then
        log_pass "Session ID logged"
    else
        log_fail "Missing session ID"
    fi

    if grep -q "JSONL:" "$monitor_log"; then
        log_pass "JSONL path logged"
    else
        log_fail "Missing JSONL path"
    fi

    if grep -q "\[Monitor\] Elapsed:" "$monitor_log"; then
        log_pass "Monitor cycle output present"
    else
        log_fail "No monitor cycle output (monitor may have crashed)"
        log_info "Full monitor log:"
        cat "$monitor_log"
    fi

    # Cleanup
    kill $pid 2>/dev/null || true
    tmux kill-session -t "$session" 2>/dev/null || true
}

# ═══════════════════════════════════════════════════════════════
# TEST 9: Manifest created correctly
# REAL: Verifies actual manifest JSON structure
# ═══════════════════════════════════════════════════════════════
test_manifest_creation() {
    echo ""
    echo "═══ TEST 9: Manifest Creation (REAL) ═══"

    setup_test_project
    local session="pipeline-${PROJECT_NAME}-0a"
    local manifest="$TEST_PROJECT/.pipeline/manifest.json"

    # Start REAL pipeline
    log_info "Starting REAL pipeline..."
    "$PIPELINE_DIR/run-step.sh" 0a "$TEST_PROJECT" > /tmp/pipeline-integ-output-9.log 2>&1 &
    local pid=$!

    # Wait for session
    if ! wait_for_session "$session" 15; then
        log_fail "Session not created"
        kill $pid 2>/dev/null || true
        return 1
    fi

    sleep 3

    # Check manifest
    if [[ -f "$manifest" ]]; then
        log_pass "Manifest file created"

        if jq -e '.phases["0a"]' "$manifest" > /dev/null 2>&1; then
            log_pass "Phase 0a in manifest"
        else
            log_fail "Phase 0a missing"
        fi

        if jq -e '.phases["0b"]' "$manifest" > /dev/null 2>&1; then
            log_pass "Phase 0b in manifest"
        else
            log_fail "Phase 0b missing"
        fi

        if jq -e '.project.name' "$manifest" > /dev/null 2>&1; then
            log_pass "Project name in manifest"
        else
            log_fail "Project name missing"
        fi
    else
        log_fail "Manifest NOT created"
    fi

    # Cleanup
    kill $pid 2>/dev/null || true
    tmux kill-session -t "$session" 2>/dev/null || true
}

# ═══════════════════════════════════════════════════════════════
# TEST 10: Full 90-second survival test (comprehensive)
# REAL: The ultimate test - session must survive 90s with no intervention
# ═══════════════════════════════════════════════════════════════
test_full_90s_survival() {
    echo ""
    echo "═══ TEST 10: Full 90-Second Survival (REAL) ═══"
    echo "    This is the ULTIMATE test - simulates user's bug scenario"

    setup_test_project
    local session="pipeline-${PROJECT_NAME}-0a"
    local monitor_log="/tmp/pipeline-${PROJECT_NAME}-0a-monitor.log"
    local completion_signal="/tmp/pipeline-${PROJECT_NAME}-0a-complete"

    # Start REAL pipeline
    log_info "Starting REAL pipeline..."
    "$PIPELINE_DIR/run-step.sh" 0a "$TEST_PROJECT" > /tmp/pipeline-integ-output-10.log 2>&1 &
    local pid=$!
    local monitor_pid=""

    # Wait for session
    if ! wait_for_session "$session" 15; then
        log_fail "Session not created"
        kill $pid 2>/dev/null || true
        return 1
    fi

    # Get monitor PID
    sleep 5
    monitor_pid=$(grep -oP 'Monitor:.*\(PID: \K\d+' /tmp/pipeline-integ-output-10.log 2>/dev/null || echo "")
    log_info "Main PID: $pid, Monitor PID: $monitor_pid"

    # Checkpoint loop
    local checkpoint
    for checkpoint in 30 60 90; do
        sleep 30

        local failures=0

        # Check 1: Session exists
        if tmux has-session -t "$session" 2>/dev/null; then
            log_pass "T+${checkpoint}s: Session alive"
        else
            log_fail "T+${checkpoint}s: SESSION DIED"
            failures=$((failures + 1))
        fi

        # Check 2: Main process running
        if kill -0 "$pid" 2>/dev/null; then
            log_pass "T+${checkpoint}s: Main process running"
        else
            log_fail "T+${checkpoint}s: MAIN PROCESS DIED"
            failures=$((failures + 1))
        fi

        # Check 3: Monitor process running (if we found it)
        if [[ -n "$monitor_pid" ]]; then
            if kill -0 "$monitor_pid" 2>/dev/null; then
                log_pass "T+${checkpoint}s: Monitor running"
            else
                log_fail "T+${checkpoint}s: MONITOR DIED"
                failures=$((failures + 1))
            fi
        fi

        # Check 4: No premature completion
        if [[ -f "$completion_signal" ]]; then
            log_fail "T+${checkpoint}s: PREMATURE COMPLETION SIGNAL"
            failures=$((failures + 1))
        else
            log_pass "T+${checkpoint}s: No premature completion"
        fi

        # If any failures, dump debug info
        if [[ $failures -gt 0 ]]; then
            log_info "=== DEBUG INFO ==="
            log_info "Pipeline output (last 30 lines):"
            tail -30 /tmp/pipeline-integ-output-10.log
            log_info "Monitor log:"
            cat "$monitor_log" 2>/dev/null || echo "(no monitor log)"
            log_info "==================="
            kill $pid 2>/dev/null || true
            tmux kill-session -t "$session" 2>/dev/null || true
            return 1
        fi
    done

    log_pass "SURVIVED FULL 90 SECONDS - Interactive phase working correctly!"

    # Cleanup
    kill $pid 2>/dev/null || true
    tmux kill-session -t "$session" 2>/dev/null || true
}

# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     PIPELINE INTEGRATION TEST SUITE v2                     ║"
echo "║     REAL-WORLD tests (no mocks)                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Test project: $TEST_PROJECT"
echo ""

trap cleanup_all EXIT

TEST="${1:-all}"

case "$TEST" in
    1|session)      test_session_creation ;;
    2|monitor-alive) test_monitor_stays_alive ;;
    3|survive-60)   test_session_survives_60s ;;
    4|main-alive)   test_main_process_stays_running ;;
    5|send)         test_send_command ;;
    6|no-false)     test_no_false_completion ;;
    7|kill)         test_kill_handling ;;
    8|log-format)   test_monitor_log_format ;;
    9|manifest)     test_manifest_creation ;;
    10|full-90)     test_full_90s_survival ;;
    quick)
        # Quick tests (no long waits)
        test_session_creation
        test_send_command
        test_kill_handling
        test_manifest_creation
        ;;
    all)
        test_session_creation
        test_monitor_stays_alive
        test_session_survives_60s
        test_main_process_stays_running
        test_send_command
        test_no_false_completion
        test_kill_handling
        test_monitor_log_format
        test_manifest_creation
        test_full_90s_survival
        ;;
    *)
        echo "Unknown test: $TEST"
        echo ""
        echo "Available tests:"
        echo "  1|session       - Session creation"
        echo "  2|monitor-alive - Monitor process stays alive"
        echo "  3|survive-60    - Session survives 60+ seconds"
        echo "  4|main-alive    - Main process stays running"
        echo "  5|send          - Send command works"
        echo "  6|no-false      - No false PIPELINE:COMPLETE"
        echo "  7|kill          - Kill/Ctrl+C handling"
        echo "  8|log-format    - Monitor log format"
        echo "  9|manifest      - Manifest creation"
        echo "  10|full-90      - Full 90-second survival (ULTIMATE)"
        echo ""
        echo "  quick           - Fast tests only (~30s)"
        echo "  all             - All tests (~7 minutes)"
        exit 1
        ;;
esac

echo ""
echo "════════════════════════════════════════════════════════════"
echo -e "PASSED: ${GREEN}$PASSED${NC}  FAILED: ${RED}$FAILED${NC}  SKIPPED: ${YELLOW}$SKIPPED${NC}"
echo "════════════════════════════════════════════════════════════"

[[ $FAILED -gt 0 ]] && exit 1
exit 0
