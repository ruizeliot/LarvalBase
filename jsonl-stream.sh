#!/bin/bash
# Stream Claude Code JSONL session in real-time
# Usage: ./jsonl-stream.sh <project-path> [options]
#
# Options:
#   --session <id>     Watch specific session (default: latest)
#   --format <type>    Output format: json, markdown, text (default: json)
#   --include-tools    Include tool calls in output

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

PROJECT_PATH=""
SESSION_ID=""
FORMAT="json"
INCLUDE_TOOLS=false

# Parse options
while [[ $# -gt 0 ]]; do
    case $1 in
        --session|-s)
            SESSION_ID="$2"
            shift 2
            ;;
        --format|-f)
            FORMAT="$2"
            shift 2
            ;;
        --include-tools)
            INCLUDE_TOOLS=true
            shift
            ;;
        -*)
            echo "Unknown option: $1" >&2
            exit 1
            ;;
        *)
            PROJECT_PATH="$1"
            shift
            ;;
    esac
done

if [[ -z "$PROJECT_PATH" ]]; then
    echo "Usage: $0 <project-path> [--session <id>] [--format json|markdown|text] [--include-tools]" >&2
    exit 1
fi

# Find the JSONL file
if [[ -n "$SESSION_ID" ]]; then
    JSONL_FILE=$("$SCRIPT_DIR/find-session.sh" --session "$SESSION_ID" 2>/dev/null)
else
    JSONL_FILE=$("$SCRIPT_DIR/find-session.sh" --latest "$PROJECT_PATH" 2>/dev/null)
fi

if [[ -z "$JSONL_FILE" ]] || [[ ! -f "$JSONL_FILE" ]]; then
    echo "Error: Could not find JSONL file" >&2
    exit 1
fi

echo "Streaming: $JSONL_FILE" >&2
echo "Format: $FORMAT" >&2
echo "---" >&2

# jq filter based on format
case "$FORMAT" in
    json)
        # Output clean JSON events
        JQ_FILTER='
            if .type == "user" and .message.content then
                if (.message.content | type) == "string" and
                   (.message.content | (startswith("[{") or startswith("<command-") or startswith("<local-command")) | not) then
                    {type: "user", timestamp: .timestamp, content: .message.content}
                else empty end
            elif .type == "assistant" and .message.content then
                (.message.content | if type == "array" then
                    map(
                        if .type == "text" and .text and .text != "" then
                            {type: "assistant", content: .text}
                        elif .type == "tool_use" and $tools == "true" then
                            {type: "tool", name: .name}
                        else empty end
                    ) | .[]
                else empty end)
            elif .type == "summary" and .summary then
                {type: "summary", content: .summary}
            else empty end
        '
        ;;
    markdown)
        # Output markdown formatted
        JQ_FILTER='
            if .type == "user" and .message.content then
                if (.message.content | type) == "string" and
                   (.message.content | (startswith("[{") or startswith("<command-") or startswith("<local-command")) | not) then
                    "## User\n*\(.timestamp)*\n\n\(.message.content)\n"
                else empty end
            elif .type == "assistant" and .message.content then
                (.message.content | if type == "array" then
                    map(
                        if .type == "text" and .text and .text != "" then
                            "## Claude\n\n\(.text)\n"
                        elif .type == "tool_use" and $tools == "true" then
                            "**Tool:** `\(.name)`\n"
                        else empty end
                    ) | join("")
                else empty end)
            elif .type == "summary" and .summary then
                "---\n**Summary:** \(.summary)\n"
            else empty end
        '
        ;;
    text)
        # Output plain text
        JQ_FILTER='
            if .type == "user" and .message.content then
                if (.message.content | type) == "string" and
                   (.message.content | (startswith("[{") or startswith("<command-") or startswith("<local-command")) | not) then
                    "USER: \(.message.content)"
                else empty end
            elif .type == "assistant" and .message.content then
                (.message.content | if type == "array" then
                    map(
                        if .type == "text" and .text and .text != "" then
                            "CLAUDE: \(.text)"
                        elif .type == "tool_use" and $tools == "true" then
                            "TOOL: \(.name)"
                        else empty end
                    ) | join("\n")
                else empty end)
            elif .type == "summary" and .summary then
                "SUMMARY: \(.summary)"
            else empty end
        '
        ;;
    *)
        echo "Unknown format: $FORMAT" >&2
        exit 1
        ;;
esac

# Stream with tail -f, processing each line
tail -n +1 -f "$JSONL_FILE" 2>/dev/null | \
    jq -r --unbuffered --arg tools "$INCLUDE_TOOLS" "$JQ_FILTER"
