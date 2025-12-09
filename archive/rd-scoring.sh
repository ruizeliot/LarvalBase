#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# R&D VALUE SCORING SYSTEM
# Calculate investment value for patterns based on cross-run data
# ═══════════════════════════════════════════════════════════════

# Load archive system
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/analysis-archive.sh"

# R&D threshold for auto-build trigger
RD_BUILD_THRESHOLD="${RD_BUILD_THRESHOLD:-80}"

# Success threshold for direct module extraction
SUCCESS_THRESHOLD="${SUCCESS_THRESHOLD:-85}"

# Calculate R&D investment value for a pattern
# Formula: (frequency × struggle_factor × recency_factor)
# Where struggle_factor = (100 - avg_quality) / 100
#       recency_factor = boost for recent occurrences
#
# Usage: calculate_rd_value <pattern_id> [days_back]
calculate_rd_value() {
    local pattern_id="$1"
    local days_back="${2:-30}"

    # Get pattern occurrences from archive
    local pattern_data=$(query_pattern "$pattern_id" "$days_back")
    local count=$(echo "$pattern_data" | jq 'length')

    if [[ "$count" -eq 0 ]]; then
        echo '{"pattern_id": "'"$pattern_id"'", "rd_value": 0, "reason": "no_occurrences"}'
        return
    fi

    # Calculate metrics
    local total_quality=0
    local qualities=""
    while IFS= read -r entry; do
        local q=$(echo "$entry" | jq -r '.quality')
        total_quality=$((total_quality + q))
        qualities="${qualities}${q},"
    done < <(echo "$pattern_data" | jq -c '.[]')

    local avg_quality=$((total_quality / count))
    local struggle_factor=$(echo "scale=2; (100 - $avg_quality) / 100" | bc)

    # Frequency factor (logarithmic to prevent runaway scores)
    local freq_factor=$(echo "scale=2; l($count + 1) / l(2) * 20" | bc -l)

    # Calculate R&D value (0-100 scale) - truncate to integer
    local rd_value=$(printf "%.0f" "$(echo "scale=2; $freq_factor * $struggle_factor * 2" | bc)")

    # Cap at 100 (use arithmetic comparison with integer)
    if [[ "$rd_value" -gt 100 ]]; then
        rd_value=100
    fi

    # Determine recommendation
    local recommendation="monitor"
    local reason=""

    # Use arithmetic comparison (all values are integers now)
    if [[ "$avg_quality" -ge "$SUCCESS_THRESHOLD" ]]; then
        recommendation="extract_success"
        reason="High quality pattern - extract as reusable module"
    elif [[ "$rd_value" -ge "$RD_BUILD_THRESHOLD" ]]; then
        recommendation="build_module"
        reason="High R&D value - worth investing in proper module"
    elif [[ "$rd_value" -ge 50 ]]; then
        recommendation="watch"
        reason="Moderate R&D value - monitor for trend"
    else
        recommendation="monitor"
        reason="Low R&D value - not enough data yet"
    fi

    cat << EOF
{
    "pattern_id": "$pattern_id",
    "frequency": $count,
    "avg_quality": $avg_quality,
    "struggle_factor": $struggle_factor,
    "rd_value": $rd_value,
    "recommendation": "$recommendation",
    "reason": "$reason",
    "threshold": $RD_BUILD_THRESHOLD,
    "qualities": [${qualities%,}]
}
EOF
}

# Evaluate all patterns and return those needing action
# Usage: evaluate_all_patterns [days_back]
evaluate_all_patterns() {
    local days_back="${1:-30}"

    init_archive

    local stats=$(get_pattern_stats "$days_back")
    local results='{"to_extract": [], "to_build": [], "to_watch": [], "monitoring": []}'

    while IFS= read -r pattern; do
        [[ -z "$pattern" ]] && continue
        local pid=$(echo "$pattern" | jq -r '.pattern_id')
        local name=$(echo "$pattern" | jq -r '.name')
        local freq=$(echo "$pattern" | jq -r '.frequency')
        local avg_q=$(echo "$pattern" | jq -r '.avg_quality')

        # Calculate R&D value
        local rd_data=$(calculate_rd_value "$pid" "$days_back")
        local rd_value=$(echo "$rd_data" | jq -r '.rd_value')
        local recommendation=$(echo "$rd_data" | jq -r '.recommendation')

        local entry=$(jq -n \
            --arg pid "$pid" \
            --arg name "$name" \
            --arg freq "$freq" \
            --arg avg_q "$avg_q" \
            --arg rd_value "$rd_value" \
            --arg recommendation "$recommendation" \
            '{pattern_id: $pid, name: $name, frequency: ($freq|tonumber), avg_quality: ($avg_q|tonumber), rd_value: ($rd_value|tonumber), recommendation: $recommendation}')

        case "$recommendation" in
            extract_success)
                results=$(echo "$results" | jq --argjson entry "$entry" '.to_extract += [$entry]')
                ;;
            build_module)
                results=$(echo "$results" | jq --argjson entry "$entry" '.to_build += [$entry]')
                ;;
            watch)
                results=$(echo "$results" | jq --argjson entry "$entry" '.to_watch += [$entry]')
                ;;
            *)
                results=$(echo "$results" | jq --argjson entry "$entry" '.monitoring += [$entry]')
                ;;
        esac
    done < <(echo "$stats" | jq -c '.patterns[]?')

    echo "$results" | jq .
}

