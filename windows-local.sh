#!/bin/bash
# Windows Local Pipeline - Runs pipeline locally on Windows
# Usage: ./windows-local.sh <project-path> [--feature] [--from phase]
#
# This script initializes the pipeline manifest and provides instructions
# for running supervisor and worker in separate terminals.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

log() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Parse arguments
PROJECT_PATH=""
MODE="new"
START_PHASE="0a"

while [[ $# -gt 0 ]]; do
    case $1 in
        --feature|-f)
            MODE="feature"
            shift
            ;;
        --from)
            START_PHASE="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 <project-path> [--feature] [--from phase]"
            echo ""
            echo "Options:"
            echo "  --feature, -f    Run in feature mode (add to existing project)"
            echo "  --from <phase>   Start from specific phase (0a, 0b, 1, 2, 3)"
            echo ""
            echo "Example:"
            echo "  $0 ./my-app --feature"
            exit 0
            ;;
        -*)
            error "Unknown option: $1"
            exit 1
            ;;
        *)
            PROJECT_PATH="$1"
            shift
            ;;
    esac
done

[[ -z "$PROJECT_PATH" ]] && { echo "Usage: $0 <project-path> [--feature]"; exit 1; }

# Resolve path
PROJECT_PATH=$(cd "$PROJECT_PATH" 2>/dev/null && pwd || echo "$PROJECT_PATH")
if [[ ! -d "$PROJECT_PATH" ]]; then
    error "Project directory not found: $PROJECT_PATH"
    exit 1
fi

PROJECT_NAME=$(basename "$PROJECT_PATH")
PIPELINE_DIR="$PROJECT_PATH/.pipeline"
MANIFEST="$PIPELINE_DIR/manifest.json"

echo ""
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA} Pipeline Supervisor - Windows Local Mode${NC}"
echo -e "${MAGENTA} Project: $PROJECT_NAME${NC}"
echo -e "${MAGENTA} Mode: $MODE${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Create .pipeline directory
mkdir -p "$PIPELINE_DIR"

# Define phases based on mode
if [[ "$MODE" == "feature" ]]; then
    PHASES=(
        "0a:/0a-pipeline-brainstorm-feature-v6.0:Brainstorm"
        "0b:/0b-pipeline-technical-feature-v6.0:Technical"
        "1:/1-pipeline-bootstrap-feature-v6.0:Bootstrap"
        "2:/2-pipeline-implementEpic-feature-v6.0:Implement"
        "3:/3-pipeline-finalize-feature-v6.0:Finalize"
    )
else
    PHASES=(
        "0a:/0a-pipeline-brainstorm-v6.0:Brainstorm"
        "0b:/0b-pipeline-technical-v6.0:Technical"
        "1:/1-pipeline-bootstrap-v6.0:Bootstrap"
        "2:/2-pipeline-implementEpic-v6.0:Implement"
        "3:/3-pipeline-finalize-v6.0:Finalize"
    )
fi

# Get first phase command
FIRST_PHASE_CMD=""
for phase in "${PHASES[@]}"; do
    IFS=':' read -r id cmd name <<< "$phase"
    if [[ "$id" == "$START_PHASE" ]]; then
        FIRST_PHASE_CMD="$cmd"
        break
    fi
done

[[ -z "$FIRST_PHASE_CMD" ]] && FIRST_PHASE_CMD="${PHASES[0]#*:}"
FIRST_PHASE_CMD="${FIRST_PHASE_CMD%%:*}"

# Initialize manifest
RUN_ID=$(date +%Y%m%d-%H%M%S)

cat > "$MANIFEST" << EOF
{
  "projectName": "$PROJECT_NAME",
  "projectPath": "$PROJECT_PATH",
  "mode": "$MODE",
  "currentPhase": "$START_PHASE",
  "status": "initializing",
  "runId": "$RUN_ID",
  "startedAt": "$(date -Iseconds)",
  "phases": {
EOF

# Add phases to manifest
first=true
for phase in "${PHASES[@]}"; do
    IFS=':' read -r id cmd name <<< "$phase"
    [[ "$first" != "true" ]] && echo "," >> "$MANIFEST"
    cat >> "$MANIFEST" << EOF
    "$id": {
      "status": "pending",
      "command": "$cmd",
      "name": "$name"
    }
EOF
    first=false
done

cat >> "$MANIFEST" << EOF
  }
}
EOF

success "Initialized manifest: $MANIFEST"

# Print instructions
echo ""
echo -e "${GREEN}┌─────────────────────────────────────────────────────────────┐${NC}"
echo -e "${GREEN}│ SUPERVISOR READY - Open TWO terminals:                      │${NC}"
echo -e "${GREEN}├─────────────────────────────────────────────────────────────┤${NC}"
echo -e "${GREEN}│                                                             │${NC}"
echo -e "${YELLOW}│ TERMINAL 1 (Supervisor):                                    │${NC}"
echo -e "│   cd \"$PROJECT_PATH\""
echo -e "│   claude"
echo -e "${CYAN}│   Then type: /manager-pipeline${NC}"
echo -e "${GREEN}│                                                             │${NC}"
echo -e "${YELLOW}│ TERMINAL 2 (Worker):                                        │${NC}"
echo -e "│   cd \"$PROJECT_PATH\""
echo -e "│   claude"
echo -e "${CYAN}│   Then type: $FIRST_PHASE_CMD${NC}"
echo -e "${GREEN}│                                                             │${NC}"
echo -e "${GREEN}└─────────────────────────────────────────────────────────────┘${NC}"
echo ""

# Convert to Windows path for display
WIN_PATH=$(echo "$PROJECT_PATH" | sed 's|^/c/|C:/|; s|^/d/|D:/|; s|/|\\|g')

echo -e "${CYAN}Quick copy commands:${NC}"
echo ""
echo "Supervisor:"
echo "  cd \"$WIN_PATH\" && claude"
echo ""
echo "Worker:"
echo "  cd \"$WIN_PATH\" && claude"
echo ""

# Ask to open Windows Terminal
read -p "Open Windows Terminal with both tabs? (Y/n) " response
if [[ "$response" != "n" && "$response" != "N" ]]; then
    # Use Windows Terminal if available
    if command -v wt.exe &>/dev/null || [[ -f "/c/Users/$USER/AppData/Local/Microsoft/WindowsApps/wt.exe" ]]; then
        wt.exe new-tab --title "Supervisor" -d "$WIN_PATH" cmd /k "echo Supervisor - Run: claude then /manager-pipeline" \; \
               new-tab --title "Worker" -d "$WIN_PATH" cmd /k "echo Worker - Run: claude then $FIRST_PHASE_CMD"
        success "Opened Windows Terminal with Supervisor and Worker tabs"
    else
        warn "Windows Terminal not found. Please open terminals manually."
    fi
fi

echo ""
success "Manifest: $MANIFEST"
log "Current phase: $START_PHASE"
echo ""
