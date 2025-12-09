#!/bin/bash
# Shared transcript cleaning functions for pipeline v4.2
# Source this file: source "$(dirname "$0")/lib/transcript.sh"

# Clean raw Claude CLI output to readable transcript format
# Usage: echo "$output" | clean_transcript
# Or with stop marker: clean_transcript_with_stop "$STOP_MARKER_FILE"
clean_transcript() {
    stdbuf -oL sed -E 's/\x1b\[[0-9;]*[a-zA-Z]//g; s/\x1b\[[0-9;]*m//g; s/\x1b\[\?[0-9]+[hl]//g; s/\x1b\][0-9;]*[^\x07]*(\x07|$)//g; s/\]9;[0-9;]*//g' | \
      stdbuf -oL tr -d '\r\302\240' | \
      stdbuf -oL grep -v "^spawn claude" | \
      stdbuf -oL grep -v "▐▛███▜▌" | \
      stdbuf -oL grep -v "▝▜█████▛" | \
      stdbuf -oL grep -v "▘▘ ▝▝" | \
      stdbuf -oL grep -v "Claude Code v" | \
      stdbuf -oL grep -v "Welcome back" | \
      stdbuf -oL grep -v "Tips for getting" | \
      stdbuf -oL grep -v "Recent activity" | \
      stdbuf -oL grep -v "No recent activity" | \
      stdbuf -oL grep -v "Run /init" | \
      stdbuf -oL grep -v "Run /install" | \
      stdbuf -oL grep -v "Claude Max" | \
      stdbuf -oL grep -v "Opus 4" | \
      stdbuf -oL grep -v "Sonnet 4" | \
      stdbuf -oL grep -v "bypass permissions" | \
      stdbuf -oL grep -v "esc to interrupt" | \
      stdbuf -oL grep -v "tab to toggle" | \
      stdbuf -oL grep -v "shift+tab" | \
      stdbuf -oL grep -v "^>.*Try" | \
      stdbuf -oL grep -v "^> $" | \
      stdbuf -oL grep -v "^>$" | \
      stdbuf -oL grep -v "^──" | \
      stdbuf -oL grep -v "^[╭╰│├┼╮╯]" | \
      stdbuf -oL grep -v "Goodbye!" | \
      stdbuf -oL grep -v "is running…" | \
      stdbuf -oL grep -v "MCP server" | \
      stdbuf -oL grep -v "ctrl+o to" | \
      stdbuf -oL grep -v "ctrl+t to" | \
      stdbuf -oL grep -v "ctrl+g to" | \
      stdbuf -oL grep -v "Context left" | \
      stdbuf -oL grep -v "^Script started" | \
      stdbuf -oL grep -v "^Script done" | \
      stdbuf -oL grep -v "^═" | \
      stdbuf -oL grep -v "Tip: " | \
      stdbuf -oL grep -v "]0;" | \
      stdbuf -oL grep -v "Phase 0" | \
      stdbuf -oL grep -v "(user)$" | \
      stdbuf -oL grep -v "(project)$" | \
      stdbuf -oL grep -v "^  /" | \
      stdbuf -oL grep -v "ctrl-g to" | \
      stdbuf -oL grep -v "expect:" | \
      stdbuf -oL grep -v "while executing" | \
      stdbuf -oL grep -v "spawn id" | \
      stdbuf -oL grep -v "^\"expect" | \
      stdbuf -oL grep -v "write_status" | \
      stdbuf -oL grep -v "file \"/tmp" | \
      stdbuf -oL grep -v "PIPELINE:COMPLETE" | \
      stdbuf -oL grep -v "PIPELINE:FAILED" | \
      stdbuf -oL grep -v 'send "' | \
      stdbuf -oL grep -v "sleep [0-9]" | \
      stdbuf -oL grep -v "limits are hit" | \
      stdbuf -oL grep -v "text search" | \
      stdbuf -oL grep -v "episodic-memory" | \
      stdbuf -oL grep -v "Claude's memory" | \
      stdbuf -oL grep -v "Catch you" | \
      stdbuf -oL grep -v "See you" | \
      stdbuf -oL grep -v "Later!" | \
      stdbuf -oL grep -v "⎿" | \
      stdbuf -oL awk '
        {
          if (/^[[:space:]]*$/) { next }
          if (/^>/) {
            sub(/^>/, "")
            gsub(/^[[:space:]]+|[[:space:]]+$/, "")
            if (length($0) > 0 && $0 != last_user) {
              print "\n**User:** " $0 "\n"
              last_user = $0
            }
          }
          else if (/^●/) {
            sub(/^●[[:space:]]*/, "")
            if (!seen[$0]++) { print "**AI:** " $0 }
          }
          else if (/^  /) {
            if (!seen[$0]++) { print $0 }
          }
          else if (!seen[$0]++) { print $0 }
        }
      '
}

