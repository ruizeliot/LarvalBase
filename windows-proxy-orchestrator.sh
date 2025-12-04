#!/bin/bash
# Windows Proxy Orchestrator
# Runs Claude on Windows via SSH, proxies file operations through VPS
#
# Key Pattern:
#   Claude -p mode can't write files (sandbox), but CAN output content.
#   We capture Claude's output and execute file operations ourselves via SSH/SCP.
#
# Usage:
#   ./lib/windows-proxy-orchestrator.sh <windows_project_path> <prompt>
#   ./lib/windows-proxy-orchestrator.sh <windows_project_path> --continue <prompt>
#
# Example:
#   ./lib/windows-proxy-orchestrator.sh "/c/Users/ahunt/Documents/my-project" "Read CLAUDE.md and summarize"

set -euo pipefail

# Configuration
REMOTE_HOST="${REMOTE_HOST:-localhost}"
REMOTE_PORT="${REMOTE_PORT:-2222}"
REMOTE_USER="${REMOTE_USER:-ahunt}"
SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=10 -o BatchMode=yes"
GIT_BASH='"C:\\Program Files\\Git\\bin\\bash.exe"'
TIMEOUT_DEFAULT=300

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}[proxy]${NC} $1"; }
warn() { echo -e "${YELLOW}[proxy]${NC} $1"; }
error() { echo -e "${RED}[proxy]${NC} $1"; }
info() { echo -e "${CYAN}[proxy]${NC} $1"; }

# Check SSH tunnel
check_tunnel() {
    if ! nc -z "$REMOTE_HOST" "$REMOTE_PORT" 2>/dev/null; then
        error "SSH tunnel not available at $REMOTE_HOST:$REMOTE_PORT"
        error "Start tunnel on Windows: ssh -R 2222:localhost:22 user@vps"
        exit 1
    fi
}

# Run bash command on Windows
run_win_bash() {
    local cmd="$1"
    ssh -p "$REMOTE_PORT" $SSH_OPTS "$REMOTE_USER@$REMOTE_HOST" \
        "$GIT_BASH -c '$cmd'" 2>&1
}

# Run Claude on Windows and capture output
run_claude() {
    local project_path="$1"
    local prompt="$2"
    local continue_flag="${3:-}"
    local timeout="${4:-$TIMEOUT_DEFAULT}"

    local claude_opts="-p --dangerously-skip-permissions"
    [[ -n "$continue_flag" ]] && claude_opts="$claude_opts -c"

    # Escape prompt for shell
    local escaped_prompt
    escaped_prompt=$(printf '%s' "$prompt" | sed "s/'/'\\\\''/g")

    local output
    output=$(timeout "$timeout" ssh -p "$REMOTE_PORT" $SSH_OPTS "$REMOTE_USER@$REMOTE_HOST" \
        "$GIT_BASH -c 'cd \"$project_path\" && claude $claude_opts \"$escaped_prompt\"'" 2>&1) || {
        local exit_code=$?
        if [[ $exit_code -eq 124 ]]; then
            error "Timeout after ${timeout}s"
        fi
        echo "$output"
        return $exit_code
    }

    echo "$output"
}

# Write file to Windows via SCP (proxy pattern)
write_file() {
    local win_path="$1"
    local content="$2"

    # Save to temp file on VPS
    local temp_file="/tmp/proxy-write-$$"
    echo "$content" > "$temp_file"

    # Convert Git Bash path to SCP path
    local scp_path
    if [[ "$win_path" == /c/* ]]; then
        scp_path="C:${win_path:2}"
    elif [[ "$win_path" == /d/* ]]; then
        scp_path="D:${win_path:2}"
    else
        scp_path="$win_path"
    fi

    # SCP to Windows
    scp -P "$REMOTE_PORT" $SSH_OPTS "$temp_file" "$REMOTE_USER@$REMOTE_HOST:$scp_path" 2>&1 || {
        rm -f "$temp_file"
        return 1
    }

    rm -f "$temp_file"
    log "Wrote file: $win_path"
}

# Read file from Windows
read_file() {
    local win_path="$1"
    run_win_bash "cat '$win_path'"
}

# Create directory on Windows
mkdir_win() {
    local win_path="$1"
    run_win_bash "mkdir -p '$win_path'"
}

# Parse arguments
PROJECT_PATH=""
PROMPT=""
CONTINUE=""
TIMEOUT=$TIMEOUT_DEFAULT

while [[ $# -gt 0 ]]; do
    case $1 in
        -c|--continue) CONTINUE="true"; shift ;;
        --timeout) TIMEOUT="$2"; shift 2 ;;
        -h|--help)
            cat <<EOF
Windows Proxy Orchestrator

Usage:
  $0 <windows_project_path> [options] <prompt>

Options:
  -c, --continue    Continue previous conversation
  --timeout <sec>   Timeout in seconds (default: $TIMEOUT_DEFAULT)

Example:
  $0 /c/Users/ahunt/Documents/project "Read CLAUDE.md"
  $0 /c/Users/ahunt/Documents/project -c "What files exist?"
EOF
            exit 0
            ;;
        *)
            if [[ -z "$PROJECT_PATH" ]]; then
                PROJECT_PATH="$1"
            else
                PROMPT="$1"
            fi
            shift
            ;;
    esac
done

[[ -z "$PROJECT_PATH" ]] && { error "Project path required"; exit 1; }
[[ -z "$PROMPT" ]] && { error "Prompt required"; exit 1; }

# Main execution
main() {
    check_tunnel

    log "Project: $PROJECT_PATH"
    log "Prompt: ${PROMPT:0:80}..."

    # Ensure .pipeline directory exists
    mkdir_win "$PROJECT_PATH/.pipeline" || true

    # Run Claude
    local output
    output=$(run_claude "$PROJECT_PATH" "$PROMPT" "$CONTINUE" "$TIMEOUT")

    echo ""
    info "=== Claude Output ==="
    echo "$output"
    echo ""

    # TODO: Parse output for tool calls and execute them
    # For now, just output what Claude says

    return 0
}

main "$@"
