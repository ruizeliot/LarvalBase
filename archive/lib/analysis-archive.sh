#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# ANALYSIS ARCHIVE SYSTEM
# Permanent storage of every analysis for cross-run intelligence
# ═══════════════════════════════════════════════════════════════

ARCHIVE_DIR="${ARCHIVE_DIR:-$HOME/.pipeline/analysis-archive}"
PATTERNS_INDEX="${ARCHIVE_DIR}/patterns-index.json"

# Ensure archive directory exists
init_archive() {
    mkdir -p "$ARCHIVE_DIR"

    # Initialize patterns index if doesn't exist
    if [[ ! -f "$PATTERNS_INDEX" ]]; then
        echo '{"patterns": {}, "last_updated": "'"$(date -Iseconds)"'"}' > "$PATTERNS_INDEX"
    fi
}

# Archive a single analysis
# Usage: archive_analysis <project> <run_id> <step> <analysis_json_file>
archive_analysis() {
    local project="$1"
    local run_id="$2"
    local step="$3"
    local analysis_file="$4"

    init_archive

    # Create archive filename
    local project_slug=$(echo "$project" | sed 's|/|_|g' | sed 's|^_||')
    local archive_file="${ARCHIVE_DIR}/${run_id}-${project_slug}-${step}.json"

    # Add metadata to analysis
    local timestamp=$(date -Iseconds)
    jq --arg project "$project" \
       --arg run_id "$run_id" \
       --arg step "$step" \
       --arg archived_at "$timestamp" \
       '. + {archive_metadata: {project: $project, run_id: $run_id, step: $step, archived_at: $archived_at}}' \
       "$analysis_file" > "$archive_file"

    echo "$archive_file"
}

