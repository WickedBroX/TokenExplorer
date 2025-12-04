#!/bin/bash

# Frontend Deployment Script
# Builds the frontend and deploys it to the production server

set -e # Exit on error

SERVER_USER="${SERVER_USER:-root}"
SERVER_HOST="${SERVER_HOST:-159.198.46.117}"
SERVER="$SERVER_USER@$SERVER_HOST"
SSH_PASSWORD="${SSH_PASSWORD:-}"

RSYNC_RSH="ssh"
if [[ -n "$SSH_PASSWORD" ]]; then
  RSYNC_RSH="sshpass -p $SSH_PASSWORD ssh -o StrictHostKeyChecking=no"
fi

echo "🚀 Starting Frontend Deployment..."

# 1. Build the frontend
echo "📦 Building frontend..."
cd bzr-frontend
npm run build

# 2. Deploy to server
echo "📤 Deploying to production (${SERVER_HOST})..."
rsync -avz --delete -e "$RSYNC_RSH" ./dist/ $SERVER:/var/www/bzr-frontend/

echo "✅ Frontend deployment complete!"
echo "👉 Visit https://bazaars.io to verify changes."
