#!/bin/bash
# Analyze a pipeline run using JSONL transcripts
# Usage: ./analyze-run.sh <project-path> [run-id] [--step STEP] [--verbose]
#
# Flow:
# 1. Find run (by ID or latest)
# 2. For each step (or single step if --step): generate transcript, analyze with Claude
# 3. Aggregate all analyses
# 4. Interactive output

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source common utilities
source "$SCRIPT_DIR/common.sh"
# Source file cache for reducing redundant reads
source "$SCRIPT_DIR/file-cache.sh"


# Source self-improvement system
source "$SCRIPT_DIR/analysis-archive.sh"
source "$SCRIPT_DIR/rd-scoring.sh"
source "$SCRIPT_DIR/auto-module-builder.sh"

PROJECT_PATH=""
RUN_ID=""
STEP_FILTER=""
VERBOSE=false
REVIEW_MODE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --review|-r)
            REVIEW_MODE=true
            shift
            ;;
        --step|-s)
            [[ -z "${2:-}" ]] && die "--step requires a step name (0b, 1, 2, 3)"
            STEP_FILTER="$2"
            shift 2
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
    echo "Usage: $0 <project-path> [run-id] [--step STEP] [--review] [--verbose]"
    echo ""
    echo "Options:"
    echo "  --step, -s    Analyze only this step (0b, 1, 2, 3)"
    echo "  --review, -r  Interactive review mode (default: auto-apply)"
    echo "  --verbose, -v Show detailed output"
    exit 1
fi

PROJECT_PATH=$(realpath "$PROJECT_PATH")
PROJECT_NAME=$(basename "$PROJECT_PATH")

# Find run directory
RUNS_DIR="$PROJECT_PATH/.pipeline/runs"

if [[ -z "$RUN_ID" ]]; then
    # Get latest run
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

# Read run metadata
METADATA_FILE="$RUN_DIR/metadata.json"
if [[ ! -f "$METADATA_FILE" ]]; then
    die "Metadata not found: $METADATA_FILE"
fi

RUN_TYPE=$(cached_read "$METADATA_FILE" | jq -r '.type // "unknown"')
STARTED_AT=$(cached_read "$METADATA_FILE" | jq -r '.startedAt // ""')
STEPS=$(cached_read "$METADATA_FILE" | jq -r '.steps[]? // empty' | tr '\n' ' ')

header "PIPELINE ANALYSIS"
echo "Project: $PROJECT_NAME"
echo "Run ID: $RUN_ID"
echo "Type: $RUN_TYPE"
echo "Started: $STARTED_AT"
echo "Steps: $STEPS"
divider

# Find JSONL sessions for this project
JSONL_DIR=$("$SCRIPT_DIR/find-session.sh" --project "$PROJECT_PATH" 2>/dev/null || true)

