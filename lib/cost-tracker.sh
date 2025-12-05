#!/bin/bash
# Cost Tracker Library - Live token/cost tracking using ccusage
#
# Uses ccusage (https://github.com/ryoppippi/ccusage) to read Claude's JSONL files
# and calculate token usage and dollar cost.
#
# Usage:
#   source lib/cost-tracker.sh
#   cost_get_session_cost <session-id>
#   cost_get_project_cost <project-path>
#   cost_get_live_cost <project-path>
#   cost_start_monitor <project-path>

# Note: Don't use set -u here as this is sourced and may have unset vars
set -eo pipefail

# Pricing per 1M tokens (Claude 3.5 Sonnet / Opus defaults)
# Update these if pricing changes
COST_INPUT_PER_M=${COST_INPUT_PER_M:-3.00}      # $3/1M input tokens (Sonnet)
COST_OUTPUT_PER_M=${COST_OUTPUT_PER_M:-15.00}   # $15/1M output tokens (Sonnet)
COST_CACHE_WRITE_PER_M=${COST_CACHE_WRITE_PER_M:-3.75}  # $3.75/1M cache write
COST_CACHE_READ_PER_M=${COST_CACHE_READ_PER_M:-0.30}    # $0.30/1M cache read

# Check if jq is available
cost_check_jq() {
    if command -v jq &>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Check if ccusage is available
cost_check_ccusage() {
    if command -v npx &>/dev/null; then
        return 0
    else
        echo "Warning: npx not found. Install Node.js for cost tracking." >&2
        return 1
    fi
}

# Get cost for a specific session
# Usage: cost_get_session_cost <session-id>
# Returns JSON: {"input": N, "output": N, "cache_write": N, "cache_read": N, "cost_usd": "X.XX"}
cost_get_session_cost() {
    local session_id="${1:-}"

    if [[ -z "$session_id" ]]; then
        echo '{"input": 0, "output": 0, "cache_write": 0, "cache_read": 0, "cost_usd": "0.00"}'
        return 0
    fi

    if ! cost_check_ccusage; then
        echo '{"error": "ccusage not available"}'
        return 1
    fi

    if ! cost_check_jq; then
        echo '{"error": "jq not available"}'
        return 1
    fi

    # Use ccusage to get session data
    local result
    result=$(npx ccusage@latest session --json 2>/dev/null | jq --arg sid "$session_id" '.[] | select(.sessionId == $sid)' 2>/dev/null) || true

    if [[ -z "$result" ]] || [[ "$result" == "null" ]]; then
        echo '{"input": 0, "output": 0, "cache_write": 0, "cache_read": 0, "cost_usd": "0.00"}'
        return 0
    fi

    echo "$result"
}

# Get total cost for a project (all sessions in project directory)
# Usage: cost_get_project_cost <project-path>
cost_get_project_cost() {
    local project_path="${1:-}"

    if [[ -z "$project_path" ]]; then
        echo '{"input": 0, "output": 0, "cost_usd": "0.00", "sessions": 0}'
        return 0
    fi

    if ! cost_check_ccusage; then
        echo '{"error": "ccusage not available"}'
        return 1
    fi

    if ! cost_check_jq; then
        echo '{"error": "jq not available"}'
        return 1
    fi

    # Encode project path for Claude's directory structure
    local encoded_path
    if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ -n "${WINDIR:-}" ]]; then
        encoded_path=$(echo "$project_path" | sed 's|\\|/|g; s|:|/|; s|^/||; s|/|-|g; s|^|-|')
    else
        encoded_path=$(echo "$project_path" | sed 's|^/||; s|/|-|g; s|^|-|')
    fi

    local claude_dir="$HOME/.claude/projects/$encoded_path"

    if [[ ! -d "$claude_dir" ]]; then
        echo '{"input": 0, "output": 0, "cost_usd": "0.00", "sessions": 0}'
        return 0
    fi

    # Count sessions and aggregate from ccusage
    local session_count=$(ls -1 "$claude_dir"/*.jsonl 2>/dev/null | grep -v '/agent-' | wc -l) || session_count=0

    # Get daily totals which include all sessions
    local daily
    daily=$(npx ccusage@latest daily --json 2>/dev/null | jq '.[0] // {}' 2>/dev/null) || daily='{}'

    if [[ -z "$daily" ]] || [[ "$daily" == "{}" ]]; then
        echo "{\"input\": 0, \"output\": 0, \"cost_usd\": \"0.00\", \"sessions\": $session_count}"
        return 0
    fi

    # Add session count to the result
    echo "$daily" | jq --arg sessions "$session_count" '. + {sessions: ($sessions | tonumber)}'
}

# Get live cost (current running session)
# Usage: cost_get_live_cost <project-path>
# Returns: cost info for the most recent/active session
cost_get_live_cost() {
    local project_path="${1:-}"

    if [[ -z "$project_path" ]]; then
        echo '{"input": 0, "output": 0, "cost_usd": "0.00", "active": false}'
        return 0
    fi

    if ! cost_check_jq; then
        echo '{"error": "jq not available"}'
        return 1
    fi

    # Find latest session for project
    local session_id=""
    local script_dir="${SCRIPT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

    if [[ -f "$script_dir/lib/find-session.sh" ]]; then
        session_id=$("$script_dir/lib/find-session.sh" --latest "$project_path" 2>/dev/null | xargs -r basename 2>/dev/null | sed 's/.jsonl$//') || true
    fi

    if [[ -z "$session_id" ]]; then
        echo '{"input": 0, "output": 0, "cost_usd": "0.00", "active": false}'
        return 0
    fi

    # Get session cost
    local cost
    cost=$(cost_get_session_cost "$session_id")

    # Add active flag
    echo "$cost" | jq '. + {active: true, sessionId: "'"$session_id"'"}'
}

# Calculate cost from raw token counts
# Usage: cost_calculate <input_tokens> <output_tokens> [cache_write] [cache_read]
cost_calculate() {
    local input="${1:-0}"
    local output="${2:-0}"
    local cache_write="${3:-0}"
    local cache_read="${4:-0}"

    # Calculate cost in dollars
    local cost
    cost=$(echo "scale=4; ($input * $COST_INPUT_PER_M / 1000000) + ($output * $COST_OUTPUT_PER_M / 1000000) + ($cache_write * $COST_CACHE_WRITE_PER_M / 1000000) + ($cache_read * $COST_CACHE_READ_PER_M / 1000000)" | bc)

    # Use LC_NUMERIC=C to ensure decimal point (not comma)
    LC_NUMERIC=C printf '%.2f' "$cost"
}

# Format cost for display
# Usage: cost_format <cost_usd>
cost_format() {
    local cost="${1:-0}"
    # Use LC_NUMERIC=C to ensure decimal point (not comma)
    LC_NUMERIC=C printf '$%.2f' "$cost"
}

# Format tokens for display (with K/M suffixes)
# Usage: tokens_format <count>
tokens_format() {
    local count="${1:-0}"

    if [[ "$count" -ge 1000000 ]]; then
        LC_NUMERIC=C printf '%.1fM' "$(echo "scale=1; $count / 1000000" | bc)"
    elif [[ "$count" -ge 1000 ]]; then
        LC_NUMERIC=C printf '%.1fK' "$(echo "scale=1; $count / 1000" | bc)"
    else
        echo "$count"
    fi
}

# Start live cost monitor (runs in background, updates file periodically)
# Usage: cost_start_monitor <project-path> [interval_seconds]
cost_start_monitor() {
    local project_path="${1:-}"
    local interval="${2:-30}"

    if [[ -z "$project_path" ]]; then
        echo "Error: project_path required" >&2
        return 1
    fi

    if ! cost_check_jq; then
        echo "Error: jq is required for cost monitoring" >&2
        return 1
    fi

    local cost_file="$project_path/.pipeline/live-cost.json"

    mkdir -p "$project_path/.pipeline"

    echo "Starting cost monitor (interval: ${interval}s)..."
    echo "Cost file: $cost_file"

    while true; do
        local cost
        cost=$(cost_get_live_cost "$project_path")

        # Add timestamp
        local timestamp=$(date -Iseconds)
        echo "$cost" | jq --arg ts "$timestamp" '. + {updatedAt: $ts}' > "$cost_file"

        sleep "$interval"
    done
}

# Read live cost file (for dashboard)
# Usage: cost_read_live <project-path>
cost_read_live() {
    local project_path="${1:-}"

    if [[ -z "$project_path" ]]; then
        echo '{"input": 0, "output": 0, "cost_usd": "0.00", "active": false}'
        return 0
    fi

    local cost_file="$project_path/.pipeline/live-cost.json"

    if [[ -f "$cost_file" ]]; then
        cat "$cost_file"
    else
        echo '{"input": 0, "output": 0, "cost_usd": "0.00", "active": false}'
    fi
}

# Get summary for manifest update
# Usage: cost_get_summary <project-path>
# Returns: {"totalCost": "X.XX", "inputTokens": N, "outputTokens": N}
cost_get_summary() {
    local project_path="${1:-}"

    if [[ -z "$project_path" ]]; then
        echo '{"totalCost": "0.00", "inputTokens": 0, "outputTokens": 0, "currency": "USD"}'
        return 0
    fi

    if ! cost_check_jq; then
        echo '{"totalCost": "0.00", "inputTokens": 0, "outputTokens": 0, "currency": "USD", "error": "jq not available"}'
        return 1
    fi

    local cost
    cost=$(cost_get_project_cost "$project_path")

    local input=$(echo "$cost" | jq -r '.inputTokens // .input // 0')
    local output=$(echo "$cost" | jq -r '.outputTokens // .output // 0')
    local total=$(echo "$cost" | jq -r '.totalCost // .cost_usd // "0.00"')

    cat << EOF
{
  "totalCost": "$total",
  "inputTokens": $input,
  "outputTokens": $output,
  "currency": "USD"
}
EOF
}

# Pretty print cost summary
# Usage: cost_print_summary <project-path>
cost_print_summary() {
    local project_path="${1:-}"

    echo "═══════════════════════════════════════════════════════════════"
    echo "COST SUMMARY"
    echo "═══════════════════════════════════════════════════════════════"

    if [[ -z "$project_path" ]]; then
        echo "Error: project_path required"
        return 1
    fi

    if ! cost_check_ccusage; then
        echo "Warning: ccusage not available. Install with: npm install -g ccusage"
        return 1
    fi

    if ! cost_check_jq; then
        echo "Warning: jq not available. Install jq for JSON parsing."
        return 1
    fi

    local cost
    cost=$(cost_get_project_cost "$project_path")

    local input=$(echo "$cost" | jq -r '.inputTokens // .input // 0')
    local output=$(echo "$cost" | jq -r '.outputTokens // .output // 0')
    local total=$(echo "$cost" | jq -r '.totalCost // .cost_usd // "0.00"')
    local sessions=$(echo "$cost" | jq -r '.sessions // 0')

    echo "Project: $(basename "$project_path")"
    echo ""
    echo "Tokens:"
    echo "  Input:  $(tokens_format $input)"
    echo "  Output: $(tokens_format $output)"
    echo ""
    echo "Cost:     $(cost_format $total)"
    echo "Sessions: $sessions"
    echo "═══════════════════════════════════════════════════════════════"
}
