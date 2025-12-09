#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# SEMANTIC MODULE MATCHER
# Uses Claude to understand project intent and match to modules
# ═══════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODULES_DIR="${MODULES_DIR:-$HOME/.pipeline/modules}"
CATALOG_FILE="${MODULES_DIR}/catalog.json"

# Source file cache
source "$SCRIPT_DIR/file-cache.sh" 2>/dev/null || true
# Get all available modules with their descriptions
get_module_catalog() {
    if [[ ! -f "$CATALOG_FILE" ]]; then
        echo "[]"
        return
    fi

    # Build rich catalog with module details
    local catalog="[]"

    while IFS= read -r module_id; do
        [[ -z "$module_id" ]] && continue
        local module_dir="$MODULES_DIR/$module_id"
        local module_json="$module_dir/module.json"

        if [[ -f "$module_json" ]]; then
            local name=$(jq -r '.name // .id' "$module_json")
            local description=$(jq -r '.description // "No description"' "$module_json")
            local tags=$(jq -r '.tags // [] | join(", ")' "$module_json")
            local quality=$(jq -r '.quality_score // "N/A"' "$module_json")

            # Check for README
            local readme=""
            if [[ -f "$module_dir/README.md" ]]; then
                readme=$(head -50 "$module_dir/README.md")
            fi

            catalog=$(echo "$catalog" | jq --arg id "$module_id" \
                --arg name "$name" \
                --arg desc "$description" \
                --arg tags "$tags" \
                --arg quality "$quality" \
                --arg readme "$readme" \
                '. + [{id: $id, name: $name, description: $desc, tags: $tags, quality: $quality, readme: $readme}]')
        fi
    done < <(jq -r '.modules[].id' "$CATALOG_FILE" 2>/dev/null)

    echo "$catalog"
}

# Semantic match using Claude
# Usage: semantic_match <project_context>
# Returns: JSON array of matching modules with relevance scores
semantic_match() {
    local project_context="$1"
    local catalog=$(get_module_catalog)

    if [[ "$catalog" == "[]" ]]; then
        echo '{"matches": [], "reason": "No modules in library"}'
        return
    fi

    local prompt="You are matching a project's needs to available reusable modules.

PROJECT CONTEXT:
$project_context

AVAILABLE MODULES:
$catalog

TASK:
Analyze the project context and identify which modules are relevant.
Consider:
- Direct matches (project mentions websocket, module is websocket)
- Semantic matches (project says 'real-time multiplayer' → websocket module)
- Implied needs (multiplayer game → likely needs game-state, websocket)

Return ONLY valid JSON (no markdown):
{
  \"matches\": [
    {
      \"module_id\": \"the-module-id\",
      \"relevance\": 0-100,
      \"reason\": \"Why this module matches\",
      \"usage_suggestion\": \"How to use it in this project\"
    }
  ],
  \"implied_needs\": [\"patterns needed but no module exists\"],
  \"warnings\": [\"potential issues to watch for\"]
}

Only include modules with relevance >= 50. Sort by relevance descending."

    local result
    result=$(claude --model haiku --print -p "$prompt" 2>&1 || true)

    # Extract JSON
    local json
    json=$(echo "$result" | grep -Pzo '\{[\s\S]*\}' | tr -d '\0' || echo '{"matches": []}')

    if echo "$json" | jq . > /dev/null 2>&1; then
        echo "$json"
    else
        echo '{"matches": [], "error": "Failed to parse match results"}'
    fi
}

# Quick keyword match (fast, no Claude call)
# Usage: keyword_match <project_context>
keyword_match() {
    local project_context="$1"
    local context_lower=$(echo "$project_context" | tr '[:upper:]' '[:lower:]')

    local matches="[]"

    while IFS= read -r module_id; do
        [[ -z "$module_id" ]] && continue
        local module_dir="$MODULES_DIR/$module_id"
        local module_json="$module_dir/module.json"

        if [[ -f "$module_json" ]]; then
            local tags=$(jq -r '.tags // [] | .[]' "$module_json" | tr '[:upper:]' '[:lower:]')
            local name=$(jq -r '.name // ""' "$module_json" | tr '[:upper:]' '[:lower:]')

            # Check if any tag or name appears in context
            local matched=false
            for tag in $tags $name $module_id; do
                if [[ "$context_lower" == *"$tag"* ]]; then
                    matched=true
                    break
                fi
            done

            if $matched; then
                matches=$(echo "$matches" | jq --arg id "$module_id" '. + [$id]')
            fi
        fi
    done < <(jq -r '.modules[].id' "$CATALOG_FILE" 2>/dev/null)

    echo "$matches"
}

