#\!/bin/bash
cd "/c/Users/ahunt/Documents/IMT Claude/Pipeline-Office/web"
MSG_FILE=".pipeline/user-message.txt"
LOG_FILE=".pipeline/supervisor.log"

# Use winpty with bash to run claude
(
    echo "/supervisor . --mode feature"
    while true; do
        if [[ -f "$MSG_FILE" ]]; then
            cat "$MSG_FILE"
            rm -f "$MSG_FILE"
        fi
        sleep 2
    done
) | winpty bash -c "claude --dangerously-skip-permissions" 2>&1 | tee -a "$LOG_FILE"
