#!/bin/bash
# Manifest management library - SINGLE SOURCE OF TRUTH
# All manifest operations MUST use these functions
#
# Usage: source lib/manifest.sh
#
# Functions:
#   manifest_validate <manifest_path>     - Validate manifest structure
#   manifest_get_phase_status <manifest> <phase>  - Get phase status
#   manifest_is_looping <manifest> <phase>        - Check if phase is looping
#   manifest_get_loops <manifest> <phase>         - Get loops array
#   manifest_get_current_loop <manifest> <phase>  - Get current loop name
#   manifest_count_loops <manifest> <phase> <status>  - Count loops by status
#   manifest_update_loop_status <manifest> <phase> <loop_id> <status>  - Update loop status
#   manifest_get_phase_commit <manifest> <phase>  - Get commit hash for phase
#   manifest_set_phase_commit <manifest> <phase> [commit]  - Set commit hash for phase
#   manifest_get_loop_commit <manifest> <phase> <loop_id>  - Get commit hash for loop
#   manifest_set_loop_commit <manifest> <phase> <loop_id> [commit]  - Set commit hash for loop

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ═══════════════════════════════════════════════════════════════
# VALIDATION
# ═══════════════════════════════════════════════════════════════

# Validate manifest has required structure
# Returns: 0 if valid, 1 if invalid (with error message)
manifest_validate() {
    local manifest="$1"

    if [[ ! -f "$manifest" ]]; then
        echo "ERROR: Manifest not found: $manifest" >&2
        return 1
    fi

    # Check it's valid JSON
    if ! jq empty "$manifest" 2>/dev/null; then
        echo "ERROR: Invalid JSON in manifest" >&2
        return 1
    fi

    # Check required top-level fields
    local has_project=$(jq -r 'has("project")' "$manifest")
    local has_pipeline=$(jq -r 'has("pipeline")' "$manifest")
    local has_phases=$(jq -r 'has("phases")' "$manifest")

    if [[ "$has_project" != "true" ]]; then
        echo "ERROR: Missing 'project' field" >&2
        return 1
    fi

    if [[ "$has_pipeline" != "true" ]]; then
        echo "ERROR: Missing 'pipeline' field" >&2
        return 1
    fi

    if [[ "$has_phases" != "true" ]]; then
        echo "ERROR: Missing 'phases' field" >&2
        return 1
    fi

    # Check Phase 2 has looping structure (if it exists)
    local phase2_exists=$(jq -r '.phases["2"] // null | type' "$manifest")
    if [[ "$phase2_exists" == "object" ]]; then
        local has_looping=$(jq -r '.phases["2"] | has("looping")' "$manifest")
        local has_loops=$(jq -r '.phases["2"] | has("loops")' "$manifest")

        if [[ "$has_looping" != "true" ]]; then
            echo "ERROR: Phase 2 missing 'looping' field (must be true)" >&2
            return 1
        fi

        if [[ "$has_loops" != "true" ]]; then
            echo "ERROR: Phase 2 missing 'loops' array" >&2
            return 1
        fi
    fi

    return 0
}

# ═══════════════════════════════════════════════════════════════
# PHASE OPERATIONS
# ═══════════════════════════════════════════════════════════════

# Get phase status
manifest_get_phase_status() {
    local manifest="$1"
    local phase="$2"
    jq -r ".phases[\"$phase\"].status // \"pending\"" "$manifest"
}

# Check if phase is looping
manifest_is_looping() {
    local manifest="$1"
    local phase="$2"
    local is_looping=$(jq -r ".phases[\"$phase\"].looping // false" "$manifest")
    [[ "$is_looping" == "true" ]]
}

# Get loop type
manifest_get_loop_type() {
    local manifest="$1"
    local phase="$2"
    jq -r ".phases[\"$phase\"].loop_type // \"cycle\"" "$manifest"
}

# ═══════════════════════════════════════════════════════════════
# LOOP OPERATIONS (Phase 2 epics)
# ═══════════════════════════════════════════════════════════════

# Get total loop count
manifest_count_loops_total() {
    local manifest="$1"
    local phase="$2"
    jq -r ".phases[\"$phase\"].loops | length" "$manifest"
}

# Count loops by status
manifest_count_loops() {
    local manifest="$1"
    local phase="$2"
    local status="$3"
    jq -r "[.phases[\"$phase\"].loops[] | select(.status == \"$status\")] | length" "$manifest"
}

# Get current loop (first non-complete)
manifest_get_current_loop() {
    local manifest="$1"
    local phase="$2"
    jq -r ".phases[\"$phase\"].loops[] | select(.status != \"complete\") | .name" "$manifest" | head -1
}

# Get current loop ID (first non-complete)
manifest_get_current_loop_id() {
    local manifest="$1"
    local phase="$2"
    jq -r ".phases[\"$phase\"].loops[] | select(.status != \"complete\") | .id" "$manifest" | head -1
}

# Update loop status
manifest_update_loop_status() {
    local manifest="$1"
    local phase="$2"
    local loop_id="$3"
    local new_status="$4"
    local timestamp=$(date -Iseconds)

    local tmp="${manifest}.tmp"

    if [[ "$new_status" == "complete" ]]; then
        jq "(.phases[\"$phase\"].loops[] | select(.id == $loop_id)) |= . + {status: \"$new_status\", completedAt: \"$timestamp\"}" "$manifest" > "$tmp"
    elif [[ "$new_status" == "in-progress" ]]; then
        jq "(.phases[\"$phase\"].loops[] | select(.id == $loop_id)) |= . + {status: \"$new_status\", startedAt: \"$timestamp\"}" "$manifest" > "$tmp"
    else
        jq "(.phases[\"$phase\"].loops[] | select(.id == $loop_id)) |= . + {status: \"$new_status\"}" "$manifest" > "$tmp"
    fi

    mv "$tmp" "$manifest"
}