# Clean transcript with stop marker support
# Usage: clean_transcript_with_stop "/path/to/stop_marker" < input
# Stops reading when stop marker file exists
clean_transcript_with_stop() {
    local stop_marker="$1"
    while IFS= read -r line; do
        [ -f "$stop_marker" ] && break
        printf '%s\n' "$line"
    done | clean_transcript
}

# Write transcript header
# Usage: write_transcript_header "$TRANSCRIPT" "$STEP" "$PROJECT_PATH" "$RUN_ID"
write_transcript_header() {
    local transcript="$1"
    local step="$2"
    local project_path="$3"
    local run_id="${4:-}"
    local start_iso=$(date -Iseconds)

    cat > "$transcript" << EOF
# Step Transcript: $step

**Started:** $start_iso
**Project:** $project_path
${run_id:+**Run ID:** $run_id}

---

## Conversation

EOF
}

# Write transcript footer with timing
# Usage: write_transcript_footer "$TRANSCRIPT" "$START_TIME" "$STATUS"
write_transcript_footer() {
    local transcript="$1"
    local start_time="$2"
    local status="${3:-unknown}"

    local end_time=$(date +%s)
    local end_iso=$(date -Iseconds)
    local duration=$((end_time - start_time))

    echo "" >> "$transcript"
    echo "---" >> "$transcript"
    echo "" >> "$transcript"
    echo "**Ended:** $end_iso" >> "$transcript"
    echo "**Duration:** ${duration}s" >> "$transcript"
    echo "**Status:** $status" >> "$transcript"
}

# Append manifest state to transcript
# Usage: append_manifest_state "$TRANSCRIPT" "$MANIFEST_FILE" "$EPIC"
append_manifest_state() {
    local transcript="$1"
    local manifest_file="$2"
    local epic="${3:-}"

    if [ -f "$manifest_file" ]; then
        echo "" >> "$transcript"
        echo "### Manifest State" >> "$transcript"
        echo "" >> "$transcript"

        local current_epic=$(jq -r '.currentEpic // "N/A"' "$manifest_file")
        local total_epics=$(jq -r '.epics | length // "N/A"' "$manifest_file")
        local completed_epics=$(jq '[.epics[] | select(.status == "complete")] | length' "$manifest_file")
        local manifest_status=$(jq -r '.status // "unknown"' "$manifest_file")

        echo "- **Current Epic:** $current_epic" >> "$transcript"
        echo "- **Completed Epics:** $completed_epics / $total_epics" >> "$transcript"
        echo "- **Project Status:** $manifest_status" >> "$transcript"

        if [ -n "$epic" ]; then
            local epic_name=$(jq -r ".epics[] | select(.id == $epic) | .name // \"Epic $epic\"" "$manifest_file")
            local epic_status=$(jq -r ".epics[] | select(.id == $epic) | .status // \"unknown\"" "$manifest_file")
            echo "- **This Transcript Epic:** $epic_name (status: $epic_status)" >> "$transcript"
        fi
    fi
}

# ============================================================================
# JSONL-based transcript generation (v4.3+)
# ============================================================================

# Generate transcript from JSONL session file
# Usage: generate_transcript_from_jsonl "$SESSION_ID" "$OUTPUT_FILE" [--include-tools]
# Returns 0 on success, 1 if session not found
generate_transcript_from_jsonl() {
    local session_id="$1"
    local output_file="$2"
    local include_tools="${3:-}"

    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local jsonl_file

    # Find the JSONL file
    jsonl_file=$("$script_dir/find-session.sh" --session "$session_id" 2>/dev/null)
    if [[ $? -ne 0 ]] || [[ -z "$jsonl_file" ]]; then
        echo "Warning: Could not find JSONL for session $session_id" >&2
        return 1
    fi

    # Generate transcript
    local opts=""
    [[ "$include_tools" == "--include-tools" ]] && opts="--include-tools"

    "$script_dir/jsonl-to-transcript.sh" "$jsonl_file" $opts > "$output_file"
    return $?
}

