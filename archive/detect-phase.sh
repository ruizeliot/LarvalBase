#!/bin/bash
# Detect pipeline phase from JSONL session file
# Usage: ./detect-phase.sh <session-jsonl-file>
#
# Returns: 0a, 0b, 1, 2, or 3 (or "unknown" if cannot determine)

set -euo pipefail

JSONL_FILE="${1:-}"

if [[ -z "$JSONL_FILE" ]] || [[ ! -f "$JSONL_FILE" ]]; then
    echo "unknown"
    exit 0
fi

# Sample first 100 lines for efficiency (enough to detect phase)
SAMPLE=$(head -100 "$JSONL_FILE" 2>/dev/null || cat "$JSONL_FILE")

# Check for phase indicators in the content
# Phase 0a: Brainstorm (user stories, brainstorm-notes)
if echo "$SAMPLE" | grep -qi "brainstorm\|user.stories\|brainstorm-notes"; then
    if echo "$SAMPLE" | grep -qi "e2e.*spec\|tech.stack\|technical"; then
        echo "0b"
    else
        echo "0a"
    fi
    exit 0
fi

# Phase 0b: Technical (E2E specs, tech stack)
if echo "$SAMPLE" | grep -qi "e2e.*spec\|tech.stack\|cypress\|test.*spec"; then
    echo "0b"
    exit 0
fi

# Phase 1: Bootstrap (skeleton, RED state, failing tests)
if echo "$SAMPLE" | grep -qi "bootstrap\|skeleton\|RED.*state\|failing.*test\|all.*fail"; then
    echo "1"
    exit 0
fi

# Phase 2: Implement (epic, GREEN state, implement)
if echo "$SAMPLE" | grep -qi "implement.*epic\|GREEN.*state\|epic.*complete\|passing.*test"; then
    echo "2"
    exit 0
fi

# Phase 3: Finalize (finalize, polish, deploy, production)
if echo "$SAMPLE" | grep -qi "finalize\|polish\|deploy\|production"; then
    echo "3"
    exit 0
fi

# Check for phase number in command content
if echo "$SAMPLE" | grep -qi "0a-pipeline\|phase.0a"; then
    echo "0a"
    exit 0
fi

if echo "$SAMPLE" | grep -qi "0b-pipeline\|phase.0b"; then
    echo "0b"
    exit 0
fi

if echo "$SAMPLE" | grep -qi "1-pipeline\|phase.1\|bootstrap"; then
    echo "1"
    exit 0
fi

if echo "$SAMPLE" | grep -qi "2-pipeline\|phase.2\|implementEpic"; then
    echo "2"
    exit 0
fi

if echo "$SAMPLE" | grep -qi "3-pipeline\|phase.3\|finalize"; then
    echo "3"
    exit 0
fi

# Default: unknown
echo "unknown"
