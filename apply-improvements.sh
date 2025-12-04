#!/bin/bash
# DEPRECATED: This functionality is now integrated into analyze-run.sh (v4.5)
# The analyze command now shows optimizations immediately and allows
# interactive revision via Claude Opus before applying.
#
# Use instead: ./pipeline analyze <project> [run-id]
#
# This file is kept for backward compatibility but may be removed in future versions.
#
# Original: Apply selected improvements from pipeline analysis
# Usage: ./apply-improvements.sh <analysis-dir>

echo "WARNING: apply-improvements.sh is deprecated."
echo "Use './pipeline analyze <project>' for the new interactive optimization flow."
echo ""
echo "Continuing with legacy flow..."
echo ""

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIPELINE_DIR="$(dirname "$SCRIPT_DIR")"

# Source common utilities
source "$SCRIPT_DIR/common.sh"

ANALYSIS_DIR="${1:-}"

if [[ -z "$ANALYSIS_DIR" ]] || [[ ! -d "$ANALYSIS_DIR" ]]; then
    echo "Usage: $0 <analysis-dir>"
    echo "Example: $0 /path/to/project/.pipeline/runs/20251125-101630/analysis"
    exit 1
fi

# Version file locations
VERSION_FILE="$PIPELINE_DIR/VERSION"
CLAUDEMD_FILE="$PIPELINE_DIR/CLAUDE.md"
INIT_MANIFEST="$PIPELINE_DIR/init-manifest.sh"

# Get current version
get_current_version() {
    if [[ -f "$VERSION_FILE" ]]; then
        cat "$VERSION_FILE"
    else
        # Extract from CLAUDE.md
        grep -oP '\*\*Version:\*\* \K[0-9.]+' "$CLAUDEMD_FILE" | head -1 || echo "4.4.0"
    fi
}

# Bump patch version (4.4 → 4.4.1, 4.4.1 → 4.4.2)
bump_version() {
    local current="$1"
    local major minor patch

    # Parse version
    IFS='.' read -r major minor patch <<< "$current"
    patch=${patch:-0}

    # Increment patch
    patch=$((patch + 1))

    echo "${major}.${minor}.${patch}"
}

# Collect all optimizations into numbered array
declare -a ALL_OPTIMIZATIONS=()
declare -a OPT_FILES=()
declare -a OPT_CATEGORIES=()
declare -a OPT_ISSUES=()
declare -a OPT_FIXES=()
declare -a OPT_PRIORITIES=()

collect_optimizations() {
    local idx=1

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

            OPT_FILES+=("$analysis_file")
            OPT_CATEGORIES+=("quality")
            OPT_ISSUES+=("$issue")
            OPT_FIXES+=("$fix")
            OPT_PRIORITIES+=("$priority")
            ALL_OPTIMIZATIONS+=("[$idx] 🎯 QUALITY ($priority): $issue")
            ((idx++))
        done < <(jq -c '.optimizations.quality[]?' "$analysis_file" 2>/dev/null)

        # Speed optimizations
        while IFS= read -r line; do
            [[ -z "$line" ]] && continue
            local issue=$(echo "$line" | jq -r '.issue // empty')
            local fix=$(echo "$line" | jq -r '.fix // empty')
            local priority=$(echo "$line" | jq -r '.priority // "medium"')
            [[ -z "$issue" ]] && continue

            OPT_FILES+=("$analysis_file")
            OPT_CATEGORIES+=("speed")
            OPT_ISSUES+=("$issue")
            OPT_FIXES+=("$fix")
            OPT_PRIORITIES+=("$priority")
            ALL_OPTIMIZATIONS+=("[$idx] ⚡ SPEED ($priority): $issue")
            ((idx++))
        done < <(jq -c '.optimizations.speed[]?' "$analysis_file" 2>/dev/null)

        # Cost optimizations
        while IFS= read -r line; do
            [[ -z "$line" ]] && continue
            local issue=$(echo "$line" | jq -r '.issue // empty')
            local fix=$(echo "$line" | jq -r '.fix // empty')
            local priority=$(echo "$line" | jq -r '.priority // "medium"')
            [[ -z "$issue" ]] && continue

            OPT_FILES+=("$analysis_file")
            OPT_CATEGORIES+=("cost")
            OPT_ISSUES+=("$issue")
            OPT_FIXES+=("$fix")
            OPT_PRIORITIES+=("$priority")
            ALL_OPTIMIZATIONS+=("[$idx] 💰 COST ($priority): $issue")
            ((idx++))
        done < <(jq -c '.optimizations.cost[]?' "$analysis_file" 2>/dev/null)

        # Command improvements (as single item)
        local cmd_improve=$(jq -r '.command_improvements // empty' "$analysis_file" 2>/dev/null)
        if [[ -n "$cmd_improve" ]] && [[ "$cmd_improve" != "null" ]]; then
            OPT_FILES+=("$analysis_file")
            OPT_CATEGORIES+=("command")
            OPT_ISSUES+=("Command improvement for $step_name")
            OPT_FIXES+=("$cmd_improve")
            OPT_PRIORITIES+=("medium")
            ALL_OPTIMIZATIONS+=("[$idx] 📝 COMMAND: $step_name improvements")
            ((idx++))
        fi
    done
}

