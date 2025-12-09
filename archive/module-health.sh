#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# MODULE HEALTH DASHBOARD
# Aggregate view of module library health and intelligence
# ═══════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source all intelligence systems
source "$SCRIPT_DIR/analysis-archive.sh" 2>/dev/null || true
source "$SCRIPT_DIR/rd-scoring.sh" 2>/dev/null || true
source "$SCRIPT_DIR/auto-module-builder.sh" 2>/dev/null || true
source "$SCRIPT_DIR/module-matcher.sh" 2>/dev/null || true
source "$SCRIPT_DIR/anti-patterns.sh" 2>/dev/null || true
source "$SCRIPT_DIR/module-feedback.sh" 2>/dev/null || true
source "$SCRIPT_DIR/composition-tracker.sh" 2>/dev/null || true
source "$SCRIPT_DIR/fix-learner.sh" 2>/dev/null || true

MODULES_DIR="${MODULES_DIR:-$HOME/.pipeline/modules}"
CATALOG_FILE="${MODULES_DIR}/catalog.json"

# Get comprehensive health report for all modules
get_health_report() {
    local report='{
        "generated_at": "'"$(date -Iseconds)"'",
        "modules": [],
        "anti_patterns": [],
        "learnings": [],
        "summary": {}
    }'

    # Get all modules
    if [[ -f "$CATALOG_FILE" ]]; then
        while IFS= read -r module_id; do
            [[ -z "$module_id" ]] && continue

            local module_dir="$MODULES_DIR/$module_id"
            local module_json="$module_dir/module.json"

            if [[ -f "$module_json" ]]; then
                local name=$(jq -r '.name // .id' "$module_json")
                local source=$(jq -r '.source // "unknown"' "$module_json")

                # Get feedback score
                local score_data=$(get_module_score "$module_id" 2>/dev/null || echo '{"score":50,"usages":0,"avg_quality":0}')
                local score=$(echo "$score_data" | jq -r '.score')
                local usages=$(echo "$score_data" | jq -r '.usages')
                local avg_quality=$(echo "$score_data" | jq -r '.avg_quality')

                # Get recommended partners
                local partners=$(get_recommended_partners "$module_id" 2>/dev/null | jq -c '[.[].partner] // []')

                # Calculate health status
                local health="healthy"
                [[ "$score" -lt 40 ]] && health="unhealthy"
                [[ "$score" -lt 30 ]] && health="critical"
                [[ "$usages" -eq 0 ]] && health="unused"

                local module_health=$(jq -n \
                    --arg id "$module_id" \
                    --arg name "$name" \
                    --arg source "$source" \
                    --arg score "$score" \
                    --arg usages "$usages" \
                    --arg avg_quality "$avg_quality" \
                    --arg health "$health" \
                    --argjson partners "$partners" \
                    '{
                        id: $id,
                        name: $name,
                        source: $source,
                        score: ($score | tonumber),
                        usages: ($usages | tonumber),
                        avg_quality: ($avg_quality | tonumber),
                        health: $health,
                        recommended_partners: $partners
                    }')

                report=$(echo "$report" | jq --argjson mod "$module_health" '.modules += [$mod]')
            fi
        done < <(jq -r '.modules[].id' "$CATALOG_FILE" 2>/dev/null)
    fi

    # Get anti-patterns count
    local anti_count=0
    if [[ -f "$ANTI_PATTERNS_DIR/index.json" ]]; then
        anti_count=$(jq '.patterns | length' "$ANTI_PATTERNS_DIR/index.json" 2>/dev/null || echo 0)
    fi

    # Get learnings count
    local learnings_count=0
    if [[ -f "$LEARNINGS_DIR/human-fixes.json" ]]; then
        learnings_count=$(jq '.fixes | length' "$LEARNINGS_DIR/human-fixes.json" 2>/dev/null || echo 0)
    fi

    # Get archive stats
    local archive_count=0
    if [[ -d "$ARCHIVE_DIR" ]]; then
        archive_count=$(ls -1 "$ARCHIVE_DIR"/*.json 2>/dev/null | grep -v patterns-index.json | wc -l)
    fi

    # Calculate summary
    local total_modules=$(echo "$report" | jq '.modules | length')
    local healthy_modules=$(echo "$report" | jq '[.modules[] | select(.health == "healthy")] | length')
    local total_usages=$(echo "$report" | jq '[.modules[].usages] | add // 0')
    local avg_score=$(echo "$report" | jq 'if (.modules | length) > 0 then ([.modules[].score] | add / length | floor) else 0 end')

    report=$(echo "$report" | jq \
        --arg total "$total_modules" \
        --arg healthy "$healthy_modules" \
        --arg usages "$total_usages" \
        --arg avg_score "$avg_score" \
        --arg anti "$anti_count" \
        --arg learnings "$learnings_count" \
        --arg archives "$archive_count" \
        '.summary = {
            total_modules: ($total | tonumber),
            healthy_modules: ($healthy | tonumber),
            total_usages: ($usages | tonumber),
            avg_score: ($avg_score | tonumber),
            anti_patterns: ($anti | tonumber),
            learnings: ($learnings | tonumber),
            archived_analyses: ($archives | tonumber)
        }')

    echo "$report" | jq .
}

# Display health dashboard
display_health_dashboard() {
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "             PIPELINE INTELLIGENCE DASHBOARD"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""

    local report=$(get_health_report)
    local summary=$(echo "$report" | jq '.summary')

    # Summary stats
    echo "📊 OVERVIEW"
    echo "───────────────────────────────────────────────────────────────"
    echo "  Modules:      $(echo "$summary" | jq -r '.total_modules') ($(echo "$summary" | jq -r '.healthy_modules') healthy)"
    echo "  Avg Score:    $(echo "$summary" | jq -r '.avg_score')/100"
    echo "  Total Usages: $(echo "$summary" | jq -r '.total_usages')"
    echo "  Anti-Patterns: $(echo "$summary" | jq -r '.anti_patterns')"
    echo "  Learnings:    $(echo "$summary" | jq -r '.learnings')"
    echo "  Archives:     $(echo "$summary" | jq -r '.archived_analyses')"
    echo ""

    # Module health
    local modules=$(echo "$report" | jq '.modules')
    local module_count=$(echo "$modules" | jq 'length')

    if [[ "$module_count" -gt 0 ]]; then
        echo "📦 MODULE HEALTH"
        echo "───────────────────────────────────────────────────────────────"
        echo ""
        echo "| Module | Score | Uses | Avg Quality | Health |"
        echo "|--------|-------|------|-------------|--------|"

        echo "$modules" | jq -r '.[] | "| \(.id) | \(.score) | \(.usages) | \(.avg_quality | floor)% | \(.health) |"'

        echo ""
    fi

    # Best combinations
    local best_combos=$(get_best_combinations 2>/dev/null || echo "[]")
    local combo_count=$(echo "$best_combos" | jq 'length')

    if [[ "$combo_count" -gt 0 ]]; then
        echo "🔗 BEST COMBINATIONS"
        echo "───────────────────────────────────────────────────────────────"

        echo "$best_combos" | jq -r '.[] | "  \(.modules | join(" + ")) → \(.avg_quality)% (\(.uses) uses)"'
        echo ""
    fi

    # Anti-patterns preview
    if [[ -f "$ANTI_PATTERNS_DIR/index.json" ]]; then
        local anti_count=$(jq '.patterns | length' "$ANTI_PATTERNS_DIR/index.json" 2>/dev/null || echo 0)
        if [[ "$anti_count" -gt 0 ]]; then
            echo "⚠️ TOP ANTI-PATTERNS"
            echo "───────────────────────────────────────────────────────────────"

            jq -r '.patterns | sort_by(-.failure_count) | .[0:3] | .[] | "  [\(.impact)] \(.id) - \(.failure_count) failures"' \
                "$ANTI_PATTERNS_DIR/index.json" 2>/dev/null

            echo ""
        fi
    fi

    # Recent learnings
    if [[ -f "$LEARNINGS_DIR/human-fixes.json" ]]; then
        local learning_count=$(jq '.fixes | length' "$LEARNINGS_DIR/human-fixes.json" 2>/dev/null || echo 0)
        if [[ "$learning_count" -gt 0 ]]; then
            echo "📚 RECENT LEARNINGS"
            echo "───────────────────────────────────────────────────────────────"

            jq -r '.fixes | sort_by(-.timestamp) | .[0:3] | .[] | "  [\(.category)] \(.lesson)"' \
                "$LEARNINGS_DIR/human-fixes.json" 2>/dev/null

            echo ""
        fi
    fi

    # R&D opportunities
    local rd_eval=$(evaluate_all_patterns 30 2>/dev/null || echo '{"to_build":[],"to_watch":[]}')
    local to_build=$(echo "$rd_eval" | jq '.to_build | length')
    local to_watch=$(echo "$rd_eval" | jq '.to_watch | length')

    if [[ "$to_build" -gt 0 ]] || [[ "$to_watch" -gt 0 ]]; then
        echo "🔬 R&D OPPORTUNITIES"
        echo "───────────────────────────────────────────────────────────────"

        if [[ "$to_build" -gt 0 ]]; then
            echo "  Ready to build ($to_build):"
            echo "$rd_eval" | jq -r '.to_build[] | "    • \(.name) (R&D: \(.rd_value))"'
        fi

        if [[ "$to_watch" -gt 0 ]]; then
            echo "  Watching ($to_watch):"
            echo "$rd_eval" | jq -r '.to_watch[] | "    • \(.name) (R&D: \(.rd_value))"'
        fi
        echo ""
    fi

    echo "───────────────────────────────────────────────────────────────"
    echo "  Storage: ~/.pipeline/"
    echo "  Run: ./pipeline health (for full details)"
    echo ""
}

# Get module recommendation for current project
# Usage: get_recommendations <project_path>
get_recommendations() {
    local project_path="$1"

    echo ""
    echo "Analyzing project for recommendations..."
    echo ""

    # Get semantic matches
    local matches=$(find_relevant_modules "$project_path" 2>/dev/null || echo '{"matches":[]}')
    local match_count=$(echo "$matches" | jq '.matches | length')

    if [[ "$match_count" -gt 0 ]]; then
        echo "📦 RECOMMENDED MODULES:"
        echo ""
        echo "$matches" | jq -r '.matches[] | "  \(.module_id) (\(.relevance)% match)\n    Why: \(.reason)\n    Use: \(.usage_suggestion)\n"'
    fi

    # Get anti-patterns to avoid
    local context=$(get_project_context "$project_path" 2>/dev/null)
    if [[ -n "$context" ]]; then
        local anti=$(get_relevant_anti_patterns "$context" 2>/dev/null || echo "[]")
        local anti_count=$(echo "$anti" | jq 'length')

        if [[ "$anti_count" -gt 0 ]]; then
            echo "⚠️ ANTI-PATTERNS TO AVOID:"
            echo ""
            echo "$anti" | jq -r '.[] | "  [\(.impact)] \(.id)\n    \(.description)\n    Instead: \(.mitigation // "No mitigation documented")\n"'
        fi
    fi

    # Get learnings
    local learnings=$(get_all_learnings_for_prompt 2>/dev/null)
    if [[ -n "$learnings" ]]; then
        echo "📚 RELEVANT GUIDELINES:"
        echo "$learnings"
    fi
}

# Export all intelligence as context for Claude
# Usage: export_intelligence_context <project_path>
export_intelligence_context() {
    local project_path="$1"

    local context=""

    # Module matches
    local matches=$(find_relevant_modules "$project_path" 2>/dev/null)
    local formatted_matches=$(format_matches_for_prompt "$matches" 2>/dev/null)
    if [[ -n "$formatted_matches" ]]; then
        context+="$formatted_matches"
    fi

    # Anti-patterns
    local project_context=$(get_project_context "$project_path" 2>/dev/null)
    local anti=$(get_relevant_anti_patterns "$project_context" 2>/dev/null)
    local critical_anti=$(get_critical_anti_patterns 2>/dev/null)
    local all_anti=$(echo "$anti $critical_anti" | jq -s 'add | unique_by(.id)')
    local formatted_anti=$(format_anti_patterns_for_prompt "$all_anti" 2>/dev/null)
    if [[ -n "$formatted_anti" ]]; then
        context+="$formatted_anti"
    fi

    # Learnings
    local learnings=$(get_all_learnings_for_prompt 2>/dev/null)
    if [[ -n "$learnings" ]]; then
        context+="$learnings"
    fi

    # Module combinations
    local matched_modules=$(echo "$matches" | jq -r '.matches[].module_id' 2>/dev/null)
    if [[ -n "$matched_modules" ]]; then
        local -a module_array
        while IFS= read -r mod; do
            module_array+=("$mod")
        done <<< "$matched_modules"
        local combos=$(format_combinations_for_prompt "${module_array[@]}" 2>/dev/null)
        if [[ -n "$combos" ]]; then
            context+="$combos"
        fi
    fi

    echo "$context"
}
