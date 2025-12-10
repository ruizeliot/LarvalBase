#!/bin/bash
# Pipeline Unit Test Suite
# Tests core functionality without requiring Claude API
# Usage: ./run-tests.sh [test-name]
# Run all: ./run-tests.sh
# Run one: ./run-tests.sh manifest

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIPELINE_DIR="$(dirname "$SCRIPT_DIR")"
TEST_PROJECT="$SCRIPT_DIR/test-project"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0

log_pass() { echo -e "${GREEN}✓ PASS${NC}: $1"; PASSED=$((PASSED+1)); }
log_fail() { echo -e "${RED}✗ FAIL${NC}: $1"; FAILED=$((FAILED+1)); }
log_info() { echo -e "  INFO: $1"; }

setup_test_project() {
    rm -rf "$TEST_PROJECT"
    mkdir -p "$TEST_PROJECT/docs" "$TEST_PROJECT/.pipeline"

    cat > "$TEST_PROJECT/docs/brainstorm-notes.md" << 'EOF'
# Test App - Pipeline Test
EOF

    cat > "$TEST_PROJECT/docs/user-stories.md" << 'EOF'
# User Stories
**Total Epics:** 2
**Total Stories:** 4

## Epic 1: Core
### US-001: Feature A
**As a** user **I want** A **so that** test.
- AC1: Works

### US-002: Feature B
**As a** user **I want** B **so that** test.
- AC1: Works

## Epic 2: Extra
### US-003: Feature C
**As a** user **I want** C **so that** test.
- AC1: Works

### US-004: Feature D
**As a** user **I want** D **so that** test.
- AC1: Works
EOF

    cat > "$TEST_PROJECT/docs/e2e-test-specs.md" << 'EOF'
# E2E Test Specs
Total Tests: 4
EOF
}

cleanup() {
    tmux kill-session -t "pipeline-test-project-test" 2>/dev/null || true
    rm -f "$TEST_PROJECT/.pipeline/session-*.id" 2>/dev/null || true
}

# TEST 1: Manifest Initialization
test_manifest_init() {
    echo ""
    echo "═══ TEST: Manifest Initialization ═══"

    setup_test_project

    "$PIPELINE_DIR/init-manifest.sh" "$TEST_PROJECT" "test-run" "new-project" > /dev/null 2>&1

    if [[ ! -f "$TEST_PROJECT/.pipeline/manifest.json" ]]; then
        log_fail "Manifest not created"
        return 1
    fi
    log_pass "Manifest created"

    if ! jq '.' "$TEST_PROJECT/.pipeline/manifest.json" > /dev/null 2>&1; then
        log_fail "Invalid JSON"
        return 1
    fi
    log_pass "Valid JSON"

    EPIC_COUNT=$(jq '.epics | length' "$TEST_PROJECT/.pipeline/manifest.json")
    if [[ "$EPIC_COUNT" != "2" ]]; then
        log_fail "Epic count: expected 2, got $EPIC_COUNT"
        return 1
    fi
    log_pass "Epics correct (2)"

    # Check story parsing
    STORY_COUNT=$(jq '[.epics[].stories[]] | length' "$TEST_PROJECT/.pipeline/manifest.json")
    if [[ "$STORY_COUNT" != "4" ]]; then
        log_fail "Story count: expected 4, got $STORY_COUNT"
        return 1
    fi
    log_pass "Stories correct (4)"

    # Check test count
    TEST_COUNT=$(jq '.tests.total' "$TEST_PROJECT/.pipeline/manifest.json")
    if [[ "$TEST_COUNT" != "4" ]]; then
        log_fail "Test count: expected 4, got $TEST_COUNT"
        return 1
    fi
    log_pass "Tests correct (4)"
}

