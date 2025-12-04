#!/bin/bash
# Test suite for Supervised Pipeline User Stories
# Run from Pipeline-Office/tests directory

set -eu
# Note: pipefail removed to allow tests that check stderr output from failing commands

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIPELINE_DIR="$(dirname "$SCRIPT_DIR")"
MOCK_PROJECT="$PIPELINE_DIR/mock-test"
SUPERVISOR_SKILL="$HOME/.claude/commands/supervisor.md"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

PASSED=0
FAILED=0

pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    PASSED=$((PASSED + 1))
}

fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    FAILED=$((FAILED + 1))
}

# ═══════════════════════════════════════════════════════════════
# US-01: Start new pipeline or feature pipeline
# ═══════════════════════════════════════════════════════════════
test_us01() {
    echo ""
    echo "═══ US-01: Start new pipeline or feature pipeline ═══"

    # Test 1: supervise command exists
    if "$PIPELINE_DIR/pipeline" supervise 2>&1 | grep -q "Usage.*supervise"; then
        pass "US-01a: supervise command exists"
    else
        fail "US-01a: supervise command exists"
    fi

    # Test 2: --feature flag documented
    if "$PIPELINE_DIR/pipeline" supervise 2>&1 | grep -q "\-\-feature"; then
        pass "US-01b: --feature flag documented"
    else
        fail "US-01b: --feature flag documented"
    fi

    # Test 3: Mode detection logic in code
    if grep -q 'mode="new-project"' "$PIPELINE_DIR/pipeline"; then
        pass "US-01c: new-project mode defined"
    else
        fail "US-01c: new-project mode defined"
    fi

    # Test 4: Feature mode detection in code (checks if feature_mode triggers mode="feature")
    if grep -q 'feature_mode' "$PIPELINE_DIR/pipeline" && grep -q 'mode="feature"' "$PIPELINE_DIR/pipeline"; then
        pass "US-01d: feature mode detection in code"
    else
        fail "US-01d: feature mode detection in code"
    fi
}

# ═══════════════════════════════════════════════════════════════
# US-02: SSH disconnect survival
# ═══════════════════════════════════════════════════════════════
test_us02() {
    echo ""
    echo "═══ US-02: SSH disconnect survival ═══"

    # Test: nohup used
    if grep -q "nohup" "$PIPELINE_DIR/pipeline"; then
        pass "US-02a: nohup used for background processes"
    else
        fail "US-02a: nohup used for background processes"
    fi

    # Test: disown used
    if grep -q "disown" "$PIPELINE_DIR/pipeline"; then
        pass "US-02b: disown used for background processes"
    else
        fail "US-02b: disown used for background processes"
    fi

    # Test: Worker log file configured
    if grep -q "pipeline.*worker.log" "$PIPELINE_DIR/pipeline"; then
        pass "US-02c: Worker log file path configured"
    else
        fail "US-02c: Worker log file path configured"
    fi

    # Test: Heartbeat log file configured
    if grep -q "pipeline.*heartbeat.log" "$PIPELINE_DIR/pipeline"; then
        pass "US-02d: Heartbeat log file path configured"
    else
        fail "US-02d: Heartbeat log file path configured"
    fi
}

# ═══════════════════════════════════════════════════════════════
# US-03: Send messages to supervisor or worker
# ═══════════════════════════════════════════════════════════════
test_us03() {
    echo ""
    echo "═══ US-03: Send messages to supervisor or worker ═══"

    # Test: --supervisor flag in code
    if grep -q "\-\-supervisor" "$PIPELINE_DIR/pipeline"; then
        pass "US-03a: --supervisor flag exists"
    else
        fail "US-03a: --supervisor flag exists"
    fi

    # Test: --worker flag in code
    if grep -q "\-\-worker" "$PIPELINE_DIR/pipeline"; then
        pass "US-03b: --worker flag exists"
    else
        fail "US-03b: --worker flag exists"
    fi

    # Test: Default target is worker
    if grep -A3 'cmd_send()' "$PIPELINE_DIR/pipeline" | grep -q 'target="worker"'; then
        pass "US-03c: Default send target is worker"
    else
        fail "US-03c: Default send target is worker"
    fi

    # Test: Session name uses target
    if grep -q 'session_name="${target}-${project_name}"' "$PIPELINE_DIR/pipeline"; then
        pass "US-03d: Session name uses target prefix"
    else
        fail "US-03d: Session name uses target prefix"
    fi
}

