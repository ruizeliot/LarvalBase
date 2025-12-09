#!/bin/bash
# Layer 1 Metrics Calculator - Automatic metrics from JSONL transcripts
# Usage: ./layer1-metrics.sh <session-jsonl-file> [--phase <phase>]
#
# Calculates per-todo and per-phase metrics from todo spans.
# This is the "fast, no AI" layer of analysis.
#
# Output: JSON with detailed metrics

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

JSONL_FILE=""
PHASE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --phase|-p)
            PHASE="$2"
            shift 2
            ;;
        *)
            JSONL_FILE="$1"
            shift
            ;;
    esac
done

if [[ -z "$JSONL_FILE" ]] || [[ ! -f "$JSONL_FILE" ]]; then
    echo "Usage: $0 <session-jsonl-file> [--phase <phase>]" >&2
    exit 1
fi

# Get todo spans first
SPANS_JSON=$("$SCRIPT_DIR/todo-spans.sh" "$JSONL_FILE")

# jq filter file to avoid bash escaping issues
JQ_FILTER=$(cat << 'JQEOF'
# Detect bottleneck (slowest todo)
def find_bottleneck($spans):
  if ($spans | length) == 0 then null
  else
    $spans | max_by(.duration_seconds) | {
      content: .content,
      duration_seconds: .duration_seconds,
      percentage_of_total: (
        if ([$spans[].duration_seconds] | add) > 0 then
          ((.duration_seconds / ([$spans[].duration_seconds] | add)) * 100) | floor
        else 0 end
      )
    }
  end;

# Detect retries (todos that appear multiple times)
def find_retries($spans):
  $spans | group_by(.content) | map(select(length > 1)) | map({
    content: .[0].content,
    retry_count: (length - 1),
    total_duration: ([.[].duration_seconds] | add)
  });

# Calculate efficiency metrics
def calculate_efficiency($spans):
  if ($spans | length) == 0 then {
    todos_per_minute: 0,
    avg_duration_seconds: 0,
    tool_calls_per_todo: 0
  }
  else {
    todos_per_minute: (
      ($spans | length) / (([$spans[].duration_seconds] | add) / 60) | . * 100 | floor / 100
    ),
    avg_duration_seconds: (([$spans[].duration_seconds] | add) / ($spans | length) | floor),
    tool_calls_per_todo: (([$spans[].tool_calls] | add) / ($spans | length) | . * 100 | floor / 100)
  }
  end;

# Identify slow todos (>2x average duration)
def find_slow_todos($spans):
  if ($spans | length) < 2 then []
  else
    (([$spans[].duration_seconds] | add) / ($spans | length)) as $avg |
    [$spans[] | select(.duration_seconds > ($avg * 2))] | map({
      content: .content,
      duration_seconds: .duration_seconds,
      times_avg: ((.duration_seconds / $avg) | . * 10 | floor / 10)
    })
  end;

# Main processing
.spans as $spans |
{
  phase: (if $phase != "" then $phase else "unknown" end),

  todowrite_events: .todowrite_events,
  total_tool_calls: .total_tool_calls,

  todos: [
    $spans[] | {
      content: .content,
      duration_seconds: .duration_seconds,
      tool_calls: .tool_calls,
      tools_used: .tools_used
    }
  ],

  phase_metrics: {
    total_todos: ($spans | length),
    total_duration_seconds: ([$spans[].duration_seconds] | add // 0),
    total_tool_calls: ([$spans[].tool_calls] | add // 0),

    tools_summary: (
      [$spans[].tools_used | to_entries[]] | group_by(.key) | map({
        tool: .[0].key,
        count: ([.[].value] | add)
      }) | sort_by(-.count)
    )
  },

  quality_indicators: {
    bottleneck: find_bottleneck($spans),
    retries: find_retries($spans),
    slow_todos: find_slow_todos($spans)
  },

  efficiency: calculate_efficiency($spans),

  issues: (
    [
      (find_bottleneck($spans) | select(.percentage_of_total > 40) | {
        type: "bottleneck",
        severity: "high",
        todo: .content,
        detail: "\(.percentage_of_total)% of total time"
      }),
      (find_retries($spans)[] | {
        type: "retry",
        severity: (if .retry_count >= 3 then "high" else "medium" end),
        todo: .content,
        detail: "\(.retry_count) retries"
      }),
      (find_slow_todos($spans)[] | select(.times_avg > 5) | {
        type: "slow_todo",
        severity: "medium",
        todo: .content,
        detail: "\(.times_avg)x average duration"
      })
    ] | map(select(. != null))
  )
}
JQEOF
)

# Now run jq with the filter
echo "$SPANS_JSON" | jq --arg phase "$PHASE" "$JQ_FILTER"