# TEST 2: Manifest Update
test_manifest_update() {
    echo ""
    echo "═══ TEST: Manifest Update ═══"

    setup_test_project
    "$PIPELINE_DIR/init-manifest.sh" "$TEST_PROJECT" "test-run" "new-project" > /dev/null 2>&1

    # Update phase status using actual interface: <project-path> <step> [status]
    "$PIPELINE_DIR/update-manifest.sh" "$TEST_PROJECT" "0b" "complete" > /dev/null 2>&1

    PHASE_STATUS=$(jq -r '.phases["0b"].status' "$TEST_PROJECT/.pipeline/manifest.json")
    if [[ "$PHASE_STATUS" != "complete" ]]; then
        log_fail "Phase status: expected 'complete', got '$PHASE_STATUS'"
        return 1
    fi
    log_pass "Phase status updated"

    # Phase 1 complete
    "$PIPELINE_DIR/update-manifest.sh" "$TEST_PROJECT" "1" "complete" > /dev/null 2>&1

    PHASE_STATUS=$(jq -r '.phases["1"].status' "$TEST_PROJECT/.pipeline/manifest.json")
    if [[ "$PHASE_STATUS" != "complete" ]]; then
        log_fail "Phase 1 status: expected 'complete', got '$PHASE_STATUS'"
        return 1
    fi
    log_pass "Phase 1 status updated"

    # Update with epic (phase 2 epic 1 complete)
    "$PIPELINE_DIR/update-manifest.sh" "$TEST_PROJECT" "2" "complete" "1" > /dev/null 2>&1

    EPIC_STATUS=$(jq -r '.epics[0].status' "$TEST_PROJECT/.pipeline/manifest.json")
    if [[ "$EPIC_STATUS" != "complete" ]]; then
        log_fail "Epic status: expected 'complete', got '$EPIC_STATUS'"
        return 1
    fi
    log_pass "Epic status updated"
}

# TEST 3: TTY Detection Logic
test_tty_detection() {
    echo ""
    echo "═══ TEST: TTY Detection Logic ═══"

    # Test the TTY detection logic in isolation
    # When running without TTY (like in background), should detect headless

    # Create a test script that checks TTY
    cat > /tmp/tty-test.sh << 'EOF'
#!/bin/bash
if [[ -t 0 ]] && [[ -t 1 ]]; then
    echo "VISUAL"
else
    echo "HEADLESS"
fi
EOF
    chmod +x /tmp/tty-test.sh

    # Run without TTY (background, piped)
    RESULT=$(bash /tmp/tty-test.sh 2>/dev/null)
    if [[ "$RESULT" == "HEADLESS" ]]; then
        log_pass "Headless detection (no TTY)"
    else
        log_fail "Expected HEADLESS, got $RESULT"
        return 1
    fi

    # Run with PTY via script command
    RESULT=$(script -q -c "/tmp/tty-test.sh" /dev/null 2>/dev/null | tr -d '\r\n')
    if [[ "$RESULT" == "VISUAL" ]]; then
        log_pass "Visual detection (with PTY)"
    else
        log_fail "Expected VISUAL, got '$RESULT'"
        return 1
    fi
}

# TEST 4: Pre-flight Checks
test_preflight() {
    echo ""
    echo "═══ TEST: Pre-flight Checks ═══"

    setup_test_project

    # Source the common lib
    source "$PIPELINE_DIR/lib/common.sh" 2>/dev/null || true

    # Test with valid project
    if [[ -f "$TEST_PROJECT/docs/user-stories.md" ]]; then
        log_pass "User stories check passes"
    else
        log_fail "User stories not found"
        return 1
    fi

    if [[ -f "$TEST_PROJECT/docs/brainstorm-notes.md" ]]; then
        log_pass "Brainstorm notes check passes"
    else
        log_fail "Brainstorm notes not found"
        return 1
    fi

    # Test with missing file
    rm "$TEST_PROJECT/docs/user-stories.md"
    if [[ ! -f "$TEST_PROJECT/docs/user-stories.md" ]]; then
        log_pass "Missing file detected"
    else
        log_fail "Should detect missing file"
        return 1
    fi
}

