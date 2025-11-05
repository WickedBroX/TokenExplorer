#!/bin/bash
# Backend Deployment Script for 159.198.70.88

set -e  # Exit on error

SERVER="root@159.198.70.88"
BACKEND_PATH="/var/www/bzr-backend"
LOCAL_BACKEND="/Users/wickedbro/Desktop/TokenExplorer/bzr-backend"

echo "🚀 Deploying BZR Backend to Production..."
echo "================================================"

# Step 1: Sync backend files
echo ""
echo "📦 Step 1: Uploading backend files..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.env' \
  $LOCAL_BACKEND/ $SERVER:$BACKEND_PATH/

echo "✅ Backend files uploaded"

# Step 2: Install dependencies and start server
echo ""
echo "📦 Step 2: Installing dependencies and starting server..."
ssh $SERVER << 'ENDSSH'
cd /var/www/bzr-backend

# Find node and npm
export PATH="/usr/local/bin:/usr/bin:$PATH"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "Node version: $(node --version 2>/dev/null || echo 'Node not found in PATH')"
echo "NPM version: $(npm --version 2>/dev/null || echo 'NPM not found in PATH')"

# Install dependencies
echo "Installing npm packages..."
npm install --production

# Stop existing backend process (kill by full path to catch all instances)
echo "Stopping existing backend..."
pkill -f "node /var/www/bzr-backend/server.js" || pkill -f "node server.js" || echo "No existing process found"

# Start backend with nohup (background process)
echo "Starting backend server..."
nohup node server.js > /var/log/bzr-backend.log 2>&1 &

# Wait a moment for server to start
sleep 2

# Check if server is running
if pgrep -f "node server.js" > /dev/null; then
    echo "✅ Backend server started successfully!"
    echo "Process ID: $(pgrep -f 'node server.js')"
else
    echo "❌ Failed to start backend server"
    echo "Check logs: tail /var/log/bzr-backend.log"
    exit 1
fi

# Test if API is responding
echo "Testing API endpoint..."
sleep 1
curl -s http://localhost:3001/api/info > /dev/null && echo "✅ API responding" || echo "⚠️  API not responding yet (may need more time)"

echo ""
echo "📋 Server Status:"
ps aux | grep "node server.js" | grep -v grep

echo ""
echo "📝 To view logs:"
echo "   ssh root@159.198.70.88 'tail -f /var/log/bzr-backend.log'"

ENDSSH

echo ""
echo "================================================"
echo "✅ Backend deployment complete!"
echo ""
echo "🔍 Check your site: https://haswork.dev"
echo "📊 API endpoint: https://haswork.dev/api/info"
echo ""
