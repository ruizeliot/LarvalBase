#!/bin/bash
# Remote Worker Execution Wrapper
# Runs Claude commands on Windows via SSH tunnel
#
# Usage:
#   ./lib/remote-worker.sh <project_path> <message>
#   ./lib/remote-worker.sh <project_path> --continue <message>  # Continue conversation
#   ./lib/remote-worker.sh <project_path> --slash <command>     # Run slash command
#
# Environment:
#   REMOTE_HOST - SSH host (default: localhost)
#   REMOTE_PORT - SSH port (default: 2222)
#   REMOTE_USER - SSH user (default: ahunt)

set -euo pipefail

# Configuration
REMOTE_HOST="${REMOTE_HOST:-localhost}"
REMOTE_PORT="${REMOTE_PORT:-2222}"
REMOTE_USER="${REMOTE_USER:-ahunt}"
SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=10 -o BatchMode=yes"
GIT_BASH='"C:\\Program Files\\Git\\bin\\bash.exe"'

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[remote-worker]${NC} $1" >&2; }
warn() { echo -e "${YELLOW}[remote-worker]${NC} $1" >&2; }
error() { echo -e "${RED}[remote-worker]${NC} $1" >&2; }

usage() {
    cat <<EOF
Usage: $0 <project_path> [options] <message>

Options:
  --continue, -c    Continue previous conversation
  --slash, -s       Run as slash command (prepends /)
  --timeout <sec>   Timeout in seconds (default: 300)

Examples:
  $0 /c/Users/.../web "List files in docs/"
  $0 /c/Users/.../web -c "What did we discuss?"
  $0 /c/Users/.../web -s "anthohunt-1a-brainstorm"
EOF
    exit 1
}

# Parse arguments
PROJECT_PATH=""
MESSAGE=""
CONTINUE=""
SLASH=""
TIMEOUT=300

while [[ $# -gt 0 ]]; do
    case $1 in
        -c|--continue) CONTINUE="-c"; shift ;;
        -s|--slash) SLASH="true"; shift ;;
        --timeout) TIMEOUT="$2"; shift 2 ;;
        -h|--help) usage ;;
        *)
            if [[ -z "$PROJECT_PATH" ]]; then
                PROJECT_PATH="$1"
            else
                MESSAGE="$1"
            fi
            shift
            ;;
    esac
done

[[ -z "$PROJECT_PATH" ]] && { error "Project path required"; usage; }
[[ -z "$MESSAGE" ]] && { error "Message required"; usage; }

# Prepend / for slash commands
[[ "$SLASH" == "true" ]] && MESSAGE="/$MESSAGE"

# Check tunnel is up
if ! nc -z "$REMOTE_HOST" "$REMOTE_PORT" 2>/dev/null; then
    error "SSH tunnel not available at $REMOTE_HOST:$REMOTE_PORT"
    exit 1
fi

log "Sending to Windows Claude..."
log "Project: $PROJECT_PATH"
log "Message: ${MESSAGE:0:80}..."

# Escape message for shell
ESCAPED_MSG=$(printf '%s' "$MESSAGE" | sed "s/'/'\\\\''/g")

# Build Claude command
CLAUDE_CMD="claude -p $CONTINUE --dangerously-skip-permissions '$ESCAPED_MSG'"

# Execute via SSH
RESULT=$(timeout "$TIMEOUT" ssh -p "$REMOTE_PORT" $SSH_OPTS "$REMOTE_USER@$REMOTE_HOST" \
    "$GIT_BASH -c 'cd \"$PROJECT_PATH\" && $CLAUDE_CMD'" 2>&1) || {
    EXIT_CODE=$?
    if [[ $EXIT_CODE -eq 124 ]]; then
        error "Timeout after ${TIMEOUT}s"
    else
        error "SSH/Claude failed with exit code $EXIT_CODE"
    fi
    echo "$RESULT"
    exit $EXIT_CODE
}

# Output result
echo "$RESULT"