# Get project context from docs
# Usage: get_project_context <project_path>
get_project_context() {
    local project_path="$1"
    local context=""

    # Read available docs (using cache if available)
    local docs=(
        "$project_path/docs/brainstorm-notes.md"
        "$project_path/docs/user-stories.md"
        "$project_path/docs/e2e-test-specs.md"
        "$project_path/docs/tech-stack.md"
        "$project_path/docs/requirements.md"
    )

    for doc in "${docs[@]}"; do
        if [[ -f "$doc" ]]; then
            local content
            if type cached_read &>/dev/null; then
                content=$(cached_read "$doc" 100)
            else
                content=$(head -100 "$doc")
            fi
            context+="
=== $(basename "$doc") ===
$content
"
        fi
    done

    # Also check manifest (using cache)
    if [[ -f "$project_path/.pipeline/manifest.json" ]]; then
        local manifest_content
        if type cached_read &>/dev/null; then
            manifest_content=$(cached_read "$project_path/.pipeline/manifest.json")
        else
            manifest_content=$(cat "$project_path/.pipeline/manifest.json")
        fi
        local epics=$(echo "$manifest_content" | jq -r '.epics[]?.name // empty' 2>/dev/null | head -10)
        if [[ -n "$epics" ]]; then
            context+="
=== Epics ===
$epics
"
        fi
    fi

    echo "$context"
}

# Main function: Find relevant modules for a project
# Usage: find_relevant_modules <project_path> [--quick]
find_relevant_modules() {
    local project_path="$1"
    local quick_mode="${2:-}"

    local context=$(get_project_context "$project_path")

    if [[ -z "$context" ]]; then
        echo '{"matches": [], "reason": "No project docs found"}'
        return
    fi

    if [[ "$quick_mode" == "--quick" ]]; then
        local keywords=$(keyword_match "$context")
        echo "{\"matches\": $keywords, \"mode\": \"keyword\"}"
    else
        semantic_match "$context"
    fi
}

# Format matches for injection into prompts
# Usage: format_matches_for_prompt <matches_json>
format_matches_for_prompt() {
    local matches_json="$1"

    local count=$(echo "$matches_json" | jq '.matches | length')

    if [[ "$count" -eq 0 ]]; then
        echo ""
        return
    fi

    local output="
## AVAILABLE REUSABLE MODULES

The following proven modules from the library match this project's needs:

"

    while IFS= read -r match; do
        local module_id=$(echo "$match" | jq -r '.module_id')
        local relevance=$(echo "$match" | jq -r '.relevance')
        local reason=$(echo "$match" | jq -r '.reason')
        local suggestion=$(echo "$match" | jq -r '.usage_suggestion')
        local module_path="$MODULES_DIR/$module_id"

        output+="### $module_id (${relevance}% match)
**Why:** $reason
**How to use:** $suggestion
**Path:** $module_path

"
    done < <(echo "$matches_json" | jq -c '.matches[]')

    # Add implied needs
    local implied=$(echo "$matches_json" | jq -r '.implied_needs // [] | .[]')
    if [[ -n "$implied" ]]; then
        output+="
## PATTERNS NEEDED (no module exists yet)
"
        echo "$implied" | while read -r need; do
            output+="- $need
"
        done
    fi

    # Add warnings
    local warnings=$(echo "$matches_json" | jq -r '.warnings // [] | .[]')
    if [[ -n "$warnings" ]]; then
        output+="
## WARNINGS
"
        echo "$warnings" | while read -r warning; do
            output+="- ⚠️ $warning
"
        done
    fi

    echo "$output"
}
