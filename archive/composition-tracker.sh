#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# COMPOSITION TRACKER
# Track which modules work well together - suggest combinations
# ═══════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODULES_DIR="${MODULES_DIR:-$HOME/.pipeline/modules}"
COMPOSITIONS_FILE="${MODULES_DIR}/compositions.json"

# Initialize compositions file
init_compositions() {
    mkdir -p "$MODULES_DIR"

    if [[ ! -f "$COMPOSITIONS_FILE" ]]; then
        cat > "$COMPOSITIONS_FILE" << 'EOF'
{
  "combinations": [],
  "pair_stats": {},
  "last_updated": null
}
EOF
    fi
}

# Record a combination of modules used together
# Usage: record_combination <project_path> <quality_score> <module_ids...>
record_combination() {
    local project_path="$1"
    local quality_score="$2"
    shift 2
    local module_ids=("$@")

    [[ ${#module_ids[@]} -lt 2 ]] && return  # Need at least 2 modules

    init_compositions

    local project_name=$(basename "$project_path")
    local timestamp=$(date -Iseconds)
    local combo_id=$(echo "${module_ids[*]}" | tr ' ' '-' | md5sum | cut -c1-8)

    # Sort module IDs for consistent pairing
    IFS=$'\n' sorted_modules=($(sort <<<"${module_ids[*]}")); unset IFS

    local modules_json=$(printf '%s\n' "${sorted_modules[@]}" | jq -R . | jq -s .)

    jq --arg cid "$combo_id" \
       --arg proj "$project_name" \
       --argjson mods "$modules_json" \
       --arg quality "$quality_score" \
       --arg ts "$timestamp" \
       '
       .combinations += [{
         id: $cid,
         modules: $mods,
         project: $proj,
         quality: ($quality | tonumber),
         timestamp: $ts
       }] |
       .last_updated = $ts
       ' "$COMPOSITIONS_FILE" > "${COMPOSITIONS_FILE}.tmp" && \
       mv "${COMPOSITIONS_FILE}.tmp" "$COMPOSITIONS_FILE"

    # Update pair statistics
    update_pair_stats "${sorted_modules[@]}" "$quality_score"
}

# Update statistics for each pair of modules
update_pair_stats() {
    local quality="${@: -1}"  # Last argument is quality
    local modules=("${@:1:$#-1}")  # All except last

    # Generate all pairs
    for ((i=0; i<${#modules[@]}; i++)); do
        for ((j=i+1; j<${#modules[@]}; j++)); do
            local pair_key="${modules[$i]}+${modules[$j]}"

            jq --arg pair "$pair_key" \
               --arg quality "$quality" \
               '
               .pair_stats[$pair] = (
                 (.pair_stats[$pair] // {count: 0, total_quality: 0, avg_quality: 0}) |
                 .count += 1 |
                 .total_quality += ($quality | tonumber) |
                 .avg_quality = (.total_quality / .count)
               )
               ' "$COMPOSITIONS_FILE" > "${COMPOSITIONS_FILE}.tmp" && \
               mv "${COMPOSITIONS_FILE}.tmp" "$COMPOSITIONS_FILE"
        done
    done
}

# Get recommended combinations for a module
# Usage: get_recommended_partners <module_id>
get_recommended_partners() {
    local module_id="$1"

    init_compositions

    # Find all pairs involving this module with good quality
    jq --arg mid "$module_id" '
        .pair_stats |
        to_entries |
        map(select(.key | contains($mid))) |
        map({
            partner: (.key | split("+") | map(select(. != $mid)) | .[0]),
            count: .value.count,
            avg_quality: .value.avg_quality
        }) |
        sort_by(-.avg_quality) |
        map(select(.avg_quality >= 70 and .count >= 1))
    ' "$COMPOSITIONS_FILE"
}

# Get best performing combinations overall
get_best_combinations() {
    init_compositions

    jq '
        .pair_stats |
        to_entries |
        sort_by(-.value.avg_quality) |
        map(select(.value.count >= 2 and .value.avg_quality >= 75)) |
        .[0:10] |
        map({
            modules: (.key | split("+")),
            uses: .value.count,
            avg_quality: (.value.avg_quality | floor)
        })
    ' "$COMPOSITIONS_FILE"
}

# Suggest combinations based on a set of modules
# Usage: suggest_combinations <module_ids...>
suggest_combinations() {
    local module_ids=("$@")

    init_compositions

    local suggestions="[]"

    for module_id in "${module_ids[@]}"; do
        local partners=$(get_recommended_partners "$module_id")

        while IFS= read -r partner_info; do
            [[ -z "$partner_info" ]] && continue
            local partner=$(echo "$partner_info" | jq -r '.partner')

            # Check if partner is not already in the list
            local already_included=false
            for m in "${module_ids[@]}"; do
                [[ "$m" == "$partner" ]] && already_included=true && break
            done

            if ! $already_included; then
                suggestions=$(echo "$suggestions" | jq --argjson info "$partner_info" \
                    --arg mid "$module_id" \
                    '. + [($info + {suggested_by: $mid})]')
            fi
        done < <(echo "$partners" | jq -c '.[]')
    done

    # Deduplicate and sort by quality
    echo "$suggestions" | jq 'unique_by(.partner) | sort_by(-.avg_quality)'
}

# Format combinations for prompt injection
# Usage: format_combinations_for_prompt <module_ids...>
format_combinations_for_prompt() {
    local module_ids=("$@")

    [[ ${#module_ids[@]} -eq 0 ]] && return

    local suggestions=$(suggest_combinations "${module_ids[@]}")
    local count=$(echo "$suggestions" | jq 'length')

    if [[ "$count" -eq 0 ]]; then
        return
    fi

    local output="
## 🔗 RECOMMENDED MODULE COMBINATIONS

Based on past project success, consider adding these modules:

"

    while IFS= read -r suggestion; do
        local partner=$(echo "$suggestion" | jq -r '.partner')
        local quality=$(echo "$suggestion" | jq -r '.avg_quality')
        local uses=$(echo "$suggestion" | jq -r '.count')
        local suggested_by=$(echo "$suggestion" | jq -r '.suggested_by')

        output+="- **$partner** (${quality}% avg quality over $uses uses)
  Works well with: $suggested_by

"
    done < <(echo "$suggestions" | jq -c '.[]')

    echo "$output"
}

# Auto-record from completed project
# Usage: auto_record_combination <project_path>
auto_record_combination() {
    local project_path="$1"

    local manifest="$project_path/.pipeline/manifest.json"
    if [[ ! -f "$manifest" ]]; then
        return
    fi

    local modules_used=$(jq -r '.modules_used // [] | .[]' "$manifest" 2>/dev/null)
    [[ -z "$modules_used" ]] && return

    # Get latest quality score from analysis
    local analysis_dir="$project_path/.pipeline/runs"
    local latest_run=$(ls -t "$analysis_dir" 2>/dev/null | head -1)

    if [[ -n "$latest_run" ]]; then
        local metrics="$analysis_dir/$latest_run/pipeline-metrics.json"
        if [[ -f "$metrics" ]]; then
            local quality=$(jq -r '.steps[-1].quality_score // 50' "$metrics")

            # Convert to array
            local -a module_array
            while IFS= read -r mod; do
                module_array+=("$mod")
            done <<< "$modules_used"

            record_combination "$project_path" "$quality" "${module_array[@]}"
        fi
    fi
}

# Display composition statistics
display_compositions() {
    init_compositions

    echo ""
    echo "Module Composition Statistics"
    echo "============================="
    echo ""

    local best=$(get_best_combinations)
    local count=$(echo "$best" | jq 'length')

    if [[ "$count" -eq 0 ]]; then
        echo "No combination data yet."
        echo "Combinations are tracked when multiple modules are used in a project."
        return
    fi

    echo "Best Performing Combinations:"
    echo ""
    echo "| Modules | Uses | Avg Quality |"
    echo "|---------|------|-------------|"

    echo "$best" | jq -r '.[] | "| \(.modules | join(" + ")) | \(.uses) | \(.avg_quality)% |"'

    echo ""
}
