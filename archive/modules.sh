#!/bin/bash
# Module Library System for Pipeline v4.5
# Manages reusable code modules extracted from successful pipeline runs
#
# Usage:
#   source lib/modules.sh
#   list_modules
#   detect_patterns <analysis-json>
#   extract_module <project-path> <module-name> <pattern-type>
#   apply_module <target-project> <module-name>

set -euo pipefail

MODULES_DIR="${HOME}/.pipeline/modules"
CATALOG_FILE="${MODULES_DIR}/catalog.json"

# Ensure modules directory exists
init_modules() {
    mkdir -p "$MODULES_DIR"
    if [[ ! -f "$CATALOG_FILE" ]]; then
        echo '{"version":"1.0","modules":[],"lastUpdated":"'$(date -Iseconds)'"}' > "$CATALOG_FILE"
    fi
}

# List all available modules
list_modules() {
    init_modules
    echo "Available modules:"
    echo ""
    jq -r '.modules[] | "  [\(.name)] v\(.version) - \(.description)\n    Tags: \(.tags | join(", "))\n    Source: \(.source.project) (\(.source.date))\n"' "$CATALOG_FILE" 2>/dev/null || echo "  (none)"
}

# Get module by name
get_module() {
    local name="$1"
    jq -r ".modules[] | select(.name == \"$name\")" "$CATALOG_FILE"
}

# Check if module exists
module_exists() {
    local name="$1"
    jq -e ".modules[] | select(.name == \"$name\")" "$CATALOG_FILE" > /dev/null 2>&1
}

# Known patterns for auto-detection
# Returns JSON with pattern info if detected
detect_patterns() {
    local analysis_json="$1"

    # Patterns we look for
    local patterns='[
        {
            "id": "multi-user-websocket",
            "name": "Multi-User WebSocket System",
            "keywords": ["websocket", "socket.io", "real-time", "multiplayer", "multi-user"],
            "files": ["**/socket*.ts", "**/ws*.ts", "**/realtime*.ts"],
            "description": "Real-time multi-user communication with WebSocket"
        },
        {
            "id": "auth-session",
            "name": "Authentication & Session Management",
            "keywords": ["auth", "login", "session", "jwt", "token", "password"],
            "files": ["**/auth*.ts", "**/login*.ts", "**/session*.ts"],
            "description": "User authentication with session management"
        },
        {
            "id": "crud-api",
            "name": "CRUD API Pattern",
            "keywords": ["crud", "rest", "api", "create", "read", "update", "delete"],
            "files": ["**/routes/*.ts", "**/controllers/*.ts"],
            "description": "RESTful CRUD API endpoints"
        },
        {
            "id": "sqlite-repository",
            "name": "SQLite Repository Pattern",
            "keywords": ["sqlite", "database", "repository", "better-sqlite3"],
            "files": ["**/db/*.ts", "**/repository*.ts", "**/database*.ts"],
            "description": "SQLite database with repository pattern"
        },
        {
            "id": "react-form-validation",
            "name": "React Form with Validation",
            "keywords": ["form", "validation", "zod", "yup", "react-hook-form"],
            "files": ["**/components/*Form*.tsx", "**/hooks/useForm*.ts"],
            "description": "React forms with client and server validation"
        },
        {
            "id": "e2e-test-suite",
            "name": "Cypress E2E Test Suite",
            "keywords": ["cypress", "e2e", "test", "spec"],
            "files": ["cypress/e2e/*.cy.ts"],
            "description": "Comprehensive E2E test suite with Cypress"
        },
        {
            "id": "game-state-management",
            "name": "Game State Management",
            "keywords": ["game", "state", "turn", "round", "player", "score"],
            "files": ["**/game*.ts", "**/state*.ts"],
            "description": "Game state management with turns/rounds"
        }
    ]'

    echo "$patterns"
}

