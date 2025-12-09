#!/bin/bash
# run-supervised.sh - Wrapper script for supervised pipeline execution
# Restarts supervisor after each phase to prevent context cramming
# Version: 6.0.1

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"; }
warn() { echo -e "${YELLOW}[$(date '+%H:%M:%S')]${NC} $1"; }
error() { echo -e "${RED}[$(date '+%H:%M:%S')]${NC} $1"; }

usage() {
    echo "Usage: $0 <project-path> [--mode new|feature]"
    echo ""
    echo "Runs pipeline with supervised orchestration."
    echo "Automatically restarts supervisor between phases to prevent context cramming."
    echo ""
    echo "Options:"
    echo "  --mode      Pipeline mode: 'new' (full) or 'feature' (add to existing)"
    echo ""
    echo "Example:"
    echo "  $0 ./web --mode feature"
    exit 1
}

# Parse arguments
PROJECT_PATH=""
MODE="new"

while [[ $# -gt 0 ]]; do
    case $1 in
        --mode|-m)
            MODE="$2"
            shift 2
            ;;
        --help|-h)
            usage
            ;;
        -*)
            error "Unknown option: $1"
            usage
            ;;
        *)
            PROJECT_PATH="$1"
            shift
            ;;
    esac
done

[[ -z "$PROJECT_PATH" ]] && usage

PROJECT_PATH=$(realpath "$PROJECT_PATH")
PROJECT_NAME=$(basename "$PROJECT_PATH")
MANIFEST="$PROJECT_PATH/.pipeline/manifest.json"
SUPERVISOR_SESSION="supervisor-$PROJECT_NAME"
WORKER_SESSION="worker-$PROJECT_NAME"

# Validate project
if [[ ! -d "$PROJECT_PATH" ]]; then
    error "Project directory not found: $PROJECT_PATH"
    exit 1
fi

if [[ ! -f "$MANIFEST" ]]; then
    error "Manifest not found: $MANIFEST"
    error "Initialize with: ./pipeline run $PROJECT_PATH --mode $MODE"
    exit 1
fi

# Check for jq
if ! command -v jq &>/dev/null; then
    error "jq is required but not installed"
    exit 1
fi

# Cleanup function
cleanup() {
    log "Cleaning up sessions..."
    tmux kill-session -t "$WORKER_SESSION" 2>/dev/null || true
    tmux kill-session -t "$SUPERVISOR_SESSION" 2>/dev/null || true
}

# Get current phase from manifest
get_current_phase() {
    jq -r '.currentPhase // "0a"' "$MANIFEST"
}

# Get pipeline status from manifest
get_status() {
    jq -r '.status // "pending"' "$MANIFEST"
}

# Start supervisor session
start_supervisor() {
    local phase=$(get_current_phase)
    log "Starting supervisor for phase: $phase"

    # Kill any existing sessions first
    tmux kill-session -t "$SUPERVISOR_SESSION" 2>/dev/null || true
    tmux kill-session -t "$WORKER_SESSION" 2>/dev/null || true
    sleep 1

    # Create prompt file for supervisor (single line to avoid escaping issues)
    local prompt="You are the Pipeline Supervisor for $PROJECT_PATH in $MODE mode with EXIT_AFTER_PHASE=true. First, read the full supervisor instructions with: cat ~/.claude/commands/supervisor.md | head -600. Then parse the arguments and start orchestrating. Spawn a worker for the current phase (check manifest with: cat .pipeline/manifest.json | jq .currentPhase). EXIT after completing ONE phase transition to refresh context."

    # Start supervisor with prompt
    tmux new-session -d -s "$SUPERVISOR_SESSION" \
        "cd $PROJECT_PATH && claude --dangerously-skip-permissions -p '$prompt'"

    log "Supervisor session started: $SUPERVISOR_SESSION"
}

# Wait for supervisor to exit
wait_for_supervisor() {
    log "Waiting for supervisor to complete phase..."

    local check_interval=30
    local max_wait=7200  # 2 hours max per phase
    local waited=0

    while tmux has-session -t "$SUPERVISOR_SESSION" 2>/dev/null; do
        sleep $check_interval
        waited=$((waited + check_interval))

        # Show progress
        local phase=$(get_current_phase)
        local status=$(get_status)
        log "Phase: $phase | Status: $status | Waited: ${waited}s"

        # Check for timeout
        if [[ $waited -ge $max_wait ]]; then
            warn "Timeout waiting for phase. Forcing restart..."
            tmux kill-session -t "$SUPERVISOR_SESSION" 2>/dev/null || true
            tmux kill-session -t "$WORKER_SESSION" 2>/dev/null || true
            sleep 2
            return 1
        fi
    done

    # Supervisor exited - clean up worker if still running
    tmux kill-session -t "$WORKER_SESSION" 2>/dev/null || true

    success "Supervisor exited gracefully"
    return 0
}

# Main loop
main() {
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "SUPERVISED PIPELINE v6.0.1"
    echo "════════════════════════════════════════════════════════════════"
    echo ""
    log "Project: $PROJECT_PATH"
    log "Mode: $MODE"
    log "Supervisor restarts after each phase to prevent context cramming"
    echo ""

    trap cleanup EXIT

    local iteration=0
    local max_iterations=20  # Safety limit

    while true; do
        iteration=$((iteration + 1))

        if [[ $iteration -gt $max_iterations ]]; then
            error "Max iterations ($max_iterations) reached. Stopping."
            exit 1
        fi

        # Check if already complete
        local status=$(get_status)
        if [[ "$status" == "complete" ]]; then
            echo ""
            success "════════════════════════════════════════════════════════════════"
            success "PIPELINE COMPLETE!"
            success "════════════════════════════════════════════════════════════════"

            # Show final test results
            local total=$(jq -r '.tests.total // 0' "$MANIFEST")
            local passing=$(jq -r '.tests.passing // 0' "$MANIFEST")
            success "Tests: $passing/$total passing"

            cleanup
            exit 0
        fi

        local phase=$(get_current_phase)
        echo ""
        log "════════════════════════════════════════════════════════════════"
        log "Iteration $iteration: Starting supervisor for phase $phase"
        log "════════════════════════════════════════════════════════════════"

        # Start and wait for supervisor
        start_supervisor
        wait_for_supervisor

        # Brief pause before next iteration
        sleep 5

        # Check if status changed to complete
        status=$(get_status)
        if [[ "$status" == "complete" ]]; then
            continue  # Will exit at top of loop
        fi

        log "Phase transition detected. Restarting supervisor with fresh context..."
    done
}

main