# ═══════════════════════════════════════════════════════════════
# US-04: View supervisor/worker sessions
# ═══════════════════════════════════════════════════════════════
test_us04() {
    echo ""
    echo "═══ US-04: View supervisor/worker sessions ═══"

    # Test: Supervisor session naming
    if grep -q 'supervisor_session="supervisor-' "$PIPELINE_DIR/pipeline"; then
        pass "US-04a: Supervisor session naming correct"
    else
        fail "US-04a: Supervisor session naming correct"
    fi

    # Test: Worker session naming
    if grep -q 'worker_session="worker-' "$PIPELINE_DIR/pipeline"; then
        pass "US-04b: Worker session naming correct"
    else
        fail "US-04b: Worker session naming correct"
    fi

    # Test: Attach commands shown
    if grep -q "tmux attach -t.*supervisor" "$PIPELINE_DIR/pipeline"; then
        pass "US-04c: Supervisor attach command shown"
    else
        fail "US-04c: Supervisor attach command shown"
    fi

    if grep -q "tmux attach -t.*worker" "$PIPELINE_DIR/pipeline"; then
        pass "US-04d: Worker attach command shown"
    else
        fail "US-04d: Worker attach command shown"
    fi
}

# ═══════════════════════════════════════════════════════════════
# US-05: Supervisor receives heartbeat updates
# ═══════════════════════════════════════════════════════════════
test_us05() {
    echo ""
    echo "═══ US-05: Supervisor receives heartbeat updates ═══"

    # Test: auto-monitor targets supervisor
    if grep -q 'auto-monitor.*--target.*supervisor_session' "$PIPELINE_DIR/pipeline"; then
        pass "US-05a: Heartbeat targets supervisor session"
    else
        fail "US-05a: Heartbeat targets supervisor session"
    fi

    # Test: Interval parameter exists
    if grep -q '\-\-interval' "$PIPELINE_DIR/pipeline"; then
        pass "US-05b: Heartbeat interval configurable"
    else
        fail "US-05b: Heartbeat interval configurable"
    fi

    # Test: Default interval is 120s
    if grep -q 'interval=120' "$PIPELINE_DIR/pipeline"; then
        pass "US-05c: Default heartbeat interval is 120s"
    else
        fail "US-05c: Default heartbeat interval is 120s"
    fi
}

# ═══════════════════════════════════════════════════════════════
# US-06: Supervisor can intervene if worker stalls
# ═══════════════════════════════════════════════════════════════
test_us06() {
    echo ""
    echo "═══ US-06: Supervisor can intervene if worker stalls ═══"

    # Test: Stall detection documented
    if grep -q "stall_count" "$SUPERVISOR_SKILL"; then
        pass "US-06a: Stall count tracking documented"
    else
        fail "US-06a: Stall count tracking documented"
    fi

    # Test: 3+ heartbeats threshold
    if grep -qE "3.*heartbeat|stall_count.*3" "$SUPERVISOR_SKILL"; then
        pass "US-06b: 3+ heartbeats stall threshold documented"
    else
        fail "US-06b: 3+ heartbeats stall threshold documented"
    fi

    # Test: Intervention actions documented
    if grep -q "Intervention Actions" "$SUPERVISOR_SKILL"; then
        pass "US-06c: Intervention actions documented"
    else
        fail "US-06c: Intervention actions documented"
    fi

    # Test: Send nudge action documented
    if grep -q 'send.*continue' "$SUPERVISOR_SKILL"; then
        pass "US-06d: Send nudge intervention documented"
    else
        fail "US-06d: Send nudge intervention documented"
    fi
}

