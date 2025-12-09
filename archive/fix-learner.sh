#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# FIX LEARNER
# Capture human corrections to Claude's mistakes - learn from fixes
# ═══════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LEARNINGS_DIR="${LEARNINGS_DIR:-$HOME/.pipeline/learnings}"
LEARNINGS_FILE="${LEARNINGS_DIR}/human-fixes.json"
GUIDELINES_FILE="${LEARNINGS_DIR}/guidelines.md"

# Initialize learnings directory
init_learnings() {
    mkdir -p "$LEARNINGS_DIR"

    if [[ ! -f "$LEARNINGS_FILE" ]]; then
        cat > "$LEARNINGS_FILE" << 'EOF'
{
  "fixes": [],
  "patterns": {},
  "last_updated": null
}
EOF
    fi

    if [[ ! -f "$GUIDELINES_FILE" ]]; then
        cat > "$GUIDELINES_FILE" << 'EOF'
# Learned Guidelines

Guidelines derived from human corrections to Claude's work.

## Categories

EOF
    fi
}

# Record a human fix
# Usage: record_fix <category> <what_claude_did> <what_human_fixed> <lesson>
record_fix() {
    local category="$1"       # e.g., validation, architecture, testing
    local claude_did="$2"     # What Claude originally did
    local human_fixed="$3"    # What the human corrected
    local lesson="$4"         # The lesson learned

    init_learnings

    local timestamp=$(date -Iseconds)
    local fix_id="fix-$(date +%s)"

    jq --arg fid "$fix_id" \
       --arg cat "$category" \
       --arg claude "$claude_did" \
       --arg human "$human_fixed" \
       --arg lesson "$lesson" \
       --arg ts "$timestamp" \
       '
       .fixes += [{
         id: $fid,
         category: $cat,
         claude_did: $claude,
         human_fixed: $human,
         lesson: $lesson,
         timestamp: $ts,
         applied_count: 0
       }] |
       .patterns[$cat] = ((.patterns[$cat] // 0) + 1) |
       .last_updated = $ts
       ' "$LEARNINGS_FILE" > "${LEARNINGS_FILE}.tmp" && \
       mv "${LEARNINGS_FILE}.tmp" "$LEARNINGS_FILE"

    # Update guidelines
    update_guidelines "$category" "$lesson"

    echo "Recorded fix: $fix_id"
}

# Update guidelines markdown file
update_guidelines() {
    local category="$1"
    local lesson="$2"

    local timestamp=$(date "+%Y-%m-%d")

    # Check if category section exists
    if ! grep -q "^### $category" "$GUIDELINES_FILE"; then
        echo "" >> "$GUIDELINES_FILE"
        echo "### $category" >> "$GUIDELINES_FILE"
        echo "" >> "$GUIDELINES_FILE"
    fi

    # Add lesson under category
    sed -i "/^### $category/a - $lesson [$timestamp]" "$GUIDELINES_FILE"
}

# Auto-detect fixes from git diff
# Usage: detect_fixes_from_diff <project_path>
detect_fixes_from_diff() {
    local project_path="$1"

    cd "$project_path" || return

    # Get recent commits by human (not Claude)
    local human_commits=$(git log --oneline -20 --author-not="Claude" --author-not="claude" 2>/dev/null | head -5)

    if [[ -z "$human_commits" ]]; then
        return
    fi

    # For each human commit, analyze what was changed
    while IFS= read -r commit_line; do
        local commit_hash=$(echo "$commit_line" | cut -d' ' -f1)
        local commit_msg=$(echo "$commit_line" | cut -d' ' -f2-)

        # Get the diff
        local diff=$(git show "$commit_hash" --stat 2>/dev/null)

        # Use Claude to analyze if this looks like a fix
        local analysis_prompt="Analyze this git commit. Is it fixing a mistake that an AI might have made?

COMMIT MESSAGE: $commit_msg

FILES CHANGED:
$diff

If this is a fix to an AI mistake, respond with JSON:
{
  \"is_fix\": true,
  \"category\": \"validation|architecture|testing|security|performance|other\",
  \"what_was_wrong\": \"description\",
  \"what_was_fixed\": \"description\",
  \"lesson\": \"guideline for future\"
}

If not a fix, respond: {\"is_fix\": false}"

        local result=$(claude --model haiku --print -p "$analysis_prompt" 2>&1 || true)

        # Parse result
        local is_fix=$(echo "$result" | jq -r '.is_fix // false' 2>/dev/null)

        if [[ "$is_fix" == "true" ]]; then
            local category=$(echo "$result" | jq -r '.category // "other"')
            local what_wrong=$(echo "$result" | jq -r '.what_was_wrong // ""')
            local what_fixed=$(echo "$result" | jq -r '.what_was_fixed // ""')
            local lesson=$(echo "$result" | jq -r '.lesson // ""')

            if [[ -n "$lesson" ]]; then
                record_fix "$category" "$what_wrong" "$what_fixed" "$lesson"
            fi
        fi
    done <<< "$human_commits"

    cd - > /dev/null
}

# Get learnings for a category
# Usage: get_learnings <category>
get_learnings() {
    local category="$1"

    init_learnings

    jq --arg cat "$category" '[.fixes[] | select(.category == $cat)] | sort_by(-.timestamp)' "$LEARNINGS_FILE"
}

# Get all learnings formatted for prompt
get_all_learnings_for_prompt() {
    init_learnings

    local total=$(jq '.fixes | length' "$LEARNINGS_FILE")

    if [[ "$total" -eq 0 ]]; then
        return
    fi

    local output="
## 📚 LEARNED GUIDELINES (from human corrections)

These guidelines are derived from past corrections. Follow them:

"

    # Group by category
    local categories=$(jq -r '.fixes | map(.category) | unique | .[]' "$LEARNINGS_FILE")

    for category in $categories; do
        output+="### $category
"
        while IFS= read -r lesson; do
            [[ -z "$lesson" ]] && continue
            output+="- $lesson
"
        done < <(jq -r --arg cat "$category" '.fixes[] | select(.category == $cat) | .lesson' "$LEARNINGS_FILE" | sort -u)
        output+="
"
    done

    echo "$output"
}

# Mark a learning as applied (for tracking effectiveness)
mark_learning_applied() {
    local fix_id="$1"

    init_learnings

    jq --arg fid "$fix_id" \
       '.fixes = [.fixes[] | if .id == $fid then .applied_count += 1 else . end]' \
       "$LEARNINGS_FILE" > "${LEARNINGS_FILE}.tmp" && \
       mv "${LEARNINGS_FILE}.tmp" "$LEARNINGS_FILE"
}

# Display learnings summary
display_learnings() {
    init_learnings

    echo ""
    echo "Human Fix Learnings"
    echo "==================="
    echo ""

    local total=$(jq '.fixes | length' "$LEARNINGS_FILE")

    if [[ "$total" -eq 0 ]]; then
        echo "No human fixes recorded yet."
        echo ""
        echo "Record fixes with:"
        echo "  ./pipeline learn <category> <what_claude_did> <what_human_fixed> <lesson>"
        return
    fi

    echo "Fixes by Category:"
    jq -r '.patterns | to_entries | sort_by(-.value) | .[] | "  \(.key): \(.value) fix(es)"' "$LEARNINGS_FILE"

    echo ""
    echo "Recent Lessons:"
    jq -r '.fixes | sort_by(-.timestamp) | .[0:5] | .[] | "  [\(.category)] \(.lesson)"' "$LEARNINGS_FILE"

    echo ""
    echo "Total: $total recorded fix(es)"
    echo ""
    echo "View guidelines: cat $GUIDELINES_FILE"
}

# Interactive: Record a fix from user input
interactive_record_fix() {
    echo ""
    echo "Record Human Fix"
    echo "================"
    echo ""

    read -p "Category (validation/architecture/testing/security/performance/other): " category
    category="${category:-other}"

    read -p "What did Claude do wrong? " claude_did

    read -p "What did you fix? " human_fixed

    read -p "What's the lesson for next time? " lesson

    if [[ -n "$lesson" ]]; then
        record_fix "$category" "$claude_did" "$human_fixed" "$lesson"
        echo ""
        echo "✓ Fix recorded and added to guidelines"
    else
        echo "Cancelled - no lesson provided"
    fi
}
