#!/bin/bash
# Windows Pipeline Orchestrator
# Runs pipeline phases on Windows via SSH using claude -p -c
#
# Usage:
#   ./lib/windows-orchestrator.sh <windows_project_path> [--mode new|feature] [--from phase]
#
# Example:
#   ./lib/windows-orchestrator.sh "/c/Users/ahunt/Documents/IMT Claude/tauri-app" --mode new
#   ./lib/windows-orchestrator.sh "/c/Users/ahunt/Documents/IMT Claude/tauri-app" --mode feature --from 2

set -euo pipefail

# Configuration
REMOTE_HOST="${REMOTE_HOST:-localhost}"
REMOTE_PORT="${REMOTE_PORT:-2222}"
REMOTE_USER="${REMOTE_USER:-ahunt}"
SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=10 -o BatchMode=yes"
GIT_BASH='"C:\\Program Files\\Git\\bin\\bash.exe"'
TIMEOUT_PER_PHASE=1800  # 30 minutes per phase

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}[orchestrator]${NC} $1"; }
warn() { echo -e "${YELLOW}[orchestrator]${NC} $1"; }
error() { echo -e "${RED}[orchestrator]${NC} $1"; }
phase_log() { echo -e "${CYAN}[phase $1]${NC} $2"; }

# Parse arguments
WINDOWS_PATH=""
MODE="new"
START_PHASE="1"

while [[ $# -gt 0 ]]; do
    case $1 in
        --mode) MODE="$2"; shift 2 ;;
        --from) START_PHASE="$2"; shift 2 ;;
        -h|--help)
            echo "Usage: $0 <windows_project_path> [--mode new|feature] [--from phase]"
            exit 0
            ;;
        *)
            if [[ -z "$WINDOWS_PATH" ]]; then
                WINDOWS_PATH="$1"
            fi
            shift
            ;;
    esac
done

[[ -z "$WINDOWS_PATH" ]] && { error "Windows project path required"; exit 1; }

# Define phases based on mode
if [[ "$MODE" == "feature" ]]; then
    ALL_PHASES=("1" "2" "3" "4" "5")
    PHASE_COMMANDS=(
        "/1-feature-pipeline-desktop-v6.0"
        "/2-feature-pipeline-desktop-v6.0"
        "/3-feature-pipeline-desktop-v6.0"
        ""
        ""
    )
else
    ALL_PHASES=("1" "2" "3" "4" "5")
    PHASE_COMMANDS=(
        "/1-new-pipeline-desktop-v6.0"
        "/2-new-pipeline-desktop-v6.0"
        "/3-new-pipeline-desktop-v6.0"
        "/4-new-pipeline-desktop-v6.0"
        "/5-new-pipeline-desktop-v6.0"
    )
fi

# Find starting index
START_INDEX=0
for i in "${!ALL_PHASES[@]}"; do
    if [[ "${ALL_PHASES[$i]}" == "$START_PHASE" ]]; then
        START_INDEX=$i
        break
    fi
done

# Check SSH tunnel
check_tunnel() {
    if ! nc -z "$REMOTE_HOST" "$REMOTE_PORT" 2>/dev/null; then
        error "SSH tunnel not available at $REMOTE_HOST:$REMOTE_PORT"
        error "Start tunnel on Windows: ssh -R 2222:localhost:22 user@vps"
        exit 1
    fi
    log "SSH tunnel active"
}

# Run command on Windows Claude
run_windows_claude() {
    local message="$1"
    local timeout="${2:-$TIMEOUT_PER_PHASE}"

    log "Sending to Windows Claude..."
    log "Message: ${message:0:100}..."

    # Escape single quotes in message
    local escaped_msg="${message//\'/\'\\\'\'}"

    local result
    result=$(timeout "$timeout" ssh -p "$REMOTE_PORT" $SSH_OPTS "$REMOTE_USER@$REMOTE_HOST" \
        "$GIT_BASH -c 'cd \"$WINDOWS_PATH\" && claude -p -c --dangerously-skip-permissions \"$escaped_msg\"'" 2>&1) || {
        local exit_code=$?
        if [[ $exit_code -eq 124 ]]; then
            error "Timeout after ${timeout}s"
        else
            error "Command failed with exit code $exit_code"
        fi
        echo "$result"
        return $exit_code
    }

    echo "$result"
}

