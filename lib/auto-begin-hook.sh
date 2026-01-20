#!/bin/bash
# Auto-begin hook for Pipeline v11
# Signals that Claude is ready for orchestrator, worker, or supervisor
# The spawning script saves PIDs separately; this hook just signals readiness

# Read project path from temp file (created by spawn script)
PROJECT_PATH_FILE="$TEMP/pipeline-current-project.txt"

if [ -f "$PROJECT_PATH_FILE" ]; then
    # Read Windows path and convert to Unix format
    WIN_PATH=$(cat "$PROJECT_PATH_FILE" | tr -d '\r\n')
    # Convert C:\path to /c/path (tr for backslashes, sed for drive letter)
    UNIX_PATH=$(echo "$WIN_PATH" | tr '\\' '/' | sed 's|^\([A-Za-z]\):|/\L\1|')
    PIPELINE_DIR="$UNIX_PATH/.pipeline"
else
    # Fallback to relative path (works if run from project dir)
    PIPELINE_DIR=".pipeline"
fi

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

# Output valid JSON for Claude Code hook system
echo '{}'