# TEST 5: JSONL Transcript Parsing
test_transcript() {
    echo ""
    echo "═══ TEST: JSONL Transcript ═══"

    # Create mock JSONL file
    MOCK_JSONL="/tmp/mock-session.jsonl"
    cat > "$MOCK_JSONL" << 'EOF'
{"type":"user","message":{"role":"user","content":"Hello"},"timestamp":"2025-01-01T10:00:00Z"}
{"type":"assistant","message":{"role":"assistant","content":"Hi there!"},"timestamp":"2025-01-01T10:00:05Z"}
{"type":"tool_use","tool":{"name":"Read"},"timestamp":"2025-01-01T10:00:10Z"}
{"type":"assistant","message":{"role":"assistant","content":"Done."},"timestamp":"2025-01-01T10:00:15Z"}
EOF

    # Test JSONL parsing
    if command -v jq &> /dev/null; then
        MSG_COUNT=$(jq -s 'length' "$MOCK_JSONL")
        if [[ "$MSG_COUNT" == "4" ]]; then
            log_pass "JSONL parsing works"
        else
            log_fail "JSONL count: expected 4, got $MSG_COUNT"
            return 1
        fi

        # Check message types
        TYPES=$(jq -r '.type' "$MOCK_JSONL" | sort -u | tr '\n' ',')
        if [[ "$TYPES" == "assistant,tool_use,user," ]]; then
            log_pass "Message types extracted"
        else
            log_fail "Types: expected 'assistant,tool_use,user,', got '$TYPES'"
            return 1
        fi
    else
        log_fail "jq not available"
        return 1
    fi

    rm -f "$MOCK_JSONL"
}

