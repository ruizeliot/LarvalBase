#!/bin/bash
# Session hook - captures session info for pipeline cost analysis
# Used by spawn-worker.ps1 to get session_id for cost tracking

STDIN_DATA=$(cat)

if [ -d ".pipeline" ]; then
    echo "$STDIN_DATA" > ".pipeline/session-info.txt"
fi

exit 0
