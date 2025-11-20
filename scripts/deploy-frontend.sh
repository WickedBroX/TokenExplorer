#!/bin/bash

# Frontend Deployment Script
# Builds the frontend and deploys it to the production server

set -e # Exit on error

echo "🚀 Starting Frontend Deployment..."

# 1. Build the frontend
echo "📦 Building frontend..."
cd bzr-frontend
npm run build

# 2. Deploy to server
echo "📤 Deploying to production (159.198.70.88)..."
rsync -avz --delete ./dist/ root@159.198.70.88:/var/www/bzr-frontend/

echo "✅ Frontend deployment complete!"
echo "👉 Visit https://haswork.dev to verify changes."