# Check if phase completed by looking for signals
check_phase_complete() {
    local phase="$1"
    local output="$2"

    # Check for explicit completion signals
    if echo "$output" | grep -qi "phase.*complete\|completed.*phase\|PHASE_COMPLETE\|successfully.*completed"; then
        return 0
    fi

    # Check for phase-specific completion markers
    case "$phase" in
        1)
            # Brainstorm complete when user stories exist
            if echo "$output" | grep -qi "user.stories\|brainstorm.*notes.*created\|design.*complete"; then
                return 0
            fi
            ;;
        2)
            # Technical complete when E2E specs exist
            if echo "$output" | grep -qi "e2e.*specs\|test.*specifications\|tech.*stack.*defined"; then
                return 0
            fi
            ;;
        1)
            # Bootstrap complete when skeleton deployed
            if echo "$output" | grep -qi "bootstrap.*complete\|skeleton.*deployed\|RED.*state\|failing.*tests"; then
                return 0
            fi
            ;;
        2)
            # Implement complete when tests pass
            if echo "$output" | grep -qi "tests.*pass\|GREEN.*state\|implementation.*complete\|all.*epics"; then
                return 0
            fi
            ;;
        3)
            # Finalize complete when deployed
            if echo "$output" | grep -qi "finalize.*complete\|deployed\|production.*ready\|pipeline.*complete"; then
                return 0
            fi
            ;;
    esac

    return 1
}

# Run a single phase
run_phase() {
    local phase="$1"
    local command="$2"
    local attempt=1
    local max_attempts=3

    phase_log "$phase" "Starting phase (command: $command)"

    while [[ $attempt -le $max_attempts ]]; do
        phase_log "$phase" "Attempt $attempt/$max_attempts"

        # Run the phase command
        local output
        output=$(run_windows_claude "$command") || {
            warn "Phase $phase attempt $attempt failed"
            ((attempt++))
            sleep 10
            continue
        }

        # Log output (truncated)
        echo "------- Phase $phase Output -------"
        echo "${output:0:2000}"
        [[ ${#output} -gt 2000 ]] && echo "... (truncated, ${#output} total chars)"
        echo "-----------------------------------"

        # Check completion
        if check_phase_complete "$phase" "$output"; then
            phase_log "$phase" "Phase complete!"
            return 0
        fi

        # Not complete - might need continuation
        phase_log "$phase" "Phase not marked complete, sending continue..."
        output=$(run_windows_claude "Continue with the current task. Complete phase $phase.")

        if check_phase_complete "$phase" "$output"; then
            phase_log "$phase" "Phase complete after continuation!"
            return 0
        fi

        ((attempt++))
    done

    error "Phase $phase failed after $max_attempts attempts"
    return 1
}

# Main orchestration loop
main() {
    log "=========================================="
    log "Windows Pipeline Orchestrator"
    log "=========================================="
    log "Project: $WINDOWS_PATH"
    log "Mode: $MODE"
    log "Starting from: $START_PHASE"
    log "=========================================="

    check_tunnel

    # Initialize project directory
    log "Initializing project on Windows..."
    run_windows_claude "Create .pipeline directory if it doesn't exist. Initialize manifest.json if needed." || true

    # Run phases
    for ((i=START_INDEX; i<${#ALL_PHASES[@]}; i++)); do
        local phase="${ALL_PHASES[$i]}"
        local command="${PHASE_COMMANDS[$i]}"

        log ""
        log "=========================================="
        log "PHASE $phase"
        log "=========================================="

        if ! run_phase "$phase" "$command"; then
            error "Pipeline stopped at phase $phase"
            exit 1
        fi

        # Phase 1 special: ask for user approval
        if [[ "$phase" == "1" ]]; then
            log ""
            warn "Phase 1 complete. Review the brainstorm notes."
            read -p "Continue to phase 2? (y/n): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log "Pipeline paused. Run again with --from 2 to continue."
                exit 0
            fi
        fi

        log "Advancing to next phase..."
        sleep 5
    done

    log ""
    log "=========================================="
    log "PIPELINE COMPLETE!"
    log "=========================================="
    log "All phases finished successfully."
}

main "$@"
