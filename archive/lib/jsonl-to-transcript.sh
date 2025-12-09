#!/bin/bash
# Convert Claude Code JSONL session file to clean markdown transcript
# Usage: ./jsonl-to-transcript.sh <session-jsonl-file> [options]
#
# Options:
#   --include-thinking    Include Claude's thinking blocks
#   --include-tools       Include tool calls (default: only text)
#   --no-header           Skip the header metadata section

set -euo pipefail

JSONL_FILE="${1:-}"
INCLUDE_THINKING=false
INCLUDE_TOOLS=false
NO_HEADER=false

# Parse options
shift || true
while [[ $# -gt 0 ]]; do
    case $1 in
        --include-thinking) INCLUDE_THINKING=true ;;
        --include-tools) INCLUDE_TOOLS=true ;;
        --no-header) NO_HEADER=true ;;
        *) echo "Unknown option: $1" >&2; exit 1 ;;
    esac
    shift
done

if [[ -z "$JSONL_FILE" ]] || [[ ! -f "$JSONL_FILE" ]]; then
    echo "Usage: $0 <session-jsonl-file> [--include-thinking] [--include-tools] [--no-header]" >&2
    exit 1
fi

# Print header if requested (extract metadata from first record with sessionId)
if [[ "$NO_HEADER" != "true" ]]; then
    # Get first record with metadata
    FIRST_REC=$(head -20 "$JSONL_FILE" | jq -s 'map(select(.sessionId)) | first // {}')
    SESSION_ID=$(echo "$FIRST_REC" | jq -r '.sessionId // "unknown"')
    PROJECT=$(echo "$FIRST_REC" | jq -r '.cwd // "unknown"')
    VERSION=$(echo "$FIRST_REC" | jq -r '.version // "unknown"')

    # Get first and last timestamps efficiently
    FIRST_TS=$(head -50 "$JSONL_FILE" | jq -r 'select(.timestamp) | .timestamp' | head -1)
    LAST_TS=$(tail -20 "$JSONL_FILE" | jq -r 'select(.timestamp) | .timestamp' | tail -1)

    cat << EOF
# Session Transcript

**Session ID:** ${SESSION_ID}
**Project:** ${PROJECT}
**Version:** ${VERSION}
**Started:** ${FIRST_TS:-unknown}
**Ended:** ${LAST_TS:-unknown}

---

EOF
fi

# Process messages in single pass
jq -r --arg inc_thinking "$INCLUDE_THINKING" --arg inc_tools "$INCLUDE_TOOLS" '
def process_line:
  if type != "object" then empty
  elif .type == "user" and .message.content then
    (.message.content | if type == "string" then . else null end) as $content |
    if $content != null then
      if ($content | (startswith("[{") or startswith("<command-") or startswith("<local-command"))) then
        empty
      else
        "## User\n*\(.timestamp // "")*\n\n\($content)\n"
      end
    else empty end
  elif .type == "assistant" and .message.content then
    (.message.content | if type == "array" then
      map(
        if type != "object" then empty
        elif .type == "text" and .text and .text != "" then
          "## Claude\n\n\(.text)\n"
        elif .type == "thinking" and $inc_thinking == "true" and .thinking then
          "<details>\n<summary>Thinking...</summary>\n\n\(.thinking)\n\n</details>\n"
        elif .type == "tool_use" and $inc_tools == "true" then
          "**Tool:** `\(.name)`\n"
        else empty end
      ) | join("\n")
    else empty end)
  elif .type == "summary" and .summary then
    "---\n\n**Session Summary:** \(.summary)\n"
  else empty end;

process_line
' "$JSONL_FILE"
