#!/bin/bash
# Analysis v6 - Three-Phase Analysis System
# Usage: ./analyze-v6.sh <project-path> [run-id] [--phase A|B|C|all] [--verbose]
#
# Flow:
#   Phase A: Initial Analysis (Layer 1 + Layer 2)
#   Phase B: Improvement Testing (test high-confidence suggestions in isolation)
#   Phase C: Validation & Apply (apply validated improvements, update patterns)
#
# Requires: layer1-metrics.sh, layer2-diagnosis.sh, improvement-tester.sh, pattern-db.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source dependencies
source "$SCRIPT_DIR/common.sh"
source "$SCRIPT_DIR/manifest.sh"
source "$SCRIPT_DIR/pattern-db.sh"

PROJECT_PATH=""
RUN_ID=""
PHASE_FILTER="all"
VERBOSE=false
DRY_RUN=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --phase|-p)
            [[ -z "${2:-}" ]] && die "--phase requires A, B, C, or all"
            PHASE_FILTER="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            if [[ -z "$PROJECT_PATH" ]]; then
                PROJECT_PATH="$1"
            else
                RUN_ID="$1"
            fi
            shift
            ;;
    esac
done

if [[ -z "$PROJECT_PATH" ]]; then
    echo "Usage: $0 <project-path> [run-id] [--phase A|B|C|all] [--dry-run] [--verbose]"
    echo ""
    echo "Phases:"
    echo "  A  Initial Analysis (Layer 1 automatic + Layer 2 AI diagnosis)"
    echo "  B  Improvement Testing (test high-confidence suggestions in isolation)"
    echo "  C  Validation & Apply (apply validated improvements, update patterns)"
    echo "  all Run all phases (default)"
    exit 1
fi

PROJECT_PATH=$(realpath "$PROJECT_PATH")
PROJECT_NAME=$(basename "$PROJECT_PATH")

# Find run directory
RUNS_DIR="$PROJECT_PATH/.pipeline/runs"
MANIFEST_PATH="$PROJECT_PATH/.pipeline/manifest.json"

if [[ -z "$RUN_ID" ]]; then
    RUN_ID=$(ls -t "$RUNS_DIR" 2>/dev/null | head -1 || true)
    if [[ -z "$RUN_ID" ]]; then
        die "No runs found in $RUNS_DIR"
    fi
    info "Using latest run: $RUN_ID"
fi

RUN_DIR="$RUNS_DIR/$RUN_ID"

if [[ ! -d "$RUN_DIR" ]]; then
    die "Run directory not found: $RUN_DIR"
fi

# Analysis output directory
ANALYSIS_DIR="$RUN_DIR/analysis-v6"
mkdir -p "$ANALYSIS_DIR"

header "PIPELINE ANALYSIS v6"
echo "Project: $PROJECT_NAME"
echo "Run ID: $RUN_ID"
echo "Phase: $PHASE_FILTER"
divider

# ═══════════════════════════════════════════════════════════════
# PHASE A: Initial Analysis
# ═══════════════════════════════════════════════════════════════

