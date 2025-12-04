#!/bin/bash
# Sync VERSION to all dependent files
# Usage: ./sync-version.sh [new-version]
# If new-version provided, updates VERSION first then syncs

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERSION_FILE="$SCRIPT_DIR/VERSION"

# Update VERSION if new version provided
if [[ -n "${1:-}" ]]; then
    echo "$1" > "$VERSION_FILE"
    echo "Updated VERSION to $1"
fi

VERSION=$(cat "$VERSION_FILE" | head -1 | tr -d '[:space:]')
MAJOR_MINOR=$(echo "$VERSION" | cut -d. -f1,2)

echo "Syncing version $VERSION (major.minor: $MAJOR_MINOR)"

# 1. Update CLAUDE.md header
sed -i "s/^\*\*Version:\*\* .*/\*\*Version:\*\* $VERSION/" "$SCRIPT_DIR/CLAUDE.md"
echo "  ✓ CLAUDE.md header"

# 2. init-manifest.sh now reads VERSION at runtime (no update needed)
echo "  ✓ init-manifest.sh (reads VERSION at runtime)"

# 3. Check if skill commands need renaming (major.minor change)
COMMANDS_DIR="$HOME/.claude/commands"
if [[ -d "$COMMANDS_DIR" ]]; then
    # Find current versioned commands
    CURRENT_COMMANDS=$(ls "$COMMANDS_DIR"/*-pipeline-*-v*.md 2>/dev/null | head -1 || true)
    if [[ -n "$CURRENT_COMMANDS" ]]; then
        CURRENT_CMD_VERSION=$(echo "$CURRENT_COMMANDS" | grep -oP 'v\d+\.\d+' | head -1 | sed 's/v//')
        if [[ "$CURRENT_CMD_VERSION" != "$MAJOR_MINOR" ]]; then
            echo ""
            echo "  ⚠ Skill commands use v$CURRENT_CMD_VERSION but VERSION is v$MAJOR_MINOR"
            echo "  To rename commands (major version bump):"
            echo "    for f in $COMMANDS_DIR/*-v$CURRENT_CMD_VERSION.md; do"
            echo "      mv \"\$f\" \"\${f/v$CURRENT_CMD_VERSION/v$MAJOR_MINOR}\""
            echo "    done"
        else
            echo "  ✓ Skill commands (v$MAJOR_MINOR)"
        fi
    fi
fi

echo ""
echo "Version sync complete: $VERSION"
