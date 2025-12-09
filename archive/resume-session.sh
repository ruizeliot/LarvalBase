#!/bin/bash
# Resume a pipeline session using Claude's built-in session management
# Usage: ./resume-session.sh <project-path>
#
# This script resumes the exact Claude session, preserving full conversation context.
# Much simpler than reconstructing context from transcripts.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

PROJECT_PATH="${1:-}"

[ -z "$PROJECT_PATH" ] && die "Usage: ./resume-session.sh <project-path>"

PROJECT_PATH=$(realpath "$PROJECT_PATH")
validate_project_path "$PROJECT_PATH"

SESSION_FILE="$PROJECT_PATH/.pipeline/session-id"

if [ ! -f "$SESSION_FILE" ]; then
    die "No session to resume. Session file not found: $SESSION_FILE"
fi

SESSION_ID=$(cat "$SESSION_FILE")

if [ -z "$SESSION_ID" ]; then
    die "Session file is empty: $SESSION_FILE"
fi

print_header "RESUMING SESSION"
echo "Project: $PROJECT_PATH"
echo "Session: $SESSION_ID"
echo ""
echo "Claude will continue from where you left off."
echo "Full conversation context is preserved."
print_header ""

# Control files
INPUT_FILE="$PROJECT_PATH/.pipeline/.input"
STOP_FILE="$PROJECT_PATH/.pipeline/.stop"
rm -f "$STOP_FILE" "$INPUT_FILE"

echo ""
echo "To send input: ./pipeline send $PROJECT_PATH \"your message\""
echo "To stop:       ./pipeline stop $PROJECT_PATH"
echo ""

cd "$PROJECT_PATH"

# Resume the session - Claude handles all context restoration
expect "$SCRIPT_DIR/lib/expect-interactive.exp" \
    "" \
    "$INPUT_FILE" \
    "$STOP_FILE" \
    "$PROJECT_PATH/.pipeline/.exit_status" \
    "$PROJECT_PATH/.pipeline/.stop_writing" \
    "$SESSION_ID"

echo ""
print_header "Session Ended"