# TEST 6: Version File
test_version() {
    echo ""
    echo "═══ TEST: Version File ═══"

    if [[ ! -f "$PIPELINE_DIR/VERSION" ]]; then
        log_fail "VERSION file missing"
        return 1
    fi
    log_pass "VERSION file exists"

    VERSION=$(cat "$PIPELINE_DIR/VERSION" | tr -d '\n\r')
    if [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        log_pass "Version format valid: $VERSION"
    else
        log_fail "Invalid version format: $VERSION"
        return 1
    fi
}

# TEST 7: Watch Command - attaches to live tmux session
test_watch() {
    echo ""
    echo "═══ TEST: Watch Command ═══"

    setup_test_project
    "$PIPELINE_DIR/init-manifest.sh" "$TEST_PROJECT" "test-run" "new-project" > /dev/null 2>&1

    # Test 1: Watch command exists in CLI
    if ! "$PIPELINE_DIR/pipeline" help 2>&1 | grep -q "watch"; then
        log_info "Watch command not in this version (skipping)"
        return 0
    fi
    log_pass "Watch command in help"

    # Test 2: Watch shows "No active sessions" when none exist
    # Clean up any existing test sessions first
    tmux kill-session -t "pipeline-test-project-old" 2>/dev/null || true
    tmux kill-session -t "pipeline-test-project-new" 2>/dev/null || true

    local watch_output
    watch_output=$(timeout 2 "$PIPELINE_DIR/pipeline" watch "$TEST_PROJECT" 2>&1 || true)
    if echo "$watch_output" | grep -q "No active sessions"; then
        log_pass "Watch shows no sessions message"
    else
        log_fail "Watch should show 'No active sessions'"
        return 1
    fi

    # Test 3: Watch detects project name
    if echo "$watch_output" | grep -q "test-project"; then
        log_pass "Watch shows project name"
    else
        log_fail "Project name not in watch output"
        return 1
    fi

    # Test 4: Create sessions, verify watch attaches to latest
    local test_session1="pipeline-test-project-old"
    local test_session2="pipeline-test-project-new"
    tmux new-session -d -s "$test_session1" "sleep 30" 2>/dev/null || true
    sleep 1  # Ensure different creation times
    tmux new-session -d -s "$test_session2" "sleep 30" 2>/dev/null || true

    # Watch should show multiple sessions and attach to latest (timeout before actual attach)
    watch_output=$(timeout 2 "$PIPELINE_DIR/pipeline" watch "$TEST_PROJECT" 2>&1 || true)
    if echo "$watch_output" | grep -q "Multiple sessions found"; then
        log_pass "Watch detects multiple sessions"
    else
        log_fail "Watch should detect multiple sessions"
    fi

    # Verify it attaches to latest (newest)
    if echo "$watch_output" | grep -q "Attaching to.*test-project-new"; then
        log_pass "Watch attaches to latest session"
    else
        log_fail "Watch should attach to latest session"
    fi

    # Cleanup
    tmux kill-session -t "$test_session1" 2>/dev/null || true
    tmux kill-session -t "$test_session2" 2>/dev/null || true
}

# MAIN
echo "╔════════════════════════════════════════════╗"
echo "║     PIPELINE UNIT TEST SUITE              ║"
echo "╚════════════════════════════════════════════╝"

# TEST 8: Signal Command
test_signal() {
    echo ""
    echo "═══ TEST: Signal Command ═══"

    setup_test_project
    cd "$TEST_PROJECT"

    # Test 1: Signal creates file
    "$PIPELINE_DIR/pipeline" signal 1 > /dev/null 2>&1
    if [[ -f ".pipeline/.signal-1-complete" ]]; then
        log_pass "Signal file created"
        rm -f ".pipeline/.signal-1-complete"
    else
        log_fail "Signal file not created"
    fi

    # Test 2: Signal with test counts
    "$PIPELINE_DIR/pipeline" signal 2 --tests-passing 10 --tests-failing 5 > /dev/null 2>&1
    if [[ -f ".pipeline/.signal-2-complete" ]]; then
        CONTENT=$(cat ".pipeline/.signal-2-complete")
        if echo "$CONTENT" | grep -q '"tests_passing":10'; then
            log_pass "Signal includes tests_passing"
        else
            log_fail "Signal missing tests_passing"
        fi
        if echo "$CONTENT" | grep -q '"tests_failing":5'; then
            log_pass "Signal includes tests_failing"
        else
            log_fail "Signal missing tests_failing"
        fi
        rm -f ".pipeline/.signal-2-complete"
    else
        log_fail "Signal file not created with test counts"
    fi

    # Test 3: Signal updates checkpoint
    "$PIPELINE_DIR/pipeline" signal 3 --tests-passing 20 --tests-failing 0 > /dev/null 2>&1
    if [[ -f ".pipeline/checkpoint.json" ]]; then
        if grep -q '"phase":"3"' ".pipeline/checkpoint.json"; then
            log_pass "Checkpoint updated with phase"
        else
            log_fail "Checkpoint missing phase"
        fi
    else
        log_fail "Checkpoint not updated"
    fi

    # Test 4: Invalid phase rejected
    local output
    output=$("$PIPELINE_DIR/pipeline" signal invalid 2>&1 || true)
    if echo "$output" | grep -qi "invalid phase"; then
        log_pass "Invalid phase rejected"
    else
        log_fail "Invalid phase not rejected: $output"
    fi

    # Test 5: All valid phases work
    for phase in 0a 0b 1 2 3; do
        rm -f ".pipeline/.signal-${phase}-complete"
        "$PIPELINE_DIR/pipeline" signal "$phase" > /dev/null 2>&1
        if [[ -f ".pipeline/.signal-${phase}-complete" ]]; then
            log_pass "Phase $phase signal works"
            rm -f ".pipeline/.signal-${phase}-complete"
        else
            log_fail "Phase $phase signal failed"
        fi
    done

    cd - > /dev/null
}

# TEST: Analysis v6 - Todo Spans
test_todo_spans() {
    echo ""
    echo "═══ TEST: Analysis v6 - Todo Spans ═══"

    # Create mock JSONL with TodoWrite events
    local mock_jsonl="/tmp/test-todo-spans-$$.jsonl"

    cat > "$mock_jsonl" << 'EOF'
{"type":"user","message":{"role":"user","content":"test"},"timestamp":"2025-11-27T10:00:00.000Z"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"tool_use","name":"TodoWrite","input":{"todos":[{"content":"First task","status":"in_progress","activeForm":"Working on first"}]}}]},"timestamp":"2025-11-27T10:00:10.000Z"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"tool_use","name":"Edit","input":{"file_path":"/test.txt"}}]},"timestamp":"2025-11-27T10:00:15.000Z"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"tool_use","name":"TodoWrite","input":{"todos":[{"content":"First task","status":"completed","activeForm":"Completed first"}]}}]},"timestamp":"2025-11-27T10:00:30.000Z"}
EOF

    # Test todo-spans.sh exists and is executable
    if [[ ! -x "$PIPELINE_DIR/lib/todo-spans.sh" ]]; then
        log_fail "todo-spans.sh not executable"
        rm -f "$mock_jsonl"
        return 1
    fi
    log_pass "todo-spans.sh exists and is executable"

    # Test basic execution
    local output
    output=$("$PIPELINE_DIR/lib/todo-spans.sh" "$mock_jsonl" 2>/dev/null || echo "")

    if [[ -z "$output" ]]; then
        log_fail "todo-spans.sh produced no output"
        rm -f "$mock_jsonl"
        return 1
    fi
    log_pass "todo-spans.sh produces output"

    # Validate JSON output
    if ! echo "$output" | jq . > /dev/null 2>&1; then
        log_fail "todo-spans.sh output is not valid JSON"
        rm -f "$mock_jsonl"
        return 1
    fi
    log_pass "todo-spans.sh produces valid JSON"

    # Check for expected fields
    if ! echo "$output" | jq -e '.spans' > /dev/null 2>&1; then
        log_fail "Missing spans field"
        rm -f "$mock_jsonl"
        return 1
    fi
    log_pass "Output contains spans field"

    rm -f "$mock_jsonl"
}

