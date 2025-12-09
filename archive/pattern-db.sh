#!/bin/bash
# Global Pattern Database Management
# Usage: source lib/pattern-db.sh
#
# Functions:
#   pattern_db_init                          - Initialize database structure
#   pattern_db_add_run <project> <run_id> <metrics_json>  - Archive a run
#   pattern_db_add_issue <issue_json>        - Add/update an issue pattern
#   pattern_db_get_pattern <pattern_id>      - Get pattern details
#   pattern_db_list_patterns [--min-freq N]  - List all patterns
#   pattern_db_match_issues <issues_json>    - Match issues to existing patterns
#   pattern_db_get_confidence <pattern_id>   - Calculate confidence from frequency

set -euo pipefail

# Database location
PATTERN_DB_DIR="${PATTERN_DB_DIR:-$HOME/.pipeline/analysis-archive}"

# ═══════════════════════════════════════════════════════════════
# INITIALIZATION
# ═══════════════════════════════════════════════════════════════

pattern_db_init() {
    mkdir -p "$PATTERN_DB_DIR/runs"
    mkdir -p "$PATTERN_DB_DIR/patterns"

    # Create index file if not exists
    if [[ ! -f "$PATTERN_DB_DIR/index.json" ]]; then
        cat > "$PATTERN_DB_DIR/index.json" << 'EOF'
{
  "version": "1.0",
  "created": null,
  "total_runs": 0,
  "total_patterns": 0,
  "last_updated": null
}
EOF
        # Set created timestamp
        local ts=$(date -Iseconds)
        jq --arg ts "$ts" '.created = $ts | .last_updated = $ts' "$PATTERN_DB_DIR/index.json" > "$PATTERN_DB_DIR/index.json.tmp"
        mv "$PATTERN_DB_DIR/index.json.tmp" "$PATTERN_DB_DIR/index.json"
    fi

    echo "$PATTERN_DB_DIR"
}

# ═══════════════════════════════════════════════════════════════
# RUN MANAGEMENT
# ═══════════════════════════════════════════════════════════════

# Archive a run's analysis results
# Usage: pattern_db_add_run <project_name> <run_id> <metrics_json_file>
pattern_db_add_run() {
    local project="$1"
    local run_id="$2"
    local metrics_file="$3"

    pattern_db_init > /dev/null

    local run_file="$PATTERN_DB_DIR/runs/${project}-${run_id}.json"
    local ts=$(date -Iseconds)

    # Create run record
    jq --arg project "$project" \
       --arg run_id "$run_id" \
       --arg ts "$ts" \
       '. + {
         project: $project,
         run_id: $run_id,
         archived_at: $ts
       }' "$metrics_file" > "$run_file"

    # Update index
    jq --arg ts "$ts" '.total_runs += 1 | .last_updated = $ts' "$PATTERN_DB_DIR/index.json" > "$PATTERN_DB_DIR/index.json.tmp"
    mv "$PATTERN_DB_DIR/index.json.tmp" "$PATTERN_DB_DIR/index.json"

    echo "$run_file"
}

# List archived runs
# Usage: pattern_db_list_runs [--project <name>] [--limit N]
pattern_db_list_runs() {
    local project=""
    local limit=20

    while [[ $# -gt 0 ]]; do
        case $1 in
            --project) project="$2"; shift 2 ;;
            --limit) limit="$2"; shift 2 ;;
            *) shift ;;
        esac
    done

    pattern_db_init > /dev/null

    if [[ -n "$project" ]]; then
        ls -1t "$PATTERN_DB_DIR/runs/${project}-"*.json 2>/dev/null | head -"$limit" | while read f; do
            jq -c '{project, run_id, archived_at, phase_metrics}' "$f"
        done
    else
        ls -1t "$PATTERN_DB_DIR/runs/"*.json 2>/dev/null | head -"$limit" | while read f; do
            jq -c '{project, run_id, archived_at}' "$f"
        done
    fi
}

# ═══════════════════════════════════════════════════════════════
# PATTERN MANAGEMENT
# ═══════════════════════════════════════════════════════════════

# Generate pattern ID from issue type and description
_pattern_id() {
    local type="$1"
    local detail="$2"
    # Create deterministic ID from type + normalized detail
    echo "${type}-$(echo "$detail" | tr '[:upper:]' '[:lower:]' | tr -cs '[:alnum:]' '-' | head -c 40 | sed 's/-$//')"
}