# Check if a specific pattern should trigger auto-build
# Usage: should_auto_build <pattern_id> [days_back]
should_auto_build() {
    local pattern_id="$1"
    local days_back="${2:-30}"

    local rd_data=$(calculate_rd_value "$pattern_id" "$days_back")
    local recommendation=$(echo "$rd_data" | jq -r '.recommendation')

    if [[ "$recommendation" == "extract_success" ]] || [[ "$recommendation" == "build_module" ]]; then
        echo "true"
        return 0
    else
        echo "false"
        return 1
    fi
}

# Get struggle areas for a pattern (for module generation context)
# Usage: get_struggle_areas <pattern_id> [days_back]
get_struggle_areas() {
    local pattern_id="$1"
    local days_back="${2:-30}"

    init_archive

    local struggles='[]'

    for archive_file in "$ARCHIVE_DIR"/*.json; do
        [[ ! -f "$archive_file" ]] && continue
        [[ "$(basename "$archive_file")" == "patterns-index.json" ]] && continue

        # Look for optimizations related to this pattern
        local pattern_issues=$(jq -c --arg pid "$pattern_id" '
            select(.reusable_patterns[]?.pattern_id == $pid) |
            .optimizations.quality[]? |
            select(.issue | test($pid; "i") or test("websocket|realtime|sync|connection"; "i"))
        ' "$archive_file" 2>/dev/null)

        if [[ -n "$pattern_issues" ]]; then
            while IFS= read -r issue; do
                [[ -z "$issue" ]] && continue
                struggles=$(echo "$struggles" | jq --argjson issue "$issue" '. + [$issue]')
            done <<< "$pattern_issues"
        fi
    done

    echo "$struggles" | jq 'unique_by(.issue)'
}

# Display R&D report
# Usage: display_rd_report [days_back]
display_rd_report() {
    local days_back="${1:-30}"

    local evaluation=$(evaluate_all_patterns "$days_back")

    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "R&D INVESTMENT ANALYSIS (last ${days_back} days)"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""

    # Success patterns (to extract)
    local to_extract=$(echo "$evaluation" | jq '.to_extract | length')
    if [[ "$to_extract" -gt 0 ]]; then
        echo "✅ READY TO EXTRACT (quality ≥ ${SUCCESS_THRESHOLD}%):"
        echo "$evaluation" | jq -r '.to_extract[] | "  [\(.rd_value)] \(.name)\n      Quality: \(.avg_quality)% | Frequency: \(.frequency)\n      → Extract as reusable module\n"'
    fi

    # Build patterns (high R&D value)
    local to_build=$(echo "$evaluation" | jq '.to_build | length')
    if [[ "$to_build" -gt 0 ]]; then
        echo "🔧 BUILD MODULE (R&D value ≥ ${RD_BUILD_THRESHOLD}):"
        echo "$evaluation" | jq -r '.to_build[] | "  [\(.rd_value)] \(.name)\n      Quality: \(.avg_quality)% | Frequency: \(.frequency)\n      → Worth investing in proper implementation\n"'
    fi

    # Watch patterns
    local to_watch=$(echo "$evaluation" | jq '.to_watch | length')
    if [[ "$to_watch" -gt 0 ]]; then
        echo "👀 WATCHING (R&D value 50-${RD_BUILD_THRESHOLD}):"
        echo "$evaluation" | jq -r '.to_watch[] | "  [\(.rd_value)] \(.name) - Quality: \(.avg_quality)% | Freq: \(.frequency)"'
        echo ""
    fi

    # Monitoring patterns
    local monitoring=$(echo "$evaluation" | jq '.monitoring | length')
    if [[ "$monitoring" -gt 0 ]]; then
        echo "📊 MONITORING (R&D value < 50):"
        echo "$evaluation" | jq -r '.monitoring[] | "  [\(.rd_value)] \(.name) - Quality: \(.avg_quality)% | Freq: \(.frequency)"'
        echo ""
    fi

    if [[ "$to_extract" -eq 0 ]] && [[ "$to_build" -eq 0 ]] && [[ "$to_watch" -eq 0 ]] && [[ "$monitoring" -eq 0 ]]; then
        echo "  No patterns detected yet. Run more analyses to build intelligence."
        echo ""
    fi

    echo "────────────────────────────────────────────────────────────────"
}
