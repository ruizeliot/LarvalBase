#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# FILE CACHE SYSTEM
# Reduces redundant file reads by caching commonly accessed files
# Version: 5.0.8
# ═══════════════════════════════════════════════════════════════

# Cache storage (in-memory associative array)
declare -gA FILE_CACHE
declare -gA FILE_CACHE_TIME

# Cache settings
FILE_CACHE_TTL="${FILE_CACHE_TTL:-300}"  # 5 minutes default
FILE_CACHE_MAX_SIZE="${FILE_CACHE_MAX_SIZE:-1048576}"  # 1MB max per file

# Generate cache key from file path
cache_key() {
    local filepath="$1"
    echo "${filepath//\//_}"
}

# Check if cached content is still valid
is_cache_valid() {
    local key="$1"
    local filepath="$2"

    # Check if in cache (use :- to handle unset keys with set -u)
    [[ -z "${FILE_CACHE[$key]:-}" ]] && return 1

    # Check TTL
    local cached_time="${FILE_CACHE_TIME[$key]:-0}"
    local current_time=$(date +%s)
    local age=$((current_time - cached_time))

    if [[ $age -gt $FILE_CACHE_TTL ]]; then
        return 1
    fi

    # Check if file was modified since cache
    if [[ -f "$filepath" ]]; then
        local file_mtime=$(stat -c %Y "$filepath" 2>/dev/null || echo "0")
        if [[ $file_mtime -gt $cached_time ]]; then
            return 1
        fi
    fi

    return 0
}

# Read file with caching
# Usage: cached_read <filepath> [max_lines]
cached_read() {
    local filepath="$1"
    local max_lines="${2:-}"
    local key=$(cache_key "$filepath")

    # Check cache first
    if is_cache_valid "$key" "$filepath"; then
        if [[ -n "$max_lines" ]]; then
            echo "${FILE_CACHE[$key]}" | head -n "$max_lines"
        else
            echo "${FILE_CACHE[$key]}"
        fi
        return 0
    fi

    # File doesn't exist
    if [[ ! -f "$filepath" ]]; then
        return 1
    fi

    # Check file size before caching
    local file_size=$(stat -c %s "$filepath" 2>/dev/null || echo "0")
    if [[ $file_size -gt $FILE_CACHE_MAX_SIZE ]]; then
        # File too large, don't cache
        if [[ -n "$max_lines" ]]; then
            head -n "$max_lines" "$filepath"
        else
            cat "$filepath"
        fi
        return 0
    fi

    # Read and cache
    local content
    if [[ -n "$max_lines" ]]; then
        content=$(head -n "$max_lines" "$filepath")
    else
        content=$(cat "$filepath")
    fi

    FILE_CACHE[$key]="$content"
    FILE_CACHE_TIME[$key]=$(date +%s)

    echo "$content"
}

# Invalidate specific file in cache
cache_invalidate() {
    local filepath="$1"
    local key=$(cache_key "$filepath")
    unset FILE_CACHE[$key]
    unset FILE_CACHE_TIME[$key]
}

# Clear entire cache
cache_clear() {
    FILE_CACHE=()
    FILE_CACHE_TIME=()
}

# Get cache statistics
cache_stats() {
    local count=${#FILE_CACHE[@]}
    local total_size=0

    for key in "${!FILE_CACHE[@]}"; do
        local size=${#FILE_CACHE[$key]}
        total_size=$((total_size + size))
    done

    echo "Cache entries: $count"
    echo "Total size: $total_size bytes"
    echo "TTL: $FILE_CACHE_TTL seconds"
}

# Preload commonly accessed files for a project
# Usage: cache_preload_project <project_path>
cache_preload_project() {
    local project_path="$1"

    # Common docs that get read multiple times
    local common_docs=(
        "$project_path/docs/brainstorm-notes.md"
        "$project_path/docs/user-stories.md"
        "$project_path/docs/e2e-test-specs.md"
        "$project_path/docs/tech-stack.md"
        "$project_path/docs/requirements.md"
        "$project_path/.pipeline/manifest.json"
        "$project_path/.pipeline/intelligence-context.md"
    )

    local preloaded=0
    for doc in "${common_docs[@]}"; do
        if [[ -f "$doc" ]]; then
            cached_read "$doc" > /dev/null 2>&1
            ((preloaded++))
        fi
    done

    return $preloaded
}
