#!/bin/bash
# Pipeline Runner v4 - Non-interactive step execution with session continuity
# Usage: ./pipeline-runner.sh <step> [project-path]

set -euo pipefail

# Configuration
MAX_SESSIONS=5
METRICS_DIR="/home/claude/IMT/metrics"
COMMANDS_DIR="/home/claude/.claude/commands"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
STEP="${1:-}"
PROJECT_PATH="${2:-$(pwd)}"

if [ -z "$STEP" ]; then
    echo -e "${RED}Error: Step name required${NC}"
    echo "Usage: ./pipeline-runner.sh <step> [project-path]"
    echo ""
    echo "Steps:"
    echo "  New Project: 0a, 0b, 1, 2, 3"
    echo "  New Feature: 0a-feature, 0b-feature, 1-feature, 2-feature, 3-feature"
    exit 1
fi

# Map step to command file
get_command_file() {
    local step="$1"
    case "$step" in
        "0a")           echo "0a-pipeline-v4-brainstorm.md" ;;
        "0a-feature")   echo "0a-pipeline-v4-brainstorm-feature.md" ;;
        "0b")           echo "0b-pipeline-v4-technical.md" ;;
        "0b-feature")   echo "0b-pipeline-v4-technical-feature.md" ;;
        "1")            echo "1-pipeline-v4-bootstrap.md" ;;
        "1-feature")    echo "1-pipeline-v4-bootstrap-feature.md" ;;
        "2")            echo "2-pipeline-v4-implementEpic.md" ;;
        "2-feature")    echo "2-pipeline-v4-implementEpic-feature.md" ;;
        "3")            echo "3-pipeline-v4-finalize.md" ;;
        "3-feature")    echo "3-pipeline-v4-finalize-feature.md" ;;
        *)              echo "" ;;
    esac
}

COMMAND_FILE=$(get_command_file "$STEP")

if [ -z "$COMMAND_FILE" ]; then
    echo -e "${RED}Error: Unknown step '$STEP'${NC}"
    exit 1
fi

COMMAND_PATH="$COMMANDS_DIR/$COMMAND_FILE"

if [ ! -f "$COMMAND_PATH" ]; then
    echo -e "${RED}Error: Command file not found: $COMMAND_PATH${NC}"
    exit 1
fi

# Setup directories
PIPELINE_DIR="$PROJECT_PATH/.pipeline"
METRICS_OUTPUT_DIR="$PROJECT_PATH/docs/metrics"
mkdir -p "$PIPELINE_DIR" "$METRICS_OUTPUT_DIR"

# Checkpoint file
CHECKPOINT_FILE="$PIPELINE_DIR/checkpoint.json"

# Transcript file
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
TRANSCRIPT_FILE="$METRICS_OUTPUT_DIR/${STEP}-${TIMESTAMP}-transcript.md"

# Session tracking
get_session_count() {
    if [ -f "$CHECKPOINT_FILE" ]; then
        jq -r '.session // 0' "$CHECKPOINT_FILE"
    else
        echo "0"
    fi
}

SESSION_COUNT=$(get_session_count)
SESSION_COUNT=$((SESSION_COUNT + 1))

if [ "$SESSION_COUNT" -gt "$MAX_SESSIONS" ]; then
    echo -e "${RED}Error: Maximum sessions ($MAX_SESSIONS) reached for step '$STEP'${NC}"
    echo "Please review the diagnostic report and decide how to proceed."
    exit 1
fi

# Check if resuming
RESUME_PROMPT=""
if [ -f "$CHECKPOINT_FILE" ] && [ "$SESSION_COUNT" -gt 1 ]; then
    CHECKPOINT_STEP=$(jq -r '.step // ""' "$CHECKPOINT_FILE")
    if [ "$CHECKPOINT_STEP" = "$STEP" ]; then
        echo -e "${YELLOW}Resuming step '$STEP' (session $SESSION_COUNT/$MAX_SESSIONS)${NC}"

        # Build resume context
        LAST_ACTION=$(jq -r '.lastAction // "Unknown"' "$CHECKPOINT_FILE")
        CHECKPOINT_TIME=$(jq -r '.timestamp // "Unknown"' "$CHECKPOINT_FILE")
        TESTS_PASSING=$(jq -r '.testsStatus.passing // 0' "$CHECKPOINT_FILE")
        TESTS_TOTAL=$(jq -r '.testsStatus.total // 0' "$CHECKPOINT_FILE")

        RESUME_PROMPT="