# Display all optimizations
display_optimizations() {
    header "AVAILABLE IMPROVEMENTS"
    echo ""

    if [[ ${#ALL_OPTIMIZATIONS[@]} -eq 0 ]]; then
        echo "No optimizations found in analysis."
        return 1
    fi

    for opt in "${ALL_OPTIMIZATIONS[@]}"; do
        echo "$opt"
    done

    echo ""
    echo "Total: ${#ALL_OPTIMIZATIONS[@]} improvements available"
    echo ""
}

# Parse user selection (e.g., "1,3,5" or "1 3 5" or "1-3,5")
parse_selection() {
    local input="$1"
    local -a selected=()

    # Replace commas and spaces with newlines, handle ranges
    input=$(echo "$input" | tr ',' ' ')

    for item in $input; do
        if [[ "$item" == *-* ]]; then
            # Handle range (e.g., "1-3")
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

# Apply a single improvement using Claude
apply_improvement() {
    local idx=$1
    local category="${OPT_CATEGORIES[$idx]}"
    local issue="${OPT_ISSUES[$idx]}"
    local fix="${OPT_FIXES[$idx]}"

    info "Applying: $issue"

    # Build prompt for Claude to implement the fix
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

    # Run Claude to implement
    local result
    result=$(claude --model opus --print -p "$prompt" 2>&1) || true

    if [[ -n "$result" ]]; then
        success "  ✓ Applied"
        echo "$result" | head -20
    else
        warn "  ✗ Could not apply automatically"
    fi
}

# Update version in all relevant files
update_version() {
    local old_version="$1"
    local new_version="$2"
    local changes="$3"
    local date_now=$(date +%Y-%m-%d)

    info "Updating version: $old_version → $new_version"

    # Update VERSION file
    echo "$new_version" > "$VERSION_FILE"

    # Update CLAUDE.md version
    sed -i "s/\*\*Version:\*\* $old_version/**Version:** $new_version/" "$CLAUDEMD_FILE"

    # Update init-manifest.sh
    sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$new_version\"/" "$INIT_MANIFEST"

    # Add to version history in CLAUDE.md
    local history_entry="| $new_version | $date_now | $changes |"

    # Find the version history table and add entry after header
    if grep -q "| Version | Date | Changes |" "$CLAUDEMD_FILE"; then
        sed -i "/| Version | Date | Changes |/,/^$/{
            /|------/a\\
$history_entry
        }" "$CLAUDEMD_FILE"
    fi

    success "Version updated to $new_version"
}

# Main flow
main() {
    header "APPLY IMPROVEMENTS"
    echo ""

    # Collect optimizations
    collect_optimizations

    # Display
    if ! display_optimizations; then
        exit 0
    fi

    # Get current version
    local current_version=$(get_current_version)
    echo "Current version: $current_version"
    echo ""

    # User selection
    echo "Enter numbers to apply (e.g., '1,3,5' or '1-3' or 'all' or 'none'):"
    read -p "> " selection

    if [[ "$selection" == "none" ]] || [[ -z "$selection" ]]; then
        echo "No improvements selected."
        exit 0
    fi

    local -a selected_nums
    if [[ "$selection" == "all" ]]; then
        for ((i=1; i<=${#ALL_OPTIMIZATIONS[@]}; i++)); do
            selected_nums+=("$i")
        done
    else
        read -ra selected_nums <<< "$(parse_selection "$selection")"
    fi

    echo ""
    echo "Selected ${#selected_nums[@]} improvement(s) to apply."
    echo ""

    # Confirm
    read -p "Proceed? (y/N) " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi

    echo ""
    divider

    # Apply each selected improvement
    local applied_count=0
    local changes_summary=""

    for num in "${selected_nums[@]}"; do
        local idx=$((num - 1))  # Convert to 0-based
        if [[ $idx -ge 0 ]] && [[ $idx -lt ${#OPT_ISSUES[@]} ]]; then
            apply_improvement "$idx"
            ((applied_count++))
            changes_summary+="${OPT_CATEGORIES[$idx]}: ${OPT_ISSUES[$idx]%% *}; "
        else
            warn "Invalid selection: $num"
        fi
        echo ""
    done

    divider

    # Bump version if changes were made
    if [[ $applied_count -gt 0 ]]; then
        local new_version=$(bump_version "$current_version")
        local short_summary="${applied_count} improvements applied"

        update_version "$current_version" "$new_version" "$short_summary"

        echo ""
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
        echo "Run 'git diff' to review changes before committing."
    else
        echo "No improvements were applied."
    fi
}

main "$@"