# Generate transcript from project's most recent session
# Usage: generate_transcript_from_latest "$PROJECT_PATH" "$OUTPUT_FILE" [--include-tools]
generate_transcript_from_latest() {
    local project_path="$1"
    local output_file="$2"
    local include_tools="${3:-}"

    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local jsonl_file

    # Find the most recent JSONL file
    jsonl_file=$("$script_dir/find-session.sh" --latest "$project_path" 2>/dev/null)
    if [[ $? -ne 0 ]] || [[ -z "$jsonl_file" ]]; then
        echo "Warning: Could not find sessions for $project_path" >&2
        return 1
    fi

    # Generate transcript
    local opts=""
    [[ "$include_tools" == "--include-tools" ]] && opts="--include-tools"

    "$script_dir/jsonl-to-transcript.sh" "$jsonl_file" $opts > "$output_file"
    return $?
}

# ============================================================================
# Transcript validation (v5.0.15+)
# ============================================================================

# Validate transcript content quality
# Usage: validate_transcript "$TRANSCRIPT_FILE"
# Returns 0 if valid, 1 if corrupted/empty
validate_transcript() {
    local transcript="$1"

    # Check if file exists
    [[ ! -f "$transcript" ]] && return 1

    # Check minimum size (at least 100 bytes)
    local size=$(stat -f%z "$transcript" 2>/dev/null || stat -c%s "$transcript" 2>/dev/null)
    [[ $size -lt 100 ]] && return 1

    # Check for essential content markers
    local has_user=0
    local has_assistant=0
    local has_content=0

    # Look for user messages (terminal or JSONL format)
    grep -q "^\*\*User:\*\*\|^## User" "$transcript" && has_user=1

    # Look for assistant messages (terminal or JSONL format)
    grep -q "^\*\*AI:\*\*\|^## Claude" "$transcript" && has_assistant=1
    # Look for user messages (terminal or JSONL format)
    grep -q "^\*\*User:\*\*\|^## User" "$transcript" && has_user=1

    # Look for assistant messages (terminal or JSONL format)
    grep -q "^\*\*AI:\*\*\|^## Claude" "$transcript" && has_assistant=1
    # Look for user messages (terminal or JSONL format)
    grep -q "^\*\*User:\*\*\|^## User" "$transcript" && has_user=1

    # Look for assistant messages (terminal or JSONL format)
    grep -q "^\*\*AI:\*\*\|^## Claude" "$transcript" && has_assistant=1
    # Look for user messages (terminal or JSONL format)
    grep -q "^\*\*User:\*\*\|^## User" "$transcript" && has_user=1

    # Look for assistant messages (terminal or JSONL format)
    grep -q "^\*\*AI:\*\*\|^## Claude" "$transcript" && has_assistant=1

    # Check for substantial content (more than just headers)
    local content_lines=$(grep -v "^#" "$transcript" | grep -v "^\*\*" | grep -v "^---" | grep -v "^$" | wc -l)
    [[ $content_lines -gt 5 ]] && has_content=1

    # Valid if has user input and assistant responses and content
    [[ $has_user -eq 1 && $has_assistant -eq 1 && $has_content -eq 1 ]] && return 0

    return 1
}

# Report transcript validation issues
# Usage: report_transcript_issues "$TRANSCRIPT_FILE"
report_transcript_issues() {
    local transcript="$1"

    echo ""
    echo "⚠️  TRANSCRIPT VALIDATION FAILED"
    echo ""

    if [[ ! -f "$transcript" ]]; then
        echo "  - File does not exist"
        return
    fi

    local size=$(stat -f%z "$transcript" 2>/dev/null || stat -c%s "$transcript" 2>/dev/null)
    echo "  - File size: $size bytes"

    if [[ $size -lt 100 ]]; then
        echo "  - File is too small (< 100 bytes)"
    fi

    # Check for user messages (terminal or JSONL format)
    if ! grep -q "^\*\*User:\*\*\|^## User" "$transcript"; then
        echo "  - Missing user messages"
    fi

    # Check for assistant messages (terminal or JSONL format)
    if ! grep -q "^\*\*AI:\*\*\|^## Claude" "$transcript"; then
        echo "  - Missing assistant messages"
    fi

    echo ""
    echo "  This may indicate:"
    echo "    - Session crashed before producing output"
    echo "    - Expect script failed to capture output"
    echo "    - Terminal output was corrupted"
    echo ""
    echo "  Transcript saved at: $transcript"
    echo "  Review manually to determine if session needs to be re-run"
    echo ""
}