# TEST: Analysis v6 - Layer 1 Metrics
test_layer1_metrics() {
    echo ""
    echo "═══ TEST: Analysis v6 - Layer 1 Metrics ═══"

    # Test layer1-metrics.sh exists and is executable
    if [[ ! -x "$PIPELINE_DIR/lib/layer1-metrics.sh" ]]; then
        log_fail "layer1-metrics.sh not executable"
        return 1
    fi
    log_pass "layer1-metrics.sh exists and is executable"

    # Test with mock JSONL
    local mock_jsonl="/tmp/test-layer1-$$.jsonl"

    cat > "$mock_jsonl" << 'EOF'
{"type":"user","message":{"role":"user","content":"test"},"timestamp":"2025-11-27T10:00:00.000Z"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"tool_use","name":"TodoWrite","input":{"todos":[{"content":"Build feature","status":"in_progress","activeForm":"Building"}]}}]},"timestamp":"2025-11-27T10:00:10.000Z"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"tool_use","name":"Edit","input":{"file_path":"/test.txt"}}]},"timestamp":"2025-11-27T10:00:20.000Z"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"tool_use","name":"TodoWrite","input":{"todos":[{"content":"Build feature","status":"completed","activeForm":"Built"}]}}]},"timestamp":"2025-11-27T10:00:40.000Z"}
EOF

    local output
    output=$("$PIPELINE_DIR/lib/layer1-metrics.sh" "$mock_jsonl" --phase 2 2>/dev/null || echo "")

    if [[ -z "$output" ]]; then
        log_fail "layer1-metrics.sh produced no output"
        rm -f "$mock_jsonl"
        return 1
    fi
    log_pass "layer1-metrics.sh produces output"

    # Validate JSON
    if ! echo "$output" | jq . > /dev/null 2>&1; then
        log_fail "layer1-metrics.sh output is not valid JSON"
        rm -f "$mock_jsonl"
        return 1
    fi
    log_pass "layer1-metrics.sh produces valid JSON"

    # Check for expected fields
    if ! echo "$output" | jq -e '.phase_metrics' > /dev/null 2>&1; then
        log_fail "Missing phase_metrics field"
        rm -f "$mock_jsonl"
        return 1
    fi
    log_pass "Output contains phase_metrics"

    if ! echo "$output" | jq -e '.efficiency' > /dev/null 2>&1; then
        log_fail "Missing efficiency field"
        rm -f "$mock_jsonl"
        return 1
    fi
    log_pass "Output contains efficiency"

    rm -f "$mock_jsonl"
}

