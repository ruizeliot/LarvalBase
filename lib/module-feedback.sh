#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# MODULE FEEDBACK SYSTEM
# Track outcomes when modules are used - improve module scores
# ═══════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODULES_DIR="${MODULES_DIR:-$HOME/.pipeline/modules}"
FEEDBACK_FILE="${MODULES_DIR}/feedback-history.json"

# Initialize feedback file
init_feedback() {
    mkdir -p "$MODULES_DIR"

    if [[ ! -f "$FEEDBACK_FILE" ]]; then
        cat > "$FEEDBACK_FILE" << 'EOF'
{
  "usage_records": [],
  "module_scores": {},
  "last_updated": null
}
EOF
    fi
}

# Record module usage at start of project
# Usage: record_module_usage <project_path> <module_id> <step>
record_module_usage() {
    local project_path="$1"
    local module_id="$2"
    local step="$3"

    init_feedback

    local project_name=$(basename "$project_path")
    local timestamp=$(date -Iseconds)
    local usage_id="${project_name}-${module_id}-$(date +%s)"

    jq --arg uid "$usage_id" \
       --arg proj "$project_name" \
       --arg path "$project_path" \
       --arg mid "$module_id" \
       --arg step "$step" \
       --arg ts "$timestamp" \
       '
       .usage_records += [{
         id: $uid,
         project: $proj,
         project_path: $path,
         module_id: $mid,
         step: $step,
         started_at: $ts,
         completed_at: null,
         outcome: null,
         quality_before: null,
         quality_after: null,
         issues: [],
         feedback: null
       }] |
       .last_updated = $ts
       ' "$FEEDBACK_FILE" > "${FEEDBACK_FILE}.tmp" && \
       mv "${FEEDBACK_FILE}.tmp" "$FEEDBACK_FILE"

    echo "$usage_id"
}

# Record outcome after step/project completion
# Usage: record_outcome <usage_id> <outcome> <quality_score> [issues_json]
record_outcome() {
    local usage_id="$1"
    local outcome="$2"  # success, partial, failed
    local quality_score="$3"
    local issues_json="${4:-[]}"

    init_feedback

    local timestamp=$(date -Iseconds)

    jq --arg uid "$usage_id" \
       --arg outcome "$outcome" \
       --arg quality "$quality_score" \
       --argjson issues "$issues_json" \
       --arg ts "$timestamp" \
       '
       .usage_records = [.usage_records[] |
         if .id == $uid then
           .completed_at = $ts |
           .outcome = $outcome |
           .quality_after = ($quality | tonumber) |
           .issues = $issues
         else . end
       ] |
       .last_updated = $ts
       ' "$FEEDBACK_FILE" > "${FEEDBACK_FILE}.tmp" && \
       mv "${FEEDBACK_FILE}.tmp" "$FEEDBACK_FILE"

    # Update module score based on outcome
    update_module_score "$usage_id"
}

# Update module score based on usage outcome
update_module_score() {
    local usage_id="$1"

    local record=$(jq --arg uid "$usage_id" '.usage_records[] | select(.id == $uid)' "$FEEDBACK_FILE")
    [[ -z "$record" ]] && return

    local module_id=$(echo "$record" | jq -r '.module_id')
    local outcome=$(echo "$record" | jq -r '.outcome')
    local quality=$(echo "$record" | jq -r '.quality_after // 0')

    # Calculate score adjustment
    local adjustment=0
    case "$outcome" in
        success)
            adjustment=5
            [[ "$quality" -ge 90 ]] && adjustment=10
            ;;
        partial)
            adjustment=0
            ;;
        failed)
            adjustment=-5
            [[ "$quality" -lt 50 ]] && adjustment=-10
            ;;
    esac

    # Update score
    jq --arg mid "$module_id" \
       --arg adj "$adjustment" \
       --arg quality "$quality" \
       '
       .module_scores[$mid] = (
         (.module_scores[$mid] // {score: 50, usages: 0, avg_quality: 0}) |
         .usages += 1 |
         .avg_quality = (((.avg_quality * (.usages - 1)) + ($quality | tonumber)) / .usages) |
         .score = ([0, [100, (.score + ($adj | tonumber))] | min] | max)
       )
       ' "$FEEDBACK_FILE" > "${FEEDBACK_FILE}.tmp" && \
       mv "${FEEDBACK_FILE}.tmp" "$FEEDBACK_FILE"
}

