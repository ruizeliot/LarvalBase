#!/bin/bash
# Windows Pipeline Orchestrator
# Runs pipeline phases on Windows via SSH, captures output, executes file writes via SCP
#
# Usage:
#   ./lib/windows-pipeline-orchestrator.sh <phase> <windows_project_path>
#   ./lib/windows-pipeline-orchestrator.sh 0b /c/Users/ahunt/Documents/pipeline-monitor-desktop
#
# Phases: 0b (technical), 1 (bootstrap), 2 (implement), 3 (finalize)

set -euo pipefail

# Configuration
REMOTE_HOST="${REMOTE_HOST:-localhost}"
REMOTE_PORT="${REMOTE_PORT:-2222}"
REMOTE_USER="${REMOTE_USER:-ahunt}"
SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=10 -o BatchMode=yes"
GIT_BASH='"C:\\Program Files\\Git\\bin\\bash.exe"'
TIMEOUT_DEFAULT=600

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}[orchestrator]${NC} $1"; }
warn() { echo -e "${YELLOW}[orchestrator]${NC} $1"; }
error() { echo -e "${RED}[orchestrator]${NC} $1" >&2; }
info() { echo -e "${CYAN}[orchestrator]${NC} $1"; }

# Check SSH tunnel
check_tunnel() {
    if ! nc -z "$REMOTE_HOST" "$REMOTE_PORT" 2>/dev/null; then
        error "SSH tunnel not available at $REMOTE_HOST:$REMOTE_PORT"
        exit 1
    fi
    log "SSH tunnel OK"
}

# Run command on Windows via Git Bash
run_win() {
    ssh -p "$REMOTE_PORT" $SSH_OPTS "$REMOTE_USER@$REMOTE_HOST" \
        "$GIT_BASH -c '$1'" 2>&1
}

# Run Claude -p on Windows and capture output
run_claude_p() {
    local project_path="$1"
    local prompt="$2"
    local timeout="${3:-$TIMEOUT_DEFAULT}"

    # Escape single quotes in prompt
    local escaped_prompt="${prompt//\'/\'\\\'\'}"

    log "Running Claude -p on Windows..."
    log "Prompt: ${prompt:0:100}..."

    local output
    output=$(timeout "$timeout" ssh -p "$REMOTE_PORT" $SSH_OPTS "$REMOTE_USER@$REMOTE_HOST" \
        "$GIT_BASH -c 'cd \"$project_path\" && claude -p --dangerously-skip-permissions \"$escaped_prompt\"'" 2>&1) || {
        local exit_code=$?
        if [[ $exit_code -eq 124 ]]; then
            error "Timeout after ${timeout}s"
        fi
        echo "$output"
        return $exit_code
    }

    echo "$output"
}

# Write file to Windows via SCP
write_file() {
    local win_path="$1"
    local content="$2"

    # Save to temp file
    local temp_file="/tmp/orchestrator-write-$$"
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

    # Ensure directory exists
    local dir_path=$(dirname "$win_path")
    run_win "mkdir -p '$dir_path'" || true

    # SCP to Windows
    scp -P "$REMOTE_PORT" $SSH_OPTS "$temp_file" "$REMOTE_USER@$REMOTE_HOST:$scp_path" 2>&1 || {
        rm -f "$temp_file"
        error "Failed to write: $win_path"
        return 1
    }

    rm -f "$temp_file"
    log "Wrote: $win_path"
}

# Parse Claude output for file operations and execute them
parse_and_execute() {
    local project_path="$1"
    local output="$2"

    # Look for file write patterns in Claude's output
    # Pattern: "I'll write to <path>:" or "Creating <path>:" followed by code blocks

    local in_file_block=false
    local current_file=""
    local current_content=""

    while IFS= read -r line; do
        # Check for file path indicators
        if [[ "$line" =~ (write|create|save|output).*(docs/[^[:space:]]+\.(md|ts|tsx|json)) ]]; then
            if [[ -n "$current_file" && -n "$current_content" ]]; then
                write_file "$project_path/$current_file" "$current_content"
            fi
            current_file="${BASH_REMATCH[2]}"
            current_content=""
            in_file_block=false
        fi

        # Check for code block start
        if [[ "$line" == '```'* && -n "$current_file" ]]; then
            if [[ "$in_file_block" == true ]]; then
                # End of code block
                if [[ -n "$current_content" ]]; then
                    write_file "$project_path/$current_file" "$current_content"
                fi
                current_file=""
                current_content=""
                in_file_block=false
            else
                # Start of code block
                in_file_block=true
            fi
        elif [[ "$in_file_block" == true ]]; then
            if [[ -n "$current_content" ]]; then
                current_content+=$'\n'"$line"
            else
                current_content="$line"
            fi
        fi
    done <<< "$output"

    # Handle any remaining content
    if [[ -n "$current_file" && -n "$current_content" ]]; then
        write_file "$project_path/$current_file" "$current_content"
    fi
}