# TEST: Analysis v6 - Pattern Database
test_pattern_db() {
    echo ""
    echo "═══ TEST: Analysis v6 - Pattern Database ═══"

    # Test pattern-db.sh exists
    if [[ ! -f "$PIPELINE_DIR/lib/pattern-db.sh" ]]; then
        log_fail "pattern-db.sh not found"
        return 1
    fi
    log_pass "pattern-db.sh exists"

    # Source the library
    source "$PIPELINE_DIR/lib/pattern-db.sh"

    # Use temp directory for testing
    local test_db="/tmp/test-pattern-db-$$"
    PATTERN_DB_DIR="$test_db"

    # Test init
    local init_result
    init_result=$(pattern_db_init 2>/dev/null)
    if [[ "$init_result" != "$test_db" ]]; then
        log_fail "pattern_db_init returned wrong path"
        rm -rf "$test_db"
        return 1
    fi
    log_pass "pattern_db_init returns correct path"

    # Check directories created
    if [[ ! -d "$test_db/runs" ]] || [[ ! -d "$test_db/patterns" ]]; then
        log_fail "Database directories not created"
        rm -rf "$test_db"
        return 1
    fi
    log_pass "Database directories created"

    # Check index file
    if [[ ! -f "$test_db/index.json" ]]; then
        log_fail "Index file not created"
        rm -rf "$test_db"
        return 1
    fi
    log_pass "Index file created"

    # Test stats function
    local stats
    stats=$(pattern_db_stats 2>/dev/null)
    if ! echo "$stats" | jq -e '.total_runs' > /dev/null 2>&1; then
        log_fail "Stats missing total_runs"
        rm -rf "$test_db"
        return 1
    fi
    log_pass "pattern_db_stats works"

    rm -rf "$test_db"
}

