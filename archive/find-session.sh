#!/bin/bash
# Find Claude Code session JSONL files
# Usage:
#   ./find-session.sh --project <project-path>     # Find JSONL dir for project
#   ./find-session.sh --session <session-id>       # Find JSONL file by session ID
#   ./find-session.sh --latest <project-path>      # Find most recent session
#   ./find-session.sh --list <project-path>        # List all sessions for project

set -euo pipefail

CLAUDE_PROJECTS_DIR="$HOME/.claude/projects"

# Convert project path to Claude's encoded directory name
encode_path() {
    local path="$1"
    # Convert /home/claude/IMT/foo to -home-claude-IMT-foo
    echo "$path" | sed 's|^/||; s|/|-|g; s|^|-|'
}

# Find JSONL directory for a project
find_project_dir() {
    local project_path="$1"
    local encoded=$(encode_path "$project_path")
    local dir="$CLAUDE_PROJECTS_DIR/$encoded"

    if [[ -d "$dir" ]]; then
        echo "$dir"
    else
        echo "Error: No session directory found for $project_path" >&2
        echo "Expected: $dir" >&2
        return 1
    fi
}

# Find JSONL file by session ID (searches all project directories)
find_session() {
    local session_id="$1"
    local found=$(find "$CLAUDE_PROJECTS_DIR" -name "${session_id}.jsonl" -type f 2>/dev/null | head -1)

    if [[ -n "$found" ]]; then
        echo "$found"
    else
        echo "Error: Session $session_id not found" >&2
        return 1
    fi
}

# Find most recent session for a project
find_latest() {
    local project_path="$1"
    local project_dir=$(find_project_dir "$project_path")

    if [[ $? -ne 0 ]]; then
        return 1
    fi

    # Find most recently modified JSONL file (excluding agent-* files which are subagents)
    local latest=$(ls -t "$project_dir"/*.jsonl 2>/dev/null | grep -v '/agent-' | head -1)

    if [[ -n "$latest" ]]; then
        echo "$latest"
    else
        echo "Error: No sessions found in $project_dir" >&2
        return 1
    fi
}

# List all sessions for a project (formatted output)
list_sessions() {
    local project_path="$1"
    local project_dir=$(find_project_dir "$project_path")

    if [[ $? -ne 0 ]]; then
        return 1
    fi

    echo "Sessions for: $project_path"
    echo "Directory: $project_dir"
    echo ""
    echo "Recent sessions (newest first):"
    echo ""

    # List sessions with size and date
    ls -lth "$project_dir"/*.jsonl 2>/dev/null | grep -v '/agent-' | head -10 | while read line; do
        # Extract filename and try to get session summary
        file=$(echo "$line" | awk '{print $NF}')
        if [[ -f "$file" ]]; then
            summary=$(jq -r 'select(.type=="summary") | .summary' "$file" 2>/dev/null | head -1)
            size=$(echo "$line" | awk '{print $5}')
            date=$(echo "$line" | awk '{print $6" "$7" "$8}')
            basename=$(basename "$file" .jsonl)

            if [[ -n "$summary" ]]; then
                echo "  $date  ${size}  ${basename:0:36}  \"$summary\""
            else
                echo "  $date  ${size}  ${basename:0:36}"
            fi
        fi
    done
}

# List session files only (one path per line, for scripting)
list_session_files() {
    local project_path="$1"
    local limit="${2:-10}"
    local project_dir=$(find_project_dir "$project_path")

    if [[ $? -ne 0 ]]; then
        return 1
    fi

    # Output just file paths, newest first
    ls -t "$project_dir"/*.jsonl 2>/dev/null | grep -v '/agent-' | head -"$limit"
}

# Main
case "${1:-}" in
    --project)
        find_project_dir "${2:-}"
        ;;
    --session)
        find_session "${2:-}"
        ;;
    --latest)
        find_latest "${2:-}"
        ;;
    --list)
        list_sessions "${2:-}"
        ;;
    --files)
        list_session_files "${2:-}" "${3:-10}"
        ;;
    *)
        echo "Usage:"
        echo "  $0 --project <project-path>   # Find JSONL directory"
        echo "  $0 --session <session-id>     # Find JSONL file"
        echo "  $0 --latest <project-path>    # Find most recent session"
        echo "  $0 --list <project-path>      # List all sessions (formatted)"
        echo "  $0 --files <project-path> [n] # List session file paths (for scripting)"
        exit 1
        ;;
esac