if [[ -z "$JSONL_DIR" ]] || [[ ! -d "$JSONL_DIR" ]]; then
    warn "No JSONL sessions found for project"
    warn "Falling back to terminal transcripts..."

    # Fall back to old transcript files
    TRANSCRIPTS=$(ls "$RUN_DIR"/*-transcript.md 2>/dev/null | sort || true)
    if [[ -z "$TRANSCRIPTS" ]]; then
        die "No transcripts found in $RUN_DIR"
    fi
else
    info "Found JSONL sessions in: $JSONL_DIR"
fi

# Preload commonly accessed files into cache
cache_preload_project "$PROJECT_PATH" > /dev/null 2>&1 || true

# Output directory
ANALYSIS_DIR="$RUN_DIR/analysis"
mkdir -p "$ANALYSIS_DIR"

# Step metrics definitions file
STEP_METRICS_FILE="$SCRIPT_DIR/step-metrics.json"

# Detect step type from transcript filename or content
detect_step_type() {
    local step_name="$1"
    local transcript_file="$2"

    # Try to detect from filename first
    case "$step_name" in
        *0a*|*brainstorm*) echo "0a" ;;
        *0b*|*technical*) echo "0b" ;;
        *1*|*bootstrap*) echo "1" ;;
        *2*|*implement*|*epic*) echo "2" ;;
        *3*|*finalize*) echo "3" ;;
        *)
            # Try to detect from content
            if grep -q "Brainstorm\|user stories\|User Stories" "$transcript_file" 2>/dev/null; then
                if grep -q "E2E Test Spec\|tech-stack\|Tech Stack" "$transcript_file" 2>/dev/null; then
                    echo "0b"
                else
                    echo "0a"
                fi
            elif grep -q "skeleton\|RED state\|all.*failing" "$transcript_file" 2>/dev/null; then
                echo "1"
            elif grep -q "implement.*epic\|GREEN state\|epic complete" "$transcript_file" 2>/dev/null; then
                echo "2"
            elif grep -q "finalize\|polish\|production-ready" "$transcript_file" 2>/dev/null; then
                echo "3"
            else
                echo "unknown"
            fi
            ;;
    esac
}

# Get step definition from metrics file
get_step_definition() {
    local step_type="$1"
    if [[ -f "$STEP_METRICS_FILE" ]]; then
        cached_read "$STEP_METRICS_FILE" | jq -r ".steps[\"$step_type\"] // empty"
    fi
}

# Generate step-specific analysis prompt
generate_step_prompt() {
    local step_type="$1"
    local step_def
    step_def=$(get_step_definition "$step_type")

    if [[ -z "$step_def" ]] || [[ "$step_def" == "null" ]]; then
        # Fallback to generic prompt
        echo "$GENERIC_ANALYSIS_PROMPT"
        return
    fi

    local step_name step_purpose step_mode step_inputs step_outputs metrics_json
    step_name=$(echo "$step_def" | jq -r '.name')
    step_purpose=$(echo "$step_def" | jq -r '.purpose')
    step_mode=$(echo "$step_def" | jq -r '.mode')
    step_inputs=$(echo "$step_def" | jq -r '.inputs | join(", ")')
    step_outputs=$(echo "$step_def" | jq -r '.outputs | join(", ")')
    metrics_json=$(echo "$step_def" | jq -c '.metrics')

    cat << PROMPT
Analyze this pipeline step transcript. Return ONLY valid JSON (no markdown wrapper).

## STEP CONTEXT
- **Step:** $step_type - $step_name
- **Purpose:** $step_purpose
- **Mode:** $step_mode
- **Expected Inputs:** $step_inputs
- **Expected Outputs:** $step_outputs

## METRICS TO EXTRACT
Extract EXACTLY these metrics based on evidence in the transcript.
DO NOT guess or invent values - if not found in transcript, use null.

$metrics_json

## REQUIRED OUTPUT FORMAT
{
  "step": "$step_type",
  "step_name": "$step_name",
  "summary": "1-2 sentence summary of what was accomplished",
  "duration_seconds": <estimate from timestamps or content>,

  "step_metrics": {
    <Extract each metric from the METRICS TO EXTRACT section>
    <Use the exact metric names as keys>
    <Value types: bool, int, float, percent (0-100)>
    <If metric not observable in transcript, use null>
  },

  "quality_score": <calculated 0-100 based on metrics vs targets>,
  "quality_judgment": "Explanation of score based on metrics evidence",

  "general_metrics": {
    "messages": {"user": <count>, "assistant": <count>},
    "tool_calls": {"Read": 0, "Write": 0, "Edit": 0, "Bash": 0, "Glob": 0, "Grep": 0, "Task": 0, "other": 0},
    "files_created": [],
    "files_modified": [],
    "subagents_spawned": <count>,
    "errors_encountered": <count>
  },

  "tokens": {
    "input_estimate": <words * 1.3 * 0.6>,
    "output_estimate": <words * 1.3 * 0.4>,
    "total_estimate": <sum>
  },

  "cost_estimate_usd": <(input * 15 + output * 75) / 1000000>,

  "tests": {
    "passing": <from cypress/test output or null>,
    "failing": <from cypress/test output or null>,
    "total": <from cypress/test output or null>
  },

  "optimizations": {
    "quality": [{"issue": "description", "fix": "suggestion", "priority": "high/medium/low"}],
    "speed": [{"issue": "description", "fix": "suggestion", "priority": "high/medium/low"}],
    "cost": [{"issue": "description", "fix": "suggestion", "priority": "high/medium/low"}]
  },

  "command_improvements": "Specific suggestions to improve the step command",

  "critical_failures": [
    <List any metrics that failed their critical threshold>
    <e.g., "red_percentage: 72% (target: 100%)">
  ],

  "reusable_patterns": [
    {
      "pattern_id": "multi-user-websocket|auth-session|crud-api|sqlite-repository|...",
      "name": "Human readable name",
      "description": "What this pattern does",
      "quality_score": 0-100,
      "files": ["key files"],
      "reusability": "high/medium/low"
    }
  ]
}

## SCORING RULES
- Calculate quality_score based on how many metrics meet their targets
- Critical metrics (like red_percentage=100% for step 1) MUST be met for high scores
- If critical metric fails, cap score at 50%
- Each metric contributes based on its weight in the definition
- Provide evidence-based judgment, not abstract assessment

TRANSCRIPT:
PROMPT
}

# Generic fallback prompt (used when step type unknown)
GENERIC_ANALYSIS_PROMPT='Analyze this pipeline step transcript. Return ONLY valid JSON (no markdown wrapper).

Extract metrics, optimization recommendations (Quality → Speed → Cost), AND identify reusable patterns:
{
  "step": "step name/number",
  "summary": "1-2 sentence summary of what was accomplished",
  "duration_seconds": estimate from timestamps or content,
  "step_metrics": {},
  "quality_score": 0-100,
  "quality_judgment": "Brief assessment",
  "general_metrics": {
    "messages": {"user": 0, "assistant": 0},
    "tool_calls": {"Read": 0, "Write": 0, "Edit": 0, "Bash": 0, "Glob": 0, "Grep": 0, "Task": 0, "other": 0},
    "files_created": [],
    "files_modified": [],
    "subagents_spawned": 0,
    "errors_encountered": 0
  },
  "tokens": {
    "input_estimate": "count words * 1.3 * 0.6",
    "output_estimate": "count words * 1.3 * 0.4",
    "total_estimate": "sum"
  },
  "tests": {"passing": null, "failing": null, "total": null},
  "cost_estimate_usd": "(input * 15 + output * 75) / 1000000",
  "optimizations": {
    "quality": [{"issue": "description", "fix": "suggestion", "priority": "high/medium/low"}],
    "speed": [{"issue": "description", "fix": "suggestion", "priority": "high/medium/low"}],
    "cost": [{"issue": "description", "fix": "suggestion", "priority": "high/medium/low"}]
  },
  "command_improvements": "Suggestions",
  "critical_failures": [],
  "reusable_patterns": []
}

TRANSCRIPT:
'

# Store step analyses
declare -a STEP_ANALYSES=()
TOTAL_TOKENS=0
TOTAL_COST=0

# Process each step
process_transcript() {
    local transcript_file="$1"
    local step_name="$2"
    local output_file="$ANALYSIS_DIR/${step_name}-analysis.json"

    info "Analyzing: $step_name..."

    # Detect step type for step-specific metrics
    local step_type
    step_type=$(detect_step_type "$step_name" "$transcript_file")

    if [[ "$step_type" != "unknown" ]]; then
        info "  Detected step type: $step_type"
    else
        warn "  Could not detect step type, using generic analysis"
    fi

    # Generate step-specific or generic prompt
    local analysis_prompt
    analysis_prompt=$(generate_step_prompt "$step_type")

    # Read transcript content
    local content
    content=$(cached_read "$transcript_file")


    # Check file size (bytes)
    local file_size=$(stat -c%s "$transcript_file" 2>/dev/null || stat -f%z "$transcript_file" 2>/dev/null || echo "0")

    # Count lines
    local line_count=$(echo "$content" | wc -l)

    # Validate transcript: must have minimum size AND line count
    if [[ $file_size -lt 500 ]] || [[ $line_count -lt 100 ]]; then
        warn "  ✗ Transcript too short (${file_size} bytes, ${line_count} lines) - skipping analysis"
        echo "{\"error\":\"Transcript too short\",\"size\":${file_size},\"lines\":${line_count}}" > "$ANALYSIS_DIR/${step_name}-skipped.json"
        return
    fi

    # Build full prompt
    local full_prompt="${analysis_prompt}

${content}"

    # Run Claude analysis with step-specific prompt
    # Note: Opus doesn't work with stdin redirect, must use -p argument
    local prompt_size=${#full_prompt}
    $VERBOSE && info "  Prompt size: $prompt_size bytes"

    # Use Sonnet for analysis (Opus has intermittent empty response bug - TODO: investigate in v6)
    # Capture only stdout - stderr has system reminders that break JSON parsing
    local result exit_code
    result=$(timeout 600 claude --model sonnet --print -p "$full_prompt" </dev/null 2>/dev/null) || true
    exit_code=$?

    # Debug: show result info
    $VERBOSE && info "  Claude exit code: $exit_code, result length: ${#result}"

    # Check for empty result
    if [[ -z "$result" ]]; then
        warn "  ✗ Claude returned empty response (exit code: $exit_code)"
        echo "Empty response from Claude - exit code: $exit_code" > "$ANALYSIS_DIR/${step_name}-error.txt"
        return
    fi

    # Extract JSON from result
    local json
    json=$(echo "$result" | grep -Pzo '\{[\s\S]*\}' | tr -d '\0' || echo "")

    # Validate and save
    if [[ -n "$json" ]] && echo "$json" | jq . > /dev/null 2>&1; then
        echo "$json" | jq . > "$output_file"

        # Extract values for aggregation (with defaults for safety)
        local tokens cost summary quality_score quality_judgment
        tokens=$(jq -r '.tokens.total_estimate // 0' "$output_file" 2>/dev/null || echo "0")
        cost=$(jq -r '.cost_estimate_usd // 0' "$output_file" 2>/dev/null || echo "0")
        summary=$(jq -r '.summary // "No summary"' "$output_file" 2>/dev/null || echo "No summary")
        quality_score=$(jq -r '.quality_score // "N/A"' "$output_file" 2>/dev/null || echo "N/A")
        quality_judgment=$(jq -r '.quality_judgment // ""' "$output_file" 2>/dev/null || echo "")

        # Ensure numeric values for bc (handle empty/null)
        [[ -z "$tokens" || "$tokens" == "null" ]] && tokens=0
        [[ -z "$cost" || "$cost" == "null" ]] && cost=0

        TOTAL_TOKENS=$(echo "$TOTAL_TOKENS + $tokens" | bc 2>/dev/null || echo "$TOTAL_TOKENS")
        TOTAL_COST=$(echo "$TOTAL_COST + $cost" | bc 2>/dev/null || echo "$TOTAL_COST")

        STEP_ANALYSES+=("$step_name|$tokens|$cost|$summary|$quality_score")

        success "  ✓ Quality: ${quality_score}% | Tokens: ~$tokens | Cost: \$$cost"
        if $VERBOSE; then
            echo "    Summary: $summary"
            [[ -n "$quality_judgment" ]] && echo "    Judgment: $quality_judgment"
        fi

        # Show critical failures if any
        local critical_failures
        critical_failures=$(jq -r '.critical_failures[]? // empty' "$output_file" 2>/dev/null)
        if [[ -n "$critical_failures" ]]; then
            warn "  ⚠ Critical failures:"
            echo "$critical_failures" | while read -r failure; do
                echo "      - $failure"
            done
        fi

        # Archive analysis for cross-run intelligence
        local archived_file
        archived_file=$(archive_analysis "$PROJECT_PATH" "$RUN_ID" "$step_name" "$output_file")
        update_patterns_index "$output_file"
        if $VERBOSE; then info "  Archived: $(basename "$archived_file")"; fi
    else
        warn "  ✗ Failed to parse analysis"
        echo "$result" > "$ANALYSIS_DIR/${step_name}-error.txt"
    fi
}

# If specific step requested, use terminal transcripts directly
if [[ -n "$STEP_FILTER" ]]; then
    info "Analyzing step: $STEP_FILTER"

    # Find transcript for this step
    STEP_TRANSCRIPT=$(ls "$RUN_DIR"/${STEP_FILTER}-*transcript.md 2>/dev/null | head -1 || true)

    if [[ -z "$STEP_TRANSCRIPT" ]] || [[ ! -f "$STEP_TRANSCRIPT" ]]; then
        die "No transcript found for step '$STEP_FILTER' in $RUN_DIR"
    fi

    step_name=$(basename "$STEP_TRANSCRIPT" -transcript.md)

    # Verify step type matches expected filter
    detected_step=$(detect_step_type "$step_name" "$STEP_TRANSCRIPT")
    if [[ "$detected_step" != "$STEP_FILTER" ]] && [[ "$detected_step" != "unknown" ]]; then
        warn "⚠️  Step type mismatch detected!"
        warn "   Expected: $STEP_FILTER"
        warn "   Detected from transcript: $detected_step"
        warn "   The transcript content suggests this is step $detected_step, not $STEP_FILTER"
        echo ""
        read -p "Continue with detected step type ($detected_step)? (Y/n) " confirm
        if [[ ! "$confirm" =~ ^[Nn]$ ]]; then
            STEP_FILTER="$detected_step"
            info "Using detected step type: $detected_step"
        else
            warn "Proceeding with original step filter: $STEP_FILTER (may produce inaccurate analysis)"
        fi
        echo ""
    fi
    process_transcript "$STEP_TRANSCRIPT" "$step_name"
else
    # Method 1: Use JSONL sessions
    if [[ -n "$JSONL_DIR" ]] && [[ -d "$JSONL_DIR" ]]; then
        info "Analyzing from JSONL sessions..."

        # Get session file paths (newest first) into array
        # Limit to 5 recent sessions for analysis (adjust as needed)
        mapfile -t SESSION_ARRAY < <("$SCRIPT_DIR/find-session.sh" --files "$PROJECT_PATH" 5 2>/dev/null || true)

        # Get expected steps from metadata to map sessions correctly
        expected_steps=()
        if [[ -f "$METADATA_FILE" ]]; then
            mapfile -t expected_steps < <(cached_read "$METADATA_FILE" | jq -r '.steps[]? // empty')
        fi

        if [[ ${#SESSION_ARRAY[@]} -gt 0 ]]; then
            SESSION_COUNT=0
            for session_file in "${SESSION_ARRAY[@]}"; do
                [[ -z "$session_file" ]] && continue
                [[ ! -f "$session_file" ]] && continue

                # Generate transcript from JSONL
                TEMP_TRANSCRIPT=$(mktemp)
                TEMP_ERROR=$(mktemp)
                if ! "$SCRIPT_DIR/jsonl-to-transcript.sh" "$session_file" --include-tools > "$TEMP_TRANSCRIPT" 2>"$TEMP_ERROR"; then
                    warn "  Failed to generate transcript from session $(basename "$session_file")"
                    if [[ -s "$TEMP_ERROR" ]]; then
                        $VERBOSE && cat "$TEMP_ERROR" >&2
                    fi
                    rm -f "$TEMP_TRANSCRIPT" "$TEMP_ERROR"
                    SESSION_COUNT=$((SESSION_COUNT + 1))
                    continue
                fi
                rm -f "$TEMP_ERROR"

                if [[ -s "$TEMP_TRANSCRIPT" ]]; then
                    # Use expected step name if available, otherwise detect from content
                    step_name=""
                    if [[ $SESSION_COUNT -lt ${#expected_steps[@]} ]]; then
                        step_name="${expected_steps[$SESSION_COUNT]}"
                        $VERBOSE && info "  Using expected step name: $step_name"
                    else
                        step_name="session-$((SESSION_COUNT + 1))"
                        $VERBOSE && warn "  No step mapping for session $((SESSION_COUNT + 1)), using: $step_name"
                    fi

                    process_transcript "$TEMP_TRANSCRIPT" "$step_name"
                else
                    warn "  Empty transcript generated from session $(basename "$session_file")"
                fi

                rm -f "$TEMP_TRANSCRIPT"
                SESSION_COUNT=$((SESSION_COUNT + 1))
            done
        fi
    fi
    # Method 2: Fall back to terminal transcripts
    if [[ ${#STEP_ANALYSES[@]} -eq 0 ]]; then
        info "Using terminal transcripts..."

        for transcript in "$RUN_DIR"/*-transcript.md; do
            [[ ! -f "$transcript" ]] && continue

            step_name=$(basename "$transcript" -transcript.md)
            process_transcript "$transcript" "$step_name"
        done
    fi
fi

# Check if we have any analyses
if [[ ${#STEP_ANALYSES[@]} -eq 0 ]]; then
    die "No transcripts could be analyzed"
fi

divider
info "Generating aggregate report..."

# Create aggregate metrics
METRICS_FILE="$RUN_DIR/pipeline-metrics.json"
SUMMARY_FILE="$RUN_DIR/pipeline-summary.md"

# Build steps JSON (now includes quality_score)
STEPS_JSON="["
first=true
for analysis in "${STEP_ANALYSES[@]}"; do
    IFS='|' read -r name tokens cost summary quality_score <<< "$analysis"
    quality_score="${quality_score:-0}"
    if $first; then
        first=false
    else
        STEPS_JSON+=","
    fi
    STEPS_JSON+="{\"step\":\"$name\",\"tokens\":$tokens,\"cost\":$cost,\"quality_score\":$quality_score,\"summary\":\"$summary\"}"
done
STEPS_JSON+="]"

# Get manifest data if available
MANIFEST="$PROJECT_PATH/.pipeline/manifest.json"
EPICS_COUNT=0
STORIES_COUNT=0
TESTS_TOTAL=0
TESTS_PASSING=0

if [[ -f "$MANIFEST" ]]; then
    EPICS_COUNT=$(cached_read "$MANIFEST" | jq '.epics | length // 0' 2>/dev/null || echo 0)
    STORIES_COUNT=$(cached_read "$MANIFEST" | jq '[.epics[]?.stories | length] | add // 0' 2>/dev/null || echo 0)
    TESTS_TOTAL=$(cached_read "$MANIFEST" | jq -r '.tests.total // 0' 2>/dev/null || echo 0)
    TESTS_PASSING=$(cached_read "$MANIFEST" | jq -r '.tests.passing // 0' 2>/dev/null || echo 0)
fi

# Create metrics JSON
cat > "$METRICS_FILE" << EOF
{
  "runId": "$RUN_ID",
  "project": "$PROJECT_NAME",
  "type": "$RUN_TYPE",
  "startedAt": "$STARTED_AT",
  "analyzedAt": "$(date -Iseconds)",
  "totals": {
    "tokens": $TOTAL_TOKENS,
    "cost_usd": $TOTAL_COST,
    "steps_analyzed": ${#STEP_ANALYSES[@]}
  },
  "project_metrics": {
    "epics": $EPICS_COUNT,
    "stories": $STORIES_COUNT,
    "tests_total": $TESTS_TOTAL,
    "tests_passing": $TESTS_PASSING
  },
  "steps": $STEPS_JSON
}
EOF

# Format metrics JSON
jq . "$METRICS_FILE" > "$METRICS_FILE.tmp" && mv "$METRICS_FILE.tmp" "$METRICS_FILE"

# Create summary markdown
cat > "$SUMMARY_FILE" << EOF
# Pipeline Analysis Report

**Run ID:** $RUN_ID
**Project:** $PROJECT_NAME
**Type:** $RUN_TYPE
**Analyzed:** $(date)

---

## Overview

| Metric | Value |
|--------|-------|
| Total Tokens | ~$TOTAL_TOKENS |
| Estimated Cost | \$$(printf '%.2f' "$TOTAL_COST") |
| Steps Analyzed | ${#STEP_ANALYSES[@]} |
| Epics | $EPICS_COUNT |
| User Stories | $STORIES_COUNT |
| Tests | $TESTS_PASSING / $TESTS_TOTAL passing |

---

## Step Breakdown

| Step | Quality | Tokens | Cost | Summary |
|------|---------|--------|------|---------|
EOF

for analysis in "${STEP_ANALYSES[@]}"; do
    IFS='|' read -r name tokens cost summary quality_score <<< "$analysis"
    quality_score="${quality_score:-N/A}"
    echo "| $name | ${quality_score}% | ~$tokens | \$$(printf '%.2f' "$cost") | $summary |" >> "$SUMMARY_FILE"
done

cat >> "$SUMMARY_FILE" << EOF

---

## Files

- **Metrics JSON:** \`$METRICS_FILE\`
- **Per-step analysis:** \`$ANALYSIS_DIR/\`

---

*Generated by Pipeline Analysis v4.7 (Metrics-Based)*
EOF

# Brief summary
divider
header "ANALYSIS COMPLETE"
echo ""
echo "📊 Summary: Tokens ~$TOTAL_TOKENS | Cost \$$(printf '%.2f' "$TOTAL_COST") | Steps ${#STEP_ANALYSES[@]}"
echo ""
for analysis in "${STEP_ANALYSES[@]}"; do
    IFS='|' read -r name tokens cost summary quality_score <<< "$analysis"
    quality_score="${quality_score:-N/A}"
    # Color code quality score
    if [[ "$quality_score" =~ ^[0-9]+$ ]]; then
        if [[ $quality_score -ge 90 ]]; then
            echo "   ✅ $name: ${quality_score}% - $summary"
        elif [[ $quality_score -ge 70 ]]; then
            echo "   ⚠️  $name: ${quality_score}% - $summary"
        else
            echo "   ❌ $name: ${quality_score}% - $summary"
        fi
    else
        echo "   • $name: $summary"
    fi
done
echo ""

# ═══════════════════════════════════════════════════════════════
# INTERACTIVE OPTIMIZATION FLOW
# ═══════════════════════════════════════════════════════════════

PIPELINE_DIR="$(dirname "$SCRIPT_DIR")"
VERSION_FILE="$PIPELINE_DIR/VERSION"
CLAUDEMD_FILE="$PIPELINE_DIR/CLAUDE.md"
INIT_MANIFEST="$PIPELINE_DIR/init-manifest.sh"

# Get current version
get_current_version() {
    if [[ -f "$VERSION_FILE" ]]; then
        cached_read "$VERSION_FILE"
    else
        grep -oP '\*\*Version:\*\* \K[0-9.]+' "$CLAUDEMD_FILE" | head -1 || echo "4.4.0"
    fi
}

# Bump patch version (4.4 → 4.4.1)
bump_version() {
    local current="$1"
    local major minor patch
    IFS='.' read -r major minor patch <<< "$current"
    patch=${patch:-0}
    patch=$((patch + 1))
    echo "${major}.${minor}.${patch}"
}

# Update version in all relevant files
update_version() {
    local old_version="$1"
    local new_version="$2"
    local changes="$3"
    local date_now=$(date +%Y-%m-%d)

    echo "$new_version" > "$VERSION_FILE"
    sed -i "s/\*\*Version:\*\* $old_version/**Version:** $new_version/" "$CLAUDEMD_FILE"
    sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$new_version\"/" "$INIT_MANIFEST"

    # Add to version history in CLAUDE.md
    local history_entry="| $new_version | $date_now | $changes |"
    if grep -q "| Version | Date | Changes |" "$CLAUDEMD_FILE"; then
        sed -i "/| Version | Date | Changes |/,/^$/{ /|------/a\\
$history_entry
        }" "$CLAUDEMD_FILE"
    fi
}

# Git commit version changes: create branch, commit, merge to dev
git_commit_version() {
    local new_version="$1"
    local changes="$2"
    local branch_name="pipeline-v${new_version}"

    cd "$PIPELINE_DIR" || return 1

    # Check if we're in a git repo
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        warn "Not a git repository, skipping git commit"
        return 1
    fi

    # Get current branch
    local current_branch=$(git branch --show-current)

    info "Git: Creating branch $branch_name..."

    # Create and switch to version branch
    git checkout -b "$branch_name" 2>/dev/null || {
        warn "Branch $branch_name already exists, using existing"
        git checkout "$branch_name" 2>/dev/null || return 1
    }

    # Stage all Pipeline-Office changes
    git add -A .

    # Commit
    git commit -m "$(cat <<EOF
pipeline(v${new_version}): ${changes}

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)" 2>/dev/null || {
        warn "Nothing to commit"
    }

    # Switch back to dev (or original branch)
    local target_branch="dev"
    if ! git show-ref --verify --quiet "refs/heads/$target_branch"; then
        target_branch="$current_branch"
    fi

    git checkout "$target_branch" 2>/dev/null

    # Merge the version branch
    info "Git: Merging $branch_name to $target_branch..."
    git merge "$branch_name" --no-edit 2>/dev/null || {
        warn "Merge failed, staying on $branch_name"
        return 1
    }

    success "🔀 Git: Created branch $branch_name, merged to $target_branch"
    return 0
}

# Collect all optimizations from analysis files
declare -a OPT_CATEGORIES=()
declare -a OPT_PRIORITIES=()
declare -a OPT_ISSUES=()
declare -a OPT_FIXES=()
declare -a OPT_SOURCES=()

collect_optimizations() {
    OPT_CATEGORIES=()
    OPT_PRIORITIES=()
    OPT_ISSUES=()
    OPT_FIXES=()
    OPT_SOURCES=()

    for analysis_file in "$ANALYSIS_DIR"/*-analysis.json; do
        [[ ! -f "$analysis_file" ]] && continue
        local step_name=$(basename "$analysis_file" -analysis.json)

        # Quality optimizations
        while IFS= read -r line; do
            [[ -z "$line" ]] && continue
            local issue=$(echo "$line" | jq -r '.issue // empty')
            local fix=$(echo "$line" | jq -r '.fix // empty')
            local priority=$(echo "$line" | jq -r '.priority // "medium"')
            [[ -z "$issue" ]] && continue
            OPT_CATEGORIES+=("quality")
            OPT_PRIORITIES+=("$priority")
            OPT_ISSUES+=("$issue")
            OPT_FIXES+=("$fix")
            OPT_SOURCES+=("$step_name")
        done < <(jq -c '.optimizations.quality[]?' "$analysis_file" 2>/dev/null)

        # Speed optimizations
        while IFS= read -r line; do
            [[ -z "$line" ]] && continue
            local issue=$(echo "$line" | jq -r '.issue // empty')
            local fix=$(echo "$line" | jq -r '.fix // empty')
            local priority=$(echo "$line" | jq -r '.priority // "medium"')
            [[ -z "$issue" ]] && continue
            OPT_CATEGORIES+=("speed")
            OPT_PRIORITIES+=("$priority")
            OPT_ISSUES+=("$issue")
            OPT_FIXES+=("$fix")
            OPT_SOURCES+=("$step_name")
        done < <(jq -c '.optimizations.speed[]?' "$analysis_file" 2>/dev/null)

        # Cost optimizations
        while IFS= read -r line; do
            [[ -z "$line" ]] && continue
            local issue=$(echo "$line" | jq -r '.issue // empty')
            local fix=$(echo "$line" | jq -r '.fix // empty')
            local priority=$(echo "$line" | jq -r '.priority // "medium"')
            [[ -z "$issue" ]] && continue
            OPT_CATEGORIES+=("cost")
            OPT_PRIORITIES+=("$priority")
            OPT_ISSUES+=("$issue")
            OPT_FIXES+=("$fix")
            OPT_SOURCES+=("$step_name")
        done < <(jq -c '.optimizations.cost[]?' "$analysis_file" 2>/dev/null)

        # Command improvements (as single item)
        local cmd_improve=$(jq -r '.command_improvements // empty' "$analysis_file" 2>/dev/null)
        if [[ -n "$cmd_improve" ]] && [[ "$cmd_improve" != "null" ]]; then
            OPT_CATEGORIES+=("command")
            OPT_PRIORITIES+=("medium")
            OPT_ISSUES+=("Command improvements for $step_name")
            OPT_FIXES+=("$cmd_improve")
            OPT_SOURCES+=("$step_name")
        fi
    done
}

# Display optimizations with numbers
display_optimizations() {
    if [[ ${#OPT_ISSUES[@]} -eq 0 ]]; then
        echo "No optimizations found."
        return 1
    fi

    header "OPTIMIZATIONS"
    echo ""

    local current_category=""
    local idx=1

    # Display by category (quality → speed → cost → command)
    for cat in quality speed cost command; do
        local has_items=false
        for i in "${!OPT_CATEGORIES[@]}"; do
            if [[ "${OPT_CATEGORIES[$i]}" == "$cat" ]]; then
                if ! $has_items; then
                    case $cat in
                        quality) echo "🎯 QUALITY:" ;;
                        speed) echo "⚡ SPEED:" ;;
                        cost) echo "💰 COST:" ;;
                        command) echo "📝 COMMAND:" ;;
                    esac
                    has_items=true
                fi
                # Find the display index for this item
                local display_idx=1
                for j in "${!OPT_CATEGORIES[@]}"; do
                    if [[ $j -eq $i ]]; then
                        break
                    fi
                    ((display_idx++))
                done
                echo "  [$display_idx] [${OPT_PRIORITIES[$i]}] ${OPT_ISSUES[$i]}"
                echo "      → ${OPT_FIXES[$i]}"
            fi
        done
        if $has_items; then
            echo ""
        fi
    done
}

# Build JSON of current optimizations for Claude
build_optimizations_json() {
    local json="["
    local first=true
    for i in "${!OPT_ISSUES[@]}"; do
        if $first; then
            first=false
        else
            json+=","
        fi
        # Escape quotes in strings
        local issue="${OPT_ISSUES[$i]//\"/\\\"}"
        local fix="${OPT_FIXES[$i]//\"/\\\"}"
        json+="{\"index\":$((i+1)),\"category\":\"${OPT_CATEGORIES[$i]}\",\"priority\":\"${OPT_PRIORITIES[$i]}\",\"issue\":\"$issue\",\"fix\":\"$fix\"}"
    done
    json+="]"
    echo "$json"
}

# Parse optimizations JSON from Claude response
parse_revised_optimizations() {
    local json="$1"

    OPT_CATEGORIES=()
    OPT_PRIORITIES=()
    OPT_ISSUES=()
    OPT_FIXES=()
    OPT_SOURCES=()

    local count=$(echo "$json" | jq 'length')
    for ((i=0; i<count; i++)); do
        local cat=$(echo "$json" | jq -r ".[$i].category // \"quality\"")
        local pri=$(echo "$json" | jq -r ".[$i].priority // \"medium\"")
        local issue=$(echo "$json" | jq -r ".[$i].issue // \"\"")
        local fix=$(echo "$json" | jq -r ".[$i].fix // \"\"")
        [[ -z "$issue" ]] && continue
        OPT_CATEGORIES+=("$cat")
        OPT_PRIORITIES+=("$pri")
        OPT_ISSUES+=("$issue")
        OPT_FIXES+=("$fix")
        OPT_SOURCES+=("revised")
    done
}

# Revise optimizations based on user feedback
revise_optimizations() {
    local feedback="$1"
    local current_json=$(build_optimizations_json)

    info "Revising optimizations based on feedback..."

    local prompt="You are revising optimization recommendations for a pipeline system.

CURRENT OPTIMIZATIONS:
$current_json

USER FEEDBACK:
$feedback

TASK:
Based on the user's feedback, revise the optimization list. You may:
- Remove items the user doesn't want
- Modify suggestions based on their concerns
- Reorder priorities
- Keep items unchanged if feedback doesn't affect them

Return ONLY a valid JSON array with the revised optimizations:
[{\"category\":\"quality|speed|cost|command\",\"priority\":\"high|medium|low\",\"issue\":\"description\",\"fix\":\"suggestion\"}]

No markdown, no explanation, just the JSON array."

    # Use Sonnet (Opus has intermittent empty response bug - TODO: investigate in v6)
    local result
    result=$(timeout 180 claude --model sonnet --print -p "$prompt" </dev/null 2>/dev/null || true)

    # Extract JSON array from result
    local json
    json=$(echo "$result" | grep -Pzo '\[[\s\S]*\]' | tr -d '\0' || echo "[]")

    if echo "$json" | jq . > /dev/null 2>&1; then
        parse_revised_optimizations "$json"
        return 0
    else
        warn "Failed to parse revised optimizations"
        return 1
    fi
}

# Apply a single improvement using Claude (with retry logic)
apply_improvement() {
    local idx=$1
    local category="${OPT_CATEGORIES[$idx]}"
    local issue="${OPT_ISSUES[$idx]}"
    local fix="${OPT_FIXES[$idx]}"

    info "Applying: $issue"

    local prompt="You are improving the Pipeline-Office system at $PIPELINE_DIR.

IMPROVEMENT REQUEST:
Category: $category
Issue: $issue
Suggested Fix: $fix

TASK:
1. Identify which file(s) in $PIPELINE_DIR need to be modified
2. Make the specific changes to implement this improvement
3. Keep changes minimal and focused

The main files are:
- pipeline (main CLI)
- lib/analyze-run.sh (analysis)
- lib/transcript.sh (transcript cleaning)
- lib/expect-step.exp (step execution)
- lib/expect-interactive.exp (brainstorm)
- run-step.sh, run-pipeline.sh (runners)
- init-manifest.sh (manifest creation)

If this improvement requires changes to slash commands, those are in:
/home/claude/.claude/commands/*-pipeline-v4-*.md

Make the changes now. Output ONLY the changes made (file paths and brief description)."

    # Retry logic with exponential backoff for API errors
    local max_retries=3
    local retry_delay=5
    local attempt=1
    local result=""

    while [[ $attempt -le $max_retries ]]; do
        # Use Sonnet (Opus has intermittent empty response bug - TODO: investigate in v6)
        # Capture only stdout - stderr has system reminders that corrupt output
        result=$(timeout 300 claude --model sonnet --print -p "$prompt" </dev/null 2>/dev/null) || true

        # Check for API errors (500, rate limit, etc.)
        if echo "$result" | grep -q "API Error: 5\|rate_limit\|overloaded"; then
            if [[ $attempt -lt $max_retries ]]; then
                warn "  ⚠ API error, retrying in ${retry_delay}s (attempt $attempt/$max_retries)"
                sleep $retry_delay
                retry_delay=$((retry_delay * 2))  # Exponential backoff
                attempt=$((attempt + 1))
                continue
            fi
        fi
        break
    done

    if [[ -n "$result" ]] && ! echo "$result" | grep -q "API Error:"; then
        success "  ✓ Applied"
        # Show summary of changes (limit output)
        echo "$result" | grep -E "^(Changed|Updated|Modified|Created|Edited|✓|✗|-|\*)" | head -20 || echo "$result" | head -10
    else
        warn "  ✗ Could not apply automatically"
        [[ -n "$result" ]] && echo "    Error: $(echo "$result" | head -1)"
    fi
}

# Parse user selection (e.g., "1,3,5" or "1-3")
parse_selection() {
    local input="$1"
    local -a selected=()

    input=$(echo "$input" | tr ',' ' ')

    for item in $input; do
        if [[ "$item" == *-* ]]; then
            local start=${item%-*}
            local end=${item#*-}
            for ((i=start; i<=end; i++)); do
                selected+=("$i")
            done
        else
            selected+=("$item")
        fi
    done

    echo "${selected[@]}"
}

# Check if input looks like a number selection
is_number_selection() {
    local input="$1"
    # Matches: 1 | 1,2,3 | 1-3 | 1,3-5,7 | etc
    [[ "$input" =~ ^[0-9,\ -]+$ ]]
}

# ═══════════════════════════════════════════════════════════════
# OPTIMIZATION HANDLING (Auto-apply or Interactive Review)
# ═══════════════════════════════════════════════════════════════

collect_optimizations

if [[ ${#OPT_ISSUES[@]} -eq 0 ]]; then
    echo "No optimizations found in analysis."
    echo ""
    echo "📁 Files: $METRICS_FILE"
    # Continue to module detection
else
    current_version=$(get_current_version)

    if $REVIEW_MODE; then
        # ─────────────────────────────────────────────────────────────
        # INTERACTIVE REVIEW MODE (--review flag)
        # ─────────────────────────────────────────────────────────────
        while true; do
            divider
            display_optimizations

            echo "────────────────────────────────────────────────────────────────"
            echo "Pipeline v$current_version"
            echo ""
            echo "Enter numbers to apply (1,3,5), feedback to revise, or 'done':"
            read -p "> " user_input

            # Trim whitespace
            user_input=$(echo "$user_input" | xargs)

            # Empty or 'done' → exit
            if [[ -z "$user_input" ]] || [[ "$user_input" == "done" ]]; then
                echo ""
                echo "Exiting without changes."
                echo "📁 Files: $METRICS_FILE"
                break
            fi

            # Number selection → apply improvements
            if is_number_selection "$user_input"; then
                read -ra selected_nums <<< "$(parse_selection "$user_input")"

                echo ""
                echo "Selected ${#selected_nums[@]} improvement(s) to apply."
                read -p "Confirm? (y/N) " confirm
                if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
                    echo "Cancelled. Try again."
                    continue
                fi

                echo ""
                divider

                applied_count=0
                for num in "${selected_nums[@]}"; do
                    idx=$((num - 1))
                    if [[ $idx -ge 0 ]] && [[ $idx -lt ${#OPT_ISSUES[@]} ]]; then
                        apply_improvement "$idx"
                        applied_count=$((applied_count + 1))
                    else
                        warn "Invalid selection: $num"
                    fi
                    echo ""
                done

                # Bump version if changes were made
                if [[ $applied_count -gt 0 ]]; then
                    new_version=$(bump_version "$current_version")
                    change_desc="$applied_count improvements from analysis"
                    update_version "$current_version" "$new_version" "$change_desc"

                    # Git: create branch, commit, merge to dev
                    git_commit_version "$new_version" "$change_desc"

                    divider
                    header "COMPLETE"
                    echo ""
                    echo "✅ Applied: $applied_count improvement(s)"
                    echo "📦 Version: $current_version → $new_version"
                    echo ""
                    echo "Files updated:"
                    echo "  - $VERSION_FILE"
                    echo "  - $CLAUDEMD_FILE"
                    echo "  - $INIT_MANIFEST"
                    echo ""
                else
                    echo "No improvements were applied."
                fi
                break
            fi

            # Text feedback → revise with Claude
            if revise_optimizations "$user_input"; then
                echo ""
                success "Optimizations revised based on your feedback."
            else
                warn "Could not revise. Try again or enter numbers/done."
            fi
        done
    else
        # ─────────────────────────────────────────────────────────────
        # AUTO-APPLY MODE (default)
        # ─────────────────────────────────────────────────────────────
        divider
        header "IMPROVEMENTS TO APPLY"
        echo ""
        echo "Pipeline v$current_version → will apply ${#OPT_ISSUES[@]} improvements:"
        echo ""

        # Show detailed list of what will be applied (grouped by category)
        echo "🎯 QUALITY:"
        has_quality=false
        for i in "${!OPT_ISSUES[@]}"; do
            if [[ "${OPT_CATEGORIES[$i]}" == "quality" ]]; then
                has_quality=true
                local_idx=$((i + 1))
                echo "  [$local_idx] [${OPT_PRIORITIES[$i]}] ${OPT_ISSUES[$i]}"
                echo "      → ${OPT_FIXES[$i]}"
                echo ""
            fi
        done
        $has_quality || echo "  (none)"
        echo ""

        echo "⚡ SPEED:"
        has_speed=false
        for i in "${!OPT_ISSUES[@]}"; do
            if [[ "${OPT_CATEGORIES[$i]}" == "speed" ]]; then
                has_speed=true
                local_idx=$((i + 1))
                echo "  [$local_idx] [${OPT_PRIORITIES[$i]}] ${OPT_ISSUES[$i]}"
                echo "      → ${OPT_FIXES[$i]}"
                echo ""
            fi
        done
        $has_speed || echo "  (none)"
        echo ""

        echo "💰 COST:"
        has_cost=false
        for i in "${!OPT_ISSUES[@]}"; do
            if [[ "${OPT_CATEGORIES[$i]}" == "cost" ]]; then
                has_cost=true
                local_idx=$((i + 1))
                echo "  [$local_idx] [${OPT_PRIORITIES[$i]}] ${OPT_ISSUES[$i]}"
                echo "      → ${OPT_FIXES[$i]}"
                echo ""
            fi
        done
        $has_cost || echo "  (none)"
        echo ""

        echo "📝 COMMAND:"
        has_command=false
        for i in "${!OPT_ISSUES[@]}"; do
            if [[ "${OPT_CATEGORIES[$i]}" == "command" ]]; then
                has_command=true
                local_idx=$((i + 1))
                echo "  [$local_idx] [${OPT_PRIORITIES[$i]}] ${OPT_ISSUES[$i]}"
                echo "      → ${OPT_FIXES[$i]}"
                echo ""
            fi
        done
        $has_command || echo "  (none)"
        echo ""

        divider
        info "Applying all improvements..."
        echo ""

        applied_count=0
        for i in "${!OPT_ISSUES[@]}"; do
            apply_improvement "$i"
            applied_count=$((applied_count + 1))
            echo ""
        done

        # Bump version
        if [[ $applied_count -gt 0 ]]; then
            new_version=$(bump_version "$current_version")
            change_desc="$applied_count improvements from analysis"
            update_version "$current_version" "$new_version" "$change_desc"

            # Git: create branch, commit, merge to dev
            git_commit_version "$new_version" "$change_desc"

            divider
            header "COMPLETE"
            echo ""
            echo "✅ Applied: $applied_count improvement(s)"
            echo "📦 Version: $current_version → $new_version"
            echo ""
            echo "Files updated:"
            echo "  - $VERSION_FILE"
            echo "  - $CLAUDEMD_FILE"
            echo "  - $INIT_MANIFEST"
            echo ""
        fi
    fi
fi

# ═══════════════════════════════════════════════════════════════
# SELF-IMPROVEMENT SYSTEM - Cross-run pattern intelligence
# ═══════════════════════════════════════════════════════════════

echo ""
divider
header "MODULE LIBRARY & R&D ANALYSIS"
echo ""

# Get R&D evaluation across all archived analyses
evaluation=$(evaluate_all_patterns 30)

to_extract_count=$(echo "$evaluation" | jq '.to_extract | length')
to_build_count=$(echo "$evaluation" | jq '.to_build | length')
to_watch_count=$(echo "$evaluation" | jq '.to_watch | length')
monitoring_count=$(echo "$evaluation" | jq '.monitoring | length')

# Check for this run's patterns
declare -a THIS_RUN_PATTERNS=()
for analysis_file in "$ANALYSIS_DIR"/*-analysis.json; do
    [[ ! -f "$analysis_file" ]] && continue
    while IFS= read -r pattern; do
        [[ -z "$pattern" ]] && continue
        pattern_id=$(echo "$pattern" | jq -r '.pattern_id // empty')
        pattern_name=$(echo "$pattern" | jq -r '.name // empty')
        quality=$(echo "$pattern" | jq -r '.quality_score // 0')
        [[ -z "$pattern_id" ]] && continue
        THIS_RUN_PATTERNS+=("$pattern_id|$pattern_name|$quality")
    done < <(jq -c '.reusable_patterns[]?' "$analysis_file" 2>/dev/null)
done

# Display this run's patterns
if [[ ${#THIS_RUN_PATTERNS[@]} -gt 0 ]]; then
    echo "📋 PATTERNS IN THIS RUN:"
    for pattern in "${THIS_RUN_PATTERNS[@]}"; do
        IFS='|' read -r pid pname quality <<< "$pattern"
        if [[ "$quality" -ge 85 ]]; then
            echo "  ✅ $pname (${quality}%) → will extract to library"
        elif [[ "$quality" -ge 50 ]]; then
            echo "  ⚠️  $pname (${quality}%) → tracking for R&D"
        else
            echo "  ❌ $pname (${quality}%) → needs improvement"
        fi
    done
    echo ""
else
    echo "📋 PATTERNS IN THIS RUN:"
    echo "  (none detected)"
    echo ""
fi

# Display cross-run R&D intelligence
echo "📊 CROSS-RUN R&D INTELLIGENCE (last 30 days):"
echo ""

if [[ "$to_extract_count" -gt 0 ]]; then
    echo "✅ READY TO EXTRACT (quality ≥ 85%):"
    echo "$evaluation" | jq -r '.to_extract[] | "  \(.name)\n    Quality: \(.avg_quality)% | Frequency: \(.frequency) | R&D Value: \(.rd_value)\n    → Will extract as reusable module\n"'
fi

if [[ "$to_build_count" -gt 0 ]]; then
    echo "🔧 AUTO-BUILD TRIGGERED (R&D value ≥ 80):"
    echo "$evaluation" | jq -r '.to_build[] | "  \(.name)\n    Quality: \(.avg_quality)% | Frequency: \(.frequency) | R&D Value: \(.rd_value)\n    → Will generate improved module from failures\n"'
fi

if [[ "$to_watch_count" -gt 0 ]]; then
    echo "👀 WATCHING (R&D value 50-80):"
    echo "$evaluation" | jq -r '.to_watch[] | "  \(.name) - Quality: \(.avg_quality)% | Freq: \(.frequency) | R&D: \(.rd_value)"'
    echo ""
fi

if [[ "$monitoring_count" -gt 0 ]]; then
    echo "📈 MONITORING (R&D value < 50):"
    echo "$evaluation" | jq -r '.monitoring[] | "  \(.name) - Quality: \(.avg_quality)% | Freq: \(.frequency) | R&D: \(.rd_value)"'
    echo ""
fi

if [[ "$to_extract_count" -eq 0 ]] && [[ "$to_build_count" -eq 0 ]] && [[ "$to_watch_count" -eq 0 ]] && [[ "$monitoring_count" -eq 0 ]]; then
    echo "  No cross-run patterns detected yet."
    echo "  Run more analyses to build intelligence."
    echo ""
fi

# Auto-build modules if any qualify
if [[ "$to_extract_count" -gt 0 ]] || [[ "$to_build_count" -gt 0 ]]; then
    divider

    if $REVIEW_MODE; then
        # ─────────────────────────────────────────────────────────────
        # INTERACTIVE REVIEW MODE
        # ─────────────────────────────────────────────────────────────
        total_actions=$((to_extract_count + to_build_count))
        echo "────────────────────────────────────────────────────────────────"
        echo "$total_actions module(s) ready to build. Proceed? (Y/n)"
        read -p "> " confirm

        if [[ ! "$confirm" =~ ^[Nn]$ ]]; then
            echo ""
            info "Building modules..."
            auto_build_all "$PROJECT_PATH" 30
        else
            echo "Skipped module building."
        fi
    else
        # ─────────────────────────────────────────────────────────────
        # AUTO-BUILD MODE (default)
        # ─────────────────────────────────────────────────────────────
        total_actions=$((to_extract_count + to_build_count))
        info "Auto-building $total_actions module(s)..."
        echo ""

        auto_build_all "$PROJECT_PATH" 30
    fi

    echo ""
    echo "Use modules in future projects:"
    echo "  ./pipeline brainstorm <project> --use-module <module-id>"
fi

echo ""
echo "────────────────────────────────────────────────────────────────"
echo "Archive: ~/.pipeline/analysis-archive/"
echo "Modules: ~/.pipeline/modules/"
