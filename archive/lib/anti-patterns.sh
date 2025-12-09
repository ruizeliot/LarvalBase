#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# ANTI-PATTERNS LIBRARY
# Track patterns that consistently fail - warn Claude to avoid them
# ═══════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANTI_PATTERNS_DIR="${ANTI_PATTERNS_DIR:-$HOME/.pipeline/anti-patterns}"
ANTI_PATTERNS_INDEX="${ANTI_PATTERNS_DIR}/index.json"

# Initialize anti-patterns directory
init_anti_patterns() {
    mkdir -p "$ANTI_PATTERNS_DIR"

    if [[ ! -f "$ANTI_PATTERNS_INDEX" ]]; then
        cat > "$ANTI_PATTERNS_INDEX" << 'EOF'
{
  "patterns": [],
  "last_updated": null,
  "total_failures_tracked": 0
}
EOF
    fi
}

# Record a failure pattern
# Usage: record_failure <pattern_id> <description> <context> <impact>
record_failure() {
    local pattern_id="$1"
    local description="$2"
    local context="$3"
    local impact="${4:-medium}"  # low, medium, high, critical

    init_anti_patterns

    local timestamp=$(date -Iseconds)

    # Check if pattern already exists
    local existing=$(jq --arg pid "$pattern_id" '.patterns[] | select(.id == $pid)' "$ANTI_PATTERNS_INDEX")

    if [[ -n "$existing" ]]; then
        # Update existing pattern
        jq --arg pid "$pattern_id" \
           --arg ctx "$context" \
           --arg ts "$timestamp" \
           '
           .patterns = [.patterns[] |
             if .id == $pid then
               .occurrences += [{context: $ctx, timestamp: $ts}] |
               .failure_count += 1 |
               .last_seen = $ts
             else . end
           ] |
           .last_updated = $ts |
           .total_failures_tracked += 1
           ' "$ANTI_PATTERNS_INDEX" > "${ANTI_PATTERNS_INDEX}.tmp" && \
           mv "${ANTI_PATTERNS_INDEX}.tmp" "$ANTI_PATTERNS_INDEX"
    else
        # Add new pattern
        jq --arg pid "$pattern_id" \
           --arg desc "$description" \
           --arg ctx "$context" \
           --arg impact "$impact" \
           --arg ts "$timestamp" \
           '
           .patterns += [{
             id: $pid,
             description: $desc,
             impact: $impact,
             failure_count: 1,
             first_seen: $ts,
             last_seen: $ts,
             occurrences: [{context: $ctx, timestamp: $ts}],
             mitigation: null
           }] |
           .last_updated = $ts |
           .total_failures_tracked += 1
           ' "$ANTI_PATTERNS_INDEX" > "${ANTI_PATTERNS_INDEX}.tmp" && \
           mv "${ANTI_PATTERNS_INDEX}.tmp" "$ANTI_PATTERNS_INDEX"
    fi

    echo "Recorded failure: $pattern_id"
}

# Add mitigation advice for a pattern
# Usage: add_mitigation <pattern_id> <mitigation_advice>
add_mitigation() {
    local pattern_id="$1"
    local mitigation="$2"

    init_anti_patterns

    jq --arg pid "$pattern_id" \
       --arg mit "$mitigation" \
       '.patterns = [.patterns[] | if .id == $pid then .mitigation = $mit else . end]' \
       "$ANTI_PATTERNS_INDEX" > "${ANTI_PATTERNS_INDEX}.tmp" && \
       mv "${ANTI_PATTERNS_INDEX}.tmp" "$ANTI_PATTERNS_INDEX"
}

