#!/bin/bash
# Run Analysis Pipeline - Executes Phase A → B → C
# Usage: ./run-analyze-pipeline.sh <project-path> [run-id] [options]
#
# This script runs the analysis as a pipeline:
# - Phase A: Extract metrics, diagnose issues, queue tests
# - Phase B: Run improvement tests in isolation
# - Phase C: Validate, apply improvements, version bump

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source common utilities
source "$SCRIPT_DIR/lib/common.sh"

PROJECT_PATH=""
RUN_ID=""
VERBOSE=false
PHASE_ONLY=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --phase|-p)
            PHASE_ONLY="$2"
            shift 2
            ;;
        -*)
            die "Unknown option: $1"
            ;;
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

[[ -z "$PROJECT_PATH" ]] && die "Usage: $0 <project-path> [run-id] [--phase A|B|C] [--verbose]"

PROJECT_PATH=$(realpath "$PROJECT_PATH")
PROJECT_NAME=$(basename "$PROJECT_PATH")

# Find run directory
RUNS_DIR="$PROJECT_PATH/.pipeline/runs"

if [[ -z "$RUN_ID" ]]; then
    # Get latest run
    RUN_ID=$(ls -t "$RUNS_DIR" 2>/dev/null | head -1 || true)
    [[ -z "$RUN_ID" ]] && die "No runs found in $RUNS_DIR"
    info "Using latest run: $RUN_ID"
fi

RUN_DIR="$RUNS_DIR/$RUN_ID"
[[ ! -d "$RUN_DIR" ]] && die "Run directory not found: $RUN_DIR"

ANALYSIS_DIR="$RUN_DIR/analysis"
ANALYSIS_MANIFEST="$ANALYSIS_DIR/analysis-manifest.json"

# ═══════════════════════════════════════════════════════════════
# INITIALIZE ANALYSIS MANIFEST
# ═══════════════════════════════════════════════════════════════

init_analysis() {
    if [[ ! -f "$ANALYSIS_MANIFEST" ]]; then
        info "Initializing analysis manifest..."
        "$SCRIPT_DIR/lib/init-analysis-manifest.sh" "$PROJECT_PATH" "$RUN_ID"
    else
        info "Analysis manifest exists: $ANALYSIS_MANIFEST"
        local current_phase=$(jq -r '.currentPhase' "$ANALYSIS_MANIFEST")
        local status=$(jq -r '.status' "$ANALYSIS_MANIFEST")
        info "  Current Phase: $current_phase"
        info "  Status: $status"
    fi
}

# ═══════════════════════════════════════════════════════════════
# RUN ANALYSIS PHASE
# ═══════════════════════════════════════════════════════════════