# Get module effectiveness score
# Usage: get_module_score <module_id>
get_module_score() {
    local module_id="$1"

    init_feedback

    jq --arg mid "$module_id" '.module_scores[$mid] // {score: 50, usages: 0, avg_quality: 0}' "$FEEDBACK_FILE"
}

# Get all module scores sorted by effectiveness
get_all_scores() {
    init_feedback

    jq '.module_scores | to_entries | sort_by(-.value.score) | from_entries' "$FEEDBACK_FILE"
}

# Auto-record feedback from analysis
# Usage: auto_feedback_from_analysis <project_path> <analysis_file>
auto_feedback_from_analysis() {
    local project_path="$1"
    local analysis_file="$2"

    if [[ ! -f "$analysis_file" ]]; then
        return
    fi

    # Check if any modules were used in this project
    local manifest="$project_path/.pipeline/manifest.json"
    if [[ ! -f "$manifest" ]]; then
        return
    fi

    local modules_used=$(jq -r '.modules_used // [] | .[]' "$manifest" 2>/dev/null)
    [[ -z "$modules_used" ]] && return

    local quality_score=$(jq -r '.quality_score // 50' "$analysis_file")
    local issues=$(jq -c '.critical_failures // []' "$analysis_file")

    # Determine outcome
    local outcome="success"
    [[ "$quality_score" -lt 70 ]] && outcome="partial"
    [[ "$quality_score" -lt 50 ]] && outcome="failed"

    for module_id in $modules_used; do
        # Find usage record for this module
        local usage_id=$(jq -r --arg proj "$(basename "$project_path")" --arg mid "$module_id" \
            '.usage_records[] | select(.project == $proj and .module_id == $mid and .outcome == null) | .id' \
            "$FEEDBACK_FILE" | head -1)

        if [[ -n "$usage_id" ]]; then
            record_outcome "$usage_id" "$outcome" "$quality_score" "$issues"
        fi
    done
}

# Mark modules as used in manifest
# Usage: mark_modules_used <project_path> <module_ids...>
mark_modules_used() {
    local project_path="$1"
    shift
    local module_ids=("$@")

    local manifest="$project_path/.pipeline/manifest.json"
    if [[ ! -f "$manifest" ]]; then
        return
    fi

    local modules_json=$(printf '%s\n' "${module_ids[@]}" | jq -R . | jq -s .)

    jq --argjson mods "$modules_json" '.modules_used = ((.modules_used // []) + $mods | unique)' \
       "$manifest" > "${manifest}.tmp" && mv "${manifest}.tmp" "$manifest"
}

# Get usage history for a module
# Usage: get_module_history <module_id>
get_module_history() {
    local module_id="$1"

    init_feedback

    jq --arg mid "$module_id" '[.usage_records[] | select(.module_id == $mid)]' "$FEEDBACK_FILE"
}

# Display feedback summary
display_feedback_summary() {
    init_feedback

    echo ""
    echo "Module Effectiveness Summary"
    echo "============================"
    echo ""

    local scores=$(get_all_scores)
    local count=$(echo "$scores" | jq 'length')

    if [[ "$count" -eq 0 ]]; then
        echo "No module usage tracked yet."
        echo "Feedback is recorded automatically when modules are used in projects."
        return
    fi

    echo "| Module | Score | Usages | Avg Quality |"
    echo "|--------|-------|--------|-------------|"

    echo "$scores" | jq -r 'to_entries[] | "| \(.key) | \(.value.score) | \(.value.usages) | \(.value.avg_quality | floor)% |"'

    echo ""
    echo "Score: 0-100 (50 = neutral, higher = more effective)"
}
