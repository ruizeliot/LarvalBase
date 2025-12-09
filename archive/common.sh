#!/bin/bash
# Common utilities for pipeline v5.0
# Source this file: source "$(dirname "$0")/lib/common.sh"

# Pipeline version - read from VERSION file (single source of truth)
_COMMON_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$_COMMON_DIR/../VERSION" ]; then
    PIPELINE_VERSION=$(cat "$_COMMON_DIR/../VERSION" | tr -d '[:space:]')
else
    PIPELINE_VERSION="5.0"
fi

# Colors for output (if terminal supports it)
if [ -t 1 ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    NC='\033[0m' # No Color
else
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    NC=''
fi

# Print styled header
print_header() {
    local title="$1"
    echo "════════════════════════════════════════════════════════════════"
    echo "$title"
    echo "════════════════════════════════════════════════════════════════"
}

# Print styled step box
print_step_box() {
    local step="$1"
    local mode="${2:-}"
    echo ""
    echo "┌──────────────────────────────────────────────────────────────┐"
    if [ -n "$mode" ]; then
        echo "│ Running Step: $step ($mode mode)"
    else
        echo "│ Running Step: $step"
    fi
    echo "└──────────────────────────────────────────────────────────────┘"
    echo ""
}

# Print error and exit
die() {
    echo -e "${RED}Error:${NC} $1" >&2
    exit "${2:-1}"
}

# Print warning
warn() {
    echo -e "${YELLOW}Warning:${NC} $1" >&2
}

# Print info
info() {
    echo -e "${BLUE}Info:${NC} $1"
}

# Print success
success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Validate project path exists
validate_project_path() {
    local project_path="$1"
    local create_if_missing="${2:-false}"

    if [ -z "$project_path" ]; then
        die "Project path is required"
    fi

    if [ ! -d "$project_path" ]; then
        if [ "$create_if_missing" = "true" ]; then
            echo "Creating project directory: $project_path"
            mkdir -p "$project_path"
        else
            die "Project directory not found: $project_path"
        fi
    fi
}

# Pre-flight validation for pipeline start
# Checks that required docs exist
preflight_check() {
    local project_path="$1"
    local mode="${2:-new}"
    local errors=0

    echo "Running pre-flight checks..."

    # Check user-stories.md exists
    if [ ! -f "$project_path/docs/user-stories.md" ]; then
        warn "docs/user-stories.md not found (run brainstorm first)"
        errors=$((errors + 1))
    else
        success "docs/user-stories.md found"
    fi

    # Check brainstorm-notes.md exists
    if [ ! -f "$project_path/docs/brainstorm-notes.md" ]; then
        warn "docs/brainstorm-notes.md not found (run brainstorm first)"
        errors=$((errors + 1))
    else
        success "docs/brainstorm-notes.md found"
    fi

    # For feature mode, check existing project structure
    if [ "$mode" = "feature" ]; then
        if [ ! -d "$project_path/src" ] && [ ! -d "$project_path/app" ]; then
            warn "No src/ or app/ directory found (is this an existing project?)"
            errors=$((errors + 1))
        else
            success "Project source directory found"
        fi
    fi

    if [ $errors -gt 0 ]; then
        echo ""
        warn "$errors pre-flight check(s) failed"
        return 1
    fi

    success "All pre-flight checks passed"
    return 0
}

# Get or create run ID
# Usage: RUN_ID=$(get_or_create_run_id "$PROJECT_PATH")
get_or_create_run_id() {
    local project_path="$1"
    local current_run_file="$project_path/.pipeline/current-run.txt"

    mkdir -p "$project_path/.pipeline"

    if [ -f "$current_run_file" ]; then
        local existing_run=$(cat "$current_run_file")
        local existing_meta="$project_path/.pipeline/runs/$existing_run/metadata.json"
        if [ -f "$existing_meta" ]; then
            local existing_status=$(jq -r '.status' "$existing_meta")
            if [ "$existing_status" = "running" ]; then
                echo "$existing_run"
                return 0
            fi
        fi
    fi

    # Create new run ID
    local run_id=$(date +%Y%m%d-%H%M%S)
    mkdir -p "$project_path/.pipeline/runs/$run_id"
    echo "$run_id" > "$current_run_file"
    echo "$run_id"
}

# Create run metadata
# Usage: create_run_metadata "$PROJECT_PATH" "$RUN_ID" "$RUN_TYPE" "$START_STEP"
create_run_metadata() {
    local project_path="$1"
    local run_id="$2"
    local run_type="$3"
    local start_step="${4:-0b}"
    local run_dir="$project_path/.pipeline/runs/$run_id"
    local start_iso=$(date -Iseconds)

    mkdir -p "$run_dir"

    cat > "$run_dir/metadata.json" << EOF
{
  "runId": "$run_id",
  "type": "$run_type",
  "projectPath": "$project_path",
  "startStep": "$start_step",
  "startedAt": "$start_iso",
  "steps": ["0b", "1", "2", "3"],
  "status": "running",
  "pipelineVersion": "$PIPELINE_VERSION"
}
EOF
}

# Update run metadata with completion info
# Usage: complete_run_metadata "$PROJECT_PATH" "$RUN_ID" "$STATUS"
complete_run_metadata() {
    local project_path="$1"
    local run_id="$2"
    local status="${3:-complete}"
    local run_dir="$project_path/.pipeline/runs/$run_id"
    local end_iso=$(date -Iseconds)

    if [ -f "$run_dir/metadata.json" ]; then
        jq --arg endedAt "$end_iso" \
           --arg status "$status" \
           '. + {endedAt: $endedAt, status: $status}' \
           "$run_dir/metadata.json" > "$run_dir/metadata.tmp" && mv "$run_dir/metadata.tmp" "$run_dir/metadata.json"
    fi
}

# Map step number to command file
# Usage: CMD_FILE=$(get_command_file "$STEP" "$MODE")
get_command_file() {
    local step="$1"
    local mode="${2:-new}"
    local suffix=""

    [ "$mode" = "feature" ] && suffix="-feature"

    case "$step" in
        "test")         echo "test-pipeline-simple.md" ;;
        "0a")           echo "0a-pipeline-v4-brainstorm${suffix}.md" ;;
        "0b")           echo "0b-pipeline-v4-technical${suffix}.md" ;;
        "1")            echo "1-pipeline-v4-bootstrap${suffix}.md" ;;
        "2")            echo "2-pipeline-v4-implementEpic${suffix}.md" ;;
        "3")            echo "3-pipeline-v4-finalize${suffix}.md" ;;
        *)              echo "" ;;
    esac
}