# ═══════════════════════════════════════════════════════════════
# US-07: Supervisor knows the mode
# ═══════════════════════════════════════════════════════════════
test_us07() {
    echo ""
    echo "═══ US-07: Supervisor knows the mode ═══"

    # Test: Mode passed to supervisor skill
    if grep -q '/supervisor.*--mode' "$PIPELINE_DIR/pipeline"; then
        pass "US-07a: Mode passed to supervisor skill"
    else
        fail "US-07a: Mode passed to supervisor skill"
    fi

    # Test: new-project mode exists
    if grep -q 'mode="new-project"' "$PIPELINE_DIR/pipeline"; then
        pass "US-07b: new-project mode exists"
    else
        fail "US-07b: new-project mode exists"
    fi

    # Test: feature mode exists
    if grep -q 'mode="feature"' "$PIPELINE_DIR/pipeline"; then
        pass "US-07c: feature mode exists"
    else
        fail "US-07c: feature mode exists"
    fi

    # Test: resume mode exists
    if grep -q 'mode="resume"' "$PIPELINE_DIR/pipeline"; then
        pass "US-07d: resume mode exists"
    else
        fail "US-07d: resume mode exists"
    fi

    # Test: Mode documented in supervisor skill
    if grep -q "Mode.*new-project\|Mode.*feature\|Mode.*resume" "$SUPERVISOR_SKILL"; then
        pass "US-07e: Modes documented in supervisor skill"
    else
        fail "US-07e: Modes documented in supervisor skill"
    fi
}

# ═══════════════════════════════════════════════════════════════
# US-08: Supervisor doesn't interrupt phase 0a
# ═══════════════════════════════════════════════════════════════
test_us08() {
    echo ""
    echo "═══ US-08: Supervisor doesn't interrupt phase 0a ═══"

    # Test: Phase 0a marked as interactive
    if grep -qE "0a.*Interactive|0a.*YES|Phase 0a.*interactive" "$SUPERVISOR_SKILL"; then
        pass "US-08a: Phase 0a marked as interactive"
    else
        fail "US-08a: Phase 0a marked as interactive"
    fi

    # Test: DO NOT rules for phase 0a
    if grep -q "DO NOT" "$SUPERVISOR_SKILL"; then
        pass "US-08b: DO NOT rules documented"
    else
        fail "US-08b: DO NOT rules documented"
    fi

    # Test: Phase 0a sacred rule
    if grep -qE "Phase 0a is sacred|NEVER interrupt" "$SUPERVISOR_SKILL"; then
        pass "US-08c: Phase 0a sacred rule documented"
    else
        fail "US-08c: Phase 0a sacred rule documented"
    fi

    # Test: Just acknowledge heartbeats for phase 0a
    if grep -q "acknowledge.*Phase 0a\|Standing by" "$SUPERVISOR_SKILL"; then
        pass "US-08d: Acknowledge-only behavior for phase 0a documented"
    else
        fail "US-08d: Acknowledge-only behavior for phase 0a documented"
    fi
}

# ═══════════════════════════════════════════════════════════════
# Run all tests
# ═══════════════════════════════════════════════════════════════
main() {
    echo "════════════════════════════════════════════"
    echo "SUPERVISED PIPELINE USER STORY TESTS"
    echo "════════════════════════════════════════════"

    test_us01
    test_us02
    test_us03
    test_us04
    test_us05
    test_us06
    test_us07
    test_us08

    echo ""
    echo "════════════════════════════════════════════"
    echo -e "PASSED: ${GREEN}$PASSED${NC}  FAILED: ${RED}$FAILED${NC}"
    echo "════════════════════════════════════════════"

    if [ $FAILED -gt 0 ]; then
        exit 1
    fi
}

main "$@"