# Analyze a project and detect which patterns it implements
analyze_for_patterns() {
    local project_path="$1"
    local analysis_file="$2"

    local detected=()

    # Check for WebSocket/Socket.io
    if grep -rq "socket.io\|WebSocket\|ws://" "$project_path/server" 2>/dev/null || \
       grep -rq "socket.io-client\|useWebSocket" "$project_path/client" 2>/dev/null; then
        detected+=("multi-user-websocket")
    fi

    # Check for Auth
    if grep -rq "login\|authenticate\|session\|jwt\|bcrypt" "$project_path/server" 2>/dev/null; then
        detected+=("auth-session")
    fi

    # Check for SQLite
    if grep -rq "better-sqlite3\|sqlite3" "$project_path/server" 2>/dev/null; then
        detected+=("sqlite-repository")
    fi

    # Check for Game state
    if grep -rq "gameState\|GameSession\|turn\|round" "$project_path" 2>/dev/null; then
        detected+=("game-state-management")
    fi

    # Check for Cypress tests
    if [[ -d "$project_path/cypress" ]]; then
        local test_count=$(find "$project_path/cypress" -name "*.cy.ts" 2>/dev/null | wc -l)
        if [[ $test_count -gt 10 ]]; then
            detected+=("e2e-test-suite")
        fi
    fi

    # Return as JSON array
    printf '%s\n' "${detected[@]}" | jq -R . | jq -s .
}

# Extract a module from a project
extract_module() {
    local project_path="$1"
    local module_name="$2"
    local pattern_id="$3"
    local description="${4:-}"
    local tags="${5:-}"

    local module_dir="$MODULES_DIR/$module_name"
    local version="1.0.0"

    # Check if module already exists
    if [[ -d "$module_dir" ]]; then
        # Bump version
        local existing_version=$(jq -r ".modules[] | select(.name == \"$module_name\") | .version" "$CATALOG_FILE" 2>/dev/null || echo "1.0.0")
        IFS='.' read -r major minor patch <<< "$existing_version"
        patch=$((patch + 1))
        version="${major}.${minor}.${patch}"
        rm -rf "$module_dir"
    fi

    mkdir -p "$module_dir"/{client,server,schema,tests,docs}

    # Extract based on pattern type
    case "$pattern_id" in
        multi-user-websocket)
            # Copy WebSocket-related files
            find "$project_path/server" -name "*socket*" -o -name "*ws*" -o -name "*realtime*" 2>/dev/null | while read f; do
                [[ -f "$f" ]] && cp "$f" "$module_dir/server/"
            done
            find "$project_path/client" -name "*socket*" -o -name "*WebSocket*" 2>/dev/null | while read f; do
                [[ -f "$f" ]] && cp "$f" "$module_dir/client/"
            done
            ;;
        auth-session)
            find "$project_path/server" -name "*auth*" -o -name "*session*" -o -name "*login*" 2>/dev/null | while read f; do
                [[ -f "$f" ]] && cp "$f" "$module_dir/server/"
            done
            find "$project_path/client" -name "*auth*" -o -name "*login*" -o -name "*Login*" 2>/dev/null | while read f; do
                [[ -f "$f" ]] && cp "$f" "$module_dir/client/"
            done
            ;;
        sqlite-repository)
            find "$project_path/server" -name "*db*" -o -name "*database*" -o -name "*repository*" 2>/dev/null | while read f; do
                [[ -f "$f" ]] && cp "$f" "$module_dir/server/"
            done
            [[ -f "$project_path/server/schema.sql" ]] && cp "$project_path/server/schema.sql" "$module_dir/schema/"
            ;;
        game-state-management)
            find "$project_path" -name "*game*" -o -name "*state*" -o -name "*Game*" 2>/dev/null | while read f; do
                [[ -f "$f" ]] && cp "$f" "$module_dir/server/"
            done
            ;;
        e2e-test-suite)
            [[ -d "$project_path/cypress" ]] && cp -r "$project_path/cypress/e2e" "$module_dir/tests/"
            [[ -f "$project_path/cypress.config.ts" ]] && cp "$project_path/cypress.config.ts" "$module_dir/tests/"
            ;;
        *)
            echo "Unknown pattern: $pattern_id"
            return 1
            ;;
    esac

    # Create module.json
    local project_name=$(basename "$project_path")
    cat > "$module_dir/module.json" << EOF
{
    "name": "$module_name",
    "version": "$version",
    "pattern": "$pattern_id",
    "description": "$description",
    "tags": $(echo "$tags" | jq -R 'split(",") | map(gsub("^\\s+|\\s+$";""))'),
    "source": {
        "project": "$project_name",
        "path": "$project_path",
        "date": "$(date -Iseconds)"
    },
    "files": {
        "client": $(ls "$module_dir/client" 2>/dev/null | jq -R . | jq -s . || echo "[]"),
        "server": $(ls "$module_dir/server" 2>/dev/null | jq -R . | jq -s . || echo "[]"),
        "schema": $(ls "$module_dir/schema" 2>/dev/null | jq -R . | jq -s . || echo "[]"),
        "tests": $(ls "$module_dir/tests" 2>/dev/null | jq -R . | jq -s . || echo "[]")
    },
    "dependencies": {},
    "peerDependencies": {}
}
EOF

    # Update catalog
    local module_entry=$(cat "$module_dir/module.json")

    # Remove existing entry if any, then add new one
    jq --argjson entry "$module_entry" '
        .modules = [.modules[] | select(.name != $entry.name)] + [$entry] |
        .lastUpdated = (now | todate)
    ' "$CATALOG_FILE" > "$CATALOG_FILE.tmp" && mv "$CATALOG_FILE.tmp" "$CATALOG_FILE"

    echo "$module_dir"
}

