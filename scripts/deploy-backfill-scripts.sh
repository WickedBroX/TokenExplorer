#!/bin/bash
SERVER="root@159.198.70.88"
REMOTE_PATH="/var/www/bzr-backend/scripts"

echo "🚀 Deploying backfill scripts to $SERVER..."

scp bzr-backend/scripts/evaluate-backfill.js $SERVER:$REMOTE_PATH/
scp bzr-backend/scripts/backfill-historical.js $SERVER:$REMOTE_PATH/

echo "✅ Scripts deployed."