---

# RESUMING STEP - SESSION $SESSION_COUNT/$MAX_SESSIONS

You are continuing a pipeline step that was interrupted.

## Previous Session Context

**Last checkpoint:** $CHECKPOINT_TIME
**Last action:** $LAST_ACTION
**Tests:** $TESTS_PASSING/$TESTS_TOTAL passing

## Instructions

Continue from where you left off. Do not restart the step.
Read the checkpoint file at .pipeline/checkpoint.json for full context.

---

"
    fi
fi

# Update checkpoint with new session
jq -n \
    --arg step "$STEP" \
    --argjson session "$SESSION_COUNT" \
    --arg timestamp "$(date -Iseconds)" \
    '{
        step: $step,
        session: $session,
        timestamp: $timestamp,
        status: "in_progress"
    }' > "$CHECKPOINT_FILE"

# Set metrics context
cat > "$METRICS_DIR/current-step.json" << EOF
{
  "step_id": "$STEP",
  "phase": "$(echo $STEP | cut -d'-' -f1)",
  "model": "sonnet",
  "session": $SESSION_COUNT
}
EOF

# Start timing
START_TIME=$(date +%s)
START_TIMESTAMP=$(date -Iseconds)

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Pipeline Step: $STEP (Session $SESSION_COUNT/$MAX_SESSIONS)${NC}"
echo -e "${BLUE}Project: $PROJECT_PATH${NC}"
echo -e "${BLUE}Started: $(date)${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Read command content
COMMAND_CONTENT=$(cat "$COMMAND_PATH")

# Add resume prompt if resuming
if [ -n "$RESUME_PROMPT" ]; then
    COMMAND_CONTENT="$RESUME_PROMPT$COMMAND_CONTENT"
fi

# Write transcript header
cat > "$TRANSCRIPT_FILE" << EOF
# Step Transcript: $STEP

**Session:** $SESSION_COUNT/$MAX_SESSIONS
**Started:** $START_TIMESTAMP
**Project:** $PROJECT_PATH

---

## Conversation

EOF

# Run Claude in non-interactive mode
# --print streams output and exits when done
echo -e "${GREEN}Starting Claude CLI (non-interactive mode)...${NC}"
echo ""

# Execute and capture output
set +e
cd "$PROJECT_PATH"
claude --model opus --print -p "$COMMAND_CONTENT" 2>&1 | tee -a "$TRANSCRIPT_FILE"
EXIT_CODE=$?
set -e

# End timing
END_TIME=$(date +%s)
END_TIMESTAMP=$(date -Iseconds)
DURATION=$((END_TIME - START_TIME))

# Append transcript footer
cat >> "$TRANSCRIPT_FILE" << EOF

---

## Session End

**Ended:** $END_TIMESTAMP
**Duration:** ${DURATION}s
**Exit Code:** $EXIT_CODE
EOF

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Step Complete${NC}"
echo -e "${BLUE}Duration: ${DURATION}s${NC}"
echo -e "${BLUE}Transcript: $TRANSCRIPT_FILE${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"

# Generate metrics JSON
METRICS_FILE="$METRICS_OUTPUT_DIR/${STEP}.json"
jq -n \
    --arg step "$STEP" \
    --arg start "$START_TIMESTAMP" \
    --arg end "$END_TIMESTAMP" \
    --argjson duration "$DURATION" \
    --argjson session "$SESSION_COUNT" \
    --argjson exit_code "$EXIT_CODE" \
    --arg transcript "$TRANSCRIPT_FILE" \
    '{
        step: $step,
        start: $start,
        end: $end,
        duration: $duration,
        session: $session,
        exit_code: $exit_code,
        transcript: $transcript,
        status: (if $exit_code == 0 then "success" else "failed" end)
    }' > "$METRICS_FILE"

echo -e "${GREEN}Metrics saved: $METRICS_FILE${NC}"

# Check if step completed successfully
if [ "$EXIT_CODE" -ne 0 ]; then
    echo -e "${YELLOW}Step exited with code $EXIT_CODE${NC}"

    # Check if we should retry
    if [ "$SESSION_COUNT" -lt "$MAX_SESSIONS" ]; then
        echo -e "${YELLOW}You can retry with: npm run pipeline:step $STEP${NC}"
    else
        echo -e "${RED}Maximum sessions reached. Please review and decide how to proceed.${NC}"
    fi
fi

exit $EXIT_CODE
