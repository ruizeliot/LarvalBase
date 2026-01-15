#!/bin/bash
# Auto-begin hook for Pipeline v11
# Signals that Claude is ready for orchestrator, worker, or supervisor
# The spawning script saves PIDs separately; this hook just signals readiness

PIPELINE_DIR=".pipeline"

# Orchestrator
if [ -f "$PIPELINE_DIR/auto-begin.txt" ]; then
    echo "$(date)" > "$PIPELINE_DIR/claude-ready.txt"
    rm -f "$PIPELINE_DIR/auto-begin.txt"
fi

# Worker
if [ -f "$PIPELINE_DIR/worker-begin.txt" ]; then
    echo "$(date)" > "$PIPELINE_DIR/worker-ready.txt"
    rm -f "$PIPELINE_DIR/worker-begin.txt"
fi

# Supervisor
if [ -f "$PIPELINE_DIR/supervisor-begin.txt" ]; then
    echo "$(date)" > "$PIPELINE_DIR/supervisor-ready.txt"
    rm -f "$PIPELINE_DIR/supervisor-begin.txt"
fi