# Add or update a pattern
# Usage: echo '<issue_json>' | pattern_db_add_issue <project> <run_id>
pattern_db_add_issue() {
    local project="$1"
    local run_id="$2"

    pattern_db_init > /dev/null

    local ts=$(date -Iseconds)

    # Read issue from stdin
    local issue=$(cat)
    local type=$(echo "$issue" | jq -r '.type')
    local todo=$(echo "$issue" | jq -r '.todo // .content // "unknown"')
    local detail=$(echo "$issue" | jq -r '.detail // ""')
    local severity=$(echo "$issue" | jq -r '.severity // "medium"')

    local pattern_id=$(_pattern_id "$type" "$todo")
    local pattern_file="$PATTERN_DB_DIR/patterns/${pattern_id}.json"

    if [[ -f "$pattern_file" ]]; then
        # Update existing pattern
        jq --arg project "$project" \
           --arg run_id "$run_id" \
           --arg ts "$ts" \
           --arg severity "$severity" \
           '.occurrences += [{project: $project, run_id: $run_id, timestamp: $ts, severity: $severity}] |
            .frequency = (.occurrences | length) |
            .last_seen = $ts |
            .confidence = (if .frequency >= 3 then "high" elif .frequency == 2 then "medium" else "low" end)' \
           "$pattern_file" > "${pattern_file}.tmp"
        mv "${pattern_file}.tmp" "$pattern_file"
    else
        # Create new pattern
        cat > "$pattern_file" << EOF
{
  "pattern_id": "$pattern_id",
  "type": "$type",
  "description": "$todo",
  "detail": "$detail",
  "first_seen": "$ts",
  "last_seen": "$ts",
  "frequency": 1,
  "confidence": "low",
  "occurrences": [
    {
      "project": "$project",
      "run_id": "$run_id",
      "timestamp": "$ts",
      "severity": "$severity"
    }
  ],
  "suggested_fix": null,
  "status": "observed"
}
EOF
        # Update index
        jq '.total_patterns += 1' "$PATTERN_DB_DIR/index.json" > "$PATTERN_DB_DIR/index.json.tmp"
        mv "$PATTERN_DB_DIR/index.json.tmp" "$PATTERN_DB_DIR/index.json"
    fi

    echo "$pattern_id"
}

# Get pattern by ID
pattern_db_get_pattern() {
    local pattern_id="$1"
    local pattern_file="$PATTERN_DB_DIR/patterns/${pattern_id}.json"

    if [[ -f "$pattern_file" ]]; then
        cat "$pattern_file"
    else
        echo '{"error": "Pattern not found"}'
        return 1
    fi
}

# List all patterns
# Usage: pattern_db_list_patterns [--min-freq N] [--confidence high|medium|low]
pattern_db_list_patterns() {
    local min_freq=0
    local confidence=""

    while [[ $# -gt 0 ]]; do
        case $1 in
            --min-freq) min_freq="$2"; shift 2 ;;
            --confidence) confidence="$2"; shift 2 ;;
            *) shift ;;
        esac
    done

    pattern_db_init > /dev/null

    local jq_filter=". | select(.frequency >= $min_freq)"
    [[ -n "$confidence" ]] && jq_filter="$jq_filter | select(.confidence == \"$confidence\")"

    for f in "$PATTERN_DB_DIR/patterns/"*.json; do
        [[ -f "$f" ]] && jq -c "$jq_filter" "$f" 2>/dev/null
    done | jq -s 'sort_by(-.frequency)'
}

# Match new issues against existing patterns
# Usage: echo '<issues_array_json>' | pattern_db_match_issues
pattern_db_match_issues() {
    local issues=$(cat)

    pattern_db_init > /dev/null

    echo "$issues" | jq -c '.[]' | while read issue; do
        local type=$(echo "$issue" | jq -r '.type')
        local todo=$(echo "$issue" | jq -r '.todo // .content // "unknown"')
        local pattern_id=$(_pattern_id "$type" "$todo")
        local pattern_file="$PATTERN_DB_DIR/patterns/${pattern_id}.json"

        if [[ -f "$pattern_file" ]]; then
            # Found existing pattern
            local freq=$(jq -r '.frequency' "$pattern_file")
            local confidence=$(jq -r '.confidence' "$pattern_file")
            echo "$issue" | jq -c --arg pid "$pattern_id" \
                                   --arg freq "$freq" \
                                   --arg conf "$confidence" \
                                   '. + {matched_pattern: $pid, pattern_frequency: ($freq | tonumber), pattern_confidence: $conf}'
        else
            # New pattern
            echo "$issue" | jq -c '. + {matched_pattern: null, pattern_frequency: 0, pattern_confidence: "new"}'
        fi
    done | jq -s '.'
}