# Update phase status
manifest_update_phase_status() {
    local manifest="$1"
    local phase="$2"
    local new_status="$3"
    local timestamp=$(date -Iseconds)

    local tmp="${manifest}.tmp"

    if [[ "$new_status" == "complete" ]]; then
        jq ".phases[\"$phase\"].status = \"$new_status\" | .phases[\"$phase\"].completedAt = \"$timestamp\"" "$manifest" > "$tmp"
    elif [[ "$new_status" == "in-progress" ]]; then
        jq ".phases[\"$phase\"].status = \"$new_status\" | .phases[\"$phase\"].startedAt = \"$timestamp\"" "$manifest" > "$tmp"
    else
        jq ".phases[\"$phase\"].status = \"$new_status\"" "$manifest" > "$tmp"
    fi

    mv "$tmp" "$manifest"
}

# ═══════════════════════════════════════════════════════════════
# MANIFEST CREATION
# ═══════════════════════════════════════════════════════════════

# Create initial manifest with proper structure
# Usage: manifest_create <output_path> <project_name> <project_path> <pipeline_type> <epics_json>
manifest_create() {
    local output="$1"
    local project_name="$2"
    local project_path="$3"
    local pipeline_type="${4:-webReact-fullStack}"
    local epics_json="${5:-[]}"

    local pipeline_version=$(cat "$SCRIPT_DIR/../VERSION" 2>/dev/null | head -1 | tr -d '[:space:]' || echo "5.2")
    local timestamp=$(date -Iseconds)

    # Build loops array from epics
    local loops_json=$(echo "$epics_json" | jq '[.[] | {id: .id, name: .name, status: "pending", stories: (.stories // []), tests: (.tests // [])}]')

    cat > "$output" << EOF
{
  "project": {
    "name": "$project_name",
    "path": "$project_path",
    "version": "1.0.0",
    "created": "$timestamp"
  },
  "pipeline": {
    "type": "$pipeline_type",
    "version": "$pipeline_version",
    "mode": "new-project"
  },
  "phases": {
    "0a": { "status": "pending" },
    "0b": { "status": "pending" },
    "1": { "status": "pending" },
    "2": {
      "status": "pending",
      "looping": true,
      "loop_type": "epic",
      "current_loop": 1,
      "loops": $loops_json
    },
    "3": { "status": "pending" }
  }
}
EOF
}

# ═══════════════════════════════════════════════════════════════
# COMMIT TRACKING (for analysis checkpoints)
# ═══════════════════════════════════════════════════════════════

# Get current git commit hash
manifest_get_current_commit() {
    local project_path="$1"
    git -C "$project_path" rev-parse HEAD 2>/dev/null || echo ""
}

# Get commit hash for a phase
manifest_get_phase_commit() {
    local manifest="$1"
    local phase="$2"
    jq -r ".phases[\"$phase\"].commit // \"\"" "$manifest"
}

# Set commit hash for a phase (call after phase completion)
manifest_set_phase_commit() {
    local manifest="$1"
    local phase="$2"
    local commit="${3:-}"

    # If no commit provided, get current HEAD
    if [[ -z "$commit" ]]; then
        local project_path=$(jq -r '.project.path' "$manifest")
        commit=$(manifest_get_current_commit "$project_path")
    fi

    [[ -z "$commit" ]] && return 1

    local tmp="${manifest}.tmp"
    jq ".phases[\"$phase\"].commit = \"$commit\"" "$manifest" > "$tmp"
    mv "$tmp" "$manifest"
}

# Get commit hash for a loop (epic)
manifest_get_loop_commit() {
    local manifest="$1"
    local phase="$2"
    local loop_id="$3"
    jq -r ".phases[\"$phase\"].loops[] | select(.id == $loop_id) | .commit // \"\"" "$manifest"
}

# Set commit hash for a loop (call after epic completion)
manifest_set_loop_commit() {
    local manifest="$1"
    local phase="$2"
    local loop_id="$3"
    local commit="${4:-}"

    # If no commit provided, get current HEAD
    if [[ -z "$commit" ]]; then
        local project_path=$(jq -r '.project.path' "$manifest")
        commit=$(manifest_get_current_commit "$project_path")
    fi

    [[ -z "$commit" ]] && return 1

    local tmp="${manifest}.tmp"
    jq "(.phases[\"$phase\"].loops[] | select(.id == $loop_id)).commit = \"$commit\"" "$manifest" > "$tmp"
    mv "$tmp" "$manifest"
}

# ═══════════════════════════════════════════════════════════════
# HELPER: Print manifest summary
# ═══════════════════════════════════════════════════════════════

manifest_summary() {
    local manifest="$1"

    echo "=== Manifest Summary ==="
    echo "Project: $(jq -r '.project.name' "$manifest")"
    echo "Pipeline: $(jq -r '.pipeline.type' "$manifest") v$(jq -r '.pipeline.version' "$manifest")"
    echo ""
    echo "Phases:"
    for phase in 0a 0b 1 2 3; do
        local status=$(manifest_get_phase_status "$manifest" "$phase")
        printf "  Phase %s: %s\n" "$phase" "$status"

        if manifest_is_looping "$manifest" "$phase"; then
            local total=$(manifest_count_loops_total "$manifest" "$phase")
            local complete=$(manifest_count_loops "$manifest" "$phase" "complete")
            local current=$(manifest_get_current_loop "$manifest" "$phase")
            echo "    Loops: $complete/$total complete"
            [[ -n "$current" ]] && echo "    Current: $current"
        fi
    done
}