# Phase 0b: Technical Specifications
phase_0b() {
    local project_path="$1"

    log "=== Phase 0b: Technical Specifications ==="

    local prompt='Based on docs/brainstorm-notes.md, create these files:

1. docs/tech-stack.md - Technology choices:
   - Tauri 2.x + Rust backend
   - React 19 + TypeScript 5.9 + Vite 7 frontend
   - Tauri plugins: fs, shell, notification, store, window-state
   - State: Zustand, Terminal: xterm.js
   - Testing: Playwright + tauri-driver

2. docs/e2e-test-specs.md - E2E test cases for:
   - Epic 1: App startup, window state persistence
   - Epic 2: Pipeline list, new pipeline, start/stop
   - Epic 3: Terminal with xterm.js, split terminal
   - Epic 4: System tray, notifications
   - Epic 5: Analytics charts

3. docs/requirements.md - Functional requirements covering all features

Output COMPLETE file contents in markdown code blocks. Label each file clearly.'

    local output
    output=$(run_claude_p "$project_path" "$prompt" 900)

    echo ""
    info "=== Claude Output ==="
    echo "$output"
    echo ""

    # Try to parse and execute file writes
    parse_and_execute "$project_path" "$output"

    # Update manifest
    run_win "echo '{\"currentPhase\": \"0b\", \"status\": \"complete\"}' > '$project_path/.pipeline/manifest.json'"

    log "Phase 0b complete"
}

# Phase 1: Bootstrap Tauri project
phase_1() {
    local project_path="$1"

    log "=== Phase 1: Bootstrap Tauri Project ==="

    local prompt='Based on docs/tech-stack.md and docs/e2e-test-specs.md:

1. Initialize Tauri 2.x project structure
2. Set up React 19 + TypeScript + Vite frontend
3. Configure tauri.conf.json with required plugins
4. Create basic App.tsx with routing
5. Add placeholder components for all features
6. Set up Playwright for Tauri testing

Run: npm create tauri-app@latest -- --template react-ts
Then configure the project.

Output exact commands to run and file contents to create.'

    local output
    output=$(run_claude_p "$project_path" "$prompt" 900)

    echo ""
    info "=== Claude Output ==="
    echo "$output"
    echo ""

    # Execute shell commands from output
    # For bootstrap, we need to run npm commands
    log "Running bootstrap commands..."

    # Run npm create tauri-app if package.json doesn't exist
    local has_pkg
    has_pkg=$(run_win "test -f '$project_path/package.json' && echo 'yes' || echo 'no'")

    if [[ "$has_pkg" != "yes" ]]; then
        log "Initializing Tauri project..."
        run_win "cd '$project_path' && npm create tauri-app@latest . -- --template react-ts --manager npm" || true
    fi

    log "Phase 1 complete"
}

# Main
usage() {
    cat <<EOF
Windows Pipeline Orchestrator

Usage:
  $0 <phase> <windows_project_path>

Phases:
  0b    Technical specifications
  1     Bootstrap Tauri project
  2     Implementation
  3     Finalization

Example:
  $0 0b /c/Users/ahunt/Documents/pipeline-monitor-desktop
EOF
    exit 1
}

PHASE="${1:-}"
PROJECT_PATH="${2:-}"

[[ -z "$PHASE" ]] && usage
[[ -z "$PROJECT_PATH" ]] && usage

check_tunnel

case "$PHASE" in
    0b) phase_0b "$PROJECT_PATH" ;;
    1)  phase_1 "$PROJECT_PATH" ;;
    2)  log "Phase 2 not yet implemented"; exit 1 ;;
    3)  log "Phase 3 not yet implemented"; exit 1 ;;
    *)  error "Unknown phase: $PHASE"; usage ;;
esac

log "Done!"