run_phase_a() {
    header "PHASE A: Initial Analysis"
    echo ""

    # Step A1: Find JSONL sessions for this project
    info "A1. Finding JSONL sessions..."

    local jsonl_dir
    jsonl_dir=$("$SCRIPT_DIR/find-session.sh" --project "$PROJECT_PATH" 2>/dev/null || true)

    if [[ -z "$jsonl_dir" ]] || [[ ! -d "$jsonl_dir" ]]; then
        warn "No JSONL sessions found for project"
        return 1
    fi

    # Get session files (limit to 20 recent)
    mapfile -t session_files < <("$SCRIPT_DIR/find-session.sh" --files "$PROJECT_PATH" 20 2>/dev/null || true)

    if [[ ${#session_files[@]} -eq 0 ]]; then
        warn "No session files found"
        return 1
    fi

    success "Found ${#session_files[@]} session file(s)"

    # Step A2: Run Layer 1 metrics on each session
    info "A2. Running Layer 1 metrics (automatic)..."

    local layer1_results=()
    local session_idx=0

    for session_file in "${session_files[@]}"; do
        [[ -z "$session_file" ]] && continue
        [[ ! -f "$session_file" ]] && continue

        session_idx=$((session_idx + 1))
        local session_name="session-${session_idx}"
        local output_file="$ANALYSIS_DIR/layer1-${session_name}.json"

        # Detect phase from session content
        local phase
        phase=$("$SCRIPT_DIR/detect-phase.sh" "$session_file" 2>/dev/null || echo "unknown")

        $VERBOSE && info "  Processing: $(basename "$session_file") (phase: $phase)"

        # Run Layer 1 metrics
        if "$SCRIPT_DIR/layer1-metrics.sh" "$session_file" --phase "$phase" > "$output_file" 2>/dev/null; then
            layer1_results+=("$output_file")

            # Extract summary metrics
            local total_todos duration issues_count
            total_todos=$(jq -r '.phase_metrics.total_todos // 0' "$output_file" 2>/dev/null || echo 0)
            duration=$(jq -r '.phase_metrics.total_duration_seconds // 0' "$output_file" 2>/dev/null || echo 0)
            issues_count=$(jq -r '.issues | length' "$output_file" 2>/dev/null || echo 0)

            success "  ✓ $session_name: $total_todos todos, ${duration}s, $issues_count issues"
        else
            warn "  ✗ $session_name: Layer 1 analysis failed"
        fi
    done

    if [[ ${#layer1_results[@]} -eq 0 ]]; then
        warn "No Layer 1 results produced"
        return 1
    fi

    # Step A3: Aggregate Layer 1 results
    info "A3. Aggregating Layer 1 results..."

    local aggregate_file="$ANALYSIS_DIR/layer1-aggregate.json"

    # Combine all Layer 1 results into aggregate
    {
        echo "{"
        echo "  \"project\": \"$PROJECT_NAME\","
        echo "  \"run_id\": \"$RUN_ID\","
        echo "  \"analyzed_at\": \"$(date -Iseconds)\","
        echo "  \"sessions\": ["

        local first=true
        for result_file in "${layer1_results[@]}"; do
            if $first; then
                first=false
            else
                echo ","
            fi
            cat "$result_file"
        done

        echo "  ],"

        # Aggregate totals
        local total_todos=0 total_duration=0 total_issues=0
        for result_file in "${layer1_results[@]}"; do
            total_todos=$((total_todos + $(jq -r '.phase_metrics.total_todos // 0' "$result_file" 2>/dev/null || echo 0)))
            total_duration=$((total_duration + $(jq -r '.phase_metrics.total_duration_seconds // 0' "$result_file" 2>/dev/null || echo 0)))
            total_issues=$((total_issues + $(jq -r '.issues | length' "$result_file" 2>/dev/null || echo 0)))
        done

        echo "  \"aggregate\": {"
        echo "    \"total_sessions\": ${#layer1_results[@]},"
        echo "    \"total_todos\": $total_todos,"
        echo "    \"total_duration_seconds\": $total_duration,"
        echo "    \"total_issues\": $total_issues"
        echo "  }"
        echo "}"
    } | jq . > "$aggregate_file"

    success "Layer 1 aggregate: $total_todos todos, ${total_duration}s total, $total_issues issues"

    # Step A4: Run Layer 2 AI diagnosis
    info "A4. Running Layer 2 AI diagnosis..."

    local layer2_file="$ANALYSIS_DIR/layer2-diagnosis.json"

    if "$SCRIPT_DIR/layer2-diagnosis.sh" "$aggregate_file" \
        --project "$PROJECT_NAME" \
        --run-id "$RUN_ID" > "$layer2_file" 2>/dev/null; then

        # Extract diagnosis summary
        local diagnoses_count health top_priority
        diagnoses_count=$(jq -r '.diagnoses | length' "$layer2_file" 2>/dev/null || echo 0)
        health=$(jq -r '.overall_assessment.health // "unknown"' "$layer2_file" 2>/dev/null || echo "unknown")
        top_priority=$(jq -r '.overall_assessment.top_priority // "none"' "$layer2_file" 2>/dev/null || echo "none")

        success "Layer 2 diagnosis: $diagnoses_count diagnoses, health=$health"
        echo "  Top priority: $top_priority"
    else
        warn "Layer 2 diagnosis failed"
        # Create empty diagnosis
        echo '{"diagnoses": [], "overall_assessment": {"health": "unknown"}}' > "$layer2_file"
    fi

    # Step A5: Archive to pattern database
    info "A5. Archiving to pattern database..."

    pattern_db_init > /dev/null

    # Archive this run
    local archived_file
    archived_file=$(pattern_db_add_run "$PROJECT_NAME" "$RUN_ID" "$aggregate_file")
    success "Archived run: $(basename "$archived_file")"

    # Add issues as patterns
    local new_patterns=0
    jq -c '.sessions[].issues[]?' "$aggregate_file" 2>/dev/null | while read -r issue; do
        [[ -z "$issue" ]] && continue
        echo "$issue" | pattern_db_add_issue "$PROJECT_NAME" "$RUN_ID" > /dev/null
        new_patterns=$((new_patterns + 1))
    done

    $VERBOSE && info "  Processed patterns from issues"

    # Step A6: Extract high-confidence improvements for Phase B
    info "A6. Extracting high-confidence improvements..."

    local improvements_file="$ANALYSIS_DIR/improvements-to-test.json"

    # Filter diagnoses with high confidence
    jq '[.diagnoses[] | select(.confidence == "high")]' "$layer2_file" > "$improvements_file" 2>/dev/null || echo "[]" > "$improvements_file"

    local high_conf_count
    high_conf_count=$(jq 'length' "$improvements_file" 2>/dev/null || echo 0)

    success "High-confidence improvements for testing: $high_conf_count"

    divider
    echo ""
    echo "Phase A complete. Results:"
    echo "  Layer 1: $ANALYSIS_DIR/layer1-aggregate.json"
    echo "  Layer 2: $ANALYSIS_DIR/layer2-diagnosis.json"
    echo "  To Test: $ANALYSIS_DIR/improvements-to-test.json"
    echo ""

    return 0
}

# ═══════════════════════════════════════════════════════════════
# PHASE B: Improvement Testing
# ═══════════════════════════════════════════════════════════════

run_phase_b() {
    header "PHASE B: Improvement Testing"
    echo ""

    local improvements_file="$ANALYSIS_DIR/improvements-to-test.json"

    if [[ ! -f "$improvements_file" ]]; then
        warn "No improvements file found. Run Phase A first."
        return 1
    fi

    local improvement_count
    improvement_count=$(jq 'length' "$improvements_file" 2>/dev/null || echo 0)

    if [[ "$improvement_count" -eq 0 ]]; then
        info "No high-confidence improvements to test."
        info "Consider lowering confidence threshold or running more pipeline iterations."
        return 0
    fi

    info "B1. Testing $improvement_count high-confidence improvement(s)..."

    local results_file="$ANALYSIS_DIR/test-results.json"
    echo "[]" > "$results_file"

    local idx=0
    while read -r improvement; do
        [[ -z "$improvement" ]] && continue
        idx=$((idx + 1))

        local issue affected_phase
        issue=$(echo "$improvement" | jq -r '.issue // "Unknown"')
        affected_phase=$(echo "$improvement" | jq -r '.affected_phase // "unknown"')

        info "  [$idx/$improvement_count] Testing: $issue (phase $affected_phase)"

        # Write improvement to temp file
        local temp_improvement="/tmp/improvement-test-$$.json"
        echo "$improvement" > "$temp_improvement"

        if $DRY_RUN; then
            info "    [DRY RUN] Would test improvement"
            local test_result='{"status":"dry_run","validated":false}'
        else
            # Run improvement tester
            local test_result
            test_result=$("$SCRIPT_DIR/improvement-tester.sh" "$temp_improvement" "$PROJECT_PATH" "$MANIFEST_PATH" 2>/dev/null || echo '{"status":"failed","validated":false}')
        fi

        rm -f "$temp_improvement"

        # Parse result
        local status validated
        status=$(echo "$test_result" | jq -r '.status // "unknown"')
        validated=$(echo "$test_result" | jq -r '.validated // false')

        if [[ "$validated" == "true" ]]; then
            success "    ✓ Validated"
        else
            warn "    ✗ Not validated ($status)"
        fi

        # Append to results
        jq --argjson improvement "$improvement" \
           --argjson result "$test_result" \
           '. + [($improvement + {test_result: $result})]' \
           "$results_file" > "${results_file}.tmp"
        mv "${results_file}.tmp" "$results_file"

    done < <(jq -c '.[]' "$improvements_file")

    # Summary
    local validated_count
    validated_count=$(jq '[.[] | select(.test_result.validated == true)] | length' "$results_file" 2>/dev/null || echo 0)

    divider
    echo ""
    echo "Phase B complete."
    echo "  Tested: $improvement_count improvement(s)"
    echo "  Validated: $validated_count"
    echo "  Results: $results_file"
    echo ""

    return 0
}

# ═══════════════════════════════════════════════════════════════
# PHASE C: Validation & Apply
# ═══════════════════════════════════════════════════════════════

run_phase_c() {
    header "PHASE C: Validation & Apply"
    echo ""

    local results_file="$ANALYSIS_DIR/test-results.json"

    if [[ ! -f "$results_file" ]]; then
        warn "No test results found. Run Phase B first."
        return 1
    fi

    # Get validated improvements
    local validated_improvements
    validated_improvements=$(jq '[.[] | select(.test_result.validated == true)]' "$results_file" 2>/dev/null || echo "[]")

    local validated_count
    validated_count=$(echo "$validated_improvements" | jq 'length')

    if [[ "$validated_count" -eq 0 ]]; then
        info "No validated improvements to apply."
        info "Consider:"
        info "  - Running more pipeline iterations to build pattern confidence"
        info "  - Reviewing medium-confidence suggestions manually"
        return 0
    fi

    info "C1. Applying $validated_count validated improvement(s)..."

    local applied_file="$ANALYSIS_DIR/applied-improvements.json"
    echo "[]" > "$applied_file"

    local idx=0
    while read -r improvement; do
        [[ -z "$improvement" ]] && continue
        idx=$((idx + 1))

        local issue pattern_id
        issue=$(echo "$improvement" | jq -r '.issue // "Unknown"')
        pattern_id=$(echo "$improvement" | jq -r '.pattern_id // null')

        info "  [$idx/$validated_count] Applying: $issue"

        if $DRY_RUN; then
            info "    [DRY RUN] Would apply improvement"
        else
            # TODO: Actually apply the improvement
            # For now, just mark as applied
            info "    Applied (placeholder - actual application TBD)"
        fi

        # Mark pattern as applied in database
        if [[ -n "$pattern_id" ]] && [[ "$pattern_id" != "null" ]]; then
            pattern_db_mark_applied "$pattern_id" 2>/dev/null || true
            $VERBOSE && info "    Marked pattern $pattern_id as applied"
        fi

        # Append to applied list
        jq --argjson improvement "$improvement" \
           '. + [$improvement]' \
           "$applied_file" > "${applied_file}.tmp"
        mv "${applied_file}.tmp" "$applied_file"

    done < <(echo "$validated_improvements" | jq -c '.[]')

    # C2: Update pattern database statistics
    info "C2. Updating pattern database..."

    local stats
    stats=$(pattern_db_stats)

    local total_patterns validated_patterns applied_patterns
    total_patterns=$(echo "$stats" | jq -r '.total_patterns // 0')
    validated_patterns=$(echo "$stats" | jq -r '.validated_patterns // 0')
    applied_patterns=$(echo "$stats" | jq -r '.applied_patterns // 0')

    success "Pattern database: $total_patterns patterns, $validated_patterns validated, $applied_patterns applied"

    # C3: Generate final report
    info "C3. Generating final report..."

    local report_file="$ANALYSIS_DIR/analysis-report.md"

    cat > "$report_file" << EOF
# Analysis Report v6

**Project:** $PROJECT_NAME
**Run ID:** $RUN_ID
**Analyzed:** $(date)

---

## Summary

| Metric | Value |
|--------|-------|
| Sessions Analyzed | $(jq -r '.aggregate.total_sessions // 0' "$ANALYSIS_DIR/layer1-aggregate.json" 2>/dev/null || echo 0) |
| Total Todos | $(jq -r '.aggregate.total_todos // 0' "$ANALYSIS_DIR/layer1-aggregate.json" 2>/dev/null || echo 0) |
| Total Duration | $(jq -r '.aggregate.total_duration_seconds // 0' "$ANALYSIS_DIR/layer1-aggregate.json" 2>/dev/null || echo 0)s |
| Issues Detected | $(jq -r '.aggregate.total_issues // 0' "$ANALYSIS_DIR/layer1-aggregate.json" 2>/dev/null || echo 0) |
| Diagnoses | $(jq -r '.diagnoses | length' "$ANALYSIS_DIR/layer2-diagnosis.json" 2>/dev/null || echo 0) |
| Improvements Applied | $idx |

---

## Health Assessment

$(jq -r '.overall_assessment | "**Health:** \(.health // "unknown")\n\n**Top Priority:** \(.top_priority // "none")\n\n**Quick Wins:**\n\(.quick_wins // [] | map("- " + .) | join("\n"))"' "$ANALYSIS_DIR/layer2-diagnosis.json" 2>/dev/null || echo "Health assessment not available")

---

## Applied Improvements

$(if [[ $idx -gt 0 ]]; then
    jq -r '.[] | "- **\(.issue)** (phase \(.affected_phase // "unknown"))\n  - Fix: \(.suggested_fix.description // "N/A")\n  - Confidence: \(.confidence // "unknown")"' "$applied_file" 2>/dev/null || echo "None"
else
    echo "No improvements applied in this run."
fi)

---

## Pattern Database

- Total Patterns: $total_patterns
- Validated: $validated_patterns
- Applied: $applied_patterns
- Database: ~/.pipeline/analysis-archive/

---

*Generated by Pipeline Analysis v6*
EOF

    success "Report generated: $report_file"

    divider
    echo ""
    echo "Phase C complete."
    echo "  Applied: $idx improvement(s)"
    echo "  Report: $report_file"
    echo ""

    return 0
}

# ═══════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════════════════════════════

case "$PHASE_FILTER" in
    A|a)
        run_phase_a
        ;;
    B|b)
        run_phase_b
        ;;
    C|c)
        run_phase_c
        ;;
    all)
        run_phase_a && run_phase_b && run_phase_c
        ;;
    *)
        die "Unknown phase: $PHASE_FILTER (use A, B, C, or all)"
        ;;
esac

divider
header "ANALYSIS COMPLETE"
echo ""
echo "Results: $ANALYSIS_DIR/"
echo ""