run_phase() {
    local phase="$1"
    local command_file=""

    case "$phase" in
        A|a) command_file="analyze-phase-a" ;;
        B|b) command_file="analyze-phase-b" ;;
        C|c) command_file="analyze-phase-c" ;;
        *) die "Unknown phase: $phase. Use A, B, or C" ;;
    esac

    phase=$(echo "$phase" | tr '[:lower:]' '[:upper:]')

    # Check if phase already complete
    local phase_status=$(jq -r ".phases.${phase}.status" "$ANALYSIS_MANIFEST" 2>/dev/null || echo "pending")

    if [[ "$phase_status" == "complete" ]]; then
        info "Phase $phase already complete, skipping"
        return 0
    fi

    header "ANALYSIS PHASE $phase"
    echo ""
    echo "Project: $PROJECT_NAME"
    echo "Run ID: $RUN_ID"
    echo ""

    # Update manifest to mark phase started
    local start_time=$(date -Iseconds)
    jq ".phases.${phase}.status = \"running\" |
        .phases.${phase}.startedAt = \"$start_time\" |
        .currentPhase = \"${phase}\"" \
        "$ANALYSIS_MANIFEST" > "${ANALYSIS_MANIFEST}.tmp" && \
        mv "${ANALYSIS_MANIFEST}.tmp" "$ANALYSIS_MANIFEST"

    # Create tmux session for the phase
    local session_name="analysis-${PROJECT_NAME}-${phase}"

    # Kill existing session if any
    tmux kill-session -t "$session_name" 2>/dev/null || true

    # Create tmux session
    tmux new-session -d -s "$session_name" -c "$PROJECT_PATH"

    # Start Claude interactively, then send the slash command
    info "Starting Claude session for Phase $phase..."
    tmux send-keys -t "$session_name" "claude --model sonnet --dangerously-skip-permissions" Enter

    # Wait for Claude UI to be ready (check for Claude Code banner)
    local ready_wait=0
    while [[ $ready_wait -lt 60 ]]; do
        sleep 3
        ready_wait=$((ready_wait + 3))
        local pane_output=$(tmux capture-pane -t "$session_name" -p 2>/dev/null || true)
        # Look for Claude Code banner which indicates UI is loaded
        if echo "$pane_output" | grep -q "Claude Code"; then
            $VERBOSE && info "  Claude UI loaded after ${ready_wait}s"
            break
        fi
    done

    # Give Claude a moment to fully initialize the input prompt
    sleep 2

    # Clear any text in input buffer, then send the slash command
    tmux send-keys -t "$session_name" C-u
    sleep 0.5
    tmux send-keys -t "$session_name" "/$command_file $PROJECT_PATH" Enter

    # Monitor for completion
    info "Monitoring for PIPELINE:COMPLETE..."

    local timeout=1800  # 30 minutes
    local elapsed=0
    local check_interval=10

    while [[ $elapsed -lt $timeout ]]; do
        sleep $check_interval
        elapsed=$((elapsed + check_interval))

        # Check if session still exists
        if ! tmux has-session -t "$session_name" 2>/dev/null; then
            info "Session ended"
            break
        fi

        # Check for signal file (PRIMARY detection method)
        local signal_file="$PROJECT_PATH/.pipeline/.signal-analysis-${phase}-complete"
        if [[ -f "$signal_file" ]]; then
            success "Phase $phase complete (via signal)"
            rm -f "$signal_file"
            break
        fi

        $VERBOSE && echo "  Waiting... (${elapsed}s)"
    done

    # Kill session
    tmux kill-session -t "$session_name" 2>/dev/null || true

    # Update manifest
    local end_time=$(date -Iseconds)
    jq ".phases.${phase}.status = \"complete\" |
        .phases.${phase}.completedAt = \"$end_time\"" \
        "$ANALYSIS_MANIFEST" > "${ANALYSIS_MANIFEST}.tmp" && \
        mv "${ANALYSIS_MANIFEST}.tmp" "$ANALYSIS_MANIFEST"

    return 0
}

# ═══════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════════════════════════════

print_header "ANALYSIS PIPELINE"
echo "Project: $PROJECT_NAME"
echo "Run ID: $RUN_ID"
echo ""

# Initialize
init_analysis

# If specific phase requested, run only that
if [[ -n "$PHASE_ONLY" ]]; then
    run_phase "$PHASE_ONLY"
    exit 0
fi

# Run all phases in sequence
current_phase=$(jq -r '.currentPhase' "$ANALYSIS_MANIFEST")

case "$current_phase" in
    A)
        run_phase "A"
        run_phase "B"
        run_phase "C"
        ;;
    B)
        run_phase "B"
        run_phase "C"
        ;;
    C)
        run_phase "C"
        ;;
    *)
        run_phase "A"
        run_phase "B"
        run_phase "C"
        ;;
esac

# Mark analysis complete
jq '.status = "complete" |
    .completedAt = "'"$(date -Iseconds)"'"' \
    "$ANALYSIS_MANIFEST" > "${ANALYSIS_MANIFEST}.tmp" && \
    mv "${ANALYSIS_MANIFEST}.tmp" "$ANALYSIS_MANIFEST"

print_header "ANALYSIS COMPLETE"
echo ""
echo "Results: $ANALYSIS_DIR"
echo ""

# Show summary
if [[ -f "$ANALYSIS_DIR/final-report.md" ]]; then
    echo "Final Report:"
    head -30 "$ANALYSIS_DIR/final-report.md"
elif [[ -f "$ANALYSIS_DIR/phase-a-report.md" ]]; then
    echo "Phase A Report:"
    head -30 "$ANALYSIS_DIR/phase-a-report.md"
fi

print_header ""
