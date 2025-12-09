#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# AUTO MODULE BUILDER
# Automatically builds modules from successes or generates from failures
# ═══════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/file-cache.sh" 2>/dev/null || true
source "$SCRIPT_DIR/analysis-archive.sh"
source "$SCRIPT_DIR/rd-scoring.sh"

MODULES_DIR="${MODULES_DIR:-$HOME/.pipeline/modules}"
CATALOG_FILE="${MODULES_DIR}/catalog.json"

# Initialize modules directory
init_modules() {
    mkdir -p "$MODULES_DIR"

    if [[ ! -f "$CATALOG_FILE" ]]; then
        echo '{"modules": [], "last_updated": "'"$(date -Iseconds)"'"}' > "$CATALOG_FILE"
    fi
}

# Extract module from successful implementation
# Usage: extract_success_module <project_path> <pattern_id> <pattern_name> <files_json>
extract_success_module() {
    local project_path="$1"
    local pattern_id="$2"
    local pattern_name="$3"
    local files_json="$4"

    init_modules

    local module_dir="$MODULES_DIR/$pattern_id"
    mkdir -p "$module_dir"

    echo "  Extracting: $pattern_name"

    # Copy relevant files
    local file_count=0
    while IFS= read -r file; do
        [[ -z "$file" ]] && continue
        local src="$project_path/$file"
        if [[ -f "$src" ]]; then
            local dest_dir="$module_dir/$(dirname "$file")"
            mkdir -p "$dest_dir"
            cp "$src" "$dest_dir/"
            ((file_count++))
        fi
    done < <(echo "$files_json" | jq -r '.[]?' 2>/dev/null)

    # Create module metadata
    cat > "$module_dir/module.json" << EOF
{
    "id": "$pattern_id",
    "name": "$pattern_name",
    "version": "1.0.0",
    "source": "extracted",
    "source_project": "$project_path",
    "extracted_at": "$(date -Iseconds)",
    "files_count": $file_count,
    "tags": ["$pattern_id"],
    "description": "Extracted from successful implementation"
}
EOF

    # Update catalog
    update_catalog "$pattern_id" "$pattern_name" "extracted"

    echo "$module_dir"
}

# Generate module from failed attempts using Claude
# Usage: generate_failure_module <pattern_id> <pattern_name> <struggles_json>
generate_failure_module() {
    local pattern_id="$1"
    local pattern_name="$2"
    local struggles_json="$3"

    init_modules

    local module_dir="$MODULES_DIR/$pattern_id"
    mkdir -p "$module_dir"

    echo "  Generating improved module: $pattern_name"

    # Get all struggle areas and past attempts
    local struggle_areas=$(get_struggle_areas "$pattern_id" 90)

    # Build prompt for Claude to generate proper module
    local prompt="You are building a REUSABLE MODULE for future projects.

PATTERN: $pattern_id - $pattern_name

PROBLEM CONTEXT:
This pattern has struggled in multiple projects. Here are the issues encountered:

$struggles_json

ADDITIONAL STRUGGLE AREAS FROM ARCHIVE:
$struggle_areas

YOUR TASK:
Create a production-ready, reusable implementation that solves these problems.

REQUIREMENTS:
1. Create files for a complete, working implementation
2. Include both client-side (React/TypeScript) and server-side (Express/Node) code
3. Include proper error handling for ALL identified struggle areas
4. Include TypeScript types
5. Include basic tests
6. Make it easy to integrate into new projects

OUTPUT FORMAT:
For each file, output:
=== FILE: path/to/file.ts ===
<file contents>
=== END FILE ===

Create these files:
- client/hooks/use${pattern_name}.ts (React hook)
- client/components/${pattern_name}.tsx (React component if needed)
- server/routes/${pattern_id}.ts (Express routes)
- server/services/${pattern_id}.ts (Business logic)
- types/${pattern_id}.ts (Shared types)
- tests/${pattern_id}.test.ts (Basic tests)
- README.md (Integration instructions)

Focus on SOLVING THE IDENTIFIED PROBLEMS, not just basic implementation."

    # Call Claude to generate module
    local result
    result=$(claude --model opus --print -p "$prompt" 2>&1)

    if [[ -z "$result" ]]; then
        echo "  ✗ Failed to generate module"
        return 1
    fi

    # Parse output and create files
    local current_file=""
    local current_content=""
    local files_created=0

    while IFS= read -r line; do
        if [[ "$line" =~ ^===\ FILE:\ (.+)\ ===$ ]]; then
            # Save previous file if exists
            if [[ -n "$current_file" ]] && [[ -n "$current_content" ]]; then
                local dest="$module_dir/$current_file"
                mkdir -p "$(dirname "$dest")"
                echo "$current_content" > "$dest"
                ((files_created++))
            fi
            current_file="${BASH_REMATCH[1]}"
            current_content=""
        elif [[ "$line" == "=== END FILE ===" ]]; then
            # Save current file
            if [[ -n "$current_file" ]] && [[ -n "$current_content" ]]; then
                local dest="$module_dir/$current_file"
                mkdir -p "$(dirname "$dest")"
                echo "$current_content" > "$dest"
                ((files_created++))
            fi
            current_file=""
            current_content=""
        elif [[ -n "$current_file" ]]; then
            current_content+="$line"$'\n'
        fi
    done <<< "$result"

    # Create module metadata
    cat > "$module_dir/module.json" << EOF
{
    "id": "$pattern_id",
    "name": "$pattern_name",
    "version": "1.0.0",
    "source": "generated",
    "generated_at": "$(date -Iseconds)",
    "files_count": $files_created,
    "tags": ["$pattern_id", "auto-generated"],
    "description": "Generated from analysis of failed attempts",
    "struggles_addressed": $struggles_json
}
EOF

    # Update catalog
    update_catalog "$pattern_id" "$pattern_name" "generated"

    echo "$module_dir"
}