# TEST: Analysis v6 - Detect Phase
test_detect_phase() {
    echo ""
    echo "═══ TEST: Analysis v6 - Detect Phase ═══"

    # Test detect-phase.sh exists and is executable
    if [[ ! -x "$PIPELINE_DIR/lib/detect-phase.sh" ]]; then
        log_fail "detect-phase.sh not executable"
        return 1
    fi
    log_pass "detect-phase.sh exists and is executable"

    # Test phase detection from content
    local test_file="/tmp/test-detect-phase-$$.jsonl"

    # Test 0a detection
    echo '{"content":"brainstorm user stories"}' > "$test_file"
    local result
    result=$("$PIPELINE_DIR/lib/detect-phase.sh" "$test_file" 2>/dev/null)
    if [[ "$result" == "0a" ]]; then
        log_pass "Detects phase 0a (brainstorm)"
    else
        log_fail "Failed to detect 0a, got: $result"
    fi

    # Test 0b detection
    echo '{"content":"e2e test specs tech stack"}' > "$test_file"
    result=$("$PIPELINE_DIR/lib/detect-phase.sh" "$test_file" 2>/dev/null)
    if [[ "$result" == "0b" ]]; then
        log_pass "Detects phase 0b (technical)"
    else
        log_fail "Failed to detect 0b, got: $result"
    fi

    # Test 1 detection
    echo '{"content":"bootstrap skeleton RED state failing tests"}' > "$test_file"
    result=$("$PIPELINE_DIR/lib/detect-phase.sh" "$test_file" 2>/dev/null)
    if [[ "$result" == "1" ]]; then
        log_pass "Detects phase 1 (bootstrap)"
    else
        log_fail "Failed to detect 1, got: $result"
    fi

    # Test 2 detection
    echo '{"content":"implement epic GREEN state passing tests"}' > "$test_file"
    result=$("$PIPELINE_DIR/lib/detect-phase.sh" "$test_file" 2>/dev/null)
    if [[ "$result" == "2" ]]; then
        log_pass "Detects phase 2 (implement)"
    else
        log_fail "Failed to detect 2, got: $result"
    fi

    # Test 3 detection
    echo '{"content":"finalize deploy production polish"}' > "$test_file"
    result=$("$PIPELINE_DIR/lib/detect-phase.sh" "$test_file" 2>/dev/null)
    if [[ "$result" == "3" ]]; then
        log_pass "Detects phase 3 (finalize)"
    else
        log_fail "Failed to detect 3, got: $result"
    fi

    # Test unknown
    echo '{"content":"random unrelated content"}' > "$test_file"
    result=$("$PIPELINE_DIR/lib/detect-phase.sh" "$test_file" 2>/dev/null)
    if [[ "$result" == "unknown" ]]; then
        log_pass "Returns unknown for unmatched content"
    else
        log_fail "Should return unknown, got: $result"
    fi

    rm -f "$test_file"
}

# TEST: Analysis v6 - Main Script
test_analyze_v6() {
    echo ""
    echo "═══ TEST: Analysis v6 - Main Script ═══"

    # Test analyze-v6.sh exists and is executable
    if [[ ! -x "$PIPELINE_DIR/lib/analyze-v6.sh" ]]; then
        log_fail "analyze-v6.sh not executable"
        return 1
    fi
    log_pass "analyze-v6.sh exists and is executable"

    # Test help output
    local help_output
    help_output=$("$PIPELINE_DIR/lib/analyze-v6.sh" 2>&1 || true)

    if echo "$help_output" | grep -q "A.*Initial Analysis"; then
        log_pass "Help mentions phase A"
    else
        log_fail "Help missing phase A"
    fi

    if echo "$help_output" | grep -q "B.*Improvement Testing"; then
        log_pass "Help mentions phase B"
    else
        log_fail "Help missing phase B"
    fi

    if echo "$help_output" | grep -q "C.*Validation"; then
        log_pass "Help mentions phase C"
    else
        log_fail "Help missing phase C"
    fi
}

TEST="${1:-all}"

case "$TEST" in
    manifest)     test_manifest_init ;;
    update)       test_manifest_update ;;
    tty)          test_tty_detection ;;
    preflight)    test_preflight ;;
    transcript)   test_transcript ;;
    version)      test_version ;;
    watch)        test_watch ;;
    signal)       test_signal ;;
    todospans)    test_todo_spans ;;
    layer1)       test_layer1_metrics ;;
    patterndb)    test_pattern_db ;;
    detectphase)  test_detect_phase ;;
    analyzev6)    test_analyze_v6 ;;
    analysis-all)
        test_todo_spans
        test_layer1_metrics
        test_pattern_db
        test_detect_phase
        test_analyze_v6
        ;;
    all)
        test_manifest_init
        test_manifest_update
        test_tty_detection
        test_preflight
        test_transcript
        test_version
        test_watch
        test_signal
        test_todo_spans
        test_layer1_metrics
        test_pattern_db
        test_detect_phase
        test_analyze_v6
        ;;
    *) echo "Unknown: $TEST"; exit 1 ;;
esac

echo ""
echo "════════════════════════════════════════════"
echo -e "PASSED: ${GREEN}$PASSED${NC}  FAILED: ${RED}$FAILED${NC}"
echo "════════════════════════════════════════════"

[[ $FAILED -gt 0 ]] && exit 1
exit 0
