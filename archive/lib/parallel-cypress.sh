#!/bin/bash
# parallel-cypress.sh - Run Cypress tests in parallel by epic
# Usage: ./lib/parallel-cypress.sh <project-path> [max-parallel]
#
# Runs each epic's test file in a separate background process,
# waits for all to complete, and aggregates results.
#
# Adaptive parallelism: Auto-detects CPU cores and RAM to optimize.
# Cross-platform: Linux, macOS, Windows (Git Bash, WSL)

set -euo pipefail

PROJECT_PATH="${1:-.}"
USER_MAX_PARALLEL="${2:-}"  # User override (empty = auto-detect)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# =============================================================================
# SYSTEM DETECTION (Cross-Platform)
# =============================================================================

detect_cpu_cores() {
    local cores=4  # Safe fallback

    if [[ "$OSTYPE" == "linux-gnu"* ]] || [[ -f /proc/cpuinfo ]]; then
        # Linux or WSL
        cores=$(nproc 2>/dev/null || grep -c ^processor /proc/cpuinfo 2>/dev/null || echo 4)
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        cores=$(sysctl -n hw.ncpu 2>/dev/null || echo 4)
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ -n "${NUMBER_OF_PROCESSORS:-}" ]]; then
        # Windows Git Bash / Cygwin
        cores="${NUMBER_OF_PROCESSORS:-4}"
    fi

    echo "$cores"
}

detect_ram_gb() {
    local ram_gb=8  # Safe fallback

    if [[ "$OSTYPE" == "linux-gnu"* ]] || [[ -f /proc/meminfo ]]; then
        # Linux or WSL - get total RAM in GB
        local ram_kb=$(grep MemTotal /proc/meminfo 2>/dev/null | awk '{print $2}' || echo 8388608)
        ram_gb=$((ram_kb / 1024 / 1024))
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS - get RAM in bytes, convert to GB
        local ram_bytes=$(sysctl -n hw.memsize 2>/dev/null || echo 8589934592)
        ram_gb=$((ram_bytes / 1024 / 1024 / 1024))
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        # Windows Git Bash - use wmic or default
        local ram_bytes=$(wmic computersystem get TotalPhysicalMemory 2>/dev/null | grep -oE '[0-9]+' | head -1 || echo 8589934592)
        ram_gb=$((ram_bytes / 1024 / 1024 / 1024))
    fi

    # Ensure minimum of 1
    [[ $ram_gb -lt 1 ]] && ram_gb=1
    echo "$ram_gb"
}

detect_platform() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if grep -qi microsoft /proc/version 2>/dev/null; then
            echo "WSL"
        else
            echo "Linux"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macOS"
    elif [[ "$OSTYPE" == "msys" ]]; then
        echo "Windows (Git Bash)"
    elif [[ "$OSTYPE" == "cygwin" ]]; then
        echo "Windows (Cygwin)"
    else
        echo "Unknown ($OSTYPE)"
    fi
}

calculate_optimal_parallel() {
    local cores=$1
    local ram_gb=$2
    local spec_count=$3

    # Each Cypress process needs ~400-500MB RAM
    local ram_limit=$((ram_gb * 1024 / 500))  # Max processes based on RAM

    # Leave 1-2 cores for system (scale with core count)
    local reserved_cores=1
    [[ $cores -gt 8 ]] && reserved_cores=2
    [[ $cores -gt 16 ]] && reserved_cores=3
    local cpu_limit=$((cores - reserved_cores))

    # Take minimum of CPU limit, RAM limit, and spec count
    local optimal=$cpu_limit
    [[ $ram_limit -lt $optimal ]] && optimal=$ram_limit
    [[ $spec_count -lt $optimal ]] && optimal=$spec_count

    # Ensure at least 1, cap at 16 (diminishing returns beyond)
    [[ $optimal -lt 1 ]] && optimal=1
    [[ $optimal -gt 16 ]] && optimal=16

    echo "$optimal"
}

# =============================================================================
# DETECT SYSTEM RESOURCES
# =============================================================================

CPU_CORES=$(detect_cpu_cores)
RAM_GB=$(detect_ram_gb)
PLATFORM=$(detect_platform)

