#!/bin/bash
# Backend Deployment Script

set -e  # Exit on error

SERVER_USER="${SERVER_USER:-root}"
SERVER_HOST="${SERVER_HOST:-159.198.46.117}"
SERVER="$SERVER_USER@$SERVER_HOST"
BACKEND_PATH="/var/www/bzr-backend"
LOCAL_BACKEND="/Users/wickedbro/Desktop/TokenExplorer/bzr-backend"
SYSTEMD_DIR="$LOCAL_BACKEND/deploy/systemd"
USE_SYSTEMD="${USE_SYSTEMD:-1}"
SSH_PASSWORD="${SSH_PASSWORD:-}"

RSYNC_RSH="ssh"
SSH_CMD=(ssh)
SCP_CMD=(scp)

if [[ -n "$SSH_PASSWORD" ]]; then
  RSYNC_RSH="sshpass -p \"$SSH_PASSWORD\" ssh -o StrictHostKeyChecking=no"
  SSH_CMD=(sshpass -p "$SSH_PASSWORD" ssh -o StrictHostKeyChecking=no)
  SCP_CMD=(sshpass -p "$SSH_PASSWORD" scp -o StrictHostKeyChecking=no)
fi

if [[ "$USE_SYSTEMD" == "1" ]]; then
  if [[ ! -f "$SYSTEMD_DIR/bzr-backend.service" || ! -f "$SYSTEMD_DIR/bzr-ingester.service" ]]; then
    echo "❌ Systemd unit files are missing under $SYSTEMD_DIR"
    exit 1
  fi
fi

echo "🚀 Deploying BZR Backend to Production..."
echo "================================================"

# Step 1: Sync backend files
echo ""
echo "📦 Step 1: Uploading backend files..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.env' \
  -e "$RSYNC_RSH" \
  $LOCAL_BACKEND/ $SERVER:$BACKEND_PATH/

echo "✅ Backend files uploaded"

# Step 2: Install dependencies
echo ""
echo "📦 Step 2: Installing dependencies..."
"${SSH_CMD[@]}" $SERVER <<'ENDSSH'
cd /var/www/bzr-backend

export PATH="/usr/local/bin:/usr/bin:$PATH"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "Node version: $(node --version 2>/dev/null || echo 'Node not found in PATH')"
echo "NPM version: $(npm --version 2>/dev/null || echo 'NPM not found in PATH')"

echo "Installing npm packages..."
npm install --production

echo "Running database migrations..."
npm run migrate

chmod +x scripts/start-backend.sh scripts/start-ingester.sh 2>/dev/null || true
ENDSSH

if [[ "$USE_SYSTEMD" == "1" ]]; then
  echo ""
  echo "⚙️  Step 3: Installing systemd service units..."
  "${SCP_CMD[@]}" "$SYSTEMD_DIR/bzr-backend.service" "$SERVER:/etc/systemd/system/bzr-backend.service"
  "${SCP_CMD[@]}" "$SYSTEMD_DIR/bzr-ingester.service" "$SERVER:/etc/systemd/system/bzr-ingester.service"

  echo ""
  echo "🚀 Step 4: Restarting services via systemd..."
  "${SSH_CMD[@]}" $SERVER <<'ENDSSH'
set -e
systemctl daemon-reload
systemctl enable bzr-backend.service
systemctl enable bzr-ingester.service
systemctl restart bzr-backend.service
systemctl restart bzr-ingester.service
sleep 2
systemctl --no-pager status bzr-backend.service | head -n 20
systemctl --no-pager status bzr-ingester.service | head -n 20
curl -s http://localhost:3001/api/info > /dev/null && echo "✅ Backend API responding" || echo "⚠️  Backend API not responding yet (may need more time)"
curl -s http://localhost:3001/api/health > /dev/null && echo "✅ Health endpoint responding" || echo "⚠️  Health endpoint not responding yet (may need more time)"
ENDSSH
else
  echo ""
  echo "⚙️  Step 3: Restarting backend with nohup (systemd disabled)..."
  "${SSH_CMD[@]}" $SERVER <<'ENDSSH'
cd /var/www/bzr-backend

export PATH="/usr/local/bin:/usr/bin:$PATH"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "Stopping existing backend..."
pkill -f "node /var/www/bzr-backend/server.js" || pkill -f "node server.js" || echo "No existing process found"

echo "Starting backend server..."
nohup node server.js > /var/log/bzr-backend.log 2>&1 &

sleep 2

if pgrep -f "node server.js" > /dev/null; then
    echo "✅ Backend server started successfully!"
    echo "Process ID: $(pgrep -f 'node server.js')"
else
    echo "❌ Failed to start backend server"
    echo "Check logs: tail /var/log/bzr-backend.log"
    exit 1
fi

curl -s http://localhost:3001/api/info > /dev/null && echo "✅ API responding" || echo "⚠️  API not responding yet (may need more time)"
ENDSSH
fi

echo ""
echo "================================================"
echo "✅ Backend deployment complete!"
echo ""
echo "🔍 Check your site: https://haswork.dev"
echo "📊 API endpoint: https://haswork.dev/api/info"
echo "❤️  Health endpoint: https://haswork.dev/api/health"
echo ""
echo "🛠  Manage services:"
echo "   ssh $SERVER 'systemctl status bzr-backend bzr-ingester'"
echo "   ssh $SERVER 'journalctl -u bzr-backend -u bzr-ingester -n 100 --no-pager'"
echo ""
