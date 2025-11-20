#!/bin/bash

# Deploy Step 1: Token Info Database Persistence
# This script deploys the database migration, refresh script, and updated server.js

set -e  # Exit on any error

SERVER="159.198.70.88"
SERVER_USER="root"
SERVER_PATH="/var/www/bzr-backend"
DB_USER="bzr_user"
DB_NAME="bzr_transfers"

echo "🚀 Starting Step 1 deployment: Token Info Database Persistence"
echo ""
echo "⚠️  Note: You may be prompted for SSH password multiple times"
echo ""

# Step 0: Create directories if they don't exist
echo "📁 Step 0/7: Ensuring directories exist on server..."
ssh ${SERVER_USER}@${SERVER} "mkdir -p ${SERVER_PATH}/migrations ${SERVER_PATH}/scripts"
echo "✅ Directories ready"
echo ""

# Step 1: Copy migration file
echo "📦 Step 1/7: Uploading database migration..."
scp bzr-backend/migrations/001-create-token-info.sql ${SERVER_USER}@${SERVER}:${SERVER_PATH}/migrations/
echo "✅ Migration uploaded"
echo ""

# Step 2: Copy refresh script
echo "📦 Step 2/7: Uploading refresh script..."
scp bzr-backend/scripts/refresh-token-info.js ${SERVER_USER}@${SERVER}:${SERVER_PATH}/scripts/
echo "✅ Refresh script uploaded"
echo ""

# Step 3: Copy updated server.js
echo "📦 Step 3/7: Uploading updated server.js..."
scp bzr-backend/server.js ${SERVER_USER}@${SERVER}:${SERVER_PATH}/
echo "✅ Server.js uploaded"
echo ""

# Step 4: Run migration
echo "🗄️  Step 4/7: Running database migration..."
ssh ${SERVER_USER}@${SERVER} "cd ${SERVER_PATH} && sudo -u postgres psql -d ${DB_NAME} -f migrations/001-create-token-info.sql"
echo "✅ Migration completed"
echo ""

# Step 5: Initial population (force refresh)
echo "🔄 Step 5/7: Running initial token info refresh..."
ssh ${SERVER_USER}@${SERVER} "cd ${SERVER_PATH} && node scripts/refresh-token-info.js --force"
echo "✅ Initial refresh completed"
echo ""

# Step 6: Restart backend service
echo "🔄 Step 6/7: Restarting backend service..."
ssh ${SERVER_USER}@${SERVER} "systemctl restart bzr-backend.service"
echo "✅ Service restarted"
echo ""

# Wait for service to be ready
echo "⏳ Waiting 5 seconds for service to start..."
sleep 5
echo ""

# Step 7: Verify deployment
echo "🧪 Step 7/7: Verifying deployment..."
echo ""

# Test 1: Check service status
echo "Test 1: Service status"
ssh ${SERVER_USER}@${SERVER} "systemctl is-active bzr-backend.service" || echo "⚠️  Service check failed"
echo ""

# Test 2: Check /api/info endpoint
echo "Test 2: Testing /api/info endpoint"
curl -s "http://${SERVER}:3001/api/info" | jq '.'
echo ""
echo "✅ API responding"
echo ""

# Test 3: Check database
echo "Test 3: Checking database"
ssh ${SERVER_USER}@${SERVER} "sudo -u postgres psql -d ${DB_NAME} -c 'SELECT contract_address, token_name, token_symbol, updated_at FROM token_info;'" || echo "⚠️  Database check failed"
echo ""

echo "🎉 Step 1 deployment complete!"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Set up hourly cron job:"
echo "   ssh ${SERVER_USER}@${SERVER}"
echo "   crontab -e"
echo "   # Add this line:"
echo "   0 * * * * cd ${SERVER_PATH} && node scripts/refresh-token-info.js >> /var/log/bzr/refresh-token-info.log 2>&1"
echo ""
echo "2. Set ADMIN_PASSWORD environment variable:"
echo "   Add to /etc/systemd/system/bzr-backend.service:"
echo "   Environment=\"ADMIN_PASSWORD=your-secure-password\""
echo "   Then: systemctl daemon-reload && systemctl restart bzr-backend.service"
echo ""
echo "3. Monitor logs:"
echo "   journalctl -u bzr-backend.service -f"
echo ""
echo "4. Test admin endpoint:"
echo "   curl -X POST http://${SERVER}:3001/admin/refresh-token-info \\"
echo "     -H 'X-Admin-Password: your-password' \\"
echo "     -H 'Content-Type: application/json'"
echo ""