# Find Cypress directory
if [ -d "$PROJECT_PATH/client/cypress" ]; then
    CYPRESS_DIR="$PROJECT_PATH/client"
elif [ -d "$PROJECT_PATH/cypress" ]; then
    CYPRESS_DIR="$PROJECT_PATH"
else
    echo -e "${RED}Error: Cannot find cypress directory${NC}"
    exit 1
fi

# Results directory (cross-platform temp)
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    RESULTS_DIR="${TEMP:-/tmp}/cypress-parallel-$$"
else
    RESULTS_DIR="/tmp/cypress-parallel-$$"
fi
mkdir -p "$RESULTS_DIR"

# Find all epic test files
SPEC_FILES=($(find "$CYPRESS_DIR/cypress/e2e" -name "epic*.cy.ts" 2>/dev/null | sort))

if [ ${#SPEC_FILES[@]} -eq 0 ]; then
    echo -e "${YELLOW}No epic*.cy.ts files found. Running full suite sequentially.${NC}"
    cd "$CYPRESS_DIR" && npx cypress run
    exit $?
fi

# =============================================================================
# CALCULATE OPTIMAL PARALLELISM
# =============================================================================

SPEC_COUNT=${#SPEC_FILES[@]}
OPTIMAL_PARALLEL=$(calculate_optimal_parallel "$CPU_CORES" "$RAM_GB" "$SPEC_COUNT")

# Use user override if provided, otherwise use calculated optimal
if [[ -n "$USER_MAX_PARALLEL" ]]; then
    MAX_PARALLEL="$USER_MAX_PARALLEL"
    PARALLEL_SOURCE="user override"
else
    MAX_PARALLEL="$OPTIMAL_PARALLEL"
    PARALLEL_SOURCE="auto-detected"
fi

# =============================================================================
# OUTPUT HEADER
# =============================================================================

echo "=============================================="
echo "Parallel Cypress Test Runner v6.2"
echo "=============================================="
echo ""
echo -e "${CYAN}System Detection:${NC}"
echo "  Platform:    $PLATFORM"
echo "  CPU Cores:   $CPU_CORES"
echo "  RAM:         ${RAM_GB}GB"
echo ""
echo -e "${CYAN}Parallelism:${NC}"
echo "  Optimal:     $OPTIMAL_PARALLEL (calculated)"
echo "  Using:       $MAX_PARALLEL ($PARALLEL_SOURCE)"
if [[ $MAX_PARALLEL -gt $OPTIMAL_PARALLEL ]]; then
    echo -e "  ${YELLOW}Warning: Using more than optimal may cause slowdown${NC}"
fi
echo ""
echo -e "${CYAN}Test Configuration:${NC}"
echo "  Project:     $PROJECT_PATH"
echo "  Specs:       $SPEC_COUNT epic files"
echo "  Results:     $RESULTS_DIR"
echo "=============================================="
echo ""

# Progress marker
echo "[PROGRESS] {\"task\": \"parallel-cypress\", \"status\": \"started\", \"specs\": $SPEC_COUNT, \"parallel\": $MAX_PARALLEL, \"platform\": \"$PLATFORM\", \"cores\": $CPU_CORES, \"ram_gb\": $RAM_GB}"

# Track PIDs and their spec files
declare -A PIDS
RUNNING=0

# Function to wait for a slot
wait_for_slot() {
    while [ $RUNNING -ge $MAX_PARALLEL ]; do
        for pid in "${!PIDS[@]}"; do
            if ! kill -0 "$pid" 2>/dev/null; then
                unset PIDS[$pid]
                ((RUNNING--))
            fi
        done
        sleep 0.5
    done
}

# Start time
START_TIME=$(date +%s)

# Launch parallel processes
for SPEC in "${SPEC_FILES[@]}"; do
    wait_for_slot

    SPEC_NAME=$(basename "$SPEC" .cy.ts)
    RESULT_FILE="$RESULTS_DIR/$SPEC_NAME.json"
    LOG_FILE="$RESULTS_DIR/$SPEC_NAME.log"

    echo -e "${YELLOW}Starting:${NC} $SPEC_NAME"

    # Run Cypress in background, capture exit code
    (
        cd "$CYPRESS_DIR"
        npx cypress run \
            --spec "$SPEC" \
            --reporter json \
            --reporter-options "output=$RESULT_FILE" \
            > "$LOG_FILE" 2>&1
        echo $? > "$RESULTS_DIR/$SPEC_NAME.exit"
    ) &

    PIDS[$!]="$SPEC_NAME"
    ((RUNNING++))
done

# Wait for all to complete
echo ""
echo "Waiting for all tests to complete..."
wait

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Aggregate results
echo ""
echo "=============================================="
echo "Results Summary"
echo "=============================================="

TOTAL_PASSED=0
TOTAL_FAILED=0
TOTAL_SPECS=0
FAILED_SPECS=()

for SPEC in "${SPEC_FILES[@]}"; do
    SPEC_NAME=$(basename "$SPEC" .cy.ts)
    EXIT_FILE="$RESULTS_DIR/$SPEC_NAME.exit"
    LOG_FILE="$RESULTS_DIR/$SPEC_NAME.log"

    ((TOTAL_SPECS++))

    if [ -f "$EXIT_FILE" ]; then
        EXIT_CODE=$(cat "$EXIT_FILE")

        # Extract pass/fail counts from log
        PASSED=$(grep -oP '\d+(?= passing)' "$LOG_FILE" 2>/dev/null | tail -1 || echo "0")
        FAILED=$(grep -oP '\d+(?= failing)' "$LOG_FILE" 2>/dev/null | tail -1 || echo "0")

        PASSED=${PASSED:-0}
        FAILED=${FAILED:-0}

        TOTAL_PASSED=$((TOTAL_PASSED + PASSED))
        TOTAL_FAILED=$((TOTAL_FAILED + FAILED))

        if [ "$EXIT_CODE" -eq 0 ]; then
            echo -e "${GREEN}✓${NC} $SPEC_NAME: $PASSED passed"
        else
            echo -e "${RED}✗${NC} $SPEC_NAME: $PASSED passed, $FAILED failed"
            FAILED_SPECS+=("$SPEC_NAME")
        fi
    else
        echo -e "${RED}✗${NC} $SPEC_NAME: No result (process may have crashed)"
        FAILED_SPECS+=("$SPEC_NAME")
    fi
done

echo "----------------------------------------------"
echo "Total: $TOTAL_PASSED passed, $TOTAL_FAILED failed"
echo "Duration: ${DURATION}s (parallel @ $MAX_PARALLEL processes)"
echo "Specs run: $TOTAL_SPECS"
echo ""
echo -e "${CYAN}Performance:${NC}"
SEQUENTIAL_ESTIMATE=$((DURATION * MAX_PARALLEL))
SPEEDUP=$(echo "scale=1; $SEQUENTIAL_ESTIMATE / $DURATION" | bc 2>/dev/null || echo "N/A")
echo "  Estimated sequential: ~${SEQUENTIAL_ESTIMATE}s"
echo "  Actual parallel:      ${DURATION}s"
echo "  Speedup:              ~${SPEEDUP}x"

# Progress marker with results
echo "[PROGRESS] {\"task\": \"parallel-cypress\", \"status\": \"complete\", \"passed\": $TOTAL_PASSED, \"failed\": $TOTAL_FAILED, \"duration\": $DURATION, \"parallel\": $MAX_PARALLEL, \"platform\": \"$PLATFORM\"}"

# Show failed spec details
if [ ${#FAILED_SPECS[@]} -gt 0 ]; then
    echo ""
    echo -e "${RED}Failed specs:${NC}"
    for SPEC_NAME in "${FAILED_SPECS[@]}"; do
        echo "  - $SPEC_NAME"
        # Show last 20 lines of log for failed specs
        if [ -f "$RESULTS_DIR/$SPEC_NAME.log" ]; then
            echo "    Last error:"
            tail -20 "$RESULTS_DIR/$SPEC_NAME.log" | grep -E "(Error|AssertionError|failed|✗)" | head -5 | sed 's/^/      /'
        fi
    done
fi

# Cleanup
rm -rf "$RESULTS_DIR"

# Exit with failure if any tests failed
if [ $TOTAL_FAILED -gt 0 ] || [ ${#FAILED_SPECS[@]} -gt 0 ]; then
    exit 1
fi

exit 0
