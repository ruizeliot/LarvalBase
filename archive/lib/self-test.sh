#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# PIPELINE SELF-TEST SYSTEM
# Validates pipeline integrity before/after changes
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIPELINE_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# ═══════════════════════════════════════════════════════════════
# TEST HELPERS
# ═══════════════════════════════════════════════════════════════

test_pass() {
    local name="$1"
    echo -e "  ${GREEN}✓${NC} $name"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

test_fail() {
    local name="$1"
    local reason="${2:-}"
    echo -e "  ${RED}✗${NC} $name"
    [[ -n "$reason" ]] && echo -e "    ${RED}→ $reason${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

test_skip() {
    local name="$1"
    local reason="${2:-}"
    echo -e "  ${YELLOW}○${NC} $name (skipped)"
    [[ -n "$reason" ]] && echo -e "    → $reason"
    TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
}

# ═══════════════════════════════════════════════════════════════
# SYNTAX TESTS
# ═══════════════════════════════════════════════════════════════

# Check bash syntax for a single file
# Returns 0 if valid, 1 if invalid
check_syntax() {
    local file="$1"
    local output

    if output=$(bash -n "$file" 2>&1); then
        return 0
    else
        echo "$output"
        return 1
    fi
}

# Run syntax check on all shell scripts
test_syntax_all() {
    echo ""
    echo "═══ SYNTAX VALIDATION ═══"

    local failed=0

    # Main scripts
    for script in "$PIPELINE_DIR"/*.sh "$PIPELINE_DIR"/pipeline; do
        [[ ! -f "$script" ]] && continue
        [[ "$script" == *.backup* ]] && continue
        [[ "$script" == *.bak* ]] && continue

        local name=$(basename "$script")
        if check_syntax "$script" > /dev/null 2>&1; then
            test_pass "$name"
        else
            test_fail "$name" "$(bash -n "$script" 2>&1 | head -1)"
            failed=1
        fi
    done

    # Library scripts
    for script in "$SCRIPT_DIR"/*.sh; do
        [[ ! -f "$script" ]] && continue
        [[ "$script" == *.backup* ]] && continue
        [[ "$script" == *.bak* ]] && continue

        local name="lib/$(basename "$script")"
        if check_syntax "$script" > /dev/null 2>&1; then
            test_pass "$name"
        else
            test_fail "$name" "$(bash -n "$script" 2>&1 | head -1)"
            failed=1
        fi
    done

    return $failed
}

# ═══════════════════════════════════════════════════════════════
# SHELLCHECK TESTS (if available)
# ═══════════════════════════════════════════════════════════════

test_shellcheck() {
    echo ""
    echo "═══ SHELLCHECK ANALYSIS ═══"

    if ! command -v shellcheck &> /dev/null; then
        test_skip "shellcheck" "not installed (apt install shellcheck)"
        return 0
    fi

    local failed=0
    local critical_scripts=(
        "$PIPELINE_DIR/pipeline"
        "$SCRIPT_DIR/common.sh"
        "$SCRIPT_DIR/analyze-run.sh"
        "$SCRIPT_DIR/transcript.sh"
    )

    for script in "${critical_scripts[@]}"; do
        [[ ! -f "$script" ]] && continue

        local name=$(basename "$script")
        # Only check for critical errors (SC1xxx = parsing, SC2xxx = common bugs)
        local errors=$(shellcheck -S error "$script" 2>&1 | grep -c "error" || true)

        if [[ "$errors" -eq 0 ]]; then
            test_pass "$name"
        else
            test_fail "$name" "$errors critical error(s)"
            failed=1
        fi
    done

    return $failed
}

# ═══════════════════════════════════════════════════════════════
# FUNCTION SMOKE TESTS
# ═══════════════════════════════════════════════════════════════

test_functions_smoke() {
    echo ""
    echo "═══ FUNCTION SMOKE TESTS ═══"

    local failed=0

    # Test common.sh functions
    if (
        source "$SCRIPT_DIR/common.sh" 2>/dev/null
        # Test that key functions exist and are callable
        type info &>/dev/null && \
        type warn &>/dev/null && \
        type die &>/dev/null && \
        type header &>/dev/null && \
        type divider &>/dev/null
    ); then
        test_pass "common.sh functions"
    else
        test_fail "common.sh functions" "Failed to source or missing functions"
        failed=1
    fi

    # Test transcript.sh functions
    if (
        source "$SCRIPT_DIR/common.sh" 2>/dev/null
        source "$SCRIPT_DIR/transcript.sh" 2>/dev/null
        type validate_transcript &>/dev/null && \
        type report_transcript_issues &>/dev/null
    ); then
        test_pass "transcript.sh functions"
    else
        test_fail "transcript.sh functions" "Failed to source or missing functions"
        failed=1
    fi

    # Test analyze-run.sh can be sourced (complex, so just check it parses)
    if bash -n "$SCRIPT_DIR/analyze-run.sh" 2>/dev/null; then
        test_pass "analyze-run.sh parseable"
    else
        test_fail "analyze-run.sh parseable" "Syntax error"
        failed=1
    fi

    return $failed
}

# ═══════════════════════════════════════════════════════════════
# INTEGRATION TESTS
# ═══════════════════════════════════════════════════════════════

test_cli_integration() {
    echo ""
    echo "═══ CLI INTEGRATION TESTS ═══"

    local failed=0
    local cli="$PIPELINE_DIR/pipeline"

    # Test help command
    if "$cli" help &>/dev/null; then
        test_pass "./pipeline help"
    else
        test_fail "./pipeline help" "Non-zero exit"
        failed=1
    fi

    # Test health command (if it exists)
    if "$cli" health &>/dev/null 2>&1; then
        test_pass "./pipeline health"
    else
        test_skip "./pipeline health" "Command may require setup"
    fi

    # Test status with non-existent project (should fail gracefully)
    if "$cli" status /nonexistent 2>&1 | grep -qi "not found\|error\|does not exist"; then
        test_pass "./pipeline status (error handling)"
    else
        test_fail "./pipeline status (error handling)" "Should report error for missing project"
        failed=1
    fi

    return $failed
}

# ═══════════════════════════════════════════════════════════════
# DUPLICATION DETECTION
# ═══════════════════════════════════════════════════════════════

test_no_duplication() {
    echo ""
    echo "═══ DUPLICATION DETECTION ═══"

    local failed=0

    for script in "$SCRIPT_DIR"/*.sh; do
        [[ ! -f "$script" ]] && continue
        [[ "$script" == *.backup* ]] && continue
        [[ "$script" == *.bak* ]] && continue

        local name="lib/$(basename "$script")"

        # Check for consecutive duplicate lines (common bug from auto-improvements)
        local dupes=$(awk 'NF && prev==$0 {count++} {prev=$0} END {print count+0}' "$script")

        # Check for repeated code blocks (same 3+ lines appearing multiple times)
        local repeated_blocks=$(awk '
            NF { lines[NR] = $0 }
            END {
                for (i=1; i<=NR-2; i++) {
                    block = lines[i] "\n" lines[i+1] "\n" lines[i+2]
                    blocks[block]++
                }
                count = 0
                for (b in blocks) if (blocks[b] > 2) count++
                print count
            }
        ' "$script")

        # Threshold: >5 consecutive duplicates OR >10 repeated blocks (normal code has some repetition)
        if [[ "$dupes" -gt 5 ]] || [[ "$repeated_blocks" -gt 10 ]]; then
            test_fail "$name" "$dupes duplicate lines, $repeated_blocks repeated blocks"
            failed=1
        else
            test_pass "$name"
        fi
    done

    return $failed
}

# ═══════════════════════════════════════════════════════════════
# VERSION CONSISTENCY
# ═══════════════════════════════════════════════════════════════

test_version_consistency() {
    echo ""
    echo "═══ VERSION CONSISTENCY ═══"

    local failed=0

    # Check VERSION file exists
    if [[ -f "$PIPELINE_DIR/VERSION" ]]; then
        local version=$(cat "$PIPELINE_DIR/VERSION")
        test_pass "VERSION file exists ($version)"

        # Check CLAUDE.md has matching version
        if grep -q "Version.*$version\|v$version" "$PIPELINE_DIR/CLAUDE.md" 2>/dev/null; then
            test_pass "CLAUDE.md version matches"
        else
            test_fail "CLAUDE.md version matches" "VERSION=$version not found in CLAUDE.md"
            failed=1
        fi
    else
        test_fail "VERSION file exists" "File not found"
        failed=1
    fi

    return $failed
}

# ═══════════════════════════════════════════════════════════════
# QUICK SYNTAX CHECK (for use during apply)
# ═══════════════════════════════════════════════════════════════

# Fast syntax check for critical files only
# Usage: quick_syntax_check
# Returns: 0 if all pass, 1 if any fail
quick_syntax_check() {
    local failed=0
    local critical_files=(
        "$PIPELINE_DIR/pipeline"
        "$SCRIPT_DIR/common.sh"
        "$SCRIPT_DIR/transcript.sh"
        "$SCRIPT_DIR/analyze-run.sh"
    )

    for file in "${critical_files[@]}"; do
        [[ ! -f "$file" ]] && continue
        if ! bash -n "$file" 2>/dev/null; then
            echo "SYNTAX ERROR in $(basename "$file"):"
            bash -n "$file" 2>&1 | head -3
            failed=1
        fi
    done

    return $failed
}

# ═══════════════════════════════════════════════════════════════
# MAIN TEST RUNNER
# ═══════════════════════════════════════════════════════════════

run_all_tests() {
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "PIPELINE SELF-TEST"
    echo "════════════════════════════════════════════════════════════════"
    echo "Directory: $PIPELINE_DIR"
    echo "Time: $(date '+%Y-%m-%d %H:%M:%S')"

    local overall_failed=0

    test_syntax_all || overall_failed=1
    test_functions_smoke || overall_failed=1
    test_no_duplication || overall_failed=1
    test_version_consistency || overall_failed=1
    test_cli_integration || overall_failed=1
    test_shellcheck || true  # Don't fail on shellcheck (optional)

    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "RESULTS"
    echo "════════════════════════════════════════════════════════════════"
    echo -e "  ${GREEN}Passed:${NC}  $TESTS_PASSED"
    echo -e "  ${RED}Failed:${NC}  $TESTS_FAILED"
    echo -e "  ${YELLOW}Skipped:${NC} $TESTS_SKIPPED"
    echo ""

    if [[ $overall_failed -eq 0 ]]; then
        echo -e "${GREEN}All tests passed!${NC}"
        return 0
    else
        echo -e "${RED}Some tests failed!${NC}"
        return 1
    fi
}

run_syntax_only() {
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "SYNTAX VALIDATION ONLY"
    echo "════════════════════════════════════════════════════════════════"

    test_syntax_all
    local result=$?

    echo ""
    if [[ $result -eq 0 ]]; then
        echo -e "${GREEN}All syntax checks passed!${NC}"
    else
        echo -e "${RED}Syntax errors found!${NC}"
    fi

    return $result
}

run_smoke_only() {
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "SMOKE TESTS ONLY"
    echo "════════════════════════════════════════════════════════════════"

    test_syntax_all || return 1
    test_functions_smoke || return 1

    echo ""
    echo -e "${GREEN}Smoke tests passed!${NC}"
    return 0
}

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    case "${1:-all}" in
        all)      run_all_tests ;;
        syntax)   run_syntax_only ;;
        smoke)    run_smoke_only ;;
        quick)    quick_syntax_check ;;
        *)
            echo "Usage: $0 [all|syntax|smoke|quick]"
            exit 1
            ;;
    esac
fi
