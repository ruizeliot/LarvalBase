#!/bin/bash
# DEPRECATED: Use ./pipeline resume <project> instead
#
# This script is deprecated in favor of the simpler session-based resume.
# The new approach uses Claude CLI's built-in --session-id and --resume flags,
# preserving full conversation context instead of reconstructing from transcript.
#
# Old approach (364 lines):
#   - Extract 100 lines from transcript
#   - Start NEW Claude session
#   - Inject context manually
#   - Lose Claude's internal state
#
# New approach (~50 lines):
#   - Use saved session ID
#   - Resume with --resume flag
#   - Full context preserved
#
# Migration: ./pipeline resume <project-path>

echo "DEPRECATED: This script is deprecated."
echo ""
echo "Use the new session-based resume instead:"
echo "  ./pipeline resume $1"
echo ""
echo "The new approach preserves full conversation context."

# Forward to new command if project path provided
if [ -n "$1" ]; then
    exec "$(dirname "$0")/pipeline" resume "$1"
fi
