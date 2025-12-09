#!/bin/bash
# Extract todo spans from JSONL session file
# Usage: ./todo-spans.sh <session-jsonl-file>
#
# Parses TodoWrite tool calls to build spans (start/end times) for each todo.
# A span starts when a todo becomes "in_progress" and ends when it becomes "completed".
# Also tracks tool calls that occurred during each span.
#
# Output: JSON with spans array containing metrics per todo

set -euo pipefail

JSONL_FILE="${1:-}"

if [[ -z "$JSONL_FILE" ]] || [[ ! -f "$JSONL_FILE" ]]; then
    echo "Usage: $0 <session-jsonl-file>" >&2
    exit 1
fi

# Step 1: Extract all events (TodoWrite + tool calls) with timestamps
# Step 2: Build spans from TodoWrite status changes
# Step 3: Attribute tool calls to spans by timestamp

jq -s '
# Extract TodoWrite events
def extract_todowrite_events:
  [.[] |
    select(.type == "assistant" and .message.content) |
    .timestamp as $ts |
    .message.content[]? |
    select(type == "object" and .type == "tool_use" and .name == "TodoWrite") |
    {
      event_type: "todowrite",
      timestamp: $ts,
      todos: (.input.todos // [])
    }
  ];

# Extract all tool calls
def extract_tool_calls:
  [.[] |
    select(.type == "assistant" and .message.content) |
    .timestamp as $ts |
    .message.content[]? |
    select(type == "object" and .type == "tool_use") |
    {
      timestamp: $ts,
      tool_name: .name,
      tool_id: .id
    }
  ];

# Build spans from TodoWrite events
def build_spans($todowrite_events):
  if ($todowrite_events | length) == 0 then
    []
  else
    # Track state changes across events
    reduce $todowrite_events[] as $event (
      {prev: {}, active: {}, spans: []};

      # Process each todo in this event
      reduce ($event.todos // [])[] as $todo (
        .;
        $todo.content as $content |
        $todo.status as $status |
        (.prev[$content].status // "none") as $prev_status |

        # Status changed to in_progress - start span
        if $status == "in_progress" and $prev_status != "in_progress" then
          .active[$content] = {
            content: $content,
            start_time: $event.timestamp,
            started_from: $prev_status
          }
        # Status changed to completed - close span
        elif $status == "completed" and .active[$content] then
          .spans += [{
            content: .active[$content].content,
            start_time: .active[$content].start_time,
            end_time: $event.timestamp,
            status: "completed"
          }] |
          del(.active[$content])
        else
          .
        end
      ) |
      # Update prev state
      .prev = ([$event.todos[]? | {(.content): {status: .status}}] | add // {})
    ) |

    # Return completed spans (ignore still-active ones)
    .spans
  end;

# Parse ISO timestamp (handles both with and without milliseconds)
def parse_timestamp:
  if . == null then 0
  elif test("\\.[0-9]+Z$") then
    # Has milliseconds - strip them
    gsub("\\.[0-9]+Z$"; "Z") | fromdateiso8601
  else
    fromdateiso8601
  end;

# Attribute tool calls to spans
def attribute_tools($spans; $tools):
  [$spans[] |
    . as $span |
    ($span.start_time | parse_timestamp) as $start |
    ($span.end_time | parse_timestamp) as $end |

    # Find tools within this span
    [$tools[] |
      select(.timestamp) |
      ((.timestamp | parse_timestamp) // 0) as $tool_time |
      select($tool_time >= $start and $tool_time <= $end)
    ] as $span_tools |

    # Group tools by name
    ($span_tools | group_by(.tool_name) | map({
      name: .[0].tool_name,
      count: length
    })) as $tool_counts |

    $span + {
      duration_seconds: (($end - $start) | floor),
      tool_calls: ($span_tools | length),
      tools_used: ($tool_counts | map({(.name): .count}) | add // {}),
      tool_breakdown: $tool_counts
    }
  ];

# Main processing
extract_todowrite_events as $todowrite |
extract_tool_calls as $tools |
build_spans($todowrite) as $raw_spans |
attribute_tools($raw_spans; $tools) as $spans |

# Calculate summary
{
  session_file: $ENV.JSONL_FILE,
  todowrite_events: ($todowrite | length),
  total_tool_calls: ($tools | length),
  spans: $spans,
  summary: {
    total_todos: ($spans | length),
    total_duration_seconds: ([$spans[].duration_seconds] | add // 0),
    total_tool_calls: ([$spans[].tool_calls] | add // 0),
    tools_summary: ([$spans[].tools_used] | add // {} | to_entries | map({(.key): .value}) | add // {})
  }
}
' "$JSONL_FILE"
