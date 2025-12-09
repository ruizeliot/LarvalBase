#!/bin/bash
set -e

echo "Deploying Pipeline Web GUI to dev environment..."

# Ensure we're in the right directory
cd /home/claude/IMT/Pipeline-Office/web

# Create database directory if needed
mkdir -p server/db

# Install dependencies (workspace install from root)
echo "Installing dependencies..."
npm install

# Start/restart PM2 processes
echo "Starting PM2 processes..."
pm2 delete pipeline-gui-backend-dev 2>/dev/null || true
pm2 delete pipeline-gui-frontend-dev 2>/dev/null || true
pm2 start ecosystem.config.cjs

# Wait for services to start
sleep 3

# Restart Caddy to pick up any config changes
echo "Restarting Caddy..."
pm2 restart caddy-dev 2>/dev/null || echo "Caddy not managed by PM2"

echo ""
echo "Deployment complete!"
echo "URL: https://ingevision.cloud/pipeline-gui-test/"
echo ""
echo "PM2 status:"
pm2 list | grep pipeline-gui
