#!/usr/bin/env python3
"""
Pipeline Rule Enforcer - TodoWrite Hook

This script runs as a PreToolUse hook on TodoWrite calls.
It tracks todo timestamps and notifies the Supervisor when todos complete.
Supervisor analyzes asynchronously and injects messages if violations found.

Exit codes:
  0 = Always allow (async enforcement via Supervisor)
"""

import sys
import json
import os
import subprocess
from datetime import datetime
from pathlib import Path

# ============================================================
# CONFIGURATION
# ============================================================

PIPELINE_OFFICE = "C:/Users/ahunt/Documents/IMT Claude/Pipeline-Office"

# ============================================================
# HELPER FUNCTIONS
# ============================================================

_log_cwd = None  # Will be set by main() for per-project logging

def log(msg: str):
    """Log to stderr and file."""
    print(f"[enforce-rules] {msg}", file=sys.stderr)
    # Also log to file for debugging (in project's .pipeline directory)
    try:
        if _log_cwd:
            log_path = os.path.join(_log_cwd, '.pipeline', 'enforce-rules.log')
            with open(log_path, 'a', encoding='utf-8') as f:
                f.write(f"{datetime.utcnow().isoformat()} {msg}\n")
    except:
        pass

def read_transcript(transcript_path: str, start_time: str = None) -> str:
    """Read transcript entries, optionally from a start time."""
    if not transcript_path or not os.path.exists(transcript_path):
        return ""

    content = []
    try:
        with open(transcript_path, 'r', encoding='utf-8') as f:
            for line in f:
                try:
                    entry = json.loads(line.strip())

                    # Filter by timestamp if provided
                    if start_time:
                        entry_time = entry.get('timestamp', '')
                        if entry_time < start_time:
                            continue

                    # Extract assistant messages
                    if entry.get('type') == 'assistant':
                        msg = entry.get('message', {})
                        if isinstance(msg.get('content'), str):
                            content.append(msg['content'])
                        elif isinstance(msg.get('content'), list):
                            for block in msg['content']:
                                if isinstance(block, dict):
                                    if block.get('type') == 'text':
                                        content.append(block.get('text', ''))
                                    elif block.get('type') == 'tool_use':
                                        # Include tool calls for context
                                        tool_name = block.get('name', '')
                                        tool_input = json.dumps(block.get('input', {}))[:200]
                                        content.append(f"[Tool: {tool_name}] {tool_input}")
                except json.JSONDecodeError:
                    continue
    except Exception as e:
        log(f"Error reading transcript: {e}")
        return ""

    return "\n".join(content)

