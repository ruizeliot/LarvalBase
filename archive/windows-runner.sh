#!/bin/bash
# Windows Runner Script (runs ON Windows via SSH)
# This script runs Claude with file-based I/O for remote control
#
# Usage (from VPS):
#   SCP this script to Windows, then run via SSH
#
# Files:
#   .pipeline/input.txt   - Write here to send messages
#   .pipeline/output.log  - Read Claude's output from here
#   .pipeline/pid.txt     - Process ID of Claude
#   .pipeline/status.txt  - Running status

set -euo pipefail

PROJECT_DIR="${1:-.}"
cd "$PROJECT_DIR"

# Paths
PIPELINE_DIR=".pipeline"
INPUT_FILE="$PIPELINE_DIR/input.txt"
OUTPUT_LOG="$PIPELINE_DIR/output.log"
PID_FILE="$PIPELINE_DIR/pid.txt"
STATUS_FILE="$PIPELINE_DIR/status.txt"

# Ensure .pipeline exists
mkdir -p "$PIPELINE_DIR"

# Clean up any previous run
rm -f "$INPUT_FILE" "$PID_FILE"
: > "$OUTPUT_LOG"  # Truncate log
echo "starting" > "$STATUS_FILE"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$OUTPUT_LOG"
}

log "Windows runner starting..."
log "Project: $(pwd)"

# Create named pipe for input if possible, otherwise poll file
if mkfifo "$INPUT_FILE" 2>/dev/null; then
    log "Using named pipe for input"
    USE_PIPE=true
else
    log "Using file polling for input"
    touch "$INPUT_FILE"
    USE_PIPE=false
fi

# Function to send input to Claude
send_to_claude() {
    if [[ "$USE_PIPE" == "true" ]]; then
        echo "$1" > "$INPUT_FILE"
    else
        echo "$1" >> "$INPUT_FILE.queue"
    fi
}

# Background process to poll for input (when not using pipe)
if [[ "$USE_PIPE" == "false" ]]; then
    (
        while [[ -f "$STATUS_FILE" ]] && grep -q "running" "$STATUS_FILE" 2>/dev/null; do
            if [[ -f "$INPUT_FILE.queue" ]] && [[ -s "$INPUT_FILE.queue" ]]; then
                # Move queue to input file atomically
                mv "$INPUT_FILE.queue" "$INPUT_FILE.sending"
                cat "$INPUT_FILE.sending"
                rm -f "$INPUT_FILE.sending"
            fi
            sleep 1
        done
    ) &
    INPUT_POLLER_PID=$!
fi

# Start Claude with initial prompt
INITIAL_PROMPT="${2:-Read CLAUDE.md and help me with this project.}"

log "Starting Claude..."
echo "running" > "$STATUS_FILE"

# Run Claude interactively with input from file/pipe
{
    echo "$INITIAL_PROMPT"
    if [[ "$USE_PIPE" == "true" ]]; then
        cat "$INPUT_FILE"
    else
        # Poll for input file
        while [[ -f "$STATUS_FILE" ]] && grep -q "running" "$STATUS_FILE" 2>/dev/null; do
            if [[ -f "$INPUT_FILE" ]] && [[ -s "$INPUT_FILE" ]]; then
                cat "$INPUT_FILE"
                : > "$INPUT_FILE"  # Clear after reading
            fi
            sleep 1
        done
    fi
} | claude --dangerously-skip-permissions 2>&1 | tee -a "$OUTPUT_LOG" &

CLAUDE_PID=$!
echo "$CLAUDE_PID" > "$PID_FILE"
log "Claude started with PID $CLAUDE_PID"

# Wait for Claude to finish
wait $CLAUDE_PID 2>/dev/null || true
EXIT_CODE=$?

log "Claude exited with code $EXIT_CODE"
echo "stopped" > "$STATUS_FILE"

# Clean up
[[ -n "${INPUT_POLLER_PID:-}" ]] && kill "$INPUT_POLLER_PID" 2>/dev/null || true
rm -f "$INPUT_FILE" "$INPUT_FILE.queue" "$INPUT_FILE.sending" "$PID_FILE"

log "Runner finished"