# Get step display name
get_step_name() {
    local step="$1"
    case "$step" in
        "0a")   echo "Brainstorm" ;;
        "0b")   echo "Technical Specs" ;;
        "1")    echo "Bootstrap" ;;
        "2")    echo "Implement Epic" ;;
        "3")    echo "Finalize" ;;
        *)      echo "Step $step" ;;
    esac
}

# Format duration in human readable format
# Usage: format_duration 3661  # outputs "1h 1m 1s"
format_duration() {
    local seconds="$1"
    local hours=$((seconds / 3600))
    local minutes=$(((seconds % 3600) / 60))
    local secs=$((seconds % 60))

    if [ $hours -gt 0 ]; then
        printf '%dh %dm %ds' $hours $minutes $secs
    elif [ $minutes -gt 0 ]; then
        printf '%dm %ds' $minutes $secs
    else
        printf '%ds' $secs
    fi
}

# Check if jq is available
require_jq() {
    if ! command -v jq &> /dev/null; then
        die "jq is required but not installed. Install with: apt install jq"
    fi
}

# Check if expect is available
require_expect() {
    if ! command -v expect &> /dev/null; then
        die "expect is required but not installed. Install with: apt install expect"
    fi
}

# Aliases for common functions
header() { print_header "$@"; }

# Print divider line
divider() {
    echo "────────────────────────────────────────────────────────────────"
}
