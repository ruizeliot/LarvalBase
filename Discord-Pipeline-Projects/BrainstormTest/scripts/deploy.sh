#!/bin/bash
# CascadeSim deploy script — builds locally, syncs to VPS, restarts services.
# Usage: ./scripts/deploy.sh [--skip-tests] [--dry-run]

set -euo pipefail

# --- Config ---
VPS_HOST="root@69.62.106.38"
VPS_DIR="/var/www/cascadesim"
HEALTH_URL="https://cascadesim.ingevision.cloud/health"

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# --- Parse flags ---
SKIP_TESTS=false
DRY_RUN=false
for arg in "$@"; do
  case $arg in
    --skip-tests) SKIP_TESTS=true ;;
    --dry-run) DRY_RUN=true ;;
    *) echo -e "${RED}[FAIL] Unknown flag: $arg${NC}"; exit 1 ;;
  esac
done

# --- Helpers ---
step() {
  echo -e "${CYAN}[$1/7]${NC} $2"
}

ok() {
  echo -e "  ${GREEN}[OK]${NC} $1"
}

skip() {
  echo -e "  ${YELLOW}[SKIP]${NC} $1"
}

fail() {
  echo -e "  ${RED}[FAIL]${NC} $1"
  exit 1
}

run() {
  if [ "$DRY_RUN" = true ]; then
    echo -e "  ${YELLOW}[DRY-RUN]${NC} $1"
  else
    eval "$1" || fail "$2"
    ok "$2"
  fi
}

# --- Pre-flight checks ---
if [ ! -f "package.json" ]; then
  fail "Must run from project root (package.json not found)"
fi

if [ ! -d "server" ]; then
  fail "server/ directory not found"
fi

echo -e "${GREEN}=== CascadeSim Deploy ===${NC}"
if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}Dry run mode — no commands will be executed${NC}"
fi
echo ""

# --- Step 1: Build ---
step 1 "Building production bundle..."
run "npm run build" "Production build"

# --- Step 2: Tests ---
step 2 "Running tests..."
if [ "$SKIP_TESTS" = true ]; then
  skip "Tests skipped (--skip-tests)"
else
  run "npm test" "Unit tests passed"
fi

# --- Step 3: Sync dist/ ---
step 3 "Syncing static files to VPS..."
if command -v rsync &> /dev/null; then
  run "rsync -avz --delete dist/ ${VPS_HOST}:${VPS_DIR}/dist/" "Static files synced"
else
  run "ssh ${VPS_HOST} 'rm -rf ${VPS_DIR}/dist/*' && scp -r dist/* ${VPS_HOST}:${VPS_DIR}/dist/" "Static files synced (scp)"
fi

# --- Step 4: Sync server/ ---
step 4 "Syncing server files to VPS..."
if command -v rsync &> /dev/null; then
  run "rsync -avz --delete server/ ${VPS_HOST}:${VPS_DIR}/server/" "Server files synced"
else
  run "ssh ${VPS_HOST} 'rm -rf ${VPS_DIR}/server/*' && scp -r server/* ${VPS_HOST}:${VPS_DIR}/server/" "Server files synced (scp)"
fi

# --- Step 5: Restart y-websocket ---
step 5 "Restarting y-websocket server..."
if [ "$DRY_RUN" = true ]; then
  echo -e "  ${YELLOW}[DRY-RUN]${NC} ssh ${VPS_HOST} 'cd ${VPS_DIR} && pm2 restart y-websocket || pm2 start server/ecosystem.config.cjs'"
else
  ssh "${VPS_HOST}" "cd ${VPS_DIR} && (pm2 restart y-websocket 2>/dev/null || pm2 start server/ecosystem.config.cjs)" || fail "pm2 restart"
  ok "y-websocket restarted"
fi

# --- Step 6: Reload nginx ---
step 6 "Reloading nginx..."
if [ "$DRY_RUN" = true ]; then
  echo -e "  ${YELLOW}[DRY-RUN]${NC} ssh ${VPS_HOST} 'cp ${VPS_DIR}/server/nginx/cascadesim.conf /etc/nginx/sites-available/cascadesim && nginx -t && systemctl reload nginx'"
else
  ssh "${VPS_HOST}" "cp ${VPS_DIR}/server/nginx/cascadesim.conf /etc/nginx/sites-available/cascadesim && ln -sf /etc/nginx/sites-available/cascadesim /etc/nginx/sites-enabled/cascadesim && nginx -t && systemctl reload nginx" || fail "nginx reload"
  ok "nginx reloaded"
fi

# --- Step 7: Health check ---
step 7 "Verifying deployment..."
if [ "$DRY_RUN" = true ]; then
  echo -e "  ${YELLOW}[DRY-RUN]${NC} curl -sf ${HEALTH_URL}"
else
  sleep 2
  # Try health endpoint; fall back to checking if the site responds at all
  if curl -sf "${HEALTH_URL}" > /dev/null 2>&1; then
    HEALTH=$(curl -sf "${HEALTH_URL}")
    ok "Health check passed: ${HEALTH}"
  elif curl -sf "https://cascadesim.ingevision.cloud" > /dev/null 2>&1; then
    ok "Site is responding (health endpoint not yet available)"
  else
    echo -e "  ${YELLOW}[WARN]${NC} Could not reach site — DNS may not be propagated yet"
  fi
fi

echo ""
echo -e "${GREEN}=== Deploy complete ===${NC}"