# Get anti-patterns relevant to a context
# Usage: get_relevant_anti_patterns <project_context>
get_relevant_anti_patterns() {
    local project_context="$1"

    init_anti_patterns

    local context_lower=$(echo "$project_context" | tr '[:upper:]' '[:lower:]')
    local relevant="[]"

    while IFS= read -r pattern; do
        [[ -z "$pattern" ]] && continue
        local pid=$(echo "$pattern" | jq -r '.id')
        local desc=$(echo "$pattern" | jq -r '.description' | tr '[:upper:]' '[:lower:]')

        # Check if pattern keywords appear in context
        # Extract keywords from pattern id and description
        local keywords=$(echo "$pid $desc" | tr '-' ' ' | tr '_' ' ')

        local matched=false
        for word in $keywords; do
            [[ ${#word} -lt 4 ]] && continue  # Skip short words
            if [[ "$context_lower" == *"$word"* ]]; then
                matched=true
                break
            fi
        done

        if $matched; then
            relevant=$(echo "$relevant" | jq --argjson p "$pattern" '. + [$p]')
        fi
    done < <(jq -c '.patterns[]' "$ANTI_PATTERNS_INDEX" 2>/dev/null)

    echo "$relevant"
}

# Get all critical anti-patterns (always warn about these)
get_critical_anti_patterns() {
    init_anti_patterns

    jq '[.patterns[] | select(.impact == "critical" or .failure_count >= 3)]' "$ANTI_PATTERNS_INDEX"
}

# Format anti-patterns for injection into prompts
# Usage: format_anti_patterns_for_prompt <anti_patterns_json>
format_anti_patterns_for_prompt() {
    local patterns_json="$1"

    local count=$(echo "$patterns_json" | jq 'length')

    if [[ "$count" -eq 0 ]]; then
        echo ""
        return
    fi

    local output="
## ⚠️ ANTI-PATTERNS TO AVOID

These patterns have failed in past projects. DO NOT use them:

"

    while IFS= read -r pattern; do
        local pid=$(echo "$pattern" | jq -r '.id')
        local desc=$(echo "$pattern" | jq -r '.description')
        local impact=$(echo "$pattern" | jq -r '.impact')
        local failures=$(echo "$pattern" | jq -r '.failure_count')
        local mitigation=$(echo "$pattern" | jq -r '.mitigation // "No mitigation documented"')

        local icon="⚠️"
        [[ "$impact" == "critical" ]] && icon="🚫"
        [[ "$impact" == "high" ]] && icon="❌"

        output+="$icon **$pid** (failed $failures times, impact: $impact)
   $desc
   **Instead:** $mitigation

"
    done < <(echo "$patterns_json" | jq -c '.[]')

    echo "$output"
}

# Auto-detect failures from analysis
# Usage: detect_failures_from_analysis <analysis_json_file>
detect_failures_from_analysis() {
    local analysis_file="$1"

    if [[ ! -f "$analysis_file" ]]; then
        return
    fi

    # Extract critical failures
    while IFS= read -r failure; do
        [[ -z "$failure" ]] && continue

        # Generate pattern ID from failure description
        local pattern_id=$(echo "$failure" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | sed 's/[^a-z0-9-]//g' | cut -c1-50)

        record_failure "$pattern_id" "$failure" "$(basename "$analysis_file")" "medium"
    done < <(jq -r '.critical_failures[]? // empty' "$analysis_file" 2>/dev/null)

    # Extract quality issues marked as problems
    while IFS= read -r issue; do
        [[ -z "$issue" ]] && continue
        local issue_text=$(echo "$issue" | jq -r '.issue // empty')
        [[ -z "$issue_text" ]] && continue

        local priority=$(echo "$issue" | jq -r '.priority // "medium"')
        [[ "$priority" != "high" ]] && continue  # Only track high priority issues

        local pattern_id=$(echo "$issue_text" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | sed 's/[^a-z0-9-]//g' | cut -c1-50)

        record_failure "$pattern_id" "$issue_text" "$(basename "$analysis_file")" "medium"
    done < <(jq -c '.optimizations.quality[]?' "$analysis_file" 2>/dev/null)
}

# List all anti-patterns
list_anti_patterns() {
    init_anti_patterns

    echo ""
    echo "Anti-Patterns Library"
    echo "====================="
    echo ""

    local count=$(jq '.patterns | length' "$ANTI_PATTERNS_INDEX")

    if [[ "$count" -eq 0 ]]; then
        echo "No anti-patterns recorded yet."
        echo "Anti-patterns are automatically detected from failed analyses."
        return
    fi

    jq -r '.patterns | sort_by(-.failure_count) | .[] |
        "[\(.impact | ascii_upcase)] \(.id)\n  Failures: \(.failure_count) | Last: \(.last_seen)\n  \(.description)\n"' \
        "$ANTI_PATTERNS_INDEX"

    echo ""
    echo "Total: $count anti-pattern(s)"
}

# Clear an anti-pattern (when it's been fixed)
# Usage: clear_anti_pattern <pattern_id>
clear_anti_pattern() {
    local pattern_id="$1"

    init_anti_patterns

    jq --arg pid "$pattern_id" \
       '.patterns = [.patterns[] | select(.id != $pid)]' \
       "$ANTI_PATTERNS_INDEX" > "${ANTI_PATTERNS_INDEX}.tmp" && \
       mv "${ANTI_PATTERNS_INDEX}.tmp" "$ANTI_PATTERNS_INDEX"

    echo "Cleared anti-pattern: $pattern_id"
}