def read_manifest(cwd: str) -> dict:
    """Read pipeline manifest."""
    manifest_path = os.path.join(cwd, '.pipeline', 'manifest.json')
    if not os.path.exists(manifest_path):
        return {}

    try:
        with open(manifest_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        log(f"Error reading manifest: {e}")
        return {}

def load_tracking(cwd: str) -> dict:
    """Load todo tracking data."""
    tracking_path = os.path.join(cwd, '.pipeline', 'todo-tracking.json')
    if os.path.exists(tracking_path):
        try:
            with open(tracking_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            pass
    return {"todos": {}}

def save_tracking(cwd: str, tracking: dict):
    """Save todo tracking data."""
    tracking_path = os.path.join(cwd, '.pipeline', 'todo-tracking.json')
    os.makedirs(os.path.dirname(tracking_path), exist_ok=True)
    with open(tracking_path, 'w', encoding='utf-8') as f:
        json.dump(tracking, f, indent=2)

def get_supervisor_pid(cwd: str) -> int:
    """Get Supervisor PID from config."""
    config_path = os.path.join(cwd, '.pipeline', 'supervisor-info.json')
    log(f"Looking for supervisor info at: {config_path}")
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r', encoding='utf-8-sig') as f:
                config = json.load(f)
                log(f"Supervisor config keys: {list(config.keys())}")
                pid = config.get('supervisorPid')
                log(f"Got supervisorPid: {pid}")
                return pid
        except Exception as e:
            log(f"Error reading supervisor config: {e}")
    else:
        log(f"Supervisor info file not found")
    return None

def get_expected_worker_session(cwd: str) -> str:
    """Get expected worker session ID from supervisor config."""
    config_path = os.path.join(cwd, '.pipeline', 'supervisor-config.json')
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r', encoding='utf-8-sig') as f:
                config = json.load(f)
                return config.get('workerSessionId', '')
        except Exception as e:
            log(f"Error reading supervisor config for session: {e}")
    return ''

def notify_supervisor(supervisor_pid: int, todo_content: str, phase: str, transcript_slice: str):
    """Send notification to Supervisor via message injection."""
    if not supervisor_pid:
        log("No Supervisor PID, skipping notification")
        return

    # Build the check message
    message = f"CHECK TODO: {todo_content}\nPHASE: {phase}\nTRANSCRIPT:\n{transcript_slice[:3000]}"  # Limit size

    # Escape for PowerShell
    message = message.replace("'", "''").replace('"', '`"')

    # Inject to Supervisor
    inject_script = os.path.join(PIPELINE_OFFICE, "lib", "inject-message.ps1")
    cmd = [
        "powershell.exe", "-ExecutionPolicy", "Bypass",
        "-File", inject_script,
        "-TargetPid", str(supervisor_pid),
        "-Message", message
    ]

    try:
        subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        log(f"Notified Supervisor about: {todo_content[:50]}...")
    except Exception as e:
        log(f"Failed to notify Supervisor: {e}")

# ============================================================
# MAIN
# ============================================================

def main():
    # Read hook input from stdin
    try:
        hook_input = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        log(f"Failed to parse hook input: {e}")
        sys.exit(0)

    # Extract fields
    tool_name = hook_input.get('tool_name', '')
    tool_input = hook_input.get('tool_input', {})
    transcript_path = hook_input.get('transcript_path', '')
    cwd = hook_input.get('cwd', os.getcwd())
    incoming_session_id = hook_input.get('session_id', '')

    # Set log cwd for per-project logging
    global _log_cwd
    _log_cwd = cwd

    # Debug: log hook input to file
    debug_path = os.path.join(cwd, '.pipeline', 'hook-debug.json')
    try:
        with open(debug_path, 'w', encoding='utf-8') as f:
            json.dump(hook_input, f, indent=2)
        log(f"Debug: wrote hook input to {debug_path}")
    except Exception as e:
        log(f"Debug: failed to write hook input: {e}")

    # Only process TodoWrite calls
    if tool_name != 'TodoWrite':
        sys.exit(0)

    # CRITICAL: Filter by session_id - only process the worker's TodoWrite calls
    # This prevents the hook from triggering on other Claude sessions (like the supervisor or user sessions)
    expected_session = get_expected_worker_session(cwd)
    if expected_session and incoming_session_id:
        if incoming_session_id != expected_session:
            log(f"Session mismatch: incoming={incoming_session_id[:8]}... expected={expected_session[:8]}... - skipping")
            sys.exit(0)
        else:
            log(f"Session match: {incoming_session_id[:8]}... - processing")
    elif not expected_session:
        log("No expected session configured - processing all TodoWrite calls (legacy mode)")

    todos = tool_input.get('todos', [])
    now = datetime.utcnow().isoformat() + 'Z'

    # Load tracking
    tracking = load_tracking(cwd)

    # Load manifest for phase info
    manifest = read_manifest(cwd)
    phase = manifest.get('currentPhase', '1')

    # Get Supervisor PID
    supervisor_pid = get_supervisor_pid(cwd)

    # Process each todo
    for i, todo in enumerate(todos):
        content = todo.get('content', '')
        status = todo.get('status', '')
        todo_key = f"todo-{i}-{content[:30]}"  # Unique key

        if status == 'in_progress':
            # Record start time
            tracking['todos'][todo_key] = {
                'content': content,
                'startTime': now,
                'status': 'in_progress'
            }
            log(f"Tracking started: {content[:50]}...")

        elif status == 'completed':
            # Check if we have a start time
            todo_data = tracking['todos'].get(todo_key, {})
            start_time = todo_data.get('startTime')
            log(f"Todo completed: {content[:50]}... start_time={start_time}, prev_status={todo_data.get('status')}")

            if start_time and todo_data.get('status') == 'in_progress':
                # Extract transcript slice from start to now
                log(f"Reading transcript from: {transcript_path}")
                transcript_slice = read_transcript(transcript_path, start_time)
                log(f"Transcript slice length: {len(transcript_slice) if transcript_slice else 0}")

                # Notify Supervisor (async)
                if transcript_slice:
                    log(f"Notifying supervisor PID: {supervisor_pid}")
                    notify_supervisor(supervisor_pid, content, phase, transcript_slice)
                else:
                    log("No transcript slice, skipping notification")

                # Mark as checked
                tracking['todos'][todo_key]['status'] = 'completed'
                tracking['todos'][todo_key]['endTime'] = now
            else:
                log(f"Skipping: no start_time or not in_progress")

    # Save tracking
    save_tracking(cwd, tracking)

    # Always allow (Supervisor handles enforcement async)
    sys.exit(0)

if __name__ == '__main__':
    main()
