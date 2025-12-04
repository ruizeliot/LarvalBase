#!/bin/bash
# Windows Claude Controller (runs ON VPS)
# Controls Claude running on Windows via SSH
#
# Usage:
#   ./lib/windows-controller.sh start <windows_project_path> [prompt]
#   ./lib/windows-controller.sh watch <windows_project_path>
#   ./lib/windows-controller.sh send <windows_project_path> <message>
#   ./lib/windows-controller.sh stop <windows_project_path>
#   ./lib/windows-controller.sh status <windows_project_path>
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
SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=10"
GIT_BASH='"C:\Program Files\Git\bin\bash.exe"'

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}[windows]${NC} $1"; }
warn() { echo -e "${YELLOW}[windows]${NC} $1"; }
error() { echo -e "${RED}[windows]${NC} $1"; }
info() { echo -e "${CYAN}[windows]${NC} $1"; }

# Convert path formats
# Git Bash: /c/Users/... -> Windows SCP: C:/Users/...
to_scp_path() {
    local path="$1"
    if [[ "$path" == /c/* ]]; then
        echo "C:${path:2}"
    elif [[ "$path" == /d/* ]]; then
        echo "D:${path:2}"
    else
        echo "$path"
    fi
}

# Git Bash format (for run_bash)
to_bash_path() {
    local path="$1"
    if [[ "$path" == C:* ]]; then
        echo "/c${path:2}"
    elif [[ "$path" == D:* ]]; then
        echo "/d${path:2}"
    else
        echo "$path"
    fi
}

# Check SSH tunnel
check_tunnel() {
    if ! nc -z "$REMOTE_HOST" "$REMOTE_PORT" 2>/dev/null; then
        error "SSH tunnel not available at $REMOTE_HOST:$REMOTE_PORT"
        error "Start tunnel on Windows: ssh -R 2222:localhost:22 user@vps"
        exit 1
    fi
}

# Run command on Windows via Git Bash
run_bash() {
    ssh -p "$REMOTE_PORT" $SSH_OPTS "$REMOTE_USER@$REMOTE_HOST" \
        "$GIT_BASH -c '$1'"
}

# Copy file to Windows
copy_to_windows() {
    local src="$1"
    local dest="$2"  # Must be C:/Users/... format
    scp -P "$REMOTE_PORT" $SSH_OPTS "$src" "$REMOTE_USER@$REMOTE_HOST:$dest"
}

# Copy file from Windows
copy_from_windows() {
    local src="$1"  # Must be C:/Users/... format
    local dest="$2"
    scp -P "$REMOTE_PORT" $SSH_OPTS "$REMOTE_USER@$REMOTE_HOST:$src" "$dest"
}

# Start Claude on Windows
cmd_start() {
    local win_path="$1"
    local prompt="${2:-Read CLAUDE.md and help me with this project.}"

    check_tunnel
    log "Starting Claude on Windows..."
    log "Project: $win_path"

    # Convert path for Git Bash if needed (C:\Users\... -> /c/Users/...)
    local bash_path
    if [[ "$win_path" == C:* ]]; then
        bash_path="/c${win_path:2}"
        bash_path="${bash_path//\\//}"  # Replace backslashes
    else
        bash_path="$win_path"
    fi

    # First, copy the runner script using SCP path format
    local script_dir="$(dirname "$(realpath "$0")")"
    local scp_dest=$(to_scp_path "/c/Users/ahunt/Documents/windows-runner.sh")
    copy_to_windows "$script_dir/windows-runner.sh" "$scp_dest"

    # Clear old output
    run_bash "mkdir -p '$bash_path/.pipeline' && : > '$bash_path/.pipeline/output.log'"

    # Start the runner in background
    log "Launching runner..."
    ssh -p "$REMOTE_PORT" $SSH_OPTS "$REMOTE_USER@$REMOTE_HOST" \
        "$GIT_BASH -c 'cd \"$bash_path\" && nohup bash /c/Users/ahunt/Documents/windows-runner.sh \"$bash_path\" \"$prompt\" > /dev/null 2>&1 &'" &

    sleep 3

    # Check status
    if run_bash "test -f '$bash_path/.pipeline/status.txt' && cat '$bash_path/.pipeline/status.txt'" | grep -q "running"; then
        log "Claude started successfully!"
        log "Use 'watch' to see output, 'send' to send messages"
    else
        warn "Claude may not have started. Check with 'status' command."
    fi
}

# Watch output
cmd_watch() {
    local win_path="$1"

    check_tunnel

    local bash_path
    if [[ "$win_path" == C:* ]]; then
        bash_path="/c${win_path:2}"
        bash_path="${bash_path//\\//}"
    else
        bash_path="$win_path"
    fi

    log "Watching output (Ctrl+C to stop)..."

    # Tail the output log
    ssh -p "$REMOTE_PORT" $SSH_OPTS "$REMOTE_USER@$REMOTE_HOST" \
        "$GIT_BASH -c 'tail -f \"$bash_path/.pipeline/output.log\"'" || true
}

# Send message
cmd_send() {
    local win_path="$1"
    local message="$2"

    check_tunnel

    local bash_path
    if [[ "$win_path" == C:* ]]; then
        bash_path="/c${win_path:2}"
        bash_path="${bash_path//\\//}"
    else
        bash_path="$win_path"
    fi

    log "Sending message to Claude..."

    # Write message to input file
    run_bash "echo '$message' >> '$bash_path/.pipeline/input.txt'"

    log "Message sent."
}

# Stop Claude
cmd_stop() {
    local win_path="$1"

    check_tunnel

    local bash_path
    if [[ "$win_path" == C:* ]]; then
        bash_path="/c${win_path:2}"
        bash_path="${bash_path//\\//}"
    else
        bash_path="$win_path"
    fi

    log "Stopping Claude..."

    # Set status to stopped
    run_bash "echo 'stopping' > '$bash_path/.pipeline/status.txt'"

    # Kill by PID if available
    local pid
    pid=$(run_bash "cat '$bash_path/.pipeline/pid.txt' 2>/dev/null" || echo "")
    if [[ -n "$pid" ]]; then
        run_bash "kill $pid 2>/dev/null || true"
        log "Sent kill signal to PID $pid"
    fi

    log "Claude stopped."
}

# Check status
cmd_status() {
    local win_path="$1"

    check_tunnel

    local bash_path
    if [[ "$win_path" == C:* ]]; then
        bash_path="/c${win_path:2}"
        bash_path="${bash_path//\\//}"
    else
        bash_path="$win_path"
    fi

    info "=== Windows Claude Status ==="

    local status
    status=$(run_bash "cat '$bash_path/.pipeline/status.txt' 2>/dev/null" || echo "not started")
    echo -e "Status: ${CYAN}$status${NC}"

    local pid
    pid=$(run_bash "cat '$bash_path/.pipeline/pid.txt' 2>/dev/null" || echo "N/A")
    echo -e "PID: ${CYAN}$pid${NC}"

    local log_lines
    log_lines=$(run_bash "wc -l < '$bash_path/.pipeline/output.log' 2>/dev/null" || echo "0")
    echo -e "Log lines: ${CYAN}$log_lines${NC}"

    echo ""
    info "=== Last 10 lines of output ==="
    run_bash "tail -10 '$bash_path/.pipeline/output.log' 2>/dev/null" || echo "(no output yet)"
}

# Usage
usage() {
    cat <<EOF
Windows Claude Controller

Usage:
  $0 start <windows_path> [prompt]  - Start Claude on Windows
  $0 watch <windows_path>           - Watch Claude output
  $0 send <windows_path> <message>  - Send message to Claude
  $0 stop <windows_path>            - Stop Claude
  $0 status <windows_path>          - Check status

Example:
  $0 start /c/Users/ahunt/Documents/my-project "Run /supervisor"
  $0 watch /c/Users/ahunt/Documents/my-project
  $0 send /c/Users/ahunt/Documents/my-project "Continue with phase 2"
  $0 stop /c/Users/ahunt/Documents/my-project
EOF
    exit 1
}

# Main
case "${1:-}" in
    start)
        [[ -z "${2:-}" ]] && usage
        cmd_start "$2" "${3:-}"
        ;;
    watch)
        [[ -z "${2:-}" ]] && usage
        cmd_watch "$2"
        ;;
    send)
        [[ -z "${2:-}" || -z "${3:-}" ]] && usage
        cmd_send "$2" "$3"
        ;;
    stop)
        [[ -z "${2:-}" ]] && usage
        cmd_stop "$2"
        ;;
    status)
        [[ -z "${2:-}" ]] && usage
        cmd_status "$2"
        ;;
    *)
        usage
        ;;
esac