# Query archived analyses for a specific pattern
# Usage: query_pattern <pattern_id> [days_back]
query_pattern() {
    local pattern_id="$1"
    local days_back="${2:-30}"

    init_archive

    local cutoff_date=$(date -d "-${days_back} days" +%Y-%m-%d 2>/dev/null || date -v-${days_back}d +%Y-%m-%d)

    # Search all archived analyses for this pattern
    local results="[]"

    for archive_file in "$ARCHIVE_DIR"/*.json; do
        [[ ! -f "$archive_file" ]] && continue
        [[ "$(basename "$archive_file")" == "patterns-index.json" ]] && continue

        # Check if file is within date range
        local file_date=$(basename "$archive_file" | grep -oE '^[0-9]{8}' || echo "")
        if [[ -n "$file_date" ]]; then
            local file_date_fmt="${file_date:0:4}-${file_date:4:2}-${file_date:6:2}"
            if [[ "$file_date_fmt" < "$cutoff_date" ]]; then
                continue
            fi
        fi

        # Check for pattern in reusable_patterns or detected struggles
        local pattern_data=$(jq -c --arg pid "$pattern_id" '
            .reusable_patterns[]? | select(.pattern_id == $pid)
        ' "$archive_file" 2>/dev/null)

        if [[ -n "$pattern_data" ]]; then
            local metadata=$(jq -c '.archive_metadata' "$archive_file")
            local quality=$(echo "$pattern_data" | jq -r '.quality_score // 0')
            local entry=$(jq -n \
                --argjson metadata "$metadata" \
                --argjson pattern "$pattern_data" \
                --arg quality "$quality" \
                '{metadata: $metadata, pattern: $pattern, quality: ($quality | tonumber)}')
            results=$(echo "$results" | jq --argjson entry "$entry" '. + [$entry]')
        fi
    done

    echo "$results"
}

# Get all patterns with their aggregated stats
# Usage: get_pattern_stats [days_back]
get_pattern_stats() {
    local days_back="${1:-30}"

    init_archive

    local cutoff_date=$(date -d "-${days_back} days" +%Y-%m-%d 2>/dev/null || date -v-${days_back}d +%Y-%m-%d)

    # Collect all patterns
    declare -A pattern_qualities
    declare -A pattern_counts
    declare -A pattern_names
    declare -A pattern_last_seen

    for archive_file in "$ARCHIVE_DIR"/*.json; do
        [[ ! -f "$archive_file" ]] && continue
        [[ "$(basename "$archive_file")" == "patterns-index.json" ]] && continue

        # Check date range
        local file_date=$(basename "$archive_file" | grep -oE '^[0-9]{8}' || echo "")
        if [[ -n "$file_date" ]]; then
            local file_date_fmt="${file_date:0:4}-${file_date:4:2}-${file_date:6:2}"
            if [[ "$file_date_fmt" < "$cutoff_date" ]]; then
                continue
            fi
        fi

        # Extract patterns
        while IFS= read -r pattern; do
            [[ -z "$pattern" ]] && continue
            local pid=$(echo "$pattern" | jq -r '.pattern_id // empty')
            [[ -z "$pid" ]] && continue

            local quality=$(echo "$pattern" | jq -r '.quality_score // 0')
            local name=$(echo "$pattern" | jq -r '.name // "Unknown"')

            # Accumulate
            pattern_counts[$pid]=$(( ${pattern_counts[$pid]:-0} + 1 ))
            pattern_qualities[$pid]="${pattern_qualities[$pid]:-}${quality},"
            pattern_names[$pid]="$name"
            pattern_last_seen[$pid]="$file_date"
        done < <(jq -c '.reusable_patterns[]?' "$archive_file" 2>/dev/null)
    done

    # Build output JSON
    local output='{"patterns": ['
    local first=true

    for pid in "${!pattern_counts[@]}"; do
        # Calculate average quality
        local qualities="${pattern_qualities[$pid]}"
        qualities="${qualities%,}"  # Remove trailing comma
        local avg_quality=$(echo "$qualities" | tr ',' '\n' | awk '{sum+=$1; count++} END {printf "%.0f", sum/count}')

        if ! $first; then
            output+=","
        fi
        first=false

        output+="{\"pattern_id\":\"$pid\",\"name\":\"${pattern_names[$pid]}\",\"frequency\":${pattern_counts[$pid]},\"avg_quality\":$avg_quality,\"last_seen\":\"${pattern_last_seen[$pid]}\"}"
    done

    output+=']}'
    echo "$output" | jq .
}

# Update patterns index (called after each analysis)
update_patterns_index() {
    local analysis_file="$1"

    init_archive

    local timestamp=$(date -Iseconds)

    # Extract patterns from analysis
    while IFS= read -r pattern; do
        [[ -z "$pattern" ]] && continue
        local pid=$(echo "$pattern" | jq -r '.pattern_id // empty')
        [[ -z "$pid" ]] && continue

        local quality=$(echo "$pattern" | jq -r '.quality_score // 0')
        local name=$(echo "$pattern" | jq -r '.name // "Unknown"')
        local reusability=$(echo "$pattern" | jq -r '.reusability // "low"')

        # Update index
        jq --arg pid "$pid" \
           --arg name "$name" \
           --arg quality "$quality" \
           --arg reusability "$reusability" \
           --arg timestamp "$timestamp" \
           '.patterns[$pid] = (.patterns[$pid] // {occurrences: [], name: $name}) |
            .patterns[$pid].occurrences += [{quality: ($quality | tonumber), timestamp: $timestamp, reusability: $reusability}] |
            .patterns[$pid].name = $name |
            .last_updated = $timestamp' \
           "$PATTERNS_INDEX" > "${PATTERNS_INDEX}.tmp" && mv "${PATTERNS_INDEX}.tmp" "$PATTERNS_INDEX"
    done < <(jq -c '.reusable_patterns[]?' "$analysis_file" 2>/dev/null) || true
    # Return success (while loop returns false when read finishes, which triggers set -e)
    return 0
}

# List archived analyses
# Usage: list_archives [project] [limit]
list_archives() {
    local project_filter="$1"
    local limit="${2:-20}"

    init_archive

    local count=0
    for archive_file in $(ls -t "$ARCHIVE_DIR"/*.json 2>/dev/null); do
        [[ ! -f "$archive_file" ]] && continue
        [[ "$(basename "$archive_file")" == "patterns-index.json" ]] && continue

        if [[ -n "$project_filter" ]]; then
            local proj=$(jq -r '.archive_metadata.project // ""' "$archive_file")
            [[ "$proj" != *"$project_filter"* ]] && continue
        fi

        echo "$(basename "$archive_file")"
        ((count++))
        [[ $count -ge $limit ]] && break
    done
}

# Get archive stats
get_archive_stats() {
    init_archive

    local total_files=$(ls -1 "$ARCHIVE_DIR"/*.json 2>/dev/null | grep -v patterns-index.json | wc -l)
    local total_patterns=$(jq '.patterns | length' "$PATTERNS_INDEX" 2>/dev/null || echo 0)
    local last_updated=$(jq -r '.last_updated // "never"' "$PATTERNS_INDEX" 2>/dev/null || echo "never")

    echo "{\"total_analyses\": $total_files, \"total_patterns\": $total_patterns, \"last_updated\": \"$last_updated\"}"
}