# Update pattern with suggested fix
# Usage: pattern_db_set_fix <pattern_id> <fix_description> <target_file>
pattern_db_set_fix() {
    local pattern_id="$1"
    local fix_description="$2"
    local target_file="${3:-}"

    local pattern_file="$PATTERN_DB_DIR/patterns/${pattern_id}.json"

    if [[ ! -f "$pattern_file" ]]; then
        echo "Pattern not found: $pattern_id" >&2
        return 1
    fi

    jq --arg fix "$fix_description" \
       --arg target "$target_file" \
       '.suggested_fix = {description: $fix, target: $target} | .status = "fix_proposed"' \
       "$pattern_file" > "${pattern_file}.tmp"
    mv "${pattern_file}.tmp" "$pattern_file"
}

# Mark pattern as validated (fix tested and works)
pattern_db_validate_pattern() {
    local pattern_id="$1"
    local pattern_file="$PATTERN_DB_DIR/patterns/${pattern_id}.json"

    if [[ ! -f "$pattern_file" ]]; then
        echo "Pattern not found: $pattern_id" >&2
        return 1
    fi

    local ts=$(date -Iseconds)
    jq --arg ts "$ts" '.status = "validated" | .validated_at = $ts' \
       "$pattern_file" > "${pattern_file}.tmp"
    mv "${pattern_file}.tmp" "$pattern_file"
}

# Mark pattern as applied (fix merged to pipeline)
pattern_db_mark_applied() {
    local pattern_id="$1"
    local pattern_file="$PATTERN_DB_DIR/patterns/${pattern_id}.json"

    if [[ ! -f "$pattern_file" ]]; then
        echo "Pattern not found: $pattern_id" >&2
        return 1
    fi

    local ts=$(date -Iseconds)
    jq --arg ts "$ts" '.status = "applied" | .applied_at = $ts' \
       "$pattern_file" > "${pattern_file}.tmp"
    mv "${pattern_file}.tmp" "$pattern_file"
}

# ═══════════════════════════════════════════════════════════════
# STATISTICS
# ═══════════════════════════════════════════════════════════════

pattern_db_stats() {
    pattern_db_init > /dev/null

    local total_runs=0
    local total_patterns=0
    local high_conf=0
    local validated=0
    local applied=0

    # Count runs
    if compgen -G "$PATTERN_DB_DIR/runs/*.json" > /dev/null 2>&1; then
        total_runs=$(ls -1 "$PATTERN_DB_DIR/runs/"*.json 2>/dev/null | wc -l)
    fi

    # Count patterns
    if compgen -G "$PATTERN_DB_DIR/patterns/*.json" > /dev/null 2>&1; then
        total_patterns=$(ls -1 "$PATTERN_DB_DIR/patterns/"*.json 2>/dev/null | wc -l)
        high_conf=$(pattern_db_list_patterns --confidence high 2>/dev/null | jq -s 'length' 2>/dev/null || echo 0)

        for f in "$PATTERN_DB_DIR/patterns/"*.json; do
            local status=$(jq -r '.status // ""' "$f" 2>/dev/null)
            [[ "$status" == "validated" ]] && ((validated++)) || true
            [[ "$status" == "applied" ]] && ((applied++)) || true
        done
    fi

    jq -n --arg path "$PATTERN_DB_DIR" \
          --argjson runs "$total_runs" \
          --argjson patterns "$total_patterns" \
          --argjson high "$high_conf" \
          --argjson validated "$validated" \
          --argjson applied "$applied" \
    '{
      database_path: $path,
      total_runs: $runs,
      total_patterns: $patterns,
      high_confidence_patterns: $high,
      validated_patterns: $validated,
      applied_patterns: $applied
    }'
}