# Apply a module to a target project
apply_module() {
    local target_project="$1"
    local module_name="$2"

    local module_dir="$MODULES_DIR/$module_name"

    if [[ ! -d "$module_dir" ]]; then
        echo "Module not found: $module_name"
        return 1
    fi

    echo "Applying module: $module_name to $target_project"

    # Copy client files
    if [[ -d "$module_dir/client" ]] && [[ "$(ls -A "$module_dir/client" 2>/dev/null)" ]]; then
        mkdir -p "$target_project/client/src/modules/$module_name"
        cp -r "$module_dir/client/"* "$target_project/client/src/modules/$module_name/"
        echo "  ✓ Client files copied to client/src/modules/$module_name/"
    fi

    # Copy server files
    if [[ -d "$module_dir/server" ]] && [[ "$(ls -A "$module_dir/server" 2>/dev/null)" ]]; then
        mkdir -p "$target_project/server/src/modules/$module_name"
        cp -r "$module_dir/server/"* "$target_project/server/src/modules/$module_name/"
        echo "  ✓ Server files copied to server/src/modules/$module_name/"
    fi

    # Copy schema files
    if [[ -d "$module_dir/schema" ]] && [[ "$(ls -A "$module_dir/schema" 2>/dev/null)" ]]; then
        mkdir -p "$target_project/server/schema"
        cp -r "$module_dir/schema/"* "$target_project/server/schema/"
        echo "  ✓ Schema files copied to server/schema/"
    fi

    # Copy test files
    if [[ -d "$module_dir/tests" ]] && [[ "$(ls -A "$module_dir/tests" 2>/dev/null)" ]]; then
        mkdir -p "$target_project/cypress/e2e/modules"
        cp -r "$module_dir/tests/"* "$target_project/cypress/e2e/modules/" 2>/dev/null || true
        echo "  ✓ Test files copied to cypress/e2e/modules/"
    fi

    echo ""
    echo "Module applied. You may need to:"
    echo "  1. Update imports in your code"
    echo "  2. Run npm install for any new dependencies"
    echo "  3. Adapt the module to your specific needs"
}

# Interactive module save prompt (for use in analysis)
prompt_save_module() {
    local project_path="$1"
    local pattern_id="$2"
    local pattern_name="$3"
    local quality_score="${4:-0}"

    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "MODULE DETECTION"
    echo "════════════════════════════════════════════════════════════════"
    echo ""
    echo "Detected pattern: $pattern_name"
    echo "Quality score: ${quality_score}%"
    echo ""
    echo "Save as reusable module? (y/n/customize)"
    read -p "> " response

    case "$response" in
        y|Y|yes)
            echo ""
            read -p "Module name (default: $pattern_id): " module_name
            module_name="${module_name:-$pattern_id}"

            read -p "Description: " description
            description="${description:-$pattern_name implementation}"

            read -p "Tags (comma-separated): " tags
            tags="${tags:-$pattern_id}"

            local module_dir=$(extract_module "$project_path" "$module_name" "$pattern_id" "$description" "$tags")

            echo ""
            echo "✓ Module saved to: $module_dir"
            echo ""
            echo "Use in future projects with:"
            echo "  ./pipeline brainstorm <project> --use-module $module_name"
            ;;
        customize|c)
            # Let Claude customize the extraction
            echo "Customization not yet implemented - using defaults"
            ;;
        *)
            echo "Module not saved."
            ;;
    esac
}