# Update module catalog
update_catalog() {
    local pattern_id="$1"
    local pattern_name="$2"
    local source_type="$3"

    jq --arg pid "$pattern_id" \
       --arg name "$pattern_name" \
       --arg source "$source_type" \
       --arg timestamp "$(date -Iseconds)" \
       '
       .modules = [.modules[] | select(.id != $pid)] |
       .modules += [{id: $pid, name: $name, source: $source, updated_at: $timestamp}] |
       .last_updated = $timestamp
       ' "$CATALOG_FILE" > "${CATALOG_FILE}.tmp" && mv "${CATALOG_FILE}.tmp" "$CATALOG_FILE"
}

# Process all patterns needing action
# Usage: auto_build_all <project_path> [days_back]
auto_build_all() {
    local project_path="$1"
    local days_back="${2:-30}"

    local evaluation=$(evaluate_all_patterns "$days_back")

    local extracted=0
    local generated=0

    # Process success extractions
    while IFS= read -r pattern; do
        [[ -z "$pattern" ]] && continue
        local pid=$(echo "$pattern" | jq -r '.pattern_id')
        local name=$(echo "$pattern" | jq -r '.name')

        # Get files from most recent successful analysis
        local files=$(get_pattern_files "$pid")

        if [[ -n "$files" ]] && [[ "$files" != "[]" ]]; then
            local result=$(extract_success_module "$project_path" "$pid" "$name" "$files")
            if [[ -n "$result" ]]; then
                echo "  ✓ Extracted: $name → $result"
                ((extracted++))
            fi
        fi
    done < <(echo "$evaluation" | jq -c '.to_extract[]?')

    # Process failure generations
    while IFS= read -r pattern; do
        [[ -z "$pattern" ]] && continue
        local pid=$(echo "$pattern" | jq -r '.pattern_id')
        local name=$(echo "$pattern" | jq -r '.name')

        # Get struggle information
        local struggles=$(get_struggle_areas "$pid" "$days_back")

        local result=$(generate_failure_module "$pid" "$name" "$struggles")
        if [[ -n "$result" ]]; then
            echo "  ✓ Generated: $name → $result"
            ((generated++))
        fi
    done < <(echo "$evaluation" | jq -c '.to_build[]?')

    echo ""
    echo "Module building complete: $extracted extracted, $generated generated"
}

# Get files associated with a pattern from archive
get_pattern_files() {
    local pattern_id="$1"

    init_archive

    # Find most recent high-quality occurrence
    for archive_file in $(ls -t "$ARCHIVE_DIR"/*.json 2>/dev/null); do
        [[ ! -f "$archive_file" ]] && continue
        [[ "$(basename "$archive_file")" == "patterns-index.json" ]] && continue

        local files=$(jq -c --arg pid "$pattern_id" '
            .reusable_patterns[]? |
            select(.pattern_id == $pid and .quality_score >= 80) |
            .files // []
        ' "$archive_file" 2>/dev/null | head -1)

        if [[ -n "$files" ]] && [[ "$files" != "[]" ]]; then
            echo "$files"
            return
        fi
    done

    echo "[]"
}

# List available modules
list_modules() {
    init_modules

    if [[ ! -f "$CATALOG_FILE" ]]; then
        echo "No modules available."
        return
    fi

    echo ""
    echo "Available Modules:"
    echo ""

    jq -r '.modules[] | "  \(.id)\n    Name: \(.name)\n    Source: \(.source)\n    Updated: \(.updated_at)\n"' "$CATALOG_FILE"

    local count=$(jq '.modules | length' "$CATALOG_FILE")
    echo "Total: $count module(s)"
    echo ""
    echo "Use with: ./pipeline brainstorm <project> --use-module <module-id>"
}

# Check if module exists
module_exists() {
    local pattern_id="$1"
    [[ -d "$MODULES_DIR/$pattern_id" ]] && [[ -f "$MODULES_DIR/$pattern_id/module.json" ]]
}

# Get module path
get_module_path() {
    local pattern_id="$1"
    if module_exists "$pattern_id"; then
        echo "$MODULES_DIR/$pattern_id"
    fi
}
