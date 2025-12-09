#!/bin/bash
# Context Management System
# Prevents context exhaustion through periodic summarization
# Version: 5.0.7

CONTEXT_MANAGER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$CONTEXT_MANAGER_DIR/common.sh"

# Trigger summarization command via input injection
trigger_summarization() {
    local project_dir="$1"
    local phase="$2"
    local epic_id="$3"
    local input_file="$project_dir/.pipeline/input"

    log_info "Triggering context summarization for phase $phase, epic $epic_id"

    cat > "$input_file" <<'EOF'
CONTEXT SUMMARY REQUEST:

Please provide a brief progress summary (3-5 lines):
1. What you've completed in this batch
2. Current test status (passing/failing counts)
3. Next immediate action

After summary, continue with remaining work.
EOF

    log_debug "Summarization request injected to $input_file"
}

# Check if summarization is needed based on message count
check_summarization_needed() {
    local session_jsonl="$1"
    local last_summary_count="${2:-0}"
    local threshold="${CONTEXT_SUMMARY_THRESHOLD:-30}"

    if [[ ! -f "$session_jsonl" ]]; then
        return 1
    fi

    local current_count=$(wc -l < "$session_jsonl")
    local messages_since_summary=$((current_count - last_summary_count))

    if [[ $messages_since_summary -ge $threshold ]]; then
        log_debug "Context summarization needed: $messages_since_summary messages (threshold: $threshold)"
        return 0
    fi

    return 1
}

# Monitor session and trigger summarization when needed
monitor_context() {
    local project_dir="$1"
    local phase="$2"
    local epic_id="$3"
    local session_id="$4"

    local session_jsonl
    session_jsonl=$("$CONTEXT_MANAGER_DIR/find-session.sh" --project "$project_dir" --session-id "$session_id" --jsonl-only)

    if [[ -z "$session_jsonl" ]]; then
        log_warn "Could not find session JSONL for monitoring"
        return 1
    fi

    local last_summary_count=0
    local summary_trigger_file="$project_dir/.pipeline/context-summary-trigger"

    if [[ -f "$summary_trigger_file" ]]; then
        last_summary_count=$(cat "$summary_trigger_file")
    fi

    while true; do
        sleep 30

        if [[ -f "$project_dir/.pipeline/stop-transcript" ]]; then
            break
        fi

        if check_summarization_needed "$session_jsonl" "$last_summary_count"; then
            trigger_summarization "$project_dir" "$phase" "$epic_id"

            local current_count=$(wc -l < "$session_jsonl")
            echo "$current_count" > "$summary_trigger_file"
            last_summary_count=$current_count

            log_info "Context summary triggered at message count: $current_count"
        fi
    done
}

# Add summarization guidance to intelligence context
add_summarization_guidance() {
    local intelligence_context="$1"

    cat >> "$intelligence_context" <<'EOF'

## Context Management

**Periodic Summarization (Cost Optimization):**

When you receive a "CONTEXT SUMMARY REQUEST", provide a brief 3-5 line summary:
1. What you've completed in current batch
2. Current test status (X passing, Y failing)
3. Next immediate action

**Purpose:** Reduces context size, prevents exhaustion, lowers cost.

**After summary:** Continue with remaining work immediately.

**Format:**
```
PROGRESS SUMMARY:
- Completed: [what's done]
- Tests: [X passing, Y failing]
- Next: [immediate action]
```

EOF
}

# Initialize context management for a step
init_context_management() {
    local project_dir="$1"

    rm -f "$project_dir/.pipeline/context-summary-trigger"

    local intelligence_context="$project_dir/.pipeline/intelligence-context.md"
    if [[ -f "$intelligence_context" ]]; then
        add_summarization_guidance "$intelligence_context"
    fi
}

export CONTEXT_SUMMARY_THRESHOLD=30
