#!/bin/bash

SERVER_USER="${SERVER_USER:-root}"
SERVER_HOST="${SERVER_HOST:-159.198.46.117}"
SERVER="$SERVER_USER@$SERVER_HOST"
REMOTE_PATH="/var/www/bzr-backend/scripts"
SSH_PASSWORD="${SSH_PASSWORD:-}"

if [[ -n "$SSH_PASSWORD" ]]; then
  SCP_CMD=(sshpass -p "$SSH_PASSWORD" scp -o StrictHostKeyChecking=no)
else
  SCP_CMD=(scp)
fi

echo "🚀 Deploying backfill scripts to $SERVER..."

"${SCP_CMD[@]}" bzr-backend/scripts/evaluate-backfill.js $SERVER:$REMOTE_PATH/
"${SCP_CMD[@]}" bzr-backend/scripts/backfill-historical.js $SERVER:$REMOTE_PATH/

echo "✅ Scripts deployed."
